import { Section } from './parts'

const SOURCES = [
  {
    name: 'Satellite imagery',
    fit: 1,
    text: 'Shows the surface: pit outline, haul roads, dumps and vegetation loss. Cannot measure depth or volume on its own.',
  },
  {
    name: 'Global elevation models',
    fit: 2,
    text: 'Copernicus GLO-30 and SRTM give terrain height on a grid of about 30 m. Vertical error is several metres, far too coarse for 10 m benches or small changes.',
  },
  {
    name: 'Drone, LiDAR or DGPS surveys',
    fit: 3,
    text: 'Mine-scale surveys with ground control reach roughly centimetre to decimetre accuracy. This is what real compliance monitoring relies on.',
  },
]

export function AboutDataPanel() {
  return (
    <>
      <Section title="This mine is fictional">
        <p className="text-[13px] leading-5 text-ink-dim">
          The terrain, both surveys and every finding are generated from a fixed random seed, so the
          same scenario appears every time. Use it to judge the method, not any real site.
        </p>
      </Section>
      <div className="divider" />
      <Section title="What each data source can show">
        <ul className="space-y-3">
          {SOURCES.map((s) => (
            <li key={s.name} className="source-card">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[13px] font-medium text-ink">{s.name}</span>
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
              <p className="mt-1.5 text-[12.5px] leading-5 text-ink-dim">{s.text}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-ink-faint">
          Bars show how well each source suits bench-scale monitoring.
        </p>
      </Section>
      <div className="divider" />
      <Section title="What findings mean">
        <p className="text-[13px] leading-5 text-ink-dim">
          Findings help decide where to send an inspector first. They do not prove a breach and do
          not replace a site inspection.
        </p>
      </Section>
    </>
  )
}
