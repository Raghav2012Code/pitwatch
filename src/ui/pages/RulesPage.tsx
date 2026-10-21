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
      <p className="max-w-[44rem] text-[15.5px] leading-7 text-ink-dim">
        A lease is written in sentences. PitWatch turns each condition into a test that every 8 m
        grid cell either passes or fails, and only fails it when the change is bigger than the
        survey can be trusted to measure ({COMPLIANCE_CONFIG.k}σ, where σ is the combined error of
        the two surveys).
      </p>

      <ol className="rule-list mt-8">
        {CONDITIONS.map(({ rule, Icon, text, test }) => {
          const own = findings.filter((f) => f.ruleId === rule)
          const tone = own.length ? worstTone(own) : 'clear'
          const Glyph = tone === 'clear' ? null : GLYPH[tone]
          return (
            <li key={rule} className="rule-card">
              <div className="flex items-center gap-3">
                <span className="rule-icon">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="font-mono text-[12px] text-oxide">{rule}</span>
              </div>
              <h2 className="cond mt-3 text-[24px] leading-tight font-bold text-ink">
                {RULE_NAMES[rule]}
              </h2>
              <p className="mt-2 text-[14.5px] leading-6 text-ink-dim">{text}</p>
              <div className="permit-test">
                <span className="text-ink-faint">Checked when</span>
                <code>{test}</code>
              </div>
              <div className={`rule-card-foot ${ready ? `tone-${tone}` : ''}`}>
                <span
                  className={`flex items-center gap-2 text-[13px] ${ready ? 'text-(--tone)' : 'text-ink-faint'}`}
                >
                  {Glyph ? (
                    <Glyph className="h-[18px] w-[18px]" />
                  ) : (
                    <span className="status-led" data-tone={ready ? 'clear' : undefined} />
                  )}
                  {ready
                    ? own.length
                      ? countText(own)
                      : 'Clear in this demo'
                    : 'Not evaluated yet'}
                </span>
                {own.length > 0 && (
                  <a href={ROUTE_HREF.findings} className="link-arrow">
                    View
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
