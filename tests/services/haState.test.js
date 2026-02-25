import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('haState', () => {
  let haState
  const mockToken = 'test-token-abc'
  const mockBaseUrl = 'http://192.168.0.201:8123'

  beforeEach(async () => {
    vi.resetModules()
    vi.stubEnv('VITE_HA_BASE_URL', mockBaseUrl)
    vi.stubEnv('VITE_HA_TOKEN', mockToken)

    global.fetch = vi.fn()

    haState = await import('../../src/services/haState.js')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  describe('isEnabled', () => {
    it('returns true when both base URL and token are set', () => {
      expect(haState.isEnabled()).toBe(true)
    })

    it('returns false when base URL is missing', async () => {
      vi.resetModules()
      vi.stubEnv('VITE_HA_BASE_URL', '')
      vi.stubEnv('VITE_HA_TOKEN', mockToken)
      const mod = await import('../../src/services/haState.js')
      expect(mod.isEnabled()).toBe(false)
    })

    it('returns false when token is missing', async () => {
      vi.resetModules()
      vi.stubEnv('VITE_HA_BASE_URL', mockBaseUrl)
      vi.stubEnv('VITE_HA_TOKEN', '')
      const mod = await import('../../src/services/haState.js')
      expect(mod.isEnabled()).toBe(false)
    })
  })

  describe('loadGateState', () => {
    it('returns null when persistence is disabled', async () => {
      vi.resetModules()
      vi.stubEnv('VITE_HA_BASE_URL', '')
      vi.stubEnv('VITE_HA_TOKEN', '')
      const mod = await import('../../src/services/haState.js')
      const result = await mod.loadGateState()
      expect(result).toBeNull()
    })

    it('loads and parses gate state from HA', async () => {
      global.fetch = vi.fn((url) => {
        if (url.includes('input_boolean.gate_latched')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ state: 'on' }),
          })
        }
        if (url.includes('input_text.gate_expected_unlatch')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                state: JSON.stringify({ time: '2026-03-01T10:00:00Z', user: 'bob@example.com' }),
              }),
          })
        }
        if (url.includes('sensor.gate_history')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                attributes: {
                  entries: [
                    { id: 1, timestamp: '2026-02-25T12:00:00Z', user: 'bob@example.com', action: 'Opened gate' },
                  ],
                },
              }),
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      const result = await haState.loadGateState()
      expect(result).toEqual({
        latched: true,
        expectedUnlatch: { time: '2026-03-01T10:00:00Z', user: 'bob@example.com' },
        history: [
          { id: 1, timestamp: '2026-02-25T12:00:00Z', user: 'bob@example.com', action: 'Opened gate' },
        ],
      })
    })

    it('handles legacy plain ISO string for expectedUnlatch', async () => {
      global.fetch = vi.fn((url) => {
        if (url.includes('input_boolean.gate_latched')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ state: 'off' }),
          })
        }
        if (url.includes('input_text.gate_expected_unlatch')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ state: '2026-03-01T10:00:00Z' }),
          })
        }
        if (url.includes('sensor.gate_history')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ attributes: { entries: [] } }),
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      const result = await haState.loadGateState()
      expect(result.expectedUnlatch).toEqual({ time: '2026-03-01T10:00:00Z', user: '' })
    })

    it('returns null on fetch failure', async () => {
      global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 500 }))

      // Suppress console.warn
      vi.spyOn(console, 'warn').mockImplementation(() => {})

      // Need to re-import because fetch mock changed timing
      vi.resetModules()
      vi.stubEnv('VITE_HA_BASE_URL', mockBaseUrl)
      vi.stubEnv('VITE_HA_TOKEN', mockToken)
      const mod = await import('../../src/services/haState.js')

      const result = await mod.loadGateState()
      expect(result).toBeNull()
    })
  })

  describe('saveLatchState', () => {
    it('calls turn_on service when latched is true', async () => {
      global.fetch = vi.fn(() => Promise.resolve({ ok: true }))
      await haState.saveLatchState(true)

      expect(fetch).toHaveBeenCalledWith(
        '/ha-api/api/services/input_boolean/turn_on',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ entity_id: 'input_boolean.gate_latched' }),
        }),
      )
    })

    it('calls turn_off service when latched is false', async () => {
      global.fetch = vi.fn(() => Promise.resolve({ ok: true }))
      await haState.saveLatchState(false)

      expect(fetch).toHaveBeenCalledWith(
        '/ha-api/api/services/input_boolean/turn_off',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ entity_id: 'input_boolean.gate_latched' }),
        }),
      )
    })

    it('does not throw on failure (fire-and-forget)', async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error('network')))
      vi.spyOn(console, 'warn').mockImplementation(() => {})

      await expect(haState.saveLatchState(true)).resolves.toBeUndefined()
    })
  })

  describe('saveExpectedUnlatch', () => {
    it('sends JSON stringified value', async () => {
      global.fetch = vi.fn(() => Promise.resolve({ ok: true }))
      const obj = { time: '2026-03-01T10:00:00Z', user: 'bob@example.com' }
      await haState.saveExpectedUnlatch(obj)

      expect(fetch).toHaveBeenCalledWith(
        '/ha-api/api/services/input_text/set_value',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            entity_id: 'input_text.gate_expected_unlatch',
            value: JSON.stringify(obj),
          }),
        }),
      )
    })

    it('sends empty string when clearing', async () => {
      global.fetch = vi.fn(() => Promise.resolve({ ok: true }))
      await haState.saveExpectedUnlatch(null)

      expect(fetch).toHaveBeenCalledWith(
        '/ha-api/api/services/input_text/set_value',
        expect.objectContaining({
          body: JSON.stringify({
            entity_id: 'input_text.gate_expected_unlatch',
            value: '',
          }),
        }),
      )
    })
  })

  describe('saveHistory', () => {
    it('trims history to 50 entries', async () => {
      global.fetch = vi.fn(() => Promise.resolve({ ok: true }))
      const entries = Array.from({ length: 60 }, (_, i) => ({
        id: i,
        timestamp: new Date().toISOString(),
        user: 'test',
        action: 'test',
      }))

      await haState.saveHistory(entries)

      const body = JSON.parse(fetch.mock.calls[0][1].body)
      expect(body.attributes.entries).toHaveLength(50)
    })

    it('sets friendly_name and icon in attributes', async () => {
      global.fetch = vi.fn(() => Promise.resolve({ ok: true }))
      await haState.saveHistory([{ id: 1, action: 'test' }])

      const body = JSON.parse(fetch.mock.calls[0][1].body)
      expect(body.attributes.friendly_name).toBe('Gate Activity History')
      expect(body.attributes.icon).toBe('mdi:history')
    })
  })
})
