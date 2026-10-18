import { useState, type CSSProperties, type JSX } from 'react'
import { MINE_INFO, SURVEY_EPOCHS } from '../data/fixtures/mine'
import { formatDate, formatLat, formatLon } from './format'
import { NorthArrow, PitPlan, Relief, type PlanFeature } from './schematic'

export function Viewport() {
  const [hover, setHover] = useState<PlanFeature>()
  const [pinned, setPinned] = useState<PlanFeature>()
  const active = hover ?? pinned

  return (
    <main aria-label="3D mine view" className="viewport absolute inset-0">
      <Relief className="fade-in" />

      {/* Stage = the area left visible between the floating panels, framed like a map sheet. */}
      <div className="stage neatline frame-in absolute grid place-items-center">
        <NorthArrow className="absolute top-5 right-5 hidden md:block" />
        <Legend
          active={active}
          pinned={pinned}
          onHover={setHover}
          onPin={(f) => setPinned((p) => (p === f ? undefined : f))}
        />
        <TitleBlock />

        <figure className="flex flex-col items-center text-center">
          <PitPlan className="w-[min(520px,74vw)]" highlight={active} flight />

          <figcaption className="enter-up mt-3 max-w-sm" style={{ '--d': '0.9s' } as CSSProperties}>
            <div className="map-note">Schematic, not survey data</div>
            <h2 className="cond mt-2 text-[22px] font-bold text-ink">Awaiting terrain model</h2>
            <p className="mt-1 text-[13px] leading-5 text-ink-dim">
              The 3D survey surface, lease boundary and findings will render here.
            </p>
          </figcaption>
        </figure>
      </div>
    </main>
  )
}

const LEGEND: { key: PlanFeature; label: string; sample: JSX.Element }[] = [
  {
    key: 'index',
    label: 'Index contour',
    sample: <path d="M2 7H34" className="bench bench-index" />,
  },
  { key: 'bench', label: 'Bench contour', sample: <path d="M2 7H34" className="bench" /> },
  {
    key: 'ticks',
    label: 'Ticks point downhill',
    sample: <path d="M2 4H34M8 4V9M18 4V9M28 4V9" className="bench-ticks" />,
  },
  {
    key: 'road',
    label: 'Haul road',
    sample: (
      <>
        <path d="M2 7H34" className="road-casing" />
        <path d="M2 7H34" className="road" />
      </>
    ),
  },
  {
    key: 'floor',
    label: 'Approved floor',
    sample: <rect x="3" y="2" width="30" height="10" rx="5" className="approved-floor" />,
  },
  {
    key: 'flight',
    label: 'Drone flight line',
    sample: <path d="M2 7H34" className="flight-lines" />,
  },
]

/** Map key. Hover or focus an entry to pick it out on the plan; click to keep it picked. */
function Legend({
  active,
  pinned,
  onHover,
  onPin,
}: {
  active?: PlanFeature
  pinned?: PlanFeature
  onHover: (f?: PlanFeature) => void
  onPin: (f: PlanFeature) => void
}) {
  return (
    <section
      aria-label="Map legend"
      className="map-legend enter-up absolute bottom-5 left-5 hidden xl:block"
      style={{ '--d': '1.1s' } as CSSProperties}
    >
      <h3 className="cond text-[14px] font-semibold text-ink">Legend</h3>
      <ul className="mt-1.5 space-y-0.5" onMouseLeave={() => onHover(undefined)}>
        {LEGEND.map(({ key, label, sample }) => (
          <li key={key}>
            <button
              type="button"
              aria-pressed={pinned === key}
              className={`legend-item ${active === key ? 'on' : ''}`}
              onMouseEnter={() => onHover(key)}
              onFocus={() => onHover(key)}
              onBlur={() => onHover(undefined)}
              onClick={() => onPin(key)}
            >
              <svg viewBox="0 0 36 14" className="h-3.5 w-9 shrink-0" aria-hidden="true">
                {sample}
              </svg>
              {label}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Map-sheet title block: what this sheet shows, taken from the mine fixture. */
function TitleBlock() {
  const [baseline, current] = SURVEY_EPOCHS
  const m = MINE_INFO
  return (
    <section
      aria-label="Sheet details"
      className="title-block enter-down absolute top-5 left-5 hidden xl:block"
      style={{ '--d': '1.2s' } as CSSProperties}
    >
      <div className="cond text-[16px] leading-tight font-bold text-ink">{m.name}</div>
      <div className="text-[11.5px] text-ink-dim">{m.mineral}</div>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 border-t border-line pt-2 text-[11px]">
        <dt className="text-ink-faint">Baseline</dt>
        <dd className="font-mono text-ink">{baseline && formatDate(baseline.date)}</dd>
        <dt className="text-ink-faint">Current</dt>
        <dd className="font-mono text-ink">{current && formatDate(current.date)}</dd>
        <dt className="text-ink-faint">Origin</dt>
        <dd className="font-mono text-ink">
          {formatLat(m.originLatLon.lat)}, {formatLon(m.originLatLon.lon)}
        </dd>
      </dl>
      <div className="mt-2 text-[10.5px] text-ink-faint italic">Schematic, not to scale</div>
    </section>
  )
}
