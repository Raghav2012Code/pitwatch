import { hash2 } from './rng'

const smooth = (t: number) => t * t * (3 - 2 * t)

/** Seeded value noise in [0, 1) with smooth interpolation between lattice points. */
export function valueNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const tx = smooth(x - ix)
  const ty = smooth(y - iy)
  const a = hash2(ix, iy, seed)
  const b = hash2(ix + 1, iy, seed)
  const c = hash2(ix, iy + 1, seed)
  const d = hash2(ix + 1, iy + 1, seed)
  return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty
}

/**
 * Fractal noise: octaves of value noise, each at double frequency and `gain` amplitude.
 * Result is roughly in [-1, 1].
 */
export function fbm(x: number, y: number, seed: number, octaves = 4, gain = 0.5): number {
  let sum = 0
  let amp = 1
  let norm = 0
  let freq = 1
  for (let o = 0; o < octaves; o++) {
    sum += amp * (valueNoise(x * freq, y * freq, seed + o * 101) * 2 - 1)
    norm += amp
    amp *= gain
    freq *= 2
  }
  return sum / norm
}
