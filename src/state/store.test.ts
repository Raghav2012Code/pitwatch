import { describe, expect, it } from 'vitest'
import { useAppStore } from './store'

describe('app store', () => {
  it('switches the active panel tab', () => {
    useAppStore.getState().setActiveTab('inspector')
    expect(useAppStore.getState().activeTab).toBe('inspector')
    useAppStore.getState().setActiveTab('findings')
    expect(useAppStore.getState().activeTab).toBe('findings')
  })

  it('remembers the sidebar choice and the phone menu separately', () => {
    const s = useAppStore.getState
    expect([s().sidebar, s().menuOpen]).toEqual(['rail', false])
    s().setSidebar('rail')
    s().setMenuOpen(true)
    expect([s().sidebar, s().menuOpen]).toEqual(['rail', true])
    s().setSidebar('auto')
    s().setMenuOpen(false)
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
    expect(s().layers.zones).toBe(false)
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
    s().setActiveTab('findings')
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
    s().setActiveTab('inspector')
    const before = s().focus?.n ?? 0
    s().selectFinding('R1-1', p2)
    expect(s().selectedFinding).toBe('R1-1')
    expect(s().activeTab).toBe('findings')
    expect(s().focus).toEqual({ p: p2, n: before + 1 })
    s().selectFinding(null)
    expect(s().selectedFinding).toBeNull()
  })

  it('restores the survey, layers, and detail access needed to inspect a finding', () => {
    const state = useAppStore.getState()
    useAppStore.setState({
      epoch: 'baseline',
      layers: { ...state.layers, terrain: false, findings: false },
      detailsHidden: true,
      drawerOpen: true,
      activeTab: 'inspector',
    })

    useAppStore.getState().selectFinding('R2-1', p2)
    const selected = useAppStore.getState()

    expect(selected.selectedFinding).toBe('R2-1')
    expect(selected.epoch).toBe('current')
    expect(selected.layers.terrain).toBe(true)
    expect(selected.layers.findings).toBe(true)
    expect(selected.detailsHidden).toBe(false)
    expect(selected.drawerOpen).toBe(false)
    expect(selected.activeTab).toBe('findings')
  })

  it('forgets camera requests when the map closes', () => {
    s().requestView('top')
    s().selectFinding('R1-1', p2)
    s().setDrawerOpen(true)
    s().leaveMap()
    expect(s().focus).toBeNull()
    expect(s().view).toEqual({ kind: 'intro', n: 0 })
    expect(s().drawerOpen).toBe(false)
  })

  it('switches the survey on the map', () => {
    s().setEpoch('baseline')
    expect(s().epoch).toBe('baseline')
    s().setEpoch('current')
  })
})
