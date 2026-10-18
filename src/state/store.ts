import { create } from 'zustand'

export type PanelTab = 'overview' | 'findings' | 'inspector' | 'about'

interface AppState {
  activeTab: PanelTab
  drawerOpen: boolean
  /** Desktop only: panels collapsed to give the map more room. */
  layersHidden: boolean
  detailsHidden: boolean
  setActiveTab: (tab: PanelTab) => void
  setDrawerOpen: (open: boolean) => void
  toggleLayers: () => void
  toggleDetails: () => void
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: 'overview',
  drawerOpen: false,
  layersHidden: false,
  detailsHidden: false,
  setActiveTab: (activeTab) => set({ activeTab }),
  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
  toggleLayers: () => set((s) => ({ layersHidden: !s.layersHidden })),
  toggleDetails: () => set((s) => ({ detailsHidden: !s.detailsHidden })),
}))
