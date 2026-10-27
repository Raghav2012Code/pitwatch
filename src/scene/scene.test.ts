import { describe, expect, it } from 'vitest'
import type { GridSpec } from '../domain/types'
import {
  backdropColour,
  hexToRgb,
  RAMP,
  rampAt,
  rampGradient,
  SCENE,
  srgbToLinear,
} from './palette'
import { focusPose, headingOf, metresPerPixel, northUp, presetPose, scaleBar } from './presets'
import {
  BASE_RL,
  buildSkirtArrays,
  buildTerrainArrays,
  elevationRange,
  elevationScale,
  fromScene,
  SKIRT_RL,
  toScene,
} from './terrainGeometry'

const grid: GridSpec = { cols: 3, rows: 2, cellSize: 8, originXY: { x: 0, y: 0 } }
const elev = Float32Array.from([400, 410, 420, 430, 440, 450])

describe('palette', () => {
  it('interpolates the ramp and clamps at the ends', () => {
    expect(rampAt(0)).toEqual(hexToRgb(RAMP[0][1]))
    expect(rampAt(-1)).toEqual(rampAt(0))
    expect(rampAt(2)).toEqual(hexToRgb(RAMP[RAMP.length - 1][1]))
    const mid = rampAt(RAMP[1][0] / 2)
    const [a, b] = [hexToRgb(RAMP[0][1]), hexToRgb(RAMP[1][1])]
    expect(mid[0]).toBeCloseTo((a[0] + b[0]) / 2)
  })

  it('converts sRGB to linear light', () => {
    expect(srgbToLinear(0)).toBe(0)
    expect(srgbToLinear(1)).toBeCloseTo(1)
    expect(srgbToLinear(0.5)).toBeCloseTo(0.214, 3)
  })

  it('builds a CSS gradient from the same stops', () => {
    expect(rampGradient()).toMatch(/^linear-gradient\(to right, #2f4b66 0%, .* #8f4f3e 100%\)$/)
  })

  it('falls back to the backdrop value when there is no document', () => {
    // The unit tests run in node: the token cannot be read, and the scene still needs a colour.
    expect(typeof document).toBe('undefined')
    expect(backdropColour()).toBe(SCENE.backdrop)
  })
})

describe('terrain geometry', () => {
  it('maps local metres and RL to centred, Y-up scene coordinates', () => {
    // Grid centre is (8, 4). North (+Y) becomes −z.
    expect(toScene(grid, { x: 16, y: 8 }, 425)).toEqual([8, 25, -4])
    expect(fromScene(grid, 8, -4)).toEqual({ x: 16, y: 8 })
  })

  it('creates one vertex per cell and two upward triangles per square', () => {
    const { positions, colors, uvs, index } = buildTerrainArrays(grid, elev)
    expect(positions.length).toBe(6 * 3)
    expect(Array.from(uvs)).toEqual([0, 0, 0.5, 0, 1, 0, 0, 1, 0.5, 1, 1, 1])
    expect(colors.length).toBe(6 * 3)
    expect(index.length).toBe(2 * 1 * 6)
    expect(Array.from(positions.slice(0, 3))).toEqual([-8, 400 - BASE_RL, 4])

    // Every triangle's normal points up (+y).
    for (let k = 0; k < index.length; k += 3) {
      const [a, b, c] = [index[k], index[k + 1], index[k + 2]].map((i) => [
        positions[i * 3],
        positions[i * 3 + 1],
        positions[i * 3 + 2],
      ])
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
      const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
      expect(u[2] * v[0] - u[0] * v[2]).toBeGreaterThan(0)
    }
  })

  it('tints the lowest cell with the bottom of the ramp', () => {
    const { colors } = buildTerrainArrays(grid, elev)
    expect(colors[0]).toBeCloseTo(srgbToLinear(hexToRgb(RAMP[0][1])[0]))
  })

  it('spreads tint colours by rank so crowded heights get more of the ramp', () => {
    // Most cells at 420–430 (a plateau), a few deep ones: the plateau must not be one colour.
    const values = Float32Array.from([
      ...Array.from({ length: 90 }, (_, i) => 420 + i / 9),
      ...Array.from({ length: 10 }, (_, i) => 300 + i * 10),
    ])
    const s = elevationScale(values)
    expect(s.t(s.min)).toBe(0)
    expect(s.t(s.max)).toBe(1)
    expect(s.t(430) - s.t(420)).toBeGreaterThan(0.4) // a linear ramp gives 0.08
    for (const t of [0.1, 0.5, 0.9]) expect(s.t(s.at(t))).toBeCloseTo(t, 3)
  })

  it('drops the block sides from every edge cell to the skirt level', () => {
    const { positions, tops, index } = buildSkirtArrays(grid, elev)
    expect(tops[0]).toBe(400)
    expect(tops[1]).toBe(400)
    // Perimeter strips: 3 + 2 + 3 + 2 points, two vertices each.
    expect(positions.length / 3).toBe(20)
    expect(index.length).toBe((2 + 1 + 2 + 1) * 6)
    expect(positions[4]).toBe(SKIRT_RL - BASE_RL)
  })

  it('finds the elevation range', () => {
    expect(elevationRange(elev)).toEqual({ min: 400, max: 450 })
  })
})

describe('camera presets', () => {
  const pit = { x: -24, y: -6 }

  it('aims every preset at the pit', () => {
    for (const kind of ['oblique', 'top', 'pit'] as const) {
      const { target } = presetPose(kind, pit, -40)
      expect([target[0], target[2]]).toEqual([pit.x, pit.y])
    }
    expect(presetPose('top', pit, -40).position[1]).toBeGreaterThan(3000)
  })

  it('reads headings clockwise from north', () => {
    expect(headingOf([0, 10, 10], [0, 0, 0])).toBeCloseTo(0) // camera south, looking north
    expect(headingOf([-10, 10, 0], [0, 0, 0])).toBeCloseTo(90) // looking east
    expect(headingOf([0, 10, -10], [0, 0, 0])).toBeCloseTo(180)
  })

  it('turns a view to north-up without changing distance or height', () => {
    const { position } = northUp([300, 500, 400], [0, 0, 0])
    expect(position).toEqual([0, 500, 500])
    expect(headingOf(position, [0, 0, 0])).toBeCloseTo(0)
  })

  it('picks a round scale-bar length that fits', () => {
    expect(metresPerPixel(1000, 90, 2000)).toBeCloseTo(1)
    expect(scaleBar(1)).toEqual({ metres: 100, px: 100 })
    expect(scaleBar(3)).toEqual({ metres: 200, px: 200 / 3 })
  })
})

describe('focus view', () => {
  it('looks at the point from the south-east, above it', () => {
    const { position, target } = focusPose([10, 20, 30])
    expect(target).toEqual([10, 20, 30])
    expect(position[0]).toBeGreaterThan(10)
    expect(position[1]).toBeGreaterThan(20)
    expect(position[2]).toBeGreaterThan(30)
    expect(headingOf(position, target)).toBeGreaterThan(270) // looking north-west
  })
})
