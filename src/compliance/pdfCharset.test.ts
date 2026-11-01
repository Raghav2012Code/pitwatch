import { describe, expect, it } from 'vitest'
import subsetRaw from '../assets/fonts/pdf/charset.txt?raw'
import { SyntheticTerrainProvider } from '../data/SyntheticTerrainProvider'
import { evaluate } from './engine'
import { PDF_CHARSET, pdfText } from './pdfCharset'

const subset = subsetRaw

describe('pdfText', () => {
  it('keeps the symbols the engine writes, now that the font can draw them', () => {
    const engine =
      'Excavated 300 m² outside the lease boundary; deepest cut 6.0 m ± 0.14 m (2σ). About 1,200 m³ removed.'
    expect(pdfText(engine)).toBe(engine)
  })

  it('matches the charset the font subset was built from', () => {
    expect(PDF_CHARSET).toBe(subset)
  })

  it('turns anything outside the subset into a visible placeholder', () => {
    expect(pdfText('漢')).toBe('?')
    expect(pdfText('😀')).toBe('?')
  })

  it('normalises decomposed accents before deciding', () => {
    expect(pdfText('e\u0301')).toBe('é')
    expect(pdfText('Ünlüt')).toBe('Ünlüt')
  })
})

describe('the engine text survives the PDF guard', async () => {
  const provider = new SyntheticTerrainProvider()
  const baseline = await provider.getSurvey('baseline')
  const current = await provider.getSurvey('current')
  const limits = await provider.getLimits()
  const { findings } = evaluate(baseline, current, limits)

  it('prints every explanation exactly as the screen shows it', () => {
    expect(findings.length).toBeGreaterThan(0)
    for (const finding of findings) {
      expect(pdfText(finding.explanation), finding.id).toBe(finding.explanation)
    }
    expect(findings.some((finding) => finding.explanation.includes('σ'))).toBe(true)
  })
})
