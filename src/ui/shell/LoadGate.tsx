import type { ReactNode } from 'react'
import { useTerrain } from '../../state/terrain'

/**
 * Pages that read the rule engine's output wait here until both surveys are built. A failed
 * build is reported in place with a way to try again, never as a spinner that never ends.
 */
export function LoadGate({ children }: { children: ReactNode }) {
  const status = useTerrain((s) => s.status)
  const error = useTerrain((s) => s.error)
  const retry = useTerrain((s) => s.retry)

  if (status === 'ready') return <>{children}</>

  if (status === 'error') {
    return (
      <div role="alert" className="load-card">
        <p className="cond text-[20px] font-bold text-violation">Surveys unavailable</p>
        <p className="mt-1 text-[14px] leading-6 text-ink-dim">
          The simulated surveys could not be built: {error}
        </p>
        <button type="button" className="btn mt-3" onClick={() => void retry()}>
          Try again
        </button>
      </div>
    )
  }

  return (
    <div role="status" className="load-card">
      <p className="cond text-[20px] font-bold text-ink">Building the simulated surveys…</p>
      <p className="mt-1 text-[13.5px] text-ink-dim">
        Two surveys of 513 × 513 cells, generated in your browser. This takes a few seconds.
      </p>
      <div className="loading-strata mt-3" aria-hidden="true" />
    </div>
  )
}
