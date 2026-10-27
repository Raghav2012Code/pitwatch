import { describe, expect, it } from 'vitest'
import {
  cellIndicesToSvgPath,
  cellMaskToSvgPath,
  elevationContoursToSvgPaths,
  polygonInteriorPoint,
} from './sitePlan'
import { pointInPolygon } from './polygon'

const grid = (cols: number, rows: number) => ({
  cols,
  rows,
  cellSize: 2,
  originXY: { x: 0, y: 0 },
})

const subpaths = (path: string) => path.match(/M[^Z]*Z/g) ?? []

function signedArea(path: string): number {
  const points = Array.from(path.matchAll(/[ML](-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g), (m) => [
    Number(m[1]),
    Number(m[2]),
  ])
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i]!
    const [x2, y2] = points[(i + 1) % points.length]!
    area += x1! * y2! - x2! * y1!
  }
  return area / 2
}

describe('cellMaskToSvgPath', () => {
  it('returns no path for an empty mask', () => {
    expect(cellMaskToSvgPath(grid(2, 2), new Uint8Array(4))).toBe('')
  })

  it('traces one cell against the north-up cell-edge extent', () => {
    expect(cellMaskToSvgPath(grid(1, 1), [1])).toBe('M-1 0L1 0L1 2L-1 2Z')
  })

  it('merges adjacent cells and removes their shared edge', () => {
    expect(cellMaskToSvgPath(grid(2, 1), [1, 1])).toBe('M-1 0L3 0L3 2L-1 2Z')
  })

  it('includes a selected cell on the east and north grid edges', () => {
    expect(cellMaskToSvgPath(grid(2, 2), [0, 0, 0, 1])).toBe('M1 0L3 0L3 2L1 2Z')
  })

  it('keeps diagonally touching cells as separate outlines', () => {
    const path = cellMaskToSvgPath(grid(2, 2), [1, 0, 0, 1])
    expect(subpaths(path)).toHaveLength(2)
  })

  it('traces holes and disconnected components as separate paths', () => {
    const ring = new Uint8Array(25).fill(1)
    ring[12] = 0
    const path = cellMaskToSvgPath(grid(5, 5), ring)
    const loops = subpaths(path)
    expect(loops).toHaveLength(2)
    expect(Math.sign(signedArea(loops[0]!))).not.toBe(Math.sign(signedArea(loops[1]!)))

    const pieces = new Uint8Array(25)
    pieces[0] = 1
    pieces[2] = 1
    pieces[24] = 1
    expect(subpaths(cellMaskToSvgPath(grid(5, 5), pieces))).toHaveLength(3)
  })

  it('uses the grid origin and cell size for plan coordinates', () => {
    expect(
      cellMaskToSvgPath({ cols: 1, rows: 1, cellSize: 4, originXY: { x: 10, y: 30 } }, [true]),
    ).toBe('M8 0L12 0L12 4L8 4Z')
  })

  it('preserves sub-millimetre cell coordinates without rounding the path closed', () => {
    expect(
      cellMaskToSvgPath({ cols: 1, rows: 1, cellSize: 0.0001, originXY: { x: 0, y: 0 } }, [1]),
    ).toBe('M-0.00005 0L0.00005 0L0.00005 0.0001L-0.00005 0.0001Z')
  })

  it('rejects masks whose length does not match the grid', () => {
    expect(() => cellMaskToSvgPath(grid(2, 2), [1, 0, 1])).toThrow(RangeError)
  })

  it('rejects malformed grid dimensions', () => {
    expect(() => cellMaskToSvgPath({ ...grid(2, 2), cols: 0 }, [1, 0, 0, 0])).toThrow(RangeError)
  })
})

describe('cellIndicesToSvgPath', () => {
  it('deduplicates indices and traces in stable row-major order', () => {
    const g = grid(3, 2)
    expect(cellIndicesToSvgPath(g, [0, 1, 1])).toBe(cellIndicesToSvgPath(g, [1, 0]))
  })

  it('maps row zero to the bottom of the plan', () => {
    expect(cellIndicesToSvgPath(grid(1, 2), [0])).toBe('M-1 2L1 2L1 4L-1 4Z')
    expect(cellIndicesToSvgPath(grid(1, 2), [1])).toBe('M-1 0L1 0L1 2L-1 2Z')
  })

  it.each([-1, 4, 1.5, Number.NaN])('rejects malformed or out-of-range index %s', (index) => {
    expect(() => cellIndicesToSvgPath(grid(2, 2), [index])).toThrow(RangeError)
  })
})

