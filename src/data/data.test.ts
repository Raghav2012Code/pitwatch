import { describe, expect, it } from 'vitest'
import { cellAt, indexOf, sampleBilinear } from '../geo/grid'
import { distanceToBoundary, pointInPolygon } from '../geo/polygon'
import {
  BENCH_HEIGHT_M,
  BERM_WIDTH_M,
  CHANGES,
  BASELINE_PIT,
  CURRENT_PIT,
  DUMP_ZONE,
  FACE_RUN_M,
  GRID,
  LEASE,
  PIT_ZONE,
  SAFETY_BUFFER_M,
} from './fixtures/scenario'
import { fbm, valueNoise } from './noise'
import { gaussian, mulberry32 } from './rng'
import { benchDepth, insidePit, pitsOf, preparePit } from './synthetic'
import { SyntheticTerrainProvider } from './SyntheticTerrainProvider'

const PLANTED_ENCROACHMENT = CHANGES.encroachment

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
    const step = BERM_WIDTH_M + FACE_RUN_M
    expect(benchDepth(0)).toBe(0)
    const h = BENCH_HEIGHT_M
    expect(benchDepth(FACE_RUN_M / 2)).toBe(h / 2) // halfway down the first face
    expect(benchDepth(FACE_RUN_M)).toBe(h) // top of the first berm
    expect(benchDepth(step - 1)).toBe(h) // still on the berm
    expect(benchDepth(step + FACE_RUN_M)).toBe(2 * h)
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

  it('builds the configured grid with both epochs', async () => {
    expect(baseline.elevations.length).toBe(GRID.cols * GRID.rows)
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
  }, 30_000)

  it('rejects unknown surveys', async () => {
    await expect(provider.getSurvey('nope')).rejects.toThrow('Unknown survey')
  })

  it('cuts a stepped pit with a flat floor just above the approved level', () => {
    const floor = sampleBilinear(GRID, current.elevations, { x: 1000, y: 1030 })!
    expect(floor).toBeCloseTo(CURRENT_PIT.floorRL, 0)
    expect(floor).toBeGreaterThan(PIT_ZONE.approvedFloorElevation)
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
    const west = { x: 680, y: 1080 }
    expect(insidePit(west, preparePit(CURRENT_PIT))).toBeGreaterThan(0)
    expect(insidePit(west, preparePit(BASELINE_PIT))).toBeLessThan(0)
    expect(dh(west.x, west.y)).toBeLessThan(-5)

    // 2. Encroachment: deep cut outside the east lease edge.
    const out = { x: 1420, y: 1030 }
    expect(pointInPolygon(out, LEASE)).toBe(false)
    expect(dh(out.x, out.y)).toBeLessThan(-10)

    // 3. Sump below the approved floor.
    const sumpZ = sampleBilinear(GRID, current.elevations, {
      x: CHANGES.sump.cx,
      y: CHANGES.sump.cy,
    })!
    expect(sumpZ).toBeLessThan(PIT_ZONE.approvedFloorElevation - 3)

    // 4. Shallow scrape inside the lease, within the safety buffer.
    const scrape = { x: 960, y: 1504 }
    expect(pointInPolygon(scrape, LEASE)).toBe(true)
    expect(distanceToBoundary(scrape, LEASE)).toBeLessThan(SAFETY_BUFFER_M)
    expect(dh(scrape.x, scrape.y)).toBeCloseTo(-CHANGES.bufferScrape.depth, 0)

    // 5. Waste dumped outside the dump zone, and legitimately inside it.
    const stray = { x: CHANGES.strayDump.cx, y: CHANGES.strayDump.cy }
    expect(pointInPolygon(stray, DUMP_ZONE.polygon)).toBe(false)
    expect(dh(stray.x, stray.y)).toBeGreaterThan(3)
    expect(dh(CHANGES.zoneDump.cx, CHANGES.zoneDump.cy)).toBeGreaterThan(3)
  })
})

describe('pit layout', () => {
  it('keeps every approved stage inside the lease and clear of the buffer', () => {
    const approved = pitsOf('current').filter((p) => p.floorRL !== PLANTED_ENCROACHMENT.floorRL)
    expect(approved).toHaveLength(1)
    for (const pit of approved) {
      for (const v of pit.rim) {
        expect(pointInPolygon(v, LEASE)).toBe(true)
        expect(distanceToBoundary(v, LEASE)).toBeGreaterThan(SAFETY_BUFFER_M + 10)
      }
    }
  })

  it('runs the encroachment lobe across the lease edge', () => {
    const rim = preparePit(PLANTED_ENCROACHMENT).rim
    expect(rim.some((v) => !pointInPolygon(v, LEASE))).toBe(true)
  })

  it('is not round: the current pit is much longer than it is wide', () => {
    const { box } = pitsOf('current')[0]
    expect((box.x1 - box.x0) / (box.y1 - box.y0)).toBeGreaterThan(1.3)
  })
})
