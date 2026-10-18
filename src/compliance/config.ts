import { K } from './uncertainty'

/*
 * Every tunable number the compliance engine uses, in one place. Change them here, not
 * in the rules.
 */

export interface SeverityThresholds {
  areaM2: number
  volumeM3: number
  exceedanceM: number
}

export interface ComplianceConfig {
  /** Coverage factor: a change must exceed k·σ to count. */
  k: number
  /**
   * Smallest change worth reporting, metres, on top of k·σ. Keeps tyre ruts, grading and
   * vegetation out of the findings even when the survey σ is tiny.
   */
  minChangeM: number
  /**
   * A violation becomes critical when any one measure reaches these values.
   * Otherwise it is high.
   */
  critical: SeverityThresholds
  /**
   * A warning becomes medium when any one measure reaches these values. Otherwise it is low.
   */
  mediumWarning: SeverityThresholds
}

export const COMPLIANCE_CONFIG: ComplianceConfig = {
  k: K,
  minChangeM: 0.5,
  critical: { areaM2: 5_000, volumeM3: 25_000, exceedanceM: 10 },
  mediumWarning: { areaM2: 2_000, volumeM3: 2_000, exceedanceM: 2 },
}
