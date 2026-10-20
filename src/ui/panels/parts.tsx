import type { ReactNode } from 'react'
import type { Provenance } from '../../domain/types'
import { ProvenanceTag } from '../ProvenanceTag'

/** `provenance` applies to every value in the section unless a row sets its own. */
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
    <section className="px-5 py-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="panel-title">{title}</h3>
        {provenance && <ProvenanceTag value={provenance} />}
      </div>
      {children}
    </section>
  )
}

export function Row({
  label,
  value,
  mono,
  provenance,
}: {
  label: string
  value: ReactNode
  mono?: boolean
  provenance?: Provenance
}) {
  return (
    <div className="flex items-baseline gap-3 py-1.5">
      <dt className="w-[104px] shrink-0 text-[12.5px] text-ink-faint">{label}</dt>
      <dd className={`min-w-0 flex-1 text-[13px] text-ink ${mono ? 'font-mono text-[12px]' : ''}`}>
        {value}
      </dd>
      {provenance && (
        <dd>
          <ProvenanceTag value={provenance} />
        </dd>
      )}
    </div>
  )
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="text-[13px] leading-5 text-ink-dim">{children}</p>
}
