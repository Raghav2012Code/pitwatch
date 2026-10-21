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
  /** Spacing between samples, metres. */
  step: number
  /** True when the line was too long for the half-cell step and had to be sampled more coarsely. */
  limited: boolean
}

/**
 * Upper bound on the samples one profile may build. A line of any length is sampled at most this
 * many times, so a mistyped coordinate cannot ask for an unbounded amount of work.
 */
export const MAX_PROFILE_SAMPLES = 2000

/**
 * Elevation along the straight line a→b, sampled every half cell, for each layer on the
 * grid (e.g. baseline and current surveys). Bilinear between cell centres.
 *
 * A line longer than the cap can produce is sampled more coarsely: `step` says how far apart the
 * samples are and `limited` says the half-cell spacing was not kept.
 */
export function profileAlong(g: GridSpec, a: Vec2, b: Vec2, ...layers: Float32Array[]): Profile {
  const length = Math.hypot(b.x - a.x, b.y - a.y)
  const wanted = Math.max(1, Math.ceil(length / (g.cellSize / 2)))
  const n = Math.min(wanted, MAX_PROFILE_SAMPLES)
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
  return { length, d, points, series, step: length / n, limited: wanted > n }
}
