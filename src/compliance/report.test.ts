import { describe, expect, it } from 'vitest'
import type { ComplianceFinding } from '../domain/types'
import { findingsToCsv, REPORT_COLUMNS } from './report'

const finding = (over: Partial<ComplianceFinding> = {}): ComplianceFinding => ({
  id: 'R1-1',
  ruleId: 'R1',
  type: 'boundary-encroachment',
  status: 'violation',
  severity: 'critical',
  cells: [1, 2],
  areaM2: 7696.4,
  volumeM3: 175297.6,
  maxExceedance: 52.451,
  centroid: { x: 1405.4, y: 1032.6 },
  explanation: 'Excavated 7,696 m² outside the lease; "deepest" cut 52.5 m',
  provenance: 'derived',
  ...over,
})

describe('findingsToCsv', () => {
  it('writes a header and one row per finding', () => {
    const lines = findingsToCsv([finding(), finding({ id: 'R2-1' })])
      .trimEnd()
      .split('\r\n')
    expect(lines).toHaveLength(3)
    expect(lines[0]).toBe(REPORT_COLUMNS.join(','))
    expect(lines[2]!.startsWith('R2-1,')).toBe(true)
  })

  it('rounds the figures and marks every row simulated', () => {
    const row = findingsToCsv([finding()]).split('\r\n')[1]!
    expect(row).toContain(',7696,175298,52.45,1405,1033,')
    expect(row.endsWith(',simulated')).toBe(true)
  })

  it('quotes fields with commas and doubles embedded quotes', () => {
    const row = findingsToCsv([finding()]).split('\r\n')[1]!
    expect(row).toContain('"Excavated 7,696 m² outside the lease; ""deepest"" cut 52.5 m"')
  })

  it('is just the header when there are no findings', () => {
    expect(findingsToCsv([])).toBe(`${REPORT_COLUMNS.join(',')}\r\n`)
  })
})
