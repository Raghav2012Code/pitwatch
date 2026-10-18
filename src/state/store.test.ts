import { describe, expect, it } from 'vitest'
import { useAppStore } from './store'

describe('app store', () => {
  it('switches the active panel tab', () => {
    useAppStore.getState().setActiveTab('findings')
    expect(useAppStore.getState().activeTab).toBe('findings')
  })

  it('collapses and restores each side panel independently', () => {
    const s = useAppStore.getState
    s().toggleLayers()
    expect([s().layersHidden, s().detailsHidden]).toEqual([true, false])
    s().toggleDetails()
    s().toggleLayers()
    expect([s().layersHidden, s().detailsHidden]).toEqual([false, true])
  })
})
