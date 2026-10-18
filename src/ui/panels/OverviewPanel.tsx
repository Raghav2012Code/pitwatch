import { useMemo } from 'react'
import { MINE_INFO, SURVEY_EPOCHS } from '../../data/fixtures/mine'
import { MINE } from '../../data/fixtures/scenario'
import { polygonArea } from '../../geo/polygon'
import { elevationRange } from '../../scene/terrainGeometry'
import { useTerrain } from '../../state/terrain'
import { daysBetween, formatDate, formatLat, formatLon } from '../format'
import { useCountUp } from '../useCountUp'
import { Row, Section } from './parts'

const RULES = [
  { id: 'R1', name: 'Lease boundary and buffer' },
  { id: 'R2', name: 'Approved pit floor' },
  { id: 'R3', name: 'Permitted dump zones' },
]

export function OverviewPanel() {
  const survey = useTerrain((s) => s.surveys.current)
  const limits = useTerrain((s) => s.limits)
  const [baseline, current] = SURVEY_EPOCHS
  const interval = baseline && current ? daysBetween(baseline.date, current.date) : 0
  const shownDays = useCountUp(interval, 1100, 300)
  const range = useMemo(() => survey && elevationRange(survey.elevations), [survey])
  const sigma = survey?.verticalUncertainty
  const m = MINE_INFO

  return (
    <>
      {/* Status first: what the inspector most needs to know. */}
      <section className="status-block mx-4 mt-4">
        <div className="flex items-center gap-2.5">
          <span className="status-led" aria-hidden="true" />
          <h3 className="cond text-[19px] font-bold text-ink">Not evaluated yet</h3>
        </div>
        <p className="mt-1.5 text-[13px] leading-5 text-ink-dim">
          The rule engine (M4) will compare the two surveys against the permit and list every
          finding here, with the numbers behind it.
        </p>
        <ul className="mt-3 space-y-1">
          {RULES.map((r) => (
            <li key={r.id} className="flex items-baseline gap-2 text-[12.5px]">
              <span className="font-mono text-[11px] text-oxide">{r.id}</span>
              <span className="flex-1 text-ink">{r.name}</span>
              <span className="text-[11.5px] text-ink-faint">pending</span>
            </li>
          ))}
        </ul>
      </section>

      <Section title="Surveys" provenance="simulated">
        <div className="survey-pair">
          {[baseline, current].map(
            (e) =>
              e && (
                <div key={e.id}>
                  <div className="text-[11.5px] text-ink-faint">{e.label}</div>
                  <div className="font-mono text-[13px] text-ink">{formatDate(e.date)}</div>
                </div>
              ),
          )}
        </div>
        <dl className="mt-2">
          <Row label="Interval" value={`${shownDays} days`} provenance="derived" />
          <Row label="Method" value={baseline?.method ?? '—'} />
        </dl>
      </Section>

      <div className="divider" />

      <Section title="Current surface" provenance="derived">
        <dl>
          <Row
            label="Lowest point"
            value={
              range && sigma !== undefined
                ? `${range.min.toFixed(1)} ± ${sigma.toFixed(2)} m RL`
                : '—'
            }
            mono
          />
          <Row
            label="Highest point"
            value={
              range && sigma !== undefined
                ? `${range.max.toFixed(1)} ± ${sigma.toFixed(2)} m RL`
                : '—'
            }
            mono
          />
          <Row label="Survey grid" value={MINE.metadata.grid} />
        </dl>
      </Section>

      <div className="divider" />

      <Section title="Lease" provenance="simulated">
        <dl>
          <Row label="Operator" value={m.operator} />
          <Row
            label="Lease area"
            value={limits ? `${(polygonArea(limits.leaseBoundary) / 10_000).toFixed(1)} ha` : '—'}
            provenance="derived"
          />
          <Row label="Safety buffer" value={limits ? `${limits.safetyBufferMetres} m` : '—'} />
          <Row
            label="Approved floor"
            value={limits ? `${limits.pitZones[0].approvedFloorElevation} m RL` : '—'}
            mono
          />
          <Row
            label="Grid origin"
            value={`${formatLat(m.originLatLon.lat)}, ${formatLon(m.originLatLon.lon)}`}
            mono
          />
        </dl>
      </Section>
    </>
  )
}
