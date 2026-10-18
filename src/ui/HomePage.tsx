import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { SURVEY_EPOCHS } from '../data/fixtures/mine'
import { daysBetween, formatDate, monthTicks } from './format'
import { PitMark } from './icons'
import { ProvenanceTag } from './ProvenanceTag'
import { WorkerTerrainProvider } from '../data/WorkerTerrainProvider'
import { useTerrain } from '../state/terrain'
import { countText } from './findings'
import { MONITOR_HREF } from './route'
import { NoiseCheck } from './home/NoiseCheck'
import { PermitSheet } from './home/PermitSheet'
import { Resolution } from './home/Resolution'
import { SceneErrorBoundary } from './viewport/SceneErrorBoundary'
import { Relief } from './schematic'

/*
 * The home page is one scroll story told on a pinned map:
 * baseline survey -> current survey -> measured change -> permit check -> monitor.
 * The map is the 3D model of the simulated surveys, coloured by the rule engine's output.
 */

// three.js is large; fetch it only for the home model.
const HomeScene = lazy(() => import('../scene/HomeScene'))

const [BASELINE, CURRENT] = SURVEY_EPOCHS
const DAYS = BASELINE && CURRENT ? daysBetween(BASELINE.date, CURRENT.date) : 0
const MONTHS = BASELINE && CURRENT ? monthTicks(BASELINE.date, CURRENT.date) : []

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
  const findings = useTerrain((s) => s.findings)
  const ready = useTerrain((s) => s.status === 'ready')

  // Build the same simulated surveys the monitor uses (once, in a worker).
  useEffect(() => {
    void useTerrain.getState().load(new WorkerTerrainProvider())
  }, [])

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

    // Sections below the story rise into view once.
    const reveal = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          e.target.classList.add('shown')
          reveal.unobserve(e.target)
        }
      },
      { root, rootMargin: '0px 0px -15% 0px' },
    )
    root.querySelectorAll('.reveal').forEach((el) => reveal.observe(el))

    return () => {
      io.disconnect()
      reveal.disconnect()
    }
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
          <div className="story-frame">
            <div className="plan-box">
              {ready ? (
                <SceneErrorBoundary
                  fallback={() => <p className="plan-status">The 3D model could not start.</p>}
                >
                  <Suspense fallback={<p className="plan-status">Loading the 3D model…</p>}>
                    <HomeScene step={step} />
                  </Suspense>
                </SceneErrorBoundary>
              ) : (
                <p className="plan-status">Building the simulated surveys…</p>
              )}
            </div>

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
            The same grid surveyed again {DAYS} days later. The west wall has been pushed back, a
            new cut has opened on the east side and the floor is a bench deeper. The old rim stays
            as a dashed line.
          </Step>

          <Step n={3} step={step} label="Measured change" title="Subtract one from the other.">
            Where the two surfaces differ by more than half a metre plus twice their combined
            uncertainty, something really changed: rust where rock was removed, blue where material
            was added. Anything smaller could be survey noise, so it is ignored.
          </Step>

          <Step n={4} step={step} label="Permit check" title="Hold it against the permit.">
            PitWatch checks three things: digging outside the lease or its safety buffer, digging
            below the approved floor, and dumping outside permitted zones. Each pin is a finding;
            red cells are violations, amber cells warnings. Here the east cut crosses the lease
            line.
            <span className="mt-4 block text-[13px] text-ink-faint">
              {ready
                ? `This is the rule engine's result on the simulated surveys: ${countText(findings).toLowerCase()}.`
                : 'The rule engine runs as soon as the surveys are built.'}
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
          {/* Depth gauge: which part of the story the map shows. */}
          <ol className="story-gauge" aria-hidden="true">
            {STEPS.map((s, i) => (
              <li key={s} className={i === step ? 'on' : ''}>
                {s}
              </li>
            ))}
          </ol>
        </div>
      </div>

      <PermitSheet />
      <NoiseCheck />
      <Resolution />

      <footer className="home-footer">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-end justify-between gap-6 px-6 py-14">
          <div>
            <div className="cond text-[40px] leading-none font-bold text-ink">PitWatch</div>
            <p className="mt-3 max-w-[30rem] text-[14px] leading-6 text-ink-dim">
              A demo. Venthar Ridge, Ardent Ore Works and every survey here are fictional and
              synthetic. Findings point inspectors at places to look; they do not prove a breach.
            </p>
          </div>
          <a href={MONITOR_HREF} className="btn-primary btn-lg">
            Open the monitor
          </a>
        </div>
      </footer>
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
