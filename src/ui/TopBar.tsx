import { MINE_INFO } from '../data/fixtures/mine'
import { useAppStore } from '../state/store'
import { fullscreenSupported, toggleFullscreen, useIsFullscreen } from './fullscreen'
import { FullscreenIcon, PanelLeftIcon, PanelRightIcon, PitMark } from './icons'
import { HOME_HREF } from './route'

/** Brand, which mine, overall status, data warning and view toggles. Dates live in the timeline. */
export function TopBar() {
  const drawerOpen = useAppStore((s) => s.drawerOpen)
  const setDrawerOpen = useAppStore((s) => s.setDrawerOpen)
  const layersHidden = useAppStore((s) => s.layersHidden)
  const detailsHidden = useAppStore((s) => s.detailsHidden)
  const toggleLayers = useAppStore((s) => s.toggleLayers)
  const toggleDetails = useAppStore((s) => s.toggleDetails)
  const fullscreen = useIsFullscreen()

  return (
    <header className="topbar enter-down z-30 flex h-14 shrink-0 items-center gap-4 px-4">
      <a href={HOME_HREF} className="flex items-center gap-2.5" aria-label="PitWatch home">
        <span className="brand-mark">
          <PitMark className="h-5 w-5" />
        </span>
        <span className="cond text-[21px] font-bold text-ink">PitWatch</span>
      </a>

      <div className="hidden h-6 w-px bg-line-strong sm:block" />

      <div className="min-w-0 leading-tight">
        <h1 className="cond truncate text-[17px] font-semibold text-ink">{MINE_INFO.name}</h1>
        <div className="hidden truncate text-[11.5px] text-ink-faint sm:block">
          {MINE_INFO.mineral}, {MINE_INFO.operator}
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        <div className="status-light hidden md:flex" role="status">
          <span className="status-led" aria-hidden="true" />
          <span className="whitespace-nowrap">Compliance not evaluated</span>
        </div>

        <span
          className="stamp"
          title="Every terrain value, survey and finding in this app is synthetic. The mine is fictional."
        >
          <span className="stamp-dot" aria-hidden="true" />
          SIMULATED DATA
        </span>

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

        <button
          type="button"
          className="btn whitespace-nowrap lg:hidden"
          aria-expanded={drawerOpen}
          aria-controls="side-panel"
          onClick={() => setDrawerOpen(!drawerOpen)}
        >
          {drawerOpen ? 'Close' : 'Details'}
        </button>
      </div>
    </header>
  )
}
