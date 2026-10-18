import type { Provenance } from '../domain/types'

const MEANING: Record<Provenance, string> = {
  measured: 'Measured: taken directly from a survey instrument.',
  derived: 'Derived: calculated in this app from other values.',
  simulated: 'Simulated: synthetic value for this fictional mine.',
  unverified: 'Unverified: reported but not checked against a survey.',
}

export function ProvenanceTag({ value }: { value: Provenance }) {
  return (
    <span className={`prov prov-${value}`} title={MEANING[value]} aria-label={MEANING[value]}>
      {value}
    </span>
  )
}
