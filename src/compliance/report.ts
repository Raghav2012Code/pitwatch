import type { ComplianceFinding } from '../domain/types'

/** Column order of the findings report. */
export const REPORT_COLUMNS = [
  'id',
  'rule',
  'status',
  'severity',
  'area_m2',
  'volume_m3',
  'max_excess_m',
  'centre_east_m',
  'centre_north_m',
  'explanation',
  'data',
] as const

/** One CSV field: quoted when it holds a comma, quote or line break, quotes doubled. */
const field = (v: string | number): string => {
  const s = String(v)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * Characters the PDF's built-in Helvetica cannot encode. jsPDF mangles a whole string once one
 * of them appears in it, so every string written to the report goes through this first: the
 * engine's "± 0.14 m (2σ)" would otherwise print as replacement glyphs.
 */
const PDF_ASCII: Record<string, string> = {
  '±': '+/-',
  '²': '2',
  '³': '3',
  σ: 'sigma',
  Δ: 'delta',
  '·': '-',
  '×': 'x',
  '–': '-',
  '—': '-',
  '‘': "'",
  '’': "'",
  '“': '"',
  '”': '"',
  '…': '...',
}

/** Text as the PDF's standard font can draw it: ASCII, with the symbols spelled out. */
export const pdfSafeText = (text: string): string =>
  [...text]
    .map((c) => PDF_ASCII[c] ?? (c.charCodeAt(0) < 0x80 ? c : '?'))
    .join('')
    .replace(/(\d) ?sigma/g, '$1 sigma')

/**
 * The findings as CSV for a spreadsheet or an inspector's file. Figures are rounded the way the
 * screen shows them, and every row says its data is simulated, so an exported file cannot be
 * mistaken for a real survey result once it leaves the app.
 */
export function findingsToCsv(findings: readonly ComplianceFinding[]): string {
  const rows = findings.map((f) =>
    [
      f.id,
      f.ruleId,
      f.status,
      f.severity,
      Math.round(f.areaM2),
      Math.round(f.volumeM3),
      f.maxExceedance.toFixed(2),
      Math.round(f.centroid.x),
      Math.round(f.centroid.y),
      f.explanation,
      'simulated',
    ].map(field),
  )
  return [REPORT_COLUMNS.map(field), ...rows].map((r) => r.join(',')).join('\r\n') + '\r\n'
}
