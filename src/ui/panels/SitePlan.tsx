import { useEffect, useMemo, useRef, useState } from 'react'
import type { ComplianceFinding, GridSpec, Vec2 } from '../../domain/types'
import { cellBox, changeRings, contourLines, maskRings, type Trail } from '../../geo/plan'
import { OVERLAY, TONE_COLOR } from '../../scene/palette'
import { useAppStore } from '../../state/store'
import { useTerrain } from '../../state/terrain'
import { GLYPH, RULE_NAMES, toneOf } from '../findings'
import { formatDate } from '../format'
import { ProvenanceTag } from '../ProvenanceTag'
import { navigate, ROUTE_HREF } from '../route'

/**
 * Contour interval on the plan, metres. The figure is about 600 px across for a 2048 m site, so a
 * 5 m line would be one line every 1.5 px; 25 m is what reads as ground at this size.
 */
const CONTOUR_M = 25
const SCALE_BAR_M = 500
/** Marker separation and minimum touch target, CSS px. */
const MARKER_PX = 44

interface Placement {
  f: ComplianceFinding
  at: Vec2
  moved: boolean
}

/**
 * Markers in CSS pixels, not metres, so a pin is the same size on a phone as on a desktop. They
 * nudge away from each other in pixels (R1-1, R1-2 and R3-1 sit within 200 m at the east wall) and
 * a nudged one keeps a leader line back to its finding.
 */
function placeMarkers(
  findings: readonly ComplianceFinding[],
  view: { w: number; h: number; extent: number; north: number; x0: number; top: number },
): Placement[] {
  const { w, h, extent, north, x0, top } = view
  if (w <= 0 || h <= 0) return []
  const base = findings.map((f) => ({
    f,
    at: {
      x: Math.min(w - MARKER_PX / 2, Math.max(MARKER_PX / 2, ((f.centroid.x - x0) / extent) * w)),
      y: Math.min(h - MARKER_PX / 2, Math.max(MARKER_PX / 2, ((top - f.centroid.y) / north) * h)),
    },
  }))
  const tries = [
    [0, 0],
    [1, -1],
    [-1, -1],
    [1, 1],
    [-1, 1],
    [0, -1.7],
    [1.7, 0],
    [-1.7, 0],
  ] as const
  const placed: Placement[] = []
  for (const { f, at } of base) {
    let spot = at
    let moved = false
    for (const [dx, dy] of tries) {
      const candidate = { x: at.x + dx * MARKER_PX, y: at.y + dy * MARKER_PX }
      if (
        placed.every((p) => Math.hypot(p.at.x - candidate.x, p.at.y - candidate.y) >= MARKER_PX)
      ) {
        spot = candidate
        moved = dx !== 0 || dy !== 0
        break
      }
    }
    placed.push({ f, at: spot, moved })
  }
  return placed
}

/**
 * The mine from above: contoured ground, the cells that changed beyond the noise as vector shapes,
 * the lease and permitted extents, and the engine's findings as areas with a pin each. Drawn from
 * the same data and engine output as the 3D map, so it can never disagree with it, and every pin
 * opens that finding on the map.
 */
