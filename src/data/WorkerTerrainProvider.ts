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

/** How a worker is made. Injectable so a test can count spawns without a browser. */
export type WorkerFactory = () => Worker

const spawnWorker = (): Worker =>
  new Worker(new URL('../workers/terrain.worker.ts', import.meta.url), { type: 'module' })

/**
 * Same data as SyntheticTerrainProvider, but the heavy surface and image generation runs
 * in Web Workers so the page stays responsive while it builds. Each survey gets its own worker,
 * so the two surveys are built in parallel: the wait is the slower survey, not the sum. Mine
 * and limits are small fixtures and are served directly.
 *
 * Workers start on the first request for their survey, not in the constructor, so a provider
 * that is never used costs nothing. `dispose` is the shutdown path: it terminates every worker
 * and fails anything still waiting on one.
 */
export class WorkerTerrainProvider implements TerrainProvider {
  private readonly workers = new Map<string, Worker>()
  private readonly pending = new Map<
    number,
    { worker: Worker; ok: (s: TerrainSurvey) => void; fail: (e: Error) => void }
  >()
  private readonly cache = new Map<string, Promise<TerrainSurvey>>()
  private next = 0
  private shut = false

  private readonly spawn: WorkerFactory

  constructor(spawn: WorkerFactory = spawnWorker) {
    this.spawn = spawn
  }

  /** True once any worker exists. A provider that never served a survey has none. */
  get started(): boolean {
    return this.workers.size > 0
  }

  get disposed(): boolean {
    return this.shut
  }

  private channel(surveyId: string): Worker {
    const existing = this.workers.get(surveyId)
    if (existing) return existing
    const worker = this.spawn()
    worker.onmessage = ({ data }: MessageEvent<Reply>) => {
      const p = this.pending.get(data.id)
      if (!p) return
      this.pending.delete(data.id)
      if (data.survey) p.ok(data.survey)
      else p.fail(new Error(data.error ?? 'Terrain worker failed'))
    }
    worker.onerror = (e) => {
      for (const [id, p] of this.pending) {
        if (p.worker !== worker) continue
        p.fail(new Error(e.message || 'Terrain worker crashed'))
        this.pending.delete(id)
      }
      // A crashed worker cannot answer again, so drop it: the next request starts a fresh one.
      worker.terminate()
      if (this.workers.get(surveyId) === worker) this.workers.delete(surveyId)
    }
    this.workers.set(surveyId, worker)
    return worker
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
    if (this.shut) return Promise.reject(new Error('Terrain provider was shut down'))
    const cached = this.cache.get(surveyId)
    if (cached) return cached
    const p: Promise<TerrainSurvey> = new Promise<TerrainSurvey>((ok, fail) => {
      const id = this.next++
      const worker = this.channel(surveyId)
      this.pending.set(id, { worker, ok, fail })
      worker.postMessage({ id, surveyId })
    })
    // A failed request must not stay in the cache, or a retry would replay the same rejection.
    p.catch(() => {
      if (this.cache.get(surveyId) === p) this.cache.delete(surveyId)
    })
    this.cache.set(surveyId, p)
    return p
  }

  /** Shut every worker down and fail anything still in flight. Safe to call more than once. */
  dispose(): void {
    if (this.shut) return
    this.shut = true
    for (const p of this.pending.values()) p.fail(new Error('Terrain provider was shut down'))
    this.pending.clear()
    this.cache.clear()
    for (const worker of this.workers.values()) worker.terminate()
    this.workers.clear()
  }
}

// App owns one provider for the page lifetime. Hash navigation changes the screen, not App,
// and React StrictMode replays effects without ending that lifetime.
let shared: WorkerTerrainProvider | null = null

export function getTerrainProvider(): WorkerTerrainProvider {
  return (shared ??= new WorkerTerrainProvider())
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    shared?.dispose()
    shared = null
    // A full reload clears Zustand's reference to the disposed provider and starts fresh code.
    window.location.reload()
  })
}
