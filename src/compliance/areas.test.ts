import { describe, expect, it } from 'vitest'
import { SyntheticTerrainProvider } from '../data/SyntheticTerrainProvider'
import { cellArea, centerOfIndex } from '../geo/grid'
import { pointInPolygon, polygonArea } from '../geo/polygon'
import { evaluate } from './engine'

/*
 * Every area on screen has one source: the lease area is the polygon's area, a finding's area is
 * its cell count times the cell area. These tests tie both back to the same grid, so a figure on
 * the Overview cannot drift from the ground the 3D map draws.
 */
describe('areas agree with the generated model', async () => {
  const p = new SyntheticTerrainProvider()
  const baseline = await p.getSurvey('baseline')
  const current = await p.getSurvey('current')
  const limits = await p.getLimits()
  const { findings } = evaluate(baseline, current, limits)
  const g = current.grid

  it('the lease polygon area matches the cells whose centres fall inside it', () => {
    let inside = 0
    for (let i = 0; i < g.cols * g.rows; i++) {
      if (pointInPolygon(centerOfIndex(g, i), limits.leaseBoundary)) inside++
    }
    const raster = inside * cellArea(g)
    const exact = polygonArea(limits.leaseBoundary)
    expect(Math.abs(raster - exact) / exact).toBeLessThan(0.01)
  })

  it('every finding area is its cell count times the cell area', () => {
    for (const f of findings) expect(f.areaM2).toBe(f.cells.length * cellArea(g))
  })

  it('the area of each boundary violation lies outside the lease', () => {
    const r1 = findings.filter((f) => f.ruleId === 'R1' && f.status === 'violation')
    expect(r1.length).toBeGreaterThan(0)
    for (const f of r1) {
      for (const i of f.cells) {
        expect(pointInPolygon(centerOfIndex(g, i), limits.leaseBoundary)).toBe(false)
      }
    }
  })

  it('findings together cover less than the grid and the lease', () => {
    const total = findings.reduce((s, f) => s + f.areaM2, 0)
    expect(total).toBeLessThan(polygonArea(limits.leaseBoundary))
  })
})
