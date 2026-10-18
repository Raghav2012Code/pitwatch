export function Viewport() {
  return (
    <main aria-label="3D mine view" className="viewport relative min-w-0 flex-1">
      <div className="absolute inset-0 grid place-items-center p-8">
        <div className="max-w-sm text-center">
          {/* Schematic only: a generic bench profile, not this mine's terrain. */}
          <svg
            viewBox="0 0 320 110"
            className="mx-auto mb-6 w-72 text-line-strong"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
            aria-hidden="true"
          >
            <path d="M0 22h46l14 14h30l14 14h30l14 14h24l14-14h30l14-14h30l14-14h46" />
            <path d="M118 78h84" className="text-accent" strokeDasharray="4 4" />
            <text x="208" y="81" className="fill-ink-faint" stroke="none" fontSize="9">
              approved floor
            </text>
          </svg>
          <h2 className="text-[15px] font-medium text-ink">3D terrain not built yet</h2>
          <p className="mt-1.5 text-[13px] leading-5 text-ink-dim">
            The terrain mesh, lease boundary and findings will render here once the synthetic
            surveys are generated.
          </p>
        </div>
      </div>
    </main>
  )
}
