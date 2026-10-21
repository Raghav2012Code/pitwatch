# PitWatch 3D: UI redesign status

Updated 2026-10-21 after PR #2 merged. See `README.md` for product features and `AGENTS.md` for the project update log and working rules.

## Current state

- The `ui-redesign` branch was merged into `main` through [PR #2](https://github.com/abivan100-stack/pitwatch-3d/pull/2) at merge commit `38613ad` (2026-10-21).
- The landing page, dashboard shell, site plan, responsive map controls, branding, competition improvement plan, and first P0 are on `main`.
- The merged changes passed CI and the Vercel preview checks before merge. Post-merge CI is running; production deployment is not yet confirmed. Later plan features remain proposed.
- Local preview: `npx vite --port 5179 --strictPort`, then open http://localhost:5179.

## Delivered in the redesign

1. The landing page and dashboard redesign (`b2525ca`, `2342bf9`, `9e64591`) provide the routes `#/`, `#/overview`, `#/monitor`, `#/findings`, `#/rules`, `#/uncertainty`, and `#/about`. Findings can be opened on the map from the landing page, Overview, and Findings page. The shell keeps the synthetic-data badge visible.
2. The logo, favicon, touch icon, and link-preview image match the limestone-and-slate survey identity.
3. The Overview has a schematic site plan derived from the same survey and compliance data as the map. Its five finding pins work with pointer, touch, Enter, and Space, and open the matching finding on the map.
4. On the map, vertical exaggeration stays above the key, and the key starts folded on short screens while remaining user-controlled. The landing hero uses available width on ultra-wide displays, and coarse-pointer controls receive 44 px targets.
5. The competition improvement sequence and acceptance criteria are recorded in `docs/competition-ui-ux-improvement-plan.md`.

6. **Finding selection reveals its evidence** (first P0, complete): selecting a finding from the Findings page, Overview or map restores the current terrain and finding overlay, frames and highlights the chosen result, and keeps selection synchronized. On phones, the details drawer closes after the selection and reopens with that finding retained.

## Verification completed

| Check              | Result | Evidence                                                                                                                                                                        |
| ------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run verify`   | Pass   | Typecheck, ESLint, Prettier, and all 131 unit tests across 17 files. Vitest is capped at two workers so synthetic terrain setup does not time out under CPU contention.         |
| `npm run test:e2e` | Pass   | All 51 Playwright checks passed against the production build, including baseline selection, layer restoration, camera framing, cross-page selection, and phone drawer coverage. |
| Browser review     | Pass   | Selected map and Overview views at 1440, 1100, 800, and 390 px; map at 1366×768; landing at 2560×1440; phone drawer with touch. No horizontal overflow or browser errors.       |
| `git diff --check` | Pass   | No whitespace errors in the reviewed changes.                                                                                                                                   |

The browser review also confirmed five labelled finding pins, site-plan navigation, keyboard selection, the short-screen exaggeration control, manual key folding, and phone touch targets. The touch-height rule applies to the specified coarse-pointer controls; site-plan SVG pin dimensions remain governed by their SVG hit area.

## Remaining work

1. Confirm the post-merge CI and production deployment before describing the redesign as live.
2. The 3D map remains tight around 1100 px when both side panels are open, and the layers panel covers a substantial part of the model at 800 px. These are recorded as follow-up items in the competition plan.
3. The first-visit map hint, visible tooltips for the icon rail, and desktop dragging of the landing model remain unstarted ideas. They are not required for the merged work's verification.

## Context

- PR #1 from the fork was merged into `main` as `31f28f6`; PR #2 merged the redesign at `38613ad`.
- Only the first P0 from the competition plan has been implemented. Later features remain proposals and should be taken one at a time under the repository's feature workflow.
