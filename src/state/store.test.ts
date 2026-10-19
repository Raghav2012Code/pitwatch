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
    expect(s().layers.contours).toBe(false)
    s().toggleLayer('contours')
    expect(s().layers.contours).toBe(true)
    expect(s().layers.lease).toBe(true)
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

describe('picking and measuring', () => {
  const s = useAppStore.getState
  const [p1, p2, p3] = [
    { x: 1, y: 1 },
    { x: 2, y: 2 },
    { x: 3, y: 3 },
  ]

  it('reads a point with the inspect tool and opens the Inspector', () => {
    s().clearPicks()
    s().setTool('inspect')
    s().setActiveTab('overview')
    s().pickPoint(p1)
    expect(s().picked).toEqual(p1)
    expect(s().measureA).toBeNull()
    expect(s().activeTab).toBe('inspector')
  })

  it('takes two clicks to measure, and a third starts a new line', () => {
    s().clearPicks()
    s().setTool('measure')
    s().pickPoint(p1)
    expect([s().measureA, s().measureB]).toEqual([p1, null])
    s().pickPoint(p2)
    expect([s().measureA, s().measureB]).toEqual([p1, p2])
    s().pickPoint(p3)
    expect([s().measureA, s().measureB]).toEqual([p3, null])
    expect(s().picked).toBeNull()
  })

  it('clears every pick', () => {
    s().clearPicks()
    expect([s().picked, s().measureA, s().measureB]).toEqual([null, null, null])
  })

  it('selects a finding, opens its tab and asks the camera to fly there', () => {
    s().setActiveTab('overview')
    const before = s().focus?.n ?? 0
    s().selectFinding('R1-1', p2)
    expect(s().selectedFinding).toBe('R1-1')
    expect(s().activeTab).toBe('findings')
    expect(s().focus).toEqual({ p: p2, n: before + 1 })
    s().selectFinding(null)
    expect(s().selectedFinding).toBeNull()
  })

  it('switches the survey on the map', () => {
    s().setEpoch('baseline')
    expect(s().epoch).toBe('baseline')
    s().setEpoch('current')
  })
})
