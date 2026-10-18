import type { ComponentType, CSSProperties, SVGProps } from 'react'
import { useAppStore, type LayerId } from '../state/store'
import { useTerrain } from '../state/terrain'
import {
  BoundaryIcon,
  BufferIcon,
  ChangeIcon,
  ContourIcon,
  FindingIcon,
  FloorIcon,
  LabelIcon,
  MeasureIcon,
  PickIcon,
  ResetViewIcon,
  TerrainIcon,
  TintIcon,
} from './icons'

type Icon = ComponentType<SVGProps<SVGSVGElement>>

/** A layer either works now (`id`) or names the milestone that builds it (`pending`). */
type Layer = { label: string; Icon: Icon } & ({ id: LayerId } | { pending: string })

const LAYERS: Layer[] = [
  { label: 'Terrain', Icon: TerrainIcon, id: 'terrain' },
  { label: 'Elevation tint', Icon: TintIcon, id: 'tint' },
  { label: 'Contours', Icon: ContourIcon, id: 'contours' },
  { label: 'Change overlay', Icon: ChangeIcon, pending: 'M5' },
  { label: 'Lease boundary', Icon: BoundaryIcon, pending: 'M5' },
  { label: 'Safety buffer', Icon: BufferIcon, pending: 'M5' },
  { label: 'Approved floor', Icon: FloorIcon, pending: 'M5' },
  { label: 'Findings', Icon: FindingIcon, pending: 'M5' },
  { label: 'Labels', Icon: LabelIcon, pending: 'M5' },
]

const order = (i: number) => ({ '--i': i }) as CSSProperties

function LayerRow({ layer, i }: { layer: Layer; i: number }) {
  const on = useAppStore((s) => ('id' in layer ? s.layers[layer.id] : false))
  const toggleLayer = useAppStore((s) => s.toggleLayer)
  const ready = useTerrain((s) => s.status === 'ready')
  const { label, Icon } = layer

  if (!('id' in layer)) {
    return (
      // Wrapper carries the tooltip because disabled controls ignore hover.
      <li title={`${label}: available from ${layer.pending}`} style={order(i)}>
        <button type="button" className="layer-row" disabled aria-label={label}>
          <Icon className="h-[18px] w-[18px] shrink-0" />
          <span className="hidden flex-1 text-left xl:block">{label}</span>
          <span className="toggle hidden xl:block" aria-hidden="true" />
        </button>
      </li>
    )
  }

  return (
    <li style={order(i)}>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        title={label}
        disabled={!ready}
        className={`layer-row live ${on ? 'on' : ''}`}
        onClick={() => toggleLayer(layer.id)}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" />
        <span className="hidden flex-1 text-left xl:block">{label}</span>
        <span className={`toggle hidden xl:block ${on ? 'on' : ''}`} aria-hidden="true" />
      </button>
    </li>
  )
}

function ToolRow({
  label,
  Icon,
  i,
  pending,
  onClick,
  shortcut,
}: {
  label: string
  Icon: Icon
  i: number
  pending?: string
  onClick?: () => void
  shortcut?: string
}) {
  if (pending) {
    return (
      <li title={`${label}: available from ${pending}`} style={order(i)}>
        <button type="button" className="layer-row" disabled aria-label={label}>
          <Icon className="h-[18px] w-[18px] shrink-0" />
          <span className="hidden flex-1 text-left xl:block">{label}</span>
        </button>
      </li>
    )
  }
  return (
    <li style={order(i)}>
      <button
        type="button"
        className="layer-row live"
        aria-label={label}
        aria-keyshortcuts={shortcut}
        title={shortcut ? `${label} (${shortcut})` : label}
        onClick={onClick}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" />
        <span className="hidden flex-1 text-left xl:block">{label}</span>
        {shortcut && <kbd className="kbd hidden xl:block">{shortcut}</kbd>}
      </button>
    </li>
  )
}

export function LayerPanel() {
  const layers = useAppStore((s) => s.layers)
  const requestView = useAppStore((s) => s.requestView)
  const ready = useTerrain((s) => s.status === 'ready')
  const onCount = Object.values(layers).filter(Boolean).length

  return (
    <nav
      aria-label="Layers and tools"
      style={{ '--d': '0.15s' } as CSSProperties}
      className="layer-panel sheet hud-panel enter-left absolute top-3 left-3 z-10 hidden w-[60px] flex-col md:flex xl:w-[220px]"
    >
      <div className="panel-head hidden xl:flex">
        <span>Layers</span>
        <span className="font-stretch-normal text-[12px] font-normal text-ink-faint">
          {onCount} of {LAYERS.length} on
        </span>
      </div>
      <ul role="list" className="stagger flex flex-col gap-0.5 p-1.5">
        {LAYERS.map((layer, i) => (
          <LayerRow key={layer.label} layer={layer} i={i} />
        ))}
      </ul>
      <div className="mx-3 h-px bg-line" />
      <div className="panel-head hidden xl:flex">
        <span>Tools</span>
      </div>
      <ul role="list" className="stagger flex flex-col gap-0.5 p-1.5 pt-1.5 xl:pt-0">
        <ToolRow label="Inspect point" Icon={PickIcon} i={LAYERS.length} pending="M6" />
        <ToolRow label="Measure" Icon={MeasureIcon} i={LAYERS.length + 1} pending="M6" />
        <ToolRow
          label="Reset view"
          Icon={ResetViewIcon}
          i={LAYERS.length + 2}
          shortcut="R"
          pending={ready ? undefined : 'the terrain loads'}
          onClick={() => requestView('oblique')}
        />
      </ul>
      <p className="hidden px-3.5 pb-3 text-[11px] leading-4 text-ink-faint xl:block">
        Drag to orbit, right-drag to pan, scroll to zoom.
      </p>
    </nav>
  )
}
