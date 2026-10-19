import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Sprite height, in view-space units, that draws `px` pixels tall at any distance when the
 * sprite material has sizeAttenuation off (height as a fraction of the canvas × 2·tan(fov/2)).
 */
export function useScreenHeight(px: number) {
  const height = useThree((s) => s.size.height)
  const fov = useThree((s) => (s.camera as THREE.PerspectiveCamera).fov)
  return (px / height) * 2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2)
}
