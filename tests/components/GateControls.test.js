import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import GateControls from '../../src/components/GateControls.vue'

describe('GateControls', () => {
  function factory(props = {}) {
    return mount(GateControls, {
      props: {
        activeAction: null,
        latched: false,
        countdown: 0,
        ...props,
      },
    })
  }

  it('renders three buttons', () => {
    const wrapper = factory()
    const buttons = wrapper.findAll('button')
    expect(buttons).toHaveLength(3)
  })

  it('shows Open, Latch, Unlatch labels', () => {
    const wrapper = factory()
    const text = wrapper.text()
    expect(text).toContain('Open')
    expect(text).toContain('Latch')
    expect(text).toContain('Unlatch')
  })

  it('disables Open and Latch when latched', () => {
    const wrapper = factory({ latched: true })
    const buttons = wrapper.findAll('button')
    // Open and Latch are disabled
    expect(buttons[0].attributes('disabled')).toBeDefined()
    expect(buttons[1].attributes('disabled')).toBeDefined()
    // Unlatch is enabled
    expect(buttons[2].attributes('disabled')).toBeUndefined()
  })

  it('disables Unlatch when not latched', () => {
    const wrapper = factory({ latched: false })
    const buttons = wrapper.findAll('button')
    expect(buttons[2].attributes('disabled')).toBeDefined()
  })

  it('disables all buttons when an action is active', () => {
    const wrapper = factory({ activeAction: 'open' })
    const buttons = wrapper.findAll('button')
    buttons.forEach((btn) => {
      expect(btn.attributes('disabled')).toBeDefined()
    })
  })

  it('emits "open" when Open button is clicked', async () => {
    const wrapper = factory()
    const buttons = wrapper.findAll('button')
    await buttons[0].trigger('click')
    expect(wrapper.emitted('open')).toBeTruthy()
  })

  it('emits "open-and-latch" when Latch button is clicked', async () => {
    const wrapper = factory()
    const buttons = wrapper.findAll('button')
    await buttons[1].trigger('click')
    expect(wrapper.emitted('open-and-latch')).toBeTruthy()
  })

  it('emits "unlatch" when Unlatch button is clicked', async () => {
    const wrapper = factory({ latched: true })
    const buttons = wrapper.findAll('button')
    await buttons[2].trigger('click')
    expect(wrapper.emitted('unlatch')).toBeTruthy()
  })

  it('shows spinner when action is active with no countdown', () => {
    const wrapper = factory({ activeAction: 'open', countdown: 0 })
    expect(wrapper.find('.loading-spinner').exists()).toBe(true)
  })

  it('shows countdown when action is active with countdown > 0', () => {
    const wrapper = factory({ activeAction: 'open', countdown: 10 })
    expect(wrapper.find('.countdown').exists()).toBe(true)
    expect(wrapper.text()).toContain('Gate open')
  })

  it('shows "Opening…" during spinner phase', () => {
    const wrapper = factory({ activeAction: 'open', countdown: 0 })
    expect(wrapper.text()).toContain('Opening…')
  })

  it('shows "Unlatching…" during unlatch action', () => {
    const wrapper = factory({ activeAction: 'unlatch', latched: true })
    expect(wrapper.text()).toContain('Unlatching…')
  })
})
