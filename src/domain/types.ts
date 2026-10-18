/** Where a displayed value came from. Shown next to every value in the UI. */
export type Provenance = 'measured' | 'derived' | 'simulated' | 'unverified'

export interface LatLon {
  lat: number
  lon: number
}

/** Descriptive mine metadata. Extended with geometry in M2. */
export interface MineInfo {
  id: string
  name: string
  mineral: string
  operator: string
  region: string
  /** Display-only anchor for the local metric grid. Fictional. */
  originLatLon: LatLon
  provenance: Provenance
}

export interface SurveyEpochInfo {
  id: string
  label: 'Baseline' | 'Current'
  /** ISO date, YYYY-MM-DD */
  date: string
  method: string
  provenance: Provenance
}
