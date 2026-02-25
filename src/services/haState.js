/**
 * Home Assistant State Persistence
 *
 * Persists gate state to HA so all neighbors see the same data.
 *
 * Required HA helpers (create via Settings → Devices & Services → Helpers):
 *   - input_boolean.gate_latched          (Toggle)
 *   - input_text.gate_expected_unlatch    (Text, max 255)
 *
 * The activity history is stored as a custom sensor via the REST API
 * (sensor.gate_history) — its attributes hold the full JSON array.
 *
 * Requires a long-lived access token (VITE_HA_TOKEN).
 * All writes are fire-and-forget; failures are logged but never block the UI.
 */

const rawBaseUrl = import.meta.env.VITE_HA_BASE_URL || ''
const token = import.meta.env.VITE_HA_TOKEN || ''

// Always proxy through /ha-api (Vite dev proxy or nginx in production) to avoid CORS
const baseUrl = '/ha-api'

const ENTITY = {
  latched: 'input_boolean.gate_latched',
  expectedUnlatch: 'input_text.gate_expected_unlatch',
  history: 'sensor.gate_history',
}

function headers() {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

/** Returns true when we have a real HA connection configured (independent of mock mode). */
export function isEnabled() {
  return !!rawBaseUrl && !!token
}

// ── Low-level helpers ────────────────────────────────────────────

async function getState(entityId) {
  const res = await fetch(`${baseUrl}/api/states/${entityId}`, {
    headers: headers(),
  })
  if (!res.ok) throw new Error(`HA ${res.status}`)
  return await res.json()
}

async function callService(domain, service, data) {
  await fetch(`${baseUrl}/api/services/${domain}/${service}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data),
  })
}

async function setEntityState(entityId, state, attributes = {}) {
  await fetch(`${baseUrl}/api/states/${entityId}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ state, attributes }),
  })
}

// ── Public API ───────────────────────────────────────────────────

/**
 * Load all persisted gate state from HA in a single parallel fetch.
 * Returns null if persistence is disabled or on failure.
 */
export async function loadGateState() {
  if (!isEnabled()) return null
  try {
    const [latchEntity, unlatchEntity, historyEntity] = await Promise.all([
      getState(ENTITY.latched),
      getState(ENTITY.expectedUnlatch),
      getState(ENTITY.history).catch(() => null), // may not exist yet
    ])

    const eu = unlatchEntity?.state
    let expectedUnlatch = null
    if (eu && eu !== '' && eu !== 'unknown') {
      try {
        expectedUnlatch = JSON.parse(eu)
      } catch {
        // Legacy plain ISO string — wrap it
        expectedUnlatch = { time: eu, user: '' }
      }
    }
    let historyEntries = []
    try {
      historyEntries = historyEntity?.attributes?.entries || []
    } catch {
      /* empty */
    }

    return {
      latched: latchEntity.state === 'on',
      expectedUnlatch,
      history: Array.isArray(historyEntries) ? historyEntries : [],
    }
  } catch (err) {
    console.warn('[haState] Failed to load gate state', err)
    return null
  }
}

/** Persist latch boolean to HA. */
export async function saveLatchState(latched) {
  if (!isEnabled()) return
  try {
    await callService(
      'input_boolean',
      latched ? 'turn_on' : 'turn_off',
      { entity_id: ENTITY.latched },
    )
  } catch (err) {
    console.warn('[haState] Failed to save latch state', err)
  }
}

/** Persist expected unlatch ({ time, user } or null) to HA as JSON. */
export async function saveExpectedUnlatch(obj) {
  if (!isEnabled()) return
  try {
    await callService('input_text', 'set_value', {
      entity_id: ENTITY.expectedUnlatch,
      value: obj ? JSON.stringify(obj) : '',
    })
  } catch (err) {
    console.warn('[haState] Failed to save expected unlatch', err)
  }
}

/**
 * Persist activity history to HA.
 * History is stored in the attributes of sensor.gate_history (no size limit).
 * We keep the last 50 entries.
 */
export async function saveHistory(entries) {
  if (!isEnabled()) return
  try {
    const trimmed = entries.slice(0, 50)
    await setEntityState(ENTITY.history, String(trimmed.length), {
      entries: trimmed,
      friendly_name: 'Gate Activity History',
      icon: 'mdi:history',
    })
  } catch (err) {
    console.warn('[haState] Failed to save history', err)
  }
}
