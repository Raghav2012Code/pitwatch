import { SURVEY_EPOCHS } from '../data/fixtures/mine'
import { daysBetween, formatDate } from './format'

export function Timeline() {
  const [baseline, current] = SURVEY_EPOCHS
  if (!baseline || !current) return null
  const days = daysBetween(baseline.date, current.date)

  return (
    <footer
      aria-label="Survey timeline"
      className="flex h-16 shrink-0 items-center gap-6 border-t border-line bg-panel px-5"
    >
      <span className="text-[13px] text-ink-dim">Surveys</span>
      <div className="relative flex flex-1 items-center">
        <div className="absolute inset-x-1.5 top-1/2 h-px -translate-y-1/2 bg-line-strong" />
        <span className="absolute left-1/2 -translate-x-1/2 bg-panel px-2 font-mono text-[11px] text-ink-faint">
          {days} days apart
        </span>
        {[baseline, current].map((e, i) => (
          <div
            key={e.id}
            className={`relative flex items-center gap-2.5 bg-panel ${
              i === 1 ? 'ml-auto flex-row-reverse pl-2 text-right' : 'pr-2'
            }`}
          >
            <span className="h-2.5 w-2.5 rotate-45 border border-accent bg-bg" aria-hidden="true" />
            <div className="leading-4">
              <div className="text-[12px] text-ink">{e.label}</div>
              <div className="font-mono text-[11px] text-ink-dim">{formatDate(e.date)}</div>
            </div>
          </div>
        ))}
      </div>
    </footer>
  )
}
