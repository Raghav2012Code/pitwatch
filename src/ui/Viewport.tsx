/** Concentric bench rims for the isometric pit schematic: [radius x, depth offset]. */
const BENCHES = Array.from({ length: 7 }, (_, i) => ({ rx: 250 - i * 32, dy: i * 17 }))
const SQUASH = 0.42

export function Viewport() {
  return (
    <main aria-label="3D mine view" className="viewport absolute inset-0">
      {/* Stage = the area left visible between the floating panels. */}
      <div className="stage absolute grid place-items-center">
        <div className="hud-brackets pointer-events-none absolute inset-0" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>

        {/* Static north indicator; becomes the live compass in M3. */}
        <div className="compass absolute top-4 right-4 hidden md:grid" aria-hidden="true">
          <span>N</span>
        </div>

        <figure className="flex flex-col items-center text-center">
          {/* Schematic only: a generic stepped pit, not this mine's terrain. */}
          <svg
            viewBox="-280 -60 560 260"
            className="pit-schematic w-[min(560px,80vw)]"
            aria-hidden="true"
          >
            <defs>
              <radialGradient
                id="pit-glow"
                cx="0"
                cy="0"
                r="1"
                gradientUnits="userSpaceOnUse"
                gradientTransform="translate(0 102) scale(160 70)"
              >
                <stop offset="0" stopColor="var(--color-accent)" stopOpacity="0.22" />
                <stop offset="1" stopColor="var(--color-accent)" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="var(--color-accent)" stopOpacity="0" />
                <stop offset="1" stopColor="var(--color-accent)" stopOpacity="0.35" />
              </linearGradient>
            </defs>

            <ellipse cx="0" cy="102" rx="160" ry="70" fill="url(#pit-glow)" />

            {/* Radar sweep across the rim plane. */}
            <g transform={`scale(1 ${SQUASH})`}>
              <circle r="270" fill="none" stroke="var(--color-line)" strokeDasharray="2 6" />
              <g className="sweep">
                <path d="M0 0 L250 0 A250 250 0 0 0 216.5 -125 Z" fill="url(#sweep)" />
              </g>
            </g>

            {BENCHES.map((b, i) => (
              <ellipse
                key={b.rx}
                cx="0"
                cy={b.dy}
                rx={b.rx}
                ry={b.rx * SQUASH}
                fill={
                  i === BENCHES.length - 1
                    ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)'
                    : 'none'
                }
                stroke="var(--color-accent)"
                strokeOpacity={0.85 - i * 0.09}
                strokeWidth={i === 0 ? 1.4 : 1}
              />
            ))}

            {/* Approved floor reference, dashed. */}
            <ellipse
              cx="0"
              cy={BENCHES.length * 17 + 8}
              rx="70"
              ry={70 * SQUASH}
              fill="none"
              stroke="var(--color-warn)"
              strokeOpacity="0.7"
              strokeDasharray="4 4"
            />
            <line
              x1="0"
              y1="-36"
              x2="0"
              y2="170"
              stroke="var(--color-line-strong)"
              strokeDasharray="1 5"
            />
          </svg>

          <figcaption className="mt-2 max-w-sm">
            <div className="hud-label">Schematic, not survey data</div>
            <h2 className="mt-2 text-[17px] font-semibold tracking-tight text-ink">
              Awaiting terrain model
            </h2>
            <p className="mt-1 text-[13px] leading-5 text-ink-dim">
              The 3D survey surface, lease boundary and findings will render here.
            </p>
          </figcaption>
        </figure>
      </div>
    </main>
  )
}
