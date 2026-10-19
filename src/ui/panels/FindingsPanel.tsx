import { COMPLIANCE_CONFIG } from '../../compliance/config'
import type { ComplianceFinding } from '../../domain/types'
import { useTerrain } from '../../state/terrain'
import { countText, GLYPH, RULE_NAMES, toneOf } from '../findings'
import { CriticalGlyph, ViolationGlyph, WarningGlyph } from '../icons'
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

function FindingCard({ f }: { f: ComplianceFinding }) {
  const tone = toneOf(f)
  const Glyph = GLYPH[tone]
  return (
    <li className={`finding tone-${tone}`}>
      <div className="flex items-start gap-2.5">
        <Glyph className="mt-0.5 h-[18px] w-[18px] shrink-0 text-(--tone)" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h4 className="text-[13.5px] font-semibold text-ink">{RULE_NAMES[f.ruleId]}</h4>
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
      <div className="mt-1.5 font-mono text-[11px] text-ink-faint">
        Centre E {n(f.centroid.x)} m, N {n(f.centroid.y)} m
      </div>
    </li>
  )
}

export function FindingsPanel() {
  const ready = useTerrain((s) => s.status === 'ready')
  const findings = useTerrain((s) => s.findings)
  const sigma = useTerrain((s) => s.change?.sigma)
  const cfg = COMPLIANCE_CONFIG

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
        {ready && sigma !== undefined && (
          <p className="mt-3 text-[11.5px] leading-4 text-ink-faint">
            A cell counts as changed when it moved more than {cfg.minChangeM} m plus {cfg.k}σ (σ ={' '}
            {sigma.toFixed(2)} m for the two surveys combined). Smaller changes are treated as
            survey noise.
          </p>
        )}
      </Section>
      <div className="divider" />
      <Section title="How findings are marked">
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
      </Section>
    </>
  )
}
