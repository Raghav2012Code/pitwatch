import type {
  ComplianceFinding,
  ExcavationState,
  FindingStatus,
  PermittedLimits,
  RuleId,
  Severity,
  TerrainSurvey,
  Vec2,
} from '../domain/types'
import { cellArea, centerOfIndex } from '../geo/grid'
import { distanceToBoundary, pointInPolygon } from '../geo/polygon'
import { detectChange } from './change'
import { connectedComponents } from './cluster'
import { COMPLIANCE_CONFIG, type ComplianceConfig, type SeverityThresholds } from './config'

/*
 * The compliance rules (spec section 7). Each rule marks cells as warning or violation
 * with a per-cell exceedance; marked cells are grouped into findings by connected
 * components. Pure functions: same surveys and limits, same findings.
 */

const WARNING = 1
const VIOLATION = 2

/** Cells one rule flagged: status per cell (0, WARNING, VIOLATION) and exceedance, m. */
interface RuleMarks {
  ruleId: RuleId
  status: Uint8Array
  exceedance: Float32Array
  /** Value summed into the finding volume for each cell, m. */
  volumeDepth: Float32Array
  /** For R2, the index into `limits.pitZones` that produced the cell's verdict; −1 otherwise. */
  zone?: Int16Array
}

function marks(ruleId: RuleId, n: number): RuleMarks {
  return {
    ruleId,
    status: new Uint8Array(n),
    exceedance: new Float32Array(n),
    volumeDepth: new Float32Array(n),
  }
}

/**
 * R1 boundary encroachment: an excavated cell whose centre is outside the lease is a
 * violation; inside the lease but within the safety buffer, a warning.
 */
export function ruleBoundary(change: ExcavationState, limits: PermittedLimits): RuleMarks {
  const g = change.grid
  const m = marks('R1', change.dh.length)
  for (let i = 0; i < change.dh.length; i++) {
    if (!change.excavated[i]) continue
    const p = centerOfIndex(g, i)
    const inLease = pointInPolygon(p, limits.leaseBoundary)
    if (!inLease) m.status[i] = VIOLATION
    else if (distanceToBoundary(p, limits.leaseBoundary) < limits.safetyBufferMetres) {
      m.status[i] = WARNING
    } else continue
    m.exceedance[i] = Math.abs(change.dh[i])
    m.volumeDepth[i] = Math.abs(change.dh[i])
  }
  return m
}

/**
 * R2 depth limit, inside each approved pit zone: ground below the approved floor by more
 * than k·σ is a violation; below it but within k·σ, a warning (the survey cannot confirm
 * it). σ here is the current survey's own uncertainty, since the floor is a fixed level
 * rather than a second survey. Volume counts only the material below the floor.
 *
 * A cell can sit inside more than one zone. It then carries the worse verdict of the two
 * (a violation is never hidden by zone order), and the exceedance, volume and explanation
 * all come from the same zone: the one whose floor the cell is deepest below.
 */
export function ruleDepth(current: TerrainSurvey, limits: PermittedLimits, k: number): RuleMarks {
  const g = current.grid
  const n = current.elevations.length
  const m = marks('R2', n)
  m.zone = new Int16Array(n).fill(-1)
  const zones = limits.pitZones
  const band = k * current.verticalUncertainty
  for (let zi = 0; zi < zones.length; zi++) {
    const zone = zones[zi]
    for (let i = 0; i < n; i++) {
      const below = zone.approvedFloorElevation - current.elevations[i]
      if (below <= 0 || !pointInPolygon(centerOfIndex(g, i), zone.polygon)) continue
      const status = below > band ? VIOLATION : WARNING
      // Worse status wins. On the same status the deeper exceedance wins, so the numbers and
      // the quoted floor always describe the same breach.
      const worse = status > m.status[i] || (status === m.status[i] && below > m.exceedance[i])
      if (!worse) continue
      m.status[i] = status
      m.exceedance[i] = below
      m.volumeDepth[i] = below
      m.zone[i] = zi
    }
  }
  return m
}

