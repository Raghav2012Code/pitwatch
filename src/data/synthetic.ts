import type { GridSpec, Vec2 } from '../domain/types'
import { cellCenter, indexOf } from '../geo/grid'
import {
  BASELINE_DUMP,
  BASELINE_PIT,
  BENCH_HEIGHT_M,
  BERM_WIDTH_M,
  CHANGES,
  CURRENT_PIT,
  FACE_RUN_M,
  PLATEAU_RL,
  RAMP,
  type PitShape,
} from './fixtures/scenario'
import { fbm } from './noise'
import { gaussian, mulberry32 } from './rng'

/*
 * Synthetic terrain for the fictional mine. Same seed, same surface, every time.
 * Nothing here is real survey data.
 */

/**
 * Plateau with natural-looking relief: domain-warped hills (so slopes wander instead of
 * forming round blobs), soft ridgelines and small-scale roughness. Relief fades near the
 * pit so the rim sits close to PLATEAU_RL.
 */
export function naturalGround(p: Vec2, seed: number): number {
  const wx = p.x / 1000 + 0.6 * fbm(p.x / 800 + 3.1, p.y / 800 - 1.7, seed + 11, 3)
  const wy = p.y / 1000 + 0.6 * fbm(p.x / 800 - 4.3, p.y / 800 + 2.9, seed + 13, 3)
  const broad = fbm(wx, wy, seed, 5) * 30
  const ridge = (1 - Math.abs(fbm(p.x / 450, p.y / 450, seed + 21, 4))) ** 2 * 9 - 4
  const fine = fbm(p.x / 90, p.y / 90, seed + 7, 3) * 1.2
  const toPit = Math.hypot(p.x - BASELINE_PIT.cx, p.y - BASELINE_PIT.cy)
  const calm = Math.min(1, Math.max(0, (toPit - 380) / 420))
  return PLATEAU_RL + (broad + ridge) * calm * calm + fine
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

/**
 * Irregularity of the pit outline as a fraction of radius, by direction. Phases are
 * chosen so the east wall stays well clear of the lease buffer.
 */
export const rimWobble = (theta: number) =>
  0.03 * Math.sin(3 * theta - 2.2) +
  0.02 * Math.sin(5 * theta - 0.5) +
  0.012 * Math.sin(8 * theta + 1.3)

/** Distance from the pit centre to its rim in the direction of `p`. */
export function rimRadius(p: Vec2, pit: PitShape): number {
  const dx = p.x - pit.cx
  const dy = p.y - pit.cy
  const r = Math.hypot(dx, dy)
  const ellipse = r === 0 ? Math.min(pit.a, pit.b) : 1 / Math.hypot(dx / r / pit.a, dy / r / pit.b)
  return ellipse * (1 + rimWobble(Math.atan2(dy, dx)))
}

/** Metres inside the rim (negative outside). */
export const insidePit = (p: Vec2, pit: PitShape) =>
  rimRadius(p, pit) - Math.hypot(p.x - pit.cx, p.y - pit.cy)

/**
 * Depth of the haul ramp where it crosses the direction of `p`, or null once the ramp
 * has reached the floor. The ramp drops `grade` metres per metre travelled.
 */
function rampDepth(p: Vec2, pit: PitShape, rim: number): number | null {
  const theta = Math.atan2(p.y - pit.cy, p.x - pit.cx)
  const turned = (((theta - RAMP.startAngle) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
  const depth = turned * rim * 0.85 * RAMP.grade
  return depth <= PLATEAU_RL - pit.floorRL ? depth : null
}

/** Ground level inside a pit, or Infinity where the point is outside the rim. */
export function pitSurface(p: Vec2, pit: PitShape): number {
  const rim = rimRadius(p, pit)
  const inside = rim - Math.hypot(p.x - pit.cx, p.y - pit.cy)
  if (inside <= 0) return Infinity

  // The ramp is a flat shelf cut across the benches, about as far in as its depth needs.
  const ramp = rampDepth(p, pit, rim)
  if (ramp !== null) {
    const centre = (ramp * (BERM_WIDTH_M + FACE_RUN_M)) / BENCH_HEIGHT_M + RAMP.width / 2
    if (Math.abs(inside - centre) < RAMP.width / 2) return Math.max(pit.floorRL, PLATEAU_RL - ramp)
  }
  return Math.max(pit.floorRL, PLATEAU_RL - benchDepth(inside))
}

const inBox = (p: Vec2, b: { x0: number; x1: number; y0: number; y1: number }) =>
  p.x >= b.x0 && p.x <= b.x1 && p.y >= b.y0 && p.y <= b.y1

type Heap = { cx: number; cy: number; r: number; height: number }

/** Rounded heap: full height at the centre, zero at radius r. */
const mound = (p: Vec2, m: Heap) => {
  const d = Math.hypot(p.x - m.cx, p.y - m.cy) / m.r
  return d >= 1 ? 0 : m.height * 0.5 * (1 + Math.cos(Math.PI * d))
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** Flat-topped waste dump with a berm part way down its batter and an irregular footprint. */
export function terracedDump(p: Vec2, m: Heap): number {
  const theta = Math.atan2(p.y - m.cy, p.x - m.cx)
  const d = Math.hypot(p.x - m.cx, p.y - m.cy) / (m.r * (1 + 0.6 * rimWobble(theta + 1)))
  const upper = 1 - smoothstep(0.48, 0.66, d)
  const lower = 1 - smoothstep(0.76, 1, d)
  return m.height * (0.5 * upper + 0.5 * lower)
}

/** Loads tipped off trucks: one heap at the centre and a loose ring around it. */
const TIP_OFFSETS: readonly [number, number][] = [
  [0, 0],
  [24, 6],
  [-20, 15],
  [8, -26],
  [-26, -14],
  [30, -20],
  [-6, 30],
]
const tippedHeaps = (p: Vec2, m: Heap) =>
  TIP_OFFSETS.reduce(
    (z, [ox, oy]) =>
      Math.max(z, mound(p, { cx: m.cx + ox, cy: m.cy + oy, r: 12, height: m.height })),
    0,
  )

/** True ground level (no survey noise) for each epoch. */
export function trueSurface(
  p: Vec2,
  epoch: 'baseline' | 'current',
  seed: number,
  ground = naturalGround(p, seed),
): number {
  if (epoch === 'baseline') {
    return Math.min(ground, pitSurface(p, BASELINE_PIT)) + terracedDump(p, BASELINE_DUMP)
  }

  const c = CHANGES
  let z = Math.min(ground, pitSurface(p, CURRENT_PIT))
  if (inBox(p, c.encroachment)) z = Math.min(z, ground - c.encroachment.depth)
  if (Math.hypot(p.x - c.sump.cx, p.y - c.sump.cy) <= c.sump.r) {
    z = Math.min(z, CURRENT_PIT.floorRL - c.sump.depthBelowFloor)
  }
  if (inBox(p, c.bufferScrape)) z = Math.min(z, ground - c.bufferScrape.depth)
  return z + tippedHeaps(p, c.strayDump) + terracedDump(p, c.zoneDump)
}

/** Original ground level at every cell centre. The same for both epochs, so build it once. */
export function naturalField(grid: GridSpec, seed: number): Float32Array {
  const out = new Float32Array(grid.cols * grid.rows)
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      out[indexOf(grid, col, row)] = naturalGround(cellCenter(grid, col, row), seed)
    }
  }
  return out
}

/** Sub-sample offsets (metres) used to area-average each cell, as gridding a survey does. */
const SUBSAMPLES: readonly [number, number][] = [
  [-2, -2],
  [2, -2],
  [-2, 2],
  [2, 2],
]

/**
 * Elevation grid for one epoch, with independent Gaussian survey noise of `sigma`
 * metres per cell. Each cell is the mean of four sub-samples, so bench edges are
 * smoothed the way a real survey resampled to the grid would be. Noise uses its own seed per epoch so the two surveys differ only
 * by real change plus noise, as two real surveys would.
 */
export function buildSurface(
  grid: GridSpec,
  epoch: 'baseline' | 'current',
  seed: number,
  sigma: number,
  natural = naturalField(grid, seed),
): Float32Array {
  const out = new Float32Array(grid.cols * grid.rows)
  const noise = gaussian(mulberry32(seed ^ (epoch === 'baseline' ? 0x1b5 : 0x2c7)))
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const i = indexOf(grid, col, row)
      const c = cellCenter(grid, col, row)
      let sum = 0
      for (const [ox, oy] of SUBSAMPLES) {
        sum += trueSurface({ x: c.x + ox, y: c.y + oy }, epoch, seed, natural[i])
      }
      out[i] = sum / SUBSAMPLES.length + noise() * sigma
    }
  }
  return out
}
