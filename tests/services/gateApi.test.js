import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// We need to mock import.meta.env before importing the module,
// so we use vi.hoisted + dynamic import patterns.

describe('gateApi — mock mode', () => {
  let gateApi

  beforeEach(async () => {
    // Reset modules so each test gets a fresh config
    vi.resetModules()

    // Set env vars for mock mode
    vi.stubEnv('VITE_MOCK', 'true')
    vi.stubEnv('VITE_HA_WEBHOOK_OPEN', '')
    vi.stubEnv('VITE_HA_WEBHOOK_OPEN_AND_LATCH', '')
    vi.stubEnv('VITE_HA_WEBHOOK_UNLATCH', '')

    gateApi = await import('../../src/services/gateApi.js')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('openGate returns success in mock mode', async () => {
    const result = await gateApi.openGate()
    expect(result).toEqual({ success: true, action: 'open' })
  })

  it('openAndLatchGate returns latched: true in mock mode', async () => {
    const result = await gateApi.openAndLatchGate()
    expect(result).toEqual({ success: true, action: 'open_and_latch', latched: true })
  })

  it('unlatchGate returns latched: false in mock mode', async () => {
    const result = await gateApi.unlatchGate()
    expect(result).toEqual({ success: true, action: 'unlatch', latched: false })
  })

  it('getLatchStatus returns false by default in mock mode', async () => {
    const result = await gateApi.getLatchStatus()
    expect(result).toEqual({ latched: false })
  })

  it('getLatchStatus reflects state after openAndLatchGate', async () => {
    await gateApi.openAndLatchGate()
    const result = await gateApi.getLatchStatus()
    expect(result).toEqual({ latched: true })
  })

  it('getLatchStatus reflects state after unlatchGate', async () => {
    await gateApi.openAndLatchGate()
    await gateApi.unlatchGate()
    const result = await gateApi.getLatchStatus()
    expect(result).toEqual({ latched: false })
  })
})

describe('gateApi — live mode', () => {
  let gateApi

  beforeEach(async () => {
    vi.resetModules()

    vi.stubEnv('VITE_MOCK', 'false')
    vi.stubEnv('VITE_HA_WEBHOOK_OPEN', 'hook-open-123')
    vi.stubEnv('VITE_HA_WEBHOOK_OPEN_AND_LATCH', 'hook-latch-456')
    vi.stubEnv('VITE_HA_WEBHOOK_UNLATCH', 'hook-unlatch-789')

    // Mock global fetch
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, status: 200 }),
    )

    gateApi = await import('../../src/services/gateApi.js')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('openGate fires the correct webhook', async () => {
    const result = await gateApi.openGate()
    expect(fetch).toHaveBeenCalledWith('/ha-api/api/webhook/hook-open-123', { method: 'POST' })
    expect(result).toEqual({ success: true, action: 'open' })
  })

  it('openAndLatchGate fires the correct webhook', async () => {
    const result = await gateApi.openAndLatchGate()
    expect(fetch).toHaveBeenCalledWith('/ha-api/api/webhook/hook-latch-456', { method: 'POST' })
    expect(result).toEqual({ success: true, action: 'open_and_latch', latched: true })
  })

  it('unlatchGate fires the correct webhook', async () => {
    const result = await gateApi.unlatchGate()
    expect(fetch).toHaveBeenCalledWith('/ha-api/api/webhook/hook-unlatch-789', { method: 'POST' })
    expect(result).toEqual({ success: true, action: 'unlatch', latched: false })
  })

  it('throws when webhook returns non-ok status', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: false, status: 500 }),
    )

    // Re-import to pick up new fetch mock
    vi.resetModules()
    gateApi = await import('../../src/services/gateApi.js')

    await expect(gateApi.openGate()).rejects.toThrow('Webhook hook-open-123 failed: 500')
  })
})
