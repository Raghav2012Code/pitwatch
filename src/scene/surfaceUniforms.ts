import * as THREE from 'three'
import { CONTOUR_INK } from './palette'
import { BASE_RL } from './terrainGeometry'

/**
 * Layer switches are uniform changes, not shader recompiles.
 *
 * Every surface material gets its own set. A shared object would be written by whichever canvas
 * rendered last: the home model and the monitor would overwrite each other's contour and tint
 * state, and the values would outlive a navigation. The overlay and morph uniforms are already
 * per-material; this makes the layer uniforms match.
 */
export function makeSurfaceUniforms() {
  return {
    uBase: { value: BASE_RL },
    uInterval: { value: 5 },
    uContours: { value: 0 },
    /** 0 = aerial image, 1 = hypsometric tint. */
    uTint: { value: 0 },
    uInk: { value: new THREE.Color(CONTOUR_INK) },
  }
}

export type SurfaceUniforms = ReturnType<typeof makeSurfaceUniforms>
