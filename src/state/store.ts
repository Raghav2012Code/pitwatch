import { create } from 'zustand'
import type { Vec2 } from '../domain/types'
import type { ViewRequest } from '../scene/presets'

export type PanelTab = 'overview' | 'findings' | 'inspector' | 'about'
export type LayerId =
  'terrain' | 'tint' | 'contours' | 'lease' | 'buffer' | 'zones' | 'change' | 'findings'

/** What a click on the terrain does. */
export type Tool = 'inspect' | 'measure'
/** Which survey the map shows. */
export type Epoch = 'baseline' | 'current'

export const EXAGGERATION = { min: 1, max: 3, initial: 1.5 } as const

interface AppState {
  activeTab: PanelTab
  drawerOpen: boolean
  /** Desktop only: panels collapsed to give the map more room. */
  layersHidden: boolean
  detailsHidden: boolean
  layers: Record<LayerId, boolean>
  exaggeration: number
  tool: Tool
  epoch: Epoch
  /** Point read by the inspect tool, local metres. */
  picked: Vec2 | null
  /** Measure tool endpoints, local metres. */
  measureA: Vec2 | null
  measureB: Vec2 | null
  selectedFinding: string | null
  /** Latest fly-to request (local metres); `n` changes on every request. */
  focus: { p: Vec2; n: number } | null
  /** Latest camera request; `n` changes on every request so repeats still fire. */
  view: { kind: ViewRequest; n: number }
  setActiveTab: (tab: PanelTab) => void
  setDrawerOpen: (open: boolean) => void
  toggleLayers: () => void
  toggleDetails: () => void
  toggleLayer: (id: LayerId) => void
  setExaggeration: (v: number) => void
  requestView: (kind: ViewRequest) => void
  setTool: (tool: Tool) => void
  setEpoch: (epoch: Epoch) => void
  /** A click on the terrain: reads a point, or sets the next measure endpoint. */
  pickPoint: (p: Vec2) => void
  clearPicks: () => void
  /** Selects a finding (or none), opens the Findings tab and optionally flies to it. */
  selectFinding: (id: string | null, at?: Vec2) => void
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: 'overview',
  drawerOpen: false,
  layersHidden: false,
  detailsHidden: false,
  // Natural look by default: aerial image, no tint or contours; the lease line and the
  // engine's findings are on because they are what the monitor is for.
  layers: {
    terrain: true,
    tint: false,
    contours: false,
    lease: true,
    buffer: false,
    zones: false,
    change: false,
    findings: true,
  },
  exaggeration: EXAGGERATION.initial,
  tool: 'inspect',
  epoch: 'current',
  picked: null,
  measureA: null,
  measureB: null,
  selectedFinding: null,
  focus: null,
  view: { kind: 'intro', n: 0 },
  setActiveTab: (activeTab) => set({ activeTab }),
  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
  toggleLayers: () => set((s) => ({ layersHidden: !s.layersHidden })),
  toggleDetails: () => set((s) => ({ detailsHidden: !s.detailsHidden })),
  toggleLayer: (id) => set((s) => ({ layers: { ...s.layers, [id]: !s.layers[id] } })),
  setExaggeration: (v) =>
    set({ exaggeration: Math.min(EXAGGERATION.max, Math.max(EXAGGERATION.min, v)) }),
  requestView: (kind) => set((s) => ({ view: { kind, n: s.view.n + 1 } })),
  setTool: (tool) => set({ tool }),
  setEpoch: (epoch) => set({ epoch }),
  pickPoint: (p) =>
    set((s) => {
      if (s.tool === 'inspect') return { picked: p, activeTab: 'inspector' }
      // Third click starts a new line.
      return s.measureA && !s.measureB
        ? { measureB: p, activeTab: 'inspector' }
        : { measureA: p, measureB: null, activeTab: 'inspector' }
    }),
  clearPicks: () => set({ picked: null, measureA: null, measureB: null }),
  selectFinding: (id, at) =>
    set((s) => ({
      selectedFinding: id,
      ...(id ? { activeTab: 'findings' as const } : {}),
      ...(at ? { focus: { p: at, n: (s.focus?.n ?? 0) + 1 } } : {}),
    })),
}))
