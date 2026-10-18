import { create } from 'zustand'
import type { Mine, PermittedLimits, TerrainProvider, TerrainSurvey } from '../domain/types'

type SurveyId = 'baseline' | 'current'

interface TerrainState {
  status: 'idle' | 'loading' | 'ready' | 'error'
  error?: string
  mine?: Mine
  limits?: PermittedLimits
  surveys: Partial<Record<SurveyId, TerrainSurvey>>
  /** Loads mine, limits and both surveys once. Later calls are ignored. */
  load: (provider: TerrainProvider) => Promise<void>
}

export const useTerrain = create<TerrainState>((set, get) => ({
  status: 'idle',
  surveys: {},
  load: async (provider) => {
    if (get().status !== 'idle') return
    set({ status: 'loading' })
    try {
      // Let the loading state paint before the surfaces are generated.
      await new Promise((r) => setTimeout(r, 0))
      const [mine, limits, baseline, current] = await Promise.all([
        provider.getMine(),
        provider.getLimits(),
        provider.getSurvey('baseline'),
        provider.getSurvey('current'),
      ])
      set({ status: 'ready', mine, limits, surveys: { baseline, current } })
    } catch (e) {
      set({ status: 'error', error: e instanceof Error ? e.message : String(e) })
    }
  },
}))
