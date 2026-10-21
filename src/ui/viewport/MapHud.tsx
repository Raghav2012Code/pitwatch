import { useEffect, useMemo, useRef, type CSSProperties } from 'react'
import { SURFACE_KEY } from '../../data/orthophoto'
import { useCameraState } from '../../scene/cameraState'
import { COMPLIANCE_CONFIG } from '../../compliance/config'
import { OVERLAY, rampGradient } from '../../scene/palette'
import { scaleBar, type ViewPreset } from '../../scene/presets'
import { elevationScale } from '../../scene/terrainGeometry'
import { EXAGGERATION, useAppStore } from '../../state/store'
import { measureOnSurface } from '../../geo/measure'
import { useTerrain } from '../../state/terrain'
import { GLYPH } from '../findings'

const delay = (s: number) => ({ '--d': `${s}s` }) as CSSProperties

const PRESETS: { id: ViewPreset; label: string }[] = [
  { id: 'oblique', label: 'Oblique' },
  { id: 'top', label: 'Top' },
  { id: 'pit', label: 'Pit' },
]

/** Preset camera views and a compass that turns with the camera (click to face north). */
export function ViewControls() {
  const requestView = useAppStore((s) => s.requestView)
  const needle = useRef<SVGGElement>(null)
  const button = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const draw = ({ heading }: { heading: number }) => {
      needle.current?.setAttribute('transform', `rotate(${-heading})`)
      button.current?.setAttribute('title', `Heading ${Math.round(heading)}°. Click to face north.`)
    }
    draw(useCameraState.getState())
    return useCameraState.subscribe(draw)
  }, [])

  return (
    <div className="enter-down absolute top-4 right-4 flex items-start gap-2" style={delay(1)}>
      <div role="group" aria-label="Camera view" className="seg">
        {PRESETS.map((p) => (
          <button key={p.id} type="button" onClick={() => requestView(p.id)}>
            {p.label}
          </button>
        ))}
      </div>
      <button
        ref={button}
        type="button"
        className="compass-btn"
        aria-label="Compass. Click to face north"
        onClick={() => requestView('north')}
      >
        <svg viewBox="-20 -20 40 40" className="h-full w-full" aria-hidden="true">
          <circle r="18.5" className="compass-ring" />
          <g ref={needle}>
            <path d="M0 -14 L5 2 L0 -1 L-5 2 Z" className="compass-north" />
            <path d="M0 14 L5 -2 L0 1 L-5 -2 Z" className="compass-south" />
            <text y="-6.5" className="compass-n" transform="translate(0 -9.5)">
              N
            </text>
          </g>
        </svg>
      </button>
    </div>
  )
}

/** Chooses what a click on the terrain does, with a one-line prompt for the current step. */
export function ToolControls() {
  const tool = useAppStore((s) => s.tool)
  const setTool = useAppStore((s) => s.setTool)
  const a = useAppStore((s) => s.measureA)
  const b = useAppStore((s) => s.measureB)
  const picked = useAppStore((s) => s.picked)
  const clearPicks = useAppStore((s) => s.clearPicks)
  const survey = useTerrain((s) => s.surveys.current)

  const m = survey && a && b ? measureOnSurface(survey.grid, survey.elevations, a, b) : null
  let hint = 'Click the terrain to read a point.'
  if (tool === 'measure') {
    hint = !a ? 'Click point A.' : !b ? 'Click point B.' : ''
  } else if (picked) {
    hint = 'Point read. See Inspector.'
  }
  const anything = tool === 'measure' ? Boolean(a) : Boolean(picked)

  return (
    <div
      className="enter-down absolute top-[60px] left-4 flex flex-col items-start gap-2"
      style={delay(1.3)}
    >
      <div role="group" aria-label="Click tool" className="seg">
        <button type="button" aria-pressed={tool === 'inspect'} onClick={() => setTool('inspect')}>
          Inspect
        </button>
        <button
          type="button"
          aria-pressed={tool === 'measure'}
          aria-keyshortcuts="M"
          onClick={() => setTool('measure')}
        >
          Measure
        </button>
      </div>
      <div className="map-chip flex items-center gap-2 text-[11.5px] text-ink-dim" role="status">
        {m ? (
          <span className="font-mono text-ink">
            {m.horizontalDistance.toFixed(0)} m across, {m.dz >= 0 ? '+' : '−'}
            {Math.abs(m.dz).toFixed(1)} m
          </span>
        ) : (
          hint
        )}
        {anything && (
          <button
            type="button"
            className="text-accent underline underline-offset-2"
            onClick={clearPicks}
          >
            Clear
          </button>
        )}
      </div>
    </div>
  )
}

