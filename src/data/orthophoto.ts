import type { GridSpec, Orthophoto } from '../domain/types'
import { cellCenter } from '../geo/grid'
import { distanceToSegment } from '../geo/polygon'
import { BASELINE_PIT, CURRENT_PIT, ROADS } from './fixtures/scenario'
import { fbm, valueNoise } from './noise'
import { RAMP } from './fixtures/scenario'
import { creekDistance, insidePit, pitsOf, rampDistance } from './synthetic'

/*
 * Simulated aerial image for the fictional mine, so the 3D model reads like a drone
 * survey (elevation model + orthomosaic) instead of a coloured height map.
 * Colours come from what each place would plausibly look like from the air: scrub and
 * dry grass on red lateritic soil, banded iron rock in the pit walls, dusty berms,
 * waste dumps and haul roads. Shading in hollows is baked in, as in a real photo.
 */

type RGB = readonly [number, number, number]

/** Surface colours used in the image (sRGB 0–255). */
export const SURFACE = {
  trees: [70, 80, 52],
  scrub: [124, 124, 84],
  grass: [162, 152, 114],
  soil: [150, 108, 80],
  cleared: [170, 144, 116],
  road: [198, 180, 148],
  rockRed: [124, 66, 48],
  rockGrey: [114, 108, 102],
  rockOchre: [166, 118, 68],
  berm: [166, 136, 106],
  floor: [122, 100, 82],
  water: [78, 96, 90],
  shadow: [56, 54, 40],
  waste: [166, 152, 136],
  freshCut: [172, 110, 74],
  creekSand: [196, 170, 132],
} as const satisfies Record<string, RGB>

/** Map key: what the main colours in the image mean. */
export const SURFACE_KEY: readonly { label: string; rgb: RGB }[] = [
  { label: 'Scrub', rgb: SURFACE.scrub },
  { label: 'Bare soil', rgb: SURFACE.soil },
  { label: 'Exposed rock', rgb: SURFACE.rockRed },
  { label: 'Waste rock', rgb: SURFACE.waste },
  { label: 'Haul road', rgb: SURFACE.road },
]

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t)
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

/** Bilinear sample of a per-cell field at fractional cell coordinates. */
function sampler(g: GridSpec, field: Float32Array) {
  return (fx: number, fy: number) => {
    const c0 = Math.min(Math.max(Math.floor(fx), 0), g.cols - 2)
    const r0 = Math.min(Math.max(Math.floor(fy), 0), g.rows - 2)
    const tx = clamp01(fx - c0)
    const ty = clamp01(fy - r0)
    const i = r0 * g.cols + c0
    const s = field[i] * (1 - tx) + field[i + 1] * tx
    const n = field[i + g.cols] * (1 - tx) + field[i + g.cols + 1] * tx
    return s * (1 - ty) + n * ty
  }
}

function distanceToRoads(x: number, y: number): number {
  let d = Infinity
  for (const road of ROADS) {
    for (let k = 1; k < road.length; k++) {
      const [ax, ay] = road[k - 1]
      const [bx, by] = road[k]
      d = Math.min(d, distanceToSegment({ x, y }, { x: ax, y: ay }, { x: bx, y: by }))
    }
  }
  return d
}

/**
 * @param elevations the survey surface (its slopes and hollows drive the shading)
 * @param natural    original ground level per cell (see `naturalField`)
 * @param size       image width and height in pixels (1280 ≈ 1.6 m per pixel)
 */
