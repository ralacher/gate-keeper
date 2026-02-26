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

const openAndLatchEnabled = parseBooleanFlag(
  import.meta.env.VITE_FEATURE_OPEN_AND_LATCH_ENABLED,
  true,
)

const unlatchEnabled = parseBooleanFlag(
  import.meta.env.VITE_FEATURE_UNLATCH_ENABLED,
  true,
)

export const featureFlags = {
  openAndLatchEnabled,
  unlatchEnabled,
}

export function isOpenAndLatchEnabled() {
  return featureFlags.openAndLatchEnabled
}

export function isUnlatchEnabled() {
  return featureFlags.unlatchEnabled
}

export function isAnyLatchActionEnabled() {
  return featureFlags.openAndLatchEnabled || featureFlags.unlatchEnabled
}