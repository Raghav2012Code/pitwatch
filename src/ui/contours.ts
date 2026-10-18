/** Drawing helpers for decorative contour lines. Not terrain data. */

export type Pt = [x: number, y: number]
/** One sine term of the wobble: amplitude (fraction of radius), frequency, phase. */
export type Wobble = [amp: number, freq: number, phase: number]

/** Closed loop with polar radius r(θ) = r·(1 + Σ a·sin(fθ + φ)). */
export function loop(cx: number, cy: number, rx: number, ry: number, wobble: Wobble[], steps = 96) {
  const pts: Pt[] = []
  for (let k = 0; k < steps; k++) {
    const t = (k / steps) * Math.PI * 2
    const w = 1 + wobble.reduce((s, [a, f, p]) => s + a * Math.sin(f * t + p), 0)
    pts.push([cx + Math.cos(t) * rx * w, cy + Math.sin(t) * ry * w])
  }
  return pts
}

const f = (n: number) => n.toFixed(1)

export function toPath(pts: Pt[], closed = true) {
  return 'M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L') + (closed ? 'Z' : '')
}

/** Short ticks pointing from every `every`-th point toward (cx, cy): the map sign for a depression. */
export function ticks(pts: Pt[], cx: number, cy: number, every: number, len: number) {
  let d = ''
  for (let k = 0; k < pts.length; k += every) {
    const [x, y] = pts[k]!
    const h = Math.hypot(cx - x, cy - y) || 1
    d += `M${f(x)} ${f(y)}L${f(x + ((cx - x) / h) * len)} ${f(y + ((cy - y) / h) * len)}`
  }
  return d
}
