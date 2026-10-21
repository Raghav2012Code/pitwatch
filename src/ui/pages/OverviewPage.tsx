import { useMemo } from 'react'
import type { ComplianceFinding } from '../../domain/types'
import { pitFloorRows } from '../../compliance/zone'
import { MINE_INFO, SURVEY_EPOCHS } from '../../data/fixtures/mine'
import { MINE } from '../../data/fixtures/scenario'
import { polygonArea } from '../../geo/polygon'
import { elevationRange } from '../../scene/terrainGeometry'
import { useAppStore } from '../../state/store'
import { useTerrain } from '../../state/terrain'
import { countText, GLYPH, RULE_NAMES, toneOf, worstTone } from '../findings'
import { daysBetween, formatDate, formatLat, formatLon } from '../format'
import { ArrowRightIcon } from '../icons'
import { Row } from '../panels/parts'
import { ProvenanceTag } from '../ProvenanceTag'
import { navigate, ROUTE_HREF } from '../route'
import { LoadGate } from '../shell/LoadGate'
import { Page } from '../shell/AppShell'
import { useCountUp } from '../useCountUp'

const n = (v: number, digits = 0) =>
  v.toLocaleString('en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits })

/** The dashboard's front page: the verdict first, then the numbers behind it. */
export function OverviewPage() {
  return (
    <Page>
      <LoadGate>
        <Verdict />
        <Figures />
        <div className="mt-10 grid gap-x-12 gap-y-10 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="space-y-10">
            <RuleResults />
            <Attention />
          </div>
          <Facts />
        </div>
      </LoadGate>
    </Page>
  )
}

/** The overall result, in words and with the shape of its worst finding. */
function Verdict() {
  const findings = useTerrain((s) => s.findings)
  const tone = worstTone(findings)
  const Glyph = tone === 'clear' ? null : GLYPH[tone]

  return (
    <section aria-labelledby="verdict" className={`verdict tone-${tone}`}>
      <div className="flex items-start gap-4">
        {Glyph && <Glyph className="mt-1 h-8 w-8 shrink-0 text-(--tone)" />}
        <div className="min-w-0">
          <h2 id="verdict" className="cond text-[clamp(30px,3.4vw,42px)] leading-none font-bold">
            {countText(findings)}
          </h2>
          <p className="mt-2 max-w-[44rem] text-[14.5px] leading-6 text-ink-dim">
            The rule engine compared the current survey with the baseline and the permit. Findings
            point to where an inspection is most needed; they do not prove a breach on their own.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2.5">
        <a href={ROUTE_HREF.findings} className="btn-primary">
          Review findings
        </a>
        <a href={ROUTE_HREF.monitor} className="btn">
          Open the 3D map
        </a>
      </div>
    </section>
  )
}

/** Four headline figures, all derived from the engine's output. */
function Figures() {
  const findings = useTerrain((s) => s.findings)
  const [baseline, current] = SURVEY_EPOCHS
  const interval = baseline && current ? daysBetween(baseline.date, current.date) : 0
  const shownDays = useCountUp(interval, 1100, 300)

  const violations = findings.filter((f) => f.status === 'violation').length
  const warnings = findings.length - violations
  // Rock removed from ground the lease does not cover: the volume behind every R1 violation.
  const outside = findings
    .filter((f) => f.ruleId === 'R1' && f.status === 'violation')
    .reduce((sum, f) => sum + f.volumeM3, 0)

  return (
    <dl className="figures" aria-label="Headline figures">
      <Figure label="Violations" value={n(violations)} note="A limit exceeded beyond the noise" />
      <Figure label="Warnings" value={n(warnings)} note="Possible or minor issues" />
      <Figure
        label="Removed outside the lease"
        value={`${n(outside)} m³`}
        note="Volume behind the boundary violations"
        provenance="derived"
      />
      <Figure
        label="Between the surveys"
        value={`${shownDays} days`}
        note={`${baseline ? formatDate(baseline.date) : ''} to ${current ? formatDate(current.date) : ''}`}
        provenance="derived"
      />
    </dl>
  )
}

function Figure({
  label,
  value,
  note,
  provenance,
}: {
  label: string
  value: string
  note: string
  provenance?: 'derived'
}) {
  return (
    <div className="figure">
      <dt className="flex items-center justify-between gap-2 text-[13px] text-ink-dim">
        {label}
        {provenance && <ProvenanceTag value={provenance} />}
      </dt>
      <dd className="cond mt-1 text-[clamp(28px,3vw,38px)] leading-none font-bold text-ink">
        {value}
      </dd>
      <dd className="mt-1.5 text-[12px] text-ink-faint">{note}</dd>
    </div>
  )
}

/** R1 to R3: which of the three lease conditions are clear and which are not. */
function RuleResults() {
  const findings = useTerrain((s) => s.findings)

  return (
    <section aria-labelledby="rule-results" className="rule-section">
      <h2 id="rule-results" className="section-title">
        Result by permit rule
      </h2>
      <ul className="mt-1">
        {(['R1', 'R2', 'R3'] as const).map((id) => {
          const own = findings.filter((f) => f.ruleId === id)
          const tone = own.length ? worstTone(own) : 'clear'
          const Glyph = tone === 'clear' ? null : GLYPH[tone]
          return (
            <li key={id} className={`rule-result tone-${tone}`}>
              <span className="font-mono text-[12px] text-oxide">{id}</span>
              <span className="min-w-0 flex-1 text-[14.5px] font-medium text-ink">
                {RULE_NAMES[id]}
              </span>
              <span className="flex items-center gap-2 text-[13px] text-(--tone)">
                {Glyph ? (
                  <Glyph className="h-[18px] w-[18px]" />
                ) : (
                  <span className="status-led" data-tone="clear" aria-hidden="true" />
                )}
                {own.length ? countText(own) : 'Clear'}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** The first few findings (the engine lists the most serious first), each one a click from the map. */
function Attention() {
  const findings = useTerrain((s) => s.findings)
  const top = findings.slice(0, 3)

  return (
    <section aria-labelledby="attention" className="rule-section">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="attention" className="section-title">
          Look at these first
        </h2>
        <a href={ROUTE_HREF.findings} className="link-arrow">
          All {findings.length} findings
          <ArrowRightIcon className="h-4 w-4" />
        </a>
      </div>
      {top.length === 0 ? (
        <p className="mt-3 text-[14px] text-ink-dim">
          No change between the surveys breaks a permit rule.
        </p>
      ) : (
        <ul className="mt-1">
          {top.map((f) => (
            <AttentionRow key={f.id} f={f} />
          ))}
        </ul>
      )}
    </section>
  )
}

function AttentionRow({ f }: { f: ComplianceFinding }) {
  const tone = toneOf(f)
  const Glyph = GLYPH[tone]
  const selectFinding = useAppStore((s) => s.selectFinding)

  return (
    <li className={`attention tone-${tone}`}>
      <Glyph className="mt-0.5 h-[20px] w-[20px] shrink-0 text-(--tone)" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h3 className="text-[14.5px] font-semibold text-ink">{RULE_NAMES[f.ruleId]}</h3>
          <span className="font-mono text-[11.5px] text-ink-faint">{f.id}</span>
        </div>
        <div className="text-[12.5px] text-(--tone)">
          {f.status === 'violation' ? 'Violation' : 'Warning'}, {f.severity} severity
        </div>
        <p className="mt-1 text-[13px] leading-5 text-ink-dim">{f.explanation}</p>
      </div>
      <button
        type="button"
        className="btn shrink-0 self-start"
        onClick={() => {
          selectFinding(f.id, f.centroid)
          navigate('monitor')
        }}
      >
        Show on map
      </button>
    </li>
  )
}

/** The survey, surface and lease facts that used to sit in the map's Overview tab. */
function Facts() {
  const survey = useTerrain((s) => s.surveys.current)
  const limits = useTerrain((s) => s.limits)
  const [baseline, current] = SURVEY_EPOCHS
  const interval = baseline && current ? daysBetween(baseline.date, current.date) : 0
  const range = useMemo(() => survey && elevationRange(survey.elevations), [survey])
  const sigma = survey?.verticalUncertainty
  const m = MINE_INFO

  return (
    <div className="space-y-10">
      <section aria-labelledby="surveys" className="rule-section">
        <div className="flex items-center justify-between gap-3">
          <h2 id="surveys" className="section-title">
            Surveys
          </h2>
          <ProvenanceTag value="simulated" />
        </div>
        <div className="survey-pair mt-3">
          {[baseline, current].map(
            (e) =>
              e && (
                <div key={e.id}>
                  <div className="text-[12px] text-ink-faint">{e.label}</div>
                  <div className="font-mono text-[13.5px] text-ink">{formatDate(e.date)}</div>
                </div>
              ),
          )}
        </div>
        <dl className="mt-2">
          <Row label="Interval" value={`${interval} days`} provenance="derived" />
          <Row label="Method" value={baseline?.method ?? '—'} />
        </dl>
      </section>

      <section aria-labelledby="surface" className="rule-section">
        <div className="flex items-center justify-between gap-3">
          <h2 id="surface" className="section-title">
            Current surface
          </h2>
          <ProvenanceTag value="derived" />
        </div>
        <dl className="mt-1">
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
      </section>

      <section aria-labelledby="lease" className="rule-section">
        <div className="flex items-center justify-between gap-3">
          <h2 id="lease" className="section-title">
            Lease
          </h2>
          <ProvenanceTag value="simulated" />
        </div>
        <dl className="mt-1">
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
      </section>
    </div>
  )
}
