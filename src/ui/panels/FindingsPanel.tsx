import { COMPLIANCE_CONFIG } from '../../compliance/config'
import type { ComplianceFinding } from '../../domain/types'
import { useAppStore } from '../../state/store'
import { useTerrain } from '../../state/terrain'
import { countText, GLYPH, RULE_NAMES, toneOf } from '../findings'
import { CriticalGlyph, ViolationGlyph, WarningGlyph } from '../icons'
import { navigate } from '../route'
import { EmptyNote, Section } from './parts'

const LEGEND = [
  {
    Glyph: WarningGlyph,
    name: 'Warning',
    tone: 'sev-warn',
    meaning: 'A possible issue the survey uncertainty cannot confirm, or a minor one.',
  },
  {
    Glyph: ViolationGlyph,
    name: 'Violation',
    tone: 'sev-violation',
    meaning: 'A permitted limit is exceeded by more than the measurement uncertainty.',
  },
  {
    Glyph: CriticalGlyph,
    name: 'Critical',
    tone: 'sev-critical',
    meaning: 'A violation large enough in area, volume or depth to inspect first.',
  },
]

const n = (v: number, digits = 0) =>
  v.toLocaleString('en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits })

/** One finding. `level` is the heading level of its title: 4 inside a panel, 3 on a page. */
export function FindingCard({ f, level = 4 }: { f: ComplianceFinding; level?: 3 | 4 }) {
  const Title = `h${level}` as const
  const tone = toneOf(f)
  const Glyph = GLYPH[tone]
  const selected = useAppStore((s) => s.selectedFinding === f.id)
  const selectFinding = useAppStore((s) => s.selectFinding)
  return (
    <li
      className={`finding tone-${tone}`}
      aria-current={selected || undefined}
      data-selected={selected || undefined}
    >
      <div className="flex items-start gap-2.5">
        <Glyph className="mt-0.5 h-[18px] w-[18px] shrink-0 text-(--tone)" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <Title className="text-[13.5px] font-semibold text-ink">{RULE_NAMES[f.ruleId]}</Title>
            <span className="font-mono text-[11px] text-ink-faint">{f.id}</span>
          </div>
          <div className="text-[12px] text-(--tone)">
            {f.status === 'violation' ? 'Violation' : 'Warning'}, {f.severity} severity
          </div>
        </div>
      </div>
      <p className="mt-2 text-[12.5px] leading-5 text-ink-dim">{f.explanation}</p>
      <dl className="finding-figures">
        {[
          ['Area', `${n(f.areaM2)} m²`],
          ['Volume', `${n(f.volumeM3)} m³`],
          ['Max excess', `${n(f.maxExceedance, 1)} m`],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-[11px] text-ink-faint">{label}</dt>
            <dd className="font-mono text-[12px] text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] text-ink-faint">
          Centre E {n(f.centroid.x)} m, N {n(f.centroid.y)} m
        </span>
        <button
          type="button"
          className="text-[12px] font-semibold text-accent underline underline-offset-2"
          onClick={() => {
            selectFinding(f.id, f.centroid)
            navigate('monitor')
          }}
        >
          Show on map
        </button>
      </div>
    </li>
  )
}

/** How a cell comes to count as changed, with the σ the engine used. */
export function ThresholdNote() {
  const ready = useTerrain((s) => s.status === 'ready')
  const sigma = useTerrain((s) => s.change?.sigma)
  const cfg = COMPLIANCE_CONFIG
  if (!ready || sigma === undefined) return null
  return (
    <p className="mt-3 text-[11.5px] leading-4 text-ink-faint">
      A cell counts as changed when it moved more than {cfg.minChangeM} m plus {cfg.k}σ (σ ={' '}
      {sigma.toFixed(2)} m for the two surveys combined). Changes below that line are not reported.
    </p>
  )
}

/** What the three severity shapes mean. */
export function SeverityLegend() {
  return (
    <ul className="space-y-2">
      {LEGEND.map(({ Glyph, name, tone, meaning }) => (
        <li key={name} className={`sev-row ${tone}`}>
          <Glyph className="mt-0.5 h-[18px] w-[18px] shrink-0" />
          <div>
            <div className="text-[13px] font-semibold">{name}</div>
            <div className="text-[12.5px] leading-5 text-ink-dim">{meaning}</div>
          </div>
        </li>
      ))}
    </ul>
  )
}

export function FindingsPanel() {
  const ready = useTerrain((s) => s.status === 'ready')
  const findings = useTerrain((s) => s.findings)

  return (
    <>
      <Section
        title={ready ? countText(findings) : 'Findings'}
        provenance={ready ? 'derived' : undefined}
      >
        {!ready ? (
          <EmptyNote>Findings appear once both surveys have loaded.</EmptyNote>
        ) : findings.length === 0 ? (
          <EmptyNote>No change between the surveys breaks a permit rule.</EmptyNote>
        ) : (
          <ul className="space-y-2.5">
            {findings.map((f) => (
              <FindingCard key={f.id} f={f} />
            ))}
          </ul>
        )}
        <ThresholdNote />
      </Section>
      <div className="divider" />
      <Section title="How findings are marked">
        <SeverityLegend />
      </Section>
    </>
  )
}