/** Key for whichever colouring is on: the aerial image's surfaces or the elevation ramp. */
/** Ramp positions labelled in the key. */
const KEY_TICKS = [0, 0.25, 0.5, 0.75, 1]

export function MapKey() {
  const survey = useTerrain((s) => s.surveys.current)
  const tintOn = useAppStore((s) => s.layers.tint)
  const contours = useAppStore((s) => s.layers.contours)
  const scale = useMemo(() => survey && elevationScale(survey.elevations), [survey])
  if (!survey || !scale) return null
  const tint = tintOn || !survey.orthophoto

  return (
    <div>
      {tint ? (
        <>
          <div className="h-2 rounded-[1px]" style={{ background: rampGradient() }} />
          <div className="mt-1 flex justify-between font-mono text-[11px] text-ink-dim">
            {KEY_TICKS.map((t) => (
              <span key={t}>{scale.at(t).toFixed(0)}</span>
            ))}
          </div>
          <p className="mt-1.5 text-[11.5px] leading-4 text-ink-faint">
            Elevation, m RL. Colours are spread by how much ground lies at each height, so the
            plateau shows its relief too.
          </p>
        </>
      ) : (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          {SURFACE_KEY.map((k) => (
            <li key={k.label} className="flex items-center gap-2 text-[12px] text-ink-dim">
              <span
                className="h-3 w-3 shrink-0 rounded-[2px]"
                style={{ background: `rgb(${k.rgb.join(' ')})` }}
                aria-hidden="true"
              />
              {k.label}
            </li>
          ))}
        </ul>
      )}
      {contours && (
        <div className="mt-2 text-[11.5px] text-ink-faint">Contours every 5 m, bold every 25 m</div>
      )}
      {!tint && (
        <p className="mt-2 text-[11.5px] leading-4 text-ink-faint">
          Simulated aerial image draped on the survey surface.
        </p>
      )}
    </div>
  )
}

/** Key for the permit, change and finding overlays that are switched on. */
export function OverlayKey() {
  const layers = useAppStore((s) => s.layers)
  const limits = useTerrain((s) => s.limits)
  const change = useTerrain((s) => s.change)
  const onCurrent = useAppStore((s) => s.epoch === 'current')
  if (!limits || !change) return null
  const rows: { key: string; swatch: React.ReactNode; label: string }[] = []
  // White map lines sit on a dark chip so they stay visible on the pale panel.
  const swatch = (inner: React.CSSProperties) => (
    <span
      className="flex h-3 w-5 shrink-0 items-center rounded-[2px] px-0.5"
      style={{ background: 'color-mix(in srgb, var(--color-ink) 62%, transparent)' }}
    >
      <span className="w-full" style={{ height: 0, ...inner }} />
    </span>
  )
  const line = (opacity: number, h: number) =>
    swatch({ borderTop: `${h}px solid ${OVERLAY.lease}`, opacity })
  if (layers.lease) rows.push({ key: 'lease', swatch: line(1, 3), label: 'Lease boundary' })
  if (layers.buffer) {
    rows.push({
      key: 'buffer',
      swatch: line(0.7, 1.5),
      label: `Safety buffer (${limits.safetyBufferMetres} m)`,
    })
  }
  if (layers.zones) {
    const dashed = (dash: string) => swatch({ borderTop: `2px ${dash} ${OVERLAY.lease}` })
    rows.push(
      {
        key: 'pit',
        swatch: dashed('dashed'),
        label: `Pit zone (floor ${limits.pitZones[0].approvedFloorElevation} m RL)`,
      },
      { key: 'dump', swatch: dashed('dotted'), label: 'Dump zone' },
    )
  }
  if (layers.change && onCurrent) {
    const box = (c: string) => (
      <span className="h-3 w-3 shrink-0 rounded-[2px]" style={{ background: c }} />
    )
    rows.push(
      { key: 'cut', swatch: box(OVERLAY.cut), label: 'Excavated' },
      { key: 'fill', swatch: box(OVERLAY.fill), label: 'Filled' },
    )
  }
  if (layers.findings && onCurrent) {
    for (const [tone, label] of [
      ['warning', 'Warning'],
      ['violation', 'Violation'],
      ['critical', 'Critical'],
    ] as const) {
      const Glyph = GLYPH[tone]
      rows.push({
        key: tone,
        swatch: <Glyph className="h-4 w-4 shrink-0" style={{ color: OVERLAY[tone] }} />,
        label,
      })
    }
  }
  if (!rows.length) return null
  return (
    <div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center gap-2 text-[12px] text-ink-dim">
            {r.swatch}
            {r.label}
          </li>
        ))}
      </ul>
      {layers.change && onCurrent && (
        <p className="mt-2 text-[11.5px] leading-4 text-ink-faint">
          Change is shown only where it exceeds {COMPLIANCE_CONFIG.minChangeM} m plus{' '}
          {COMPLIANCE_CONFIG.k}σ (σ ±{change.sigma.toFixed(2)} m). Other ground is dimmed.
        </p>
      )}
      {layers.findings && onCurrent && (
        <p className="mt-2 text-[11.5px] leading-4 text-ink-faint">
          Coloured cells and pins come from the rule engine, not from hand-placed marks.
        </p>
      )}
    </div>
  )
}

