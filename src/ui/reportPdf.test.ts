import { describe, expect, it } from 'vitest'
import { paginateBlock, placeLabels } from './reportPdf'

const boxesOverlap = (a: { x: number; y: number }, b: { x: number; y: number }, text: string) =>
  a.x < b.x + text.length * 1.35 && a.x + text.length * 1.35 > b.x && Math.abs(a.y - b.y) < 2.8

describe('placeLabels', () => {
  it('leaves labels that are far apart where they were', () => {
    const out = placeLabels([
      { x: 20, y: 30, text: 'R1-1' },
      { x: 60, y: 80, text: 'R3-1' },
    ])
    expect(out).toEqual([
      { x: 20, y: 30, text: 'R1-1' },
      { x: 60, y: 80, text: 'R3-1' },
    ])
  })

  it('moves a label off one it would overprint', () => {
    // R1-1 and R1-2 sit about 30 m apart on the plan, so their ids land on the same spot.
    const out = placeLabels([
      { x: 40, y: 50, text: 'R1-1' },
      { x: 40.4, y: 50.4, text: 'R1-2' },
    ])
    expect(boxesOverlap(out[0]!, out[1]!, 'R1-1')).toBe(false)
    expect(out[0]).toEqual({ x: 40, y: 50, text: 'R1-1' })
  })
})

describe('paginateBlock', () => {
  const pageTop = 20
  const pageBottom = 281
  const linesPerFreshPage = Math.floor((pageBottom - pageTop - 11) / 4.6) // 54

  it('keeps a block that fits whole on one page', () => {
    expect(paginateBlock({ y: 100, lines: 5, pageTop, pageBottom })).toEqual({
      startNewPage: false,
      pages: [5],
    })
  })

  it('moves a block whole when the heading itself would not fit', () => {
    expect(paginateBlock({ y: 272, lines: 10, pageTop, pageBottom })).toEqual({
      startNewPage: true,
      pages: [10],
    })
  })

  it('splits a block that does not fit, filling the current page first', () => {
    const y = 240 // room for exactly 6 body lines under the heading
    const plan = paginateBlock({ y, lines: 100, pageTop, pageBottom })
    expect(plan.startNewPage).toBe(false)
    expect(plan.pages).toEqual([6, linesPerFreshPage, 100 - 6 - linesPerFreshPage])
    expect(plan.pages.reduce((sum, n) => sum + n, 0)).toBe(100)
  })

  it('spreads a block taller than a page across as many pages as it needs', () => {
    const plan = paginateBlock({ y: pageTop, lines: 200, pageTop, pageBottom })
    expect(plan.pages).toEqual([54, 54, 54, 38])
    expect(plan.pages.every((n) => n > 0)).toBe(true)
    expect(plan.pages.reduce((sum, n) => sum + n, 0)).toBe(200)
  })

  it('rejects impossible geometry instead of silently overlapping text', () => {
    expect(() => paginateBlock({ y: 100, lines: -1, pageTop, pageBottom })).toThrow(RangeError)
    expect(() => paginateBlock({ y: 100, lines: 2, pageTop: 280, pageBottom: 281 })).toThrow(
      RangeError,
    )
  })
})
