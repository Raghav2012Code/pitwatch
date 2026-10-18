import { describe, expect, it } from 'vitest'
import { loop, toPath } from './contours'

describe('contours', () => {
  it('builds a closed loop at the given radius when there is no wobble', () => {
    const pts = loop(10, 20, 5, 3, [], 4)
    expect(pts.map(([x, y]) => [Math.round(x), Math.round(y)])).toEqual([
      [15, 20],
      [10, 23],
      [5, 20],
      [10, 17],
    ])
    expect(toPath(pts)).toBe('M15.0 20.0L10.0 23.0L5.0 20.0L10.0 17.0Z')
  })
})
