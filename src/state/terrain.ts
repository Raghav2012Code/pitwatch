import { create } from 'zustand'
import { evaluate } from '../compliance/engine'
import type {
  ComplianceFinding,
  ExcavationState,
  Mine,
  PermittedLimits,
  TerrainProvider,
  TerrainSurvey,
} from '../domain/types'

type SurveyId = 'baseline' | 'current'

interface TerrainState {
  status: 'idle' | 'loading' | 'ready' | 'error'
  error?: string
  mine?: Mine
  limits?: PermittedLimits
  surveys: Partial<Record<SurveyId, TerrainSurvey>>
  /** Change between the surveys and the rule-engine findings, once both are loaded. */
  change?: ExcavationState
  findings: ComplianceFinding[]
  /** Loads mine, limits and both surveys once. Later calls are ignored. */
  load: (provider: TerrainProvider) => Promise<void>
}

export const useTerrain = create<TerrainState>((set, get) => ({
  status: 'idle',
  surveys: {},
  findings: [],
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
      const { change, findings } = evaluate(baseline, current, limits)
      set({ status: 'ready', mine, limits, surveys: { baseline, current }, change, findings })
    } catch (e) {
      set({ status: 'error', error: e instanceof Error ? e.message : String(e) })
    }
  },
}))
