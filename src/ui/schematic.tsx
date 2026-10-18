import { loop, toPath } from './contours'

/* Decorative map drawing for page backgrounds and the home page. Not survey data. */

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
