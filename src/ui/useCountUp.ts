import { useEffect, useState } from 'react'

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Counts from 0 up to `target` with an ease-out curve. Jumps straight to it under reduced motion. */
export function useCountUp(target: number, ms = 900, delay = 0) {
  const [value, setValue] = useState(() => (reducedMotion() ? target : 0))

  useEffect(() => {
    if (reducedMotion()) return
    const start = performance.now() + delay
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - start) / ms))
      setValue(Math.round(target * (1 - (1 - p) ** 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms, delay])

  return value
}
