import { ref, onMounted, onBeforeUnmount } from 'vue'
import {
  openGate,
  openAndLatchGate,
  unlatchGate,
} from '../services/gateApi.js'
import {
  isEnabled as haEnabled,
  loadGateState,
  saveLatchState,
  saveExpectedUnlatch,
  saveHistory,
} from '../services/haState.js'
import {
  subscribePush,
  unsubscribePush,
  sendPushNotification,
  isPushSubscribed,
} from '../services/pushService.js'

// How often (ms) to poll HA for state changes from other users
const POLL_INTERVAL_MS = 15_000

/**
 * Composable that manages gate state, actions, and activity history.
 * State is persisted to Home Assistant helpers when configured,
 * and polled every POLL_INTERVAL_MS so all neighbors stay in sync.
 * Web Push notifications are sent via the push-server sidecar.
 */
export function useGate() {
  const latched = ref(false)
  const activeAction = ref(null) // null | 'open' | 'open-and-latch' | 'unlatch'
  const error = ref(null)
  const history = ref([])
  const expectedUnlatch = ref(null) // { time: ISO, user: string } or null — display only
  const countdown = ref(0) // seconds remaining after gate opens
  const notificationsEnabled = ref(false) // web push opt-in
  let pollTimer = null
  let countdownTimer = null

  // Read user e-mail — will come from Cloudflare header via a server endpoint.
  // For now, falls back to a default for local dev.
  const userEmail = ref('local-dev@example.com')

  function addHistoryEntry(action) {
    const entry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      user: userEmail.value,
      action,
    }
    history.value.unshift(entry)
    saveHistory(history.value) // fire-and-forget
    // Broadcast push notification to other users (fire-and-forget)
    sendPushNotification(userEmail.value, action)
  }

  function startCountdown() {
    countdown.value = 15
    countdownTimer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        clearInterval(countdownTimer)
        countdownTimer = null
        countdown.value = 0
        activeAction.value = null
      }
    }, 1000)
  }

  /** Hydrate refs from HA (or fall back to defaults). Skipped when a gate action is in progress. */
  async function loadFromHA() {
    if (activeAction.value) return // avoid overwriting in-flight state
    const state = await loadGateState()
    if (state) {
      latched.value = state.latched
      expectedUnlatch.value = state.expectedUnlatch
      if (state.history.length) {
        history.value = state.history
      }
    }
  }

  async function handleOpen() {
    activeAction.value = 'open'
    error.value = null
    try {
      await openGate()
      addHistoryEntry('Opened gate')
      startCountdown()
    } catch (err) {
      error.value = 'Failed to open gate'
      activeAction.value = null
    }
  }

  async function handleOpenAndLatch(unlatchAt) {
    activeAction.value = 'open-and-latch'
    error.value = null
    try {
      const result = await openAndLatchGate()
      latched.value = result.latched
      saveLatchState(latched.value)
      if (unlatchAt) {
        expectedUnlatch.value = { time: unlatchAt, user: userEmail.value }
        saveExpectedUnlatch(expectedUnlatch.value)
        const when = new Date(unlatchAt).toLocaleString()
        addHistoryEntry(`Opened & latched gate (expected unlatch: ${when})`)
      } else {
        addHistoryEntry('Opened & latched gate')
      }
      startCountdown()
    } catch (err) {
      error.value = 'Failed to open & latch gate'
      activeAction.value = null
    }
  }

  async function handleUnlatch() {
    activeAction.value = 'unlatch'
    error.value = null
    try {
      const result = await unlatchGate()
      latched.value = result.latched
      expectedUnlatch.value = null
      saveLatchState(latched.value)
      saveExpectedUnlatch(null)
      addHistoryEntry('Unlatched gate')
    } catch (err) {
      error.value = 'Failed to unlatch gate'
    } finally {
      activeAction.value = null
    }
  }

  function clearExpectedUnlatch() {
    expectedUnlatch.value = null
    saveExpectedUnlatch(null)
  }

  function toggleLatchState() {
    latched.value = !latched.value
    const state = latched.value ? 'Latched Open' : 'Unlatched'
    addHistoryEntry(`Manual correction → ${state}`)
    saveLatchState(latched.value)
    if (!latched.value) {
      expectedUnlatch.value = null
      saveExpectedUnlatch(null)
    }
  }

  // Attempt to read email from backend (Cloudflare header proxy)
  async function fetchUserEmail() {
    try {
      const resp = await fetch('/api/me')
      if (resp.ok) {
        const data = await resp.json()
        if (data.email) userEmail.value = data.email
      }
    } catch {
      // Silently fall back to default in local dev
    }
  }

  /**
   * Toggle Web Push notifications on/off.
   * When enabling, subscribes to push via the push-server sidecar.
   * When disabling, unsubscribes from push.
   */
  async function toggleNotifications() {
    if (notificationsEnabled.value) {
      // Turning off — unsubscribe from push
      await unsubscribePush()
      notificationsEnabled.value = false
      localStorage.setItem('gate-notifications', 'false')
      return
    }

    // Turning on — request Notification permission, then subscribe to push
    if (typeof Notification === 'undefined') return

    let permission = Notification.permission
    if (permission === 'default') {
      permission = await Notification.requestPermission()
    }
    if (permission !== 'granted') {
      if (permission === 'denied') {
        error.value = 'Notification permission was denied — check your browser settings'
      }
      return
    }

    try {
      const sub = await subscribePush(userEmail.value)
      if (!sub) {
        error.value = 'Push notifications are not supported in this browser'
        return
      }
      notificationsEnabled.value = true
      localStorage.setItem('gate-notifications', 'true')
    } catch (err) {
      console.error('Failed to subscribe to push:', err)
      error.value = 'Failed to enable notifications — push server may be unavailable'
    }
  }

  /** Restore notification preference from localStorage and verify push state. */
  async function loadNotificationPreference() {
    const saved = localStorage.getItem('gate-notifications')
    if (saved === 'true') {
      // Verify the push subscription still exists
      const subscribed = await isPushSubscribed()
      notificationsEnabled.value = subscribed
      if (!subscribed) {
        localStorage.setItem('gate-notifications', 'false')
      }
    }
  }

  onMounted(async () => {
    await loadFromHA()
    loadNotificationPreference() // async, no need to await — runs in background
    fetchUserEmail()
    // Poll every POLL_INTERVAL_MS to sync state across neighbors
    if (haEnabled()) {
      pollTimer = setInterval(loadFromHA, POLL_INTERVAL_MS)
    }
  })

  onBeforeUnmount(() => {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
    if (countdownTimer) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
  })

  return {
    latched,
    activeAction,
    countdown,
    error,
    history,
    userEmail,
    expectedUnlatch,
    notificationsEnabled,
    handleOpen,
    handleOpenAndLatch,
    handleUnlatch,
    clearExpectedUnlatch,
    toggleLatchState,
    toggleNotifications,
  }
}
