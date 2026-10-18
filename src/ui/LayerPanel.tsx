import type { ComponentType, CSSProperties, SVGProps } from 'react'
import { useAppStore, type LayerId } from '../state/store'
import { useTerrain } from '../state/terrain'
import { ContourIcon, TerrainIcon, TintIcon } from './icons'
import { ExaggerationSlider, MapKey } from './viewport/MapHud'

const LAYERS: { id: LayerId; label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { id: 'terrain', label: 'Terrain', Icon: TerrainIcon },
  { id: 'tint', label: 'Elevation tint', Icon: TintIcon },
  { id: 'contours', label: 'Contours', Icon: ContourIcon },
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

/** Map controls: what is drawn, what the colours mean, and the vertical scale. */
export function LayerPanel() {
  const ready = useTerrain((s) => s.status === 'ready')

  return (
    <nav
      aria-label="Map"
      style={{ '--d': '0.15s' } as CSSProperties}
      className="layer-panel card enter-left absolute top-4 left-4 z-10 hidden max-h-[calc(100%-32px)] w-[240px] flex-col overflow-y-auto md:flex"
    >
      <section className="px-3 pt-3 pb-2">
        <h2 className="panel-title px-1">Layers</h2>
        <ul role="list" className="stagger mt-1.5 flex flex-col gap-0.5">
          {LAYERS.map((l, i) => (
            <LayerSwitch key={l.id} {...l} i={i} />
          ))}
        </ul>
        <p className="mt-2 px-1 text-[11.5px] leading-4 text-ink-faint">
          Lease boundary, buffer, change and findings layers arrive with the rule engine.
        </p>
      </section>

      {ready && (
        <>
          <section className="border-t border-line px-4 py-3">
            <h2 className="panel-title mb-2">Key</h2>
            <MapKey />
          </section>
          <section className="border-t border-line px-4 py-3">
            <ExaggerationSlider />
          </section>
        </>
      )}

      <p className="mt-auto border-t border-line px-4 py-2.5 text-[11.5px] leading-4 text-ink-faint">
        Drag to orbit, right-drag to pan, scroll to zoom. <kbd className="kbd">R</kbd> resets the
        view.
      </p>
    </nav>
  )
}
