import type {
  ComplianceFinding,
  PermittedLimits,
  PitZone,
  TerrainSurvey,
  Vec2,
} from '../domain/types'
import { cellAt, indexOf, sampleBilinear } from '../geo/grid'
import { distanceToBoundary, pointInPolygon } from '../geo/polygon'
import { changeThreshold } from './change'
import { COMPLIANCE_CONFIG, type ComplianceConfig } from './config'
import { combinedSigma } from './uncertainty'

/**
 * Cell → finding ids, built once per findings array. Findings are replaced wholesale when a load
 * finishes, so caching on the array identity means one build and a constant-time lookup per pick,
 * instead of scanning every finding's cell list again.
 */
const cellIndex = new WeakMap<readonly ComplianceFinding[], Map<number, string[]>>()

function findingIdsAt(findings: readonly ComplianceFinding[], cell: number): string[] {
  let index = cellIndex.get(findings)
  if (!index) {
    index = new Map<number, string[]>()
    for (const f of findings) {
      for (const c of f.cells) {
        const list = index.get(c)
        if (list) list.push(f.id)
        else index.set(c, [f.id])
      }
    }
    cellIndex.set(findings, index)
  }
  return index.get(cell) ?? []
}

/** Everything the inspector shows about one picked point. */
export interface PointReading {
  p: Vec2
  /** Current and baseline RL (m), null outside the survey grid. */
  elevation: number | null
  baseline: number | null
  /** current − baseline, and its combined 1σ. */
  dh: number | null
  dhSigma: number
  /** Whether the change is large enough to count (beyond minChange + kσ). */
  change: 'excavated' | 'filled' | 'none'
  /** Slope of the current surface, degrees. */
  slopeDeg: number | null
  insideLease: boolean
  /** Distance to the lease boundary, metres (either side). */
  leaseDistance: number
  /** Inside the lease but within the safety buffer. */
  inBuffer: boolean
  /** Inside a pit zone: its approved floor and how far the surface sits above it (m). */
  pit: { floor: number; above: number | null } | null
  /** Findings whose cells include the cell under the point. */
  findingIds: string[]
}

/** Reads the surveys, permit and findings at a plan position. */
export function readPoint(
  p: Vec2,
  baseline: TerrainSurvey,
  current: TerrainSurvey,
  limits: PermittedLimits,
  findings: readonly ComplianceFinding[],
  cfg: Pick<ComplianceConfig, 'k' | 'minChangeM'> = COMPLIANCE_CONFIG,
): PointReading {
  const g = current.grid
  const elevation = sampleBilinear(g, current.elevations, p)
  const base = sampleBilinear(g, baseline.elevations, p)
  const dh = elevation !== null && base !== null ? elevation - base : null
  const dhSigma = combinedSigma(baseline.verticalUncertainty, current.verticalUncertainty)
  const limit = changeThreshold(dhSigma, cfg)

  // Central differences one cell either side.
  const h = g.cellSize
  const at = (x: number, y: number) => sampleBilinear(g, current.elevations, { x, y })
  const [e, w, n, s] = [at(p.x + h, p.y), at(p.x - h, p.y), at(p.x, p.y + h), at(p.x, p.y - h)]
  const slopeDeg =
    e !== null && w !== null && n !== null && s !== null
      ? (Math.atan(Math.hypot((e - w) / (2 * h), (n - s) / (2 * h))) * 180) / Math.PI
      : null

  const insideLease = pointInPolygon(p, limits.leaseBoundary)
  const leaseDistance = distanceToBoundary(p, limits.leaseBoundary)
  // Overlapping zones: report the one that governs this point, the same way the depth rule picks
  // it (deepest below its own floor), rather than whichever happens to be first in the list.
  const zone = limits.pitZones
    .filter((z) => pointInPolygon(p, z.polygon))
    .reduce<PitZone | undefined>((best, z) => {
      if (!best) return z
      if (elevation === null)
        return z.approvedFloorElevation < best.approvedFloorElevation ? z : best
      const below = z.approvedFloorElevation - elevation
      const bestBelow = best.approvedFloorElevation - elevation
      return below > bestBelow ? z : best
    }, undefined)

  const cell = cellAt(g, p)
  const index = cell ? indexOf(g, cell.col, cell.row) : -1

  return {
    p,
    elevation,
    baseline: base,
    dh,
    dhSigma,
    change: dh === null ? 'none' : dh < -limit ? 'excavated' : dh > limit ? 'filled' : 'none',
    slopeDeg,
    insideLease,
    leaseDistance,
    inBuffer: insideLease && leaseDistance < limits.safetyBufferMetres,
    pit: zone
      ? {
          floor: zone.approvedFloorElevation,
          above: elevation === null ? null : elevation - zone.approvedFloorElevation,
        }
      : null,
    findingIds: index < 0 ? [] : findingIdsAt(findings, index),
  }
}
