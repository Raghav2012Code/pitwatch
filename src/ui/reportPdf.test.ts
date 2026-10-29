import { describe, expect, it } from 'vitest'
import { placeLabels } from './reportPdf'

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
