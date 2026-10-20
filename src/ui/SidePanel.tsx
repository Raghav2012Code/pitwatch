import { useRef, type JSX, type KeyboardEvent } from 'react'
import { useAppStore, type PanelTab } from '../state/store'
import { AboutDataPanel } from './panels/AboutDataPanel'
import { FindingsPanel } from './panels/FindingsPanel'
import { InspectorPanel } from './panels/InspectorPanel'
import { OverviewPanel } from './panels/OverviewPanel'

const TABS: { id: PanelTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'findings', label: 'Findings' },
  { id: 'inspector', label: 'Inspector' },
  { id: 'about', label: 'About data' },
]

const CONTENT: Record<PanelTab, () => JSX.Element> = {
  overview: OverviewPanel,
  findings: FindingsPanel,
  inspector: InspectorPanel,
  about: AboutDataPanel,
}

export function SidePanel() {
  const activeTab = useAppStore((s) => s.activeTab)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const drawerOpen = useAppStore((s) => s.drawerOpen)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
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
      className={`${drawerOpen ? 'flex' : 'hidden'} details-panel card enter-right absolute top-4 right-4 bottom-4 z-20 w-[min(360px,calc(100%-32px))] overflow-hidden flex-col lg:flex`}
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
      <div
        role="tabpanel"
        id="details-tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        tabIndex={0}
        className="min-h-0 flex-1 overflow-y-auto"
      >
        <div key={activeTab} className="tab-in">
          <Content />
        </div>
      </div>
    </aside>
  )
}
