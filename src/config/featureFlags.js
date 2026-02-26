function parseBooleanFlag(value, defaultValue = true) {
  if (value === undefined || value === null || value === '') {
    return defaultValue
  }

  const normalized = String(value).trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false
  }

  return defaultValue
}

const latchEnabled = parseBooleanFlag(
  import.meta.env.VITE_FEATURE_LATCH_ENABLED,
  true,
)

const gateDetectionEnabled = parseBooleanFlag(
  import.meta.env.VITE_FEATURE_GATE_DETECTION_ENABLED,
  false,
)

export const featureFlags = {
  latchEnabled,
  gateDetectionEnabled,
}

export function isLatchEnabled() {
  return featureFlags.latchEnabled
}

export function isGateDetectionEnabled() {
  return featureFlags.gateDetectionEnabled
}