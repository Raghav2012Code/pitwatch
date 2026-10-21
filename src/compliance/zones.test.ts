import { describe, expect, it } from 'vitest'
import type { GridSpec, PermittedLimits, PitZone, TerrainSurvey } from '../domain/types'
import { evaluate } from './engine'
import { readPoint } from './inspect'

/*
 * Two overlapping pit zones over one cell at elevation 100.
 *
 *   zone-shallow  floor 100.05  → 0.05 m below, inside k·σ (0.10 m) → warning
 *   zone-deep     floor 106.50  → 6.50 m below, past the band      → violation
 *
 * The old rule overwrote the status per zone, so the answer depended on array order, while
 * exceedance and volume took the maximum; the explanation always quoted the first zone's floor.
 */
const G: GridSpec = { cols: 4, rows: 4, cellSize: 10, originXY: { x: 0, y: 0 } }

const square = (x0: number, y0: number, x1: number, y1: number) => [
  { x: x0, y: y0 },
  { x: x1, y: y0 },
  { x: x1, y: y1 },
  { x: x0, y: y1 },
]

const SHALLOW: PitZone = {
  id: 'zone-shallow',
  polygon: square(0, 0, 35, 35),
  approvedFloorElevation: 100.05,
}
const DEEP: PitZone = {
  id: 'zone-deep',
  polygon: square(0, 0, 35, 35),
  approvedFloorElevation: 106.5,
}

function survey(): TerrainSurvey {
  return {
    id: 'current',
    label: 'Current',
    date: '2026-01-01',
    method: 'test',
    provenance: 'simulated',
    grid: G,
    elevations: new Float32Array(16).fill(100),
    verticalUncertainty: 0.05,
  }
}

function limits(pitZones: PitZone[]): PermittedLimits {
  return {
    leaseBoundary: square(-5, -5, 40, 40),
    safetyBufferMetres: 5,
    pitZones,
    maxPitDepth: 10,
    dumpZones: [],
  }
}

const depthFinding = (zones: PitZone[]) => {
  const s = survey()
  return evaluate(s, s, limits(zones)).findings.find((f) => f.ruleId === 'R2')
}

describe('depth rule with overlapping pit zones', () => {
  it('reports the worse status whichever order the zones are in', () => {
    for (const zones of [
      [SHALLOW, DEEP],
      [DEEP, SHALLOW],
    ]) {
      const found = depthFinding(zones)
      expect(found?.status).toBe('violation')
    }
  })

  it('quotes the floor of the zone it breaches most, not the first zone', () => {
    for (const zones of [
      [SHALLOW, DEEP],
      [DEEP, SHALLOW],
    ]) {
      const found = depthFinding(zones)!
      expect(found.pitZoneId).toBe('zone-deep')
      expect(found.explanation).toContain('RL 107 m')
      expect(found.explanation).not.toContain('RL 100 m')
    }
  })

  it('keeps the exceedance and the quoted floor describing the same breach', () => {
    const found = depthFinding([SHALLOW, DEEP])!
    // 6.50 m below the deep zone's floor, not the 0.05 m of the shallow one.
    expect(found.maxExceedance).toBeCloseTo(6.5, 5)
    expect(found.status).toBe('violation')
  })

  it('leaves a single zone behaving as before', () => {
    const found = depthFinding([SHALLOW])!
    expect(found.status).toBe('warning')
    expect(found.pitZoneId).toBe('zone-shallow')
    expect(found.maxExceedance).toBeCloseTo(0.05, 5)
  })
})

describe('inspector with overlapping pit zones', () => {
  it('reports the governing zone floor, matching the depth rule', () => {
    const s = survey()
    const reading = readPoint({ x: 10, y: 10 }, s, s, limits([SHALLOW, DEEP]), [])
    expect(reading.pit?.floor).toBe(106.5)

    // Order must not matter here either.
    const reversed = readPoint({ x: 10, y: 10 }, s, s, limits([DEEP, SHALLOW]), [])
    expect(reversed.pit?.floor).toBe(106.5)
  })

  it('is unchanged where only one zone covers the point', () => {
    const s = survey()
    const reading = readPoint({ x: 10, y: 10 }, s, s, limits([DEEP]), [])
    expect(reading.pit?.floor).toBe(106.5)
  })
})
