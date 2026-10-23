/*
 * One cross-section of an idealised pit (480 m wide at the rim, seven 10 m benches), measured
 * three ways. Drawn as vector lines, so the difference is the data and not the picture:
 * coarse cells average the benches away, an 8 m grid keeps the steps, a drone keeps the edges.
 */

const W = 600
const RIM = 60
const PIT = 480
const BENCHES = 7
const BENCH_H = 10
const BERM = 8
const FACE = 7
const SCALE = 2.1
const H = BENCHES * BENCH_H * SCALE + 36

/** Ground height in metres (0 at the rim, negative below) across the section. */
function ground(x: number): number {
  const d = Math.min(x - RIM, RIM + PIT - x)
  if (d <= 0 || d >= PIT) return 0
  const step = BERM + FACE
  const i = Math.floor(d / step)
  if (i >= BENCHES) return -BENCHES * BENCH_H
  const along = d - i * step
  const top = -i * BENCH_H
  return along < BERM ? top : top - ((along - BERM) / FACE) * BENCH_H
}

const sy = (h: number) => 14 - h * SCALE

/** The ground as a polyline, sampled finely. */
const truth = (() => {
  let d = ''
  for (let x = 0; x <= W; x += 0.5) d += `${d ? 'L' : 'M'}${x} ${sy(ground(x)).toFixed(1)}`
  return d
})()

/** What a grid of `cell`-metre cells records: the mean height over each cell, drawn as steps. */
function sampled(cell: number): string {
  let d = ''
  for (let x0 = 0; x0 < W; x0 += cell) {
    const x1 = Math.min(W, x0 + cell)
    let sum = 0
    let count = 0
    for (let x = x0; x < x1; x += cell / 8) {
      sum += ground(x)
      count++
    }
    const y = sy(sum / count).toFixed(1)
    d += `${d ? 'L' : 'M'}${x0} ${y}L${x1} ${y}`
  }
  return d
}

const PANELS = [
  {
    title: 'Global elevation model',
    cell: '30 m cells',
    text: 'Copernicus GLO-30 or SRTM. The pit becomes a handful of coarse cells and its benches smear together.',
    path: sampled(30),
  },
  {
    title: 'PitWatch survey grid',
    cell: '8 m cells',
    text: 'The 257 × 257 grid this app compares. Each bench spans several cells, so the steps survive.',
    path: sampled(8),
  },
  {
    title: 'Drone survey',
    cell: 'about 0.1 m',
    text: 'Photogrammetry or LiDAR with ground control. Bench edges, ramps and spoil heaps are all sharp.',
    path: truth,
  },
]

export function Resolution() {
  return (
    <section aria-labelledby="resolution-title" className="rule-section mt-14">
      <div>
        <div className="max-w-[44rem]">
          <h2 id="resolution-title" className="section-title">
            The same pit, three ways of measuring it
          </h2>
          <p className="mt-3 text-[15px] leading-7 text-ink-dim">
            A compliance check is only as sharp as the survey behind it. Free global elevation data
            is too coarse to check a 10 m bench. Mine-scale surveys are not.
          </p>
        </div>

        <ul className="mt-8 grid gap-6 md:grid-cols-3">
          {PANELS.map((p) => (
            <li key={p.title} className="res-panel">
              <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" aria-hidden="true">
                <path d={truth} className="res-truth" />
                <path d={p.path} className="res-line" />
              </svg>
              <div className="pt-4">
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
          Illustration: a cross-section of an idealised pit. The faint line is the real ground; the
          bold line is what each survey records.
        </p>
      </div>
    </section>
  )
}
