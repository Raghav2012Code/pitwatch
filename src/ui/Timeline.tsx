import { SURVEY_EPOCHS } from '../data/fixtures/mine'
import { daysBetween, formatDate, monthTicks } from './format'

export function Timeline() {
  const [baseline, current] = SURVEY_EPOCHS
  if (!baseline || !current) return null
  const days = daysBetween(baseline.date, current.date)
  const ticks = monthTicks(baseline.date, current.date)

  return (
    <footer
      aria-label="Survey timeline"
      className="sheet hud-panel absolute right-3 bottom-3 left-3 z-10 flex items-center gap-5 px-5 py-3 md:left-[84px] lg:right-[384px] xl:left-[244px]"
    >
      <Epoch label={baseline.label} date={baseline.date} />

      <div className="relative h-10 flex-1" aria-hidden="true">
        <div className="track absolute inset-x-0 top-4" />
        {ticks.map((t) => (
          <div key={t.label} className="absolute top-2.5" style={{ left: `${t.t * 100}%` }}>
            <div className="mx-auto h-3 w-px bg-line-strong" />
            <div className="mt-1.5 -translate-x-1/2 font-mono text-[10px] text-ink-faint">
              {t.label}
            </div>
          </div>
        ))}
      </div>

      <Epoch label={current.label} date={current.date} align="right" />

      <div className="hidden border-l border-line pl-5 text-right leading-tight sm:block">
        <div className="cond text-[26px] leading-none font-bold text-ink">{days}</div>
        <div className="text-[11px] text-ink-faint">days apart</div>
      </div>
    </footer>
  )
}

function Epoch({ label, date, align }: { label: string; date: string; align?: 'right' }) {
  return (
    <div className={`flex items-center gap-2.5 ${align ? 'flex-row-reverse text-right' : ''}`}>
      {/* Trig-point symbol: triangle with a centre dot, the map sign for a survey station. */}
      <svg viewBox="-8 -8 16 14" className="h-3.5 w-4 shrink-0" aria-hidden="true">
        <path
          d="M0 -7 L7 5 L-7 5 Z"
          fill="var(--color-panel)"
          stroke="var(--color-oxide)"
          strokeWidth="1.6"
        />
        <circle cx="0" cy="1" r="1.6" fill="var(--color-oxide)" />
      </svg>
      <div className="leading-tight">
        <div className="cond text-[15px] font-semibold text-ink">{label}</div>
        <div className="font-mono text-[11px] text-ink-dim">{formatDate(date)}</div>
      </div>
    </div>
  )
}
