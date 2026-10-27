import { describe, expect, it } from 'vitest'
import { CURRENT_PIT, GRID, PLATEAU_RL, RAMP, ROADS, SEED } from './fixtures/scenario'
import { buildOrthophoto } from './orthophoto'
import { buildSurface, insidePit, naturalField, pitSurface, pitsOf } from './synthetic'

const SIZE = GRID.cols // one pixel per grid column keeps the test fast
const natural = naturalField(GRID, SEED)
const elevations = buildSurface(GRID, 'current', SEED, 0.05, natural)
const photo = buildOrthophoto(GRID, elevations, natural, 'current', SEED, SIZE)

/** Pixel colour at local metres (x, y). */
const pixel = (x: number, y: number) => {
  const i = Math.round(((x - GRID.originXY.x) / ((GRID.cols - 1) * GRID.cellSize)) * (SIZE - 1))
  const j = Math.round(((y - GRID.originXY.y) / ((GRID.rows - 1) * GRID.cellSize)) * (SIZE - 1))
  const o = (j * SIZE + i) * 4
  return [photo.rgba[o], photo.rgba[o + 1], photo.rgba[o + 2]]
}
const lum = ([r, g, b]: number[]) => 0.299 * r + 0.587 * g + 0.114 * b

describe('simulated orthophoto', () => {
  it('covers the grid with opaque sRGB pixels and is marked simulated', () => {
    expect(photo.rgba.length).toBe(SIZE * SIZE * 4)
    expect(photo.rgba[3]).toBe(255)
    expect(photo.provenance).toBe('simulated')
  })

  it('is reproducible', () => {
    const again = buildOrthophoto(GRID, elevations, natural, 'current', SEED, SIZE)
    expect(again.rgba).toEqual(photo.rgba)
  }, 30_000)

  it('shows the pit as bare ground, redder than it is green', () => {
    const [r, g] = pixel(1130, 1030)
    expect(r).toBeGreaterThan(g)
  })

  it('draws haul roads paler than the scrub around them', () => {
    // The lease-gate road, on the leg from (1150, 300) to (1180, 0).
    const [x, y] = ROADS[ROADS.length - 1]![2]!
    const onRoad = pixel(1159, 210)
    const offRoad = pixel(1159 + 120, 210)
    expect(x).toBeGreaterThan(0)
    expect(y).toBe(0)
    expect(lum(onRoad)).toBeGreaterThan(lum(offRoad))
  })
})

describe('haul ramp', () => {
  const pit = pitsOf('current')[0]
  const ramp = pit.ramp!

  it('leaves the rim where the haul road arrives and reaches the floor', () => {
    expect(ramp.depth[0]).toBe(0)
    expect(ramp.depth[ramp.depth.length - 1]).toBeCloseTo(PLATEAU_RL - CURRENT_PIT.floorRL)
    expect(
      Math.hypot(ramp.points[0].x - RAMP.start.x, ramp.points[0].y - RAMP.start.y),
    ).toBeLessThan(80)
  })

  it('is a road at its own level across the benches, descending at the design grade', () => {
    const k = Math.floor(ramp.points.length / 2)
    expect(insidePit(ramp.points[k], pit)).toBeGreaterThan(0)
    expect(pitSurface(ramp.points[k], pit)).toBeCloseTo(PLATEAU_RL - ramp.depth[k], 0)
    let run = 0
    for (let j = 1; j <= k; j++) {
      run += Math.hypot(
        ramp.points[j].x - ramp.points[j - 1].x,
        ramp.points[j].y - ramp.points[j - 1].y,
      )
    }
    expect(ramp.depth[k] / run).toBeCloseTo(RAMP.grade, 2)
  })
})
