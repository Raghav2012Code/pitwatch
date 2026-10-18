import { describe, expect, it } from 'vitest'
import { SyntheticTerrainProvider } from '../data/SyntheticTerrainProvider'
import type { GridSpec, PermittedLimits, TerrainSurvey } from '../domain/types'
import { changeThreshold, detectChange } from './change'
import { connectedComponents } from './cluster'
import { COMPLIANCE_CONFIG } from './config'
import { evaluate, ruleBoundary, ruleDepth, ruleDumping, severityOf } from './engine'
import { combinedSigma } from './uncertainty'

/*
 * Small worked grid: 10 × 10 cells at 10 m, centres at x, y = 0..90.
 * Lease covers columns 0–6 (x ≤ 60); columns 7–9 are outside it.
 * With a 12 m buffer, column 6 (5 m from the edge) is in the buffer, column 5 is not.
 */
const G: GridSpec = { cols: 10, rows: 10, cellSize: 10, originXY: { x: 0, y: 0 } }
const N = 100
const idx = (col: number, row: number) => row * 10 + col
const SIGMA = 0.05

const LIMITS: PermittedLimits = {
  leaseBoundary: [
    { x: -5, y: -5 },
    { x: 65, y: -5 },
    { x: 65, y: 95 },
    { x: -5, y: 95 },
  ],
  safetyBufferMetres: 12,
  pitZones: [
    {
      id: 'pit',
      polygon: [
        { x: 5, y: 5 },
        { x: 45, y: 5 },
        { x: 45, y: 45 },
        { x: 5, y: 45 },
      ],
      approvedFloorElevation: 90,
    },
  ],
  maxPitDepth: 10,
  dumpZones: [
    {
      id: 'dump',
      polygon: [
        { x: 5, y: 55 },
        { x: 45, y: 55 },
        { x: 45, y: 85 },
        { x: 5, y: 85 },
      ],
    },
  ],
}

function survey(id: 'baseline' | 'current', edits: Record<number, number> = {}): TerrainSurvey {
  const elevations = new Float32Array(N).fill(100)
  for (const [i, z] of Object.entries(edits)) elevations[+i] = z
  return {
    id,
    label: id === 'baseline' ? 'Baseline' : 'Current',
    date: '2026-01-01',
    method: 'test',
    provenance: 'simulated',
    grid: G,
    elevations,
    verticalUncertainty: SIGMA,
  }
}

const cfg = COMPLIANCE_CONFIG
const sigma = combinedSigma(SIGMA, SIGMA)
const limit = changeThreshold(sigma, cfg)

describe('change detection', () => {
  it('counts a cell only beyond minChange + kσ, either way', () => {
    const c = detectChange(
      survey('baseline'),
      survey('current', {
        [idx(0, 0)]: 100 - limit - 0.01,
        [idx(1, 0)]: 100 - limit + 0.01,
        [idx(2, 0)]: 100 + limit + 0.01,
        [idx(3, 0)]: 100 + limit - 0.01,
      }),
      cfg,
    )
    expect(c.sigma).toBeCloseTo(Math.SQRT2 * SIGMA)
    expect([c.excavated[0], c.excavated[1], c.filled[2], c.filled[3]]).toEqual([1, 0, 1, 0])
    expect(c.dh[idx(0, 0)]).toBeCloseTo(-limit - 0.01, 4)
  })

  it('refuses surveys on different grids', () => {
    const other = { ...survey('current'), grid: { ...G, cellSize: 5 } }
    expect(() => detectChange(survey('baseline'), other, cfg)).toThrow('same grid')
  })
})

describe('connected components', () => {
  it('joins diagonal neighbours, separates gaps and different keys', () => {
    const flag = new Uint8Array(N)
    flag[idx(0, 0)] = flag[idx(1, 1)] = 1 // diagonal pair
    flag[idx(5, 5)] = 1 // isolated
    flag[idx(6, 5)] = 2 // touches (5, 5) but another key
    const regions = connectedComponents(flag, 10, 10)
    expect(regions).toEqual([[idx(0, 0), idx(1, 1)], [idx(5, 5)], [idx(6, 5)]])
  })
})

describe('R1 boundary encroachment', () => {
  const dig = (col: number) =>
    ruleBoundary(
      detectChange(survey('baseline'), survey('current', { [idx(col, 5)]: 95 }), cfg),
      LIMITS,
    )

  it('is a violation outside the lease', () => {
    expect(dig(8).status[idx(8, 5)]).toBe(2)
  })
  it('is a warning inside the lease but within the buffer', () => {
    expect(dig(6).status[idx(6, 5)]).toBe(1)
  })
  it('ignores digging well inside the lease', () => {
    expect(dig(5).status.some(Boolean)).toBe(false)
  })
  it('ignores a change within the noise band outside the lease', () => {
    const c = detectChange(
      survey('baseline'),
      survey('current', { [idx(8, 5)]: 100 - limit + 0.05 }),
      cfg,
    )
    expect(ruleBoundary(c, LIMITS).status.some(Boolean)).toBe(false)
  })
})

