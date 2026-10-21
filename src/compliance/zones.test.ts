import { describe, expect, it } from 'vitest'
import type { GridSpec, PermittedLimits, PitZone, TerrainSurvey } from '../domain/types'
import { evaluate } from './engine'
import { readPoint } from './inspect'
import { governingPitZone, largestPitZone, pitFloorRows } from './zone'

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

// Different footprints, for the camera-framing rule: area decides, not permit order.
const SMALL: PitZone = {
  id: 'zone-small',
  polygon: square(0, 0, 10, 10),
  approvedFloorElevation: 100,
}
const LARGE: PitZone = {
  id: 'zone-large',
  polygon: square(0, 0, 50, 50),
  approvedFloorElevation: 100,
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

  it('names the zone for an off-grid point that is still inside a zone', () => {
    // A grid smaller than the zone, so the point is inside the permit but off the survey: the
    // floor is known, the margin above it is not.
    const s: TerrainSurvey = {
      ...survey(),
      grid: { cols: 2, rows: 2, cellSize: 10, originXY: { x: 0, y: 0 } },
      elevations: new Float32Array(4).fill(100),
    }
    const reading = readPoint({ x: 30, y: 30 }, s, s, limits([DEEP]), [])
    expect(reading.elevation).toBeNull()
    expect(reading.pit).toEqual({ floor: 106.5, above: null })
  })
})

const at = (x: number, y: number, h: number) => ({ p: { x, y }, h })

describe('governing pit zone', () => {
  it('returns the deeper-breaching zone for a single sample, in both array orders', () => {
    for (const zones of [
      [SHALLOW, DEEP],
      [DEEP, SHALLOW],
    ]) {
      expect(governingPitZone(zones, [at(10, 10, 100)])?.id).toBe('zone-deep')
    }
  })

  it('returns the deeper-breaching zone for a multi-sample profile, in both array orders', () => {
    const series = [at(10, 10, 100), at(20, 20, 99), at(30, 30, 105)]
    for (const zones of [
      [SHALLOW, DEEP],
      [DEEP, SHALLOW],
    ]) {
      expect(governingPitZone(zones, series)?.id).toBe('zone-deep')
    }
  })

  it('ignores samples outside every zone', () => {
    expect(governingPitZone([SHALLOW, DEEP], [at(-50, -50, 0)])).toBeUndefined()
    // An outside sample does not veto a sample that is inside.
    expect(governingPitZone([DEEP], [at(-50, -50, 0), at(10, 10, 100)])?.id).toBe('zone-deep')
  })

  it('ranks by depth when a height is known, ignoring gaps', () => {
    for (const h of [NaN, Infinity, -Infinity]) {
      expect(governingPitZone([DEEP], [at(10, 10, NaN), at(20, 20, 100), at(30, 30, h)])?.id).toBe(
        'zone-deep',
      )
    }
  })

  it('still names the zone when the height is unknown, using the lowest floor', () => {
    // Off the survey grid we know the point is inside the zone, just not how deep it is, so the
    // floor stays on screen with an unknown margin rather than the zone disappearing.
    for (const h of [NaN, Infinity, -Infinity]) {
      expect(governingPitZone([DEEP], [at(10, 10, h)])?.id).toBe('zone-deep')
      expect(governingPitZone([DEEP, SHALLOW], [at(10, 10, h)])?.id).toBe('zone-shallow')
      expect(governingPitZone([SHALLOW, DEEP], [at(10, 10, h)])?.id).toBe('zone-shallow')
    }
  })

  it('has no answer when an unrankable sample is outside every zone', () => {
    expect(governingPitZone([DEEP], [at(-50, -50, NaN)])).toBeUndefined()
  })

  it('keeps the first zone when two zones put the ground equally deep', () => {
    const a = { ...SHALLOW, id: 'zone-a' }
    const b = { ...SHALLOW, id: 'zone-b' }
    expect(governingPitZone([a, b], [at(10, 10, 100)])?.id).toBe('zone-a')
    expect(governingPitZone([b, a], [at(10, 10, 100)])?.id).toBe('zone-b')
  })
})

describe('largest pit zone', () => {
  it('picks by polygon area, not by array order', () => {
    expect(largestPitZone([SMALL, LARGE])?.id).toBe('zone-large')
    expect(largestPitZone([LARGE, SMALL])?.id).toBe('zone-large')
  })

  it('has no answer without zones', () => {
    expect(largestPitZone([])).toBeUndefined()
  })
})

describe('pit floor rows', () => {
  it('keeps the exact single-zone label and value', () => {
    expect(pitFloorRows([DEEP])).toEqual([{ label: 'Approved floor', value: '106.5 m RL' }])
  })

  it('emits one zone-labelled row per pit zone', () => {
    expect(pitFloorRows([SHALLOW, DEEP])).toEqual([
      { label: 'Approved floor (zone-shallow)', value: '100.05 m RL' },
      { label: 'Approved floor (zone-deep)', value: '106.5 m RL' },
    ])
  })
})
