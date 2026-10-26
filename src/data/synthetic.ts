import type { GridSpec, Polygon, Vec2 } from '../domain/types'
import { cellCenter, indexOf } from '../geo/grid'
import { centroidOf, distanceToBoundary, distanceToSegment, pointInPolygon } from '../geo/polygon'
import {
  BASELINE_DUMP,
  BASELINE_DUMP_B,
  BASELINE_PIT,
  BASELINE_PIT_B,
  BENCH_HEIGHT_M,
  BERM_WIDTH_M,
  CHANGES,
  CREEK,
  CURRENT_PIT,
  CURRENT_PIT_B,
  FACE_RUN_M,
  PLATEAU_RL,
  POND,
  RAMP,
  RIDGE,
  RISES,
  SEED,
  type PitStage,
} from './fixtures/scenario'
import { fbm } from './noise'
import { gaussian, mulberry32 } from './rng'

/*
 * Synthetic terrain for the fictional mine. Same seed, same surface, every time.
 * Nothing here is real survey data.
 */

/** Rough centres of the two workings; natural relief is calmed near them. */
const PIT_CENTRE = { x: 875, y: 1020 }
const SATELLITE_CENTRE = { x: 910, y: 445 }

function distanceToLine(p: Vec2, line: readonly (readonly [number, number])[]): number {
  let d = Infinity
  for (let k = 1; k < line.length; k++) {
    const [ax, ay] = line[k - 1]
    const [bx, by] = line[k]
    d = Math.min(d, distanceToSegment(p, { x: ax, y: ay }, { x: bx, y: by }))
  }
  return d
}

/** Distance to the dry creek bed. Warped so the channel meanders instead of running straight. */
export function creekDistance(p: Vec2, seed: number): number {
  const q = {
    x: p.x + 55 * fbm(p.x / 260 + 7.7, p.y / 260, seed + 61, 3),
    y: p.y + 55 * fbm(p.x / 260, p.y / 260 - 5.1, seed + 67, 3),
  }
  return distanceToLine(q, CREEK)
}

/**
 * Natural ground: domain-warped hills (slopes wander instead of forming round blobs),
 * Venthar Ridge rising to the north, a dry creek in the east,
 * and small-scale roughness. Relief from the hills fades near the pit so the rim sits
 * close to PLATEAU_RL.
 */
