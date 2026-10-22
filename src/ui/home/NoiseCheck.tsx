import { useId, useState } from 'react'
import { changeThreshold } from '../../compliance/change'
import { COMPLIANCE_CONFIG } from '../../compliance/config'
import { combinedSigma } from '../../compliance/uncertainty'

const PRESETS = [
  { label: 'Drone surveys with ground control', s1: 0.05, s2: 0.05, change: 0.4 },
  { label: 'Global elevation models', s1: 4, s2: 4, change: 6 },
]

const m = (v: number) => `${v < 1 ? v.toFixed(2) : v.toFixed(1)} m`

/**
 * Two lines have to be cleared before a change is reported: the noise band (k·σ) and the
 * smallest change worth reporting on top of it (minChangeM + k·σ, the engine's own threshold).
 * The depth rule R2 is a different test and is explained on its own.
 */
export function NoiseCheck() {
  const [s1, setS1] = useState(0.05)
  const [s2, setS2] = useState(0.05)
  const [change, setChange] = useState(0.4)
  const id = useId()

  const cfg = COMPLIANCE_CONFIG
  const sigma = combinedSigma(s1, s2)
  // The engine's own helper, so this page cannot drift from the reported findings.
  const reportableFrom = changeThreshold(sigma, cfg)
  const noiseBand = cfg.k * sigma
  const size = Math.abs(change)
  const verdict = size <= noiseBand ? 'noise' : size <= reportableFrom ? 'between' : 'reportable'
  // Number line runs from 0 to the further of the two, with headroom.
  const max = Math.max(size, reportableFrom) * 1.3 || 1
  const pct = (v: number) => `${Math.min(100, (v / max) * 100)}%`

  return (
    <section aria-labelledby="noise-title" className="rule-section">
      <div className="grid gap-10 xl:grid-cols-[0.8fr_1.2fr] xl:gap-14">
        <div>
          <h2 id="noise-title" className="section-title">
            When is a change reportable?
          </h2>
          <p className="mt-3 max-w-[30rem] text-[15px] leading-7 text-ink-dim">
            Every survey has error, and comparing two of them adds the errors up: σ = √(σ1² + σ2²).
            A change must clear two lines before R1 and R3 report it: the noise band ({cfg.k}σ),
            then the smallest change worth reporting on top of that ({cfg.minChangeM} m + {cfg.k}σ).
            Move the sliders to see where both lines fall.
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

        <div className="noise">
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

          {/* Number line: the shaded band is what noise alone could produce, the dashed
              rule is where R1 and R3 start reporting. */}
          <div className="mt-8" aria-hidden="true">
            <div className="noise-line">
              <div className="noise-band" style={{ width: pct(noiseBand) }} />
              <div className="noise-limit" style={{ left: pct(reportableFrom) }} />
              <div
                className={`noise-marker ${verdict === 'reportable' ? 'real' : ''}`}
                style={{ left: pct(size) }}
              />
            </div>
            <div className="mt-2 flex justify-between font-mono text-[11px] text-ink-faint">
              <span>0 m</span>
              <span>{m(max)}</span>
            </div>
            <p className="mt-1 font-mono text-[11px] leading-4 text-ink-faint">
              shaded: noise band ({cfg.k}σ) · dashed: R1/R3 threshold ({cfg.minChangeM} m + {cfg.k}
              σ)
            </p>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-px border border-line bg-line lg:grid-cols-3">
            <div className="bg-panel p-3">
              <dt className="text-[12px] text-ink-faint">Combined σ</dt>
              <dd className="cond text-[24px] font-bold text-ink">{m(sigma)}</dd>
            </div>
            <div className="bg-panel p-3">
              <dt className="text-[12px] text-ink-faint">Noise band ({cfg.k}σ)</dt>
              <dd className="cond text-[24px] font-bold text-ink">{m(noiseBand)}</dd>
            </div>
            <div className="bg-panel p-3">
              <dt className="text-[12px] text-ink-faint">
                R1/R3 threshold ({cfg.minChangeM} m + {cfg.k}σ)
              </dt>
              <dd className="cond col-span-2 text-[24px] font-bold text-ink lg:col-span-1">
                {m(reportableFrom)}
              </dd>
            </div>
          </dl>

          <p
            role="status"
            className={`mt-4 text-[14px] leading-6 ${
              verdict === 'reportable' ? 'text-violation' : 'text-ink-dim'
            }`}
          >
            {verdict === 'noise' && (
              <>
                <strong className="font-semibold">Could be survey noise.</strong> {m(size)} is
                inside the ±{m(noiseBand)} noise band, so no rule reports it.
              </>
            )}
            {verdict === 'between' && (
              <>
                <strong className="font-semibold">
                  Distinguishable from the noise, not reportable.
                </strong>{' '}
                {m(size)} is larger than the ±{m(noiseBand)} the surveys could produce by
                themselves, but below the {m(reportableFrom)} R1/R3 threshold.
              </>
            )}
            {verdict === 'reportable' && (
              <>
                <strong className="font-semibold">Reportable under R1 and R3.</strong> {m(size)}{' '}
                clears the {m(reportableFrom)} threshold, so the rules test it against the permit.
              </>
            )}
          </p>

          <p className="mt-2 text-[13px] leading-6 text-ink-faint">
            The depth rule is not on this line. R2 compares the ground with the approved pit floor
            using the current survey's own uncertainty ({cfg.k}σ2 = {m(cfg.k * s2)}) and no
            minimum-change allowance, so a floor breach a few centimetres deep is still a warning.
          </p>
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
