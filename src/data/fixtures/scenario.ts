import type {
  DumpZone,
  GridSpec,
  Mine,
  PermittedLimits,
  PitZone,
  Polygon,
} from '../../domain/types'
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
export const BENCH_HEIGHT_M = 10
export const BERM_WIDTH_M = 10
/** Horizontal run of one bench face (≈ 55° face angle). */
export const FACE_RUN_M = 7

export interface PitShape {
  cx: number
  cy: number
  /** Semi-axes of the rim ellipse, metres. */
  a: number
  b: number
  floorRL: number
}

export const BASELINE_PIT: PitShape = { cx: 1000, cy: 1030, a: 330, b: 250, floorRL: 372 }
/** Legitimate expansion: wider to the west, north and south, one bench deeper, 2 m above the approved floor. */
export const CURRENT_PIT: PitShape = { cx: 980, cy: 1030, a: 360, b: 270, floorRL: 362 }

export const PIT_ZONE: PitZone = {
  id: 'pit-main',
  polygon: [
    { x: 560, y: 700 },
    { x: 1370, y: 700 },
    { x: 1370, y: 1360 },
    { x: 560, y: 1360 },
  ],
  approvedFloorElevation: 360,
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
  encroachment: { x0: 1300, x1: 1440, y0: 985, y1: 1075, depth: 12 },
  sump: { cx: 960, cy: 1020, r: 22, depthBelowFloor: 6 },
  bufferScrape: { x0: 900, x1: 1010, y0: 1500, y1: 1510, depth: 1.2 },
  /** A cluster of truck-tipped heaps around (cx, cy). */
  strayDump: { cx: 1520, cy: 480, r: 45, height: 4 },
  /** The terraced west dump grows taller and wider (see BASELINE_DUMP). */
  zoneDump: { cx: 540, cy: 510, r: 115, height: 10 },
} as const

/** Terraced waste dump that already exists in the baseline survey, inside the dump zone. */
export const BASELINE_DUMP = { cx: 530, cy: 505, r: 85, height: 5 } as const

/** Haul ramp spiralling down the pit wall: starts on the south rim, turns anticlockwise. */
export const RAMP = { startAngle: -Math.PI / 2, grade: 0.1, width: 22 } as const

/**
 * Haul roads on the plateau (local metres). They only appear in the simulated aerial
 * image; on the ground they are flat enough not to matter at survey resolution.
 */
export const ROADS: readonly (readonly [number, number][])[] = [
  [
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
