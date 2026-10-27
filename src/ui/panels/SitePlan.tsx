import { useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { ComplianceFinding, GridSpec, Polygon, Vec2 } from '../../domain/types'
import {
  cellIndicesToSvgPath,
  cellMaskToSvgPath,
  elevationContoursToSvgPaths,
} from '../../geo/sitePlan'
import { useAppStore } from '../../state/store'
import { useTerrain } from '../../state/terrain'
import { GLYPH, RULE_NAMES, toneOf } from '../findings'
import { formatDate } from '../format'
import { ProvenanceTag } from '../ProvenanceTag'
import { navigate, ROUTE_HREF } from '../route'

const SCALE_BAR_M = 500
const CONTOUR_INTERVAL_M = 15
const PIN_RADIUS_PX = 22.25
const PIN_LABEL_HEIGHT_PX = 18
const PIN_LABEL_GAP_PX = 5
const PIN_LABEL_CHAR_PX = 6.5
const PIN_CLEARANCE_PX = 4
const OBSERVED_LABEL_CHAR_PX = 6.5
const OBSERVED_LABEL_HEIGHT_PX = 24
const OBSERVED_EXCAVATION_LABEL = 'Pit excavation'
const LABEL_SEARCH_STEP_PX = 4

interface PlannedPin {
  finding: ComplianceFinding
  x: number
  y: number
  dx: number
  dy: number
  labelOnLeft: boolean
  labelWidth: number
}

interface Box {
  left: number
  right: number
  top: number
  bottom: number
}

const labelWidth = (finding: ComplianceFinding) => finding.id.length * PIN_LABEL_CHAR_PX + 10

function boundsForPin(x: number, y: number, width: number, labelOnLeft: boolean): Box {
  const labelLeft = labelOnLeft
    ? x - PIN_RADIUS_PX - PIN_LABEL_GAP_PX - width
    : x + PIN_RADIUS_PX + PIN_LABEL_GAP_PX
  const labelRight = labelOnLeft
    ? x - PIN_RADIUS_PX - PIN_LABEL_GAP_PX
    : x + PIN_RADIUS_PX + PIN_LABEL_GAP_PX + width
  return {
    left: Math.min(x - PIN_RADIUS_PX, labelLeft),
    right: Math.max(x + PIN_RADIUS_PX, labelRight),
    top: Math.min(y - PIN_RADIUS_PX, y - PIN_LABEL_HEIGHT_PX / 2),
    bottom: Math.max(y + PIN_RADIUS_PX, y + PIN_LABEL_HEIGHT_PX / 2),
  }
}

function intersects(a: Box, b: Box): boolean {
  return (
    a.left < b.right + PIN_CLEARANCE_PX &&
    a.right + PIN_CLEARANCE_PX > b.left &&
    a.top < b.bottom + PIN_CLEARANCE_PX &&
    a.bottom + PIN_CLEARANCE_PX > b.top
  )
}

/** Place pin labels and 44 px hit circles in CSS-pixel space, independent of the map scale. */
function placePins(
  findings: readonly ComplianceFinding[],
  grid: { cols: number; rows: number; cellSize: number; originXY: Vec2 },
  widthPx: number,
): PlannedPin[] {
  if (widthPx <= 0) return []
  const mapWidth = grid.cols * grid.cellSize
  const mapHeight = grid.rows * grid.cellSize
  const x0 = grid.originXY.x - grid.cellSize / 2
  const top = grid.originXY.y + (grid.rows - 1) * grid.cellSize + grid.cellSize / 2
  const unitsPerPixel = mapWidth / widthPx
  const offsets = [
    [0, 0],
    [0, -34],
    [0, 34],
    [38, -18],
    [-38, -18],
    [38, 18],
    [-38, 18],
    [0, -70],
    [0, 70],
    [78, 0],
    [-78, 0],
    [78, -52],
    [-78, -52],
    [78, 52],
    [-78, 52],
    [0, -108],
    [0, 108],
  ] as const
  const occupied: Box[] = []
  const placed: PlannedPin[] = []

  for (const finding of findings) {
    const anchorX = (finding.centroid.x - x0) / unitsPerPixel
    const anchorY = (top - finding.centroid.y) / unitsPerPixel
    const width = labelWidth(finding)
    const preferredLeft = anchorX > widthPx * 0.72
    const choices = offsets.flatMap(([dx, dy]) => [
      { dx, dy, labelOnLeft: preferredLeft },
      { dx, dy, labelOnLeft: !preferredLeft },
    ])
    const choice = choices.find(({ dx, dy, labelOnLeft }) => {
      const x = anchorX + dx
      const y = anchorY + dy
      const box = boundsForPin(x, y, width, labelOnLeft)
      return (
        box.left >= 2 &&
        box.right <= widthPx - 2 &&
        box.top >= 2 &&
        box.bottom <= mapHeight / unitsPerPixel - 2 &&
        occupied.every((other) => !intersects(box, other))
      )
    }) ?? { dx: 0, dy: 0, labelOnLeft: preferredLeft }

    const x = anchorX + choice.dx
    const y = anchorY + choice.dy
    occupied.push(boundsForPin(x, y, width, choice.labelOnLeft))
    placed.push({
      finding,
      x: x0 + x * unitsPerPixel,
      y: top - y * unitsPerPixel,
      dx: choice.dx * unitsPerPixel,
      dy: choice.dy * unitsPerPixel,
      labelOnLeft: choice.labelOnLeft,
      labelWidth: width * unitsPerPixel,
    })
  }

  return placed
}

function polygonLabelPoint(polygon: Polygon): Vec2 {
  let twiceArea = 0
  let x = 0
  let y = 0
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!
    const b = polygon[(i + 1) % polygon.length]!
    const cross = a.x * b.y - b.x * a.y
    twiceArea += cross
    x += (a.x + b.x) * cross
    y += (a.y + b.y) * cross
  }
  if (Math.abs(twiceArea) < 1e-6) {
    return polygon.reduce(
      (sum, p) => ({ x: sum.x + p.x / polygon.length, y: sum.y + p.y / polygon.length }),
      { x: 0, y: 0 },
    )
  }
  return { x: x / (3 * twiceArea), y: y / (3 * twiceArea) }
}

