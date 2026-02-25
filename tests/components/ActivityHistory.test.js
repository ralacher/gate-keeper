import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ActivityHistory from '../../src/components/ActivityHistory.vue'

describe('ActivityHistory', () => {
  function factory(props = {}) {
    return mount(ActivityHistory, {
      props: {
        history: [],
        ...props,
      },
    })
  }

  it('shows empty state message when no history', () => {
    const wrapper = factory()
    expect(wrapper.text()).toContain('No activity yet')
  })

  it('renders a table when history has entries', () => {
    const wrapper = factory({
      history: [
        { id: 1, timestamp: '2026-02-25T12:00:00Z', user: 'bob@example.com', action: 'Opened gate' },
      ],
    })
    expect(wrapper.find('table').exists()).toBe(true)
    expect(wrapper.text()).toContain('bob@example.com')
    expect(wrapper.text()).toContain('Opened gate')
  })

  it('renders the correct number of rows', () => {
    const entries = [
      { id: 1, timestamp: '2026-02-25T12:00:00Z', user: 'alice', action: 'Opened gate' },
      { id: 2, timestamp: '2026-02-25T12:05:00Z', user: 'bob', action: 'Unlatched gate' },
      { id: 3, timestamp: '2026-02-25T12:10:00Z', user: 'carol', action: 'Opened & latched gate' },
    ]
    const wrapper = factory({ history: entries })
    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(3)
  })

  it('applies text-primary class for "Opened gate"', () => {
    const wrapper = factory({
      history: [
        { id: 1, timestamp: '2026-02-25T12:00:00Z', user: 'test', action: 'Opened gate' },
      ],
    })
    expect(wrapper.find('.text-primary').exists()).toBe(true)
  })

  it('applies text-warning class for "Opened & latched" actions', () => {
    const wrapper = factory({
      history: [
        { id: 1, timestamp: '2026-02-25T12:00:00Z', user: 'test', action: 'Opened & latched gate (expected unlatch: soon)' },
      ],
    })
    expect(wrapper.find('.text-warning').exists()).toBe(true)
  })

  it('applies text-accent class for "Unlatched gate"', () => {
    const wrapper = factory({
      history: [
        { id: 1, timestamp: '2026-02-25T12:00:00Z', user: 'test', action: 'Unlatched gate' },
      ],
    })
    expect(wrapper.find('.text-accent').exists()).toBe(true)
  })

  it('applies text-info class for "Manual correction" actions', () => {
    const wrapper = factory({
      history: [
        { id: 1, timestamp: '2026-02-25T12:00:00Z', user: 'test', action: 'Manual correction → Latched Open' },
      ],
    })
    expect(wrapper.find('.text-info').exists()).toBe(true)
  })

  it('has table headers Date, Time, User, Action', () => {
    const wrapper = factory({
      history: [
        { id: 1, timestamp: '2026-02-25T12:00:00Z', user: 'test', action: 'Opened gate' },
      ],
    })
    const headers = wrapper.findAll('th')
    const headerTexts = headers.map((h) => h.text())
    expect(headerTexts).toEqual(['Date', 'Time', 'User', 'Action'])
  })
})
