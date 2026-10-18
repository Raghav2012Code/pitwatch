/** Default coverage factor: report a change only beyond 2 standard deviations. */
export const K = 2

/** 1σ uncertainty of the difference between two independent surveys: √(σ1² + σ2²). */
export const combinedSigma = (sigma1: number, sigma2: number) => Math.hypot(sigma1, sigma2)

/** A change counts as real only when |change| > k·σ. Anything smaller could be survey noise. */
export const isSignificant = (change: number, sigma1: number, sigma2: number, k = K) =>
  Math.abs(change) > k * combinedSigma(sigma1, sigma2)