describe('R2 depth limit', () => {
  const band = cfg.k * SIGMA
  const marks = (z: number, col = 2) =>
    ruleDepth(survey('current', { [idx(col, 2)]: z }), LIMITS, cfg.k)

  it('is a violation more than kσ below the approved floor', () => {
    const m = marks(90 - band - 0.01)
    expect(m.status[idx(2, 2)]).toBe(2)
    expect(m.exceedance[idx(2, 2)]).toBeCloseTo(band + 0.01, 4)
  })
  it('is only a warning when below the floor by less than kσ (borderline)', () => {
    expect(marks(90 - band + 0.01).status[idx(2, 2)]).toBe(1)
  })
  it('ignores ground at or above the floor, and anything outside the pit zone', () => {
    expect(marks(90).status.some(Boolean)).toBe(false)
    expect(marks(80, 8).status.some(Boolean)).toBe(false)
  })
})

describe('R3 unauthorised dumping', () => {
  const fill = (col: number, row: number) =>
    ruleDumping(
      detectChange(survey('baseline'), survey('current', { [idx(col, row)]: 104 }), cfg),
      LIMITS,
    )
  it('warns about fill outside the dump zones', () => {
    expect(fill(2, 2).status[idx(2, 2)]).toBe(1)
  })
  it('accepts fill inside a dump zone', () => {
    expect(fill(2, 7).status.some(Boolean)).toBe(false)
  })
})

describe('severity and explanations', () => {
  it('follows the thresholds in config', () => {
    const c = cfg.critical
    expect(severityOf('violation', c.areaM2 - 1, 0, 0)).toBe('high')
    expect(severityOf('violation', c.areaM2, 0, 0)).toBe('critical')
    expect(severityOf('violation', 0, 0, c.exceedanceM)).toBe('critical')
    expect(severityOf('warning', 0, cfg.mediumWarning.volumeM3 - 1, 0)).toBe('low')
    expect(severityOf('warning', 0, cfg.mediumWarning.volumeM3, 0)).toBe('medium')
  })

  it('groups cells into findings with area, volume, exceedance and a plain explanation', () => {
    const { findings } = evaluate(
      survey('baseline'),
      survey('current', { [idx(8, 5)]: 94, [idx(9, 5)]: 96, [idx(8, 6)]: 98 }),
      LIMITS,
    )
    expect(findings).toHaveLength(1)
    const f = findings[0]
    expect(f).toMatchObject({ id: 'R1-1', ruleId: 'R1', status: 'violation', areaM2: 300 })
    expect(f.volumeM3).toBeCloseTo((6 + 4 + 2) * 100, 1)
    expect(f.maxExceedance).toBeCloseTo(6, 4)
    expect(f.centroid.x).toBeCloseTo((80 + 90 + 80) / 3)
    expect(f.explanation).toBe(
      'Excavated 300 m² outside the lease boundary; deepest cut 6.0 m ± 0.14 m (2σ). About 1,200 m³ removed.',
    )
  })
})

describe('synthetic scenario', async () => {
  const p = new SyntheticTerrainProvider()
  const { findings } = evaluate(
    await p.getSurvey('baseline'),
    await p.getSurvey('current'),
    await p.getLimits(),
  )

  it('produces exactly the planted findings', () => {
    const summary = findings.map((f) => ({
      id: f.id,
      type: f.type,
      status: f.status,
      severity: f.severity,
      cells: f.cells.length,
      areaM2: f.areaM2,
      volumeM3: Math.round(f.volumeM3),
      maxExceedance: +f.maxExceedance.toFixed(2),
      centroid: [Math.round(f.centroid.x), Math.round(f.centroid.y)],
    }))
    expect(summary.map((f) => `${f.id} ${f.status}`)).toEqual([
      'R1-1 violation', // encroachment past the east lease edge
      'R2-1 violation', // sump below the approved floor
      'R1-2 warning', // the same pushback where it crosses the safety buffer
      'R3-1 warning', // truck-tipped heaps outside the dump zone
      'R1-3 warning', // shallow scrape inside the buffer
    ])
    expect(summary).toMatchSnapshot()
  })

  it('explains every finding with its numbers', () => {
    for (const f of findings) {
      expect(f.explanation).toMatch(/\d m²/)
      expect(f.explanation).toMatch(/± 0\.\d\d m \(2σ\)/)
    }
  })
})
