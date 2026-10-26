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

export const GRID: GridSpec = { cols: 513, rows: 513, cellSize: 4, originXY: { x: 0, y: 0 } }

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
 * Main pit now: random outline (anticlockwise) inside the lease, about 930 m long and 195 m
 * deep (13 benches), floor 2 m above the approved floor. The east wall stops at x = 1330,
 * clear of the lease buffer.
 */
export const CURRENT_PIT: PitStage = {
  floorRL: 242,
  outline: randomOutline(PIT_SEED, { x0: 420, x1: 1330, y0: 710, y1: 1330 }),
}

/**
 * Main pit at the baseline survey: the same pit before its west wall was pushed back
 * (about 75 m at the far west) and before the last bench was mined.
 */
export const BASELINE_PIT: PitStage = {
  floorRL: 257,
  outline: CURRENT_PIT.outline.map((p) => ({
    x: p.x < 700 ? p.x + (700 - p.x) * 0.23 : p.x,
    y: 1020 + (p.y - 1020) * 0.94,
  })),
}

/** Scale an outline about its centroid: permit zones follow the workings they cover. */
export const scaleAbout = (poly: Polygon, factor: number): Polygon => {
  const c = poly.reduce((a, p) => ({ x: a.x + p.x / poly.length, y: a.y + p.y / poly.length }), {
    x: 0,
    y: 0,
  })
  return poly.map((p) => ({ x: c.x + (p.x - c.x) * factor, y: c.y + (p.y - c.y) * factor }))
}

/** Rounded lobed footprint around a point, for a dump zone that follows the dump it covers. */
export const blobAround = (cx: number, cy: number, r: number, phase: number, n = 24): Polygon =>
  Array.from({ length: n }, (_, i) => {
    const t = (i / n) * 2 * Math.PI
    const rr = r * (1 + 0.07 * Math.sin(2 * t + phase) + 0.05 * Math.sin(3 * t - phase))
    return { x: cx + rr * Math.cos(t), y: cy + rr * Math.sin(t) }
  })

/** Second working: a satellite pit south of the main one, 86 m deep. */
export const SATELLITE_SEED = SEED + 211
export const CURRENT_PIT_B: PitStage = {
  floorRL: 336,
  outline: randomOutline(SATELLITE_SEED, { x0: 760, x1: 1060, y0: 330, y1: 560 }, 18),
}
/** The satellite pit at the baseline survey: smaller, and a bench shallower. */
export const BASELINE_PIT_B: PitStage = {
  floorRL: 350,
  outline: scaleAbout(CURRENT_PIT_B.outline, 0.8),
}

export const PIT_ZONE: PitZone = {
  id: 'pit-main',
  polygon: scaleAbout(CURRENT_PIT.outline, 1.14),
  approvedFloorElevation: 240,
}

export const PIT_ZONE_B: PitZone = {
  id: 'pit-south',
  polygon: scaleAbout(CURRENT_PIT_B.outline, 1.22),
  approvedFloorElevation: 334,
}

export const DUMP_ZONE: DumpZone = {
  id: 'dump-west',
  polygon: blobAround(540, 510, 165, 0.7),
}

export const DUMP_ZONE_B: DumpZone = {
  id: 'dump-east',
  polygon: blobAround(1280, 470, 140, 2.1),
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
  sump: { cx: 880, cy: 1020, r: 22, depthBelowFloor: 6 },
  bufferScrape: { x0: 900, x1: 1010, y0: 1500, y1: 1510, depth: 1.2 },
  /** A cluster of truck-tipped heaps around (cx, cy). */
  strayDump: { cx: 1520, cy: 480, r: 45, height: 4 },
  /** The terraced west dump grows taller and wider (see BASELINE_DUMP). */
  zoneDump: { cx: 540, cy: 510, r: 115, height: 10 },
  /** The east waste dump also grows inside its own zone: no finding. */
  zoneDumpB: { cx: 1280, cy: 470, r: 100, height: 12 },
} as const

