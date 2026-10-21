import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type SVGProps,
} from 'react'
import { SURVEY_EPOCHS } from '../data/fixtures/mine'
import { tweenStory, useStory } from '../state/story'
import { useTerrain } from '../state/terrain'
import { countText } from './findings'
import { daysBetween, formatDate } from './format'
import { StoryClock } from './home/StoryClock'
import { ArrowRightIcon, BoundaryIcon, FloorIcon, PitMark, TerrainIcon } from './icons'
import { ProvenanceTag } from './ProvenanceTag'
import { MONITOR_HREF, OVERVIEW_HREF, ROUTE_HREF } from './route'
import { Relief } from './schematic'
import { SceneErrorBoundary } from './viewport/SceneErrorBoundary'

/*
 * The landing page: what PitWatch does, shown on the live 3D model of the simulated surveys,
 * and one click into the dashboard. The model is driven by four buttons, not by scrolling.
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
    t: 0,
    title: `Baseline survey, ${BASELINE ? formatDate(BASELINE.date) : ''}`,
    text: 'The ground as it was: every bench, ramp and floor of the pit, from a drone survey.',
  },
  {
    id: 2,
    label: 'Current',
    t: 1,
    title: `Current survey, ${CURRENT ? formatDate(CURRENT.date) : ''}`,
    text: `The same ground ${DAYS} days later. The west wall has been pushed back, a new cut has opened on the east side and the floor is a bench deeper.`,
  },
  {
    id: 3,
    label: 'Change',
    t: 1,
    title: 'Measured change',
    text: 'Rust where rock was removed, blue where material was added. Anything smaller than the survey noise is ignored.',
  },
  {
    id: 4,
    label: 'Findings',
    t: 1,
    title: 'Held against the permit',
    text: 'Each pin is a place that breaks the lease. Red cells are violations, purple the most severe ones, amber cells warnings.',
  },
] as const

const RULES: {
  Icon: ComponentType<SVGProps<SVGSVGElement>>
  title: string
  text: string
}[] = [
  {
    Icon: BoundaryIcon,
    title: 'Stay inside the lease',
    text: 'No ground may be excavated outside the lease boundary, or inside the safety buffer along its inner edge.',
  },
  {
    Icon: FloorIcon,
    title: 'Stop at the approved floor',
    text: 'The pit may not be taken deeper than the floor level approved on the mine plan.',
  },
  {
    Icon: TerrainIcon,
    title: 'Dump only where allowed',
    text: 'Waste rock may only be placed inside the dump zones approved in the mine plan.',
  },
]

export function HomePage() {
  const [view, setView] = useState<(typeof VIEWS)[number]['id']>(4)
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

  const show = (next: (typeof VIEWS)[number]) => {
    setView(next.id)
    tweenStory(next.t)
  }

  return (
    <div className="landing h-full overflow-y-auto">
      <header className="landing-bar">
        <a href={ROUTE_HREF.home} className="landing-brand" aria-label="PitWatch home">
          <span className="brand-mark">
            <PitMark className="h-6 w-[38px]" />
          </span>
          <span className="cond text-[22px] font-bold text-ink">PitWatch</span>
        </a>
        <div className="ml-auto flex items-center gap-3">
          <span className="stamp">
            <span className="stamp-dot" aria-hidden="true" />
            SIMULATED DATA
          </span>
          <a href={OVERVIEW_HREF} className="btn-primary max-sm:hidden">
            Open the dashboard
          </a>
        </div>
      </header>

      <main id="content" tabIndex={-1}>
        <section className="hero">
          <div className="hero-copy">
            <h1 className="cond hero-title">See where the digging broke the permit.</h1>
            <p className="mt-6 max-w-[34rem] text-[18px] leading-8 text-ink-dim">
              PitWatch compares two drone surveys of an open-pit mine in 3D and checks every change
              against the lease: the boundary, the approved depth and the permitted dump zones.
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
                <dt>Result on this demo</dt>
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

            <div className="hero-controls">
              <div role="group" aria-label="What the model shows" className="seg seg-fill">
                {VIEWS.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    aria-pressed={v.id === view}
                    onClick={() => show(v)}
                  >
                    {v.label}
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

        <section aria-labelledby="checks" className="landing-section">
          <div className="landing-inner">
            <h2 id="checks" className="cond section-big">
              Three conditions in every mining lease, checked on every cell
            </h2>
            <ul className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-3">
              {RULES.map(({ Icon, title, text }) => (
                <li key={title} className="rule-col">
                  <span className="rule-icon">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="cond mt-4 text-[24px] leading-tight font-bold text-ink">
                    {title}
                  </h3>
                  <p className="mt-2 text-[15px] leading-7 text-ink-dim">{text}</p>
                </li>
              ))}
            </ul>
            <a href={ROUTE_HREF.rules} className="link-arrow mt-8">
              How each rule is tested
              <ArrowRightIcon className="h-4 w-4" />
            </a>
          </div>
        </section>

        <section aria-labelledby="honest" className="landing-section landing-band">
          <div className="landing-inner grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
            <div>
              <h2 id="honest" className="cond section-big">
                Everything here is simulated, and it says so.
              </h2>
              <p className="mt-5 max-w-[32rem] text-[16px] leading-7 text-ink-dim">
                Venthar Ridge and Ardent Ore Works are fictional, and both surveys are generated
                from a fixed seed. Findings point an inspector at places to look; they do not prove
                a breach.
              </p>
            </div>
            <div>
              <p className="text-[15px] leading-7 text-ink-dim">
                Every value in the dashboard carries a tag for where it came from:
              </p>
              <ul className="mt-4 flex flex-wrap gap-2.5">
                <li>
                  <ProvenanceTag value="measured" />
                </li>
                <li>
                  <ProvenanceTag value="derived" />
                </li>
                <li>
                  <ProvenanceTag value="simulated" />
                </li>
                <li>
                  <ProvenanceTag value="unverified" />
                </li>
              </ul>
              <a href={ROUTE_HREF.about} className="link-arrow mt-6">
                About the data
                <ArrowRightIcon className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-inner flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="cond text-[32px] leading-none font-bold text-ink">PitWatch</div>
            <p className="mt-2 text-[13.5px] text-ink-dim">
              A demo of permit compliance monitoring for open-pit mines.
            </p>
          </div>
          <a href={OVERVIEW_HREF} className="btn-primary btn-lg">
            Open the dashboard
          </a>
        </div>
      </footer>
    </div>
  )
}
