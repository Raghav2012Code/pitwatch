import { create } from 'zustand'
import { easeInOutCubic } from '../scene/presets'

/**
 * Landing-page model position in time between the two surveys: 0 = baseline, 1 = current.
 * The 3D model and the date bar both follow it.
 */
export const useStory = create<{ t: number }>(() => ({ t: 0 }))

let frame = 0

/** Moves the story to `to` (0 or 1) over `ms`, or at once when the viewer prefers less motion. */
export function tweenStory(to: number, ms = 900) {
  cancelAnimationFrame(frame)
  const from = useStory.getState().t
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (still || from === to) {
    useStory.setState({ t: to })
    return
  }
  const start = performance.now()
  const step = (now: number) => {
    const p = Math.min(1, (now - start) / ms)
    useStory.setState({ t: from + (to - from) * easeInOutCubic(p) })
    if (p < 1) frame = requestAnimationFrame(step)
  }
  frame = requestAnimationFrame(step)
}
