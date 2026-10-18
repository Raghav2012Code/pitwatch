import type {
  Mine,
  PermittedLimits,
  SurveyEpochInfo,
  TerrainProvider,
  TerrainSurvey,
} from '../domain/types'
import { SURVEY_EPOCHS } from './fixtures/mine'
import { GRID, LIMITS, MINE, SEED, SURVEY_SIGMA_M } from './fixtures/scenario'
import { buildSurface } from './synthetic'

/** Serves the seeded fictional mine. Surfaces are built on first request and cached. */
export class SyntheticTerrainProvider implements TerrainProvider {
  private readonly seed: number
  private readonly cache = new Map<string, TerrainSurvey>()

  constructor(seed = SEED) {
    this.seed = seed
  }

  async getMine(): Promise<Mine> {
    return MINE
  }

  async listSurveys(): Promise<readonly SurveyEpochInfo[]> {
    return SURVEY_EPOCHS
  }

  async getLimits(): Promise<PermittedLimits> {
    return LIMITS
  }

  async getSurvey(id: string): Promise<TerrainSurvey> {
    const cached = this.cache.get(id)
    if (cached) return cached

    const info = SURVEY_EPOCHS.find((e) => e.id === id)
    if (!info || (id !== 'baseline' && id !== 'current')) throw new Error(`Unknown survey: ${id}`)

    const sigma = SURVEY_SIGMA_M[id]
    const survey: TerrainSurvey = {
      ...info,
      grid: GRID,
      elevations: buildSurface(GRID, id, this.seed, sigma),
      verticalUncertainty: sigma,
    }
    this.cache.set(id, survey)
    return survey
  }
}
