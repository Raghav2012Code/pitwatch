import { FindingIcon, MeasureIcon, PickIcon } from '../icons'
import { Section } from './parts'

const WAYS = [
  { Icon: PickIcon, text: 'Click the terrain to read its position and elevation.' },
  { Icon: FindingIcon, text: 'Select a finding to see why it was flagged.' },
  { Icon: MeasureIcon, text: 'Measure between two points to get distances and a profile.' },
]

export function InspectorPanel() {
  return (
    <Section title="Nothing selected">
      <ul className="space-y-3">
        {WAYS.map(({ Icon, text }) => (
          <li key={text} className="flex gap-3 text-[13px] leading-5 text-ink-dim">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" />
            {text}
          </li>
        ))}
      </ul>
    </Section>
  )
}
