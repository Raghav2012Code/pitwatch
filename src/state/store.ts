import { create } from 'zustand'
import type { ViewRequest } from '../scene/presets'

export type PanelTab = 'overview' | 'findings' | 'inspector' | 'about'
/** Layers that work today. The rest are listed in the panel as coming later. */
export type LayerId = 'terrain' | 'contours'

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
  layers: { terrain: true, contours: true },
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
