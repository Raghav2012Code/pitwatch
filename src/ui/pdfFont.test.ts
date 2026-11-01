import { describe, expect, it } from 'vitest'
import { bytesToBase64 } from './pdfFont'

const encoded = (bytes: number[]) => bytesToBase64(new Uint8Array(bytes).buffer)

describe('bytesToBase64', () => {
  it('pads the 1- and 2-byte tails the way base64 requires', () => {
    expect(encoded([])).toBe('')
    expect(encoded([65])).toBe('QQ==')
    expect(encoded([65, 66])).toBe('QUI=')
    expect(encoded([65, 66, 67])).toBe('QUJD')
    expect(encoded([0, 255, 128, 1])).toBe('AP+AAQ==')
  })

  it('encodes a font-sized file without overflowing the argument list', () => {
    const bytes = new Uint8Array(70_000)
    for (let i = 0; i < bytes.length; i++) bytes[i] = i % 251
    const base64 = bytesToBase64(bytes.buffer)
    const back = atob(base64)
    expect(back.length).toBe(bytes.length)
    for (let i = 0; i < bytes.length; i++) expect(back.charCodeAt(i)).toBe(bytes[i]!)
  })
})