describe('elevationContoursToSvgPaths', () => {
  it('returns no contours for a flat surface', () => {
    expect(elevationContoursToSvgPaths(grid(2, 2), [10, 10, 10, 10], 5)).toEqual([])
  })

  it('interpolates an east-west slope at the requested elevation', () => {
    const contours = elevationContoursToSvgPaths(grid(2, 2), [0, 10, 0, 10], 5)
    expect(contours).toEqual([{ level: 5, d: 'M1 1L1 3' }])
  })

  it('maps north-south contours into the same north-up plan coordinates', () => {
    const contours = elevationContoursToSvgPaths(grid(2, 2), [0, 0, 10, 10], 5)
    expect(contours).toEqual([{ level: 5, d: 'M2 2L0 2' }])
  })

  it('keeps contours that cross a grid edge on the edge sample', () => {
    const contours = elevationContoursToSvgPaths(grid(2, 2), [2, 0, 2, 8], 2)
    expect(contours[0]).toEqual({ level: 2, d: 'M2 2.5L0 3' })
  })

  it('chooses a deterministic contour through an ambiguous saddle', () => {
    const values = [10, 0, 0, 10]
    const first = elevationContoursToSvgPaths(grid(2, 2), values, 5)
    const second = elevationContoursToSvgPaths(grid(2, 2), values, 5)
    expect(first).toEqual(second)
    expect(first).toHaveLength(1)
    expect(first[0]!.d).not.toContain('NaN')
  })

  it('handles the current 513 by 513 survey grid at 4 m spacing', () => {
    const size = 513
    const elevations = new Float32Array(size * size)
    for (let row = 0; row < size; row++) {
      const elevation = 272 + (row / (size - 1)) * 150
      elevations.fill(elevation, row * size, (row + 1) * size)
    }
    const contours = elevationContoursToSvgPaths(
      { cols: size, rows: size, cellSize: 4, originXY: { x: 0, y: 0 } },
      elevations,
      5,
    )
    expect(contours).toHaveLength(30)
    expect(contours[0]!.level).toBe(275)
    expect(contours.at(-1)!.level).toBe(420)
    expect(contours.every(({ d }) => d.startsWith('M') && !/NaN|Infinity/.test(d))).toBe(true)
  })

  it('rejects mismatched, non-finite and invalid-interval input', () => {
    expect(() => elevationContoursToSvgPaths(grid(2, 2), [1, 2, 3], 1)).toThrow(RangeError)
    expect(() => elevationContoursToSvgPaths(grid(2, 2), [1, 2, Number.NaN, 4], 1)).toThrow(
      RangeError,
    )
    expect(() => elevationContoursToSvgPaths(grid(2, 2), [1, 2, 3, 4], 0)).toThrow(RangeError)
    expect(() => elevationContoursToSvgPaths(grid(2, 2), [0, 1000, 0, 1000], 1)).toThrow(RangeError)
    const currentSize = 513
    const excessiveRange = new Float32Array(currentSize * currentSize)
    excessiveRange[currentSize * currentSize - 1] = 1000
    expect(() =>
      elevationContoursToSvgPaths(
        { cols: currentSize, rows: currentSize, cellSize: 4, originXY: { x: 0, y: 0 } },
        excessiveRange,
        1,
      ),
    ).toThrow('too much grid work')
  })
})

describe('polygonInteriorPoint', () => {
  const concave = [
    { x: 0, y: 0 },
    { x: 8, y: 0 },
    { x: 8, y: 8 },
    { x: 6, y: 8 },
    { x: 6, y: 2 },
    { x: 2, y: 2 },
    { x: 2, y: 8 },
    { x: 0, y: 8 },
  ]

  it('returns an interior point for a convex polygon', () => {
    const rectangle = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 6 },
      { x: 0, y: 6 },
    ]
    const point = polygonInteriorPoint(rectangle)
    expect(point).not.toBeNull()
    expect(pointInPolygon(point!, rectangle)).toBe(true)
  })

  it('finds an interior point when a concave polygon centroid is outside', () => {
    const centroid = { x: 4, y: 3.4 }
    expect(pointInPolygon(centroid, concave)).toBe(false)
    const point = polygonInteriorPoint(concave)
    expect(point).not.toBeNull()
    expect(pointInPolygon(point!, concave)).toBe(true)
  })

  it('is independent of winding direction', () => {
    expect(polygonInteriorPoint([...concave].reverse())).toEqual(polygonInteriorPoint(concave))
  })

  it('returns null for a degenerate polygon', () => {
    expect(
      polygonInteriorPoint([
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 2 },
      ]),
    ).toBeNull()
  })
})