function leaseLabelPoint(polygon: Polygon): Vec2 {
  const center = polygonLabelPoint(polygon)
  let longest = { a: polygon[0]!, b: polygon[1]!, length: -1 }
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!
    const b = polygon[(i + 1) % polygon.length]!
    const length = Math.hypot(b.x - a.x, b.y - a.y)
    if (length > longest.length) longest = { a, b, length }
  }
  const middle = { x: (longest.a.x + longest.b.x) / 2, y: (longest.a.y + longest.b.y) / 2 }
  const dx = center.x - middle.x
  const dy = center.y - middle.y
  const distance = Math.hypot(dx, dy) || 1
  return { x: middle.x + (dx / distance) * 18, y: middle.y + (dy / distance) * 18 }
}

function svgPolygonPath(polygon: Polygon, top: number): string {
  return polygon.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${top - p.y}`).join('') + 'Z'
}

function containsPoint(polygon: Polygon, point: Vec2): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!
    const b = polygon[j]!
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    ) {
      inside = !inside
    }
  }
  return inside
}

function observedLabelPoints(
  grid: GridSpec,
  mask: Uint8Array,
  polygons: readonly { id: string; polygon: Polygon }[],
  avoid?: { pins: readonly PlannedPin[]; svgWidth: number; text: string },
): { id: string; point: Vec2; labelPoint: Vec2 }[] {
  return polygons.flatMap(({ id, polygon }) => {
    let count = 0
    let x = 0
    let y = 0
    const matchingCells: Vec2[] = []
    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        const index = row * grid.cols + col
        if (!mask[index]) continue
        const point = {
          x: grid.originXY.x + col * grid.cellSize,
          y: grid.originXY.y + row * grid.cellSize,
        }
        if (!containsPoint(polygon, point)) continue
        count++
        x += point.x
        y += point.y
        matchingCells.push(point)
      }
    }
    if (!count) return []

    const centroid = { x: x / count, y: y / count }
    const anchor = matchingCells.reduce((nearest, point) =>
      Math.hypot(point.x - centroid.x, point.y - centroid.y) <
      Math.hypot(nearest.x - centroid.x, nearest.y - centroid.y)
        ? point
        : nearest,
    )
    if (!avoid || avoid.svgWidth <= 0) return [{ id, point: anchor, labelPoint: anchor }]

    const mapWidth = grid.cols * grid.cellSize
    const unitsPerPixel = mapWidth / avoid.svgWidth
    const x0 = grid.originXY.x - grid.cellSize / 2
    const top = grid.originXY.y + (grid.rows - 1) * grid.cellSize + grid.cellSize / 2
    const labelWidthPx = avoid.text.length * OBSERVED_LABEL_CHAR_PX
    const obstacles = avoid.pins.map((pin) => {
      const px = (pin.x - x0) / unitsPerPixel
      const py = pin.y / unitsPerPixel
      return boundsForPin(px, py, pin.labelWidth / unitsPerPixel, pin.labelOnLeft)
    })
    const anchorPx = (anchor.x - x0) / unitsPerPixel
    const anchorPy = (top - anchor.y) / unitsPerPixel
    let labelPoint: Vec2 | undefined
    let bestDistance = Number.POSITIVE_INFINITY
    let bestClearance = Number.NEGATIVE_INFINITY
    const mapHeightPx = mapWidth / unitsPerPixel
    for (
      let py = 2 + OBSERVED_LABEL_HEIGHT_PX / 2;
      py < mapHeightPx - OBSERVED_LABEL_HEIGHT_PX / 2;
      py += LABEL_SEARCH_STEP_PX
    ) {
      for (
        let px = 2 + labelWidthPx / 2;
        px < avoid.svgWidth - 2 - labelWidthPx / 2;
        px += LABEL_SEARCH_STEP_PX
      ) {
        const labelBox = {
          left: px - labelWidthPx / 2,
          right: px + labelWidthPx / 2,
          top: py - OBSERVED_LABEL_HEIGHT_PX / 2,
          bottom: py + OBSERVED_LABEL_HEIGHT_PX / 2,
        }
        if (
          labelBox.left < 2 ||
          labelBox.right > avoid.svgWidth - 2 ||
          labelBox.top < 2 ||
          labelBox.bottom > mapHeightPx - 2
        ) {
          continue
        }
        const clearance = obstacles.reduce((minimum, obstacle) => {
          const overlapX =
            Math.min(labelBox.right, obstacle.right) - Math.max(labelBox.left, obstacle.left)
          const overlapY =
            Math.min(labelBox.bottom, obstacle.bottom) - Math.max(labelBox.top, obstacle.top)
          const separation =
            overlapX >= 0 && overlapY >= 0
              ? -Math.min(overlapX, overlapY)
              : Math.hypot(Math.max(0, -overlapX), Math.max(0, -overlapY))
          return Math.min(minimum, separation)
        }, Number.POSITIVE_INFINITY)
        const distance = Math.hypot(px - anchorPx, py - anchorPy)
        if (
          clearance >= PIN_CLEARANCE_PX &&
          (distance < bestDistance || (distance === bestDistance && clearance > bestClearance))
        ) {
          bestDistance = distance
          bestClearance = clearance
          labelPoint = { x: x0 + px * unitsPerPixel, y: top - py * unitsPerPixel }
        }
      }
    }
    return [{ id, point: anchor, labelPoint: labelPoint ?? anchor }]
  })
}

/**
 * The mine plan is built from the same survey, change mask, permit limits and findings as the
 * monitor. The diagram uses north-up cell geometry so no map claim is added in the view layer.
 */
export function SitePlan() {
  const mine = useTerrain((s) => s.mine)
  const current = useTerrain((s) => s.surveys.current)
  const change = useTerrain((s) => s.change)
  const limits = useTerrain((s) => s.limits)
  const findings = useTerrain((s) => s.findings)
  const selectedFinding = useAppStore((s) => s.selectedFinding)
  const selectFinding = useAppStore((s) => s.selectFinding)
  const svgRef = useRef<SVGSVGElement>(null)
  const [svgWidth, setSvgWidth] = useState(0)

  const grid = change?.grid
  const width = grid ? grid.cols * grid.cellSize : 0
  const height = grid ? grid.rows * grid.cellSize : 0
  const x0 = grid ? grid.originXY.x - grid.cellSize / 2 : 0
  const top = grid ? grid.originXY.y + (grid.rows - 1) * grid.cellSize + grid.cellSize / 2 : 0
  const unitsPerCssPixel = width && svgWidth ? width / svgWidth : 1

  useLayoutEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const measure = () => setSvgWidth(svg.clientWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(svg)
    return () => observer.disconnect()
  }, [width])

  const changePaths = useMemo(() => {
    if (!change) return null
    return {
      excavated: cellMaskToSvgPath(change.grid, change.excavated),
      filled: cellMaskToSvgPath(change.grid, change.filled),
    }
  }, [change])
  const findingPaths = useMemo(
    () =>
      grid
        ? findings.map((finding) => ({ finding, d: cellIndicesToSvgPath(grid, finding.cells) }))
        : [],
    [findings, grid],
  )
  const pins = useMemo(
    () => (grid ? placePins(findings, grid, svgWidth) : []),
    [findings, grid, svgWidth],
  )
  const observedExcavationLabels = useMemo(
    () =>
      grid && limits
        ? observedLabelPoints(grid, change?.excavated ?? new Uint8Array(), limits.pitZones, {
            pins,
            svgWidth,
            text: OBSERVED_EXCAVATION_LABEL,
          })
        : [],
    [change, grid, limits, pins, svgWidth],
  )
  const observedFillLabels = useMemo(
    () =>
      grid && limits
        ? observedLabelPoints(grid, change?.filled ?? new Uint8Array(), limits.dumpZones, {
            pins,
            svgWidth,
            text: 'In-zone waste fill',
          })
        : [],
    [change, grid, limits, pins, svgWidth],
  )
  const contours = useMemo(
    () =>
      current
        ? elevationContoursToSvgPaths(current.grid, current.elevations, CONTOUR_INTERVAL_M)
        : [],
    [current],
  )
  if (!change || !limits || !current || !mine || !grid) return null
  const svgY = (y: number) => top - y
  const open = (finding: ComplianceFinding) => {
    selectFinding(finding.id, finding.centroid)
    navigate('monitor')
  }
  const onKey = (event: KeyboardEvent<SVGGElement>, finding: ComplianceFinding) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    open(finding)
  }
  const scaleWidth = `${(SCALE_BAR_M / width) * (svgWidth || 350)}px`
  const mapArea = `Plan of the mine from above: ${mine.name}, current survey ${formatDate(current.date)}. North is up. The plan shows the lease boundary, permitted pit and dump zones, current-survey elevation contours, classified change and every finding area.`

  return (
    <section aria-labelledby="site-plan" className="rule-section">
      <div className="flex items-center justify-between gap-3">
        <h2 id="site-plan" className="section-title">
          Site plan
        </h2>
        <a href={ROUTE_HREF.monitor} className="btn-primary">
          Explore in 3D
        </a>
      </div>

      <figure className="site-plan-figure mt-3">
        <figcaption className="plan-title-block">
          <div className="plan-title-copy">
            <strong className="plan-mine-name">{mine.name}</strong>
            <span className="plan-survey-date">Current survey · {formatDate(current.date)}</span>
          </div>
          <div className="plan-instruments">
            <ProvenanceTag value="derived" />
            <div className="plan-north-block" aria-label="North is up">
              <span className="plan-north-arrow" aria-hidden="true">
                ↑
              </span>
              <span>North</span>
            </div>
            <div className="plan-scale-block" aria-label={`Scale bar, ${SCALE_BAR_M} metres`}>
              <span className="plan-scale-label">{SCALE_BAR_M} m</span>
              <span className="plan-scale-track" style={{ width: scaleWidth }} aria-hidden="true">
                <i />
                <i />
              </span>
            </div>
          </div>
        </figcaption>

        <svg
          ref={svgRef}
          viewBox={`${x0} 0 ${width} ${height}`}
          className="site-plan"
          role="group"
          aria-label={mapArea}
        >
          <rect x={x0} y={0} width={width} height={height} className="plan-ground" />

          {/* The lease governs R1 and therefore carries the strongest outline. */}
          <path d={svgPolygonPath(limits.leaseBoundary, top)} className="plan-line plan-lease" />

          {limits.pitZones.map((zone) => (
            <path
              key={zone.id}
              d={svgPolygonPath(zone.polygon, top)}
              className="plan-line plan-pit"
            />
          ))}
          {limits.dumpZones.map((zone) => (
            <path
              key={zone.id}
              d={svgPolygonPath(zone.polygon, top)}
              className="plan-line plan-dump"
            />
          ))}

          {changePaths?.excavated && (
            <path d={changePaths.excavated} className="plan-change plan-cut" fillRule="evenodd" />
          )}
          {changePaths?.filled && (
            <path d={changePaths.filled} className="plan-change plan-fill" fillRule="evenodd" />
          )}

          {contours.map(({ level, d }) => (
            <path key={level} d={d} className="plan-contour" data-elevation={level} />
          ))}

          {findingPaths.map(({ finding, d }) => {
            const tone = toneOf(finding)
            return (
              <path
                key={finding.id}
                d={d}
                className={`plan-finding-area tone-${tone}`}
                fillRule="evenodd"
                aria-label={`${finding.id} affected area`}
              >
                <title>{`${finding.id}: cells classified as ${finding.status} by ${RULE_NAMES[finding.ruleId]}`}</title>
              </path>
            )
          })}

          {observedExcavationLabels.map(({ id, point, labelPoint }) => (
            <g key={`observed-cut-${id}`}>
              {Math.hypot(labelPoint.x - point.x, labelPoint.y - point.y) > grid.cellSize / 100 && (
                <line
                  x1={point.x}
                  y1={svgY(point.y)}
                  x2={labelPoint.x}
                  y2={svgY(labelPoint.y)}
                  className="plan-observed-leader plan-observed-cut-leader"
                />
              )}
              <text
                x={labelPoint.x}
                y={svgY(labelPoint.y)}
                fontSize={10 * unitsPerCssPixel}
                strokeWidth={4 * unitsPerCssPixel}
                className="plan-observed-label plan-observed-cut-label"
                aria-label="Observed pit excavation, derived from the simulated surveys"
              >
                <title>Observed pit excavation, derived from the simulated surveys</title>
                {OBSERVED_EXCAVATION_LABEL}
              </text>
            </g>
          ))}
          {observedFillLabels.map(({ id, point, labelPoint }) => (
            <g key={`observed-fill-${id}`}>
              {Math.hypot(labelPoint.x - point.x, labelPoint.y - point.y) > grid.cellSize / 100 && (
                <line
                  x1={point.x}
                  y1={svgY(point.y)}
                  x2={labelPoint.x}
                  y2={svgY(labelPoint.y)}
                  className="plan-observed-leader plan-observed-fill-leader"
                />
              )}
              <text
                x={labelPoint.x}
                y={svgY(labelPoint.y)}
                fontSize={10 * unitsPerCssPixel}
                strokeWidth={4 * unitsPerCssPixel}
                className="plan-observed-label plan-observed-fill-label"
                aria-label="In-zone waste fill, derived from the simulated surveys"
              >
                <title>In-zone waste fill, derived from the simulated surveys</title>
                In-zone waste fill
              </text>
            </g>
          ))}

          {(() => {
            const point = leaseLabelPoint(limits.leaseBoundary)
            return (
              <text
                x={point.x}
                y={svgY(point.y)}
                fontSize={10 * unitsPerCssPixel}
                strokeWidth={4 * unitsPerCssPixel}
                className="plan-lease-label"
              >
                Lease boundary
              </text>
            )
          })()}

          {pins.map(({ finding, x, y, dx, dy, labelOnLeft, labelWidth: chipWidth }) => {
            const tone = toneOf(finding)
            const Glyph = GLYPH[tone]
            const anchorX = finding.centroid.x
            const anchorY = svgY(finding.centroid.y)
            const labelX = labelOnLeft
              ? x -
                PIN_RADIUS_PX * unitsPerCssPixel -
                PIN_LABEL_GAP_PX * unitsPerCssPixel -
                chipWidth
              : x + PIN_RADIUS_PX * unitsPerCssPixel + PIN_LABEL_GAP_PX * unitsPerCssPixel
            return (
              <g key={finding.id}>
                {(dx !== 0 || dy !== 0) && (
                  <line
                    x1={anchorX}
                    y1={anchorY}
                    x2={x}
                    y2={y}
                    className={`plan-leader tone-${tone}`}
                  />
                )}
                <circle
                  cx={anchorX}
                  cy={anchorY}
                  r={2.5 * unitsPerCssPixel}
                  className={`plan-finding-origin tone-${tone}`}
                />
                <g
                  role="button"
                  tabIndex={0}
                  className={`plan-pin tone-${tone}`}
                  aria-pressed={selectedFinding === finding.id}
                  aria-label={`${finding.id}, ${RULE_NAMES[finding.ruleId]}, ${finding.status}, ${finding.severity} severity. Show on the map`}
                  onClick={() => open(finding)}
                  onKeyDown={(event) => onKey(event, finding)}
                >
                  <title>{`${finding.id}: ${RULE_NAMES[finding.ruleId]}`}</title>
                  <circle
                    cx={x}
                    cy={y}
                    r={PIN_RADIUS_PX * unitsPerCssPixel}
                    className="plan-pin-hit"
                  />
                  <circle cx={x} cy={y} r={10 * unitsPerCssPixel} className="plan-pin-disc" />
                  <circle
                    cx={x}
                    cy={y}
                    r={PIN_RADIUS_PX * unitsPerCssPixel}
                    className="plan-pin-ring"
                  />
                  <Glyph
                    x={x - 7 * unitsPerCssPixel}
                    y={y - 7 * unitsPerCssPixel}
                    width={14 * unitsPerCssPixel}
                    height={14 * unitsPerCssPixel}
                    className="plan-pin-glyph"
                  />
                  <rect
                    x={labelX}
                    y={y - (PIN_LABEL_HEIGHT_PX / 2) * unitsPerCssPixel}
                    width={chipWidth}
                    height={PIN_LABEL_HEIGHT_PX * unitsPerCssPixel}
                    rx={2 * unitsPerCssPixel}
                    className="plan-pin-label-bg"
                  />
                  <text
                    x={labelX + chipWidth / 2}
                    y={y + 3 * unitsPerCssPixel}
                    fontSize={10 * unitsPerCssPixel}
                    className="plan-pin-label"
                    textAnchor="middle"
                  >
                    {finding.id}
                  </text>
                </g>
              </g>
            )
          })}
        </svg>

        <div className="plan-caption">
          <div className="plan-key" aria-label="Map symbols">
            <span>
              <i className="plan-swatch plan-swatch-cut" />
              Excavated
            </span>
            <span>
              <i className="plan-swatch plan-swatch-fill" />
              Filled
            </span>
            <span>
              <i className="plan-swatch plan-swatch-lease" />
              Lease
            </span>
            <span>
              <i className="plan-swatch plan-swatch-pit" />
              Pit permit
            </span>
            <span>
              <i className="plan-swatch plan-swatch-dump" />
              Dump permit
            </span>
            <span>
              <i className="plan-swatch plan-swatch-contour" />
              15 m contours
            </span>
          </div>
          <p className="plan-note">
            Outlined areas are the engine&apos;s findings; select a labelled glyph to open its
            evidence on the 3D map. Pit excavation marks cells classified as lowered between the
            simulated surveys; in-zone waste fill marks cells classified as raised. Contours follow
            the current elevation survey. The loaded survey has no separate road layer.
          </p>
        </div>
      </figure>
    </section>
  )
}
