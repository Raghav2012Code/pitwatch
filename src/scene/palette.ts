/*
 * Colours for the 3D terrain. Kept here (not in CSS) because three.js needs numbers,
 * and the UI legend builds its gradient from the same stops so the two always match.
 */

/**
 * Elevation tint, low to high, in the order survey software uses (cool lows, warm highs)
 * but muted so it sits with the rest of the page: slate blue pit floor, teal and sage
 * benches, straw plateau, ochre and rust on the ridge.
 */
export const RAMP: readonly (readonly [t: number, hex: string])[] = [
  [0, '#2f4b66'],
  [0.18, '#3b7480'],
  [0.36, '#6f9a74'],
  [0.54, '#b9b874'],
  [0.72, '#d8a862'],
  [0.88, '#bf7550'],
  [1, '#8f4f3e'],
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

/**
 * Overlay colours on the terrain: cut and fill for the change map, and the finding tones
 * (same hues as the --color-warn / --color-violation / --color-critical tokens).
 */
export const OVERLAY = {
  cut: '#b5482a',
  fill: '#2a6fb0',
  warning: '#c98a12',
  violation: '#c0262d',
  critical: '#8c3bb0',
  /** Lease boundary and buffer lines. */
  lease: '#fbfaf6',
  /** Picked point and measure line (same as --color-accent). */
  accent: '#1f5f86',
  /** Pin badge: paper fill, ink text (same as --color-ink). */
  badgeInk: '#23262b',
} as const

/** Tone to overlay colour, for pins and the map key. */
export const TONE_COLOR = {
  warning: OVERLAY.warning,
  violation: OVERLAY.violation,
  critical: OVERLAY.critical,
} as const

/** Scene lighting (three.js cannot read CSS tokens): cool sky fill, warm low sun. */
export const LIGHT = { sky: '#e4ebee', ground: '#6b5a48', sun: '#fff0dc' } as const

/** Used only if `--color-backdrop` cannot be read. Same value as the token in index.css. */
export const BACKDROP_FALLBACK = '#e8e4d9'

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
