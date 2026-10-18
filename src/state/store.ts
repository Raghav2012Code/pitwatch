import { create } from 'zustand'

export type PanelTab = 'overview' | 'findings' | 'inspector' | 'about'

interface AppState {
  activeTab: PanelTab
  drawerOpen: boolean
  setActiveTab: (tab: PanelTab) => void
  setDrawerOpen: (open: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: 'overview',
  drawerOpen: false,
  setActiveTab: (activeTab) => set({ activeTab }),
  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
}))
