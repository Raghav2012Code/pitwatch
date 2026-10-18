import { useMemo } from 'react'
import { BASELINE_PIT } from '../../data/fixtures/scenario'
import { roundOutline } from '../../data/synthetic'
import type { ComplianceFinding, GridSpec, Orthophoto, Polygon } from '../../domain/types'
import { useTerrain } from '../../state/terrain'
import { toneOf } from '../findings'

/*
 * The home-page map, drawn from the same simulated surveys the monitor uses: the two
 * aerial images, the measured change and the rule engine's findings. SVG user units are
 * local metres with y flipped (north up).
 */

/** Part of the grid shown: the lease and the pit, local metres. */
const VIEW = { x0: 200, x1: 1840, y0: 360, y1: 1560 }
const VIEWBOX = `${VIEW.x0} ${-VIEW.y1} ${VIEW.x1 - VIEW.x0} ${VIEW.y1 - VIEW.y0}`

const path = (poly: Polygon) =>
  `M${poly.map((p) => `${p.x.toFixed(1)} ${(-p.y).toFixed(1)}`).join(' L')} Z`

const BASELINE_RIM = path(roundOutline(BASELINE_PIT.outline))

/** RGBA rows (row 0 = south) to an image URL with north at the top. */
function toUrl(width: number, height: number, rgba: Uint8ClampedArray | Uint8Array, type: string) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  const img = ctx.createImageData(width, height)
  const row = width * 4
  for (let r = 0; r < height; r++) {
    img.data.set(rgba.subarray(r * row, (r + 1) * row), (height - 1 - r) * row)
  }
  ctx.putImageData(img, 0, 0)
  return canvas.toDataURL(type, 0.86)
}

const photoUrl = (o: Orthophoto) => toUrl(o.width, o.height, o.rgba, 'image/jpeg')

/** One pixel per grid cell, coloured where `paint` returns a colour. */
function cellsUrl(g: GridSpec, paint: (i: number) => readonly number[] | null) {
  const rgba = new Uint8ClampedArray(g.cols * g.rows * 4)
  for (let i = 0; i < g.cols * g.rows; i++) {
    const c = paint(i)
    if (c) rgba.set(c, i * 4)
  }
  return toUrl(g.cols, g.rows, rgba, 'image/png')
}

const CUT = [176, 68, 42, 215] as const
const FILL = [38, 104, 170, 215] as const
const BREACH = [196, 30, 38, 235] as const

/** Image covering the grid's cell squares (centres span 0..(n − 1)·size). */
function GridImage({ g, href, className }: { g: GridSpec; href: string; className?: string }) {
  const half = g.cellSize / 2
  const w = g.cols * g.cellSize
  const h = g.rows * g.cellSize
  return (
    <image
      href={href}
      x={g.originXY.x - half}
      y={-(g.originXY.y - half + h)}
      width={w}
      height={h}
      preserveAspectRatio="none"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    />
  )
}

/** Photo covering exactly the cell-centre extent, as the orthophoto is sampled. */
function PhotoImage({ g, href, className }: { g: GridSpec; href: string; className?: string }) {
  const w = (g.cols - 1) * g.cellSize
  const h = (g.rows - 1) * g.cellSize
  return (
    <image
      href={href}
      x={g.originXY.x}
      y={-(g.originXY.y + h)}
      width={w}
      height={h}
      preserveAspectRatio="none"
      className={className}
    />
  )
}

function Marker({ f, className }: { f: ComplianceFinding; className: string }) {
  const tone = toneOf(f)
  const color =
    tone === 'critical'
      ? 'var(--color-critical)'
      : tone === 'violation'
        ? 'var(--color-violation)'
        : 'var(--color-warn)'
  const shape =
    tone === 'warning'
      ? 'M0 -21 L19 15 H-19 Z'
      : tone === 'critical'
        ? 'M0 -21 L21 0 L0 21 L-21 0 Z'
        : 'M-8 -19 H8 L19 -8 V8 L8 19 H-8 L-19 8 V-8 Z'
  return (
    // Position on the outer group, animation on the inner one, so the pop-in scales
    // around the marker rather than the map origin.
    <g transform={`translate(${f.centroid.x} ${-f.centroid.y})`}>
      <g className={className}>
        {f.status === 'violation' && <circle r="30" className="ping" style={{ stroke: color }} />}
        <path d={shape} fill="var(--color-panel)" stroke={color} strokeWidth="3.5" />
      </g>
    </g>
  )
}

export function SurveyPlan({ step }: { step: number }) {
  const status = useTerrain((s) => s.status)
  const surveys = useTerrain((s) => s.surveys)
  const change = useTerrain((s) => s.change)
  const findings = useTerrain((s) => s.findings)
  const limits = useTerrain((s) => s.limits)
  const on = (n: number) => (step >= n ? 'on' : '')

  const images = useMemo(() => {
    const { baseline, current } = surveys
    if (!baseline?.orthophoto || !current?.orthophoto || !change) return null
    const breach = new Set(
      findings.filter((f) => f.ruleId === 'R1' && f.status === 'violation').flatMap((f) => f.cells),
    )
    return {
      grid: current.grid,
      baseline: photoUrl(baseline.orthophoto),
      current: photoUrl(current.orthophoto),
      change: cellsUrl(current.grid, (i) =>
        change.excavated[i] ? CUT : change.filled[i] ? FILL : null,
      ),
      breach: cellsUrl(current.grid, (i) => (breach.has(i) ? BREACH : null)),
    }
  }, [surveys, change, findings])

  if (status === 'error') {
    return (
      <div className="plan-box">
        <p className="plan-status">The simulated surveys could not be built.</p>
      </div>
    )
  }
  if (!images || !limits) {
    return (
      <div className="plan-box">
        <p className="plan-status">Building the simulated surveys…</p>
      </div>
    )
  }
  const g = images.grid

  return (
    // The box clips; the SVG may draw past its viewBox so the photo fills the whole box.
    <div className="plan-box">
      <svg viewBox={VIEWBOX} className="survey-plan" preserveAspectRatio="xMidYMid meet">
        <PhotoImage g={g} href={images.baseline} />
        <PhotoImage g={g} href={images.current} className={`fade ${on(2)}`} />

        {/* Measured change: rust where rock was removed, blue where material was added. */}
        <g className={`fade ${on(3)}`}>
          <rect x={-500} y={-2548} width={3048} height={3048} className="plan-veil" />
          <GridImage g={g} href={images.change} />
        </g>

        <path
          d={BASELINE_RIM}
          className={`ghost-rim fade ${on(2)}`}
          vectorEffect="non-scaling-stroke"
        />

        {/* The permit: lease line, the cut beyond it, and every finding the engine made. */}
        <path
          d={path(limits.leaseBoundary)}
          pathLength={1}
          className={`lease ${on(4)}`}
          vectorEffect="non-scaling-stroke"
        />
        <GridImage g={g} href={images.breach} className={`fade ${on(4)}`} />
        {findings.map((f) => (
          <Marker key={f.id} f={f} className={`breach-mark ${on(4)}`} />
        ))}

        <text x={760} y={-1300} className={`plan-label fade ${on(2)}`}>
          baseline rim
        </text>
        <text x={1250} y={-1420} className={`plan-label fade ${on(4)}`}>
          lease boundary
        </text>
      </svg>
    </div>
  )
}
