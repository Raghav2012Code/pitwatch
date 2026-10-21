import { useState, type CSSProperties } from 'react'
import { useTerrain } from '../state/terrain'
import { LayerSwitches } from './LayerControls'
import { ExaggerationSlider, MapKey, OverlayKey } from './viewport/MapHud'

/** Map controls: what is drawn, what the colours mean, and the vertical scale. */
export function LayerPanel() {
  const ready = useTerrain((s) => s.status === 'ready')
  // The key is reference material: open it where there is room, fold it away on a short laptop
  // screen so the controls under it are not pushed off the card.
  const [keyOpen] = useState(() => window.innerHeight >= 880)

  return (
    <nav
      aria-label="Map"
      style={{ '--d': '0.15s' } as CSSProperties}
      className="layer-panel card enter-left absolute top-4 left-4 z-10 hidden max-h-[calc(100%-32px)] w-[240px] flex-col overflow-y-auto md:flex"
    >
      <section className="px-3 pt-3 pb-2">
        <LayerSwitches />
      </section>

      {ready && (
        <>
          <section className="border-t border-line px-4 py-3">
            <ExaggerationSlider />
          </section>
          <details className="key-details border-t border-line" open={keyOpen}>
            <summary className="panel-title">Key</summary>
            <div className="px-4 pb-3">
              <MapKey />
              <div className="mt-3 border-t border-line pt-3 empty:hidden">
                <OverlayKey />
              </div>
            </div>
          </details>
        </>
      )}

      <p className="mt-auto border-t border-line px-4 py-2.5 text-[11.5px] leading-4 text-ink-faint">
        Drag to orbit, right-drag to pan, scroll to zoom. <kbd className="kbd">R</kbd> resets the
        view.
      </p>
    </nav>
  )
}
