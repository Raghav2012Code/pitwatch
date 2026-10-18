import type { CSSProperties, JSX } from 'react'
import { NorthArrow, PitPlan, Relief } from './schematic'

export function Viewport() {
  return (
    <main aria-label="3D mine view" className="viewport absolute inset-0">
      <Relief className="fade-in" />

      {/* Stage = the area left visible between the floating panels, framed like a map sheet. */}
      <div className="stage neatline frame-in absolute grid place-items-center">
        <NorthArrow className="absolute top-5 right-5 hidden md:block" />
        <Legend />

        <figure className="flex flex-col items-center text-center">
          <PitPlan className="w-[min(520px,74vw)]" />

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

const LEGEND: { label: string; sample: JSX.Element }[] = [
  { label: 'Index contour', sample: <path d="M2 7H34" className="bench bench-index" /> },
  { label: 'Bench contour', sample: <path d="M2 7H34" className="bench" /> },
  {
    label: 'Ticks point downhill',
    sample: <path d="M2 4H34M8 4V9M18 4V9M28 4V9" className="bench-ticks" />,
  },
  {
    label: 'Haul road',
    sample: (
      <>
        <path d="M2 7H34" className="road-casing" />
        <path d="M2 7H34" className="road" />
      </>
    ),
  },
  {
    label: 'Approved floor',
    sample: <rect x="3" y="2" width="30" height="10" rx="5" className="approved-floor" />,
  },
]

/** Map key for the schematic. */
function Legend() {
  return (
    <section
      aria-label="Map legend"
      className="map-legend enter-up absolute bottom-5 left-5 hidden xl:block"
      style={{ '--d': '1.1s' } as CSSProperties}
    >
      <h3 className="cond text-[14px] font-semibold text-ink">Legend</h3>
      <ul className="mt-1.5 space-y-1">
        {LEGEND.map(({ label, sample }) => (
          <li key={label} className="flex items-center gap-2.5 text-[12px] text-ink-dim">
            <svg viewBox="0 0 36 14" className="h-3.5 w-9 shrink-0" aria-hidden="true">
              {sample}
            </svg>
            {label}
          </li>
        ))}
      </ul>
    </section>
  )
}
