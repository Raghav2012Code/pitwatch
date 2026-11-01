# PitWatch 3D: status

Updated 2026-11-01. See `README.md` for features and `AGENTS.md` for the working rules and the full update log.

## Current state

- Everything on the improvement list is built, merged to `main` and closed, in the parent (`#3` to `#45`) and in this fork. No ticket remains open in either tracker: the last five in this fork (#33–#37) shipped on 2026-11-01, and the palette lint guard (#32) closed on 2026-10-29.
- The app is a landing page (`#/`) and a dashboard (`#/overview`, `#/monitor`, `#/findings`, `#/rules`, `#/uncertainty`, `#/about`), plus Terms, License and Contact pages.
- The simulated mine has two pits, two waste dumps, a settling pond, a road network and permit zones that follow the workings. The five planted findings are R1-1 (critical), R2-1 (high), R1-2 (medium), R3-1 (medium) and R1-3 (low).
- The two surveys (513 × 513 cells at 4 m) build in parallel in two Web Workers, about 6.5 s to the first result in headless Chromium.
- Findings can be copied as a link, downloaded as CSV (every row marked simulated) or as a PDF with a plan of the lease and the real symbols (every page marked simulated), and printed as a report. A long finding continues across pages. A link such as `#/monitor?finding=R2-1` opens the map on that finding.
- The 3D map opens a three-step first-visit tour once per browser; About the data can replay it.
- Point readings model both survey uncertainties: vertical for elevations and change, horizontal for position and the lease side, which reads as unconfirmed where the error band crosses the lease boundary. Measurements quote the uncertainty each figure carries.

## Checks

`npm run verify` (191 unit tests in 25 files) and `npm run test:e2e` (81 checks) pass on `main`. The width sweep of 2026-10-29 covered all ten routes at 1440, 1100, 800 and 390 px with no horizontal overflow, no console or page errors and no critical or serious axe violation; the new tour was scanned by axe at 1440 and 390 px on 2026-11-01.

## Next

No open tickets in this fork or the parent. Candidate follow-ups are the known limits below rather than filed work.

## Known limits

- Frame rate on a real GPU has not been measured; the A/B in `AGENTS.md` used software rendering.
- No licence has been chosen, so the License page says all rights are reserved. The Terms text is a draft without legal review.
- Data is entirely synthetic. A real GeoTIFF provider needs sample data to design against.
- Horizontal survey error is modelled as a symmetric 1σ band in plan. It is not used to shift the derived cell grid or the engine's findings, which keep their geometric reading.
- The report draws Latin, Greek sigma/delta and punctuation; a name in another script prints `?`.
