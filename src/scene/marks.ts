import type { ComplianceFinding, ExcavationState } from '../domain/types'

/**
 * Per-cell overlay marks, one value per grid cell. `change`: −1 excavated, +1 filled.
 * `finding`: one-hot [warning, violation, critical] per cell (3 values per cell).
 */
export interface TerrainMarks {
  change: Float32Array
  finding: Float32Array
}

/** Finding tone for display: critical outranks the plain violation colour. */
export const toneOf = (f: ComplianceFinding) => (f.severity === 'critical' ? 'critical' : f.status)

const SLOT = { warning: 0, violation: 1, critical: 2 } as const

/** Marks for `cellCount` grid cells from the measured change and the engine findings. */
export function buildMarks(
  cellCount: number,
  change: ExcavationState | undefined,
  findings: readonly ComplianceFinding[],
): TerrainMarks {
  const marks: TerrainMarks = {
    change: new Float32Array(cellCount),
    finding: new Float32Array(cellCount * 3),
  }
  if (change) {
    for (let i = 0; i < cellCount; i++)
      marks.change[i] = change.excavated[i] ? -1 : change.filled[i] ? 1 : 0
  }
  for (const f of findings) {
    for (const i of f.cells) marks.finding[i * 3 + SLOT[toneOf(f)]] = 1
  }
  return marks
}
