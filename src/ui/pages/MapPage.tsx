import { useEffect } from 'react'
import { useAppStore } from '../../state/store'
import { useTerrain } from '../../state/terrain'
import { toggleFullscreen } from '../fullscreen'
import { LayerPanel } from '../LayerPanel'
import { SidePanel } from '../SidePanel'
import { Viewport } from '../Viewport'

/** Full-bleed 3D map with the layer card and the details panel floating above it. */
export function MapPage() {
  const layersHidden = useAppStore((s) => s.layersHidden)
  const detailsHidden = useAppStore((s) => s.detailsHidden)
  const detailsUserSet = useAppStore((s) => s.detailsUserSet)

  // On a laptop-width screen the model is the point of the map, and the two floating panels
  // leave it a narrow stage: at 1100 px the stage would be 372 px wide. Below 1280 px the
  // findings panel therefore starts closed, and the visible header button opens it. Once the
  // visitor has chosen, their choice sticks.
  useEffect(() => {
    if (!detailsUserSet && window.innerWidth < 1280) {
      useAppStore.getState().setDetailsHidden(true)
    }
  }, [detailsUserSet])

  // [ and ] collapse the side panels, F toggles full screen, R resets the view.
  // Ignored while typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if ((e.target as HTMLElement).closest('input, textarea, select, [contenteditable]')) return
      const { toggleLayers, toggleDetails, requestView, setTool, clearPicks } =
        useAppStore.getState()
      if (e.key === '[') toggleLayers()
      else if (e.key === ']') toggleDetails()
      else if (e.key === 'm' || e.key === 'M')
        setTool(useAppStore.getState().tool === 'measure' ? 'inspect' : 'measure')
      else if (e.key === 'Escape') clearPicks()
      else if (e.key === 'f' || e.key === 'F') toggleFullscreen()
      else if ((e.key === 'r' || e.key === 'R') && useTerrain.getState().status === 'ready')
        requestView('oblique')
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Leaving the map forgets old camera requests. Defer cleanup by one microtask so React
  // StrictMode's development-only effect replay does not erase a finding selected on entry.
  useEffect(
    () => () => {
      queueMicrotask(() => {
        if (!document.querySelector('.monitor')) useAppStore.getState().leaveMap()
      })
    },
    [],
  )

  return (
    <div
      className="monitor relative min-h-0 flex-1 overflow-hidden"
      data-layers={layersHidden ? 'hidden' : undefined}
      data-details={detailsHidden ? 'hidden' : undefined}
    >
      <Viewport />
      <LayerPanel />
      <SidePanel />
    </div>
  )
}
