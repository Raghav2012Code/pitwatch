import { it } from 'vitest'
import { centerOfIndex } from '../geo/grid'
import { CHANGES, CURRENT_PIT, GRID } from './fixtures/scenario'
import { SyntheticTerrainProvider } from './SyntheticTerrainProvider'

it('probe', async () => {
  const p = new SyntheticTerrainProvider()
  const b = (await p.getSurvey('baseline')).elevations
  const c = (await p.getSurvey('current')).elevations
  let maxNoise = 0,
    minB = 1e9,
    maxB = -1e9,
    minC = 1e9,
    maxC = -1e9
  const near = (q: { x: number; y: number }) =>
    Math.hypot(
      (q.x - CURRENT_PIT.cx) / (CURRENT_PIT.a + 30),
      (q.y - CURRENT_PIT.cy) / (CURRENT_PIT.b + 30),
    ) < 1 ||
    (q.x > CHANGES.encroachment.x0 - 10 &&
      q.x < CHANGES.encroachment.x1 + 10 &&
      q.y > 970 &&
      q.y < 1090) ||
    (q.y > 1490 && q.y < 1520 && q.x > 890 && q.x < 1020) ||
    Math.hypot(q.x - 1520, q.y - 480) < 50 ||
    Math.hypot(q.x - 540, q.y - 510) < 95
  for (let i = 0; i < b.length; i++) {
    minB = Math.min(minB, b[i])
    maxB = Math.max(maxB, b[i])
    minC = Math.min(minC, c[i])
    maxC = Math.max(maxC, c[i])
    if (!near(centerOfIndex(GRID, i))) maxNoise = Math.max(maxNoise, Math.abs(c[i] - b[i]))
  }
  console.log(JSON.stringify({ maxNoise, minB, maxB, minC, maxC }))
})
