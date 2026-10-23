import type { Provenance } from '../../domain/types'
import { COMPLIANCE_CONFIG } from '../../compliance/config'
import { ROUTE_HREF } from '../route'
import { Page } from '../shell/AppShell'
import { ProvenanceTag } from '../ProvenanceTag'

const PIPELINE = [
  ['Survey twice', 'Two drone surveys of the same ground, with their measurement error (σ).'],
  [
    'Keep real change',
    `Subtract them. A cell counts only if it moved more than ${COMPLIANCE_CONFIG.minChangeM} m plus ${COMPLIANCE_CONFIG.k}σ.`,
  ],
  [
    'Test the permit',
    'Each changed cell is checked against the lease boundary, floor and dump zones.',
  ],
  ['Report findings', 'Connected cells become ranked findings you can open on the map.'],
] as const

const PAGES = [
  ['Overview', ROUTE_HREF.overview, 'The verdict, the site plan and the facts behind them.'],
  ['3D map', ROUTE_HREF.monitor, 'Orbit the pit, switch surveys, inspect and measure any point.'],
  ['Findings', ROUTE_HREF.findings, 'Every finding with its figures and explanation.'],
  ['Permit rules', ROUTE_HREF.rules, 'The three lease conditions and how each is tested.'],
  ['Uncertainty', ROUTE_HREF.uncertainty, 'Why a change has to beat the survey noise.'],
] as const

const SOURCES = [
  {
    name: 'Satellite imagery',
    fit: 1,
    text: 'Shows the surface: pit outline, haul roads, dumps and vegetation loss. Cannot measure depth or volume on its own.',
  },
  {
    name: 'Global elevation models',
    fit: 2,
    text: 'Copernicus GLO-30 and SRTM give terrain height on a grid of about 30 m. Vertical error is several metres, far too coarse for 15 m benches or small changes.',
  },
  {
    name: 'Drone, LiDAR or DGPS surveys',
    fit: 3,
    text: 'Mine-scale surveys with ground control reach roughly centimetre to decimetre accuracy. This is what real compliance monitoring relies on.',
  },
]

const PROVENANCE: [Provenance, string][] = [
  ['measured', 'Taken directly from a survey instrument.'],
  ['derived', 'Calculated in this app from other values.'],
  ['simulated', 'Synthetic value for this fictional mine.'],
  ['unverified', 'Reported but not checked against a survey.'],
]

const SHORTCUTS: [string, string][] = [
  ['[', 'Hide or show the Map card'],
  [']', 'Hide or show the details panel'],
  ['M', 'Switch between Inspect and Measure'],
  ['R', 'Reset the camera'],
  ['F', 'Full screen'],
  ['Esc', 'Clear the picked point or measurement'],
  ['Arrow keys', 'Move between the Findings and Inspector tabs'],
]

/** What is simulated, what each kind of data can show, and how to read this app's labels. */
export function AboutPage() {
  return (
    <Page>
      <section aria-labelledby="pipeline" className="rule-section">
        <h2 id="pipeline" className="section-title">
          How a result is made
        </h2>
        <ol className="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
          {PIPELINE.map(([title, text], i) => (
            <li key={title}>
              <span className="font-mono text-[12px] text-oxide">0{i + 1}</span>
              <h3 className="mt-1 text-[15px] font-semibold text-ink">{title}</h3>
              <p className="mt-1 text-[13.5px] leading-6 text-ink-dim">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="pages" className="rule-section mt-12">
        <h2 id="pages" className="section-title">
          What is in this app
        </h2>
        <ul className="mt-3 grid gap-x-12 md:grid-cols-2">
          {PAGES.map(([name, href, text]) => (
            <li key={name} className="flex items-baseline gap-4 py-2">
              <a href={href} className="w-[104px] shrink-0 text-[14px] font-semibold text-accent">
                {name}
              </a>
              <span className="text-[14px] text-ink-dim">{text}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-12 grid gap-x-14 gap-y-12 xl:grid-cols-2">
        <div className="space-y-12">
          <section aria-labelledby="fictional" className="rule-section">
            <h2 id="fictional" className="section-title">
              This mine is fictional
            </h2>
            <p className="mt-3 max-w-[34rem] text-[15px] leading-7 text-ink-dim">
              The terrain, both surveys and every finding are generated from a fixed random seed, so
              the same scenario appears every time. The aerial image draped on the 3D model is
              simulated too: it is painted from the synthetic surface, not photographed. Use it to
              judge the method, not any real site.
            </p>
          </section>

          <section aria-labelledby="meaning" className="rule-section">
            <h2 id="meaning" className="section-title">
              What findings mean
            </h2>
            <p className="mt-3 max-w-[34rem] text-[15px] leading-7 text-ink-dim">
              Findings are the demo engine's classifications of the simulated change: violation and
              warning are its labels, not a regulator's. They help decide where to send an inspector
              first, and do not prove a breach or replace a site inspection. A real deployment would
              swap the synthetic surveys for a GeoTIFF provider; the rules and the screens stay the
              same.
            </p>
          </section>

          <section aria-labelledby="labels" className="rule-section">
            <h2 id="labels" className="section-title">
              Where each value comes from
            </h2>
            <p className="mt-3 max-w-[34rem] text-[15px] leading-7 text-ink-dim">
              Every figure carries a small tag saying how it was obtained.
            </p>
            <dl className="mt-3">
              {PROVENANCE.map(([value, meaning]) => (
                <div key={value} className="flex items-baseline gap-4 py-2">
                  <dt className="w-[92px] shrink-0">
                    <ProvenanceTag value={value} />
                  </dt>
                  <dd className="text-[14px] text-ink-dim">{meaning}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <div className="space-y-12">
          <section aria-labelledby="sources" className="rule-section">
            <h2 id="sources" className="section-title">
              What each data source can show
            </h2>
            <ul className="mt-4 space-y-3">
              {SOURCES.map((s) => (
                <li key={s.name} className="source-card">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-[14.5px] font-semibold text-ink">{s.name}</h3>
                    <span
                      className="fit-meter"
                      role="img"
                      aria-label={`Suitability for bench-scale monitoring: ${s.fit} of 3`}
                    >
                      {[1, 2, 3].map((n) => (
                        <i key={n} className={n <= s.fit ? 'on' : ''} />
                      ))}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[13.5px] leading-6 text-ink-dim">{s.text}</p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12px] text-ink-faint">
              Bars show how well each source suits bench-scale monitoring.
            </p>
          </section>

          <section aria-labelledby="keys" className="rule-section">
            <h2 id="keys" className="section-title">
              Keyboard shortcuts on the 3D map
            </h2>
            <dl className="mt-3">
              {SHORTCUTS.map(([key, action]) => (
                <div key={key} className="flex items-baseline gap-4 py-1.5">
                  <dt className="w-[92px] shrink-0">
                    <kbd className="kbd">{key}</kbd>
                  </dt>
                  <dd className="text-[14px] text-ink-dim">{action}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>
    </Page>
  )
}
