import type { ComplianceFinding, Mine, PermittedLimits, Polygon } from '../domain/types'
import { pdfText } from '../compliance/pdfCharset'
import { OVERLAY, PRINT_INK, TONE_COLOR } from '../scene/palette'
import { RULE_NAMES, toneOf } from './findings'
import { registerPdfFonts } from './pdfFont'

/** What the PDF describes: the findings on screen and the permit they were checked against. */
export interface PdfReportInput {
  findings: readonly ComplianceFinding[]
  limits: PermittedLimits
  mine: Pick<Mine, 'name' | 'operator'>
  baselineDate: string
  currentDate: string
}

const PAGE = { w: 210, h: 297, margin: 16 }
const INK = PRINT_INK.ink
const FAINT = PRINT_INK.faint
/** Body line spacing on the page, and how far below a heading's baseline the body starts. */
const LINE_HEIGHT = 4.6
const BODY_OFFSET = 11
/** Space kept under the last line of a finding before the next heading may start. */
const BLOCK_TAIL = 2.4

export interface BlockPagination {
  /** The current page has no room even for the heading, so the block starts on a fresh one. */
  startNewPage: boolean
  /** Body lines drawn on each page in order; the heading and figures go with the first entry. */
  pages: number[]
}

/**
 * Decide where a finding's block breaks. Line-aware rather than all-or-nothing: a block that
 * cannot fit keeps its heading and figures with as many lines as the page holds, and the rest
 * continues on later pages. Pure so the break rules are tested without building a PDF.
 */
export function paginateBlock(options: {
  /** Baseline of the heading on the current page, mm from the top. */
  y: number
  lines: number
  /** First baseline on a continuation page, mm from the top. */
  pageTop: number
  /** Text must not be drawn below this baseline. */
  pageBottom: number
  bodyOffset?: number
  lineHeight?: number
  /** Room the heading, figures and trailing space need, before body lines. */
  blockOverhead?: number
}): BlockPagination {
  const {
    y,
    lines,
    pageTop,
    pageBottom,
    bodyOffset = BODY_OFFSET,
    lineHeight = LINE_HEIGHT,
    blockOverhead = BODY_OFFSET + BLOCK_TAIL,
  } = options
  if (!Number.isInteger(lines) || lines < 0)
    throw new RangeError('Line count must be a whole number')
  const capacityFrom = (start: number) => Math.floor((pageBottom - start - bodyOffset) / lineHeight)
  const capacityOnFreshPage = capacityFrom(pageTop)
  if (capacityOnFreshPage < 1) throw new RangeError('Page is too short for one line of text')

  if (y + blockOverhead + lines * lineHeight <= pageBottom) {
    return { startNewPage: false, pages: [lines] }
  }

  const capacityHere = capacityFrom(y)
  const startNewPage = capacityHere < 1
  const firstCapacity = startNewPage ? capacityOnFreshPage : capacityHere
  const pages: number[] = [Math.min(lines, firstCapacity)]
  let remaining = lines - pages[0]!
  while (remaining > 0) {
    const count = Math.min(remaining, capacityOnFreshPage)
    pages.push(count)
    remaining -= count
  }
  return { startNewPage, pages }
}

/**
 * Builds and saves a one-click PDF of the findings: a plan of the lease with every finding
 * marked, then one block per finding. jsPDF is loaded on demand so the app's first screen does
 * not pay for it. Every page says the data is simulated.
 */
