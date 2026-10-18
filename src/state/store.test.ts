import { describe, expect, it } from 'vitest'
import { useAppStore } from './store'

describe('app store', () => {
  it('switches the active panel tab', () => {
    useAppStore.getState().setActiveTab('findings')
    expect(useAppStore.getState().activeTab).toBe('findings')
  })
})
