import { useEffect } from 'react'
import { WorkerTerrainProvider } from './data/WorkerTerrainProvider'
import { useAppStore } from './state/store'
import { useTerrain } from './state/terrain'
import { toggleFullscreen } from './ui/fullscreen'
import { HomePage } from './ui/HomePage'
import { LayerPanel } from './ui/LayerPanel'
import { useRoute } from './ui/route'
import { SidePanel } from './ui/SidePanel'
import { TopBar } from './ui/TopBar'
import { Viewport } from './ui/Viewport'

export default function App() {
  const route = useRoute()

  useEffect(() => {
    document.title = route === 'home' ? 'PitWatch 3D' : 'Monitor – PitWatch 3D'
  }, [route])

  return route === 'home' ? <HomePage /> : <Monitor />
}

/** Full-bleed map view with paper panels floating above it. */
function Monitor() {
  const layersHidden = useAppStore((s) => s.layersHidden)
  const detailsHidden = useAppStore((s) => s.detailsHidden)

  // Build the synthetic surveys once, in a worker, the first time the monitor opens.
  useEffect(() => {
    void useTerrain.getState().load(new WorkerTerrainProvider())
  }, [])

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

  return (
    <div
      className="monitor flex h-full flex-col"
      data-layers={layersHidden ? 'hidden' : undefined}
      data-details={detailsHidden ? 'hidden' : undefined}
    >
      <TopBar />
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <Viewport />
        <LayerPanel />
        <SidePanel />
      </div>
    </div>
  )
}
