import { useEffect, useMemo, useRef, type CSSProperties } from 'react'
import { MINE_INFO, SURVEY_EPOCHS } from '../../data/fixtures/mine'
import { SURFACE_KEY } from '../../data/orthophoto'
import { useCameraState } from '../../scene/cameraState'
import { rampGradient } from '../../scene/palette'
import { scaleBar, type ViewPreset } from '../../scene/presets'
import { elevationRange } from '../../scene/terrainGeometry'
import { EXAGGERATION, useAppStore } from '../../state/store'
import { useTerrain } from '../../state/terrain'
import { formatDate, formatLat, formatLon } from '../format'
import { ProvenanceTag } from '../ProvenanceTag'

const delay = (s: number) => ({ '--d': `${s}s` }) as CSSProperties

/** Map-sheet title block: what the view is showing. */
export function TitleBlock() {
  const current = SURVEY_EPOCHS[1]
  const m = MINE_INFO
  return (
    <section
      aria-label="Sheet details"
      className="hud-sheet enter-down absolute top-4 left-4 hidden w-[236px] xl:block"
      style={delay(1)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="cond text-[16px] leading-tight font-bold text-ink">{m.name}</div>
        <ProvenanceTag value="simulated" />
      </div>
      <div className="text-[11.5px] text-ink-dim">{m.mineral}</div>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 border-t border-line pt-2 text-[11px]">
        <dt className="text-ink-faint">Showing</dt>
        <dd className="text-ink">
          {current?.label} survey,{' '}
          <span className="font-mono">{current && formatDate(current.date)}</span>
        </dd>
        <dt className="text-ink-faint">Origin</dt>
        <dd className="font-mono text-ink">
          {formatLat(m.originLatLon.lat)}, {formatLon(m.originLatLon.lon)}
        </dd>
      </dl>
    </section>
  )
}

const PRESETS: { id: ViewPreset; label: string }[] = [
  { id: 'oblique', label: 'Oblique' },
  { id: 'top', label: 'Top' },
  { id: 'pit', label: 'Pit' },
]

/** Compass (turns with the camera; click to face north) and preset camera views. */
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
    <div className="enter-down absolute top-4 right-4 flex items-start gap-2" style={delay(1.1)}>
      <div role="group" aria-label="Camera view" className="seg hud-shadow">
        {PRESETS.map((p) => (
          <button key={p.id} type="button" onClick={() => requestView(p.id)}>
            {p.label}
          </button>
        ))}
      </div>
      <button
        ref={button}
        type="button"
        className="compass-btn hud-shadow"
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

/** Elevation key built from the loaded survey, plus the contour interval. */
export function TerrainLegend() {
  const survey = useTerrain((s) => s.surveys.current)
  const contours = useAppStore((s) => s.layers.contours)
  const tintOn = useAppStore((s) => s.layers.tint)
  const range = useMemo(() => survey && elevationRange(survey.elevations), [survey])
  if (!survey || !range) return null
  const sigma = survey.verticalUncertainty
  const tint = tintOn || !survey.orthophoto

  return (
    <section
      aria-label="Map legend"
      className="hud-sheet enter-up absolute bottom-4 left-4 hidden w-[236px] md:block"
      style={delay(1.2)}
    >
      <div className="flex items-baseline justify-between">
        <h3 className="cond text-[14px] font-semibold text-ink">
          {tint ? 'Elevation' : 'Surface'}
        </h3>
        <ProvenanceTag value="simulated" />
      </div>
      {tint ? (
        <>
          <div className="mt-2 h-2.5 border border-line" style={{ background: rampGradient() }} />
          <div className="mt-1 flex justify-between font-mono text-[11px] text-ink">
            <span>{range.min.toFixed(1)} m</span>
            <span>{range.max.toFixed(1)} m</span>
          </div>
        </>
      ) : (
        <>
          <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
            {SURFACE_KEY.map((k) => (
              <li key={k.label} className="flex items-center gap-1.5 text-[11px] text-ink-dim">
                <span
                  className="h-2.5 w-2.5 shrink-0 border border-line"
                  style={{ background: `rgb(${k.rgb.join(' ')})` }}
                  aria-hidden="true"
                />
                {k.label}
              </li>
            ))}
          </ul>
          <div className="mt-1.5 text-[11px] text-ink-faint">
            Simulated aerial image draped on the survey
          </div>
        </>
      )}
      <div className="mt-1 text-[11px] text-ink-faint">
        Elevation {range.min.toFixed(1)}–{range.max.toFixed(1)} m RL, ± {sigma.toFixed(2)} m (1σ)
      </div>
      {contours && (
        <div className="mt-2 flex items-center gap-2 border-t border-line pt-2 text-[11px] text-ink-dim">
          <svg viewBox="0 0 28 10" className="h-2.5 w-7 shrink-0" aria-hidden="true">
            <path d="M0 3H28" stroke="var(--color-ink)" strokeOpacity="0.35" strokeWidth="1" />
            <path d="M0 8H28" stroke="var(--color-ink)" strokeOpacity="0.7" strokeWidth="1.6" />
          </svg>
          Contours 5 m, bold every 25 m
        </div>
      )}
    </section>
  )
}

/** Scale bar at the view centre and the vertical exaggeration slider. */
export function ScaleAndExaggeration() {
  const exaggeration = useAppStore((s) => s.exaggeration)
  const setExaggeration = useAppStore((s) => s.setExaggeration)
  const bar = useRef<HTMLDivElement>(null)
  const label = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const draw = ({ metresPerPixel }: { metresPerPixel: number }) => {
      const s = scaleBar(metresPerPixel)
      if (bar.current) bar.current.style.width = `${s.px}px`
      if (label.current)
        label.current.textContent = `${s.metres >= 1000 ? `${s.metres / 1000} km` : `${s.metres} m`}`
    }
    draw(useCameraState.getState())
    return useCameraState.subscribe(draw)
  }, [])

  return (
    <section
      aria-label="Scale and vertical exaggeration"
      className="hud-sheet enter-up absolute right-4 bottom-4 w-[216px]"
      style={delay(1.3)}
    >
      <div className="flex items-end justify-between gap-3" aria-hidden="true">
        <div ref={bar} className="scale-bar" />
        <span className="text-right text-[11px] leading-tight text-ink-faint">
          <span ref={label} className="block font-mono text-[12px] text-ink" />
          at view centre
        </span>
      </div>
      <div className="mt-3 flex items-baseline justify-between border-t border-line pt-2">
        <label htmlFor="exaggeration" className="text-[12px] text-ink-dim">
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
    </section>
  )
}

/** Shown while the surfaces are generated or the 3D engine downloads, or if loading failed. */
export function SceneStatus({ error, label }: { error?: string; label: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center" role="status">
      <div className="hud-sheet w-[260px] text-center">
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
