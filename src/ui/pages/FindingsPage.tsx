import { useTerrain } from '../../state/terrain'
import { countText } from '../findings'
import { FindingCard, SeverityLegend, ThresholdNote } from '../panels/FindingsPanel'
import { Page } from '../shell/AppShell'
import { LoadGate } from '../shell/LoadGate'
import { ProvenanceTag } from '../ProvenanceTag'

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
          <div className="mt-3 max-w-[44rem]">
            <SeverityLegend />
          </div>
        </section>
      </LoadGate>
    </Page>
  )
}

function List() {
  const findings = useTerrain((s) => s.findings)

  return (
    <section aria-labelledby="all-findings">
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
        <ul className="finding-grid mt-5">
          {findings.map((f) => (
            <FindingCard key={f.id} f={f} level={3} />
          ))}
        </ul>
      )}
      <div className="max-w-[44rem]">
        <ThresholdNote />
      </div>
    </section>
  )
}
