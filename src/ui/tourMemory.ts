/**
 * Whether the first-visit tour has been finished or dismissed on this browser. Kept out of the
 * component so the persistence rule can be tested without a DOM; a browser that refuses storage
 * (private mode, disabled site data) is treated as "already seen" so the tour never nags.
 */
const TOUR_KEY = 'pitwatch.tour.v1'

type TourStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const storage = (): TourStore | null => {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export const tourSeen = (store: TourStore | null = storage()): boolean => {
  if (!store) return true
  try {
    return store.getItem(TOUR_KEY) === 'done'
  } catch {
    return true
  }
}

export const markTourSeen = (store: TourStore | null = storage()): void => {
  try {
    store?.setItem(TOUR_KEY, 'done')
  } catch {
    // Storage full or denied: the tour simply may return next visit.
  }
}

export const resetTour = (store: TourStore | null = storage()): void => {
  try {
    store?.removeItem(TOUR_KEY)
  } catch {
    // Nothing to clear.
  }
}
