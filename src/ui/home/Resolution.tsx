import type { CSSProperties } from 'react'

/*
 * The same illustrative pit (600 m × 420 m, seven 10 m benches) sampled at three cell sizes.
 * Shows why a 30 m global model cannot see benches that an 8 m grid can.
 */

const W = 690
const H = 480
const RX = 300
const RY = 210
const BENCHES = 7

/** Bench index at a point: 0 outside the pit, 7 on the floor. */
const benchAt = (x: number, y: number) => {
  const d = Math.hypot((x - W / 2) / RX, (y - H / 2) / RY)
  return d >= 1 ? 0 : Math.min(BENCHES, Math.floor((1 - d) * BENCHES * 1.15) + 1)
}

const shade = (b: number) =>
  b === 0
    ? 'var(--color-panel)'
    : `color-mix(in srgb, var(--color-contour) ${12 + b * 11}%, var(--color-panel))`

/** One column of square cells per entry, so columns can sweep in one after another. */
const raster = (cell: number) => {
  const cols = Math.ceil(W / cell)
  const rows = Math.ceil(H / cell)
  return Array.from({ length: cols }, (_, c) =>
    Array.from({ length: rows }, (_, r) => ({
      x: c * cell,
      y: r * cell,
      fill: shade(benchAt(c * cell + cell / 2, r * cell + cell / 2)),
    })),
  )
}

const PANELS = [
  {
    title: 'Global elevation model',
    cell: '30 m cells',
    text: 'Copernicus GLO-30 or SRTM. The pit becomes a few hundred coarse cells and its benches smear together.',
    cols: raster(30),
    size: 30,
  },
  {
    title: 'PitWatch survey grid',
    cell: '8 m cells',
    text: 'The 257 × 257 grid this app compares. Each bench spans several cells, so the steps survive.',
    cols: raster(8),
    size: 8,
  },
  {
    title: 'Drone survey',
    cell: 'about 0.1 m',
    text: 'Photogrammetry or LiDAR with ground control. Bench edges, ramps and spoil heaps are all sharp.',
    cols: null,
    size: 0,
  },
]

export function Resolution() {
  return (
    <section className="border-y border-line bg-bg-2">
      <div className="mx-auto max-w-[1200px] px-6 py-20 lg:py-28">
        <div className="reveal max-w-[44rem]">
          <h2 className="cond text-[clamp(38px,4.4vw,58px)] leading-[0.95] font-bold text-ink">
            The same pit, three ways of measuring it.
          </h2>
          <p className="mt-5 text-[16px] leading-7 text-ink-dim">
            A compliance check is only as sharp as the survey behind it. Free global elevation data
            is too coarse to check a 10 m bench. Mine-scale surveys are not.
          </p>
        </div>

        <ul className="mt-12 grid gap-6 md:grid-cols-3">
          {PANELS.map((p) => (
            <li key={p.title} className="reveal res-panel">
              <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" aria-hidden="true">
                {p.cols
                  ? p.cols.map((col, c) => (
                      <g
                        key={c}
                        className="res-col"
                        style={{ '--c': c * (p.size / 30) } as CSSProperties}
                      >
                        {col.map((cell) => (
                          <rect
                            key={cell.y}
                            x={cell.x}
                            y={cell.y}
                            width={p.size + 0.5}
                            height={p.size + 0.5}
                            fill={cell.fill}
                          />
                        ))}
                      </g>
                    ))
                  : Array.from({ length: BENCHES + 1 }, (_, b) => {
                      const s = 1 - b / (BENCHES * 1.15)
                      return (
                        <ellipse
                          key={b}
                          cx={W / 2}
                          cy={H / 2}
                          rx={RX * s}
                          ry={RY * s}
                          fill={b === 0 ? 'var(--color-panel)' : shade(b)}
                          stroke="var(--color-contour)"
                          strokeWidth={b === 0 ? 0 : 1.5}
                        />
                      )
                    })}
              </svg>
              <div className="p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="cond text-[20px] font-semibold text-ink">{p.title}</h3>
                  <span className="font-mono text-[12px] text-oxide">{p.cell}</span>
                </div>
                <p className="mt-1.5 text-[14px] leading-6 text-ink-dim">{p.text}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-[12.5px] text-ink-faint">
          Illustration: an idealised 600 m pit sampled on each grid.
        </p>
      </div>
    </section>
  )
}
