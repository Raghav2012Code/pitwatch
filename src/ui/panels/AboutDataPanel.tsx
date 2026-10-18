import { Section } from './parts'

const SOURCES = [
  {
    name: 'Satellite imagery',
    can: 'Shows the surface: pit outline, haul roads, dumps and vegetation loss.',
    cannot: 'Cannot measure depth or volume on its own.',
  },
  {
    name: 'Global elevation models',
    can: 'Copernicus GLO-30 and SRTM give terrain height on a grid of about 30 m.',
    cannot:
      'Vertical error is several metres, and the grid is far too coarse for 10 m benches or small changes.',
  },
  {
    name: 'Drone, LiDAR or DGPS surveys',
    can: 'Mine-scale surveys with ground control reach roughly centimetre to decimetre accuracy.',
    cannot:
      'They need site access and survey work. This is the data real compliance monitoring relies on.',
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
      <Section title="What each data source can show">
        <dl className="space-y-4">
          {SOURCES.map((s) => (
            <div key={s.name}>
              <dt className="text-[13px] font-medium text-ink">{s.name}</dt>
              <dd className="mt-1 text-[12.5px] leading-5 text-ink-dim">
                {s.can} {s.cannot}
              </dd>
            </div>
          ))}
        </dl>
      </Section>
      <Section title="What findings mean">
        <p className="text-[13px] leading-5 text-ink-dim">
          Findings help decide where to send an inspector first. They do not prove a breach and do
          not replace a site inspection.
        </p>
      </Section>
    </>
  )
}
