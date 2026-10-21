import { useMemo } from 'react'
import { pitFloorRows } from '../../compliance/zone'
import { MINE_INFO, SURVEY_EPOCHS } from '../../data/fixtures/mine'
import { MINE } from '../../data/fixtures/scenario'
import { polygonArea } from '../../geo/polygon'
import { elevationRange } from '../../scene/terrainGeometry'
import { useTerrain } from '../../state/terrain'
import { daysBetween, formatDate, formatLat, formatLon } from '../format'
import { useCountUp } from '../useCountUp'
import { countText, GLYPH, RULE_NAMES, worstTone } from '../findings'
import { Row, Section } from './parts'

export function OverviewPanel() {
  const survey = useTerrain((s) => s.surveys.current)
  const limits = useTerrain((s) => s.limits)
  const [baseline, current] = SURVEY_EPOCHS
  const interval = baseline && current ? daysBetween(baseline.date, current.date) : 0
  const shownDays = useCountUp(interval, 1100, 300)
  const range = useMemo(() => survey && elevationRange(survey.elevations), [survey])
  const sigma = survey?.verticalUncertainty
  const m = MINE_INFO
  const findings = useTerrain((s) => s.findings)
  const ready = useTerrain((s) => s.status === 'ready')
  const tone = worstTone(findings)
  const Glyph = tone === 'clear' ? null : GLYPH[tone]

  return (
    <>
      {/* Status first: what the inspector most needs to know. */}
      <section className={`status-block tone-${ready ? tone : 'clear'} mx-4 mt-4`}>
        <div className="flex items-center gap-2.5">
          {ready && Glyph ? (
            <Glyph className="h-5 w-5 shrink-0 text-(--tone)" />
          ) : (
            <span
              className="status-led"
              data-tone={ready ? 'clear' : undefined}
              aria-hidden="true"
            />
          )}
          <h3 className="cond text-[19px] font-bold text-ink">
            {ready ? countText(findings) : 'Evaluating'}
          </h3>
        </div>
        <p className="mt-1.5 text-[13px] leading-5 text-ink-dim">
          The rule engine compared the current survey with the baseline and the permit. Findings
          point to where an inspection is most needed; they do not prove a breach on their own.
        </p>
        <ul className="mt-3 space-y-1">
          {(['R1', 'R2', 'R3'] as const).map((id) => {
            const own = findings.filter((f) => f.ruleId === id)
            return (
              <li key={id} className="flex items-baseline gap-2 text-[12.5px]">
                <span className="font-mono text-[11px] text-oxide">{id}</span>
                <span className="flex-1 text-ink">{RULE_NAMES[id]}</span>
                <span
                  className={`text-[11.5px] ${own.length ? `tone-${worstTone(own)} text-(--tone)` : 'text-ink-faint'}`}
                >
                  {ready ? (own.length ? countText(own) : 'clear') : 'pending'}
                </span>
              </li>
            )
          })}
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
          {limits ? (
            pitFloorRows(limits.pitZones).map((row) => (
              <Row key={row.label} label={row.label} value={row.value} mono />
            ))
          ) : (
            <Row label="Approved floor" value="—" mono />
          )}
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
