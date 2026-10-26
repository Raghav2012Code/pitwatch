# PitWatch 3D: status

Updated 2026-10-26. See `README.md` for features and `AGENTS.md` for the working rules and the full update log.

## Current state

- Everything on the improvement list (issues #3 to #45) is built, merged to `main` and closed. No issues are open.
- The app is a landing page (`#/`) and a dashboard (`#/overview`, `#/monitor`, `#/findings`, `#/rules`, `#/uncertainty`, `#/about`), plus Terms, License and Contact pages.
- The simulated mine has two pits, two waste dumps, a settling pond, a road network and permit zones that follow the workings. The five planted findings are R1-1 (critical), R2-1 (high), R1-2 (medium), R3-1 (medium) and R1-3 (low).
- The two surveys (513 × 513 cells at 4 m) build in parallel in two Web Workers, about 6.5 s to the first result in headless Chromium.
- Findings can be copied as a link, downloaded as CSV (every row marked simulated) and printed as a report. A link such as `#/monitor?finding=R2-1` opens the map on that finding.

## Checks

`npm run verify` and `npm run test:e2e` pass on `main` (see the latest log entry in `AGENTS.md` for counts). Browser review covers 1440, 1100, 800 and 390 px.

## Known limits

- Frame rate on a real GPU has not been measured; the A/B in `AGENTS.md` used software rendering.
- No licence has been chosen, so the License page says all rights are reserved. The Terms text is a draft without legal review.
- Data is entirely synthetic. A real GeoTIFF provider needs sample data to design against.
