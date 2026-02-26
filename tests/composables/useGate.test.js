import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'

// Mock gateApi
vi.mock('../../src/services/gateApi.js', () => ({
  openGate: vi.fn(() => Promise.resolve({ success: true, action: 'open' })),
  openAndLatchGate: vi.fn(() =>
    Promise.resolve({ success: true, action: 'open_and_latch', latched: true }),
  ),
  unlatchGate: vi.fn(() =>
    Promise.resolve({ success: true, action: 'unlatch', latched: false }),
  ),
}))

// Mock haState
vi.mock('../../src/services/haState.js', () => ({
  isEnabled: vi.fn(() => false),
  loadGateState: vi.fn(() => Promise.resolve(null)),
  saveLatchState: vi.fn(),
  saveExpectedUnlatch: vi.fn(),
  saveHistory: vi.fn(),
}))

// Mock pushService
vi.mock('../../src/services/pushService.js', () => ({
  subscribePush: vi.fn(() => Promise.resolve({})),
  unsubscribePush: vi.fn(() => Promise.resolve()),
  sendPushNotification: vi.fn(() => Promise.resolve()),
  isPushSubscribed: vi.fn(() => Promise.resolve(false)),
}))

// Mock fetch for /api/me
global.fetch = vi.fn(() =>
  Promise.resolve({ ok: false }),
)

import { useGate } from '../../src/composables/useGate.js'
import * as gateApi from '../../src/services/gateApi.js'
import * as haState from '../../src/services/haState.js'
import * as pushService from '../../src/services/pushService.js'

// Helper: mount useGate inside a real component to get Vue lifecycle
function mountComposable() {
  let result
  const TestComponent = defineComponent({
    setup() {
      result = useGate()
      return result
    },
    render() {
      return null
    },
  })
  const wrapper = mount(TestComponent)
  return { result, wrapper }
}

