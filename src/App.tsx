import { LayerPanel } from './ui/LayerPanel'
import { SidePanel } from './ui/SidePanel'
import { Timeline } from './ui/Timeline'
import { TopBar } from './ui/TopBar'
import { Viewport } from './ui/Viewport'

/** Full-bleed 3D view with glass HUD panels floating above it. */
export default function App() {
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
