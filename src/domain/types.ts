/*
 * Domain model. Pure types, no runtime code.
 *
 * Coordinates are a local metric grid: X east, Y north, Z elevation (RL, metres).
 * The fictional origin lat/lon is for display only. A real system would work in a
 * projected CRS such as UTM and convert from GeoTIFF / survey coordinates on load.
 */

/** Where a displayed value came from. Shown next to every value in the UI. */
export type Provenance = 'measured' | 'derived' | 'simulated' | 'unverified'

export interface LatLon {
  lat: number
  lon: number
}

/** Local plan position in metres. */
export interface Vec2 {
  x: number
  y: number
}

/** Local position with elevation (RL) in metres. */
export interface Vec3 extends Vec2 {
  z: number
}

/** Closed ring of vertices; the last vertex joins back to the first. */
export type Polygon = readonly Vec2[]

/* ---------- Mine ---------- */

/** Descriptive mine metadata, used by the shell before any terrain loads. */
export interface MineInfo {
  id: string
  name: string
  mineral: string
  operator: string
  region: string
  /** Display-only anchor for the local metric grid. Fictional. */
  originLatLon: LatLon
  provenance: Provenance
}

export interface ApprovedZone {
  id: string
  name: string
  kind: 'pit' | 'dump'
  polygon: Polygon
}

export interface Mine extends MineInfo {
  leaseBoundary: Polygon
  approvedZones: readonly ApprovedZone[]
  metadata: Readonly<Record<string, string>>
}

/* ---------- Surveys ---------- */

export interface SurveyEpochInfo {
  id: string
  label: 'Baseline' | 'Current'
  /** ISO date, YYYY-MM-DD */
  date: string
  method: string
  provenance: Provenance
}

/**
 * Regular elevation grid. Cell (col, row) has its centre at
 * originXY + (col, row) × cellSize; row 0 is the southern edge.
 */
export interface GridSpec {
  cols: number
  rows: number
  /** Cell size in metres. */
  cellSize: number
  /** Local XY of the centre of cell (0, 0). */
  originXY: Vec2
}

/**
 * Aerial image draped over the surface, covering the same extent as the grid's cell
 * centres. Row 0 is the southern edge. Real drone surveys deliver an orthomosaic
 * alongside the elevation model; the synthetic provider generates a stand-in.
 */
export interface Orthophoto {
  width: number
  height: number
  /** sRGB, 4 bytes per pixel. */
  rgba: Uint8Array
  provenance: Provenance
}

/** One terrain survey (epoch). `elevations[row * cols + col]` is the RL of that cell. */
export interface TerrainSurvey extends SurveyEpochInfo {
  grid: GridSpec
  elevations: Float32Array
  /** 1σ vertical uncertainty of this survey, metres. */
  verticalUncertainty: number
  orthophoto?: Orthophoto
}

/* ---------- Permit ---------- */

export interface PitZone {
  id: string
  polygon: Polygon
  /** Lowest permitted ground level (RL, m) inside this zone. */
  approvedFloorElevation: number
}

export interface DumpZone {
  id: string
  polygon: Polygon
}

export interface PermittedLimits {
  leaseBoundary: Polygon
  /** Width of the no-dig strip along the inside of the lease boundary, metres. */
  safetyBufferMetres: number
  pitZones: readonly PitZone[]
  /** Maximum permitted depth below the original ground surface, metres. */
  maxPitDepth: number
  dumpZones: readonly DumpZone[]
}

/* ---------- Derived results (computed in M4 / M6) ---------- */

/** Per-cell change between two surveys on the same grid. */
export interface ExcavationState {
  grid: GridSpec
  /** current − baseline, metres. */
  dh: Float32Array
  /** 1 where the cell was significantly lowered. */
  excavated: Uint8Array
  /** 1 where the cell was significantly raised. */
  filled: Uint8Array
  /** Combined 1σ of the difference, √(σ1² + σ2²). */
  sigma: number
}

export interface Measurement {
  a: Vec3
  b: Vec3
  horizontalDistance: number
  slopeDistance: number
  /** b.z − a.z */
  dz: number
  provenance: 'derived'
}

export type FindingStatus = 'warning' | 'violation'
export type Severity = 'low' | 'medium' | 'high' | 'critical'
export type RuleId = 'R1' | 'R2' | 'R3'

export interface ComplianceFinding {
  id: string
  ruleId: RuleId
  type: 'boundary-encroachment' | 'buffer-encroachment' | 'depth-limit' | 'unauthorised-dumping'
  status: FindingStatus
  severity: Severity
  /** Flat cell indices (row * cols + col). */
  cells: readonly number[]
  areaM2: number
  volumeM3: number
  /** Largest exceedance of the limit, metres. */
  maxExceedance: number
  centroid: Vec2
  /** For a depth finding, the pit zone whose approved floor the finding breaches most. */
  pitZoneId?: string
  explanation: string
  provenance: 'derived'
}

/* ---------- Data source ---------- */

/**
 * Where terrain comes from. The synthetic provider implements it now; a GeoTIFF or
 * surveyed-surface provider can replace it later without touching rendering or rules.
 */
export interface TerrainProvider {
  getMine(): Promise<Mine>
  listSurveys(): Promise<readonly SurveyEpochInfo[]>
  getSurvey(id: string): Promise<TerrainSurvey>
  getLimits(): Promise<PermittedLimits>
}
