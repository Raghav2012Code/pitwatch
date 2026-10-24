import { describe, expect, it } from 'vitest'
import type { ExcavationState, GridSpec } from '../domain/types'
import { cellArea } from './grid'
import { polygonArea } from './polygon'
import { cellCentre, changeRings, contourLines, maskRings, type Trail } from './plan'

/*
 * The site plan's edges are drawn from these trails, so their area has to be the cells they
 * outline: a figure that claims 40 ha of excavation must be the 40 ha the engine counted.
 */

const grid = (cols: number, rows: number, cellSize = 4): GridSpec => ({
  cols,
  rows,
  cellSize,
  originXY: { x: 100, y: 200 },
})

const mask = (g: GridSpec, cells: readonly [number, number][]): Uint8Array => {
  const out = new Uint8Array(g.cols * g.rows)
  for (const [col, row] of cells) out[row * g.cols + col] = 1
  return out
}

const areaOf = (t: Trail) => polygonArea(t.points)

describe('maskRings', () => {
  it('outlines one cell as a closed ring of four corners, one cell big', () => {
    const g = grid(3, 3)
    const trails = maskRings(mask(g, [[1, 1]]), g)
    expect(trails).toHaveLength(1)
    expect(trails[0]!.closed).toBe(true)
    expect(trails[0]!.points).toHaveLength(4)
    expect(areaOf(trails[0]!)).toBeCloseTo(cellArea(g), 6)
  })

  it('outlines an L of three cells as a single ring of three cells', () => {
    const g = grid(4, 4)
    const trails = maskRings(
      mask(g, [
        [0, 0],
        [1, 0],
        [0, 1],
      ]),
      g,
    )
    expect(trails).toHaveLength(1)
    expect(trails[0]!.closed).toBe(true)
    expect(areaOf(trails[0]!)).toBeCloseTo(3 * cellArea(g), 6)
  })

  it('returns the hole of a ring as its own closed trail', () => {
    const g = grid(5, 5)
    const ring: [number, number][] = []
    for (let row = 1; row <= 3; row++) for (let col = 1; col <= 3; col++) ring.push([col, row])
    const withHole = mask(
      g,
      ring.filter(([col, row]) => !(col === 2 && row === 2)),
    )
    const trails = maskRings(withHole, g)
    expect(trails).toHaveLength(2)
    expect(trails.every((t) => t.closed)).toBe(true)
    const outer = Math.max(...trails.map(areaOf))
    const hole = Math.min(...trails.map(areaOf))
    expect(outer - hole).toBeCloseTo(8 * cellArea(g), 6)
  })

  it('draws nothing for an empty mask, and still outlines a one-cell grid', () => {
    expect(maskRings(new Uint8Array(9), grid(3, 3))).toEqual([])
    const single = maskRings(new Uint8Array([1]), grid(1, 1))
    expect(single).toHaveLength(1)
    expect(areaOf(single[0]!)).toBeCloseTo(16, 6)
  })

  it('keeps every point inside the grid, half a cell in from its edges', () => {
    const g = grid(6, 5)
    const trails = maskRings(
      mask(g, [
        [0, 0],
        [5, 4],
      ]),
      g,
    )
    for (const t of trails) {
      for (const p of t.points) {
        expect(p.x).toBeGreaterThanOrEqual(g.originXY.x)
        expect(p.x).toBeLessThanOrEqual(g.originXY.x + g.cols * g.cellSize)
        expect(p.y).toBeGreaterThanOrEqual(g.originXY.y)
        expect(p.y).toBeLessThanOrEqual(g.originXY.y + g.rows * g.cellSize)
      }
    }
  })
})

describe('changeRings', () => {
  it('matches the engine cell counts: the fill is the cells it is made of', () => {
    const g = grid(6, 6)
    const excavated = mask(g, [
      [1, 1],
      [2, 1],
      [3, 1],
      [2, 2],
    ])
    const filled = mask(g, [
      [4, 4],
      [5, 4],
    ])
    const change: ExcavationState = {
      grid: g,
      dh: new Float32Array(g.cols * g.rows),
      excavated,
      filled,
      sigma: 0.07,
    }
    const rings = changeRings(change)
    const sum = (t: Trail[]) => t.reduce((s, trail) => s + areaOf(trail), 0)
    expect(sum(rings.excavated)).toBeCloseTo(4 * cellArea(g), 6)
    expect(sum(rings.filled)).toBeCloseTo(2 * cellArea(g), 6)
  })
})

describe('contourLines', () => {
  const plane = (g: GridSpec, at: (x: number, y: number) => number) => {
    const out = new Float32Array(g.cols * g.rows)
    for (let row = 0; row < g.rows; row++) {
      for (let col = 0; col < g.cols; col++) {
        const c = cellCentre(g, col, row)
        out[row * g.cols + col] = at(c.x, c.y)
      }
    }
    return out
  }

  it('puts lines on round levels and runs them straight across a ramp', () => {
    const g = grid(11, 11, 4)
    // Centres run from x = 102 to 142, so the ground runs from RL 404 to 484.
    const z = plane(g, (x) => 400 + (x - g.originXY.x) * 2)
    const lines = contourLines(z, g, 25)
    expect(lines.map((l) => l.rl)).toEqual([425, 450, 475])
    for (const line of lines) {
      expect(line.trails.length).toBeGreaterThan(0)
      expect(line.trails.every((t) => !t.closed)).toBe(true)
      // A ramp crosses a level once, from one edge of the grid to the other.
      for (const p of line.trails.flatMap((t) => t.points)) {
        expect(p.x).toBeGreaterThan(g.originXY.x)
        expect(p.x).toBeLessThan(g.originXY.x + g.cols * g.cellSize)
      }
    }
  })

  it('closes the rings of a cone, and higher rings enclose less ground', () => {
    const g = grid(31, 31, 4)
    // Apex nudged off a cell centre and off a round level, so no line lands exactly on a sample.
    const cx = g.originXY.x + (g.cols * g.cellSize) / 2 + 2
    const cy = g.originXY.y + (g.rows * g.cellSize) / 2 + 2
    const z = plane(g, (x, y) => 493 - Math.hypot(x - cx, y - cy))
    const lines = contourLines(z, g, 10)
    // Rings wider than the grid are clipped by it, so only the inner levels close.
    const inside = lines.filter((l) => l.rl >= 450)
    expect(inside.length).toBeGreaterThan(2)
    for (const line of inside) {
      expect(line.trails).toHaveLength(1)
      expect(line.trails[0]!.closed).toBe(true)
    }
    const areas = inside.map((l) => areaOf(l.trails[0]!))
    for (let i = 1; i < areas.length; i++) expect(areas[i]!).toBeLessThan(areas[i - 1]!)
  })

  it('returns nothing for a field with no finite heights', () => {
    const g = grid(5, 5)
    expect(contourLines(new Float32Array(g.cols * g.rows).fill(NaN), g, 5)).toEqual([])
  })
})
