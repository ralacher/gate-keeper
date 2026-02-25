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

  it('shows "Unlatched" when not latched', () => {
    const wrapper = factory({ latched: false })
    expect(wrapper.text()).toContain('Unlatched')
    expect(wrapper.find('.alert-success').exists()).toBe(true)
  })

  it('shows "Latched Open" when latched', () => {
    const wrapper = factory({ latched: true })
    expect(wrapper.text()).toContain('Latched Open')
    expect(wrapper.find('.alert-warning').exists()).toBe(true)
  })

  it('emits "toggle-latch" when alert is clicked', async () => {
    const wrapper = factory()
    await wrapper.find('.alert').trigger('click')
    expect(wrapper.emitted('toggle-latch')).toBeTruthy()
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

  it('does not show expected unlatch when null', () => {
    const wrapper = factory({ latched: true, expectedUnlatch: null })
    expect(wrapper.text()).not.toContain('Expected unlatch')
  })
})
