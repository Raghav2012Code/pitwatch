import { describe, expect, it } from 'vitest'
import type { GridSpec, Polygon } from '../domain/types'
import {
  cellAt,
  cellCenter,
  centerOfIndex,
  extent,
  indexOf,
  sampleBilinear,
  volumeOf,
} from './grid'
import { latLonToLocal, localToLatLon } from './latlon'
import { measure } from './measure'
import { distanceToBoundary, insetSegments, pointInPolygon, polygonArea } from './polygon'

const square: Polygon = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 10 },
  { x: 0, y: 10 },
]
// U shape: the notch (4..6, 4..10) is outside.
const u: Polygon = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 10 },
  { x: 6, y: 10 },
  { x: 6, y: 4 },
  { x: 4, y: 4 },
  { x: 4, y: 10 },
  { x: 0, y: 10 },
]

describe('polygon', () => {
  it('tests points inside and outside, including a concave notch', () => {
    expect(pointInPolygon({ x: 5, y: 5 }, square)).toBe(true)
    expect(pointInPolygon({ x: 11, y: 5 }, square)).toBe(false)
    expect(pointInPolygon({ x: 2, y: 8 }, u)).toBe(true)
    expect(pointInPolygon({ x: 5, y: 8 }, u)).toBe(false)
    expect(pointInPolygon({ x: 5, y: 2 }, u)).toBe(true)
  })

  it('computes area regardless of winding', () => {
    expect(polygonArea(square)).toBe(100)
    expect(polygonArea([...square].reverse())).toBe(100)
    expect(polygonArea(u)).toBe(100 - 12)
  })

  it('measures distance to the outline from inside and outside', () => {
    expect(distanceToBoundary({ x: 5, y: 2 }, square)).toBe(2)
    expect(distanceToBoundary({ x: 13, y: 14 }, square)).toBe(5)
  })
})

describe('buffer outline', () => {
  const big: Polygon = [
    { x: 0, y: 0 },
    { x: 200, y: 0 },
    { x: 200, y: 120 },
    { x: 0, y: 120 },
  ]

  it('traces points inside the polygon, the inset distance from its outline', () => {
    const segs = insetSegments(big, 20, 4)
    expect(segs.length).toBeGreaterThan(100)
    expect(segs.length % 2).toBe(0)
    for (const p of segs) {
      expect(pointInPolygon(p, big)).toBe(true)
      expect(distanceToBoundary(p, big)).toBeCloseTo(20, 0)
    }
  })

  it('follows a concave notch instead of cutting across it', () => {
    const notch: Polygon = [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { x: 200, y: 120 },
      { x: 110, y: 120 },
      { x: 110, y: 50 },
      { x: 90, y: 50 },
      { x: 90, y: 120 },
      { x: 0, y: 120 },
    ]
    const segs = insetSegments(notch, 15, 2)
    // Nothing may land inside the notch or within 15 m of its walls.
    for (const p of segs) expect(distanceToBoundary(p, notch)).toBeGreaterThan(14.5)
    expect(segs.some((p) => p.x > 90 && p.x < 110 && p.y > 50)).toBe(false)
  })
})

const grid: GridSpec = { cols: 3, rows: 2, cellSize: 8, originXY: { x: 100, y: 200 } }

describe('grid', () => {
  it('maps cells to centres and back', () => {
    expect(indexOf(grid, 2, 1)).toBe(5)
    expect(cellCenter(grid, 2, 1)).toEqual({ x: 116, y: 208 })
    expect(centerOfIndex(grid, 5)).toEqual({ x: 116, y: 208 })
    expect(cellAt(grid, { x: 115, y: 205 })).toEqual({ col: 2, row: 1 })
    expect(cellAt(grid, { x: 90, y: 200 })).toBeNull()
    expect(extent(grid)).toEqual({ min: { x: 100, y: 200 }, max: { x: 116, y: 208 } })
  })

  it('interpolates bilinearly between centres', () => {
    // Row 0: 0 10 20, row 1: 100 110 120.
    const v = Float32Array.from([0, 10, 20, 100, 110, 120])
    expect(sampleBilinear(grid, v, { x: 100, y: 200 })).toBe(0)
    expect(sampleBilinear(grid, v, { x: 116, y: 208 })).toBe(120)
    expect(sampleBilinear(grid, v, { x: 104, y: 204 })).toBe(55)
    expect(sampleBilinear(grid, v, { x: 99, y: 204 })).toBeNull()
  })

  it('sums absolute height change into volume', () => {
    const dh = Float32Array.from([-2, 1, 0, 0, 0, 0])
    expect(volumeOf(grid, dh, [0, 1])).toBe(3 * 64)
  })
})

describe('lat/lon display conversion', () => {
  const origin = { lat: 21.7342, lon: 84.3127 }

  it('round-trips local metres', () => {
    const p = { x: 1530.5, y: -412.25 }
    const back = latLonToLocal(origin, localToLatLon(origin, p))
    expect(back.x).toBeCloseTo(p.x, 6)
    expect(back.y).toBeCloseTo(p.y, 6)
  })

  it('puts 1 km north about 0.009° of latitude away', () => {
    expect(localToLatLon(origin, { x: 0, y: 1000 }).lat - origin.lat).toBeCloseTo(0.008993, 6)
  })
})

describe('measure', () => {
  it('reports horizontal, slope and vertical distances', () => {
    const m = measure({ x: 0, y: 0, z: 10 }, { x: 3, y: 4, z: 22 })
    expect(m.horizontalDistance).toBe(5)
    expect(m.dz).toBe(12)
    expect(m.slopeDistance).toBe(13)
    expect(m.provenance).toBe('derived')
  })
})
