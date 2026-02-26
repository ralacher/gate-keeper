import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Reset modules before each test to clear cached vapidPublicKey
beforeEach(() => {
  vi.resetModules()
  vi.restoreAllMocks()
  global.fetch = vi.fn()
})

afterEach(() => {
  delete global.fetch
})

describe('pushService', () => {
  describe('subscribePush', () => {
    it('fetches VAPID key and subscribes', async () => {
      const mockSubscription = {
        endpoint: 'https://push.example.com/sub/123',
        toJSON: () => ({ endpoint: 'https://push.example.com/sub/123', keys: { p256dh: 'key', auth: 'auth' } }),
      }

      // Mock navigator.serviceWorker
      const mockRegistration = {
        pushManager: {
          getSubscription: vi.fn(() => Promise.resolve(null)),
          subscribe: vi.fn(() => Promise.resolve(mockSubscription)),
        },
      }

      Object.defineProperty(global, 'navigator', {
        value: { serviceWorker: { ready: Promise.resolve(mockRegistration) } },
        writable: true,
        configurable: true,
      })

      Object.defineProperty(global, 'window', {
        value: { PushManager: {} },
        writable: true,
        configurable: true,
      })

      // Mock fetch for VAPID key and subscribe — use valid base64url VAPID key
      const fakeVapidKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkPs7U6kkYDVqQPc9pY3i_y0M5i3Fg76WC7miibrEQ'
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ publicKey: fakeVapidKey }) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ ok: true }) })

      const { subscribePush } = await import('../../src/services/pushService.js')
      const result = await subscribePush('alice@example.com')

      expect(result).toBe(mockSubscription)
      expect(global.fetch).toHaveBeenCalledWith('/push/vapid-key')
      expect(global.fetch).toHaveBeenCalledWith('/push/subscribe', expect.objectContaining({
        method: 'POST',
      }))
    })
  })

  describe('unsubscribePush', () => {
    it('unsubscribes and notifies server', async () => {
      const mockSubscription = {
        endpoint: 'https://push.example.com/sub/123',
        unsubscribe: vi.fn(() => Promise.resolve(true)),
      }

      const mockRegistration = {
        pushManager: {
          getSubscription: vi.fn(() => Promise.resolve(mockSubscription)),
        },
      }

      Object.defineProperty(global, 'navigator', {
        value: { serviceWorker: { ready: Promise.resolve(mockRegistration) } },
        writable: true,
        configurable: true,
      })

      Object.defineProperty(global, 'window', {
        value: { PushManager: {} },
        writable: true,
        configurable: true,
      })

      global.fetch = vi.fn().mockResolvedValue({ ok: true })

      const { unsubscribePush } = await import('../../src/services/pushService.js')
      await unsubscribePush()

      expect(mockSubscription.unsubscribe).toHaveBeenCalled()
      expect(global.fetch).toHaveBeenCalledWith('/push/unsubscribe', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ endpoint: 'https://push.example.com/sub/123' }),
      }))
    })
  })

  describe('sendPushNotification', () => {
    it('sends notification to push server', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true })

      const { sendPushNotification } = await import('../../src/services/pushService.js')
      await sendPushNotification('bob@example.com', 'Opened gate')

      expect(global.fetch).toHaveBeenCalledWith('/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: 'bob@example.com',
          title: 'Gate Activity',
          body: 'bob@example.com: Opened gate',
        }),
      })
    })

    it('does not throw when push server is down', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('network error'))

      const { sendPushNotification } = await import('../../src/services/pushService.js')
      await expect(sendPushNotification('bob@example.com', 'Opened gate')).resolves.toBeUndefined()
    })
  })

  describe('isPushSubscribed', () => {
    it('returns true when subscription exists', async () => {
      const mockRegistration = {
        pushManager: {
          getSubscription: vi.fn(() => Promise.resolve({ endpoint: 'https://push.example.com' })),
        },
      }

      Object.defineProperty(global, 'navigator', {
        value: { serviceWorker: { ready: Promise.resolve(mockRegistration) } },
        writable: true,
        configurable: true,
      })

      Object.defineProperty(global, 'window', {
        value: { PushManager: {} },
        writable: true,
        configurable: true,
      })

      const { isPushSubscribed } = await import('../../src/services/pushService.js')
      const result = await isPushSubscribed()
      expect(result).toBe(true)
    })

    it('returns false when no subscription', async () => {
      const mockRegistration = {
        pushManager: {
          getSubscription: vi.fn(() => Promise.resolve(null)),
        },
      }

      Object.defineProperty(global, 'navigator', {
        value: { serviceWorker: { ready: Promise.resolve(mockRegistration) } },
        writable: true,
        configurable: true,
      })

      Object.defineProperty(global, 'window', {
        value: { PushManager: {} },
        writable: true,
        configurable: true,
      })

      const { isPushSubscribed } = await import('../../src/services/pushService.js')
      const result = await isPushSubscribed()
      expect(result).toBe(false)
    })

    it('returns false when APIs not available', async () => {
      // No serviceWorker or PushManager
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      })

      const { isPushSubscribed } = await import('../../src/services/pushService.js')
      const result = await isPushSubscribed()
      expect(result).toBe(false)
    })
  })
})
