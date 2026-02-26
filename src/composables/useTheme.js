/**
 * Theme management composable.
 *
 * Cycles through three modes:
 *   'system' — follows the OS prefers-color-scheme setting
 *   'dark'   — always uses the 'gate' DaisyUI theme
 *   'light'  — always uses the 'gate-light' DaisyUI theme
 *
 * The resolved DaisyUI theme name is exposed as `resolvedTheme` and should be
 * bound to `data-theme` on the root element.
 *
 * Module-level state is used so a single call in App.vue and a call in
 * AppHeader.vue share the same reactive refs.
 */

import { ref, computed } from 'vue'

const STORAGE_KEY = 'gate-theme-mode'
const MODES = ['system', 'dark', 'light']

// ── Singleton state ─────────────────────────────────────────────
const mode = ref('system')

const systemIsDark = ref(
  typeof window !== 'undefined'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : true,
)

if (typeof window !== 'undefined') {
  // Restore persisted preference
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved && MODES.includes(saved)) mode.value = saved

  // Keep systemIsDark in sync with OS changes
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', (e) => {
      systemIsDark.value = e.matches
    })
}

// ── Public composable ────────────────────────────────────────────
export function useTheme() {
  /** The DaisyUI theme name to bind to data-theme. */
  const resolvedTheme = computed(() => {
    if (mode.value === 'system') {
      return systemIsDark.value ? 'gate' : 'gate-light'
    }
    return mode.value === 'dark' ? 'gate' : 'gate-light'
  })

  /** Advance to the next mode: system → dark → light → system */
  function cycleTheme() {
    const idx = MODES.indexOf(mode.value)
    mode.value = MODES[(idx + 1) % MODES.length]
    localStorage.setItem(STORAGE_KEY, mode.value)
  }

  return { mode, resolvedTheme, cycleTheme }
}
