import type { GridSpec, Vec2 } from '../domain/types'
import { extent } from '../geo/grid'
import { rampAt, srgbToLinear } from './palette'

/*
 * Pure array builders for the terrain mesh, so they can be unit-tested without WebGL.
 *
 * Scene axes (three.js is Y-up): scene x = local X (east), scene y = RL − BASE_RL,
 * scene z = −local Y (north is −z). Vertical exaggeration is applied later as a
 * y-scale on the mesh, so geometry is built once.
 */

/** Elevation that maps to scene y = 0. Keeps vertex numbers small. */
export const BASE_RL = 400
/** Bottom of the block diagram sides. */
export const SKIRT_RL = 235

export const gridCentre = (g: GridSpec): Vec2 => {
  const e = extent(g)
  return { x: (e.min.x + e.max.x) / 2, y: (e.min.y + e.max.y) / 2 }
}

/** Local plan position + RL to unscaled scene coordinates. */
export function toScene(g: GridSpec, p: Vec2, rl: number): [number, number, number] {
  const c = gridCentre(g)
  return [p.x - c.x, rl - BASE_RL, -(p.y - c.y)]
}

/** Scene x/z back to local plan position. */
export function fromScene(g: GridSpec, x: number, z: number): Vec2 {
  const c = gridCentre(g)
  return { x: x + c.x, y: -z + c.y }
}

export function elevationRange(values: Float32Array) {
  let min = Infinity
  let max = -Infinity
  for (const v of values) {
    if (v < min) min = v
    if (v > max) max = v
  }
  return { min, max }
}

/**
 * Maps elevation to a position on the tint ramp. Half linear, half by rank (histogram
 * equalised): a purely linear ramp spends most of its colours on the pit and leaves the
 * plateau, where most of the ground is, one flat colour.
 */
export interface ElevationScale {
  min: number
  max: number
  /** Ramp position 0–1 for an elevation. */
  t(z: number): number
  /** Elevation at ramp position t (inverse of `t`). */
  at(t: number): number
}

export function elevationScale(values: Float32Array): ElevationScale {
  const sorted = Float32Array.from(values).sort()
  const n = sorted.length
  const min = sorted[0]
  const max = sorted[n - 1]
  const span = max - min || 1
  const KNOTS = 128
  const knots = Array.from(
    { length: KNOTS + 1 },
    (_, k) => sorted[Math.round((k / KNOTS) * (n - 1))],
  )
  const rank = (z: number) => {
    if (z <= min) return 0
    if (z >= max) return 1
    let lo = 0
    let hi = KNOTS
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (knots[mid] <= z) lo = mid
      else hi = mid
    }
    const gap = knots[hi] - knots[lo]
    return (lo + (gap > 0 ? (z - knots[lo]) / gap : 0)) / KNOTS
  }
  const t = (z: number) => 0.5 * Math.min(1, Math.max(0, (z - min) / span)) + 0.5 * rank(z)
  const at = (target: number) => {
    let lo = min
    let hi = max
    for (let k = 0; k < 40; k++) {
      const mid = (lo + hi) / 2
      if (t(mid) < target) lo = mid
      else hi = mid
    }
    return (lo + hi) / 2
  }
  return { min, max, t, at }
}

export interface TerrainArrays {
  positions: Float32Array
  colors: Float32Array
  /** 0–1 across the grid extent; v = 0 on the southern edge, matching the orthophoto rows. */
  uvs: Float32Array
  index: Uint32Array
}

/** Vertices at cell centres, two upward-facing triangles per grid square, tinted by height. */
export function buildTerrainArrays(
  g: GridSpec,
  elevations: Float32Array,
  scale = elevationScale(elevations),
): TerrainArrays {
  const n = g.cols * g.rows
  const positions = new Float32Array(n * 3)
  const colors = new Float32Array(n * 3)
  const uvs = new Float32Array(n * 2)
  const c = gridCentre(g)

  for (let row = 0; row < g.rows; row++) {
    for (let col = 0; col < g.cols; col++) {
      const i = row * g.cols + col
      const rl = elevations[i]
      positions[i * 3] = g.originXY.x + col * g.cellSize - c.x
      positions[i * 3 + 1] = rl - BASE_RL
      positions[i * 3 + 2] = -(g.originXY.y + row * g.cellSize - c.y)
      const rgb = rampAt(scale.t(rl))
      colors[i * 3] = srgbToLinear(rgb[0])
      colors[i * 3 + 1] = srgbToLinear(rgb[1])
      colors[i * 3 + 2] = srgbToLinear(rgb[2])
      uvs[i * 2] = col / (g.cols - 1)
      uvs[i * 2 + 1] = row / (g.rows - 1)
    }
  }

  const index = new Uint32Array((g.cols - 1) * (g.rows - 1) * 6)
  let k = 0
  for (let row = 0; row < g.rows - 1; row++) {
    for (let col = 0; col < g.cols - 1; col++) {
      const a = row * g.cols + col
      const b = a + 1
      const north = a + g.cols
      const ne = north + 1
      // Counter-clockwise seen from above, so normals point up (+y).
      index.set([a, b, north, b, ne, north], k)
      k += 6
    }
  }
  return { positions, colors, uvs, index }
}

/**
 * Vertical sides of the block: one strip per grid edge, from the terrain down to SKIRT_RL.
 * `tops` holds the surface RL above each vertex so the shader can paint a soil profile
 * by depth below ground.
 */
export function buildSkirtArrays(g: GridSpec, elevations: Float32Array) {
  const edges: number[][] = [
    Array.from({ length: g.cols }, (_, c) => c), // south
    Array.from({ length: g.rows }, (_, r) => r * g.cols + g.cols - 1), // east
    Array.from({ length: g.cols }, (_, c) => (g.rows - 1) * g.cols + (g.cols - 1 - c)), // north
    Array.from({ length: g.rows }, (_, r) => (g.rows - 1 - r) * g.cols), // west
  ]
  const verts = edges.reduce((s, e) => s + e.length * 2, 0)
  const positions = new Float32Array(verts * 3)
  const tops = new Float32Array(verts)
  const index: number[] = []
  const c = gridCentre(g)
  let v = 0

  for (const edge of edges) {
    const start = v
    for (const i of edge) {
      const x = g.originXY.x + (i % g.cols) * g.cellSize - c.x
      const z = -(g.originXY.y + Math.floor(i / g.cols) * g.cellSize - c.y)
      positions.set([x, elevations[i] - BASE_RL, z, x, SKIRT_RL - BASE_RL, z], v * 3)
      tops[v] = tops[v + 1] = elevations[i]
      v += 2
    }
    for (let j = 0; j < edge.length - 1; j++) {
      const top = start + j * 2
      index.push(top, top + 1, top + 2, top + 1, top + 3, top + 2)
    }
  }
  return { positions, tops, index: Uint32Array.from(index) }
}
