import type { CSSProperties } from 'react'
import { SURVEY_EPOCHS } from '../data/fixtures/mine'
import { useAppStore, type Epoch } from '../state/store'
import { useTerrain } from '../state/terrain'
import { daysBetween, formatDate, monthTicks } from './format'
import { useCountUp } from './useCountUp'

/**
 * Survey timeline: the two epochs, the months between them, and a slider that picks which
 * survey the map shows. There are only two real surveys, so it snaps to one or the other.
 */
export function Timeline() {
  const [baseline, current] = SURVEY_EPOCHS
  const days = baseline && current ? daysBetween(baseline.date, current.date) : 0
  const shownDays = useCountUp(days, 1400, 500)
  const epoch = useAppStore((s) => s.epoch)
  const setEpoch = useAppStore((s) => s.setEpoch)
  const ready = useTerrain((s) => s.status === 'ready')
  if (!baseline || !current) return null
  const ticks = monthTicks(baseline.date, current.date)

  return (
    <div className="@container pointer-events-none absolute inset-x-4 bottom-4 flex justify-center">
      <section
        aria-label="Survey timeline"
        className="card enter-up pointer-events-auto flex w-full max-w-[600px] flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 @[480px]:flex-nowrap"
        style={{ '--d': '0.5s' } as CSSProperties}
      >
        <Epoch
          label={baseline.label}
          date={baseline.date}
          id="baseline"
          className="order-1 flex-1 @[480px]:order-none @[480px]:flex-none"
          shown={epoch === 'baseline'}
          onPick={ready ? setEpoch : undefined}
        />
        <div className="relative order-3 h-7 min-w-[90px] basis-full @[480px]:order-none @[480px]:flex-1 @[480px]:basis-auto">
          <div aria-hidden="true" className="absolute inset-0">
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
            <span className="epoch-dot absolute top-[7px] right-0" />
            <span
              className={`epoch-dot shown absolute top-[7px] ${epoch === 'baseline' ? 'at-start left-0' : 'right-0'}`}
            />
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={1}
            value={epoch === 'current' ? 1 : 0}
            disabled={!ready}
            onChange={(e) => setEpoch(e.target.value === '1' ? 'current' : 'baseline')}
            aria-label="Survey shown on the map"
            aria-valuetext={`${epoch === 'current' ? current.label : baseline.label} survey`}
            className="epoch-range inset-x-0 top-0 w-full pointer-coarse:-top-2 pointer-coarse:h-11"
          />
        </div>
        <Epoch
          label={current.label}
          date={current.date}
          id="current"
          className="order-2 flex-1 @[480px]:order-none @[480px]:flex-none"
          shown={epoch === 'current'}
          right
          onPick={ready ? setEpoch : undefined}
        />
        <div className="hidden border-l border-line pl-3 text-right leading-none whitespace-nowrap @[540px]:block">
          <span className="cond text-[22px] font-bold text-ink">{shownDays}</span>
          <span className="ml-1 text-[11px] text-ink-faint">days</span>
        </div>
      </section>
    </div>
  )
}

function Epoch({
  label,
  date,
  id,
  shown,
  right,
  className = '',
  onPick,
}: {
  className?: string
  label: string
  date: string
  id: Epoch
  shown: boolean
  right?: boolean
  onPick?: (e: Epoch) => void
}) {
  return (
    <button
      type="button"
      disabled={!onPick}
      aria-pressed={shown}
      onClick={() => onPick?.(id)}
      className={`epoch-btn leading-tight whitespace-nowrap ${right ? 'text-right' : 'text-left'} ${className}`}
    >
      <div
        className={`flex items-center gap-1.5 text-[12px] font-semibold text-ink ${right ? 'justify-end' : ''}`}
      >
        {shown && right && <span className="map-tag hidden @[480px]:inline">on map</span>}
        {label}
        {shown && !right && <span className="map-tag hidden @[480px]:inline">on map</span>}
      </div>
      <div className="font-mono text-[11px] text-ink-dim">{formatDate(date)}</div>
    </button>
  )
}
