import { useId, useState } from 'react'
import { combinedSigma, isSignificant, K } from '../../compliance/uncertainty'

const PRESETS = [
  { label: 'Drone surveys with ground control', s1: 0.05, s2: 0.05, change: 0.4 },
  { label: 'Global elevation models', s1: 4, s2: 4, change: 6 },
]

const m = (v: number) => `${v < 1 ? v.toFixed(2) : v.toFixed(1)} m`

/** Try the 2σ rule: when is a measured change bigger than the noise of two surveys? */
export function NoiseCheck() {
  const [s1, setS1] = useState(0.05)
  const [s2, setS2] = useState(0.05)
  const [change, setChange] = useState(0.4)
  const id = useId()

  const sigma = combinedSigma(s1, s2)
  const threshold = K * sigma
  const real = isSignificant(change, s1, s2)
  // Number line runs from 0 to whichever is larger, with headroom.
  const max = Math.max(change, threshold) * 1.35 || 1
  const pct = (v: number) => `${Math.min(100, (v / max) * 100)}%`

  return (
    <section className="mx-auto max-w-[1200px] px-6 py-20 lg:py-28">
      <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="reveal">
          <h2 className="cond text-[clamp(38px,4.4vw,58px)] leading-[0.95] font-bold text-ink">
            When is a change real?
          </h2>
          <p className="mt-5 max-w-[26rem] text-[16px] leading-7 text-ink-dim">
            Every survey has error. Compare two of them and their errors add up: σ = √(σ1² + σ2²).
            PitWatch only reports a change larger than {K}σ. Move the sliders to see where that line
            falls.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className="btn"
                onClick={() => {
                  setS1(p.s1)
                  setS2(p.s2)
                  setChange(p.change)
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="noise reveal">
          <Slider
            id={`${id}-s1`}
            label="Baseline survey error (σ1)"
            value={s1}
            max={5}
            step={0.01}
            onChange={setS1}
          />
          <Slider
            id={`${id}-s2`}
            label="Current survey error (σ2)"
            value={s2}
            max={5}
            step={0.01}
            onChange={setS2}
          />
          <Slider
            id={`${id}-c`}
            label="Measured change in ground height"
            value={change}
            max={12}
            step={0.01}
            onChange={setChange}
          />

          {/* Number line: shaded band is what noise alone could produce. */}
          <div className="mt-8" aria-hidden="true">
            <div className="noise-line">
              <div className="noise-band" style={{ width: pct(threshold) }}>
                <span>could be noise</span>
              </div>
              <div className={`noise-marker ${real ? 'real' : ''}`} style={{ left: pct(change) }} />
            </div>
            <div className="mt-2 flex justify-between font-mono text-[11px] text-ink-faint">
              <span>0 m</span>
              <span>{m(max)}</span>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-3 gap-px border border-line bg-line">
            <div className="bg-panel p-3">
              <dt className="text-[12px] text-ink-faint">Combined σ</dt>
              <dd className="cond text-[24px] font-bold text-ink">{m(sigma)}</dd>
            </div>
            <div className="bg-panel p-3">
              <dt className="text-[12px] text-ink-faint">Threshold ({K}σ)</dt>
              <dd className="cond text-[24px] font-bold text-ink">{m(threshold)}</dd>
            </div>
            <div className="bg-panel p-3">
              <dt className="text-[12px] text-ink-faint">Verdict</dt>
              <dd
                className={`cond text-[24px] font-bold ${real ? 'text-violation' : 'text-ink-dim'}`}
                aria-live="polite"
              >
                {real ? 'Real change' : 'Could be noise'}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  )
}

function Slider({
  id,
  label,
  value,
  max,
  step,
  onChange,
}: {
  id: string
  label: string
  value: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <div className="mt-5 first:mt-0">
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-[14px] text-ink-dim">
          {label}
        </label>
        <output htmlFor={id} className="font-mono text-[13px] text-ink">
          {m(value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range mt-2 w-full"
      />
    </div>
  )
}