/** Terraced waste dump that already exists in the baseline survey, inside the dump zone. */
export const BASELINE_DUMP = { cx: 530, cy: 505, r: 85, height: 5 } as const
export const BASELINE_DUMP_B = { cx: 1275, cy: 465, r: 70, height: 6 } as const

/** Settling pond at a low point south-west of the main pit, present in both surveys. */
export const POND = { cx: 560, cy: 1400, r: 60, depth: 7 } as const

/**
 * Haul ramp in the main pit: leaves the rim at the point nearest `start` (where the
 * haul road arrives) and runs anticlockwise down the wall at `grade` until the floor.
 */
export const RAMP = {
  start: { x: 900, y: 715 },
  startB: { x: 905, y: 560 },
  grade: 0.1,
  width: 30,
} as const

/** Crest line of Venthar Ridge, north of the lease (local metres). */
export const RIDGE: readonly [number, number][] = [
  [-150, 1640],
  [400, 1790],
  [900, 1860],
  [1400, 1800],
  [2200, 1910],
]

/** Broad rises on the plateau, so the block has shape away from the ridge too. */
export const RISES: readonly { cx: number; cy: number; r: number; h: number }[] = [
  { cx: 1800, cy: 1480, r: 300, h: 34 },
  { cx: 90, cy: 760, r: 260, h: 26 },
]

/** Dry creek bed east of the lease, draining south, with a wide floodplain. */
export const CREEK: readonly [number, number][] = [
  [2200, 1200],
  [1850, 930],
  [1735, 640],
  [1770, 320],
  [1690, -150],
]

/**
 * Haul roads on the plateau (local metres). They only appear in the simulated aerial
 * image; on the ground they are flat enough not to matter at survey resolution. A network:
 * the main ramp and the satellite pit meet at a junction, which feeds the west dump, the
 * east dump and the lease gate to the north.
 */
export const ROADS: readonly (readonly [number, number][])[] = [
  // Main pit ramp to the first junction.
  [
    [900, 715],
    [930, 650],
    [960, 600],
  ],
  // Satellite pit down to the same junction.
  [
    [905, 560],
    [930, 580],
    [960, 600],
  ],
  // Junction to the west dump.
  [
    [960, 600],
    [800, 570],
    [660, 520],
    [560, 505],
  ],
  // Junction to the second junction, then the east dump and the stray-dump track.
  [
    [960, 600],
    [1060, 560],
    [1130, 500],
  ],
  [
    [1130, 500],
    [1230, 470],
    [1300, 470],
  ],
  [
    [1300, 470],
    [1420, 470],
    [1500, 475],
  ],
  // Out of the lease gate to the north.
  [
    [1130, 500],
    [1150, 300],
    [1180, 0],
  ],
]

export const SURVEY_SIGMA_M = { baseline: 0.05, current: 0.05 } as const

export const LIMITS: PermittedLimits = {
  leaseBoundary: LEASE,
  safetyBufferMetres: SAFETY_BUFFER_M,
  pitZones: [PIT_ZONE, PIT_ZONE_B],
  maxPitDepth: PLATEAU_RL - PIT_ZONE.approvedFloorElevation,
  dumpZones: [DUMP_ZONE, DUMP_ZONE_B],
}

export const MINE: Mine = {
  ...MINE_INFO,
  leaseBoundary: LEASE,
  approvedZones: [
    { id: PIT_ZONE.id, name: 'Main pit', kind: 'pit', polygon: PIT_ZONE.polygon },
    { id: PIT_ZONE_B.id, name: 'South pit', kind: 'pit', polygon: PIT_ZONE_B.polygon },
    { id: DUMP_ZONE.id, name: 'West waste dump', kind: 'dump', polygon: DUMP_ZONE.polygon },
    { id: DUMP_ZONE_B.id, name: 'East waste dump', kind: 'dump', polygon: DUMP_ZONE_B.polygon },
  ],
  metadata: {
    benchHeight: `${BENCH_HEIGHT_M} m`,
    bermWidth: `${BERM_WIDTH_M} m`,
    grid: `${GRID.cols} × ${GRID.rows} cells at ${GRID.cellSize} m`,
  },
}
