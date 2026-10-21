# PitWatch 3D: UI redesign status

Written 2026-10-21. This file records what has been done on the `ui-redesign` branch, what is half done, and what is left. It describes the state of the work, not the app's features; for those see `README.md` and the Update log in `AGENTS.md`.

## Where things stand

- Branch: `ui-redesign`, created from `main` at `72e34ba`. `main` is untouched, so the live site (pitwatch-3d.vercel.app) still shows the old design.
- Latest commits: `9e64591` (landing rework), then the site plan and layout batch described below, committed together with this file.
- Pull request: none yet. GitHub offers one at `pull/new/ui-redesign`.
- Committed but not yet verified: the batch listed under "In progress" below.
- Local dev server: `npx vite --port 5179 --strictPort`, then open http://localhost:5179.

## Done and pushed

1. **PR #1 from the fork merged into `main`** (`31f28f6`), then review follow-ups on `main` (`72e34ba`): read-only CI token, actions pinned to commit SHAs, parent-repo wording and fork issue references in `AGENTS.md`, and the four missing triage labels created on this repo.
2. **Dashboard redesign** (`b2525ca`). The scroll story is replaced by a landing page and a dashboard shell.
   - Routes: `#/` landing, `#/overview`, `#/monitor` (3D map), `#/findings`, `#/rules`, `#/uncertainty`, `#/about`. Any other hash is rewritten to `#/`.
   - Slate sidebar with a drill-core strip down its edge: full width on most pages, a slim icon rail on the 3D map by default, a drawer on phones (Escape closes it and returns focus).
   - Header with page title, overall status and the SIMULATED DATA badge on every screen.
   - The old Overview tab and About tab became pages. The permit sheet became Permit rules, with the live result per rule. The noise calculator and resolution panels became the Uncertainty page. The map's details panel keeps its Findings and Inspector tabs.
   - "Show on map" works from the Findings page, the Overview and the Inspector, and the map forgets old camera requests when it closes (`leaveMap`).
   - New PitWatch logo, favicon and touch icon from Codex are included in this commit.
3. **Link-preview image and hero fix** (`2342bf9`): `public/og.png` regenerated from the new landing page; the three hero facts sit on one row on desktop.
4. **Landing page made one piece** (`9e64591`):
   - Every section opens the same way (heading left, one paragraph right).
   - "From two surveys to a verdict" is a numbered sequence; each step's **Show on the model** button scrolls to the hero and switches the model.
   - The rule columns show the live engine result per rule.
   - A slate closing band matches the sidebar and holds the buttons and the "everything is simulated" note.
   - In-page "How it works" and "What it checks" buttons in the top bar.
5. **Documentation**: `README.md` (routes and features) and an `AGENTS.md` Update log entry for the redesign and for the landing rework.

## In progress: committed but not yet verified

This batch was committed at the user's request without a browser check. It compiles (`tsc -b` and Prettier pass) but has not been looked at in a browser, has not been linted, and has no tests.

- `src/ui/panels/SitePlan.tsx` (new) and `src/ui/pages/OverviewPage.tsx`: a "Site plan" on the Overview. It is drawn as SVG from the same data and engine output as the 3D map (lease boundary, permitted zones, cells that changed beyond the noise threshold, a clickable pin per finding with a leader line when two pins would overlap, scale bar, north arrow). Pins open the finding on the 3D map and can be reached by keyboard.
- `src/ui/LayerPanel.tsx`: on the map's layers card, the vertical exaggeration slider now sits directly under the switches, and the Key folds into a `<details>` that starts closed on screens shorter than 880 px. This fixes the card being cut off on 1280×720 and 1366×768 laptops, where the slider was hidden.
- `src/index.css`: styles for the site plan and the key fold; an ultra-wide rule (from 112 rem) so the landing hero grows on 2560×1440 monitors instead of floating in empty space; larger touch targets (44 px) for coarse pointers (phones and tablets).

Before opening a pull request: look at the Overview at 1440 and 390 px, the map at 1366×768, and the landing page at 2560×1440; then run the e2e suite (see below), because the layers-card change could affect `mobile-layers.spec.ts`.

## Verification record

| Check                                                                         | Last result                                   | Covers                             |
| ----------------------------------------------------------------------------- | --------------------------------------------- | ---------------------------------- |
| Typecheck, Prettier                                                           | pass                                          | including the uncommitted batch    |
| ESLint                                                                        | pass at `2342bf9`; not run since (by request) | not the uncommitted batch          |
| Unit tests (`npx vitest run --maxWorkers=2`)                                  | 130 pass                                      | `9e64591`                          |
| Full e2e, 44 tests                                                            | pass                                          | state at `2342bf9`                 |
| E2e after the landing rework, 23 tests (`home`, `a11y`, `badge`, `dashboard`) | pass                                          | `9e64591`                          |
| Visual review at 1440, 1100, 800, 390 px                                      | done for every screen                         | state before the uncommitted batch |

Not rerun since the landing rework: the other e2e specs (`canvas`, `hud`, `keyboard`, `mobile-layers`, `monitor`, `retry`, `routing`). Run them all before opening a pull request.

Note: `inspect.test.ts` can time out in its setup when the machine is busy (terrain generation under load). It passes when run with `--maxWorkers=2`.

## Left to do

1. Verify the batch above in a browser and fix anything found.
2. Run the full e2e suite and lint once more, then open a pull request from `ui-redesign` into `main`. Decide how to reconcile it with the `AGENTS.md` rule that says to push to `origin/main` after each feature, since this work lives on a branch.
3. Known layout limits:
   - The 3D map is tight at about 1100 px wide with both side panels open (use `[` and `]` to hide one).
   - At 800 px the layers card covers about a third of the model.
4. Ideas not started, in rough order of impact:
   - A short first-visit hint on the 3D map.
   - A visible tooltip for the sidebar's icon rail (it only has native `title` tooltips).
   - Letting the landing model be dragged on desktop (it is non-interactive so page scroll is never captured).
5. A separate, untracked file `docs/competition-ui-ux-improvement-plan.md` exists. It was not written by this work and is not committed. It proposes a different feature sequence (for example, making "Show on map" always reveal the selected finding when starting from the Baseline view). Review it before choosing what to do next.

## Things to know

- Codex's logo files were committed together with the redesign in `b2525ca`.
- A single `AGENTS.md` edit changes the instructions every agent reads here, because `CLAUDE.md` only imports it.
- Every value in the app is synthetic and labelled so; keep the SIMULATED DATA badge and the provenance tags when changing any screen.
