import { Page } from '../shell/AppShell'
import { NoiseCheck } from '../home/NoiseCheck'
import { Resolution } from '../home/Resolution'

/** Why a measured change has to beat the survey noise, and why the survey resolution matters. */
export function UncertaintyPage() {
  return (
    <Page>
      <NoiseCheck />
      <Resolution />
    </Page>
  )
}
