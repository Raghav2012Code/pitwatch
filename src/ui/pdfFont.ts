import type { jsPDF } from 'jspdf'
import regularUrl from '../assets/fonts/pdf/NotoSans-Regular.ttf?url'
import boldUrl from '../assets/fonts/pdf/NotoSans-Bold.ttf?url'

type Jsdoc = InstanceType<typeof jsPDF>

/** Base64 for a font file: jsPDF's `addFileToVFS` takes the bytes as a string. */
export function bytesToBase64(bytes: ArrayBuffer): string {
  const view = new Uint8Array(bytes)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < view.length; i += chunk) {
    binary += String.fromCharCode(...view.subarray(i, i + chunk))
  }
  return btoa(binary)
}

// Fetched once per page; registering is per document, because every jsPDF instance has its own VFS.
let fontData: Promise<{ regular: string; bold: string }> | null = null

/**
 * Register the report's embedded font with this document. The subsets are fetched only when a
 * report is built, so the findings page pays nothing for them until the button is pressed.
 */
export async function registerPdfFonts(doc: Jsdoc): Promise<void> {
  fontData ??= (async () => {
    const [regular, bold] = await Promise.all([fetch(regularUrl), fetch(boldUrl)])
    if (!regular.ok || !bold.ok) throw new Error('The PDF font could not be loaded')
    return {
      regular: bytesToBase64(await regular.arrayBuffer()),
      bold: bytesToBase64(await bold.arrayBuffer()),
    }
  })()
  let data: { regular: string; bold: string }
  try {
    data = await fontData
  } catch (error) {
    fontData = null // a failed download is retryable, like the terrain load
    throw error
  }
  doc.addFileToVFS('NotoSans-Regular.ttf', data.regular)
  doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal')
  doc.addFileToVFS('NotoSans-Bold.ttf', data.bold)
  doc.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold')
}
