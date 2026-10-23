import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type SVGProps,
} from 'react'
import { COMPLIANCE_CONFIG } from '../compliance/config'
import type { RuleId } from '../domain/types'
import { SURVEY_EPOCHS } from '../data/fixtures/mine'
import { tweenStory, useStory } from '../state/story'
import { useTerrain } from '../state/terrain'
import { countText, GLYPH, worstTone } from './findings'
import { daysBetween, formatDate } from './format'
import { StoryClock } from './home/StoryClock'
import { ArrowRightIcon, BoundaryIcon, FloorIcon, PitMark, TerrainIcon } from './icons'
import { MONITOR_HREF, OVERVIEW_HREF, ROUTE_HREF } from './route'
import { Relief } from './schematic'
import { SceneErrorBoundary } from './viewport/SceneErrorBoundary'

/*
 * The landing page: what PitWatch does, shown on the live 3D model of the simulated surveys,
 * and one click into the dashboard. The model is driven by four buttons, and the sections
 * below it are wired back to the model, so the page reads as one piece.
 */

// three.js is large; fetch it only for the landing model.
const HomeScene = lazy(() => import('../scene/HomeScene'))

const [BASELINE, CURRENT] = SURVEY_EPOCHS
const DAYS = BASELINE && CURRENT ? daysBetween(BASELINE.date, CURRENT.date) : 0

/** What the model shows. `id` is the scene step: 1 baseline, 2 current, 3 change, 4 findings. */
const VIEWS = [
  {
    id: 1,
    label: 'Baseline',
    sub: BASELINE ? formatDate(BASELINE.date) : '',
    t: 0,
    title: `Baseline survey, ${BASELINE ? formatDate(BASELINE.date) : ''}`,
    text: 'The ground as it was: every bench, ramp and floor of the pit, from a drone survey.',
  },
  {
    id: 2,
    label: 'Current',
    sub: CURRENT ? formatDate(CURRENT.date) : '',
    t: 1,
    title: `Current survey, ${CURRENT ? formatDate(CURRENT.date) : ''}`,
    text: `The same ground ${DAYS} days later. The west wall has been pushed back, a new cut has opened on the east side and the floor is a bench deeper.`,
  },
  {
    id: 3,
    label: 'Change',
    sub: 'the difference',
    t: 1,
    title: 'Measured change',
    text: 'Rust where rock was removed, blue where material was added. Anything that does not clear the survey noise plus the minimum-change allowance is ignored.',
  },
  {
    id: 4,
    label: 'Findings',
    sub: 'vs the permit',
    t: 1,
    title: 'Held against the permit',
    text: 'Each pin is ground the engine classifies as breaking the lease in this simulated scenario. Red cells are violations, purple the most severe ones, amber cells warnings.',
  },
] as const

type View = (typeof VIEWS)[number]

/** The method, in order. Each step can be shown on the model above. */
const STEPS: { title: string; text: string; view: View }[] = [
  {
    title: 'Survey the ground twice',
    text: `A drone maps the pit surface on two dates, ${DAYS} days apart, to within a few centimetres.`,
    view: VIEWS[0],
  },
  {
    title: 'Keep only real change',
    text: `Subtract one survey from the other. A change counts only when it is bigger than the survey noise: more than ${COMPLIANCE_CONFIG.minChangeM} m plus ${COMPLIANCE_CONFIG.k}σ.`,
    view: VIEWS[2],
  },
  {
    title: 'Check it against the permit',
    text: 'Every changed cell is tested against the lease. Failures become findings, ranked by how serious they are.',
    view: VIEWS[3],
  },
]

const RULES: {
  rule: RuleId
  Icon: ComponentType<SVGProps<SVGSVGElement>>
  title: string
  text: string
}[] = [
  {
    rule: 'R1',
    Icon: BoundaryIcon,
    title: 'Stay inside the lease',
    text: 'No ground may be excavated outside the lease boundary, or inside the safety buffer along its inner edge.',
  },
  {
    rule: 'R2',
    Icon: FloorIcon,
    title: 'Stop at the approved floor',
    text: 'The pit may not be taken deeper than the floor level approved on the mine plan.',
  },
  {
    rule: 'R3',
    Icon: TerrainIcon,
    title: 'Dump only where allowed',
    text: 'Waste rock may only be placed inside the dump zones approved in the mine plan.',
  },
]

