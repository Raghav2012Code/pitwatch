import { describe, expect, it } from 'vitest'
import { daysBetween, formatDate, formatLat, formatLon } from './format'

describe('format', () => {
  it('formats ISO dates without timezone drift', () => {
    expect(formatDate('2025-11-14')).toBe('14 Nov 2025')
  })
  it('counts days between survey dates', () => {
    expect(daysBetween('2025-11-14', '2026-08-22')).toBe(281)
    expect(daysBetween('2026-01-01', '2026-01-01')).toBe(0)
  })
  it('formats hemispheres', () => {
    expect(formatLat(-23.5)).toBe('23.5000° S')
    expect(formatLon(84.3127)).toBe('84.3127° E')
  })
})
