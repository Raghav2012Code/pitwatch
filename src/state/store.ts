import { create } from 'zustand'
import type { ViewRequest } from '../scene/presets'

export type PanelTab = 'overview' | 'findings' | 'inspector' | 'about'
export type LayerId = 'terrain' | 'tint' | 'contours' | 'lease' | 'buffer' | 'change' | 'findings'

export const EXAGGERATION = { min: 1, max: 3, initial: 1.5 } as const

interface AppState {
  activeTab: PanelTab
  drawerOpen: boolean
  /** Desktop only: panels collapsed to give the map more room. */
  layersHidden: boolean
  detailsHidden: boolean
  layers: Record<LayerId, boolean>
  exaggeration: number
  /** Latest camera request; `n` changes on every request so repeats still fire. */
  view: { kind: ViewRequest; n: number }
  setActiveTab: (tab: PanelTab) => void
  setDrawerOpen: (open: boolean) => void
  toggleLayers: () => void
  toggleDetails: () => void
  toggleLayer: (id: LayerId) => void
  setExaggeration: (v: number) => void
  requestView: (kind: ViewRequest) => void
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
    change: false,
    findings: true,
  },
  exaggeration: EXAGGERATION.initial,
  view: { kind: 'intro', n: 0 },
  setActiveTab: (activeTab) => set({ activeTab }),
  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
  toggleLayers: () => set((s) => ({ layersHidden: !s.layersHidden })),
  toggleDetails: () => set((s) => ({ detailsHidden: !s.detailsHidden })),
  toggleLayer: (id) => set((s) => ({ layers: { ...s.layers, [id]: !s.layers[id] } })),
  setExaggeration: (v) =>
    set({ exaggeration: Math.min(EXAGGERATION.max, Math.max(EXAGGERATION.min, v)) }),
  requestView: (kind) => set((s) => ({ view: { kind, n: s.view.n + 1 } })),
}))
