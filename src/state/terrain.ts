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
  /** The provider in use, kept so a failed load can be tried again. */
  provider?: TerrainProvider
  /** Loads mine, limits and both surveys once. A failed load may be attempted again. */
  load: (provider: TerrainProvider, options?: { force?: boolean }) => Promise<void>
  /** Re-runs the failed load on the provider that is already in play. */
  retry: () => Promise<void>
}

export const useTerrain = create<TerrainState>((set, get) => ({
  status: 'idle',
  surveys: {},
  findings: [],
  load: async (provider, options = {}) => {
    const { status } = get()
    // One load at a time, and no second load once the surveys are built. An error is retryable.
    if (status === 'loading' || status === 'ready') return
    if (status === 'error' && !options.force) return
    set({ status: 'loading', error: undefined, provider })
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
  retry: async () => {
    const { provider, status } = get()
    if (!provider || status !== 'error') return
    await get().load(provider, { force: true })
  },
}))
