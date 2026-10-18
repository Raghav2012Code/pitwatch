import { describe, expect, it } from 'vitest'
import { combinedSigma, isSignificant } from './uncertainty'

describe('uncertainty', () => {
  it('combines independent survey errors in quadrature', () => {
    expect(combinedSigma(0.03, 0.04)).toBeCloseTo(0.05)
  })

  it('reports a change only beyond 2σ, in either direction', () => {
    // σ = 0.05 m, so the threshold is 0.10 m.
    expect(isSignificant(0.11, 0.03, 0.04)).toBe(true)
    expect(isSignificant(-0.11, 0.03, 0.04)).toBe(true)
    expect(isSignificant(0.1, 0.03, 0.04)).toBe(false)
    expect(isSignificant(0.09, 0.03, 0.04)).toBe(false)
  })
})