const PROVENANCE = ['measured', 'derived', 'simulated', 'unverified'] as const

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function HomePage() {
  const [view, setView] = useState<View['id']>(4)
  // The model only renders while it is on screen.
  const [stageVisible, setStageVisible] = useState(true)
  const stageRef = useRef<HTMLDivElement>(null)
  const findings = useTerrain((s) => s.findings)
  const status = useTerrain((s) => s.status)
  const error = useTerrain((s) => s.error)
  const retry = useTerrain((s) => s.retry)
  const ready = status === 'ready'
  const current = VIEWS.find((v) => v.id === view)!

  // The first view is the findings on the current survey, so the model starts at "current".
  useEffect(() => {
    useStory.setState({ t: 1 })
  }, [])

  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setStageVisible(e!.isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const show = (next: View) => {
    setView(next.id)
    tweenStory(next.t)
  }

  /** Switches the model and brings it into view, so a step below answers on the screen above. */
  const showOnModel = (next: View) => {
    show(next)
    stageRef.current?.scrollIntoView({
      block: 'center',
      behavior: reducedMotion() ? 'auto' : 'smooth',
    })
  }

  const goTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({
      block: 'start',
      behavior: reducedMotion() ? 'auto' : 'smooth',
    })

  return (
    <div className="landing h-full overflow-y-auto">
      <header className="landing-bar">
        <a href={ROUTE_HREF.home} className="landing-brand" aria-label="PitWatch home">
          <span className="brand-mark">
            <PitMark className="h-6 w-[38px]" />
          </span>
          <span className="cond text-[22px] font-bold text-ink">PitWatch</span>
        </a>
        <nav aria-label="On this page" className="landing-nav">
          <button type="button" onClick={() => goTo('how')}>
            How it works
          </button>
          <button type="button" onClick={() => goTo('checks')}>
            What it checks
          </button>
          <a href={MONITOR_HREF} className="max-lg:hidden">
            3D map
          </a>
          <a href={ROUTE_HREF.about} className="max-lg:hidden">
            About the data
          </a>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="sim-note">Simulated data</span>
          <a href={OVERVIEW_HREF} className="btn-primary max-sm:hidden">
            Open the dashboard
          </a>
        </div>
      </header>

      <main id="content" tabIndex={-1}>
        <section className="hero">
          <div className="hero-copy">
            <h1 className="cond hero-title">See where a simulated mine breaks its permit.</h1>
            <p className="mt-6 max-w-[34rem] text-[18px] leading-8 text-ink-dim max-sm:hidden">
              PitWatch compares two drone surveys of an open-pit mine in 3D and checks every change
              against the lease: the boundary, the approved depth and the permitted dump zones.
            </p>
            {/* One line long, so the model and both calls to action share the phone's first screen. */}
            <p className="mt-6 max-w-[34rem] text-[18px] leading-7 text-ink-dim sm:hidden">
              Two drone surveys of one pit, compared in 3D against the lease.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={OVERVIEW_HREF} className="btn-primary btn-lg">
                Open the dashboard
              </a>
              <a href={MONITOR_HREF} className="btn btn-lg">
                Explore the 3D map
              </a>
            </div>

            {status === 'error' && (
              <div role="alert" className="load-card mt-8 max-w-[28rem]">
                <p className="cond text-[18px] font-bold text-violation">Surveys unavailable</p>
                <p className="mt-1 text-[13.5px] leading-6 text-ink-dim">
                  The simulated surveys could not be built: {error}
                </p>
                <button type="button" className="btn mt-3" onClick={() => void retry()}>
                  Try again
                </button>
              </div>
            )}

            <dl className="hero-facts">
              <div>
                <dt>Between the two surveys</dt>
                <dd>{DAYS} days</dd>
              </div>
              <div>
                <dt>Permit rules checked</dt>
                <dd>3</dd>
              </div>
              <div>
                <dt>Result</dt>
                <dd>{ready ? countText(findings) : 'Building the surveys…'}</dd>
              </div>
            </dl>
          </div>

          <div ref={stageRef} className="hero-stage">
            <Relief className="opacity-60" />
            <div className="hero-model" aria-hidden="true">
              {ready ? (
                <SceneErrorBoundary
                  fallback={() => <p className="plan-status">The 3D model could not start.</p>}
                >
                  <Suspense fallback={<p className="plan-status">Loading the 3D model…</p>}>
                    <HomeScene step={view} active={stageVisible} />
                  </Suspense>
                </SceneErrorBoundary>
              ) : status === 'error' ? (
                <p className="plan-status">The simulated surveys could not be built.</p>
              ) : (
                <p className="plan-status">Building the simulated surveys…</p>
              )}
            </div>

            <p className="model-hint" aria-hidden="true">
              Drag to turn
            </p>
            <div className="hero-controls">
              <div role="group" aria-label="What the model shows" className="seg seg-fill">
                {VIEWS.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    aria-pressed={v.id === view}
                    onClick={() => show(v)}
                  >
                    <span className="seg-step" aria-hidden="true">
                      {v.id}
                    </span>
                    <span className="seg-label">{v.label}</span>
                    <span className="seg-sub">{v.sub}</span>
                  </button>
                ))}
              </div>
              <div role="status" className="mt-3">
                <h2 className="cond text-[17px] font-bold text-ink">{current.title}</h2>
                <p className="mt-1 text-[13.5px] leading-6 text-ink-dim">{current.text}</p>
              </div>
              <StoryClock />
            </div>
          </div>
        </section>

        <section id="how" aria-labelledby="how-title" className="landing-section">
          <div className="landing-inner">
            <div className="landing-head">
              <h2 id="how-title" className="cond section-big">
                From two surveys to a verdict
              </h2>
              <p>
                Three steps, the same ones the dashboard runs. Each can be shown on the model above.
              </p>
            </div>
            <ol className="step-list">
              {STEPS.map((s, i) => (
                <li key={s.title} className="step">
                  <span className="step-n cond" aria-hidden="true">
                    {i + 1}
                  </span>
                  <h3 className="cond text-[24px] leading-tight font-bold text-ink">{s.title}</h3>
                  <p className="mt-2 text-[15px] leading-7 text-ink-dim">{s.text}</p>
                  <button type="button" className="link-arrow" onClick={() => showOnModel(s.view)}>
                    Show on the model
                    <ArrowRightIcon className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          id="checks"
          aria-labelledby="checks-title"
          className="landing-section landing-band"
        >
          <div className="landing-inner">
            <div className="landing-head">
              <h2 id="checks-title" className="cond section-big">
                Three conditions in every mining lease
              </h2>
              <p>
                PitWatch tests every 8 m cell of the ground against each one. The result under each
                rule is what the engine found on this mine.
              </p>
            </div>
            <ol className="rule-rows">
              {RULES.map(({ rule, Icon, title, text }) => {
                const own = findings.filter((f) => f.ruleId === rule)
                const tone = own.length ? worstTone(own) : 'clear'
                const Glyph = tone === 'clear' ? null : GLYPH[tone]
                return (
                  <li key={rule} className="rule-row">
                    <span className="rule-id cond" aria-hidden="true">
                      {rule}
                    </span>
                    <div>
                      <h3 className="cond flex items-center gap-3 text-[26px] leading-tight font-bold text-ink">
                        <Icon className="h-5 w-5 shrink-0 text-accent" />
                        {title}
                      </h3>
                      <p className="mt-2 max-w-[38rem] text-[15px] leading-7 text-ink-dim">
                        {text}
                      </p>
                    </div>
                    <p
                      className={`rule-result-line ${ready ? `tone-${tone}` : ''}`}
                      aria-live="polite"
                    >
                      {ready ? (
                        <>
                          {Glyph ? (
                            <Glyph className="h-[18px] w-[18px]" />
                          ) : (
                            <span className="status-led" data-tone="clear" aria-hidden="true" />
                          )}
                          {own.length ? countText(own) : 'Clear'}
                        </>
                      ) : (
                        'Evaluating…'
                      )}
                    </p>
                  </li>
                )
              })}
            </ol>
            <a href={ROUTE_HREF.rules} className="link-arrow mt-10">
              How each rule is tested
              <ArrowRightIcon className="h-4 w-4" />
            </a>
          </div>
        </section>

        <section aria-labelledby="close-title" className="landing-close">
          <div className="landing-inner">
            <div className="close-grid">
              <div>
                <h2 id="close-title" className="cond close-title">
                  Open the dashboard and look for yourself.
                </h2>
                <div className="mt-8 flex flex-wrap gap-3">
                  <a href={OVERVIEW_HREF} className="btn-light btn-lg">
                    Open the dashboard
                  </a>
                  <a href={MONITOR_HREF} className="btn-outline-light btn-lg">
                    Explore the 3D map
                  </a>
                </div>
              </div>
              <div className="close-note">
                <p className="text-[16px] leading-7">
                  Everything here is simulated, and it says so. Venthar Ridge and Ardent Ore Works
                  are fictional, and both surveys are generated from a fixed seed. Findings point an
                  inspector at places to look; they do not prove a breach.
                </p>
                <p className="mt-5 text-[14px]">
                  Every value carries a tag for where it came from:
                </p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {PROVENANCE.map((p) => (
                    <li key={p} className="chip-dark">
                      {p}
                    </li>
                  ))}
                </ul>
                <a href={ROUTE_HREF.about} className="link-arrow-light mt-5">
                  About the data
                  <ArrowRightIcon className="h-4 w-4" />
                </a>
              </div>
            </div>
            <div className="close-foot">
              <span className="brand-mark">
                <PitMark className="h-5 w-8" />
              </span>
              <span>PitWatch, permit compliance monitoring for open-pit mines.</span>
              <nav aria-label="Legal" className="close-links">
                <a href={ROUTE_HREF.terms}>Terms and Conditions</a>
                <a href={ROUTE_HREF.license}>License</a>
                <a href={ROUTE_HREF.contact}>Contact</a>
              </nav>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
