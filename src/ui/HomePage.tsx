import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { SURVEY_EPOCHS } from '../data/fixtures/mine'
import { loop, ticks, toPath } from './contours'
import { daysBetween, formatDate, monthTicks } from './format'
import { PitMark } from './icons'
import { ProvenanceTag } from './ProvenanceTag'
import { MONITOR_HREF } from './route'
import { NorthArrow, Relief } from './schematic'

/*
 * The home page is one scroll story told on a pinned map:
 * baseline survey -> current survey -> measured change -> permit check -> monitor.
 * Everything on the map is an illustration, not survey data.
 */

const [BASELINE, CURRENT] = SURVEY_EPOCHS
const DAYS = BASELINE && CURRENT ? daysBetween(BASELINE.date, CURRENT.date) : 0
const MONTHS = BASELINE && CURRENT ? monthTicks(BASELINE.date, CURRENT.date) : []

/* ---------- Map geometry (illustration) ---------- */

const BENCHES = Array.from({ length: 8 }, (_, i) => {
  const s = 1 - i / 8.6
  const cx = -40 + i * 4
  const cy = i * 3
  const pts = loop(cx, cy, 170 * s, 118 * s, [
    [0.06, 2, 0.8 + i * 0.12],
    [0.04, 3, 2.1 - i * 0.1],
    [0.02, 5, 0.3 + i * 0.25],
  ])
  return { d: toPath(pts), ticks: ticks(pts, cx, cy, 6, 5), index: i % 3 === 0 }
})
const RIM = BENCHES[0]!.d
const LEASE = 'M-265 -178 L196 -186 L206 176 L-256 182 Z'
const OUTSIDE_LEASE = `M-400 -300 H400 V300 H-400 Z ${LEASE}`

const STEPS = [
  'Start',
  'Baseline survey',
  'Current survey',
  'Measured change',
  'Permit check',
  'Monitor',
] as const

