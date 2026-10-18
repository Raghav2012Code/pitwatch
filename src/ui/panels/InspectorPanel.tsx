import { FindingIcon, MeasureIcon, PickIcon } from '../icons'
import { Section } from './parts'

const WAYS = [
  {
    Icon: PickIcon,
    title: 'Inspect a point',
    text: 'Click the terrain to read position and elevation.',
  },
  { Icon: FindingIcon, title: 'Open a finding', text: 'See exactly why an area was flagged.' },
  { Icon: MeasureIcon, title: 'Measure a line', text: 'Get distances and an elevation profile.' },
]

export function InspectorPanel() {
  return (
    <Section title="Nothing selected">
      <ul className="space-y-2">
        {WAYS.map(({ Icon, title, text }) => (
          <li key={title} className="hint-row">
            <span className="hint-icon">
              <Icon className="h-[18px] w-[18px]" />
            </span>
            <div>
              <div className="text-[13px] font-medium text-ink">{title}</div>
              <div className="text-[12.5px] leading-5 text-ink-dim">{text}</div>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  )
}
