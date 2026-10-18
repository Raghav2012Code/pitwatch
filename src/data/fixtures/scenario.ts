import type {
  DumpZone,
  GridSpec,
  Mine,
  PermittedLimits,
  PitZone,
  Polygon,
} from '../../domain/types'
import { mulberry32 } from '../rng'
import { MINE_INFO } from './mine'

/*
 * Geometry of the fictional Venthar Ridge scenario. All local metres (X east, Y north).
 * The grid covers 0..2048 m in both directions. Every value here is synthetic.
 */

export const SEED = 20251114

export const GRID: GridSpec = { cols: 257, rows: 257, cellSize: 8, originXY: { x: 0, y: 0 } }

/** Lease boundary. The east edge at x ≈ 1380 m runs close to the pit on purpose. */
export const LEASE: Polygon = [
  { x: 240, y: 220 },
  { x: 1640, y: 240 },
  { x: 1660, y: 800 },
  { x: 1380, y: 880 },
  { x: 1385, y: 1320 },
  { x: 1560, y: 1560 },
  { x: 1180, y: 1500 },
  { x: 300, y: 1560 },
]

export const SAFETY_BUFFER_M = 20

/**
 * Natural ground level the pit is cut from (plateau, RL m). Deliberately not a multiple
 * of the 5 m contour interval, so flat berms and the floor sit between contour levels.
 */
export const PLATEAU_RL = 422
export const BENCH_HEIGHT_M = 15
export const BERM_WIDTH_M = 8
/** Horizontal run of one bench face (≈ 59° face angle; overall wall ≈ 41°). */
export const FACE_RUN_M = 9

/**
 * One pit stage: a rim outline (anticlockwise, rounded off before use) and a flat floor.
 * Benches step down from the rim parallel to the outline until they reach the floor.
 */
export interface PitStage {
  outline: Polygon
  floorRL: number
}

const pts = (xy: readonly [number, number][]): Polygon => xy.map(([x, y]) => ({ x, y }))

/**
 * Random pit outline from a seed: a closed blob with a few low-frequency bulges (the way
 * a pit follows an irregular orebody), stretched to fill `box`. Same seed, same outline.
 */
export function randomOutline(
  seed: number,
  box: { x0: number; x1: number; y0: number; y1: number },
  points = 24,
): Polygon {
  const rand = mulberry32(seed)
  const terms = [2, 3, 4, 5, 7].map((k) => ({
    k,
    amp: (0.1 + 0.14 * rand()) / k ** 0.7,
    phase: rand() * 2 * Math.PI,
  }))
  const raw = Array.from({ length: points }, (_, i) => {
    const theta = (i / points) * 2 * Math.PI
    const r = 1 + terms.reduce((sum, t) => sum + t.amp * Math.sin(t.k * theta + t.phase), 0)
    return { x: r * Math.cos(theta), y: r * Math.sin(theta) }
  })
  const xs = raw.map((p) => p.x)
  const ys = raw.map((p) => p.y)
  const [minX, maxX, minY, maxY] = [
    Math.min(...xs),
    Math.max(...xs),
    Math.min(...ys),
    Math.max(...ys),
  ]
  return raw.map((p) => ({
    x: box.x0 + ((p.x - minX) / (maxX - minX)) * (box.x1 - box.x0),
    y: box.y0 + ((p.y - minY) / (maxY - minY)) * (box.y1 - box.y0),
  }))
}

/** Seed for the pit outline, separate from the terrain noise. */
export const PIT_SEED = SEED + 101

/**
 * Main pit now: random outline (anticlockwise) inside the lease, 150 m deep, floor 2 m
 * above the approved floor. The east wall stops at x = 1320, clear of the lease buffer.
 */
export const CURRENT_PIT: PitStage = {
  floorRL: 272,
  outline: randomOutline(PIT_SEED, { x0: 640, x1: 1320, y0: 790, y1: 1270 }),
}

/**
 * Main pit at the baseline survey: the same pit before its west wall was pushed back
 * (about 75 m at the far west) and before the last bench was mined.
 */
export const BASELINE_PIT: PitStage = {
  floorRL: 287,
  outline: CURRENT_PIT.outline.map((p) => ({
    x: p.x < 960 ? p.x + (960 - p.x) * 0.23 : p.x,
    y: 1030 + (p.y - 1030) * 0.94,
  })),
}

