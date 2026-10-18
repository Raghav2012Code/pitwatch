import type { CSSProperties } from 'react'
import { MINE_INFO, SURVEY_EPOCHS } from '../../data/fixtures/mine'
import { daysBetween, formatDate, formatLat, formatLon } from '../format'
import { useCountUp } from '../useCountUp'
import { Kpi, Row, Section } from './parts'

export function OverviewPanel() {
  const m = MINE_INFO
  const [baseline, current] = SURVEY_EPOCHS
  const interval = baseline && current ? daysBetween(baseline.date, current.date) : null
  const shown = useCountUp(interval ?? 0, 1100, 300)

  return (
    <>
      <div className="kpi-grid stagger" style={{ '--d': '0.35s' } as CSSProperties}>
        <Kpi label="Findings" value={null} note="Rule engine has not run yet" />
        <Kpi label="Max pit depth" value={null} note="Needs the terrain surfaces" />
        <Kpi label="Excavated volume" value={null} note="Needs both surveys compared" />
        <Kpi
          label="Survey interval"
          value={interval === null ? null : String(shown)}
          unit="days"
          note="Baseline to current"
          provenance="derived"
        />
      </div>

      <div className="divider" />

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

      <div className="divider" />

      <Section title="Surveys" provenance="simulated">
        <dl>
          {SURVEY_EPOCHS.map((e) => (
            <Row
              key={e.id}
              label={e.label}
              value={
                <>
                  <span className="font-mono text-[12px]">{formatDate(e.date)}</span>
                  <span className="block text-[12px] text-ink-dim">{e.method}</span>
                </>
              }
            />
          ))}
        </dl>
      </Section>
    </>
  )
}
