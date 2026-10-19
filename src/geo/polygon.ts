import type { Polygon, Vec2 } from '../domain/types'

/** Even-odd ray cast. Points exactly on an edge may fall either side. */
export function pointInPolygon(p: Vec2, poly: Polygon): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]
    const b = poly[j]
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside
    }
  }
  return inside
}

/** Plan area by the shoelace formula, m². Winding order does not matter. */
export function polygonArea(poly: Polygon): number {
  let s = 0
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    s += (poly[j].x + poly[i].x) * (poly[j].y - poly[i].y)
  }
  return Math.abs(s) / 2
}

export function distanceToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

/** Shortest distance from a point to the polygon outline, metres (inside or outside). */
export function distanceToBoundary(p: Vec2, poly: Polygon): number {
  let d = Infinity
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    d = Math.min(d, distanceToSegment(p, poly[j], poly[i]))
  }
  return d
}

/** Mean of a set of points. */
export function centroidOf(points: readonly Vec2[]): Vec2 {
  let x = 0
  let y = 0
  for (const p of points) {
    x += p.x
    y += p.y
  }
  return { x: x / points.length, y: y / points.length }
}

/**
 * Line segments (a0, b0, a1, b1, ...) tracing the set of points inside `poly` that are
 * exactly `inset` metres from its outline: the inner edge of a safety buffer. Marching
 * squares on the signed distance (positive inside) sampled every `step` metres, so
 * concave corners and pinch-offs come out right. Accuracy is a fraction of `step`.
 */
export function insetSegments(poly: Polygon, inset: number, step = 4): Vec2[] {
  const xs = poly.map((p) => p.x)
  const ys = poly.map((p) => p.y)
  const x0 = Math.min(...xs) - step
  const y0 = Math.min(...ys) - step
  const nx = Math.ceil((Math.max(...xs) + step - x0) / step) + 1
  const ny = Math.ceil((Math.max(...ys) + step - y0) / step) + 1
  const f = new Float32Array(nx * ny)
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const p = { x: x0 + i * step, y: y0 + j * step }
      f[j * nx + i] = (pointInPolygon(p, poly) ? 1 : -1) * distanceToBoundary(p, poly) - inset
    }
  }
  const out: Vec2[] = []
  // Zero crossing on the edge between corner values a (at pa) and b (at pb).
  const cross = (pa: Vec2, a: number, pb: Vec2, b: number): Vec2 => {
    const t = a / (a - b)
    return { x: pa.x + (pb.x - pa.x) * t, y: pa.y + (pb.y - pa.y) * t }
  }
  for (let j = 0; j + 1 < ny; j++) {
    for (let i = 0; i + 1 < nx; i++) {
      const c = [
        { p: { x: x0 + i * step, y: y0 + j * step }, v: f[j * nx + i] },
        { p: { x: x0 + (i + 1) * step, y: y0 + j * step }, v: f[j * nx + i + 1] },
        { p: { x: x0 + (i + 1) * step, y: y0 + (j + 1) * step }, v: f[(j + 1) * nx + i + 1] },
        { p: { x: x0 + i * step, y: y0 + (j + 1) * step }, v: f[(j + 1) * nx + i] },
      ]
      const pts: Vec2[] = []
      for (let k = 0; k < 4; k++) {
        const a = c[k]
        const b = c[(k + 1) % 4]
        if (a.v > 0 !== b.v > 0) pts.push(cross(a.p, a.v, b.p, b.v))
      }
      // 2 crossings: one segment. 4 (saddle): pair them in edge order, a fine approximation.
      for (let k = 0; k + 1 < pts.length; k += 2) out.push(pts[k], pts[k + 1])
    }
  }
  return out
}
