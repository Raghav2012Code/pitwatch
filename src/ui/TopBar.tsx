import { MINE_INFO, SURVEY_EPOCHS } from '../data/fixtures/mine'
import { useAppStore } from '../state/store'
import { formatDate } from './format'
import { PitMark } from './icons'

export function TopBar() {
  const drawerOpen = useAppStore((s) => s.drawerOpen)
  const setDrawerOpen = useAppStore((s) => s.setDrawerOpen)

  return (
    <header className="topbar z-30 flex h-14 shrink-0 items-center gap-5 px-4">
      <div className="flex items-center gap-3">
        <span className="brand-mark">
          <PitMark className="h-5 w-5" />
        </span>
        <div className="leading-tight">
          <div className="cond text-[22px] font-bold text-ink">PitWatch</div>
          <div className="hidden text-[11px] whitespace-nowrap text-ink-faint xl:block">
            Compliance monitor
          </div>
        </div>
      </div>

      <div className="hidden h-8 w-px bg-line sm:block" />

      <div className="min-w-0 leading-tight">
        <div className="cond truncate text-[17px] font-semibold text-ink">{MINE_INFO.name}</div>
        <div className="truncate text-[11px] text-ink-faint">
          {MINE_INFO.mineral}, {MINE_INFO.operator}
        </div>
      </div>

      <div className="hidden items-center gap-2 xl:flex">
        {SURVEY_EPOCHS.map((e) => (
          <span key={e.id} className="chip">
            <span className="text-ink-faint">{e.label}</span>
            <span className="font-mono text-ink">{formatDate(e.date)}</span>
          </span>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-3">
        <span
          className="stamp"
          title="Every terrain value, survey and finding in this app is synthetic. The mine is fictional."
        >
          <span className="stamp-dot" aria-hidden="true" />
          SIMULATED DATA
        </span>

        <div className="status-light hidden md:flex" role="status">
          <span className="status-led" aria-hidden="true" />
          <span className="whitespace-nowrap">Compliance not evaluated</span>
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
