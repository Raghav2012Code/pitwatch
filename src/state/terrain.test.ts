import { beforeEach, describe, expect, it } from 'vitest'
import { SyntheticTerrainProvider } from '../data/SyntheticTerrainProvider'
import type { TerrainProvider } from '../domain/types'
import { useTerrain } from './terrain'

describe('terrain store', () => {
  beforeEach(() =>
    useTerrain.setState({
      status: 'idle',
      surveys: {},
      findings: [],
      error: undefined,
      provider: undefined,
    }),
  )

  it('loads mine, limits and both surveys from the provider', async () => {
    await useTerrain.getState().load(new SyntheticTerrainProvider())
    const s = useTerrain.getState()
    expect(s.status).toBe('ready')
    expect(s.mine?.name).toBe('Venthar Ridge Iron Pit')
    expect(s.limits?.safetyBufferMetres).toBe(20)
    const grid = s.surveys.current?.grid
    expect(s.surveys.current?.elevations.length).toBe(grid!.cols * grid!.rows)
    // The rule engine runs on load: the scenario's two violations are found.
    expect(s.findings.filter((f) => f.status === 'violation').map((f) => f.id)).toEqual([
      'R1-1',
      'R2-1',
    ])
  }, 30_000)

  it('reports provider failures instead of throwing', async () => {
    const broken: TerrainProvider = {
      getMine: () => Promise.reject(new Error('no data')),
      getLimits: () => Promise.reject(new Error('no data')),
      listSurveys: () => Promise.resolve([]),
      getSurvey: () => Promise.reject(new Error('no data')),
    }
    await useTerrain.getState().load(broken)
    expect(useTerrain.getState()).toMatchObject({ status: 'error', error: 'no data' })
  })

  it('refuses a second load once the surveys are built', async () => {
    await useTerrain.getState().load(new SyntheticTerrainProvider())
    const before = useTerrain.getState().surveys.current

    await useTerrain.getState().load(new SyntheticTerrainProvider())
    expect(useTerrain.getState().surveys.current).toBe(before)
  }, 30_000)

  it('retries a failed load on the provider that is already in play', async () => {
    const real = new SyntheticTerrainProvider()
    let attempts = 0
    // Fails the first time, then behaves like the real provider.
    const flaky: TerrainProvider = {
      getMine: () => real.getMine(),
      getLimits: () => real.getLimits(),
      listSurveys: () => real.listSurveys(),
      getSurvey: (id) => {
        attempts++
        return attempts === 1 ? Promise.reject(new Error('worker died')) : real.getSurvey(id)
      },
    }

    await useTerrain.getState().load(flaky)
    expect(useTerrain.getState()).toMatchObject({ status: 'error', error: 'worker died' })

    await useTerrain.getState().retry()
    const s = useTerrain.getState()
    expect(s.status).toBe('ready')
    expect(s.error).toBeUndefined()
    expect(s.findings.filter((f) => f.status === 'violation')).toHaveLength(2)
  }, 30_000)

  it('retry does nothing when there is nothing to retry', async () => {
    await useTerrain.getState().retry()
    expect(useTerrain.getState().status).toBe('idle')
  })
})
