import type { MineInfo, SurveyEpochInfo } from '../../domain/types'

// Fictional mine. Names, operator and coordinates are invented for the demo.
export const MINE_INFO: MineInfo = {
  id: 'venthar-ridge',
  name: 'Venthar Ridge Iron Pit',
  mineral: 'Iron ore (haematite)',
  operator: 'Ardent Ore Works Ltd',
  region: 'Fictional lease, plateau terrain',
  originLatLon: { lat: 21.7342, lon: 84.3127 },
  provenance: 'simulated',
}

export const SURVEY_EPOCHS: readonly SurveyEpochInfo[] = [
  {
    id: 'baseline',
    label: 'Baseline',
    date: '2025-11-14',
    method: 'Drone photogrammetry (simulated)',
    provenance: 'simulated',
  },
  {
    id: 'current',
    label: 'Current',
    date: '2026-08-22',
    method: 'Drone photogrammetry (simulated)',
    provenance: 'simulated',
  },
]
