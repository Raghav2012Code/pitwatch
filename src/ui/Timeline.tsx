import type { CSSProperties } from 'react'
import { SURVEY_EPOCHS } from '../data/fixtures/mine'
import { daysBetween, formatDate, monthTicks } from './format'
import { useCountUp } from './useCountUp'

/** Survey timeline: the two epochs, the months between them, and which one is on the map. */
export function Timeline() {
  const [baseline, current] = SURVEY_EPOCHS
  const days = baseline && current ? daysBetween(baseline.date, current.date) : 0
  const shownDays = useCountUp(days, 1400, 500)
  if (!baseline || !current) return null
  const ticks = monthTicks(baseline.date, current.date)

  return (
    <div className="@container pointer-events-none absolute inset-x-4 bottom-4 flex justify-center">
      <section
        aria-label="Survey timeline"
        className="card enter-up pointer-events-auto flex w-full max-w-[600px] items-center gap-4 px-4 py-2.5"
        style={{ '--d': '0.5s' } as CSSProperties}
      >
        <Epoch label={baseline.label} date={baseline.date} />
        <div className="relative h-7 min-w-[90px] flex-1" aria-hidden="true">
          <div className="track track-draw absolute inset-x-0 top-3" />
          {ticks.map((t) => (
            <div
              key={t.label}
              className="tick-pop absolute top-[9px]"
              style={{ left: `${t.t * 100}%`, '--t': t.t } as CSSProperties}
            >
              <div className="h-2 w-px bg-line-strong" />
              <div className="mt-0.5 -translate-x-1/2 font-mono text-[9.5px] text-ink-faint">
                {t.label.slice(0, 1)}
              </div>
            </div>
          ))}
          <span className="epoch-dot absolute top-[7px] left-0" />
          <span className="epoch-dot shown absolute top-[7px] right-0" title="Shown on the map" />
        </div>
        <Epoch label={current.label} date={current.date} shown />
        <div className="hidden border-l border-line pl-3 text-right leading-none whitespace-nowrap @[540px]:block">
          <span className="cond text-[22px] font-bold text-ink">{shownDays}</span>
          <span className="ml-1 text-[11px] text-ink-faint">days</span>
        </div>
      </section>
    </div>
  )
}

function Epoch({ label, date, shown }: { label: string; date: string; shown?: boolean }) {
  return (
    <div className={`leading-tight whitespace-nowrap ${shown ? 'text-right' : ''}`}>
      <div className="flex items-center gap-1.5 text-[12px] font-semibold text-ink">
        {shown && <span className="map-tag hidden @[480px]:inline">on map</span>}
        {label}
      </div>
      <div className="font-mono text-[11px] text-ink-dim">{formatDate(date)}</div>
    </div>
  )
}
