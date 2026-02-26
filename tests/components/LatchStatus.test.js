import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LatchStatus from '../../src/components/LatchStatus.vue'

describe('LatchStatus', () => {
  function factory(props = {}) {
    return mount(LatchStatus, {
      props: {
        latched: false,
        expectedUnlatch: null,
        ...props,
      },
    })
  }

  it('shows "Secured" when not latched', () => {
    const wrapper = factory({ latched: false })
    expect(wrapper.text()).toContain('Secured')
    // Accent-colored status dot
    expect(wrapper.find('.bg-accent').exists()).toBe(true)
  })

  it('shows "Latched Open" when latched', () => {
    const wrapper = factory({ latched: true })
    expect(wrapper.text()).toContain('Latched Open')
    // Warning-colored status dot
    expect(wrapper.find('.bg-warning').exists()).toBe(true)
  })

  it('emits "toggle-latch" after confirmation', async () => {
    const wrapper = factory()
    await wrapper.find('.glass-card').trigger('click')
    // Modal should be open
    expect(wrapper.find('.modal-open').exists()).toBe(true)
    // Click "Yes, Change It"
    await wrapper.find('.btn-warning').trigger('click')
    expect(wrapper.emitted('toggle-latch')).toBeTruthy()
  })

  it('status bar is a button element for accessibility', () => {
    const wrapper = factory()
    // The clickable status bar must be a <button> so it is keyboard-focusable
    expect(wrapper.find('button.glass-card').exists()).toBe(true)
  })

  it('renders non-interactive status when manual toggle is disabled', () => {
    const wrapper = factory({ manualToggleEnabled: false })
    expect(wrapper.find('button.glass-card').exists()).toBe(false)
    const status = wrapper.find('[role="status"]')
    expect(status.exists()).toBe(true)
    expect(status.text()).toContain('Latch Status: Disabled')
  })

  it('status button has a descriptive aria-label', () => {
    const wrapper = factory({ latched: false })
    const btn = wrapper.find('button.glass-card')
    expect(btn.attributes('aria-label')).toContain('secured')
  })

  it('status button aria-label reflects latched state', () => {
    const wrapper = factory({ latched: true })
    const btn = wrapper.find('button.glass-card')
    expect(btn.attributes('aria-label')).toContain('latched open')
  })

  it('does not emit "toggle-latch" when cancelled', async () => {
    const wrapper = factory()
    await wrapper.find('.glass-card').trigger('click')
    expect(wrapper.find('.modal-open').exists()).toBe(true)
    // Click "Cancel"
    const cancelBtn = wrapper.findAll('.modal-box .btn').find(b => b.text() === 'Cancel')
    await cancelBtn.trigger('click')
    expect(wrapper.emitted('toggle-latch')).toBeFalsy()
    expect(wrapper.find('.modal-open').exists()).toBe(false)
  })

  it('does not show expected unlatch time when not latched', () => {
    const wrapper = factory({
      latched: false,
      expectedUnlatch: { time: '2026-03-01T10:00:00Z', user: 'bob' },
    })
    // Even with data, it shouldn't show when not latched
    expect(wrapper.text()).not.toContain('Expected unlatch')
  })

  it('shows expected unlatch time when latched', () => {
    const wrapper = factory({
      latched: true,
      expectedUnlatch: { time: '2026-03-01T10:00:00Z', user: 'bob@example.com' },
    })
    expect(wrapper.text()).toContain('Expected unlatch at')
    expect(wrapper.text()).toContain('bob@example.com')
  })

  it('shows "unknown" when expected unlatch has no user', () => {
    const wrapper = factory({
      latched: true,
      expectedUnlatch: { time: '2026-03-01T10:00:00Z', user: '' },
    })
    expect(wrapper.text()).toContain('unknown')
  })

  it('emits "clear-expected" when dismiss button is clicked', async () => {
    const wrapper = factory({
      latched: true,
      expectedUnlatch: { time: '2026-03-01T10:00:00Z', user: 'bob@example.com' },
    })
    await wrapper.find('button[title="Dismiss"]').trigger('click')
    expect(wrapper.emitted('clear-expected')).toBeTruthy()
  })

  it('does not show expected unlatch when null', () => {
    const wrapper = factory({ latched: true, expectedUnlatch: null })
    expect(wrapper.text()).not.toContain('Expected unlatch')
  })
})
