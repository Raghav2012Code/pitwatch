import type { JSX } from 'react'
import type { Provenance } from '../domain/types'
import { CriticalGlyph, PitMark, ViolationGlyph, WarningGlyph } from './icons'
import { ProvenanceTag } from './ProvenanceTag'
import { HOME_HREF, MONITOR_HREF } from './route'
import { NorthArrow, PitPlan, Relief } from './schematic'

const STEPS = [
  {
    title: 'Baseline survey',
    text: 'A drone, LiDAR or DGPS survey records the ground surface at the start of the period.',
    layer: 'var(--layer-1)',
  },
  {
    title: 'Current survey',
    text: 'A second survey of the same ground at the end of the period, on the same grid.',
    layer: 'var(--layer-2)',
  },
  {
    title: 'Measure the change',
    text: 'Subtract one surface from the other to find where rock was removed or dumped. The uncertainty of both surveys is carried through.',
    layer: 'var(--layer-3)',
  },
  {
    title: 'Check it against the permit',
    text: 'Each change is tested against the lease boundary, the approved floor and the permitted dump zones.',
    layer: 'var(--layer-4)',
  },
]

const RULES: { id: string; title: string; text: string; inset: JSX.Element }[] = [
  {
    id: 'R1',
    title: 'Lease boundary',
    text: 'Flags excavation outside the mining lease or inside its safety buffer.',
    inset: (
      <>
        <path d="M14 14 L150 8 L176 74 L24 84 Z" className="inset-lease" />
        <path d="M26 24 L142 19 L163 67 L34 74 Z" className="inset-buffer" />
        <ellipse cx="160" cy="46" rx="34" ry="20" className="inset-cut" />
      </>
    ),
  },
  {
    id: 'R2',
    title: 'Approved depth',
    text: 'Flags pit floor dug deeper than the approved floor level.',
    inset: (
      <>
        <path
          d="M0 20 H36 L52 36 H70 L84 52 H96 L104 72 H132 L140 52 H150 L164 36 H178 L192 20 H200 V92 H0 Z"
          className="inset-ground"
        />
        <rect x="104" y="60" width="28" height="12" className="inset-excess" />
        <path d="M70 60 H166" className="inset-floor" />
      </>
    ),
  },
  {
    id: 'R3',
    title: 'Dumping',
    text: 'Flags waste rock placed outside the permitted dump zones.',
    inset: (
      <>
        <rect x="12" y="16" width="88" height="66" className="inset-zone" />
        <path d="M24 70 Q56 26 88 70 Z" className="inset-mound" />
        <path d="M122 70 Q154 36 186 70 Z" className="inset-mound inset-mound-out" />
      </>
    ),
  },
]

const PROVENANCE: { value: Provenance; text: string }[] = [
  { value: 'measured', text: 'Taken directly from a survey instrument.' },
  { value: 'derived', text: 'Calculated in the app from other values.' },
  { value: 'simulated', text: 'Synthetic, generated for the fictional mine.' },
  { value: 'unverified', text: 'Reported, but not checked against a survey.' },
]

