/**
 * Gate API Service — Home Assistant Webhooks
 *
 * Each gate action is triggered by POSTing to a dedicated HA webhook URL.
 * Webhook IDs are configured via environment variables (VITE_ prefixed for Vite).
 *
 * When VITE_MOCK=true (or webhooks are not configured), responses are simulated
 * so the UI can be developed without a live Home Assistant instance.
 */

const config = {
  baseUrl: import.meta.env.VITE_HA_BASE_URL || 'http://localhost:8123',
  webhookOpen: import.meta.env.VITE_HA_WEBHOOK_OPEN || '',
  webhookOpenAndLatch: import.meta.env.VITE_HA_WEBHOOK_OPEN_AND_LATCH || '',
  webhookUnlatch: import.meta.env.VITE_HA_WEBHOOK_UNLATCH || '',
  mock: import.meta.env.VITE_MOCK === 'true' || !import.meta.env.VITE_HA_WEBHOOK_OPEN,
}

// Simulated delay to mimic network latency (ms)
const MOCK_DELAY = 600

// In-memory mock state
let mockLatchState = false // false = unlatched, true = latched

function delay(ms = MOCK_DELAY) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Fire a Home Assistant webhook by ID.
 */
async function fireWebhook(webhookId) {
  const url = `${config.baseUrl}/api/webhook/${webhookId}`
  const resp = await fetch(url, { method: 'POST' })
  if (!resp.ok) {
    throw new Error(`Webhook ${webhookId} failed: ${resp.status}`)
  }
  return resp
}

/**
 * Open the gate (momentary trigger).
 */
export async function openGate() {
  if (config.mock) {
    await delay()
    console.log(`[MOCK] POST ${config.baseUrl}/api/webhook/${config.webhookOpen || '<OPEN_ID>'}`)
    return { success: true, action: 'open' }
  }
  await fireWebhook(config.webhookOpen)
  return { success: true, action: 'open' }
}

/**
 * Open the gate and latch it open.
 */
export async function openAndLatchGate() {
  if (config.mock) {
    await delay()
    mockLatchState = true
    console.log(`[MOCK] POST ${config.baseUrl}/api/webhook/${config.webhookOpenAndLatch || '<OPEN_AND_LATCH_ID>'}`)
    return { success: true, action: 'open_and_latch', latched: true }
  }
  await fireWebhook(config.webhookOpenAndLatch)
  return { success: true, action: 'open_and_latch', latched: true }
}

/**
 * Unlatch the gate (release latch so it can close).
 */
export async function unlatchGate() {
  if (config.mock) {
    await delay()
    mockLatchState = false
    console.log(`[MOCK] POST ${config.baseUrl}/api/webhook/${config.webhookUnlatch || '<UNLATCH_ID>'}`)
    return { success: true, action: 'unlatch', latched: false }
  }
  await fireWebhook(config.webhookUnlatch)
  return { success: true, action: 'unlatch', latched: false }
}

/**
 * Get the current latch status.
 * Note: With webhooks there is no direct state query — status is tracked
 * client-side based on the last action performed. The mock preserves
 * simulated state for development.
 */
export async function getLatchStatus() {
  if (config.mock) {
    await delay(300)
    console.log('[MOCK] getLatchStatus →', mockLatchState)
    return { latched: mockLatchState }
  }
  // Real implementation: no HA state query available via webhooks.
  // Latch state is tracked locally after each action.
  return { latched: false }
}
