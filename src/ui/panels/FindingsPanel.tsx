import { CriticalGlyph, ViolationGlyph, WarningGlyph } from '../icons'
import { EmptyNote, Section } from './parts'

const LEGEND = [
  {
    Glyph: WarningGlyph,
    name: 'Warning',
    color: 'text-warn',
    meaning: 'A possible issue that the survey uncertainty cannot confirm, or a minor one.',
  },
  {
    Glyph: ViolationGlyph,
    name: 'Violation',
    color: 'text-violation',
    meaning: 'A permitted limit is exceeded by more than the measurement uncertainty.',
  },
  {
    Glyph: CriticalGlyph,
    name: 'Critical',
    color: 'text-critical',
    meaning: 'A violation large enough in area, volume or depth to inspect first.',
  },
]

export function FindingsPanel() {
  return (
    <>
      <Section title="Findings">
        <EmptyNote>
          No findings yet. Each finding will come from the rule engine comparing the baseline and
          current surveys, never from a hand-written list.
        </EmptyNote>
      </Section>
      <Section title="How findings are marked">
        <ul className="space-y-3">
          {LEGEND.map(({ Glyph, name, color, meaning }) => (
            <li key={name} className="flex gap-3">
              <Glyph className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} />
              <div>
                <div className={`text-[13px] font-medium ${color}`}>{name}</div>
                <div className="text-[12.5px] leading-5 text-ink-dim">{meaning}</div>
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </>
  )
}
