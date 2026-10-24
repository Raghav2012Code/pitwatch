import { beforeAll, describe, expect, it } from 'vitest'
import { SyntheticTerrainProvider } from '../data/SyntheticTerrainProvider'
import type { ComplianceFinding, PermittedLimits, TerrainSurvey } from '../domain/types'
import { centerOfIndex } from '../geo/grid'
import { evaluate } from './engine'
import { readPoint } from './inspect'
import { combinedSigma } from './uncertainty'

let baseline: TerrainSurvey
let current: TerrainSurvey
let limits: PermittedLimits
let findings: ComplianceFinding[]

beforeAll(async () => {
  const p = new SyntheticTerrainProvider()
  ;[baseline, current, limits] = await Promise.all([
    p.getSurvey('baseline'),
    p.getSurvey('current'),
    p.getLimits(),
  ])
  findings = evaluate(baseline, current, limits).findings
}, 30_000)

const read = (f: ComplianceFinding) =>
  readPoint(centerOfIndex(current.grid, f.cells[0]), baseline, current, limits, findings)

describe('point reading', () => {
  it('lists the finding under a cell and reads the change that caused it', () => {
    for (const f of findings) {
      const r = read(f)
      expect(r.findingIds).toContain(f.id)
      expect(r.change).toBe(f.ruleId === 'R3' ? 'filled' : 'excavated')
    }
  })

  it('reports the permit status at the finding', () => {
    const encroachment = findings.find((f) => f.ruleId === 'R1' && f.status === 'violation')!
    expect(read(encroachment).insideLease).toBe(false)
    const scrape = findings.find((f) => f.ruleId === 'R1' && f.status === 'warning')!
    expect(read(scrape).inBuffer).toBe(true)
    const sump = findings.find((f) => f.ruleId === 'R2')!
    expect(read(sump).pit!.above!).toBeLessThan(0)
  })

  it('reads quiet ground as unchanged, with a slope and no findings', () => {
    const r = readPoint({ x: 400, y: 400 }, baseline, current, limits, [])
    expect(r.change).toBe('none')
    expect(r.insideLease).toBe(true)
    expect(r.pit).toBeNull()
    expect(r.slopeDeg).not.toBeNull()
    expect(r.dhSigma).toBeCloseTo(
      combinedSigma(baseline.verticalUncertainty, current.verticalUncertainty),
    )
  })

  it('has no reading outside the survey grid', () => {
    const r = readPoint({ x: -50, y: 100 }, baseline, current, limits, [])
    expect([r.elevation, r.dh, r.slopeDeg]).toEqual([null, null, null])
    expect(r.findingIds).toEqual([])
  })
})

describe('finding lookup by cell', () => {
  it('matches a linear scan for every finding cell', () => {
    for (const f of findings) {
      const cell = f.cells[0]
      const p = centerOfIndex(current.grid, cell)
      const expected = findings.filter((g) => g.cells.includes(cell)).map((g) => g.id)
      expect(readPoint(p, baseline, current, limits, findings).findingIds).toEqual(expected)
    }
  })

  it('lists every finding on a shared cell, in findings order', () => {
    const cell = findings[0]!.cells[0]
    const template = findings[0]!
    // The seeded scenario has no shared cells, so this is the case the index has to get right.
    const shared: ComplianceFinding[] = [
      { ...template, id: 'S-1', cells: [cell, 7] },
      { ...template, id: 'S-2', cells: [cell] },
    ]
    const r = readPoint(centerOfIndex(current.grid, cell), baseline, current, limits, shared)
    expect(r.findingIds).toEqual(['S-1', 'S-2'])
  })

  it('keeps finding order rather than cell order', () => {
    const cell = findings[0]!.cells[0]
    const expected = findings.filter((f) => f.cells.includes(cell)).map((f) => f.id)
    const r = readPoint(centerOfIndex(current.grid, cell), baseline, current, limits, findings)
    expect(r.findingIds).toEqual(expected)
    // A fresh findings array gets its own index and the same answer.
    expect(
      readPoint(centerOfIndex(current.grid, cell), baseline, current, limits, [...findings])
        .findingIds,
    ).toEqual(expected)
  })

  it('returns nothing on quiet ground and off the grid', () => {
    expect(readPoint({ x: 400, y: 400 }, baseline, current, limits, findings).findingIds).toEqual(
      [],
    )
    expect(readPoint({ x: -50, y: 100 }, baseline, current, limits, findings).findingIds).toEqual(
      [],
    )
  })
})
