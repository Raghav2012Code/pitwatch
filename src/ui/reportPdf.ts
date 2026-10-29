import type { ComplianceFinding, Mine, PermittedLimits, Polygon } from '../domain/types'
import { OVERLAY, TONE_COLOR } from '../scene/palette'
import { RULE_NAMES, toneOf } from './findings'

/** What the PDF describes: the findings on screen and the permit they were checked against. */
export interface PdfReportInput {
  findings: readonly ComplianceFinding[]
  limits: PermittedLimits
  mine: Pick<Mine, 'name' | 'operator'>
  baselineDate: string
  currentDate: string
}

const PAGE = { w: 210, h: 297, margin: 16 }
const INK = '#23262b'
const FAINT = '#5a5f66'

/**
 * Builds and saves a one-click PDF of the findings: a plan of the lease with every finding
 * marked, then one block per finding. jsPDF is loaded on demand so the app's first screen does
 * not pay for it. Every page says the data is simulated.
 */
export async function savePdfReport(input: PdfReportInput): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const { findings, limits, mine, baselineDate, currentDate } = input
  const inner = PAGE.w - PAGE.margin * 2

  doc.setProperties({ title: 'PitWatch 3D findings report (simulated data)' })
  doc.setTextColor(INK)
  doc.setFont('helvetica', 'bold').setFontSize(20)
  doc.text('Findings report', PAGE.margin, 24)
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(FAINT)
  doc.text(
    `${mine.name}, ${mine.operator}. Baseline survey ${baselineDate}, current survey ${currentDate}.`,
    PAGE.margin,
    31,
  )
  doc.setFont('helvetica', 'bold').setTextColor(INK)
  doc.text('SIMULATED DATA. Not a real survey and not a legal determination.', PAGE.margin, 37)

  // Plan of the lease: local metres, east to the right, north up.
  const plan = { x: PAGE.margin, y: 44, size: 100 }
  drawPlan(doc, plan, limits, findings)
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(FAINT)
  const key = [
    'Solid line: lease boundary',
    'Dashed: pit zone',
    'Dotted: waste dump zone',
    `${findings.length} finding${findings.length === 1 ? '' : 's'} marked by id`,
  ]
  key.forEach((line, i) => doc.text(line, plan.x + plan.size + 8, plan.y + 8 + i * 6))

  let y = plan.y + plan.size + 14
  for (const f of findings) {
    const body = doc.splitTextToSize(f.explanation, inner) as string[]
    const height = 18 + body.length * 4.6
    if (y + height > PAGE.h - 20) {
      doc.addPage()
      y = PAGE.margin + 4
    }
    doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(INK)
    doc.text(`${f.id}  ${RULE_NAMES[f.ruleId]}`, PAGE.margin, y)
    doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(FAINT)
    doc.text(
      `${f.status}, ${f.severity}. Area ${Math.round(f.areaM2).toLocaleString('en-GB')} m2, volume ${Math.round(f.volumeM3).toLocaleString('en-GB')} m3, max excess ${f.maxExceedance.toFixed(2)} m, centre E ${Math.round(f.centroid.x)} N ${Math.round(f.centroid.y)}.`,
      PAGE.margin,
      y + 5.5,
    )
    doc.setTextColor(INK).setFontSize(10)
    doc.text(body, PAGE.margin, y + 11)
    y += height
  }
  if (findings.length === 0) {
    doc.setFontSize(11).text('No finding matches the filters used for this report.', PAGE.margin, y)
  }

  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(FAINT)
    doc.text(
      `PitWatch 3D. Simulated data, every value is synthetic. Page ${p} of ${pages}.`,
      PAGE.margin,
      PAGE.h - 10,
    )
  }
  doc.save(`pitwatch-findings-${currentDate}.pdf`)
}

type Jsdoc = InstanceType<(typeof import('jspdf'))['jsPDF']>

/** Lease, zones and finding markers in a square box, scaled to fit the lease and zones. */
function drawPlan(
  doc: Jsdoc,
  box: { x: number; y: number; size: number },
  limits: PermittedLimits,
  findings: readonly ComplianceFinding[],
) {
  const shapes: Polygon[] = [
    limits.leaseBoundary,
    ...limits.pitZones.map((z) => z.polygon),
    ...limits.dumpZones.map((z) => z.polygon),
  ]
  const pts = shapes.flat()
  const minX = Math.min(...pts.map((p) => p.x))
  const maxX = Math.max(...pts.map((p) => p.x))
  const minY = Math.min(...pts.map((p) => p.y))
  const maxY = Math.max(...pts.map((p) => p.y))
  const scale = (box.size - 8) / Math.max(maxX - minX, maxY - minY)
  const px = (x: number) => box.x + 4 + (x - minX) * scale
  const py = (y: number) => box.y + box.size - 4 - (y - minY) * scale

  doc.setDrawColor(FAINT).setLineWidth(0.2).rect(box.x, box.y, box.size, box.size)

  const outline = (poly: Polygon, width: number, dash: number[]) => {
    doc.setLineWidth(width).setLineDashPattern(dash, 0).setDrawColor(INK)
    const [first, ...rest] = poly
    if (!first) return
    let prev = first
    for (const p of [...rest, first]) {
      doc.line(px(prev.x), py(prev.y), px(p.x), py(p.y))
      prev = p
    }
  }
  outline(limits.leaseBoundary, 0.5, [])
  limits.pitZones.forEach((z) => outline(z.polygon, 0.3, [2, 1]))
  limits.dumpZones.forEach((z) => outline(z.polygon, 0.3, [0.4, 1]))
  doc.setLineDashPattern([], 0)

  doc.setFont('helvetica', 'bold').setFontSize(7)
  for (const f of findings) {
    const tone = toneOf(f)
    doc.setFillColor(TONE_COLOR[tone] ?? OVERLAY.violation)
    doc.setDrawColor(INK).setLineWidth(0.2)
    doc.circle(px(f.centroid.x), py(f.centroid.y), 1.6, 'FD')
    doc.setTextColor(INK)
    doc.text(f.id, px(f.centroid.x) + 2.4, py(f.centroid.y) - 1.2)
  }
}
