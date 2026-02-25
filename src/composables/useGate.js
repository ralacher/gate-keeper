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

/**
 * Composable that manages gate state, actions, and activity history.
 * State is persisted to Home Assistant helpers when configured,
 * and polled every 30 s so all neighbors stay in sync.
 */
export function useGate() {
  const latched = ref(false)
  const activeAction = ref(null) // null | 'open' | 'open-and-latch' | 'unlatch'
  const error = ref(null)
  const history = ref([])
  const expectedUnlatch = ref(null) // { time: ISO, user: string } or null — display only
  let pollTimer = null

  // Read user e-mail — will come from Cloudflare header via a server endpoint.
  // For now, falls back to a default for local dev.
  const userEmail = ref('local-dev@example.com')

  function addHistoryEntry(action) {
    history.value.unshift({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      user: userEmail.value,
      action,
    })
    saveHistory(history.value) // fire-and-forget
  }

  /** Hydrate refs from HA (or fall back to defaults). */
  async function loadFromHA() {
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
    } catch (err) {
      error.value = 'Failed to open gate'
    } finally {
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
    } catch (err) {
      error.value = 'Failed to open & latch gate'
    } finally {
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

  onMounted(async () => {
    await loadFromHA()
    fetchUserEmail()
    // Poll every 30 s to sync state across neighbors
    if (haEnabled()) {
      pollTimer = setInterval(loadFromHA, 30_000)
    }
  })

  onBeforeUnmount(() => {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  })

  return {
    latched,
    activeAction,
    error,
    history,
    userEmail,
    expectedUnlatch,
    handleOpen,
    handleOpenAndLatch,
    handleUnlatch,
    clearExpectedUnlatch,
    toggleLatchState,
  }
}