/** R3 unauthorised dumping: a filled cell outside every designated dump zone is a warning. */
export function ruleDumping(change: ExcavationState, limits: PermittedLimits): RuleMarks {
  const g = change.grid
  const m = marks('R3', change.dh.length)
  for (let i = 0; i < change.dh.length; i++) {
    if (!change.filled[i]) continue
    const p = centerOfIndex(g, i)
    if (limits.dumpZones.some((z) => pointInPolygon(p, z.polygon))) continue
    m.status[i] = WARNING
    m.exceedance[i] = change.dh[i]
    m.volumeDepth[i] = change.dh[i]
  }
  return m
}

const reaches = (t: SeverityThresholds, area: number, volume: number, exceedance: number) =>
  area >= t.areaM2 || volume >= t.volumeM3 || exceedance >= t.exceedanceM

/** Severity from the documented thresholds in `config.ts`. */
export function severityOf(
  status: FindingStatus,
  areaM2: number,
  volumeM3: number,
  exceedanceM: number,
  cfg: ComplianceConfig = COMPLIANCE_CONFIG,
): Severity {
  if (status === 'violation') {
    return reaches(cfg.critical, areaM2, volumeM3, exceedanceM) ? 'critical' : 'high'
  }
  return reaches(cfg.mediumWarning, areaM2, volumeM3, exceedanceM) ? 'medium' : 'low'
}

const TYPE: Record<RuleId, Record<FindingStatus, ComplianceFinding['type']>> = {
  R1: { violation: 'boundary-encroachment', warning: 'buffer-encroachment' },
  R2: { violation: 'depth-limit', warning: 'depth-limit' },
  R3: { violation: 'unauthorised-dumping', warning: 'unauthorised-dumping' },
}

const num = (v: number, digits = 0) =>
  v.toLocaleString('en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits })
/** Round a volume to a sensible precision for the sentence (it is an estimate). */
const roughVolume = (v: number) =>
  num(v < 1000 ? Math.round(v / 10) * 10 : Math.round(v / 100) * 100)

interface ExplainInput {
  ruleId: RuleId
  status: FindingStatus
  areaM2: number
  volumeM3: number
  maxExceedance: number
  /** ± band quoted with the numbers (k·σ), m. */
  band: number
  k: number
  limits: PermittedLimits
  /** For R2, the approved floor of the zone this finding breaches (not just the first zone). */
  pitZoneFloor?: number
}

/** Plain-English reason for a finding: the rule and the numbers behind it. */
export function explain(f: ExplainInput): string {
  const area = `${num(f.areaM2)} m²`
  const pm = `± ${num(f.band, 2)} m (${f.k}σ)`
  switch (f.ruleId) {
    case 'R1':
      return f.status === 'violation'
        ? `Excavated ${area} outside the lease boundary; deepest cut ${num(f.maxExceedance, 1)} m ${pm}. About ${roughVolume(f.volumeM3)} m³ removed.`
        : `Excavated ${area} inside the ${num(f.limits.safetyBufferMetres)} m safety buffer, within the lease; deepest cut ${num(f.maxExceedance, 1)} m ${pm}.`
    case 'R2': {
      // The zone this finding is in. Falls back to the first zone for callers that pass no zone.
      const floor = num(f.pitZoneFloor ?? f.limits.pitZones[0]?.approvedFloorElevation ?? 0)
      return f.status === 'violation'
        ? `Ground is up to ${num(f.maxExceedance, 1)} m below the approved floor (RL ${floor} m) over ${area}, more than the survey uncertainty of ${pm}. About ${roughVolume(f.volumeM3)} m³ below the floor.`
        : `Ground is up to ${num(f.maxExceedance, 2)} m below the approved floor (RL ${floor} m) over ${area}. That is within the survey uncertainty of ${pm}, so it cannot be confirmed.`
    }
    case 'R3':
      return `Filled ${area} outside the designated dump zones; highest rise ${num(f.maxExceedance, 1)} m ${pm}. About ${roughVolume(f.volumeM3)} m³ placed.`
  }
}

const STATUS_RANK: Record<FindingStatus, number> = { violation: 0, warning: 1 }
const SEVERITY_RANK: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 }

