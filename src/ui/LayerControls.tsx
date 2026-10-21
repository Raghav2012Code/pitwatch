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
  TerrainIcon,
  TintIcon,
} from './icons'

/**
 * The list of map layers and their switches, shared by the floating Map card and the mobile
 * Details drawer. One list, two placements: the card shows from `md` up, the drawer below it,
 * so a given width never shows the same control twice.
 */
const LAYERS: { id: LayerId; label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { id: 'terrain', label: 'Terrain', Icon: TerrainIcon },
  { id: 'tint', label: 'Elevation tint', Icon: TintIcon },
  { id: 'contours', label: 'Contours', Icon: ContourIcon },
]

const OVERLAYS: typeof LAYERS = [
  { id: 'lease', label: 'Lease boundary', Icon: BoundaryIcon },
  { id: 'buffer', label: 'Safety buffer', Icon: BufferIcon },
  { id: 'zones', label: 'Permitted zones', Icon: FloorIcon },
  { id: 'change', label: 'Change since baseline', Icon: ChangeIcon },
  { id: 'findings', label: 'Findings', Icon: FindingIcon },
]

function LayerSwitch({ id, label, Icon, i }: (typeof LAYERS)[number] & { i: number }) {
  const on = useAppStore((s) => s.layers[id])
  const toggleLayer = useAppStore((s) => s.toggleLayer)
  const ready = useTerrain((s) => s.status === 'ready')
  return (
    <li style={{ '--i': i } as CSSProperties}>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={!ready}
        className={`layer-row live ${on ? 'on' : ''}`}
        onClick={() => toggleLayer(id)}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" />
        <span className="flex-1 text-left">{label}</span>
        <span className={`switch ${on ? 'on' : ''}`} aria-hidden="true" />
      </button>
    </li>
  )
}

/** Every layer switch, in the two groups the Map card has always used. */
export function LayerSwitches() {
  return (
    <>
      <h2 className="panel-title px-1">Layers</h2>
      <ul role="list" className="stagger mt-1.5 flex flex-col gap-0.5">
        {LAYERS.map((l, i) => (
          <LayerSwitch key={l.id} {...l} i={i} />
        ))}
      </ul>
      <h2 className="panel-title mt-3 px-1">Permit and change</h2>
      <ul role="list" className="mt-1.5 flex flex-col gap-0.5">
        {OVERLAYS.map((l, i) => (
          <LayerSwitch key={l.id} {...l} i={i + LAYERS.length} />
        ))}
      </ul>
    </>
  )
}
