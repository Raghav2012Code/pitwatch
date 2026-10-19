import { describe, expect, it } from 'vitest'
import type { ComplianceFinding, ExcavationState } from '../domain/types'
import { buildMarks, toneOf } from './marks'

const finding = (over: Partial<ComplianceFinding>): ComplianceFinding => ({
  id: 'R1-1',
  ruleId: 'R1',
  type: 'boundary-encroachment',
  status: 'violation',
  severity: 'high',
  cells: [1],
  areaM2: 64,
  volumeM3: 10,
  maxExceedance: 1,
  centroid: { x: 0, y: 0 },
  explanation: '',
  provenance: 'derived',
  ...over,
})

describe('terrain marks', () => {
  it('marks excavated cells −1 and filled cells +1 and leaves the rest 0', () => {
    const change = {
      excavated: Uint8Array.from([1, 0, 0, 0]),
      filled: Uint8Array.from([0, 0, 1, 0]),
    } as ExcavationState
    expect(Array.from(buildMarks(4, change, []).change)).toEqual([-1, 0, 1, 0])
  })

  it('writes a one-hot [warning, violation, critical] per flagged cell', () => {
    const marks = buildMarks(4, undefined, [
      finding({ cells: [0], status: 'warning', severity: 'low' }),
      finding({ cells: [1], status: 'violation' }),
      finding({ cells: [3], status: 'violation', severity: 'critical' }),
    ])
    expect(Array.from(marks.finding)).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1])
  })

  it('shows critical severity as its own tone', () => {
    expect(toneOf(finding({ severity: 'critical' }))).toBe('critical')
    expect(toneOf(finding({ status: 'warning', severity: 'low' }))).toBe('warning')
  })
})
