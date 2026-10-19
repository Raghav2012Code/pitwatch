import { describe, expect, it } from 'vitest'
import type { GridSpec } from '../domain/types'
import { profileAlong } from './profile'

const g: GridSpec = { cols: 11, rows: 11, cellSize: 10, originXY: { x: 0, y: 0 } }
// z = 100 + x
const ramp = Float32Array.from({ length: 121 }, (_, i) => 100 + (i % 11) * 10)

describe('profile', () => {
  it('samples every layer along the line, half a cell apart', () => {
    const p = profileAlong(
      g,
      { x: 0, y: 50 },
      { x: 80, y: 50 },
      ramp,
      ramp.map((v) => v - 5),
    )
    expect(p.length).toBe(80)
    expect(p.d).toHaveLength(17)
    expect(p.series[0][4]).toBeCloseTo(120)
    expect(p.series[1][4]).toBeCloseTo(115)
  })

  it('gives NaN where the line leaves the grid, and copes with a zero-length line', () => {
    const p = profileAlong(g, { x: 50, y: 50 }, { x: 150, y: 50 }, ramp)
    expect(Number.isNaN(p.series[0].at(-1))).toBe(true)
    expect(p.series[0][0]).toBeCloseTo(150)
    const zero = profileAlong(g, { x: 20, y: 20 }, { x: 20, y: 20 }, ramp)
    expect(zero.length).toBe(0)
    expect(zero.series[0]).toHaveLength(2)
  })
})
