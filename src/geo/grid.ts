import type { GridSpec, Vec2 } from '../domain/types'

export const cellCount = (g: GridSpec) => g.cols * g.rows
export const cellArea = (g: GridSpec) => g.cellSize * g.cellSize
export const indexOf = (g: GridSpec, col: number, row: number) => row * g.cols + col

/** Plan extent covered by cell centres: [min, max] in each axis. */
export const extent = (g: GridSpec) => ({
  min: { x: g.originXY.x, y: g.originXY.y },
  max: {
    x: g.originXY.x + (g.cols - 1) * g.cellSize,
    y: g.originXY.y + (g.rows - 1) * g.cellSize,
  },
})

export function cellCenter(g: GridSpec, col: number, row: number): Vec2 {
  return { x: g.originXY.x + col * g.cellSize, y: g.originXY.y + row * g.cellSize }
}

export const centerOfIndex = (g: GridSpec, i: number) =>
  cellCenter(g, i % g.cols, Math.floor(i / g.cols))

/** Cell whose centre is nearest to the point, or null outside the grid. */
export function cellAt(g: GridSpec, p: Vec2): { col: number; row: number } | null {
  const col = Math.round((p.x - g.originXY.x) / g.cellSize)
  const row = Math.round((p.y - g.originXY.y) / g.cellSize)
  if (col < 0 || row < 0 || col >= g.cols || row >= g.rows) return null
  return { col, row }
}

/** Bilinear elevation between cell centres, or null outside the grid. */
export function sampleBilinear(g: GridSpec, values: Float32Array, p: Vec2): number | null {
  const fx = (p.x - g.originXY.x) / g.cellSize
  const fy = (p.y - g.originXY.y) / g.cellSize
  if (fx < 0 || fy < 0 || fx > g.cols - 1 || fy > g.rows - 1) return null
  const c0 = Math.min(Math.floor(fx), g.cols - 2)
  const r0 = Math.min(Math.floor(fy), g.rows - 2)
  const tx = fx - c0
  const ty = fy - r0
  const v = (c: number, r: number) => values[indexOf(g, c, r)]
  const south = v(c0, r0) * (1 - tx) + v(c0 + 1, r0) * tx
  const north = v(c0, r0 + 1) * (1 - tx) + v(c0 + 1, r0 + 1) * tx
  return south * (1 - ty) + north * ty
}

/** Σ|value| × cell area over the masked cells, m³. */
export function volumeOf(g: GridSpec, values: Float32Array, cells: Iterable<number>): number {
  let s = 0
  for (const i of cells) s += Math.abs(values[i])
  return s * cellArea(g)
}
