import { useRef, type JSX, type KeyboardEvent } from 'react'
import { useAppStore, type PanelTab } from '../state/store'
import { useTerrain } from '../state/terrain'
import { LayerSwitches } from './LayerControls'
import { FindingsPanel } from './panels/FindingsPanel'
import { InspectorPanel } from './panels/InspectorPanel'
import { ExaggerationSlider } from './viewport/MapHud'

const TABS: { id: PanelTab; label: string }[] = [
  { id: 'findings', label: 'Findings' },
  { id: 'inspector', label: 'Inspector' },
]

const CONTENT: Record<PanelTab, () => JSX.Element> = {
  findings: FindingsPanel,
  inspector: InspectorPanel,
}

export function SidePanel() {
  const activeTab = useAppStore((s) => s.activeTab)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const drawerOpen = useAppStore((s) => s.drawerOpen)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const ready = useTerrain((s) => s.status === 'ready')
  const Content = CONTENT[activeTab]

  // Arrow keys move between tabs (WAI-ARIA tabs pattern).
  const onKeyDown = (e: KeyboardEvent, index: number) => {
    const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!delta) return
    const next = (index + delta + TABS.length) % TABS.length
    setActiveTab(TABS[next]!.id)
    tabRefs.current[next]?.focus()
  }

  return (
    <aside
      id="side-panel"
      aria-label="Details"
      className={`${drawerOpen ? 'flex' : 'hidden'} details-panel card enter-right absolute top-4 right-4 bottom-4 z-20 w-[min(360px,calc(100%-32px))] overflow-hidden flex-col lg:flex lg:w-[320px] xl:w-[360px]`}
    >
      <div role="tablist" aria-label="Details sections" className="tabs">
        {TABS.map((tab, i) => {
          const selected = tab.id === activeTab
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[i] = el
              }}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={selected}
              aria-controls="details-tabpanel"
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`tab ${selected ? 'tab-on' : ''}`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
      {/* One scroll area under the tabs: the layer block and the tab content scroll together,
          so a capped block cannot clip a switch row in half on a short phone. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div
          role="tabpanel"
          id="details-tabpanel"
          aria-labelledby={`tab-${activeTab}`}
          tabIndex={0}
        >
          <div key={activeTab} className="tab-in">
            <Content />
          </div>
        </div>
        {/* Below `md` the floating Map card is hidden, so its switches live here instead: same
            component, one placement at a time. They sit behind a closed disclosure so the drawer
            opens on the findings, not on eight switches. */}
        <details className="md:hidden border-t border-line px-3 py-2">
          <summary className="cursor-pointer list-none py-1 text-[12.5px] font-medium text-ink">
            Map layers and vertical scale
          </summary>
          <div className="pt-2">
            <LayerSwitches />
            {ready && (
              <div className="mt-3 border-t border-line pt-3">
                <ExaggerationSlider />
              </div>
            )}
          </div>
        </details>
      </div>
    </aside>
  )
}