export function HomePage() {
  return (
    <div className="home h-full overflow-y-auto">
      <header className="topbar sticky top-0 z-30">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-6 px-5">
          <a href={HOME_HREF} className="flex items-center gap-3" aria-label="PitWatch home">
            <span className="brand-mark">
              <PitMark className="h-5 w-5" />
            </span>
            <span className="cond text-[22px] font-bold text-ink">PitWatch</span>
          </a>
          <nav aria-label="Sections" className="hidden gap-5 text-[14px] text-ink-dim md:flex">
            <a className="nav-link" href="#how">
              How it works
            </a>
            <a className="nav-link" href="#checks">
              What it checks
            </a>
            <a className="nav-link" href="#data">
              Data
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="stamp hidden sm:inline-flex">
              <span className="stamp-dot" aria-hidden="true" />
              SIMULATED DATA
            </span>
            <a href={MONITOR_HREF} className="btn-primary">
              Open the monitor
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-line">
          <Relief />
          <div className="relative mx-auto grid max-w-[1200px] items-center gap-12 px-5 py-14 lg:grid-cols-[1.05fr_1fr] lg:py-20">
            <div>
              <div className="map-note">Demo with a fictional mine</div>
              <h1 className="cond mt-5 text-[clamp(44px,6.4vw,80px)] leading-[0.94] font-bold tracking-[-0.01em] text-ink">
                Check an open-pit mine against its permit, one survey at a time.
              </h1>
              <p className="mt-6 max-w-[34rem] text-[17px] leading-7 text-ink-dim">
                PitWatch compares two terrain surveys of the same mine, measures what changed, and
                checks every change against the lease boundary, the approved depth and the permitted
                dump zones.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-5">
                <a href={MONITOR_HREF} className="btn-primary btn-lg">
                  Open the monitor
                </a>
                <a href="#how" className="nav-link text-[15px] text-ink">
                  See how it works
                </a>
              </div>
            </div>

            <figure className="plate relative p-6 sm:p-8">
              <NorthArrow className="absolute top-5 right-5" />
              <PitPlan className="w-full" />
              <figcaption className="mt-2 flex items-baseline justify-between gap-4 border-t border-line pt-3 text-[12px] text-ink-faint">
                <span className="cond text-[15px] font-semibold text-ink">
                  Venthar Ridge Iron Pit
                </span>
                <span className="italic">Schematic, not survey data</span>
              </figcaption>
            </figure>
          </div>
        </section>

        <section id="how" className="mx-auto max-w-[1200px] scroll-mt-16 px-5 py-16 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <h2 className="cond text-[40px] leading-none font-bold text-ink">How it works</h2>
              <p className="mt-4 max-w-sm text-[15px] leading-6 text-ink-dim">
                Read it like a drill core: each step rests on the one above it.
              </p>
            </div>
            <ol className="core-log">
              {STEPS.map((s, i) => (
                <li key={s.title}>
                  <span className="core-layer" style={{ background: s.layer }} aria-hidden="true" />
                  <div className="py-5">
                    <h3 className="cond text-[22px] font-semibold text-ink">
                      <span className="mr-3 text-ink-faint">{i + 1}</span>
                      {s.title}
                    </h3>
                    <p className="mt-1.5 max-w-[36rem] text-[15px] leading-6 text-ink-dim">
                      {s.text}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="checks" className="border-y border-line bg-panel">
          <div className="mx-auto max-w-[1200px] scroll-mt-16 px-5 py-16 lg:py-20">
            <h2 className="cond text-[40px] leading-none font-bold text-ink">What it checks</h2>
            <p className="mt-4 max-w-2xl text-[15px] leading-6 text-ink-dim">
              A change only counts when it is larger than twice the combined uncertainty of both
              surveys. Smaller changes could be survey noise, so they are not reported as breaches.
            </p>

            <ul className="mt-10 grid gap-5 md:grid-cols-3">
              {RULES.map((r) => (
                <li key={r.id} className="rule-card">
                  <svg viewBox="0 0 200 92" className="rule-inset" aria-hidden="true">
                    {r.inset}
                  </svg>
                  <div className="p-5">
                    <div className="flex items-baseline gap-3">
                      <span className="font-mono text-[12px] text-oxide">{r.id}</span>
                      <h3 className="cond text-[22px] font-semibold text-ink">{r.title}</h3>
                    </div>
                    <p className="mt-1.5 text-[14.5px] leading-6 text-ink-dim">{r.text}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3 text-[14px]">
              <span className="text-ink-dim">Findings are graded:</span>
              <span className="flex items-center gap-2 text-warn">
                <WarningGlyph className="h-[18px] w-[18px]" /> Warning
              </span>
              <span className="flex items-center gap-2 text-violation">
                <ViolationGlyph className="h-[18px] w-[18px]" /> Violation
              </span>
              <span className="flex items-center gap-2 text-critical">
                <CriticalGlyph className="h-[18px] w-[18px]" /> Critical
              </span>
            </div>
            <p className="mt-4 text-[13px] text-ink-faint">
              The rule engine is still being built. The monitor shows each check once it works.
            </p>
          </div>
        </section>

        <section id="data" className="mx-auto max-w-[1200px] scroll-mt-16 px-5 py-16 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <h2 className="cond text-[40px] leading-none font-bold text-ink">
                Every number says where it came from
              </h2>
              <p className="mt-4 max-w-sm text-[15px] leading-6 text-ink-dim">
                Measured values are shown with their uncertainty, and each one carries a tag for its
                source.
              </p>
            </div>
            <dl className="divide-y divide-line border-y border-line">
              {PROVENANCE.map((p) => (
                <div key={p.value} className="flex items-baseline gap-5 py-4">
                  <dt className="w-24 shrink-0">
                    <ProvenanceTag value={p.value} />
                  </dt>
                  <dd className="text-[15px] text-ink-dim">{p.text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>

      <footer className="strata-rule">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-5 py-8 text-[13px] text-ink-dim">
          <span>
            Venthar Ridge, its operator and every survey in this demo are fictional and synthetic.
          </span>
          <a href={MONITOR_HREF} className="nav-link text-ink">
            Open the monitor
          </a>
        </div>
      </footer>
    </div>
  )
}
