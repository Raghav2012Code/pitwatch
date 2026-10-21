import { describe, expect, it } from 'vitest'
import { makeSurfaceUniforms } from './surfaceUniforms'

describe('surface uniforms', () => {
  it('gives every material its own mutable uniforms', () => {
    const a = makeSurfaceUniforms()
    const b = makeSurfaceUniforms()

    a.uContours.value = 1
    a.uTint.value = 1

    // Writing one material must not move the other, and the objects must not be aliases.
    expect(b.uContours.value).toBe(0)
    expect(b.uTint.value).toBe(0)
    expect(a.uContours).not.toBe(b.uContours)
    expect(a.uInk.value).not.toBe(b.uInk.value)
  })

  it('starts with contoured tint off and a real base level', () => {
    const u = makeSurfaceUniforms()
    expect(u.uContours.value).toBe(0)
    expect(u.uTint.value).toBe(0)
    expect(u.uInterval.value).toBeGreaterThan(0)
    expect(u.uBase.value).not.toBe(0)
  })
})
