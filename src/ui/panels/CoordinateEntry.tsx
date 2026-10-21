import { useId, useState, type FormEvent } from 'react'
import type { Vec2 } from '../../domain/types'
import { extent } from '../../geo/grid'
import { useAppStore } from '../../state/store'
import { useTerrain } from '../../state/terrain'
import { Section } from './parts'

/** Report the entered coordinate as typed, not rounded like the Position row. */
const coord = (v: number) => v.toLocaleString('en-GB', { maximumFractionDigits: 2 })

/** Empty or not a finite number means "do not submit"; zero is a real coordinate. */
function parse(value: string): number | null {
  const text = value.trim()
  if (!text) return null
  const n = Number(text)
  return Number.isFinite(n) ? n : null
}

type Draft = { east: string; north: string }
const EMPTY: Draft = { east: '', north: '' }
const draftOf = (p: Vec2 | null): Draft => (p ? { east: String(p.x), north: String(p.y) } : EMPTY)

/**
 * The keyboard way to choose a point: the map only picks on a click, so this form feeds the
 * same `pickPoint` action with a typed coordinate. In the Inspect tool that reads the point;
 * in the Measure tool it sets A, then B, then starts a new line — exactly like a click.
 */
export function CoordinateEntry() {
  const picked = useAppStore((s) => s.picked)
  const tool = useAppStore((s) => s.tool)
  const measureA = useAppStore((s) => s.measureA)
  const measureB = useAppStore((s) => s.measureB)
  const pickPoint = useAppStore((s) => s.pickPoint)
  const grid = useTerrain((s) => s.surveys.current?.grid)

  // The point the form speaks for: the inspected point, or the latest measure endpoint.
  const pick = tool === 'measure' ? (measureB ?? measureA) : picked

  const [draft, setDraft] = useState<Draft>(() => draftOf(pick))
  const [status, setStatus] = useState('')
  // Keep the fields in step with a new pick (map click, measure step, clear). The previous pick
  // is state, so the adjustment happens once per change and no subscription effect is needed.
  const [seen, setSeen] = useState<Vec2 | null>(pick)
  if (seen !== pick) {
    setSeen(pick)
    setDraft(draftOf(pick))
  }

  const eastId = useId()
  const northId = useId()
  const hintId = useId()

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const x = parse(draft.east)
    const y = parse(draft.north)
    if (x === null || y === null) {
      setStatus('Enter both an east and a north coordinate as numbers.')
      return
    }

    // Same action a map click calls, so the tab, tool and measure cycling are not reimplemented.
    pickPoint({ x, y })

    if (!grid) {
      setStatus(`Read E ${coord(x)} m, N ${coord(y)} m.`)
      return
    }
    const bounds = extent(grid)
    const inside = x >= bounds.min.x && x <= bounds.max.x && y >= bounds.min.y && y <= bounds.max.y
    // Out of grid is still applied — the position is real — but no elevation can be sampled,
    // and the status line says so rather than leaving a silently blank panel.
    setStatus(
      inside
        ? `Read E ${coord(x)} m, N ${coord(y)} m.`
        : `E ${coord(x)} m, N ${coord(y)} m is outside the survey grid (E ${coord(bounds.min.x)}–${coord(bounds.max.x)} m, N ${coord(bounds.min.y)}–${coord(bounds.max.y)} m). The position is reported; elevations cannot be.`,
    )
  }

  const inputClass =
    'mt-1 w-full min-w-0 rounded-[3px] border border-line bg-panel px-2 py-1 font-mono text-[12px] text-ink placeholder:text-ink-faint'

  return (
    <Section title="Read a coordinate">
      <form onSubmit={onSubmit} aria-describedby={hintId} noValidate>
        <p id={hintId} className="text-[11.5px] leading-4 text-ink-faint">
          Local metres, same origin as the Position row. Enter a point to read it as a map click
          would.
        </p>
        <div className="mt-2 flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <label htmlFor={eastId} className="text-[12px] text-ink-dim">
              East
            </label>
            <input
              id={eastId}
              name="east"
              type="number"
              step="any"
              inputMode="decimal"
              autoComplete="off"
              placeholder="e.g. 1024"
              aria-describedby={hintId}
              className={inputClass}
              value={draft.east}
              onChange={(e) => {
                setDraft((d) => ({ ...d, east: e.target.value }))
                if (status) setStatus('')
              }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <label htmlFor={northId} className="text-[12px] text-ink-dim">
              North
            </label>
            <input
              id={northId}
              name="north"
              type="number"
              step="any"
              inputMode="decimal"
              autoComplete="off"
              placeholder="e.g. 900"
              aria-describedby={hintId}
              className={inputClass}
              value={draft.north}
              onChange={(e) => {
                setDraft((d) => ({ ...d, north: e.target.value }))
                if (status) setStatus('')
              }}
            />
          </div>
          <button type="submit" className="btn shrink-0 text-[12px]">
            Read point
          </button>
        </div>
        <p
          role="status"
          aria-live="polite"
          className="mt-2 min-h-10 text-[11.5px] leading-4 text-ink-dim"
        >
          {status}
        </p>
      </form>
    </Section>
  )
}
