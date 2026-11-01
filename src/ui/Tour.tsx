import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppStore } from '../state/store'
import { useTerrain } from '../state/terrain'
import { markTourSeen, tourSeen } from './tourMemory'

const STEPS = [
  {
    title: 'Read a point',
    body: 'Inspect is already on. Click the model and the Inspector shows the elevation, lease status and any finding under that point.',
  },
  {
    title: 'Measure between two points',
    body: 'Choose Measure, then click point A and point B. The Inspector gives the distance, the average grade and the profile between them.',
  },
  {
    title: 'Open the evidence',
    body: 'Select a finding pin on the model, or a row under Details → Findings, to see why the engine flagged it and where it is.',
  },
] as const

/**
 * The first-visit tour: three small, non-modal steps over the map. It never takes the screen or
 * moves the tools; its card lets map clicks through and only its buttons take pointer events.
 * Shown once per browser (About the data can replay it), dismissed by Escape, and focus returns
 * to where it came from.
 */
export function Tour() {
  const open = useAppStore((s) => s.tourOpen)
  const ready = useTerrain((s) => s.status === 'ready')
  const [step, setStep] = useState(0)
  const card = useRef<HTMLElement>(null)
  const cameFrom = useRef<HTMLElement | null>(null)

  // One automatic showing per browser, once the surveys are there to look at.
  useEffect(() => {
    if (!ready) return
    if (!useAppStore.getState().tourOpen && !tourSeen()) useAppStore.getState().startTour()
  }, [ready])

  useEffect(() => {
    if (!open) return
    cameFrom.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    card.current?.focus()
  }, [open])

  const close = useCallback(() => {
    markTourSeen()
    const focusInside = card.current?.contains(document.activeElement) ?? false
    useAppStore.getState().endTour()
    if (!focusInside) return
    if (cameFrom.current?.isConnected) cameFrom.current.focus()
    else document.getElementById('content')?.focus()
  }, [])

  // Escape dismisses the tour before the map's own Escape (clear picks) can act on it.
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      close()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, close])

  if (!open) return null
  const current = STEPS[step]!
  const last = step === STEPS.length - 1

  return (
    <section
      ref={card}
      role="dialog"
      aria-modal="false"
      aria-labelledby="tour-title"
      aria-describedby="tour-body"
      tabIndex={-1}
      className="pointer-events-none absolute bottom-40 left-1/2 z-20 w-[min(340px,calc(100%-32px))] -translate-x-1/2 rounded-[8px] border border-line bg-panel p-4 shadow-[0_10px_30px_color-mix(in_srgb,var(--color-ink)_14%,transparent)]"
    >
      <p className="panel-title">
        First-visit tour · step {step + 1} of {STEPS.length}
      </p>
      <h2 id="tour-title" className="cond mt-1 text-[16px] font-bold text-ink">
        {current.title}
      </h2>
      <p id="tour-body" className="mt-1 text-[13px] leading-5 text-ink-dim">
        {current.body}
      </p>
      <div className="pointer-events-auto mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className="btn" onClick={close}>
          Skip tour
        </button>
        {step > 0 && (
          <button type="button" className="btn" onClick={() => setStep(step - 1)}>
            Back
          </button>
        )}
        <button
          type="button"
          className="btn-primary ml-auto"
          onClick={() => (last ? close() : setStep(step + 1))}
        >
          {last ? 'Done' : 'Next'}
        </button>
      </div>
    </section>
  )
}
