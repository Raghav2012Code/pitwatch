import { useEffect } from 'react'
import { HomePage } from './ui/HomePage'
import { LayerPanel } from './ui/LayerPanel'
import { useRoute } from './ui/route'
import { SidePanel } from './ui/SidePanel'
import { Timeline } from './ui/Timeline'
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
  return (
    <div className="flex h-full flex-col">
      <TopBar />
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <Viewport />
        <LayerPanel />
        <SidePanel />
        <Timeline />
      </div>
    </div>
  )
}
