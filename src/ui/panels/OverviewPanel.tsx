import { useMemo, type CSSProperties } from 'react'
import { MINE_INFO, SURVEY_EPOCHS } from '../../data/fixtures/mine'
import { MINE } from '../../data/fixtures/scenario'
import { elevationRange } from '../../scene/terrainGeometry'
import { useTerrain } from '../../state/terrain'
import { daysBetween, formatDate, formatLat, formatLon } from '../format'
import { useCountUp } from '../useCountUp'
import { Kpi, Row, Section } from './parts'

export function OverviewPanel() {
  const m = MINE_INFO
  const [baseline, current] = SURVEY_EPOCHS
  const interval = baseline && current ? daysBetween(baseline.date, current.date) : null
  const shown = useCountUp(interval ?? 0, 1100, 300)
  const survey = useTerrain((s) => s.surveys.current)
  const lowest = useMemo(() => survey && elevationRange(survey.elevations).min, [survey])

  return (
    <>
      <div className="kpi-grid stagger" style={{ '--d': '0.35s' } as CSSProperties}>
        <Kpi label="Findings" value={null} note="The rule engine arrives in M4" />
        <Kpi
          label="Lowest point"
          value={lowest === undefined ? null : lowest.toFixed(1)}
          unit="m RL"
          note={
            survey
              ? `± ${survey.verticalUncertainty.toFixed(2)} m (1σ), current survey`
              : 'Building the terrain model'
          }
          provenance={survey ? 'derived' : undefined}
        />
        <Kpi label="Excavated volume" value={null} note="Needs change detection (M4)" />
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
          <Row label="Survey grid" value={MINE.metadata.grid} />
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
