import type {
  Mine,
  PermittedLimits,
  SurveyEpochInfo,
  TerrainProvider,
  TerrainSurvey,
} from '../domain/types'
import { SURVEY_EPOCHS } from './fixtures/mine'
import { LIMITS, MINE } from './fixtures/scenario'

type Reply = { id: number; survey?: TerrainSurvey; error?: string }

/**
 * Same data as SyntheticTerrainProvider, but the heavy surface and image generation runs
 * in a Web Worker so the page stays responsive while it builds. Mine and limits are
 * small fixtures and are served directly.
 */
export class WorkerTerrainProvider implements TerrainProvider {
  private readonly worker: Worker
  private readonly pending = new Map<
    number,
    { ok: (s: TerrainSurvey) => void; fail: (e: Error) => void }
  >()
  private readonly cache = new Map<string, Promise<TerrainSurvey>>()
  private next = 0

  constructor(
    worker = new Worker(new URL('../workers/terrain.worker.ts', import.meta.url), {
      type: 'module',
    }),
  ) {
    this.worker = worker
    this.worker.onmessage = ({ data }: MessageEvent<Reply>) => {
      const p = this.pending.get(data.id)
      if (!p) return
      this.pending.delete(data.id)
      if (data.survey) p.ok(data.survey)
      else p.fail(new Error(data.error ?? 'Terrain worker failed'))
    }
    this.worker.onerror = (e) => {
      for (const p of this.pending.values())
        p.fail(new Error(e.message || 'Terrain worker crashed'))
      this.pending.clear()
    }
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

  getSurvey(surveyId: string): Promise<TerrainSurvey> {
    let p = this.cache.get(surveyId)
    if (!p) {
      p = new Promise<TerrainSurvey>((ok, fail) => {
        const id = this.next++
        this.pending.set(id, { ok, fail })
        this.worker.postMessage({ id, surveyId })
      })
      this.cache.set(surveyId, p)
    }
    return p
  }
}