export function buildOrthophoto(
  g: GridSpec,
  elevations: Float32Array,
  natural: Float32Array,
  epoch: 'baseline' | 'current',
  seed: number,
  size = 1280,
): Orthophoto {
  const pit = epoch === 'baseline' ? BASELINE_PIT : CURRENT_PIT
  const pits = pitsOf(epoch)
  const n = g.cols * g.rows

  // Per-cell fields, sampled bilinearly per pixel.
  const slope = new Float32Array(n)
  const hollow = new Float32Array(n)
  const veg = new Float32Array(n)
  const pitIn = new Float32Array(n)
  const road = new Float32Array(n)
  const blotchF = new Float32Array(n)
  const creek = new Float32Array(n)
  const ramp = new Float32Array(n)
  const at = (c: number, r: number) =>
    elevations[Math.min(g.rows - 1, Math.max(0, r)) * g.cols + Math.min(g.cols - 1, Math.max(0, c))]
  for (let r = 0; r < g.rows; r++) {
    for (let c = 0; c < g.cols; c++) {
      const i = r * g.cols + c
      const p = cellCenter(g, c, r)
      const gx = (at(c + 1, r) - at(c - 1, r)) / (2 * g.cellSize)
      const gy = (at(c, r + 1) - at(c, r - 1)) / (2 * g.cellSize)
      slope[i] = (Math.atan(Math.hypot(gx, gy)) * 180) / Math.PI
      // Positive in hollows and at the foot of slopes, negative on crests.
      hollow[i] =
        (at(c + 1, r) + at(c - 1, r) + at(c, r + 1) + at(c, r - 1) - 4 * at(c, r)) /
        (g.cellSize * g.cellSize)
      veg[i] = fbm(p.x / 260, p.y / 260, seed + 31, 3)
      pitIn[i] = Math.max(-500, ...pits.map((k) => insidePit(p, k)))
      creek[i] = creekDistance(p, seed)
      ramp[i] = pitIn[i] > 0 ? Math.min(500, rampDistance(p, pits[0])) : 500
      road[i] = distanceToRoads(p.x, p.y)
      blotchF[i] = valueNoise(p.x / 28, p.y / 28, seed + 43)
    }
  }
  const sNatural = sampler(g, natural)
  const sElev = sampler(g, elevations)
  const sSlope = sampler(g, slope)
  const sHollow = sampler(g, hollow)
  const sVeg = sampler(g, veg)
  const sPit = sampler(g, pitIn)
  const sRoad = sampler(g, road)
  const sBlotch = sampler(g, blotchF)
  const sCreek = sampler(g, creek)
  const sRamp = sampler(g, ramp)

  const rgba = new Uint8Array(size * size * 4)
  const spanX = (g.cols - 1) * g.cellSize
  const spanY = (g.rows - 1) * g.cellSize

  // Current colour, mutated in place to avoid allocating per pixel.
  let cr = 0
  let cg = 0
  let cb = 0
  const set = (a: RGB) => {
    cr = a[0]
    cg = a[1]
    cb = a[2]
  }
  const toward = (b: RGB, t: number) => {
    cr += (b[0] - cr) * t
    cg += (b[1] - cg) * t
    cb += (b[2] - cb) * t
  }

  for (let j = 0; j < size; j++) {
    const fy = (j / (size - 1)) * (g.rows - 1)
    const py = g.originXY.y + (j / (size - 1)) * spanY
    for (let i = 0; i < size; i++) {
      const fx = (i / (size - 1)) * (g.cols - 1)
      const px = g.originXY.x + (i / (size - 1)) * spanX
      const z = sElev(fx, fy)
      const cut = sNatural(fx, fy) - z
      const s = sSlope(fx, fy)
      const grain = valueNoise(px / 6, py / 6, seed + 41)
      const blotch = sBlotch(fx, fy)
      const inPit = sPit(fx, fy)

      if (cut < -0.4) {
        // Waste rock: pale and granular, darker on the tipped batters.
        set(SURFACE.waste)
        toward(SURFACE.freshCut, 0.15 * blotch)
        if (s > 18) toward(SURFACE.rockGrey, 0.35)
      } else if (cut > 0.4 && inPit > -2) {
        if (sRamp(fx, fy) < RAMP.width / 2 - 3) {
          // The haul ramp: a pale road, whatever the slope of the cells around it.
          set(SURFACE.road)
          toward(SURFACE.cleared, 0.25 * grain)
        } else if (s < 14) {
          // Flat: berms are dusty, the floor is muddy, the sump holds murky water.
          if (z < pit.floorRL - 1) {
            set(SURFACE.water)
            toward(SURFACE.floor, 0.15 * grain)
          } else if (z < pit.floorRL + 0.8) {
            set(SURFACE.floor)
            toward(SURFACE.berm, 0.25 * grain)
          } else {
            set(SURFACE.berm)
            toward(SURFACE.cleared, 0.3 * blotch)
          }
        } else {
          // Faces: banded iron formation; layers follow elevation with a little wander.
          const band = Math.sin(z * 0.55 + blotch * 1.6)
          set(SURFACE.rockOchre)
          toward(SURFACE.rockRed, smooth(0.1, 0.9, band) * 0.8)
          toward(SURFACE.rockGrey, smooth(-0.4, -0.9, band) * 0.6 + 0.12 * grain)
        }
      } else if (cut > 0.4) {
        // Fresh cuts outside the pit (encroachment, scrape): raw red earth.
        set(SURFACE.freshCut)
        toward(SURFACE.soil, 0.3 * grain)
      } else {
        const toRoad = sRoad(fx, fy)
        const toCreek = sCreek(fx, fy)
        if (toCreek < 9 + 4 * blotch) {
          // Dry creek bed: pale sand with darker gravel bars.
          set(SURFACE.creekSand)
          toward(SURFACE.soil, 0.35 * grain)
        } else if (toRoad < 8) {
          set(SURFACE.road)
          toward(SURFACE.cleared, 0.25 * grain)
          // Windrows: graded spoil heaped along both road edges.
          if (toRoad > 5.5) toward(SURFACE.soil, 0.45)
        } else {
          // Vegetation density from large-scale noise. Scrub dominates; soil shows through
          // in thin patches; scattered tree crowns (2–3 px) where it is greener.
          // Trees crowd the creek banks, where water lingers after rain.
          const riparian = 1 - smooth(12, 70, toCreek)
          const v = sVeg(fx, fy) + 0.3 * (blotch - 0.5) + 0.9 * riparian
          const crowns = valueNoise(px / 3.2, py / 3.2, seed + 47)
          set(SURFACE.soil)
          toward(SURFACE.grass, smooth(-0.62, -0.3, v))
          toward(SURFACE.scrub, smooth(-0.15, 0.3, v) * 0.85)
          const crownAt = 0.74 - 0.12 * smooth(-0.2, 0.4, v) - 0.2 * riparian
          if (crowns > crownAt) {
            toward(SURFACE.trees, 0.75)
          } else if (valueNoise((px - 2.6) / 3.2, (py + 2.6) / 3.2, seed + 47) > crownAt) {
            // Shadow of a crown to the north-west (the sun's side), cast south-east.
            toward(SURFACE.shadow, 0.5)
          }
          // Steeper natural slopes shed soil and show it.
          toward(SURFACE.soil, smooth(8, 18, s) * 0.4)
          // Cleared, compacted ground around the pit fades out irregularly.
          const clearing = smooth(-70, -25, inPit + 30 * (blotch - 0.5) + 8 * (grain - 0.5))
          toward(SURFACE.cleared, clearing * 0.9)
        }
      }

      const shade = Math.min(1.1, Math.max(0.72, 1 - sHollow(fx, fy) * 9)) * (0.93 + 0.12 * grain)
      const o = (j * size + i) * 4
      rgba[o] = Math.min(255, cr * shade)
      rgba[o + 1] = Math.min(255, cg * shade)
      rgba[o + 2] = Math.min(255, cb * shade)
      rgba[o + 3] = 255
    }
  }
  return { width: size, height: size, rgba, provenance: 'simulated' }
}
