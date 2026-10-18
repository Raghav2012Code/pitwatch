import type { ReactNode } from 'react'
import { MINE_INFO, SURVEY_EPOCHS } from '../data/fixtures/mine'
import { useAppStore } from '../state/store'
import { formatDate } from './format'
import { PendingGlyph, PitMark } from './icons'

/** One field of the survey-plan style title block. */
function Cell({
  label,
  children,
  className = '',
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`flex min-w-0 flex-col justify-center border-l border-line px-4 ${className}`}>
      <span className="text-[11px] leading-4 text-ink-faint">{label}</span>
      <span className="truncate text-[13px] leading-5 text-ink">{children}</span>
    </div>
  )
}

export function TopBar() {
  const drawerOpen = useAppStore((s) => s.drawerOpen)
  const setDrawerOpen = useAppStore((s) => s.setDrawerOpen)

  return (
    <header className="flex h-14 shrink-0 items-stretch border-b border-line bg-panel">
      <div className="flex items-center gap-2.5 px-4">
        <PitMark className="h-6 w-6 text-accent" />
        <span className="text-[15px] font-semibold tracking-tight">PitWatch</span>
      </div>

      <Cell label="Mine">{MINE_INFO.name}</Cell>
      <Cell label="Operator" className="hidden 2xl:flex">
        {MINE_INFO.operator}
      </Cell>
      {SURVEY_EPOCHS.map((e) => (
        <Cell key={e.id} label={`${e.label} survey`} className="hidden lg:flex">
          <span className="font-mono text-[12.5px]">{formatDate(e.date)}</span>
        </Cell>
      ))}

      <div className="flex items-center border-l border-line px-4">
        <span
          className="stamp"
          title="Every terrain value, survey and finding in this app is synthetic. The mine is fictional."
        >
          SIMULATED DATA
        </span>
      </div>

      <div className="ml-auto flex items-center gap-3 border-l border-line px-4">
        <div
          className="flex items-center gap-2 text-[13px] text-ink-dim"
          role="status"
          title="Compliance not evaluated"
        >
          <PendingGlyph className="h-4 w-4" />
          <span className="sr-only whitespace-nowrap xl:not-sr-only">Compliance not evaluated</span>
        </div>
        <button
          type="button"
          className="btn whitespace-nowrap lg:hidden"
          aria-expanded={drawerOpen}
          aria-controls="side-panel"
          onClick={() => setDrawerOpen(!drawerOpen)}
        >
          {drawerOpen ? 'Close details' : 'Details'}
        </button>
      </div>
    </header>
  )
}
