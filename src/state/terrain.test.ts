import { beforeEach, describe, expect, it } from 'vitest'
import { SyntheticTerrainProvider } from '../data/SyntheticTerrainProvider'
import type { TerrainProvider } from '../domain/types'
import { useTerrain } from './terrain'

describe('terrain store', () => {
  beforeEach(() => useTerrain.setState({ status: 'idle', surveys: {}, error: undefined }))

  it('loads mine, limits and both surveys from the provider', async () => {
    await useTerrain.getState().load(new SyntheticTerrainProvider())
    const s = useTerrain.getState()
    expect(s.status).toBe('ready')
    expect(s.mine?.name).toBe('Venthar Ridge Iron Pit')
    expect(s.limits?.safetyBufferMetres).toBe(20)
    expect(s.surveys.current?.elevations.length).toBe(257 * 257)
  })

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
})
