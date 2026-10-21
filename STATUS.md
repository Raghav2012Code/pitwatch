# PitWatch 3D: UI redesign status

Updated 2026-10-21. This records the state of the `ui-redesign` branch and its review. See `README.md` for product features and `AGENTS.md` for the project update log and working rules.

## Current state

- Branch: `ui-redesign`, based on `main` at `72e34ba`. The redesign is not on `main` or the live site yet.
- The landing page, dashboard shell, site plan, responsive map controls, branding, and competition improvement plan are committed on this branch.
- The site-plan and map-layout batch is verified. The detailed plan for the next competition improvements is in [`docs/competition-ui-ux-improvement-plan.md`](docs/competition-ui-ux-improvement-plan.md); it remains a proposal and does not authorize implementation.
- Pull request: to be opened after this verification update is pushed.
- Local preview: `npx vite --port 5179 --strictPort`, then open http://localhost:5179.

## Delivered on `ui-redesign`

1. The landing page and dashboard redesign (`b2525ca`, `2342bf9`, `9e64591`) provide the routes `#/`, `#/overview`, `#/monitor`, `#/findings`, `#/rules`, `#/uncertainty`, and `#/about`. Findings can be opened on the map from the landing page, Overview, and Findings page. The shell keeps the synthetic-data badge visible.
2. The logo, favicon, touch icon, and link-preview image match the limestone-and-slate survey identity.
3. The Overview has a schematic site plan derived from the same survey and compliance data as the map. Its five finding pins work with pointer, touch, Enter, and Space, and open the matching finding on the map.
4. On the map, vertical exaggeration stays above the key, and the key starts folded on short screens while remaining user-controlled. The landing hero uses available width on ultra-wide displays, and coarse-pointer controls receive 44 px targets.
5. The competition improvement sequence and acceptance criteria are recorded in `docs/competition-ui-ux-improvement-plan.md`.

## Verification completed

| Check              | Result | Evidence                                                                                                                                                                |
| ------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run verify`   | Pass   | Typecheck, ESLint, Prettier, and all 130 unit tests across 17 files. Vitest is capped at two workers so synthetic terrain setup does not time out under CPU contention. |
| `npm run test:e2e` | Pass   | All 49 Playwright checks passed against the production build, including the four site-plan/map-layout regression checks.                                                |
| Browser review     | Pass   | Overview at 1440, 1100, 800, and 390 px; map at 1366×768; landing page at 2560×1440; phone drawer with touch input. No horizontal overflow or browser errors observed.  |
| `git diff --check` | Pass   | No whitespace errors in the reviewed changes.                                                                                                                           |

The browser review also confirmed five labelled finding pins, site-plan navigation, keyboard selection, the short-screen exaggeration control, manual key folding, and phone touch targets. The touch-height rule applies to the specified coarse-pointer controls; site-plan SVG pin dimensions remain governed by their SVG hit area.

## Remaining work

1. Push the completed verification update and open the `ui-redesign` → `main` pull request for review.
2. The 3D map remains tight around 1100 px when both side panels are open, and the layers panel covers a substantial part of the model at 800 px. These are recorded as follow-up items in the competition plan.
3. The first-visit map hint, visible tooltips for the icon rail, and desktop dragging of the landing model remain unstarted ideas. They are not required for this branch's current verification.
4. The redesign is not merged or deployed to the live site. Do not describe it as live until a merge and deployment are confirmed.

## Context

- PR #1 from the fork was merged into `main` as `31f28f6`; the main branch's follow-up commit is `72e34ba`.
- The competition plan is a proposal. Implement its features one at a time under the repository's feature workflow, and update this status as delivery changes.
