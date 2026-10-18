import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import type { PerspectiveCamera } from 'three'

/**
 * Keeps the canvas full-size (so the model is never clipped by panel edges) but shifts
 * the projection centre to the middle of `region`, the part of the screen the side
 * panels leave uncovered. Follows the region as panels open and close.
 */
export function ViewOffset({ region }: { region: string }) {
  const get = useThree((s) => s.get)
  const size = useThree((s) => s.size)

  useEffect(() => {
    const el = document.querySelector<HTMLElement>(region)
    if (!el) return
    const apply = () => {
      const { camera, gl, invalidate } = get()
      const canvas = gl.domElement.getBoundingClientRect()
      const area = el.getBoundingClientRect()
      const shift = canvas.width / 2 - (area.left - canvas.left + area.width / 2)
      ;(camera as PerspectiveCamera).setViewOffset(
        size.width,
        size.height,
        shift,
        0,
        size.width,
        size.height,
      )
      camera.updateProjectionMatrix()
      invalidate()
    }
    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(el)
    return () => {
      observer.disconnect()
      ;(get().camera as PerspectiveCamera).clearViewOffset()
    }
  }, [get, region, size])

  return null
}
