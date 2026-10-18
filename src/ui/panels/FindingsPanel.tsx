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

export function FindingsPanel() {
  return (
    <>
      <Section title="Findings">
        <EmptyNote>
          No findings yet. Every finding will come from the rule engine comparing the baseline and
          current surveys, never from a hand-written list.
        </EmptyNote>
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