describe('useGate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('initializes with default state', async () => {
    const { result, wrapper } = mountComposable()
    await nextTick()
    await nextTick()

    expect(result.latched.value).toBe(false)
    expect(result.activeAction.value).toBeNull()
    expect(result.countdown.value).toBe(0)
    expect(result.error.value).toBeNull()
    expect(result.history.value).toEqual([])
    expect(result.expectedUnlatch.value).toBeNull()

    wrapper.unmount()
  })

  it('hydrates state from HA on mount', async () => {
    haState.loadGateState.mockResolvedValueOnce({
      latched: true,
      expectedUnlatch: { time: '2026-03-01T10:00:00Z', user: 'bob@example.com' },
      history: [
        { id: 1, timestamp: '2026-02-25T12:00:00Z', user: 'bob@example.com', action: 'Opened gate' },
      ],
    })

    const { result, wrapper } = mountComposable()
    // Wait for async loadFromHA to resolve
    await vi.runAllTimersAsync()
    await nextTick()

    expect(result.latched.value).toBe(true)
    expect(result.expectedUnlatch.value).toEqual({
      time: '2026-03-01T10:00:00Z',
      user: 'bob@example.com',
    })
    expect(result.history.value).toHaveLength(1)

    wrapper.unmount()
  })

  it('handleOpen calls openGate and adds history entry', async () => {
    const { result, wrapper } = mountComposable()
    await nextTick()

    await result.handleOpen()
    await nextTick()

    expect(gateApi.openGate).toHaveBeenCalled()
    expect(result.history.value[0].action).toBe('Opened gate')
    expect(result.activeAction.value).toBe('open') // still active during countdown
    expect(result.countdown.value).toBe(15)
    expect(haState.saveHistory).toHaveBeenCalled()

    wrapper.unmount()
  })

  it('handleOpen sets error on failure', async () => {
    gateApi.openGate.mockRejectedValueOnce(new Error('fail'))

    const { result, wrapper } = mountComposable()
    await nextTick()

    await result.handleOpen()
    await nextTick()

    expect(result.error.value).toBe('Failed to open gate')
    expect(result.activeAction.value).toBeNull()

    wrapper.unmount()
  })

  it('handleOpenAndLatch sets latched state and saves to HA', async () => {
    const { result, wrapper } = mountComposable()
    await nextTick()

    await result.handleOpenAndLatch('2026-03-01T10:00:00')
    await nextTick()

    expect(gateApi.openAndLatchGate).toHaveBeenCalled()
    expect(result.latched.value).toBe(true)
    expect(result.expectedUnlatch.value.time).toBe('2026-03-01T10:00:00')
    expect(result.history.value[0].action).toContain('Opened & latched gate')
    expect(haState.saveLatchState).toHaveBeenCalledWith(true)
    expect(haState.saveExpectedUnlatch).toHaveBeenCalled()

    wrapper.unmount()
  })

  it('handleOpenAndLatch without unlatch time omits it from history', async () => {
    const { result, wrapper } = mountComposable()
    await nextTick()

    await result.handleOpenAndLatch(null)
    await nextTick()

    expect(result.history.value[0].action).toBe('Opened & latched gate')
    expect(result.expectedUnlatch.value).toBeNull()

    wrapper.unmount()
  })

  it('handleUnlatch clears latch state and expected unlatch', async () => {
    const { result, wrapper } = mountComposable()
    await nextTick()

    // Set up latched state first
    result.latched.value = true
    result.expectedUnlatch.value = { time: '2026-03-01T10:00:00Z', user: 'test' }

    await result.handleUnlatch()
    await nextTick()

    expect(gateApi.unlatchGate).toHaveBeenCalled()
    expect(result.latched.value).toBe(false)
    expect(result.expectedUnlatch.value).toBeNull()
    expect(result.activeAction.value).toBeNull() // no countdown for unlatch
    expect(haState.saveLatchState).toHaveBeenCalledWith(false)
    expect(haState.saveExpectedUnlatch).toHaveBeenCalledWith(null)

    wrapper.unmount()
  })

  it('toggleLatchState flips the latch and records manual correction', async () => {
    const { result, wrapper } = mountComposable()
    await nextTick()

    expect(result.latched.value).toBe(false)

    result.toggleLatchState()
    expect(result.latched.value).toBe(true)
    expect(result.history.value[0].action).toBe('Manual correction → Latched Open')
    expect(haState.saveLatchState).toHaveBeenCalledWith(true)

    result.toggleLatchState()
    expect(result.latched.value).toBe(false)
    expect(result.history.value[0].action).toBe('Manual correction → Unlatched')
    // Unlatching should clear expected unlatch
    expect(haState.saveExpectedUnlatch).toHaveBeenCalledWith(null)

    wrapper.unmount()
  })

  it('clearExpectedUnlatch clears the value and persists', async () => {
    const { result, wrapper } = mountComposable()
    await nextTick()

    result.expectedUnlatch.value = { time: '2026-03-01T10:00:00Z', user: 'test' }
    result.clearExpectedUnlatch()

    expect(result.expectedUnlatch.value).toBeNull()
    expect(haState.saveExpectedUnlatch).toHaveBeenCalledWith(null)

    wrapper.unmount()
  })

  it('countdown ticks down and clears activeAction', async () => {
    const { result, wrapper } = mountComposable()
    await nextTick()

    await result.handleOpen()
    expect(result.countdown.value).toBe(15)
    expect(result.activeAction.value).toBe('open')

    // Tick 15 seconds
    for (let i = 14; i >= 0; i--) {
      vi.advanceTimersByTime(1000)
      await nextTick()
      expect(result.countdown.value).toBe(i)
    }

    expect(result.activeAction.value).toBeNull()
    expect(result.countdown.value).toBe(0)

    wrapper.unmount()
  })

  // --- Web Push notification tests ---

  describe('notifications', () => {
    beforeEach(() => {
      global.Notification = vi.fn()
      global.Notification.permission = 'default'
      global.Notification.requestPermission = vi.fn(() => Promise.resolve('granted'))
      localStorage.clear()
    })

    afterEach(() => {
      delete global.Notification
    })

    it('toggleNotifications subscribes to push when permission granted', async () => {
      global.Notification.permission = 'default'
      global.Notification.requestPermission = vi.fn(() => Promise.resolve('granted'))

      const { result, wrapper } = mountComposable()
      await nextTick()

      expect(result.notificationsEnabled.value).toBe(false)

      await result.toggleNotifications()
      expect(global.Notification.requestPermission).toHaveBeenCalled()
      expect(pushService.subscribePush).toHaveBeenCalledWith('local-dev@example.com')
      expect(result.notificationsEnabled.value).toBe(true)
      expect(localStorage.getItem('gate-notifications')).toBe('true')

      wrapper.unmount()
    })

    it('toggleNotifications unsubscribes when already enabled', async () => {
      localStorage.setItem('gate-notifications', 'true')
      pushService.isPushSubscribed.mockResolvedValueOnce(true)

      const { result, wrapper } = mountComposable()
      await vi.advanceTimersByTimeAsync(0)
      await nextTick()

      expect(result.notificationsEnabled.value).toBe(true)

      await result.toggleNotifications()
      expect(pushService.unsubscribePush).toHaveBeenCalled()
      expect(result.notificationsEnabled.value).toBe(false)
      expect(localStorage.getItem('gate-notifications')).toBe('false')

      wrapper.unmount()
    })

    it('toggleNotifications stays off when permission is denied', async () => {
      global.Notification.permission = 'default'
      global.Notification.requestPermission = vi.fn(() => Promise.resolve('denied'))

      const { result, wrapper } = mountComposable()
      await nextTick()

      await result.toggleNotifications()
      expect(result.notificationsEnabled.value).toBe(false)
      expect(pushService.subscribePush).not.toHaveBeenCalled()

      wrapper.unmount()
    })

    it('loadNotificationPreference restores true when push is subscribed', async () => {
      localStorage.setItem('gate-notifications', 'true')
      pushService.isPushSubscribed.mockResolvedValueOnce(true)

      const { result, wrapper } = mountComposable()
      await vi.advanceTimersByTimeAsync(0)
      await nextTick()

      expect(result.notificationsEnabled.value).toBe(true)

      wrapper.unmount()
    })

    it('loadNotificationPreference resets when push subscription is gone', async () => {
      localStorage.setItem('gate-notifications', 'true')
      pushService.isPushSubscribed.mockResolvedValueOnce(false)

      const { result, wrapper } = mountComposable()
      await vi.advanceTimersByTimeAsync(0)
      await nextTick()

      expect(result.notificationsEnabled.value).toBe(false)
      expect(localStorage.getItem('gate-notifications')).toBe('false')

      wrapper.unmount()
    })

    it('sends push notification on gate action', async () => {
      const { result, wrapper } = mountComposable()
      await nextTick()

      await result.handleOpen()
      await nextTick()

      expect(pushService.sendPushNotification).toHaveBeenCalledWith(
        'local-dev@example.com',
        'Opened gate',
      )

      wrapper.unmount()
    })

    it('sends push notification on latch action', async () => {
      const { result, wrapper } = mountComposable()
      await nextTick()

      await result.handleOpenAndLatch(null)
      await nextTick()

      expect(pushService.sendPushNotification).toHaveBeenCalledWith(
        'local-dev@example.com',
        'Opened & latched gate',
      )

      wrapper.unmount()
    })

    it('sends push notification on unlatch action', async () => {
      const { result, wrapper } = mountComposable()
      await nextTick()

      await result.handleUnlatch()
      await nextTick()

      expect(pushService.sendPushNotification).toHaveBeenCalledWith(
        'local-dev@example.com',
        'Unlatched gate',
      )

      wrapper.unmount()
    })
  })
})
