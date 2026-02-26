/**
 * Trigger a short haptic pulse on devices that support the Vibration API.
 * Silently no-ops in environments where the API is unavailable (desktop, Safari iOS < 13, etc.)
 *
 * @param {number | number[]} pattern - Duration in ms, or array of [vibrate, pause, vibrate, …]
 */
export function haptic(pattern = 10) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}
