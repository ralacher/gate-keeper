import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// useTheme uses module-level state initialised at import time, so we must
// reset modules between tests that change localStorage or matchMedia.

describe('useTheme', () => {
  let matchMediaListeners = {}

  function setupMatchMedia(prefersDark) {
    matchMediaListeners = {}
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn((query) => ({
        matches: query === '(prefers-color-scheme: dark)' ? prefersDark : false,
        addEventListener: (event, cb) => { matchMediaListeners[event] = cb },
        removeEventListener: () => {},
      })),
    })
  }

  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
    setupMatchMedia(true) // default: OS is dark
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('defaults to system mode', async () => {
    const { useTheme } = await import('../../src/composables/useTheme.js')
    const { mode } = useTheme()
    expect(mode.value).toBe('system')
  })

  it('resolvedTheme is "gate" when system mode and OS is dark', async () => {
    setupMatchMedia(true)
    const { useTheme } = await import('../../src/composables/useTheme.js')
    const { resolvedTheme } = useTheme()
    expect(resolvedTheme.value).toBe('gate')
  })

  it('resolvedTheme is "gate-light" when system mode and OS is light', async () => {
    setupMatchMedia(false)
    const { useTheme } = await import('../../src/composables/useTheme.js')
    const { resolvedTheme } = useTheme()
    expect(resolvedTheme.value).toBe('gate-light')
  })

  it('cycleTheme advances system → dark → light → system', async () => {
    const { useTheme } = await import('../../src/composables/useTheme.js')
    const { mode, cycleTheme } = useTheme()

    expect(mode.value).toBe('system')
    cycleTheme()
    expect(mode.value).toBe('dark')
    cycleTheme()
    expect(mode.value).toBe('light')
    cycleTheme()
    expect(mode.value).toBe('system')
  })

  it('resolvedTheme is "gate" when mode is "dark" regardless of OS preference', async () => {
    setupMatchMedia(false) // OS is light
    const { useTheme } = await import('../../src/composables/useTheme.js')
    const { resolvedTheme, cycleTheme } = useTheme()
    cycleTheme() // system → dark
    expect(resolvedTheme.value).toBe('gate')
  })

  it('resolvedTheme is "gate-light" when mode is "light"', async () => {
    const { useTheme } = await import('../../src/composables/useTheme.js')
    const { resolvedTheme, cycleTheme } = useTheme()
    cycleTheme() // system → dark
    cycleTheme() // dark → light
    expect(resolvedTheme.value).toBe('gate-light')
  })

  it('cycleTheme persists preference to localStorage', async () => {
    const { useTheme } = await import('../../src/composables/useTheme.js')
    const { cycleTheme } = useTheme()
    cycleTheme() // → dark
    expect(localStorage.getItem('gate-theme-mode')).toBe('dark')
  })

  it('restores saved preference from localStorage on import', async () => {
    localStorage.setItem('gate-theme-mode', 'light')
    const { useTheme } = await import('../../src/composables/useTheme.js')
    const { mode } = useTheme()
    expect(mode.value).toBe('light')
  })
})
