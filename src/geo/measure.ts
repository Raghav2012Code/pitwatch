import type { GridSpec, Measurement, Vec2, Vec3 } from '../domain/types'
import { sampleBilinear } from './grid'

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

/** Measurement between two plan points, reading their elevations from a surface grid. */
export function measureOnSurface(
  g: GridSpec,
  elevations: Float32Array,
  a: Vec2,
  b: Vec2,
): Measurement | null {
  const za = sampleBilinear(g, elevations, a)
  const zb = sampleBilinear(g, elevations, b)
  return za === null || zb === null ? null : measure({ ...a, z: za }, { ...b, z: zb })
}
