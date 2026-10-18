import { MINE_INFO, SURVEY_EPOCHS } from '../../data/fixtures/mine'
import { formatDate, formatLat, formatLon } from '../format'
import { EmptyNote, Row, Section } from './parts'

export function OverviewPanel() {
  const m = MINE_INFO
  return (
    <>
      <Section title="Mine" provenance={m.provenance}>
        <dl>
          <Row label="Name" value={m.name} />
          <Row label="Mineral" value={m.mineral} />
          <Row label="Operator" value={m.operator} />
          <Row
            label="Grid origin"
            value={`${formatLat(m.originLatLon.lat)}, ${formatLon(m.originLatLon.lon)}`}
            mono
          />
        </dl>
      </Section>

      <Section title="Surveys" provenance="simulated">
        <dl>
          {SURVEY_EPOCHS.map((e) => (
            <Row
              key={e.id}
              label={e.label}
              value={
                <>
                  <span className="font-mono text-[12.5px]">{formatDate(e.date)}</span>
                  <span className="block text-[12px] text-ink-dim">{e.method}</span>
                </>
              }
            />
          ))}
        </dl>
      </Section>

      <Section title="Pit and compliance">
        <EmptyNote>
          Pit depth, excavated volume and compliance status appear here after the compliance engine
          compares the two surveys.
        </EmptyNote>
      </Section>
    </>
  )
}
