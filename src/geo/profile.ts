import type { GridSpec, Vec2 } from '../domain/types'
import { sampleBilinear } from './grid'

export interface Profile {
  /** Plan length of the line, metres. */
  length: number
  /** Distance along the line of each sample. */
  d: number[]
  points: Vec2[]
  /** One array per input layer, NaN where the line leaves the grid. */
  series: number[][]
}

/**
 * Elevation along the straight line a→b, sampled every half cell, for each layer on the
 * grid (e.g. baseline and current surveys). Bilinear between cell centres.
 */
export function profileAlong(g: GridSpec, a: Vec2, b: Vec2, ...layers: Float32Array[]): Profile {
  const length = Math.hypot(b.x - a.x, b.y - a.y)
  const n = Math.max(1, Math.ceil(length / (g.cellSize / 2)))
  const d: number[] = []
  const points: Vec2[] = []
  const series = layers.map(() => [] as number[])
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
    d.push(length * t)
    points.push(p)
    layers.forEach((v, k) => series[k].push(sampleBilinear(g, v, p) ?? NaN))
  }
  return { length, d, points, series }
}
