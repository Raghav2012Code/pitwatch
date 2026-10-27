import { describe, expect, it, vi } from 'vitest'
import { getTerrainProvider, WorkerTerrainProvider } from './WorkerTerrainProvider'

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

  it('builds the two surveys in parallel, one worker each, and reuses them', () => {
    const spawn = vi.fn(() => fakeWorker() as unknown as Worker)
    const provider = new WorkerTerrainProvider(spawn)

    void provider.getSurvey('baseline')
    void provider.getSurvey('current')
    expect(spawn).toHaveBeenCalledTimes(2)

    // Asking again is served from the cache and starts nothing.
    void provider.getSurvey('baseline')
    void provider.getSurvey('current')
    expect(spawn).toHaveBeenCalledTimes(2)
  })

  it('terminates every worker on dispose and fails late callers', async () => {
    const made: ReturnType<typeof fakeWorker>[] = []
    const provider = new WorkerTerrainProvider(() => {
      const w = fakeWorker()
      made.push(w)
      return w as unknown as Worker
    })

    const inFlight = provider.getSurvey('baseline')
    void provider.getSurvey('current').catch(() => {})
    provider.dispose()

    await expect(inFlight).rejects.toThrow(/shut down/)
    expect(made).toHaveLength(2)
    for (const w of made) expect(w.terminate).toHaveBeenCalledTimes(1)
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
  it('returns the same page-lifetime provider', () => {
    expect(getTerrainProvider()).toBe(getTerrainProvider())
  })
})
