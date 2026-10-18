import type { CSSProperties } from 'react'
import { loop, ticks, toPath, type Pt } from './contours'

/* Everything drawn here is a schematic. Real survey contours replace it in M3. */

/** Backdrop hills and ridges: [cx, cy, rx, ry, rings, phase]. */
const RELIEF: [number, number, number, number, number, number][] = [
  [260, 210, 300, 210, 9, 0.4],
  [1380, 820, 380, 260, 10, 2.2],
  [1500, 120, 260, 180, 7, 4.1],
  [120, 900, 240, 170, 6, 1.3],
]

const backdrop = RELIEF.flatMap(([cx, cy, rx, ry, n, ph]) =>
  Array.from({ length: n }, (_, i) => {
    const s = 1 - i / n
    return {
      d: toPath(
        loop(cx + i * 6, cy - i * 4, rx * s, ry * s, [
          [0.08, 2, ph + i * 0.2],
          [0.05, 3, ph * 2 - i * 0.15],
          [0.03, 5, ph + i * 0.3],
        ]),
      ),
      index: i % 5 === 0,
    }
  }),
)

/** Pit benches, rim first. Centre drifts so the pit is asymmetric, as real pits are. */
const PIT_RINGS = 10
const pit = Array.from({ length: PIT_RINGS }, (_, i) => {
  const s = 1 - i / (PIT_RINGS + 0.6)
  const cx = i * 5
  const cy = i * 3
  const pts = loop(cx, cy, 240 * s, 165 * s, [
    [0.06, 2, 0.8 + i * 0.12],
    [0.04, 3, 2.1 - i * 0.1],
    [0.02, 5, 0.3 + i * 0.25],
  ])
  return { pts, cx, cy, index: i % 3 === 0 }
})

/** Haul road: a ramp that follows each bench wall while dropping to the next bench. */
const road: Pt[] = pit.slice(0, -2).flatMap(({ pts }, i) =>
  Array.from({ length: 8 }, (_, k) => {
    const t = k / 8
    const idx = (Math.round(70 - (i + t) * 9) + 960) % 96
    const [ax, ay] = pts[idx]!
    const [bx, by] = pit[i + 1]!.pts[idx]!
    return [ax + (bx - ax) * t, ay + (by - ay) * t] as Pt
  }),
)
const floor = pit[PIT_RINGS - 1]!

/** Faint hills and ridges filling the container. */
export function Relief({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`absolute inset-0 h-full w-full ${className}`}
      viewBox="0 0 1600 1000"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {backdrop.map((c, i) => (
        <path key={i} d={c.d} className={c.index ? 'contour contour-index' : 'contour'} />
      ))}
    </svg>
  )
}

/** Top-down contour plan of a generic stepped pit. Draws in once on mount. */
export function PitPlan({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="-270 -200 560 410" className={`pit-plan ${className}`} aria-hidden="true">
      {pit.map(({ pts, cx, cy, index }, i) => (
        <g key={i} style={{ '--i': i } as CSSProperties}>
          <path
            d={toPath(pts)}
            pathLength={1}
            className={`draw ${index ? 'bench bench-index' : 'bench'}`}
          />
          <path d={ticks(pts, cx, cy, 6, index ? 7 : 5)} className="bench-ticks" />
        </g>
      ))}

      <path d={toPath(road, false)} className="road-casing" />
      <path d={toPath(road, false)} className="road" />

      {/* Approved floor reference, dashed. */}
      <ellipse cx={floor.cx} cy={floor.cy} rx="34" ry="22" className="approved-floor" />

      <text x="0" y="-178" className="plan-label">
        rim
      </text>
      <text x={floor.cx} y={floor.cy + 4} className="plan-label">
        floor
      </text>
    </svg>
  )
}

export function NorthArrow({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="-14 -30 28 52" className={`h-[52px] w-7 ${className}`} aria-hidden="true">
      <text y="-19" className="north-n">
        N
      </text>
      <path d="M0 -12 L-8 16 L0 10 Z" fill="var(--color-ink)" />
      <path d="M0 -12 L8 16 L0 10 Z" fill="none" stroke="var(--color-ink)" strokeWidth="1.2" />
    </svg>
  )
}