export function ExaggerationSlider() {
  const exaggeration = useAppStore((s) => s.exaggeration)
  const setExaggeration = useAppStore((s) => s.setExaggeration)
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor="exaggeration" className="text-[12.5px] text-ink-dim">
          Vertical exaggeration
        </label>
        <output htmlFor="exaggeration" className="font-mono text-[12px] text-ink">
          {exaggeration.toFixed(1)}×
        </output>
      </div>
      <input
        id="exaggeration"
        type="range"
        min={EXAGGERATION.min}
        max={EXAGGERATION.max}
        step={0.1}
        value={exaggeration}
        onChange={(e) => setExaggeration(Number(e.target.value))}
        className="range mt-1.5 w-full"
      />
    </div>
  )
}

/** Live scale bar, measured at the centre of the view. */
export function ScaleBar() {
  const bar = useRef<HTMLDivElement>(null)
  const label = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const draw = ({ metresPerPixel }: { metresPerPixel: number }) => {
      const s = scaleBar(metresPerPixel, 110)
      if (bar.current) bar.current.style.width = `${s.px}px`
      if (label.current) {
        label.current.textContent = s.metres >= 1000 ? `${s.metres / 1000} km` : `${s.metres} m`
      }
    }
    draw(useCameraState.getState())
    return useCameraState.subscribe(draw)
  }, [])

  // Decorative, so it never takes a click. Below `xl` the stage is too narrow to hold this chip
  // and the camera group in one row, so it drops under the timeline instead of covering a button.
  return (
    <div
      className="map-chip enter-down pointer-events-none absolute top-4 left-4 flex items-center gap-2.5 max-xl:top-auto max-xl:bottom-24"
      style={delay(1.2)}
      aria-hidden="true"
    >
      <div ref={bar} className="scale-bar" />
      <span className="text-[11px] whitespace-nowrap text-ink-dim">
        <span ref={label} className="font-mono text-ink" /> at centre
      </span>
    </div>
  )
}

/** Shown while the surfaces are generated or the 3D engine downloads, or if loading failed. */
export function SceneStatus({ error, label }: { error?: string; label: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center" role={error ? 'alert' : 'status'}>
      <div className="card w-[260px] p-4 text-center">
        {error ? (
          <>
            <div className="cond text-[17px] font-bold text-violation">Terrain unavailable</div>
            <p className="mt-1 text-[12.5px] leading-5 text-ink-dim">{error}</p>
          </>
        ) : (
          <>
            <div className="cond text-[17px] font-bold text-ink">{label}</div>
            <div className="loading-strata mt-3" aria-hidden="true" />
          </>
        )}
      </div>
    </div>
  )
}
