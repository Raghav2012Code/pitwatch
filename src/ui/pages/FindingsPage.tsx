import { useState } from 'react'
import type { ComplianceFinding, RuleId } from '../../domain/types'
import { findingsToCsv } from '../../compliance/report'
import { SURVEY_EPOCHS } from '../../data/fixtures/mine'
import { useAppStore } from '../../state/store'
import { useTerrain } from '../../state/terrain'
import { countText, GLYPH, RULE_NAMES, toneOf } from '../findings'
import { SeverityLegend, ThresholdNote } from '../panels/FindingsPanel'
import { findingLink, navigate } from '../route'
import { Page } from '../shell/AppShell'
import { LoadGate } from '../shell/LoadGate'
import { ProvenanceTag } from '../ProvenanceTag'

const n = (v: number, digits = 0) =>
  v.toLocaleString('en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits })

type StatusFilter = 'all' | 'violation' | 'warning'
type RuleFilter = 'all' | RuleId

/** Every finding in full, with the evidence behind it and what the severity shapes mean. */
export function FindingsPage() {
  return (
    <Page>
      <LoadGate>
        <List />
        <section aria-labelledby="marking" className="rule-section mt-12">
          <h2 id="marking" className="section-title">
            How findings are marked
          </h2>
          <div className="mt-3">
            <SeverityLegend className="grid gap-x-10 gap-y-3 md:grid-cols-3" />
          </div>
        </section>
      </LoadGate>
    </Page>
  )
}

/** Saves the findings as a CSV file named for the survey they describe. */
function downloadCsv(findings: readonly ComplianceFinding[]) {
  const current = SURVEY_EPOCHS[1]
  const blob = new Blob([findingsToCsv(findings)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pitwatch-findings-${current?.date ?? 'current'}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/** Prints with every explanation open, then puts the page back as the reader had it. */
function printReport() {
  const closed = [...document.querySelectorAll<HTMLDetailsElement>('.frow-more:not([open])')]
  for (const d of closed) d.open = true
  window.addEventListener('afterprint', () => closed.forEach((d) => (d.open = false)), {
    once: true,
  })
  window.print()
}

function Filter<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { id: T; text: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div role="group" aria-label={label} className="seg">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={o.id === value}
          onClick={() => onChange(o.id)}
        >
          {o.text}
        </button>
      ))}
    </div>
  )
}

function List() {
  const findings = useTerrain((s) => s.findings)
  const [status, setStatus] = useState<StatusFilter>('all')
  const [rule, setRule] = useState<RuleFilter>('all')

  const shown = findings.filter(
    (f) => (status === 'all' || f.status === status) && (rule === 'all' || f.ruleId === rule),
  )

  return (
    <section aria-labelledby="all-findings" className="print-area">
      <p className="print-only">
        PitWatch 3D findings report. Simulated data: survey of {SURVEY_EPOCHS[1]?.date}.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="all-findings" className="cond text-[clamp(26px,2.6vw,32px)] leading-none font-bold">
          {countText(findings)}
        </h2>
        <ProvenanceTag value="derived" />
      </div>
      <p className="mt-3 max-w-[44rem] text-[14px] leading-6 text-ink-dim">
        These are the demo engine's classifications of a simulated change. A finding says where to
        look first; it is not a legal determination.
      </p>
      {findings.length === 0 ? (
        <p className="mt-3 text-[14px] text-ink-dim">
          No change in this simulated scenario breaks a permit rule.
        </p>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Filter
              label="Show findings by status"
              value={status}
              onChange={setStatus}
              options={[
                { id: 'all', text: 'All' },
                { id: 'violation', text: 'Violations' },
                { id: 'warning', text: 'Warnings' },
              ]}
            />
            <Filter
              label="Show findings by rule"
              value={rule}
              onChange={setRule}
              options={[
                { id: 'all', text: 'Any rule' },
                { id: 'R1', text: 'R1' },
                { id: 'R2', text: 'R2' },
                { id: 'R3', text: 'R3' },
              ]}
            />
            <p role="status" className="text-[13px] text-ink-faint">
              Showing {shown.length} of {findings.length}
            </p>
            <div className="no-print ml-auto flex gap-2">
              <button type="button" className="btn" onClick={() => downloadCsv(shown)}>
                Download CSV
              </button>
              <button type="button" className="btn" onClick={printReport}>
                Print report
              </button>
            </div>
          </div>
          {shown.length === 0 ? (
            <p className="mt-6 text-[14px] text-ink-dim">No finding matches those filters.</p>
          ) : (
            <ul className="frows mt-4">
              {shown.map((f) => (
                <FindingRow key={f.id} f={f} />
              ))}
            </ul>
          )}
        </>
      )}
      <div className="max-w-[44rem]">
        <ThresholdNote />
      </div>
    </section>
  )
}

/** One finding as a ruled row: the figures are always in view, the explanation opens on demand. */
function FindingRow({ f }: { f: ComplianceFinding }) {
  const tone = toneOf(f)
  const Glyph = GLYPH[tone]
  const selected = useAppStore((s) => s.selectedFinding === f.id)
  const selectFinding = useAppStore((s) => s.selectFinding)
  const [copied, setCopied] = useState(false)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(findingLink(f.id))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2500)
    } catch {
      // Clipboard access can be refused; the address bar link works after Show on map.
    }
  }

  return (
    <li className={`frow tone-${tone}`} data-selected={selected || undefined}>
      <div className="frow-head">
        <Glyph className="h-[20px] w-[20px] shrink-0 text-(--tone)" />
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-ink">
            {RULE_NAMES[f.ruleId]}{' '}
            <span className="font-mono text-[11.5px] font-normal text-ink-faint">{f.id}</span>
          </h3>
          <div className="text-[12.5px] text-(--tone)">
            {f.status === 'violation' ? 'Violation' : 'Warning'}, {f.severity} severity
          </div>
        </div>
      </div>
      <dl className="frow-figures">
        {[
          ['Area', `${n(f.areaM2)} m²`],
          ['Volume', `${n(f.volumeM3)} m³`],
          ['Max excess', `${n(f.maxExceedance, 1)} m`],
        ].map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <div className="frow-go">
        <button
          type="button"
          className="btn"
          onClick={() => {
            selectFinding(f.id, f.centroid)
            navigate('monitor')
          }}
        >
          Show on map
        </button>
        <button type="button" className="frow-copy no-print" onClick={() => void copyLink()}>
          {copied ? 'Link copied' : 'Copy link'}
        </button>
      </div>
      <details className="frow-more">
        <summary>Why it was flagged</summary>
        <p>{f.explanation}</p>
        <p className="mt-2 font-mono text-[11.5px] text-ink-faint">
          Centre E {n(f.centroid.x)} m, N {n(f.centroid.y)} m
        </p>
      </details>
    </li>
  )
}
