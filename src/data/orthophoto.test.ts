import { describe, expect, it } from 'vitest'
import {
  BERM_WIDTH_M,
  CURRENT_PIT,
  FACE_RUN_M,
  GRID,
  PLATEAU_RL,
  RAMP,
  ROADS,
  SEED,
} from './fixtures/scenario'
import { buildOrthophoto } from './orthophoto'
import { buildSurface, insidePit, naturalField, pitSurface, rimRadius } from './synthetic'

const SIZE = 257 // one pixel per grid cell keeps the test fast
const natural = naturalField(GRID, SEED)
const elevations = buildSurface(GRID, 'current', SEED, 0.05, natural)
const photo = buildOrthophoto(GRID, elevations, natural, 'current', SEED, SIZE)

/** Pixel colour at local metres (x, y). */
const pixel = (x: number, y: number) => {
  const i = Math.round((x / ((GRID.cols - 1) * GRID.cellSize)) * (SIZE - 1))
  const j = Math.round((y / ((GRID.rows - 1) * GRID.cellSize)) * (SIZE - 1))
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
  })

  it('shows the pit as bare ground, redder than it is green', () => {
    const [r, g] = pixel(CURRENT_PIT.cx + 150, CURRENT_PIT.cy)
    expect(r).toBeGreaterThan(g)
  })

  it('draws haul roads paler than the scrub around them', () => {
    const [x, y] = ROADS[1][2]
    const onRoad = pixel(1150, 210)
    const offRoad = pixel(1150 + 120, 210)
    expect(x).toBeGreaterThan(0)
    expect(y).toBe(0)
    expect(lum(onRoad)).toBeGreaterThan(lum(offRoad))
  })
})

describe('haul ramp', () => {
  it('cuts a flat shelf across the benches, deeper as it turns', () => {
    const at = (turn: number, inset: number) => {
      const theta = RAMP.startAngle + turn
      const dir = { x: Math.cos(theta), y: Math.sin(theta) }
      const probe = { x: CURRENT_PIT.cx + dir.x * 10, y: CURRENT_PIT.cy + dir.y * 10 }
      const rim = rimRadius(probe, CURRENT_PIT)
      const r = rim - inset
      return { x: CURRENT_PIT.cx + dir.x * r, y: CURRENT_PIT.cy + dir.y * r }
    }
    // Near the start the ramp is at rim level; further round it is lower.
    const start = pitSurface(at(0.02, 8), CURRENT_PIT)
    expect(start).toBeGreaterThan(PLATEAU_RL - 3)
    const p = at(0.6, 0)
    const rim = rimRadius(p, CURRENT_PIT)
    const depth = 0.6 * rim * 0.85 * RAMP.grade
    const onRamp = at(0.6, (depth * (BERM_WIDTH_M + FACE_RUN_M)) / 10 + RAMP.width / 2)
    expect(insidePit(onRamp, CURRENT_PIT)).toBeGreaterThan(0)
    expect(pitSurface(onRamp, CURRENT_PIT)).toBeCloseTo(PLATEAU_RL - depth, 0)
  })
})
