import { useAppStore } from '../../state/store'
import { useTerrain } from '../../state/terrain'
import { countText, worstTone } from '../findings'
import { fullscreenSupported, toggleFullscreen, useIsFullscreen } from '../fullscreen'
import { FullscreenIcon, MenuIcon, PanelLeftIcon, PanelRightIcon } from '../icons'
import type { DashboardRoute } from './nav'
import { PAGES } from './nav'

/** Page title, overall status, the data warning and, on the 3D map, the view toggles. */
export function Header({ route }: { route: DashboardRoute }) {
  const { title, subtitle } = PAGES[route]
  const onMap = route === 'monitor'

  const menuOpen = useAppStore((s) => s.menuOpen)
  const setMenuOpen = useAppStore((s) => s.setMenuOpen)
  const drawerOpen = useAppStore((s) => s.drawerOpen)
  const setDrawerOpen = useAppStore((s) => s.setDrawerOpen)
  const layersHidden = useAppStore((s) => s.layersHidden)
  const detailsHidden = useAppStore((s) => s.detailsHidden)
  const toggleLayers = useAppStore((s) => s.toggleLayers)
  const toggleDetails = useAppStore((s) => s.toggleDetails)
  const fullscreen = useIsFullscreen()
  const ready = useTerrain((s) => s.status === 'ready')
  const findings = useTerrain((s) => s.findings)

  return (
    <header className="shell-header">
      <button
        type="button"
        className="icon-btn lg:hidden"
        aria-label="Menu"
        aria-expanded={menuOpen}
        aria-controls="sidebar"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <MenuIcon className="h-[20px] w-[20px]" />
      </button>

      <div className="min-w-0 leading-tight">
        <h1 className="cond truncate text-[20px] font-bold text-ink">{title}</h1>
        <p className="hidden truncate text-[12.5px] text-ink-faint lg:block">{subtitle}</p>
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        <div className="status-light hidden md:flex" role="status">
          <span
            className="status-led"
            data-tone={ready ? worstTone(findings) : undefined}
            aria-hidden="true"
          />
          <span className="whitespace-nowrap">
            {ready ? countText(findings) : 'Compliance not evaluated'}
          </span>
        </div>

        <span
          className="stamp"
          title="Every terrain value, survey and finding in this app is synthetic. The mine is fictional."
        >
          <span className="stamp-dot" aria-hidden="true" />
          SIMULATED DATA
        </span>

        {onMap && (
          <div
            role="group"
            aria-label="View"
            className="hidden items-center gap-0.5 border-l border-line pl-2.5 md:flex"
          >
            <button
              type="button"
              className="icon-btn"
              aria-pressed={!layersHidden}
              aria-keyshortcuts="["
              title="Map panel ( [ )"
              aria-label="Map panel"
              onClick={toggleLayers}
            >
              <PanelLeftIcon className="h-[18px] w-[18px]" />
            </button>
            <button
              type="button"
              className="icon-btn hidden lg:grid"
              aria-pressed={!detailsHidden}
              aria-keyshortcuts="]"
              title="Details panel ( ] )"
              aria-label="Details panel"
              onClick={toggleDetails}
            >
              <PanelRightIcon className="h-[18px] w-[18px]" />
            </button>
            {fullscreenSupported() && (
              <button
                type="button"
                className="icon-btn"
                aria-pressed={fullscreen}
                aria-keyshortcuts="F"
                title={fullscreen ? 'Exit full screen (F)' : 'Full screen (F)'}
                aria-label="Full screen"
                onClick={toggleFullscreen}
              >
                <FullscreenIcon className="h-[18px] w-[18px]" />
              </button>
            )}
          </div>
        )}

        {onMap && (
          <button
            type="button"
            className="btn whitespace-nowrap lg:hidden"
            aria-expanded={drawerOpen}
            aria-controls="side-panel"
            onClick={() => setDrawerOpen(!drawerOpen)}
          >
            {drawerOpen ? 'Close' : 'Details'}
          </button>
        )}
      </div>
    </header>
  )
}
