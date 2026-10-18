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

describe('view settings', () => {
  it('toggles live layers', () => {
    const s = useAppStore.getState
    expect(s().layers.contours).toBe(true)
    s().toggleLayer('contours')
    expect(s().layers).toEqual({ terrain: true, contours: false })
  })

  it('clamps vertical exaggeration to 1×–3×', () => {
    const s = useAppStore.getState
    s().setExaggeration(5)
    expect(s().exaggeration).toBe(3)
    s().setExaggeration(0.2)
    expect(s().exaggeration).toBe(1)
  })

  it('fires repeated camera requests', () => {
    const s = useAppStore.getState
    s().requestView('top')
    const first = s().view.n
    s().requestView('top')
    expect(s().view).toEqual({ kind: 'top', n: first + 1 })
  })
})
