# PitWatch 3D: status

Updated 2026-10-27. See `README.md` for features and `AGENTS.md` for the working rules and the full update log.

## Current state

- Everything on the improvement list is built, merged to `main` and closed, in the parent (`#3` to `#45`) and in this fork. The fork's last four working copies — the bigger site, the home page umbrella, the full bug check and the tracker — were closed on 2026-10-27 against the parent's work, which this fork merged the same day.
- The app is a landing page (`#/`) and a dashboard (`#/overview`, `#/monitor`, `#/findings`, `#/rules`, `#/uncertainty`, `#/about`), plus Terms, License and Contact pages.
- The simulated mine has two pits, two waste dumps, a settling pond, a road network and permit zones that follow the workings. The five planted findings are R1-1 (critical), R2-1 (high), R1-2 (medium), R3-1 (medium) and R1-3 (low).
- The two surveys (513 × 513 cells at 4 m) build in parallel in two Web Workers, about 6.5 s to the first result in headless Chromium.
- Findings can be copied as a link, downloaded as CSV (every row marked simulated) or as a PDF with a plan of the lease (every page marked simulated), and printed as a report. A link such as `#/monitor?finding=R2-1` opens the map on that finding.

## Checks

`npm run verify` (170 unit tests in 21 files) and `npm run test:e2e -- --workers=2` (74 checks) pass on `main`. All ten routes were swept on 2026-10-27 at 1440, 1100, 800 and 390 px: no horizontal overflow and no console errors at any of the forty combinations.

## Known limits

- Frame rate on a real GPU has not been measured; the A/B in `AGENTS.md` used software rendering.
- No licence has been chosen, so the License page says all rights are reserved. The Terms text is a draft without legal review.
- Data is entirely synthetic. A real GeoTIFF provider needs sample data to design against.
