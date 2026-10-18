import type { ExcavationState, TerrainSurvey } from '../domain/types'
import type { ComplianceConfig } from './config'
import { combinedSigma } from './uncertainty'

/** Minimum |Δh| for a cell to count as excavated or filled: minChange + k·σ. */
export const changeThreshold = (sigma: number, cfg: Pick<ComplianceConfig, 'k' | 'minChangeM'>) =>
  cfg.minChangeM + cfg.k * sigma

/**
 * Per-cell change between two surveys on the same grid. Δh = current − baseline.
 * Excavated: Δh < −(minChange + kσ). Filled: Δh > +(minChange + kσ). Anything in between
 * is "no significant change".
 */
export function detectChange(
  baseline: TerrainSurvey,
  current: TerrainSurvey,
  cfg: Pick<ComplianceConfig, 'k' | 'minChangeM'>,
): ExcavationState {
  const g = current.grid
  const b = baseline.grid
  if (g.cols !== b.cols || g.rows !== b.rows || g.cellSize !== b.cellSize) {
    throw new Error('Surveys must share the same grid to be compared')
  }
  const sigma = combinedSigma(baseline.verticalUncertainty, current.verticalUncertainty)
  const limit = changeThreshold(sigma, cfg)
  const n = g.cols * g.rows
  const dh = new Float32Array(n)
  const excavated = new Uint8Array(n)
  const filled = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    const d = current.elevations[i] - baseline.elevations[i]
    dh[i] = d
    if (d < -limit) excavated[i] = 1
    else if (d > limit) filled[i] = 1
  }
  return { grid: g, dh, excavated, filled, sigma }
}
