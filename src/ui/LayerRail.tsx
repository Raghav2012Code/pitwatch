import type { ComponentType, SVGProps } from 'react'
import {
  BoundaryIcon,
  BufferIcon,
  ChangeIcon,
  FindingIcon,
  FloorIcon,
  LabelIcon,
  MeasureIcon,
  PickIcon,
  ResetViewIcon,
  TerrainIcon,
} from './icons'

interface RailItem {
  label: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
  /** Milestone that wires this control up. Shown while it is disabled. */
  pending: string
}

const LAYERS: RailItem[] = [
  { label: 'Terrain', Icon: TerrainIcon, pending: 'M3' },
  { label: 'Change overlay', Icon: ChangeIcon, pending: 'M5' },
  { label: 'Lease boundary', Icon: BoundaryIcon, pending: 'M5' },
  { label: 'Safety buffer', Icon: BufferIcon, pending: 'M5' },
  { label: 'Approved floor', Icon: FloorIcon, pending: 'M5' },
  { label: 'Findings', Icon: FindingIcon, pending: 'M5' },
  { label: 'Labels', Icon: LabelIcon, pending: 'M5' },
]

const TOOLS: RailItem[] = [
  { label: 'Inspect point', Icon: PickIcon, pending: 'M6' },
  { label: 'Measure', Icon: MeasureIcon, pending: 'M6' },
  { label: 'Reset view', Icon: ResetViewIcon, pending: 'M3' },
]

function Group({ title, items }: { title: string; items: RailItem[] }) {
  return (
    <div role="group" aria-label={title} className="flex flex-col items-center gap-1">
      {items.map(({ label, Icon, pending }) => (
        // The wrapper carries the tooltip because disabled buttons ignore hover.
        <span key={label} title={`${label}: available from ${pending}`} className="block">
          <button type="button" className="rail-btn" aria-label={label} disabled>
            <Icon />
          </button>
        </span>
      ))}
    </div>
  )
}

export function LayerRail() {
  return (
    <nav
      aria-label="Layers and tools"
      className="flex w-14 shrink-0 flex-col items-center gap-3 border-r border-line bg-panel py-3"
    >
      <Group title="Layers" items={LAYERS} />
      <div className="h-px w-6 bg-line" />
      <Group title="Tools" items={TOOLS} />
    </nav>
  )
}
