import { useMemo, type KeyboardEvent } from 'react'
import type { ComplianceFinding, Polygon, Vec2 } from '../../domain/types'
import { OVERLAY, TONE_COLOR } from '../../scene/palette'
import { useAppStore } from '../../state/store'
import { useTerrain } from '../../state/terrain'
import { GLYPH, RULE_NAMES, toneOf } from '../findings'
import { ProvenanceTag } from '../ProvenanceTag'
import { navigate } from '../route'

/** Marker size in metres on the plan (about 24 px at the width the Overview gives it). */
const PIN = 104
const SCALE_BAR_M = 500
/** Smoothing factor for the change mask: output pixels per grid cell. */
const SMOOTH = 6

/**
 * Pins nudge away from each other so two nearby findings (R1-1 and R1-2 sit 30 m apart) can both
 * be read and clicked. A nudged pin keeps a leader line back to the spot it marks.
 */
function placePins(findings: readonly ComplianceFinding[]) {
  const placed: { f: ComplianceFinding; at: Vec2; moved: boolean }[] = []
  const tries = [
    [0, 0],
    [1, -1],
    [-1, -1],
    [1, 1],
    [-1, 1],
    [0, -1.4],
    [1.5, 0],
    [-1.5, 0],
  ]
  for (const f of findings) {
    for (const [dx, dy] of tries) {
      const at = { x: f.centroid.x + dx! * PIN, y: f.centroid.y + dy! * PIN }
      if (placed.every((p) => Math.hypot(p.at.x - at.x, p.at.y - at.y) >= PIN * 0.95)) {
        placed.push({ f, at, moved: dx !== 0 || dy !== 0 })
        break
      }
    }
  }
  return placed
}

/**
 * The mine from above: lease, permitted zones, the cells that changed beyond the noise and a pin
 * per finding. Drawn from the same data and engine output as the 3D map, so it can never
 * disagree with it, and every pin opens that finding on the map.
 */
