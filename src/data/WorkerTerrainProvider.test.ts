import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  acquireTerrainProvider,
  releaseTerrainProvider,
  WorkerTerrainProvider,
} from './WorkerTerrainProvider'

/** Minimal stand-in for a Worker, enough for the provider's wiring. */
function fakeWorker() {
  const sent: unknown[] = []
  const w = {
    onmessage: null as ((e: MessageEvent<unknown>) => void) | null,
    onerror: null as ((e: ErrorEvent) => void) | null,
    postMessage: (msg: unknown) => {
      sent.push(msg)
    },
    terminate: vi.fn(),
    sent,
  }
  return w
}

const settle = () => new Promise((r) => setTimeout(r, 5))

describe('WorkerTerrainProvider', () => {
  it('does not start a worker until a survey is asked for', () => {
    const spawn = vi.fn(() => fakeWorker() as unknown as Worker)
    const provider = new WorkerTerrainProvider(spawn)

    expect(provider.started).toBe(false)
    expect(spawn).not.toHaveBeenCalled()

    void provider.getSurvey('baseline')
    expect(provider.started).toBe(true)
    expect(spawn).toHaveBeenCalledTimes(1)
  })

  it('reuses one worker for both surveys', () => {
    const spawn = vi.fn(() => fakeWorker() as unknown as Worker)
    const provider = new WorkerTerrainProvider(spawn)

    void provider.getSurvey('baseline')
    void provider.getSurvey('current')

    expect(spawn).toHaveBeenCalledTimes(1)
  })

  it('terminates the worker on dispose and fails late callers', async () => {
    const worker = fakeWorker()
    const provider = new WorkerTerrainProvider(() => worker as unknown as Worker)

    const inFlight = provider.getSurvey('baseline')
    provider.dispose()

    await expect(inFlight).rejects.toThrow(/shut down/)
    expect(worker.terminate).toHaveBeenCalledTimes(1)
    expect(provider.disposed).toBe(true)
    await expect(provider.getSurvey('current')).rejects.toThrow(/shut down/)
  })

  it('dispose is safe to call twice', () => {
    const worker = fakeWorker()
    const provider = new WorkerTerrainProvider(() => worker as unknown as Worker)
    const inFlight = provider.getSurvey('baseline')
    inFlight.catch(() => {})
    provider.dispose()
    provider.dispose()
    expect(worker.terminate).toHaveBeenCalledTimes(1)
  })
})

describe('shared terrain provider', () => {
  afterEach(async () => {
    // Drop every hold this test left behind; the module keeps one provider for everyone.
    for (let i = 0; i < 5; i++) releaseTerrainProvider()
    await settle()
  })

  it('hands every consumer the same provider', () => {
    const a = acquireTerrainProvider()
    const b = acquireTerrainProvider()
    expect(a).toBe(b)
  })

  it('shuts the worker down only when the last consumer leaves', async () => {
    const a = acquireTerrainProvider()
    acquireTerrainProvider()

    releaseTerrainProvider()
    expect(a.disposed).toBe(false)

    releaseTerrainProvider()
    await settle()
    expect(a.disposed).toBe(true)
  })

  it('cancels a pending shutdown when a screen mounts straight back in', async () => {
    const first = acquireTerrainProvider()
    releaseTerrainProvider()
    // A route change unmounts and mounts in the same task; acquiring again must rescue it.
    const second = acquireTerrainProvider()

    await settle()
    expect(first.disposed).toBe(false)
    expect(second).toBe(first)
  })
})