export const PIT_ZONE: PitZone = {
  id: 'pit-main',
  polygon: [
    { x: 560, y: 700 },
    { x: 1370, y: 700 },
    { x: 1370, y: 1360 },
    { x: 560, y: 1360 },
  ],
  approvedFloorElevation: 270,
}

export const DUMP_ZONE: DumpZone = {
  id: 'dump-west',
  polygon: [
    { x: 380, y: 380 },
    { x: 700, y: 380 },
    { x: 700, y: 640 },
    { x: 380, y: 640 },
  ],
}

/*
 * Changes planted in the current survey. Each one exists to exercise a rule.
 *   encroachment  R1 violation: a cut lobe that crosses the east lease edge.
 *   sump          R2 violation: a pit below the approved floor.
 *   bufferScrape  R1 warning: a shallow cut inside the safety buffer, not outside the lease.
 *   strayDump     R3 warning: waste placed outside the dump zone.
 *   zoneDump      no finding: waste placed inside the dump zone.
 */
export const CHANGES = {
  /** Pushback of the east wall, benched down into the pit, that runs past the lease edge (x ≈ 1382 here). */
  encroachment: {
    floorRL: 332,
    outline: pts([
      [1240, 900],
      [1330, 905],
      [1410, 950],
      [1448, 1030],
      [1415, 1110],
      [1330, 1150],
      [1240, 1140],
      [1200, 1020],
    ]),
  } satisfies PitStage,
  sump: { cx: 960, cy: 1020, r: 22, depthBelowFloor: 6 },
  bufferScrape: { x0: 900, x1: 1010, y0: 1500, y1: 1510, depth: 1.2 },
  /** A cluster of truck-tipped heaps around (cx, cy). */
  strayDump: { cx: 1520, cy: 480, r: 45, height: 4 },
  /** The terraced west dump grows taller and wider (see BASELINE_DUMP). */
  zoneDump: { cx: 540, cy: 510, r: 115, height: 10 },
} as const

/** Terraced waste dump that already exists in the baseline survey, inside the dump zone. */
export const BASELINE_DUMP = { cx: 530, cy: 505, r: 85, height: 5 } as const

/**
 * Haul ramp in the main pit: leaves the rim at the point nearest `start` (where the
 * haul road arrives) and runs anticlockwise down the wall at `grade` until the floor.
 */
export const RAMP = { start: { x: 980, y: 760 }, grade: 0.1, width: 30 } as const

/** Crest line of Venthar Ridge, north of the lease (local metres). */
export const RIDGE: readonly [number, number][] = [
  [-150, 1640],
  [400, 1790],
  [900, 1860],
  [1400, 1800],
  [2200, 1910],
]

/** Dry creek bed east of the lease, draining south. */
export const CREEK: readonly [number, number][] = [
  [2200, 1200],
  [1850, 930],
  [1735, 640],
  [1770, 320],
  [1690, -150],
]

/**
 * Haul roads on the plateau (local metres). They only appear in the simulated aerial
 * image; on the ground they are flat enough not to matter at survey resolution.
 */
export const ROADS: readonly (readonly [number, number][])[] = [
  [
    [980, 790],
    [985, 745],
    [1010, 640],
    [880, 560],
    [700, 520],
    [600, 500],
  ],
  [
    [1010, 640],
    [1120, 420],
    [1180, 0],
  ],
  [
    [1120, 420],
    [1330, 450],
    [1500, 470],
  ],
]

export const SURVEY_SIGMA_M = { baseline: 0.05, current: 0.05 } as const

export const LIMITS: PermittedLimits = {
  leaseBoundary: LEASE,
  safetyBufferMetres: SAFETY_BUFFER_M,
  pitZones: [PIT_ZONE],
  maxPitDepth: PLATEAU_RL - PIT_ZONE.approvedFloorElevation,
  dumpZones: [DUMP_ZONE],
}

export const MINE: Mine = {
  ...MINE_INFO,
  leaseBoundary: LEASE,
  approvedZones: [
    { id: PIT_ZONE.id, name: 'Main pit', kind: 'pit', polygon: PIT_ZONE.polygon },
    { id: DUMP_ZONE.id, name: 'West waste dump', kind: 'dump', polygon: DUMP_ZONE.polygon },
  ],
  metadata: {
    benchHeight: `${BENCH_HEIGHT_M} m`,
    bermWidth: `${BERM_WIDTH_M} m`,
    grid: `${GRID.cols} × ${GRID.rows} cells at ${GRID.cellSize} m`,
  },
}
