import { LayerRail } from './ui/LayerRail'
import { SidePanel } from './ui/SidePanel'
import { Timeline } from './ui/Timeline'
import { TopBar } from './ui/TopBar'
import { Viewport } from './ui/Viewport'

export default function App() {
  return (
    <div className="flex h-full flex-col">
      <TopBar />
      <div className="relative flex min-h-0 flex-1">
        <LayerRail />
        <Viewport />
        <SidePanel />
      </div>
      <Timeline />
    </div>
  )
}