export function SitePlan() {
  const change = useTerrain((s) => s.change)
  const limits = useTerrain((s) => s.limits)
  const findings = useTerrain((s) => s.findings)
  const current = useTerrain((s) => s.surveys.current)
  const mine = useTerrain((s) => s.mine)
  const selectedFinding = useAppStore((s) => s.selectedFinding)
  const selectFinding = useAppStore((s) => s.selectFinding)

  // Marker sizes are pixel sizes, so the figure is measured rather than assumed.
  const frame = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const el = frame.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setSize({ w: entry.contentRect.width, h: entry.contentRect.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [change])

  const contours = useMemo(
    () => (current ? contourLines(current.elevations, current.grid, CONTOUR_M) : []),
    [current],
  )
  const rings = useMemo(() => (change ? changeRings(change) : null), [change])
  // One mask per finding, scanned only inside its own cell box: a finding is a few thousand cells.
  const areas = useMemo(() => {
    if (!change) return []
    const g = change.grid
    return findings.map((f) => {
      const mask = new Uint8Array(g.cols * g.rows)
      for (const i of f.cells) mask[i] = 1
      return { f, trails: maskRings(mask, g, cellBox(f.cells, g)) }
    })
  }, [change, findings])

  const markers = useMemo(() => {
    if (!change) return []
    const g = change.grid
    return placeMarkers(findings, {
      w: size.w,
      h: size.h,
      extent: g.cols * g.cellSize,
      north: g.rows * g.cellSize,
      x0: g.originXY.x - g.cellSize / 2,
      top: g.originXY.y + (g.rows - 1) * g.cellSize + g.cellSize / 2,
    })
  }, [change, findings, size])

  if (!change || !limits) return null

  const g: GridSpec = change.grid
  const extent = g.cols * g.cellSize
  const north = g.rows * g.cellSize
  const x0 = g.originXY.x - g.cellSize / 2
  const top = g.originXY.y + north - g.cellSize / 2
  const sx = (x: number) => (x - x0).toFixed(1)
  const sy = (y: number) => (top - y).toFixed(1)
  const toPath = (trails: Trail[]) =>
    trails
      .map(
        (t) => `M${t.points.map((p) => `${sx(p.x)} ${sy(p.y)}`).join('L')}${t.closed ? 'Z' : ''}`,
      )
      .join('')
  const polyPath = (poly: readonly Vec2[]) =>
    poly.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x)} ${sy(p.y)}`).join('') + 'Z'
  const zoneName = (id: string) => mine?.approvedZones.find((z) => z.id === id)?.name ?? id

  const open = (f: ComplianceFinding) => {
    selectFinding(f.id, f.centroid)
    navigate('monitor')
  }

  return (
    <section aria-labelledby="site-plan" className="rule-section">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="site-plan" className="section-title">
            Site plan
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-ink-faint">
            <span>
              {current ? `${current.label} survey, ${formatDate(current.date)}` : 'Current survey'}
            </span>
            <ProvenanceTag value="derived" />
          </p>
        </div>
        <a href={ROUTE_HREF.monitor} className="btn-primary shrink-0">
          Explore in 3D
        </a>
      </div>

      <figure className="mt-3 max-w-[42.5rem]">
        <div className="plan-sheet">
          <div
            className="plan-frame"
            ref={frame}
            role="group"
            aria-label="Plan of the mine from above, north at the top, with a pin on every finding"
          >
            <svg
              className="plan-map"
              viewBox={`0 0 ${extent} ${north}`}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <rect x={0} y={0} width={extent} height={north} className="plan-ground" />

              {rings && (
                <>
                  <path
                    d={toPath(rings.excavated)}
                    className="plan-change"
                    style={{ fill: OVERLAY.cut, stroke: OVERLAY.cut }}
                    fillRule="evenodd"
                  />
                  <path
                    d={toPath(rings.filled)}
                    className="plan-change"
                    style={{ fill: OVERLAY.fill, stroke: OVERLAY.fill }}
                    fillRule="evenodd"
                  />
                </>
              )}

              {/* Ground over the change: two weights, so the pit and the dump still read as relief. */}
              {contours.map((level) => (
                <path
                  key={level.rl}
                  d={toPath(level.trails)}
                  className={
                    level.rl % (CONTOUR_M * 4) === 0
                      ? 'plan-contour plan-contour-index'
                      : 'plan-contour'
                  }
                />
              ))}

              {/* Findings as the ground they cover, not just a dot. */}
              {areas.map(({ f, trails }) => (
                <path
                  key={f.id}
                  d={toPath(trails)}
                  className="plan-area"
                  style={{ stroke: TONE_COLOR[toneOf(f)] }}
                  fillRule="evenodd"
                />
              ))}

              {limits.dumpZones.map((z) => (
                <path key={z.id} d={polyPath(z.polygon)} className="plan-line plan-dump" />
              ))}
              {limits.pitZones.map((z) => (
                <path key={z.id} d={polyPath(z.polygon)} className="plan-line plan-pit" />
              ))}
              <path d={polyPath(limits.leaseBoundary)} className="plan-line plan-lease" />

              {[...limits.dumpZones, ...limits.pitZones].map((z) => {
                // North edge of the zone rather than its centre: the centre is where the findings are.
                const ys = z.polygon.map((p) => p.y)
                const xs = z.polygon.map((p) => p.x)
                const top = Math.max(...ys)
                const height = top - Math.min(...ys)
                return (
                  <text
                    key={`label-${z.id}`}
                    x={sx((Math.min(...xs) + Math.max(...xs)) / 2)}
                    y={sy(top - height * 0.06)}
                    className="plan-label"
                  >
                    {zoneName(z.id)}
                  </text>
                )
              })}

              {markers
                .filter((m) => m.moved)
                .map(({ f, at }) => (
                  <line
                    key={`leader-${f.id}`}
                    x1={sx(f.centroid.x)}
                    y1={sy(f.centroid.y)}
                    x2={sx(x0 + (at.x / size.w) * extent)}
                    y2={sy(top - (at.y / size.h) * north)}
                    className="plan-leader"
                    style={{ stroke: TONE_COLOR[toneOf(f)] }}
                  />
                ))}
            </svg>

            {markers.map(({ f, at }) => {
              const tone = toneOf(f)
              const Glyph = GLYPH[tone]
              return (
                <button
                  key={f.id}
                  type="button"
                  className="plan-pin"
                  aria-pressed={selectedFinding === f.id}
                  aria-label={`${f.id}, ${RULE_NAMES[f.ruleId]}, ${f.status}, ${f.severity} severity. Show on the map`}
                  style={{
                    left: `${(at.x / size.w) * 100}%`,
                    top: `${(at.y / size.h) * 100}%`,
                    color: TONE_COLOR[tone],
                  }}
                  onClick={() => open(f)}
                >
                  <span className="plan-pin-id">{f.id}</span>
                  <Glyph className="plan-pin-glyph" />
                </button>
              )
            })}
          </div>

          {/* Title block: scale and north in the margin, at a size that does not shrink with the map. */}
          <div className="plan-band" aria-hidden="true">
            <span className="plan-scale">
              <span className="plan-scale-label">{SCALE_BAR_M} m</span>
              <span
                className="plan-scale-bar"
                style={{ width: size.w ? `${(SCALE_BAR_M / extent) * size.w}px` : 0 }}
              />
            </span>
            <span className="plan-north">
              <svg viewBox="0 0 24 34">
                <path d="M12 0L24 30L12 22L0 30Z" />
              </svg>
              N
            </span>
          </div>
        </div>

        <figcaption className="plan-key">
          <span>
            <i className="plan-swatch" style={{ background: OVERLAY.cut }} />
            Excavated
          </span>
          <span>
            <i className="plan-swatch" style={{ background: OVERLAY.fill }} />
            Filled
          </span>
          <span>
            <i className="plan-swatch plan-swatch-line" />
            Lease boundary
          </span>
          <span>
            <i className="plan-swatch plan-swatch-dash" />
            Permitted extents
          </span>
          <span>
            <i className="plan-swatch plan-swatch-contour" />
            {CONTOUR_M} m contours
          </span>
        </figcaption>
        <p className="mt-2 text-[12px] leading-5 text-ink-faint">
          Contours and the change layer come from the current survey; a finding is outlined over the
          cells it covers. Change is shown only where it beats the survey noise. Select a pin to
          open that finding on the 3D map.
        </p>
      </figure>
    </section>
  )
}
