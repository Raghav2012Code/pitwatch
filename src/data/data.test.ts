import { describe, expect, it } from 'vitest'
import { cellAt, indexOf, sampleBilinear } from '../geo/grid'
import { distanceToBoundary, pointInPolygon } from '../geo/polygon'
import {
  CHANGES,
  CURRENT_PIT,
  DUMP_ZONE,
  GRID,
  LEASE,
  PIT_ZONE,
  SAFETY_BUFFER_M,
} from './fixtures/scenario'
import { fbm, valueNoise } from './noise'
import { gaussian, mulberry32 } from './rng'
import { benchDepth } from './synthetic'
import { SyntheticTerrainProvider } from './SyntheticTerrainProvider'

describe('rng', () => {
  it('repeats the same sequence for the same seed', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    const seqA = Array.from({ length: 5 }, a)
    expect(Array.from({ length: 5 }, b)).toEqual(seqA)
    expect(Array.from({ length: 5 }, mulberry32(43))).not.toEqual(seqA)
    expect(seqA.every((v) => v >= 0 && v < 1)).toBe(true)
  })

  it('produces roughly standard normal samples', () => {
    const g = gaussian(mulberry32(7))
    const xs = Array.from({ length: 20000 }, g)
    const mean = xs.reduce((s, x) => s + x, 0) / xs.length
    const sd = Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / xs.length)
    expect(Math.abs(mean)).toBeLessThan(0.03)
    expect(Math.abs(sd - 1)).toBeLessThan(0.03)
  })
})

describe('noise', () => {
  it('is deterministic, bounded and continuous', () => {
    expect(valueNoise(3.3, 7.1, 9)).toBe(valueNoise(3.3, 7.1, 9))
    for (let i = 0; i < 200; i++) {
      const v = fbm(i * 0.37, i * 0.11, 5)
      expect(v).toBeGreaterThanOrEqual(-1)
      expect(v).toBeLessThanOrEqual(1)
    }
    expect(Math.abs(valueNoise(4.5, 2.5, 1) - valueNoise(4.501, 2.5, 1))).toBeLessThan(0.01)
  })
})

describe('bench profile', () => {
  it('drops one bench per face and stays flat along each berm', () => {
    expect(benchDepth(0)).toBe(0)
    expect(benchDepth(3)).toBe(5) // halfway down the first face
    expect(benchDepth(6)).toBe(10) // top of the first berm
    expect(benchDepth(13)).toBe(10) // still on the berm
    expect(benchDepth(14 + 6)).toBe(20)
  })
})

describe('synthetic terrain provider', async () => {
  const provider = new SyntheticTerrainProvider()
  const baseline = await provider.getSurvey('baseline')
  const current = await provider.getSurvey('current')
  const dh = (x: number, y: number) => {
    const c = cellAt(GRID, { x, y })!
    const i = indexOf(GRID, c.col, c.row)
    return current.elevations[i] - baseline.elevations[i]
  }

  it('builds the 257 × 257 grid at 8 m with both epochs', async () => {
    expect(baseline.elevations.length).toBe(257 * 257)
    expect(current.grid).toEqual(GRID)
    expect((await provider.listSurveys()).map((s) => s.id)).toEqual(['baseline', 'current'])
    expect(baseline.verticalUncertainty).toBeGreaterThan(0)
    expect(baseline.provenance).toBe('simulated')
  })

  it('is reproducible from the seed and changes with it', async () => {
    const again = await new SyntheticTerrainProvider().getSurvey('current')
    expect(again.elevations).toEqual(current.elevations)
    const other = await new SyntheticTerrainProvider(1).getSurvey('current')
    expect(other.elevations).not.toEqual(current.elevations)
  })

  it('rejects unknown surveys', async () => {
    await expect(provider.getSurvey('nope')).rejects.toThrow('Unknown survey')
  })

  it('cuts a stepped pit with a flat floor at the approved level', () => {
    const floor = sampleBilinear(GRID, current.elevations, {
      x: CURRENT_PIT.cx + 60,
      y: CURRENT_PIT.cy,
    })!
    expect(floor).toBeCloseTo(PIT_ZONE.approvedFloorElevation, 0)
  })

  it('leaves far-away ground unchanged apart from survey noise', () => {
    for (const [x, y] of [
      [200, 1900],
      [1900, 1900],
      [1800, 150],
    ]) {
      expect(Math.abs(dh(x, y))).toBeLessThan(0.4)
    }
  })

  it('plants each scenario change where the rules will look for it', () => {
    // 1. Legitimate expansion inside the lease: ground lowered west of the old rim.
    expect(dh(CURRENT_PIT.cx - CURRENT_PIT.a + 12, CURRENT_PIT.cy)).toBeLessThan(-5)

    // 2. Encroachment: deep cut outside the east lease edge.
    const out = { x: 1420, y: 1030 }
    expect(pointInPolygon(out, LEASE)).toBe(false)
    expect(dh(out.x, out.y)).toBeLessThan(-10)

    // 3. Sump below the approved floor.
    const sumpZ = current.elevations[indexOf(GRID, 120, 128)]
    expect(sumpZ).toBeLessThan(PIT_ZONE.approvedFloorElevation - 5)

    // 4. Shallow scrape inside the lease, within the safety buffer.
    const scrape = { x: 960, y: 1504 }
    expect(pointInPolygon(scrape, LEASE)).toBe(true)
    expect(distanceToBoundary(scrape, LEASE)).toBeLessThan(SAFETY_BUFFER_M)
    expect(dh(scrape.x, scrape.y)).toBeCloseTo(-CHANGES.bufferScrape.depth, 0)

    // 5. Waste dumped outside the dump zone, and legitimately inside it.
    const stray = { x: CHANGES.strayDump.cx, y: CHANGES.strayDump.cy }
    expect(pointInPolygon(stray, DUMP_ZONE.polygon)).toBe(false)
    expect(dh(stray.x, stray.y)).toBeGreaterThan(3)
    expect(dh(CHANGES.zoneDump.cx, CHANGES.zoneDump.cy)).toBeGreaterThan(5)
  })
})
