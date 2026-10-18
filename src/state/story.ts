import { create } from 'zustand'

/**
 * Home-page story position in time between the two surveys: 0 = baseline, 1 = current.
 * Set from the scroll position; the 3D model and the date bar both follow it.
 */
export const useStory = create<{ t: number }>(() => ({ t: 0 }))
