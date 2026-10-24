import type { ExcavationState, GridSpec, Vec2 } from '../domain/types'

/*
 * Plan geometry for the Overview site plan: the outline of a cell mask and the contour lines of
 * an elevation field, as polylines in local metres.
 *
 * A mask is traced along the cell edges themselves, so a region of n cells has exactly the area of
 * n cells and a straight edge stays straight. A contour uses marching squares and interpolates
 * along each cell edge, because heights are continuous and a line has to cross where the ground
 * actually reaches its level. Both are sampled on 513 × 513 cells on every load, so the loops read
 * the arrays directly and allocate nothing per cell.
 */

export interface Trail {
  points: Vec2[]
  /** True when the line comes back to its first point: a filled region's outline or a closed ring. */
  closed: boolean
}

/** Local metres at the centre of cell (i, j). */
export const cellCentre = (grid: GridSpec, i: number, j: number): Vec2 => ({
  x: grid.originXY.x + (i + 0.5) * grid.cellSize,
  y: grid.originXY.y + (j + 0.5) * grid.cellSize,
})

/** A cell rectangle to trace, in cell indices. Absent means the whole grid. */
export interface CellBox {
  col0: number
  col1: number
  row0: number
  row1: number
}

/**
 * The outline of every region of a 0/1 mask (holes come back as their own closed trail).
 * Points sit exactly on cell corners, so the area of a trail is the area of the cells it rings.
 */
export function maskRings(mask: ArrayLike<number>, grid: GridSpec, box?: CellBox): Trail[] {
  const { cols, rows, cellSize: cs } = grid
  const col0 = Math.max(0, box?.col0 ?? 0)
  const col1 = Math.min(cols - 1, box?.col1 ?? cols - 1)
  const row0 = Math.max(0, box?.row0 ?? 0)
  const row1 = Math.min(rows - 1, box?.row1 ?? rows - 1)

  const vw = cols + 1
  const at = (v: number): Vec2 => ({
    x: grid.originXY.x + (v % vw) * cs,
    y: grid.originXY.y + Math.floor(v / vw) * cs,
  })
  const filled = (col: number, row: number) =>
    col >= 0 && row >= 0 && col < cols && row < rows && mask[row * cols + col]! > 0

  // One directed edge per filled side facing empty ground, anticlockwise around the region, so
  // the ground is always on the left of the direction of travel.
  const from: number[] = []
  const to: number[] = []
  const id = (col: number, row: number) => row * vw + col
  for (let row = row0; row <= row1; row++) {
    for (let col = col0; col <= col1; col++) {
      if (!filled(col, row)) continue
      if (!filled(col, row - 1)) {
        from.push(id(col, row))
        to.push(id(col + 1, row))
      }
      if (!filled(col + 1, row)) {
        from.push(id(col + 1, row))
        to.push(id(col + 1, row + 1))
      }
      if (!filled(col, row + 1)) {
        from.push(id(col + 1, row + 1))
        to.push(id(col, row + 1))
      }
      if (!filled(col - 1, row)) {
        from.push(id(col, row + 1))
        to.push(id(col, row))
      }
    }
  }

  const outgoing = new Map<number, number[]>()
  for (let e = 0; e < from.length; e++) {
    const list = outgoing.get(from[e]!)
    if (list) list.push(e)
    else outgoing.set(from[e]!, [e])
  }

  const used = new Uint8Array(from.length)
  const trails: Trail[] = []
  for (let e = 0; e < from.length; e++) {
    if (used[e]) continue
    used[e] = 1
    const start = from[e]!
    const points = [at(start)]
    let cursor = to[e]!
    let closed = false
    for (;;) {
      if (cursor === start) {
        closed = true
        break
      }
      points.push(at(cursor))
      const step = (outgoing.get(cursor) ?? []).find((n) => !used[n])
      if (step === undefined) break
      used[step] = 1
      cursor = to[step]!
    }
    trails.push({ points, closed })
  }
  return trails
}

/** The two change classes, ready to fill. */
export const changeRings = (change: ExcavationState): { excavated: Trail[]; filled: Trail[] } => ({
  excavated: maskRings(change.excavated, change.grid),
  filled: maskRings(change.filled, change.grid),
})

/** A cell rectangle around a set of cell indices, so one finding is only scanned where it is. */
export function cellBox(cells: readonly number[], grid: GridSpec): CellBox {
  let col0 = Infinity
  let col1 = -Infinity
  let row0 = Infinity
  let row1 = -Infinity
  for (const i of cells) {
    const col = i % grid.cols
    const row = (i - col) / grid.cols
    if (col < col0) col0 = col
    if (col > col1) col1 = col
    if (row < row0) row0 = row
    if (row > row1) row1 = row
  }
  return { col0, col1, row0, row1 }
}

