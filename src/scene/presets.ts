import type { Vec2 } from '../domain/types'

/*
 * Camera poses in scene units (see terrainGeometry.ts for the axes).
 * Pure maths so the presets can be tested without three.js.
 */

export type ViewPreset = 'oblique' | 'top' | 'pit'
export type ViewRequest = ViewPreset | 'north' | 'intro'

export type V3 = [number, number, number]

export interface Pose {
  position: V3
  target: V3
}

/**
 * @param pit       pit centre in scene x/z
 * @param floorY    pit floor height in scene y, already exaggerated
 */
export function presetPose(kind: ViewPreset | 'intro', pit: Vec2, floorY: number): Pose {
  const t: V3 = [pit.x, floorY * 0.5, pit.y]
  const off: Record<ViewPreset | 'intro', V3> = {
    oblique: [820, 2150, 2650],
    top: [0, 3700, 1],
    pit: [420, 700, 880],
    intro: [0, 4700, 1400],
  }
  const o = off[kind]
  return { position: [t[0] + o[0], t[1] + o[1], t[2] + o[2]], target: t }
}

/**
 * Same distance and tilt, turned so the camera looks due north (towards −z).
 */
export function northUp(position: V3, target: V3): Pose {
  const dx = position[0] - target[0]
  const dz = position[2] - target[2]
  const flat = Math.hypot(dx, dz)
  return { position: [target[0], position[1], target[2] + flat], target }
}

/** Compass heading the camera looks along, degrees clockwise from north. */
export function headingOf(position: V3, target: V3): number {
  const dx = target[0] - position[0]
  const dz = target[2] - position[2]
  if (dx === 0 && dz === 0) return 0
  const deg = (Math.atan2(dx, -dz) * 180) / Math.PI
  return (deg + 360) % 360
}

/** Ground metres covered by one screen pixel at the target distance. */
export function metresPerPixel(distance: number, fovDeg: number, viewportPx: number): number {
  return (2 * distance * Math.tan((fovDeg * Math.PI) / 360)) / viewportPx
}

const NICE = [5, 10, 20, 50, 100, 200, 500, 1000, 2000]

/** Largest round length that fits in `maxPx`, and its width in pixels. */
export function scaleBar(mpp: number, maxPx = 120): { metres: number; px: number } {
  let metres = NICE[0]
  for (const n of NICE) if (n / mpp <= maxPx) metres = n
  return { metres, px: metres / mpp }
}

/** Smoothstep-like ease for camera flights. */
export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
