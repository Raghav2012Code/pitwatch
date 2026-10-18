import type { Measurement, Vec3 } from '../domain/types'

/** Straight-line measurement between two picked points. */
export function measure(a: Vec3, b: Vec3): Measurement {
  const horizontalDistance = Math.hypot(b.x - a.x, b.y - a.y)
  const dz = b.z - a.z
  return {
    a,
    b,
    horizontalDistance,
    slopeDistance: Math.hypot(horizontalDistance, dz),
    dz,
    provenance: 'derived',
  }
}
