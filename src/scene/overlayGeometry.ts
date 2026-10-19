import type { Polygon, TerrainSurvey, Vec2 } from '../domain/types'
import { sampleBilinear } from '../geo/grid'
import { BASE_RL, toScene } from './terrainGeometry'

export type V3 = [number, number, number]

/** Height above the ground that lines float at, so they are not buried in relief. */
const LIFT = 6

/** Scene position of a plan point, `lift` metres above the (exaggerated) surface. */
export function onGround(survey: TerrainSurvey, p: Vec2, ex: number, lift = LIFT): V3 {
  const z = sampleBilinear(survey.grid, survey.elevations, p) ?? BASE_RL
  const [x, , sz] = toScene(survey.grid, p, z)
  return [x, (z - BASE_RL) * ex + lift, sz]
}

/** Polyline along a polygon outline, a few metres above the ground, a point every ~16 m. */
export function leaseLine(survey: TerrainSurvey, lease: Polygon, ex: number) {
  const pts: V3[] = []
  for (let k = 0; k < lease.length; k++) {
    const a = lease[k]
    const b = lease[(k + 1) % lease.length]
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 16))
    for (let s = 0; s <= steps; s++) {
      const p = { x: a.x + ((b.x - a.x) * s) / steps, y: a.y + ((b.y - a.y) * s) / steps }
      pts.push(onGround(survey, p, ex))
    }
  }
  return pts
}