export function SitePlan() {
  const change = useTerrain((s) => s.change)
  const limits = useTerrain((s) => s.limits)
  const findings = useTerrain((s) => s.findings)
  const selectedFinding = useAppStore((s) => s.selectedFinding)
  const selectFinding = useAppStore((s) => s.selectFinding)

  // The change mask, smoothed: each class is drawn one pixel per cell, enlarged with bilinear
  // filtering and cut at half strength, so its edge is a clean curve rather than a staircase.
  const image = useMemo(() => {
    if (!change) return null
    const { cols, rows } = change.grid
    const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
    const out = document.createElement('canvas')
    out.width = cols * SMOOTH
    out.height = rows * SMOOTH
    const outCtx = out.getContext('2d')
    if (!outCtx) return null
    const result = outCtx.createImageData(out.width, out.height)
    const layer = (cells: ArrayLike<number | boolean>, colour: number[]) => {
      const small = document.createElement('canvas')
      small.width = cols
      small.height = rows
      const sctx = small.getContext('2d')
      const big = document.createElement('canvas')
      big.width = out.width
      big.height = out.height
      const bctx = big.getContext('2d')
      if (!sctx || !bctx) return
      const mask = sctx.createImageData(cols, rows)
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          // Row 0 is the southern edge, and the top of the picture is north.
          if (cells[row * cols + col]) mask.data[((rows - 1 - row) * cols + col) * 4 + 3] = 255
        }
      }
      sctx.putImageData(mask, 0, 0)
      bctx.imageSmoothingEnabled = true
      bctx.imageSmoothingQuality = 'high'
      bctx.drawImage(small, 0, 0, big.width, big.height)
      const px = bctx.getImageData(0, 0, big.width, big.height).data
      for (let i = 0; i < px.length; i += 4) {
        const edge = Math.min(1, Math.max(0, (px[i + 3]! - 96) / 64))
        if (edge > 0) {
          result.data.set([...colour, Math.round(235 * edge)], i)
        }
      }
    }
    layer(change.excavated, rgb(OVERLAY.cut))
    layer(change.filled, rgb(OVERLAY.fill))
    outCtx.putImageData(result, 0, 0)
    return out.toDataURL()
  }, [change])

  const pins = useMemo(() => placePins(findings), [findings])

  if (!change || !limits) return null
  const g = change.grid
  const x0 = g.originXY.x - g.cellSize / 2
  const W = g.cols * g.cellSize
  const H = g.rows * g.cellSize
  const top = g.originXY.y + (g.rows - 1) * g.cellSize + g.cellSize / 2
  const sx = (x: number) => x
  const sy = (y: number) => top - y
  const path = (poly: Polygon) =>
    poly.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join('') + 'Z'

  const open = (f: ComplianceFinding) => {
    selectFinding(f.id, f.centroid)
    navigate('monitor')
  }
  const onKey = (e: KeyboardEvent, f: ComplianceFinding) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    open(f)
  }

  return (
    <section aria-labelledby="site-plan" className="rule-section">
      <div className="flex items-center justify-between gap-3">
        <h2 id="site-plan" className="section-title">
          Site plan
        </h2>
        <ProvenanceTag value="derived" />
      </div>
      <figure className="mt-3">
        <svg
          viewBox={`${x0} 0 ${W} ${H}`}
          className="site-plan"
          role="group"
          aria-label="Plan of the mine from above, north at the top, with a pin on every finding"
        >
          <rect x={x0} y={0} width={W} height={H} className="plan-ground" />
          {image && (
            <image
              href={image}
              x={x0}
              y={0}
              width={W}
              height={H}
              preserveAspectRatio="none"
              className="plan-change"
            />
          )}
          {limits.dumpZones.map((z) => (
            <path key={z.id} d={path(z.polygon)} className="plan-line plan-dump" />
          ))}
          {limits.pitZones.map((z) => (
            <path key={z.id} d={path(z.polygon)} className="plan-line plan-pit" />
          ))}
          <path d={path(limits.leaseBoundary)} className="plan-line plan-lease" />

          {/* Scale bar and north, in map units. */}
          <g transform={`translate(${x0 + 90} ${H - 90})`} aria-hidden="true">
            <path d={`M0 0H${SCALE_BAR_M}M0 -22V22M${SCALE_BAR_M} -22V22`} className="plan-scale" />
            <text x={SCALE_BAR_M / 2} y={-40} className="plan-text" textAnchor="middle">
              {SCALE_BAR_M} m
            </text>
          </g>
          <g transform={`translate(${x0 + W - 110} 130)`} aria-hidden="true">
            <path d="M0 -70L34 40L0 14L-34 40Z" className="plan-north" />
            <text y={100} className="plan-text" textAnchor="middle">
              N
            </text>
          </g>

          {pins.map(({ f, at, moved }) => {
            const tone = toneOf(f)
            const Glyph = GLYPH[tone]
            const cx = sx(at.x)
            const cy = sy(at.y)
            return (
              <g key={f.id}>
                {moved && (
                  <line
                    x1={sx(f.centroid.x)}
                    y1={sy(f.centroid.y)}
                    x2={cx}
                    y2={cy}
                    className="plan-leader"
                    style={{ stroke: TONE_COLOR[tone] }}
                  />
                )}
                <circle
                  cx={sx(f.centroid.x)}
                  cy={sy(f.centroid.y)}
                  r={PIN * 0.1}
                  style={{ fill: TONE_COLOR[tone] }}
                />
                <g
                  role="button"
                  tabIndex={0}
                  className="plan-pin"
                  aria-pressed={selectedFinding === f.id}
                  aria-label={`${f.id}, ${RULE_NAMES[f.ruleId]}, ${f.status}, ${f.severity} severity. Show on the map`}
                  onClick={() => open(f)}
                  onKeyDown={(e) => onKey(e, f)}
                >
                  <title>{`${f.id}: ${RULE_NAMES[f.ruleId]}`}</title>
                  <circle cx={cx} cy={cy} r={PIN * 0.62} className="plan-pin-disc" />
                  <circle cx={cx} cy={cy} r={PIN * 0.62} className="plan-pin-ring" />
                  <Glyph
                    x={cx - PIN / 2}
                    y={cy - PIN / 2}
                    width={PIN}
                    height={PIN}
                    style={{ color: TONE_COLOR[tone] }}
                  />
                </g>
              </g>
            )
          })}
        </svg>
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
            Permitted zones
          </span>
        </figcaption>
        <p className="mt-2 text-[12px] leading-5 text-ink-faint">
          Pins are the engine&apos;s findings; select one to open it on the 3D map. Change is shown
          only where it beats the survey noise.
        </p>
      </figure>
    </section>
  )
}