export function HomePage() {
  const [step, setStep] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)

  // The step whose block crosses a line 65% down the screen drives the map (below the pinned map on phones).
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setStep(Number((e.target as HTMLElement).dataset.step))
        }
      },
      { root, rootMargin: '-65% 0px -35% 0px' },
    )
    root.querySelectorAll('[data-step]').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  const on = (n: number) => (step >= n ? 'on' : '')

  return (
    <div ref={rootRef} className="home h-full overflow-y-auto">
      {/* Floating corner marks instead of a nav bar. */}
      <a href="#/" className="home-brand" aria-label="PitWatch home">
        <span className="brand-mark">
          <PitMark className="h-5 w-5" />
        </span>
        <span className="cond text-[20px] font-bold text-ink">PitWatch</span>
      </a>
      <div className="home-corner">
        <span className="stamp hidden sm:inline-flex">
          <span className="stamp-dot" aria-hidden="true" />
          SIMULATED DATA
        </span>
        <a href={MONITOR_HREF} className="btn-primary">
          Open the monitor
        </a>
      </div>

      <div className="story">
        {/* ---------- Pinned map ---------- */}
        <div className="story-stage" aria-hidden="true">
          <Relief className="opacity-70" />
          <div className="story-frame neatline">
            <NorthArrow className="absolute top-5 right-5 hidden sm:block" />

            <svg viewBox="-285 -205 570 410" className="story-map">
              <defs>
                <pattern
                  id="hatch-cut"
                  width="7"
                  height="7"
                  patternUnits="userSpaceOnUse"
                  patternTransform="rotate(45)"
                >
                  <rect width="7" height="7" fill="var(--color-oxide)" fillOpacity="0.14" />
                  <path
                    d="M0 0V7"
                    stroke="var(--color-oxide)"
                    strokeWidth="2"
                    strokeOpacity="0.7"
                  />
                </pattern>
                <pattern
                  id="hatch-breach"
                  width="6"
                  height="6"
                  patternUnits="userSpaceOnUse"
                  patternTransform="rotate(-45)"
                >
                  <rect width="6" height="6" fill="var(--color-violation)" fillOpacity="0.3" />
                  <path d="M0 0V6" stroke="var(--color-violation)" strokeWidth="2.4" />
                </pattern>
                {/* New ground = current rim minus baseline rim. */}
                <mask
                  id="cut-mask"
                  maskUnits="userSpaceOnUse"
                  x="-400"
                  y="-300"
                  width="800"
                  height="600"
                >
                  <g className={`grow ${on(2)}`}>
                    <path d={RIM} fill="white" />
                  </g>
                  <path d={RIM} fill="black" />
                </mask>
                <clipPath id="outside-lease">
                  <path d={OUTSIDE_LEASE} clipRule="evenodd" />
                </clipPath>
              </defs>

              {/* Measured change. */}
              <rect
                x="-400"
                y="-300"
                width="800"
                height="600"
                fill="url(#hatch-cut)"
                mask="url(#cut-mask)"
                className={`fade ${on(3)}`}
              />

              {/* The pit: baseline shape, grows to the current survey. */}
              <g className={`grow ${on(2)}`}>
                {BENCHES.map((b, i) => (
                  <g key={i} style={{ '--i': i } as CSSProperties}>
                    <path
                      d={b.d}
                      pathLength={1}
                      className={`draw ${b.index ? 'bench bench-index' : 'bench'}`}
                    />
                    <path d={b.ticks} className="bench-ticks" />
                  </g>
                ))}
              </g>

              {/* Ghost of the baseline rim once the pit has grown. */}
              <path d={RIM} className={`ghost-rim fade ${on(2)}`} />

              {/* Lease boundary and the part of the cut that crosses it. */}
              <path d={LEASE} pathLength={1} className={`lease ${on(4)}`} />
              <rect
                x="-400"
                y="-300"
                width="800"
                height="600"
                fill="url(#hatch-breach)"
                mask="url(#cut-mask)"
                clipPath="url(#outside-lease)"
                className={`fade ${on(4)}`}
              />
              <g className={`breach-mark ${on(4)}`} transform="translate(262 -12)">
                <circle r="11" className="ping" />
                <path
                  d="M-4.1 -10 H4.1 L10 -4.1 V4.1 L4.1 10 H-4.1 L-10 4.1 V-4.1 Z"
                  fill="var(--color-panel)"
                  stroke="var(--color-violation)"
                  strokeWidth="2"
                />
                <path d="M-4 -4 L4 4 M4 -4 L-4 4" stroke="var(--color-violation)" strokeWidth="2" />
              </g>

              <text x="-40" y="-150" className={`plan-label fade ${on(2)}`}>
                baseline rim
              </text>
              <text x="-180" y="-188" className={`plan-label fade ${on(4)}`}>
                lease boundary
              </text>
            </svg>

            {/* Survey clock: where in time the map is. */}
            <div className="story-clock">
              <div className="flex items-baseline justify-between text-[12px]">
                <span className={step >= 2 ? 'text-ink-faint' : 'font-semibold text-ink'}>
                  {BASELINE && formatDate(BASELINE.date)}
                </span>
                <span className="cond text-[14px] font-semibold text-ink-dim">
                  {DAYS} days between surveys
                </span>
                <span className={step >= 2 ? 'font-semibold text-ink' : 'text-ink-faint'}>
                  {CURRENT && formatDate(CURRENT.date)}
                </span>
              </div>
              <div className="relative mt-2 h-4">
                <div className="track absolute inset-x-0 top-2" />
                {MONTHS.map((m) => (
                  <span
                    key={m.label}
                    className="absolute top-1 h-2 w-px bg-ink-faint"
                    style={{ left: `${m.t * 100}%` }}
                  />
                ))}
                <span className={`clock-marker ${on(2)}`} />
              </div>
            </div>
          </div>
        </div>

        {/* ---------- Scrolling text ---------- */}
        <div className="story-steps">
          <section data-step="0" className={`story-step story-intro ${step === 0 ? 'active' : ''}`}>
            <h1 className="cond rise text-[clamp(64px,10vw,150px)] leading-[0.85] font-bold text-ink">
              Pit
              <br />
              Watch
            </h1>
            <p className="rise rise-2 mt-6 max-w-[26rem] text-[19px] leading-7 text-ink-dim">
              Compare two surveys of an open-pit mine and see, on the map, where the digging broke
              its permit.
            </p>
            <div className="rise rise-3 scroll-cue mt-10">Scroll to compare the surveys</div>
          </section>

          <Step
            n={1}
            step={step}
            label={`${BASELINE?.label} survey, ${BASELINE && formatDate(BASELINE.date)}`}
            title="First, the ground as it was."
          >
            A drone survey records the pit surface: every bench, ramp and floor, to within a few
            centimetres.
          </Step>

          <Step
            n={2}
            step={step}
            label={`${CURRENT?.label} survey, ${CURRENT && formatDate(CURRENT.date)}`}
            title="Then, the ground as it is."
          >
            The same grid surveyed again {DAYS} days later. The pit has pushed east, and its old rim
            is left behind as a ghost line.
          </Step>

          <Step n={3} step={step} label="Measured change" title="Subtract one from the other.">
            Where the two surfaces differ by more than twice their combined uncertainty, rock was
            really removed. Anything smaller could be survey noise, so it is ignored.
          </Step>

          <Step n={4} step={step} label="Permit check" title="Hold it against the permit.">
            PitWatch checks three things: digging outside the lease or its safety buffer, digging
            below the approved floor, and dumping outside permitted zones. Here the new cut crosses
            the lease line.
            <span className="mt-4 block text-[13px] text-ink-faint">
              Illustration. The rule engine is still being built.
            </span>
          </Step>

          <section data-step="5" className={`story-step ${step === 5 ? 'active' : ''}`}>
            <div className="step-label">The monitor</div>
            <h2 className="cond mt-3 text-[clamp(38px,4.6vw,60px)] leading-[0.95] font-bold text-ink">
              Venthar Ridge is waiting.
            </h2>
            <p className="mt-4 max-w-[30rem] text-[17px] leading-7 text-ink-dim">
              The mine is fictional and every survey is synthetic. Each value in the monitor says
              where it came from:
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <ProvenanceTag value="measured" />
              <ProvenanceTag value="derived" />
              <ProvenanceTag value="simulated" />
              <ProvenanceTag value="unverified" />
            </div>
            <a href={MONITOR_HREF} className="btn-primary btn-lg mt-9 self-start">
              Open the monitor
            </a>
          </section>
        </div>
      </div>

      {/* Depth gauge: which part of the story the map shows. */}
      <ol className="story-gauge" aria-hidden="true">
        {STEPS.map((s, i) => (
          <li key={s} className={i === step ? 'on' : ''}>
            {s}
          </li>
        ))}
      </ol>
    </div>
  )
}

function Step({
  n,
  step,
  label,
  title,
  children,
}: {
  n: number
  step: number
  label: string
  title: string
  children: ReactNode
}) {
  return (
    <section data-step={n} className={`story-step ${step === n ? 'active' : ''}`}>
      <div className="step-label">{label}</div>
      <h2 className="cond mt-3 text-[clamp(34px,4vw,52px)] leading-[0.98] font-bold text-ink">
        {title}
      </h2>
      <p className="mt-4 max-w-[30rem] text-[17px] leading-7 text-ink-dim">{children}</p>
    </section>
  )
}
