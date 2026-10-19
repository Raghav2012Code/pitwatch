import type { Profile } from '../../geo/profile'

const W = 320
const H = 156
const M = { l: 40, r: 8, t: 8, b: 24 }

/** SVG path through the samples, starting a new segment after each gap (NaN). */
function pathOf(xs: number[], ys: number[], x: (v: number) => number, y: (v: number) => number) {
  let d = ''
  let pen = false
  ys.forEach((v, i) => {
    if (Number.isNaN(v)) {
      pen = false
      return
    }
    d += `${pen ? 'L' : 'M'}${x(xs[i]).toFixed(1)} ${y(v).toFixed(1)}`
    pen = true
  })
  return d
}

/**
 * Elevation along a measured line: current survey (solid), baseline (dashed), and the
 * approved pit floor where the line runs inside the pit zone. `series[0]` is the current
 * survey, `series[1]` the baseline.
 */
export function ProfileChart({
  profile,
  floor,
  inPit,
  sigma,
}: {
  profile: Profile
  /** Approved floor RL, drawn only over samples where `inPit` is true. */
  floor: number | null
  inPit: boolean[]
  sigma: number
}) {
  const [now, base] = profile.series
  const values = [...now, ...base, ...(floor !== null && inPit.some(Boolean) ? [floor] : [])]
  const finite = values.filter((v) => !Number.isNaN(v))
  if (finite.length === 0 || profile.length === 0) return null
  const lo = Math.min(...finite)
  const hi = Math.max(...finite)
  const pad = Math.max((hi - lo) * 0.06, 1)
  const [y0, y1] = [lo - pad, hi + pad]
  const x = (d: number) => M.l + (d / profile.length) * (W - M.l - M.r)
  const y = (z: number) => H - M.b - ((z - y0) / (y1 - y0)) * (H - M.t - M.b)

  const ticks = [lo, (lo + hi) / 2, hi]
  const floorSeries = profile.d.map((_, i) => (inPit[i] && floor !== null ? floor : NaN))

  return (
    <figure>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Elevation profile along the line, ${profile.length.toFixed(0)} m long, from ${lo.toFixed(0)} to ${hi.toFixed(0)} m RL.`}
        className="w-full"
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} className="stroke-line" />
            <text
              x={M.l - 5}
              y={y(t) + 3}
              textAnchor="end"
              className="fill-ink-faint font-mono text-[9.5px]"
            >
              {t.toFixed(0)}
            </text>
          </g>
        ))}
        {[0, 0.5, 1].map((f) => (
          <text
            key={f}
            x={x(profile.length * f)}
            y={H - 8}
            textAnchor={f === 0 ? 'start' : f === 1 ? 'end' : 'middle'}
            className="fill-ink-faint font-mono text-[9.5px]"
          >
            {(profile.length * f).toFixed(0)} m
          </text>
        ))}
        <path
          d={pathOf(profile.d, floorSeries, x, y)}
          fill="none"
          strokeWidth={1.5}
          strokeDasharray="1.5 3"
          className="stroke-violation"
        />
        <path
          d={pathOf(profile.d, base, x, y)}
          fill="none"
          strokeWidth={1.4}
          strokeDasharray="4 3"
          className="stroke-ink-faint"
        />
        <path
          d={pathOf(profile.d, now, x, y)}
          fill="none"
          strokeWidth={2}
          className="stroke-accent"
        />
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-ink-dim">
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-0.5 w-4 bg-accent" /> Current, ± {sigma.toFixed(2)} m
        </span>
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-0 w-4 border-t-2 border-dashed border-ink-faint" /> Baseline
        </span>
        {floor !== null && inPit.some(Boolean) && (
          <span className="flex items-center gap-1.5">
            <i className="inline-block h-0 w-4 border-t-2 border-dotted border-violation" />{' '}
            Approved floor, {floor} m RL
          </span>
        )}
      </figcaption>
      <p className="mt-1 text-[11.5px] leading-4 text-ink-faint">
        Metres RL against metres along the line. The vertical scale is fitted to the data, so slopes
        look steeper than they are.
      </p>
    </figure>
  )
}
