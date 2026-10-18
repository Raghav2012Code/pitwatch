import type { ComponentType, CSSProperties, SVGProps } from 'react'
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

interface Item {
  label: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
  /** Milestone that wires this control up. Shown while it is disabled. */
  pending: string
}

const LAYERS: Item[] = [
  { label: 'Terrain', Icon: TerrainIcon, pending: 'M3' },
  { label: 'Change overlay', Icon: ChangeIcon, pending: 'M5' },
  { label: 'Lease boundary', Icon: BoundaryIcon, pending: 'M5' },
  { label: 'Safety buffer', Icon: BufferIcon, pending: 'M5' },
  { label: 'Approved floor', Icon: FloorIcon, pending: 'M5' },
  { label: 'Findings', Icon: FindingIcon, pending: 'M5' },
  { label: 'Labels', Icon: LabelIcon, pending: 'M5' },
]

const TOOLS: Item[] = [
  { label: 'Inspect point', Icon: PickIcon, pending: 'M6' },
  { label: 'Measure', Icon: MeasureIcon, pending: 'M6' },
  { label: 'Reset view', Icon: ResetViewIcon, pending: 'M3' },
]

function LayerRow({ label, Icon, pending, toggle, i }: Item & { toggle: boolean; i: number }) {
  return (
    // Wrapper carries the tooltip because disabled controls ignore hover.
    <li title={`${label}: available from ${pending}`} style={{ '--i': i } as CSSProperties}>
      <button type="button" className="layer-row" disabled aria-label={label}>
        <Icon className="h-[18px] w-[18px] shrink-0" />
        <span className="hidden flex-1 text-left xl:block">{label}</span>
        {toggle && <span className="toggle hidden xl:block" aria-hidden="true" />}
      </button>
    </li>
  )
}

export function LayerPanel() {
  return (
    <nav
      aria-label="Layers and tools"
      style={{ '--d': '0.15s' } as CSSProperties}
      className="sheet hud-panel enter-left absolute top-3 left-3 z-10 hidden w-[60px] flex-col md:flex xl:w-[220px]"
    >
      <div className="panel-head hidden xl:flex">
        <span>Layers</span>
        <span className="font-stretch-normal text-[12px] font-normal text-ink-faint">0 of 7</span>
      </div>
      <ul role="list" className="stagger flex flex-col gap-0.5 p-1.5">
        {LAYERS.map((item, i) => (
          <LayerRow key={item.label} {...item} toggle i={i} />
        ))}
      </ul>
      <div className="mx-3 h-px bg-line" />
      <div className="panel-head hidden xl:flex">
        <span>Tools</span>
      </div>
      <ul role="list" className="stagger flex flex-col gap-0.5 p-1.5 pt-1.5 xl:pt-0">
        {TOOLS.map((item, i) => (
          <LayerRow key={item.label} {...item} toggle={false} i={LAYERS.length + i} />
        ))}
      </ul>
      <p className="hidden px-3.5 pb-3 text-[11px] leading-4 text-ink-faint xl:block">
        Controls switch on as each layer is built.
      </p>
    </nav>
  )
}