export function naturalGround(p: Vec2, seed: number): number {
  const wx = p.x / 1000 + 0.6 * fbm(p.x / 800 + 3.1, p.y / 800 - 1.7, seed + 11, 3)
  const wy = p.y / 1000 + 0.6 * fbm(p.x / 800 - 4.3, p.y / 800 + 2.9, seed + 13, 3)
  const broad = fbm(wx, wy, seed, 5) * 24
  const crest = (1 - Math.abs(fbm(p.x / 450, p.y / 450, seed + 21, 4))) ** 2 * 8 - 4
  const toPit = Math.hypot(p.x - PIT_CENTRE.x, p.y - PIT_CENTRE.y)
  const toSatellite = Math.hypot(p.x - SATELLITE_CENTRE.x, p.y - SATELLITE_CENTRE.y)
  const calm =
    Math.min(
      Math.min(1, Math.max(0, (toPit - 560) / 480)),
      Math.min(1, Math.max(0, (toSatellite - 230) / 300)),
    ) ** 2

  // The ridge: its height varies along the crest.
  const q = { x: p.x + 70 * fbm(p.x / 500, p.y / 500 + 9.3, seed + 71, 3), y: p.y }
  const toRidge = distanceToLine(q, RIDGE)
  const crestHeight = 34 + 14 * fbm(p.x / 600, 4.2, seed + 73, 3)
  const ridge = crestHeight * Math.exp(-((toRidge / 260) ** 2))

  // Broad rises on the plateau.
  const rises = RISES.reduce(
    (sum, r) => sum + r.h * Math.exp(-(((p.x - r.cx) ** 2 + (p.y - r.cy) ** 2) / r.r ** 2)),
    0,
  )

  // Dry creek: a shallow channel with soft banks, and a wider, shallower floodplain.
  const toCreek = creekDistance(p, seed)
  const creek = -3.5 * (1 - smoothstep(6, 30, toCreek)) - 2 * (1 - smoothstep(30, 150, toCreek))

  const fine = fbm(p.x / 90, p.y / 90, seed + 7, 3) * 1.2
  return PLATEAU_RL + (broad + crest) * calm + ridge + rises + creek + fine
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

/** Small wobble by direction, roughens dump footprints. */
const wobble = (theta: number) =>
  0.03 * Math.sin(3 * theta - 2.2) +
  0.02 * Math.sin(5 * theta - 0.5) +
  0.012 * Math.sin(8 * theta + 1.3)

/** Chaikin corner cutting: rounds a closed outline the way a rim is blasted back. */
export function roundOutline(poly: Polygon, passes = 3): Polygon {
  let out = poly
  for (let k = 0; k < passes; k++) {
    out = out.flatMap((a, i) => {
      const b = out[(i + 1) % out.length]
      return [
        { x: 0.75 * a.x + 0.25 * b.x, y: 0.75 * a.y + 0.25 * b.y },
        { x: 0.25 * a.x + 0.75 * b.x, y: 0.25 * a.y + 0.75 * b.y },
      ]
    })
  }
  return out
}

/** Haul ramp centreline with the depth below the rim at each point. */
export interface Ramp {
  points: Vec2[]
  depth: number[]
}

/** A pit stage ready to sample: rounded rim, bounding box, optional ramp. */
export interface Pit {
  rim: Polygon
  floorRL: number
  box: { x0: number; x1: number; y0: number; y1: number }
  ramp?: Ramp
}

/** Horizontal distance a bench profile needs to reach `depth` (overall slope). */
const insetFor = (depth: number) => (depth * (BERM_WIDTH_M + FACE_RUN_M)) / BENCH_HEIGHT_M

/**
 * Walk the rim anticlockwise from the point nearest RAMP.start, keeping the ramp as far
 * inside the wall as its depth requires, until it reaches the floor.
 */
function buildRamp(rim: Polygon, floorRL: number, start: Vec2): Ramp {
  const n = rim.length
  let k0 = 0
  for (let k = 1; k < n; k++) {
    if (
      Math.hypot(rim[k].x - start.x, rim[k].y - start.y) <
      Math.hypot(rim[k0].x - start.x, rim[k0].y - start.y)
    )
      k0 = k
  }
  const maxDepth = PLATEAU_RL - floorRL
  const points: Vec2[] = []
  const depth: number[] = []
  let d = 0
  // A deep pit needs more than one lap; each lap sits further in than the last.
  for (let j = 0; j < 3 * n && d < maxDepth; j++) {
    const prev = rim[(k0 + j - 1 + n) % n]
    const a = rim[(k0 + j) % n]
    const next = rim[(k0 + j + 1) % n]
    // Anticlockwise outline: the inside is to the left of the direction of travel.
    const tx = next.x - prev.x
    const ty = next.y - prev.y
    const len = Math.hypot(tx, ty) || 1
    const inset = insetFor(d) + RAMP.width / 2
    const p = { x: a.x - (ty / len) * inset, y: a.y + (tx / len) * inset }
    // Where the pit narrows, a deep offset folds back across the middle; end the ramp there.
    if (distanceToBoundary(p, rim) < inset * 0.75) break
    const last = points[points.length - 1]
    if (last) d = Math.min(maxDepth, d + Math.hypot(p.x - last.x, p.y - last.y) * RAMP.grade)
    points.push(p)
    depth.push(d)
  }
  // If the wall ran out first, finish with a straight drop towards the middle of the
  // floor, steepened if needed so it lands on the floor.
  const target = centroidOf(rim)
  const end = points[points.length - 1]
  const run = Math.hypot(target.x - end.x, target.y - end.y) || 1
  const finalGrade = Math.max(RAMP.grade, (maxDepth - d) / run)
  for (let guard = 0; d < maxDepth && guard < 200; guard++) {
    const last = points[points.length - 1]
    const left = Math.hypot(target.x - last.x, target.y - last.y)
    if (left < 1) break
    const step = Math.min(10, left)
    const p = {
      x: last.x + ((target.x - last.x) / left) * step,
      y: last.y + ((target.y - last.y) / left) * step,
    }
    d = Math.min(maxDepth, d + step * finalGrade)
    points.push(p)
    depth.push(d)
  }
  return { points, depth }
}

export function preparePit(stage: PitStage, rampStart?: Vec2): Pit {
  const rim = roundOutline(stage.outline)
  const xs = rim.map((p) => p.x)
  const ys = rim.map((p) => p.y)
  return {
    rim,
    floorRL: stage.floorRL,
    box: {
      x0: Math.min(...xs),
      x1: Math.max(...xs),
      y0: Math.min(...ys),
      y1: Math.max(...ys),
    },
    ramp: rampStart ? buildRamp(rim, stage.floorRL, rampStart) : undefined,
  }
}

const PITS = {
  baseline: [preparePit(BASELINE_PIT, RAMP.start), preparePit(BASELINE_PIT_B, RAMP.startB)],
  current: [preparePit(CURRENT_PIT, RAMP.start), preparePit(CURRENT_PIT_B, RAMP.startB)],
  encroachment: preparePit(CHANGES.encroachment),
}

/** Pit stages present in each survey (the encroachment is a separate planted change). */
export const pitsOf = (epoch: 'baseline' | 'current'): readonly Pit[] =>
  epoch === 'baseline' ? PITS.baseline : [...PITS.current, PITS.encroachment]

/** Metres inside the rim (negative outside, -Infinity well outside the bounding box). */
export function insidePit(p: Vec2, pit: Pit): number {
  const b = pit.box
  if (p.x < b.x0 - 200 || p.x > b.x1 + 200 || p.y < b.y0 - 200 || p.y > b.y1 + 200) {
    return -Infinity
  }
  const d = distanceToBoundary(p, pit.rim)
  return pointInPolygon(p, pit.rim) ? d : -d
}

/** Nearest point on the ramp centreline: distance to it and the ramp depth there. */
function nearestOnRamp(p: Vec2, ramp: Ramp): { dist: number; depth: number } {
  let best = { dist: Infinity, depth: 0 }
  const { points, depth } = ramp
  for (let k = 1; k < points.length; k++) {
    const a = points[k - 1]
    const b = points[k]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len2 = dx * dx + dy * dy || 1
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2))
    const dist = Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy)
    if (dist < best.dist) best = { dist, depth: depth[k - 1] + (depth[k] - depth[k - 1]) * t }
  }
  return best
}