export async function savePdfReport(input: PdfReportInput): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  await registerPdfFonts(doc)
  const { findings, limits, mine, baselineDate, currentDate } = input
  const inner = PAGE.w - PAGE.margin * 2

  doc.setProperties({ title: 'PitWatch 3D findings report (simulated data)' })
  doc.setTextColor(INK)
  doc.setFont('NotoSans', 'bold').setFontSize(20)
  doc.text('Findings report', PAGE.margin, 24)
  doc.setFont('NotoSans', 'normal').setFontSize(10).setTextColor(FAINT)
  doc.text(
    pdfText(
      `${mine.name}, ${mine.operator}. Baseline survey ${baselineDate}, current survey ${currentDate}.`,
    ),
    PAGE.margin,
    31,
  )
  doc.setFont('NotoSans', 'bold').setTextColor(INK)
  doc.text('SIMULATED DATA. Not a real survey and not a legal determination.', PAGE.margin, 37)

  // Plan of the lease: local metres, east to the right, north up.
  const plan = { x: PAGE.margin, y: 44, size: 100 }
  drawPlan(doc, plan, limits, findings)
  doc.setFont('NotoSans', 'normal').setFontSize(9).setTextColor(FAINT)
  const key = [
    'Solid line: lease boundary',
    'Dashed: pit zone',
    'Dotted: waste dump zone',
    `${findings.length} finding${findings.length === 1 ? '' : 's'} marked by id`,
  ]
  key.forEach((line, i) => doc.text(pdfText(line), plan.x + plan.size + 8, plan.y + 8 + i * 6))

  let y = plan.y + plan.size + 14
  const pageTop = PAGE.margin + 4
  const pageBottom = PAGE.h - 16
  for (const f of findings) {
    const body = doc.splitTextToSize(pdfText(f.explanation), inner) as string[]
    const pagination = paginateBlock({ y, lines: body.length, pageTop, pageBottom })
    if (pagination.startNewPage) {
      doc.addPage()
      y = pageTop
    }
    doc.setFont('NotoSans', 'bold').setFontSize(12).setTextColor(INK)
    doc.text(pdfText(`${f.id}  ${RULE_NAMES[f.ruleId]}`), PAGE.margin, y)
    doc.setFont('NotoSans', 'normal').setFontSize(10).setTextColor(FAINT)
    doc.text(
      pdfText(
        `${f.status}, ${f.severity}. Area ${Math.round(f.areaM2).toLocaleString('en-GB')} m², volume ${Math.round(f.volumeM3).toLocaleString('en-GB')} m³, max excess ${f.maxExceedance.toFixed(2)} m, centre E ${Math.round(f.centroid.x)} N ${Math.round(f.centroid.y)}.`,
      ),
      PAGE.margin,
      y + 5.5,
    )
    doc.setTextColor(INK).setFontSize(10)
    let drawn = 0
    let bodyY = y + BODY_OFFSET
    for (const [pageIndex, count] of pagination.pages.entries()) {
      if (pageIndex > 0) {
        doc.addPage()
        bodyY = pageTop
      }
      for (let line = 0; line < count; line++) {
        doc.text(body[drawn + line]!, PAGE.margin, bodyY + line * LINE_HEIGHT)
      }
      drawn += count
      y = bodyY + count * LINE_HEIGHT + BLOCK_TAIL
    }
  }
  if (findings.length === 0) {
    doc.setFontSize(11).text('No finding matches the filters used for this report.', PAGE.margin, y)
  }

  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setFont('NotoSans', 'normal').setFontSize(8).setTextColor(FAINT)
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

  doc.setFont('NotoSans', 'bold').setFontSize(7)
  const markers = findings.map((f) => ({ f, x: px(f.centroid.x), y: py(f.centroid.y) }))
  for (const m of markers) {
    doc.setFillColor(TONE_COLOR[toneOf(m.f)] ?? OVERLAY.violation)
    doc.setDrawColor(INK).setLineWidth(0.2)
    doc.circle(m.x, m.y, 1.6, 'FD')
  }
  doc.setTextColor(INK)
  for (const label of placeLabels(
    markers.map((m) => ({ x: m.x + 2.4, y: m.y - 1.2, text: m.f.id })),
  )) {
    doc.text(label.text, label.x, label.y)
  }
}

/**
 * Label positions that do not overprint each other. Findings close together (R1-1 and R1-2 are
 * about 30 m apart on a 100 mm plan) would otherwise draw both ids on the same spot; each one that
 * collides with an already placed label steps up by one line.
 */
export function placeLabels(
  labels: readonly { x: number; y: number; text: string }[],
  charWidth = 1.35,
  lineHeight = 2.8,
): { x: number; y: number; text: string }[] {
  const placed: { x: number; y: number; w: number; h: number }[] = []
  const out: { x: number; y: number; text: string }[] = []
  for (const label of labels) {
    let y = label.y
    for (let guard = 0; guard < 12; guard++) {
      const box = { x: label.x, y: y - 2.2, w: label.text.length * charWidth, h: 2.8 }
      const hits = placed.some(
        (b) => box.x < b.x + b.w && box.x + box.w > b.x && box.y < b.y + b.h && box.y + box.h > b.y,
      )
      if (!hits) {
        placed.push(box)
        break
      }
      y -= lineHeight
    }
    out.push({ x: label.x, y, text: label.text })
  }
  return out
}
