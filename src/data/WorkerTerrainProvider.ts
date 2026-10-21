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
 * in a Web Worker so the page stays responsive while it builds. Mine and limits are
 * small fixtures and are served directly.
 *
 * The worker is started on the first survey request, not in the constructor, so a provider
 * that is never used costs nothing. `dispose` is the shutdown path: it terminates the worker
 * and fails anything still waiting on it.
 */
export class WorkerTerrainProvider implements TerrainProvider {
  private worker: Worker | null = null
  private readonly pending = new Map<
    number,
    { ok: (s: TerrainSurvey) => void; fail: (e: Error) => void }
  >()
  private readonly cache = new Map<string, Promise<TerrainSurvey>>()
  private next = 0
  private shut = false

  private readonly spawn: WorkerFactory

  constructor(spawn: WorkerFactory = spawnWorker) {
    this.spawn = spawn
  }

  /** True once the worker exists. A provider that never served a survey has none. */
  get started(): boolean {
    return this.worker !== null
  }

  get disposed(): boolean {
    return this.shut
  }

  private get channel(): Worker {
    if (this.worker) return this.worker
    const worker = this.spawn()
    worker.onmessage = ({ data }: MessageEvent<Reply>) => {
      const p = this.pending.get(data.id)
      if (!p) return
      this.pending.delete(data.id)
      if (data.survey) p.ok(data.survey)
      else p.fail(new Error(data.error ?? 'Terrain worker failed'))
    }
    worker.onerror = (e) => {
      for (const p of this.pending.values())
        p.fail(new Error(e.message || 'Terrain worker crashed'))
      this.pending.clear()
    }
    this.worker = worker
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
    let p = this.cache.get(surveyId)
    if (!p) {
      p = new Promise<TerrainSurvey>((ok, fail) => {
        const id = this.next++
        this.pending.set(id, { ok, fail })
        this.channel.postMessage({ id, surveyId })
      })
      this.cache.set(surveyId, p)
    }
    return p
  }

  /** Shut the worker down and fail anything still in flight. Safe to call more than once. */
  dispose(): void {
    if (this.shut) return
    this.shut = true
    for (const p of this.pending.values()) p.fail(new Error('Terrain provider was shut down'))
    this.pending.clear()
    this.cache.clear()
    this.worker?.terminate()
    this.worker = null
  }
}

/*
 * One provider for the page lifetime, shared by both screens.
 *
 * A provider used to be constructed on every mount. The constructor started a worker, and the
 * store refused the second load, so every navigation after the first orphaned a worker that
 * nothing could ever shut down. Sharing it means the surveys are built once, and the last
 * consumer to unmount tears the worker down.
 */
let shared: { provider: WorkerTerrainProvider; users: number } | null = null
let releaseTimer: ReturnType<typeof setTimeout> | null = null

export function acquireTerrainProvider(): WorkerTerrainProvider {
  if (releaseTimer !== null) {
    clearTimeout(releaseTimer)
    releaseTimer = null
  }
  if (!shared) shared = { provider: new WorkerTerrainProvider(), users: 0 }
  shared.users += 1
  return shared.provider
}

/**
 * Drop a hold on the shared provider. When the last hold goes, the worker is shut down.
 *
 * A route change unmounts the old screen and mounts the next one in the same task, so the
 * count really does hit zero mid-navigation. The shutdown is deferred by a tick and cancelled
 * if someone acquires again, which keeps an in-flight first load from being failed by
 * simply moving between home and the monitor.
 */
export function releaseTerrainProvider(): void {
  if (!shared) return
  shared.users -= 1
  if (shared.users > 0 || releaseTimer !== null) return
  releaseTimer = setTimeout(() => {
    releaseTimer = null
    if (shared && shared.users <= 0) {
      shared.provider.dispose()
      shared = null
    }
  }, 0)
}
