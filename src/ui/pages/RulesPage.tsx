import { COMPLIANCE_CONFIG } from '../../compliance/config'
import { useTerrain } from '../../state/terrain'
import { countText, GLYPH, RULE_NAMES, worstTone } from '../findings'
import { ArrowRightIcon, BoundaryIcon, FloorIcon, TerrainIcon } from '../icons'
import { ROUTE_HREF } from '../route'
import { Page } from '../shell/AppShell'
import type { ComponentType, SVGProps } from 'react'
import type { RuleId } from '../../domain/types'

/** The three permit conditions, each with the test PitWatch applies and the live result. */
const CONDITIONS: {
  rule: RuleId
  Icon: ComponentType<SVGProps<SVGSVGElement>>
  text: string
  test: string
}[] = [
  {
    rule: 'R1',
    Icon: BoundaryIcon,
    text: 'No ground may be excavated outside the lease boundary, or inside the safety buffer that runs along its inner edge.',
    test: 'removed depth > 2σ  and  cell outside (lease − buffer)',
  },
  {
    rule: 'R2',
    Icon: FloorIcon,
    text: 'The pit floor may not be taken below the approved floor level shown on the mine plan.',
    test: 'approved floor − current surface > 2σ',
  },
  {
    rule: 'R3',
    Icon: TerrainIcon,
    text: 'Waste rock may only be placed inside the dump zones approved in the mine plan.',
    test: 'added height > 2σ  and  cell outside every dump zone',
  },
]

export function RulesPage() {
  const ready = useTerrain((s) => s.status === 'ready')
  const findings = useTerrain((s) => s.findings)

  return (
    <Page>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-12">
        <p className="max-w-[44rem] text-[15.5px] leading-7 text-ink-dim">
          A lease is written in sentences. PitWatch turns each condition into a test that every 8 m
          grid cell either passes or fails, and fails it only when the change is bigger than the
          survey can be trusted to measure.
        </p>
        <div className="permit-test self-start">
          <span className="text-ink-faint">A cell counts as changed when</span>
          <code>
            |Δh| &gt; {COMPLIANCE_CONFIG.minChangeM} m + {COMPLIANCE_CONFIG.k}σ
          </code>
          <span className="text-ink-faint">σ is the combined error of the two surveys.</span>
        </div>
      </div>

      <ol className="rule-rows">
        {CONDITIONS.map(({ rule, Icon, text, test }) => {
          const own = findings.filter((f) => f.ruleId === rule)
          const tone = own.length ? worstTone(own) : 'clear'
          const Glyph = tone === 'clear' ? null : GLYPH[tone]
          return (
            <li key={rule} className="rule-row">
              <span className="rule-id cond" aria-hidden="true">
                {rule}
              </span>
              <div>
                <h2 className="cond flex items-center gap-3 text-[26px] leading-tight font-bold text-ink">
                  <Icon className="h-5 w-5 shrink-0 text-accent" />
                  {RULE_NAMES[rule]}
                </h2>
                <p className="mt-2 max-w-[38rem] text-[14.5px] leading-6 text-ink-dim">{text}</p>
                <div className="permit-test mt-4 max-w-[38rem]">
                  <span className="text-ink-faint">Checked when</span>
                  <code>{test}</code>
                </div>
              </div>
              <div className="space-y-2">
                <p className={`rule-result-line ${ready ? `tone-${tone}` : ''}`}>
                  {ready ? (
                    <>
                      {Glyph ? (
                        <Glyph className="h-[18px] w-[18px]" />
                      ) : (
                        <span className="status-led" data-tone="clear" aria-hidden="true" />
                      )}
                      {own.length ? countText(own) : 'Clear in this demo'}
                    </>
                  ) : (
                    <>
                      <span className="status-led" aria-hidden="true" />
                      Not evaluated yet
                    </>
                  )}
                </p>
                {own.length > 0 && (
                  <a href={ROUTE_HREF.findings} className="link-arrow">
                    View findings
                    <ArrowRightIcon className="h-4 w-4" />
                  </a>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </Page>
  )
}
