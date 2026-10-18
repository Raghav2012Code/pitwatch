/** The three permit conditions written as a lease document, with the test PitWatch applies to each. */

const CONDITIONS = [
  {
    rule: 'R1',
    title: 'Lease boundary',
    text: 'No ground may be excavated outside the lease boundary, or inside the safety buffer that runs along its inner edge.',
    test: 'removed depth > 2σ  and  cell outside (lease − buffer)',
  },
  {
    rule: 'R2',
    title: 'Pit depth',
    text: 'The pit floor may not be taken below the approved floor level shown on the mine plan.',
    test: 'approved floor − current surface > 2σ',
  },
  {
    rule: 'R3',
    title: 'Waste dumping',
    text: 'Waste rock may only be placed inside the dump zones approved in the mine plan.',
    test: 'added height > 2σ  and  cell outside every dump zone',
  },
]

export function PermitSheet() {
  return (
    <section className="permit-band">
      <div className="mx-auto max-w-[1200px] px-6 py-20 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="reveal">
            <h2 className="cond text-[clamp(38px,4.4vw,58px)] leading-[0.95] font-bold text-ink">
              The permit, read the way a computer has to read it.
            </h2>
            <p className="mt-5 max-w-[26rem] text-[16px] leading-7 text-ink-dim">
              A lease is written in sentences. PitWatch turns each condition into a test that every
              8 m grid cell either passes or fails, and only fails it when the change is bigger than
              the survey can be trusted to measure.
            </p>
          </div>

          <article className="permit reveal" aria-label="Lease conditions">
            <header className="flex items-baseline justify-between gap-4 border-b border-line-strong pb-4">
              <div>
                <div className="cond text-[22px] font-bold text-ink">Schedule of conditions</div>
                <div className="text-[13px] text-ink-faint">Venthar Ridge mining lease</div>
              </div>
              <span className="permit-stamp">Illustrative</span>
            </header>

            <ol>
              {CONDITIONS.map((c, i) => (
                <li key={c.rule} className="permit-clause">
                  <span className="cond text-[28px] leading-none font-bold text-oxide">
                    {i + 1}.
                  </span>
                  <div>
                    <h3 className="cond text-[20px] font-semibold text-ink">{c.title}</h3>
                    <p className="mt-1 text-[15px] leading-6 text-ink-dim">{c.text}</p>
                    <div className="permit-test">
                      <span className="text-ink-faint">Checked by {c.rule} when</span>
                      <code>{c.test}</code>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </article>
        </div>
      </div>
    </section>
  )
}
