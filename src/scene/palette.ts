/*
 * Colours for the 3D terrain. Kept here (not in CSS) because three.js needs numbers,
 * and the UI legend builds its gradient from the same stops so the two always match.
 */

/** Hypsometric tint, low to high: pit floor browns up to pale limestone and sage plateau. */
export const RAMP: readonly (readonly [t: number, hex: string])[] = [
  [0, '#6e4a3a'],
  [0.2, '#946446'],
  [0.42, '#b5875a'],
  [0.62, '#d2b98f'],
  [0.82, '#dcd6c0'],
  [1, '#c4c8a2'],
]

/**
 * Soil profile on the sides of the terrain block, by depth below ground: dark topsoil,
 * red lateritic soil (typical over iron formations), weathered rock, then bedrock.
 */
export const SOIL_PROFILE = {
  topsoil: '#4a3a2c',
  laterite: '#8c4c33',
  saprolite: '#a58c6a',
  bedrock: '#6f6a63',
} as const

/** Contour line colour. */
export const CONTOUR_INK = '#3b2a20'

export type RGB = [number, number, number]

export function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

/** sRGB channel (0–1) to linear light, for three.js vertex colours. */
export const srgbToLinear = (c: number) =>
  c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)

/** Colour at t ∈ [0, 1] along the ramp, interpolated in sRGB. Clamps outside the range. */
export function rampAt(t: number): RGB {
  const x = Math.min(1, Math.max(0, t))
  for (let i = 1; i < RAMP.length; i++) {
    const [t1, h1] = RAMP[i]
    if (x <= t1) {
      const [t0, h0] = RAMP[i - 1]
      const k = (x - t0) / (t1 - t0)
      const a = hexToRgb(h0)
      const b = hexToRgb(h1)
      return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]
    }
  }
  return hexToRgb(RAMP[RAMP.length - 1][1])
}

/** CSS gradient of the ramp for the legend. */
export const rampGradient = (direction = 'to right') =>
  `linear-gradient(${direction}, ${RAMP.map(([t, c]) => `${c} ${t * 100}%`).join(', ')})`
