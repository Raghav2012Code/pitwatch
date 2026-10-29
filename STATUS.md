# PitWatch 3D: status

Updated 2026-10-29. See `README.md` for features and `AGENTS.md` for the working rules and the full update log.

## Current state

- Everything on the improvement list is built, merged to `main` and closed, in the parent (`#3` to `#45`) and in this fork. Six follow-up tickets are open in this fork and none in the parent: #32–#37, all `ready-for-agent`, covering the palette lint guard, the PDF report's real symbols and page splitting, the map card at 800 px, a first-visit tour, and horizontal survey error on a point reading (see the `## Next` list below).
- The app is a landing page (`#/`) and a dashboard (`#/overview`, `#/monitor`, `#/findings`, `#/rules`, `#/uncertainty`, `#/about`), plus Terms, License and Contact pages.
- The simulated mine has two pits, two waste dumps, a settling pond, a road network and permit zones that follow the workings. The five planted findings are R1-1 (critical), R2-1 (high), R1-2 (medium), R3-1 (medium) and R1-3 (low).
- The two surveys (513 × 513 cells at 4 m) build in parallel in two Web Workers, about 6.5 s to the first result in headless Chromium.
- Findings can be copied as a link, downloaded as CSV (every row marked simulated) or as a PDF with a plan of the lease (every page marked simulated), and printed as a report. A link such as `#/monitor?finding=R2-1` opens the map on that finding.

## Checks

`npm run verify` (174 unit tests in 22 files) and `npm run test:e2e` (75 checks) pass on `main`. All ten routes were swept at 1440, 1100, 800 and 390 px on 2026-10-29: no horizontal overflow, no console or page errors, and no critical or serious axe violation at 1440 or 390 px, in all forty combinations.

## Next

The six open tickets, in the order their blockers allow:

- #32 Lint guard: colours live in the palette — no blockers.
- #33 PDF report: draw the real symbols, not spelled-out ones — no blockers.
- #34 PDF report: a long finding continues onto the next page — blocked by #33.
- #35 Map: the card stops covering the model at 800 px — no blockers.
- #36 First-visit tour for the dashboard — no blockers.
- #37 Point reading: model the horizontal survey error — no blockers.

## Known limits

- Frame rate on a real GPU has not been measured; the A/B in `AGENTS.md` used software rendering.
- No licence has been chosen, so the License page says all rights are reserved. The Terms text is a draft without legal review.
- Data is entirely synthetic. A real GeoTIFF provider needs sample data to design against.