function toFindings(
  m: RuleMarks,
  band: number,
  limits: PermittedLimits,
  survey: TerrainSurvey,
  cfg: ComplianceConfig,
): Omit<ComplianceFinding, 'id'>[] {
  const g = survey.grid
  const a = cellArea(g)
  return connectedComponents(m.status, g.cols, g.rows).map((cells) => {
    const status: FindingStatus = m.status[cells[0]] === VIOLATION ? 'violation' : 'warning'
    let volume = 0
    let maxExceedance = 0
    let cx = 0
    let cy = 0
    for (const i of cells) {
      volume += m.volumeDepth[i] * a
      maxExceedance = Math.max(maxExceedance, m.exceedance[i])
      const p = centerOfIndex(g, i)
      cx += p.x
      cy += p.y
    }
    const areaM2 = cells.length * a
    const centroid: Vec2 = { x: cx / cells.length, y: cy / cells.length }
    // The zone this cluster breaches most: the one behind its deepest cell.
    let zoneIndex = -1
    let deepest = -1
    if (m.zone) {
      for (const i of cells) {
        if (m.zone[i] >= 0 && m.exceedance[i] > deepest) {
          deepest = m.exceedance[i]
          zoneIndex = m.zone[i]
        }
      }
    }
    const pitZone = zoneIndex >= 0 ? limits.pitZones[zoneIndex] : undefined
    return {
      ruleId: m.ruleId,
      type: TYPE[m.ruleId][status],
      status,
      severity: severityOf(status, areaM2, volume, maxExceedance, cfg),
      cells,
      areaM2,
      volumeM3: volume,
      maxExceedance,
      centroid,
      ...(pitZone ? { pitZoneId: pitZone.id } : {}),
      explanation: explain({
        ruleId: m.ruleId,
        status,
        areaM2,
        volumeM3: volume,
        maxExceedance,
        band,
        k: cfg.k,
        limits,
        pitZoneFloor: pitZone?.approvedFloorElevation,
      }),
      provenance: 'derived',
    }
  })
}

export interface Evaluation {
  change: ExcavationState
  findings: ComplianceFinding[]
}

/**
 * Runs every rule on two surveys and returns the change grid plus findings, sorted
 * violations first, then by severity and area. Ids are the rule plus a running number.
 */
export function evaluate(
  baseline: TerrainSurvey,
  current: TerrainSurvey,
  limits: PermittedLimits,
  cfg: ComplianceConfig = COMPLIANCE_CONFIG,
): Evaluation {
  const change = detectChange(baseline, current, cfg)
  const changeBand = cfg.k * change.sigma
  const depthBand = cfg.k * current.verticalUncertainty
  const found = [
    ...toFindings(ruleBoundary(change, limits), changeBand, limits, current, cfg),
    ...toFindings(ruleDepth(current, limits, cfg.k), depthBand, limits, current, cfg),
    ...toFindings(ruleDumping(change, limits), changeBand, limits, current, cfg),
  ].sort(
    (x, y) =>
      STATUS_RANK[x.status] - STATUS_RANK[y.status] ||
      SEVERITY_RANK[x.severity] - SEVERITY_RANK[y.severity] ||
      y.areaM2 - x.areaM2,
  )
  const counter: Record<RuleId, number> = { R1: 0, R2: 0, R3: 0 }
  const findings = found.map((f) => ({ ...f, id: `${f.ruleId}-${++counter[f.ruleId]}` }))
  return { change, findings }
}
