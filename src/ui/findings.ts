import type { ComplianceFinding, RuleId } from '../domain/types'
import { toneOf } from '../scene/marks'
import { CriticalGlyph, ViolationGlyph, WarningGlyph } from './icons'

export const RULE_NAMES: Record<RuleId, string> = {
  R1: 'Lease boundary and buffer',
  R2: 'Approved pit floor',
  R3: 'Permitted dump zones',
}

export type Tone = 'critical' | 'violation' | 'warning' | 'clear'

export { toneOf }

export const GLYPH = { critical: CriticalGlyph, violation: ViolationGlyph, warning: WarningGlyph }

/** Worst tone across findings, or 'clear' when there are none. */
export function worstTone(findings: readonly ComplianceFinding[]): Tone {
  const tones = findings.map(toneOf)
  return (['critical', 'violation', 'warning'] as const).find((t) => tones.includes(t)) ?? 'clear'
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

/** "2 violations, 3 warnings", or "No findings". */
export function countText(findings: readonly ComplianceFinding[]): string {
  const v = findings.filter((f) => f.status === 'violation').length
  const w = findings.length - v
  const parts = [v && plural(v, 'violation'), w && plural(w, 'warning')].filter(Boolean)
  return parts.length ? parts.join(', ') : 'No findings'
}