/** Distance to the haul ramp centreline (Infinity for a stage without one). */
export const rampDistance = (p: Vec2, pit: Pit) =>
  pit.ramp ? nearestOnRamp(p, pit.ramp).dist : Infinity

/** Ground level inside a pit, or Infinity where the point is outside the rim. */
export function pitSurface(p: Vec2, pit: Pit): number {
  const b = pit.box
  if (p.x < b.x0 || p.x > b.x1 || p.y < b.y0 || p.y > b.y1) return Infinity
  if (!pointInPolygon(p, pit.rim)) return Infinity
  // Blasting leaves crests and toes ragged: a few metres of wander, none at the rim itself.
  const edge = distanceToBoundary(p, pit.rim)
  const inside = edge + 2.4 * fbm(p.x / 28, p.y / 28, SEED + 91, 2) * Math.min(1, edge / 12)
  const benches = Math.max(pit.floorRL, PLATEAU_RL - benchDepth(Math.max(0, inside)))
  if (!pit.ramp) return benches

  // The ramp is a road cut and filled across the benches, with short batters each side.
  const r = nearestOnRamp(p, pit.ramp)
  const half = RAMP.width / 2
  if (r.dist >= half + 6) return benches
  const road = Math.max(pit.floorRL, PLATEAU_RL - r.depth)
  return benches + (road - benches) * (1 - smoothstep(half, half + 6, r.dist))
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
  // Lobed footprint: dumps grow by tipping along a few fronts, so they are never round.
  const lobes = 0.16 * Math.sin(2 * theta + 0.7) + 0.1 * Math.sin(3 * theta - 1.2)
  const d = Math.hypot(p.x - m.cx, p.y - m.cy) / (m.r * (1 + lobes + wobble(theta + 1)))
  const upper = 1 - smoothstep(0.48, 0.66, d)
  const lower = 1 - smoothstep(0.76, 1, d)
  return m.height * (0.5 * upper + 0.5 * lower)
}

