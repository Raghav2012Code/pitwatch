import { create } from 'zustand'

/**
 * Camera readings for the HUD (compass, scale bar). Updated every camera move, so HUD
 * widgets subscribe and write to the DOM directly instead of re-rendering React.
 */
export const useCameraState = create<{ heading: number; metresPerPixel: number }>(() => ({
  heading: 0,
  metresPerPixel: 2,
}))