/** Contour lines at one level, walked with marching squares over the elevation field. */
function traceAt(values: ArrayLike<number>, grid: GridSpec, level: number): Trail[] {
  const { cols, rows, cellSize: cs } = grid
  if (cols < 2 || rows < 2) return []

  const x0 = grid.originXY.x + cs / 2
  const y0 = grid.originXY.y + cs / 2
  const vBase = cols * rows
  const at = new Map<number, Vec2>()
  const segA: number[] = []
  const segB: number[] = []

  // Crossing points are keyed by the grid edge they sit on, so the two cells either side of an
  // edge agree on the point exactly and the lines join up.
  const horizontal = (i: number, j: number, va: number, vb: number, stride: number): number => {
    const key = j * stride + i
    let p = at.get(key)
    if (!p) {
      p = { x: x0 + (i + (level - va) / (vb - va)) * cs, y: y0 + j * cs }
      at.set(key, p)
    }
    return key
  }
  const vertical = (i: number, j: number, va: number, vb: number): number => {
    const key = vBase + j * cols + i
    let p = at.get(key)
    if (!p) {
      p = { x: x0 + i * cs, y: y0 + (j + (level - va) / (vb - va)) * cs }
      at.set(key, p)
    }
    return key
  }

  for (let j = 0; j + 1 < rows; j++) {
    let k = j * cols
    for (let i = 0; i + 1 < cols; i++, k++) {
      const v0 = values[k]!
      const v1 = values[k + 1]!
      const v3 = values[k + cols]!
      const v2 = values[k + cols + 1]!
      const a0 = v0 > level
      const a1 = v1 > level
      const a2 = v2 > level
      const a3 = v3 > level
      if (a0 === a1 && a1 === a2 && a2 === a3) continue
      // Corners in order bottom-left, bottom-right, top-right, top-left; the edge between each
      // pair is where a crossing can sit.
      const hits: number[] = []
      if (a0 !== a1) hits.push(horizontal(i, j, v0, v1, cols))
      if (a1 !== a2) hits.push(vertical(i + 1, j, v1, v2))
      if (a2 !== a3) hits.push(horizontal(i, j + 1, v3, v2, cols))
      if (a3 !== a0) hits.push(vertical(i, j, v0, v3))
      // 2 crossings: one line through the cell. 4 (a saddle): paired in edge order, the same
      // approximation `insetSegments` makes.
      for (let n = 0; n + 1 < hits.length; n += 2) {
        segA.push(hits[n]!)
        segB.push(hits[n + 1]!)
      }
    }
  }
  return chain(segA, segB, at)
}

/** Link segments that share an end into polylines. An open end is a line that leaves the grid. */
function chain(segA: readonly number[], segB: readonly number[], at: Map<number, Vec2>): Trail[] {
  const touching = new Map<number, number[]>()
  const add = (key: number, s: number) => {
    const list = touching.get(key)
    if (list) list.push(s)
    else touching.set(key, [s])
  }
  for (let s = 0; s < segA.length; s++) {
    add(segA[s]!, s)
    add(segB[s]!, s)
  }

  const used = new Uint8Array(segA.length)
  const trails: Trail[] = []
  for (let s = 0; s < segA.length; s++) {
    if (used[s]) continue
    used[s] = 1
    const keys = [segA[s]!, segB[s]!]
    // Extend from the tail, then from the head, so the whole line is collected in one pass.
    for (const forward of [true, false]) {
      let cursor = forward ? keys[keys.length - 1]! : keys[0]!
      for (;;) {
        const next = (touching.get(cursor) ?? []).find((n) => !used[n])
        if (next === undefined) break
        used[next] = 1
        const a = segA[next]!
        const other = a === cursor ? segB[next]! : a
        if (forward) keys.push(other)
        else keys.unshift(other)
        cursor = other
      }
    }
    const closed = keys.length > 2 && keys[0] === keys[keys.length - 1]
    if (closed) keys.pop()
    trails.push({ points: keys.map((k) => at.get(k)!), closed })
  }
  return trails
}

/**
 * Contour lines every `interval` metres, lowest first. Levels are rounded to the interval, as a
 * printed map has them, and a level the ground never reaches produces nothing.
 */
export function contourLines(
  elevations: ArrayLike<number>,
  grid: GridSpec,
  interval: number,
): { rl: number; trails: Trail[] }[] {
  let min = Infinity
  let max = -Infinity
  for (let i = 0; i < elevations.length; i++) {
    const v = elevations[i]!
    if (!Number.isFinite(v)) continue
    if (v < min) min = v
    if (v > max) max = v
  }
  if (!Number.isFinite(min)) return []

  const out: { rl: number; trails: Trail[] }[] = []
  for (let rl = Math.ceil(min / interval) * interval; rl <= max; rl += interval) {
    const trails = traceAt(elevations, grid, rl)
    if (trails.length) out.push({ rl, trails })
  }
  return out
}
