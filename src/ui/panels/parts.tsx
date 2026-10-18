import type { ReactNode } from 'react'
import type { Provenance } from '../../domain/types'
import { ProvenanceTag } from '../ProvenanceTag'

/** `provenance` applies to every value in the section, so rows can omit their own tag. */
export function Section({
  title,
  provenance,
  children,
}: {
  title: string
  provenance?: Provenance
  children: ReactNode
}) {
  return (
    <section className="px-4 py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-[12px] font-semibold text-ink-dim">{title}</h3>
        {provenance && <ProvenanceTag value={provenance} />}
      </div>
      {children}
    </section>
  )
}

export function Row({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-3 py-1.5">
      <dt className="w-24 shrink-0 text-[12.5px] text-ink-faint">{label}</dt>
      <dd className={`min-w-0 flex-1 text-[13px] text-ink ${mono ? 'font-mono text-[12px]' : ''}`}>
        {value}
      </dd>
    </div>
  )
}

/** KPI tile. Pass `value={null}` when the number does not exist yet. */
export function Kpi({
  label,
  value,
  unit,
  note,
  provenance,
}: {
  label: string
  value: string | null
  unit?: string
  note: string
  provenance?: Provenance
}) {
  return (
    <div className={`kpi ${value === null ? 'kpi-pending' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11.5px] text-ink-dim">{label}</span>
        {provenance && <ProvenanceTag value={provenance} />}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="kpi-value">{value ?? '—'}</span>
        {value !== null && unit && <span className="text-[12px] text-ink-dim">{unit}</span>}
      </div>
      <div className="mt-1 text-[11px] leading-4 text-ink-faint">{note}</div>
    </div>
  )
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="text-[13px] leading-5 text-ink-dim">{children}</p>
}
