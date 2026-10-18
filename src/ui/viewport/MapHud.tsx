import { useEffect, useMemo, useRef, type CSSProperties } from 'react'
import { SURFACE_KEY } from '../../data/orthophoto'
import { useCameraState } from '../../scene/cameraState'
import { rampGradient } from '../../scene/palette'
import { scaleBar, type ViewPreset } from '../../scene/presets'
import { elevationRange } from '../../scene/terrainGeometry'
import { EXAGGERATION, useAppStore } from '../../state/store'
import { useTerrain } from '../../state/terrain'

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

/** Key for whichever colouring is on: the aerial image's surfaces or the elevation ramp. */
export function MapKey() {
  const survey = useTerrain((s) => s.surveys.current)
  const tintOn = useAppStore((s) => s.layers.tint)
  const contours = useAppStore((s) => s.layers.contours)
  const range = useMemo(() => survey && elevationRange(survey.elevations), [survey])
  if (!survey || !range) return null
  const tint = tintOn || !survey.orthophoto

  return (
    <div>
      {tint ? (
        <>
          <div className="h-2 rounded-[1px]" style={{ background: rampGradient() }} />
          <div className="mt-1 flex justify-between font-mono text-[11px] text-ink-dim">
            <span>{range.min.toFixed(0)} m</span>
            <span>RL</span>
            <span>{range.max.toFixed(0)} m</span>
          </div>
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

  return (
    <div
      className="map-chip enter-down absolute top-4 left-4 flex items-center gap-2.5"
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
    <div className="absolute inset-0 grid place-items-center" role="status">
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
