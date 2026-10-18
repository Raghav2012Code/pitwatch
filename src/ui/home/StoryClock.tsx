import type { CSSProperties } from 'react'
import { SURVEY_EPOCHS } from '../../data/fixtures/mine'
import { useStory } from '../../state/story'
import { addDays, daysBetween, formatDate, monthTicks } from '../format'

const [BASELINE, CURRENT] = SURVEY_EPOCHS
const DAYS = BASELINE && CURRENT ? daysBetween(BASELINE.date, CURRENT.date) : 0
const MONTHS = BASELINE && CURRENT ? monthTicks(BASELINE.date, CURRENT.date) : []

/**
 * Date bar under the home model. Follows the scroll continuously: the marker slides, the
 * passed part of the track fills, and the readout counts the days. Between the two
 * surveys the model is a blend, and the bar says so.
 */
export function StoryClock() {
  const t = useStory((s) => s.t)
  if (!BASELINE || !CURRENT) return null
  const day = Math.round(t * DAYS)
  const between = t > 0.001 && t < 0.999

  return (
    <div className="story-clock" style={{ '--t': t } as CSSProperties}>
      <div className="flex items-baseline justify-between gap-3 text-[12px]">
        <span className={t < 0.5 ? 'font-semibold text-ink' : 'text-ink-faint'}>
          {formatDate(BASELINE.date)}
        </span>
        <span className="cond text-[14px] font-semibold text-ink tabular-nums">
          {t <= 0.001
            ? `${DAYS} days between surveys`
            : `${formatDate(addDays(BASELINE.date, day))}, day ${day} of ${DAYS}`}
        </span>
        <span className={t >= 0.5 ? 'font-semibold text-ink' : 'text-ink-faint'}>
          {formatDate(CURRENT.date)}
        </span>
      </div>
      <div className="relative mt-2 h-4" aria-hidden="true">
        <div className="track absolute inset-x-0 top-2" />
        <div className="clock-fill absolute top-2 left-0" />
        {MONTHS.map((m) => (
          <span
            key={m.label}
            className={`clock-tick absolute top-1 h-2 w-px ${m.t <= t ? 'passed' : ''}`}
            style={{ left: `${m.t * 100}%` }}
          />
        ))}
        <span className="clock-marker" />
      </div>
      <div className="mt-1.5 text-center text-[11.5px] text-ink-faint" role="status">
        {between
          ? 'Model blended between the two surveys: an illustration, not a survey.'
          : t >= 0.999
            ? `${CURRENT.label} survey on the model.`
            : `${BASELINE.label} survey on the model.`}
      </div>
    </div>
  )
}
