import type { ReactNode } from 'react'
import type { Provenance } from '../../domain/types'
import { ProvenanceTag } from '../ProvenanceTag'

/** `provenance` here applies to every value in the section, so rows can omit their own tag. */
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
    <section className="border-b border-line px-5 py-4 last:border-b-0">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h3 className="text-[12px] font-semibold text-ink-dim">{title}</h3>
        {provenance && <ProvenanceTag value={provenance} />}
      </div>
      {children}
    </section>
  )
}

/** Label / value row. Numbers go in `mono` so digits line up. */
export function Row({
  label,
  value,
  provenance,
  mono = false,
}: {
  label: string
  value: ReactNode
  provenance?: Provenance
  mono?: boolean
}) {
  return (
    <div className="flex items-baseline gap-3 py-1.5">
      <dt className="w-24 shrink-0 text-[12.5px] text-ink-dim">{label}</dt>
      <dd
        className={`min-w-0 flex-1 text-[13px] text-ink ${mono ? 'font-mono text-[12.5px]' : ''}`}
      >
        {value}
      </dd>
      {provenance && <ProvenanceTag value={provenance} />}
    </div>
  )
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="text-[13px] leading-5 text-ink-dim">{children}</p>
}
