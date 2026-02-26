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

export const featureFlags = {
  latchEnabled,
}

export function isLatchEnabled() {
  return featureFlags.latchEnabled
}