/** Loads tipped off trucks: one heap at the centre and a loose ring around it. */
const TIP_OFFSETS: readonly [number, number][] = [
  [0, 0],
  [18, 5],
  [-15, 12],
  [6, -19],
  [-19, -10],
  [23, -15],
  [-4, 22],
]
const tippedHeaps = (p: Vec2, m: Heap) =>
  TIP_OFFSETS.reduce(
    (z, [ox, oy]) =>
      Math.max(z, mound(p, { cx: m.cx + ox, cy: m.cy + oy, r: 15, height: m.height })),
    0,
  )

/** Depth of the settling pond's bowl at a point (0 outside it). */
export function pondDepth(p: Vec2): number {
  const d = Math.hypot(p.x - POND.cx, p.y - POND.cy) / POND.r
  return d >= 1 ? 0 : POND.depth * 0.5 * (1 + Math.cos(Math.PI * d))
}

/** True ground level (no survey noise) for each epoch. */
export function trueSurface(
  p: Vec2,
  epoch: 'baseline' | 'current',
  seed: number,
  ground = naturalGround(p, seed),
): number {
  let z = ground
  for (const pit of pitsOf(epoch)) z = Math.min(z, pitSurface(p, pit))
  // The settling pond is a hollow in the ground in both surveys.
  z -= pondDepth(p)
  if (epoch === 'baseline')
    return z + terracedDump(p, BASELINE_DUMP) + terracedDump(p, BASELINE_DUMP_B)
  // Mining only removes rock: where the ramp now crosses old benches it is cut, never
  // built up above the earlier surface.
  for (const pit of pitsOf('baseline')) z = Math.min(z, pitSurface(p, pit))

  const c = CHANGES
  if (Math.hypot(p.x - c.sump.cx, p.y - c.sump.cy) <= c.sump.r) {
    z = Math.min(z, CURRENT_PIT.floorRL - c.sump.depthBelowFloor)
  }
  if (inBox(p, c.bufferScrape)) z = Math.min(z, ground - c.bufferScrape.depth)
  return (
    z + tippedHeaps(p, c.strayDump) + terracedDump(p, c.zoneDump) + terracedDump(p, c.zoneDumpB)
  )
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
const subsamplesFor = (cellSize: number): readonly [number, number][] => {
  const offset = cellSize / 4
  return [
    [-offset, -offset],
    [offset, -offset],
    [-offset, offset],
    [offset, offset],
  ]
}

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
  const subsamples = subsamplesFor(grid.cellSize)
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const i = indexOf(grid, col, row)
      const c = cellCenter(grid, col, row)
      let sum = 0
      for (const [ox, oy] of subsamples) {
        sum += trueSurface({ x: c.x + ox, y: c.y + oy }, epoch, seed, natural[i])
      }
      out[i] = sum / subsamples.length + noise() * sigma
    }
  }
  return out
}
