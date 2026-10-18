import type { GridSpec, Vec2 } from '../domain/types'
import { cellCenter, indexOf } from '../geo/grid'
import {
  BASELINE_PIT,
  BENCH_HEIGHT_M,
  BERM_WIDTH_M,
  CHANGES,
  CURRENT_PIT,
  FACE_RUN_M,
  PLATEAU_RL,
  type PitShape,
} from './fixtures/scenario'
import { fbm } from './noise'
import { gaussian, mulberry32 } from './rng'

/*
 * Synthetic terrain for the fictional mine. Same seed, same surface, every time.
 * Nothing here is real survey data.
 */

/** Rolling plateau. Relief fades near the pit so the rim sits close to PLATEAU_RL. */
export function naturalGround(p: Vec2, seed: number): number {
  const broad = fbm(p.x / 900, p.y / 900, seed, 4) * 28
  const fine = fbm(p.x / 120, p.y / 120, seed + 7, 3) * 1.5
  const toPit = Math.hypot(p.x - BASELINE_PIT.cx, p.y - BASELINE_PIT.cy)
  const calm = Math.min(1, Math.max(0, (toPit - 380) / 420))
  return PLATEAU_RL + (broad * calm * calm + fine)
}

/** Depth below the rim for a point `s` metres inside it: stepped benches with berms. */
export function benchDepth(s: number): number {
  const step = BERM_WIDTH_M + FACE_RUN_M
  const k = Math.floor(s / step)
  const into = s - k * step
  return (
    k * BENCH_HEIGHT_M + (into < FACE_RUN_M ? (into / FACE_RUN_M) * BENCH_HEIGHT_M : BENCH_HEIGHT_M)
  )
}

/** Ground level inside a pit, or Infinity where the point is outside the rim. */
export function pitSurface(p: Vec2, pit: PitShape): number {
  const dx = p.x - pit.cx
  const dy = p.y - pit.cy
  const r = Math.hypot(dx, dy)
  // Distance from the centre to the rim ellipse along this direction.
  const rim = r === 0 ? Math.min(pit.a, pit.b) : 1 / Math.hypot(dx / r / pit.a, dy / r / pit.b)
  const inside = rim - r
  if (inside <= 0) return Infinity
  return Math.max(pit.floorRL, PLATEAU_RL - benchDepth(inside))
}

const inBox = (p: Vec2, b: { x0: number; x1: number; y0: number; y1: number }) =>
  p.x >= b.x0 && p.x <= b.x1 && p.y >= b.y0 && p.y <= b.y1

/** Smooth mound profile: full height at the centre, zero at radius r. */
const mound = (p: Vec2, m: { cx: number; cy: number; r: number; height: number }) => {
  const d = Math.hypot(p.x - m.cx, p.y - m.cy) / m.r
  return d >= 1 ? 0 : m.height * 0.5 * (1 + Math.cos(Math.PI * d))
}

/** True ground level (no survey noise) for each epoch. */
export function trueSurface(p: Vec2, epoch: 'baseline' | 'current', seed: number): number {
  const ground = naturalGround(p, seed)
  if (epoch === 'baseline') return Math.min(ground, pitSurface(p, BASELINE_PIT))

  const c = CHANGES
  let z = Math.min(ground, pitSurface(p, CURRENT_PIT))
  if (inBox(p, c.encroachment)) z = Math.min(z, ground - c.encroachment.depth)
  if (Math.hypot(p.x - c.sump.cx, p.y - c.sump.cy) <= c.sump.r) {
    z = Math.min(z, CURRENT_PIT.floorRL - c.sump.depthBelowFloor)
  }
  if (inBox(p, c.bufferScrape)) z = Math.min(z, ground - c.bufferScrape.depth)
  return z + mound(p, c.strayDump) + mound(p, c.zoneDump)
}

/**
 * Elevation grid for one epoch, with independent Gaussian survey noise of `sigma`
 * metres per cell. Noise uses its own seed per epoch so the two surveys differ only
 * by real change plus noise, as two real surveys would.
 */
export function buildSurface(
  grid: GridSpec,
  epoch: 'baseline' | 'current',
  seed: number,
  sigma: number,
): Float32Array {
  const out = new Float32Array(grid.cols * grid.rows)
  const noise = gaussian(mulberry32(seed ^ (epoch === 'baseline' ? 0x1b5 : 0x2c7)))
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const p = cellCenter(grid, col, row)
      out[indexOf(grid, col, row)] = trueSurface(p, epoch, seed) + noise() * sigma
    }
  }
  return out
}
