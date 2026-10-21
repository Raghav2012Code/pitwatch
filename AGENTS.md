# PitWatch 3D: agent notes

3D mine monitoring and regulatory compliance demo. Frontend only, no backend. Every value is synthetic and labelled so.

This is the main repo, `abivan100-stack/pitwatch-3d`; work is committed and pushed to `origin/main`. The fork `Raghav2012Code/pitwatch` did the work merged in PR #1 (2026-10-21); in a clone of the fork the parent is the `upstream` remote. Log entries from that work cite the fork's own issues as `Raghav2012Code/pitwatch#N`, since a bare `#N` here would point at this repo's tracker.

## Working rules

- After every feature: run the checks below, add an entry to **Update log**, commit (Conventional Commits, no Co-Authored-By or other AI attribution), push to `origin/main`, then ask the user before starting the next feature.
- Keep the session task list current while a run is in flight: mark a ticket in progress when you start it, and completed the moment its checks pass and it is pushed. Not once per batch, and not at the end — a list still showing pending work that has already shipped is worse than no list, because it makes the visible progress wrong.
- UI must stay honest: SIMULATED DATA badge, provenance tag on values (measured | derived | simulated | unverified), ± uncertainty, no hardcoded alerts, no dead buttons. Unbuilt controls are disabled with a tooltip naming the milestone that enables them.
- `src/domain`, `src/data`, `src/geo`, `src/compliance` are pure TypeScript. ESLint blocks react, three, @react-three/* and zustand imports there.

## Checks

```sh
npm run verify && npm run test:e2e
```

`verify` is typecheck, lint, format check and unit tests; `test:e2e` builds and serves the production bundle for Playwright. Then a browser check at 1440, 1100 and 800 px wide (dev server: `npx vite --port 5179 --strictPort`).

## Stack

Vite 8, React 19, TypeScript strict, Tailwind v4 (tokens in `@theme` in `src/index.css`), Zustand, Vitest, three 0.186 + @react-three/fiber 9 + drei 10 (scene is lazy-loaded).

## Design

- Monitor layout: full-screen 3D canvas on a survey-paper backdrop (`--color-backdrop`, faint `<Relief />` contours, soft vignette; fog uses the same colour); a `ViewOffset` shifts the projection so the model centres in `.stage` (the area the side cards leave free, click-through except its controls). Left "Map" card (layers, key, exaggeration), right details card (tabs), camera presets + compass top-right, scale bar top-left from `xl` up and just above the timeline below that (a stage under ~437 px cannot hold the chip and the camera group in one row), timeline pill bottom-centre. Soft `.card` surfaces (8 px radius, shadow); strata stripes only in the top-bar rule and the home page.
- Each fact appears once: mine name in the top bar, survey dates in the timeline and the Surveys section, nothing duplicated in map overlays.
- Home page is a scroll story beside the live 3D model of the simulated surveys (`#/`), monitor at `#/monitor`. Topographic look: limestone paper, slate ink, map-water blue (`accent`) for interaction, haematite `oxide` and `ochre` for identity only (never status).
- Type: Archivo variable; `.cond` (font-stretch 72%) for headings and big figures. JetBrains Mono for coordinates and dates.
- All colours are tokens in `@theme`; components use `var(--color-*)` or `color-mix(...)`. Never hardcode a colour in a component.
- Severity colour always pairs with a glyph shape: warning = triangle, violation = octagon, critical = diamond.

## Milestones

|     | Milestone                                                                               | Status |
| --- | --------------------------------------------------------------------------------------- | ------ |
| M1  | App shell, tooling, UI                                                                  | done   |
| M2  | Domain types, geo utils, seeded synthetic terrain + tests                               | done   |
| M3  | 3D terrain view                                                                         | done   |
| M4  | Compliance engine R1 boundary, R2 depth, R3 dumping (k=2, σ=√(σ1²+σ2²)) + snapshot test | done   |
| M5  | Overlays: lease, buffer, zones, change, findings                                        | done   |
| M6  | Panels, picking, measure, profile, epoch slider, fly-to                                 | done   |
| M7  | Polish: accessibility, performance, share metadata                                      | done   |
| M8  | README with Mermaid diagram, Vercel/Netlify config (deploy live since 2026-10-18)       | done   |

## Update log

Newest first.

### 2026-10-21: PR #1 merged, review follow-ups

- Merged PR #1 from the fork (merge commit `31f28f6`): the fork's `CoordinateEntry` replaces this repo's `GoTo` form from `e62f9b9` (it also applies off-grid points, prefills, has a live region and browser checks).
- CI: `permissions: contents: read` so the workflow token is read-only on pushes too, and each action pinned to a commit SHA with its version in a comment (checkout v7.0.1, setup-node v7.1.0, upload-artifact v7.0.2).
- Created the four missing triage labels on this repo (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`; `wontfix` already existed), so `docs/agents/triage-labels.md` matches the tracker.
- The note at the top of this file now describes this repo as the main one, and the fork-era log entries cite the fork's issues as `Raghav2012Code/pitwatch#N` (a bare `#1` here is PR #1).
- `CLAUDE.md` only imports `AGENTS.md`, so a change to `AGENTS.md` changes agent instructions: review PRs that touch it like code.

### 2026-10-21: merged the parent repo

- The parent `abivan100-stack/pitwatch-3d` had one commit since the fork point (6b84f2a): `e62f9b9 feat(monitor): go-to-position form as a keyboard route to point picking`. The `upstream` remote now exists, so `git fetch upstream` works.
- It is the **same feature as issue Raghav2012Code/pitwatch#15**, implemented twice: upstream added a `GoTo` form inside `InspectorPanel.tsx`, we shipped `CoordinateEntry` (a separate component, prefilled from the current pick, a live region, off-grid points applied and explained, four browser checks). Upstream's version had no prefill, rejected out-of-grid coordinates outright, and had no tests.
- Conflicts and how they were settled: `CLAUDE.md` (we renamed the file to `AGENTS.md` and left `CLAUDE.md` as an import pointer; upstream had appended a log entry to the old file) → kept our pointer, and upstream's entry is already covered by the issue Raghav2012Code/pitwatch#15 entry below. `src/ui/panels/InspectorPanel.tsx` → kept our `CoordinateEntry`, dropped upstream's `GoTo` and its now-unused imports.
- `README.md` auto-merged: upstream's line "Without a mouse, type an easting and northing in the Inspector tab instead." is true of our form too, so it was kept.
- The merge changed no behaviour: `git diff HEAD` after the merge is the README line only.

### 2026-10-21: a point can be inspected without a mouse (issue Raghav2012Code/pitwatch#15)

- Every figure in the Inspector was reachable from a panel, but **choosing** the point was not: the terrain only emitted a pick on a pointer click, so a keyboard user could not inspect an arbitrary location or set measurement A and B. The panel said "click the terrain" and offered no other route.
- `src/ui/panels/CoordinateEntry.tsx` is a small form at the top of the Inspector tab, rendered in both the nothing-selected and point-selected states. Two labelled number inputs (East, North; local metres, same origin as the Position row) and a **Read point** submit button, prefilled from the current pick (`picked` in Inspect; the latest of B then A in Measure) and empty with placeholder hints otherwise. Enter in either field submits, and the fields follow a later map pick or measure step without an effect.
- Submitting only calls the existing store action `pickPoint({ x, y })`. No store state was added and the Inspect/Measure cycling is not reimplemented: the tab opens, A then B are set, and distance, grade and profile follow exactly as after a click.
- Empty, non-finite or partially filled submissions are ignored (no pick, no throw) and leave the typed values alone. A coordinate outside the survey grid is still applied — the position and lease reading are real — and the form's own status line says it is outside the grid, quotes the 0–2,048 m bounds and states that elevations cannot be. The live region is `role="status" aria-live="polite"`; it also announces the point that was read. Labels are tied to the inputs with `useId`, the tab order is East → North → Read point, and nothing auto-focuses.
- Tests: `e2e/keyboard.spec.ts` adds four checks (keyboard-only coordinate entry asserts the Position row, the live-region sentence, East → North → submit tab order and that Enter submits; `m` switches to Measure and two typed coordinates produce the Horizontal and Average grade rows; an out-of-grid point leaves the panel populated with the position, shows `—` for elevation and says so in the status; a 390 px drawer check asserts the form is visible and does not overflow). 23 browser checks, 127 unit tests. Checked visually at 1440, 1100, 800 and 390 px.
- Review fix on top of the implementation: off-grid reading was previously unreachable, and the panel underneath the form still claimed "No significant change (threshold ±0.64 m)" when it had measured nothing. The reading now says "No reading here: the point is outside the survey grid." for a null change, and the off-grid browser check asserts the false sentence is gone rather than only that the form's own note is present.
- Deliberate gaps: the form renders only once the surveys are ready, since the grid bounds for the out-of-grid message are not known before then; there are no new unit tests because no new pure logic was introduced (validation and the grid test stay in the component); the position is still read from the current survey, as a click is, and horizontal position error remains unmodelled.

### 2026-10-21: every pit-zone floor is pinned to its zone (issue Raghav2012Code/pitwatch#14)

- Depth reporting was zone-aware in the R2 rule and the Inspector, but three surfaces still read `limits.pitZones[0]`: the Overview's "Approved floor" row showed the first zone's floor as the only one, the Map key emitted one "Pit zone" row for the first zone, and the monitor camera aimed at the first zone's centroid. The "which zone governs this ground" rule also existed twice, in `readPoint` and in the Inspector's profile memo.
- `src/compliance/zone.ts` (pure, lint-enforced) now owns it: `governingPitZone(zones, samples)` returns the zone whose floor the sampled ground is deepest below (samples outside every zone are ignored; the first zone wins a tie), `largestPitZone` picks the biggest polygon for camera framing, and `pitFloorRows` returns the display rows so the multi-zone shape is testable without React.
- `readPoint` passes one sample, the Inspector profile passes its whole series, Overview renders `pitFloorRows`, the Map key emits one row per zone (the zone id appears in the label only when there are two or more, so the shipped screen is unchanged), and the camera frames `largestPitZone`. With the shipped one-zone fixture every label and figure reads the same as before.
- A sample with no height (off the survey grid, or a gap in a profile) cannot be ranked by depth but still proves containment, so the helper falls back to the lowest-floor zone that contains it. That keeps the Inspector naming a floor for an off-grid point inside a pit zone — with the margin above it shown as unknown rather than the whole row disappearing.
- Tests: `src/compliance/zones.test.ts` gains twelve (deeper zone in both array orders for one sample and for a series; outside samples ignored; gaps skipped for ranking but still naming the zone, in both array orders; first zone on a tie; no answer for an unrankable sample outside every zone; largest by area in both orders, and empty; exact single-zone label/value; one labelled row per zone; the off-grid-but-inside-a-zone reading). 127 unit tests, 19 browser checks.
- Deliberate gap: with no pit zones at all the Overview now renders no approved-floor row (the old code threw on `pitZones[0]`). No Playwright spec can reach a two-zone site; the display shape is covered by the pure test instead.

### 2026-10-21: the inspector reads only what it shows

- `InspectorPanel` destructured the whole terrain store twice with no selector, so every write to it — including plain `status`/`error`/`provider` changes from the new retry path — re-rendered the panel and defeated its memoised point reading.
- Both reads now select the slices they use (`surveys`, `limits`, `findings`, `mine`). Figures are unchanged; the memoised `readPoint` stops being invalidated by unrelated writes.
- The audit's stated cause was camera movement, and that premise is wrong: camera state is a separate transient store read imperatively by the HUD, so orbiting re-renders no React component at all. The real over-subscription was this whole-store read; no test encodes the false premise.
- Enforced from now on by lint rather than a test: an ESLint `no-restricted-syntax` rule over `src/**/*.tsx` rejects a zero-argument `useTerrain()` call and names the fix. `npm run lint` (part of `verify`) covers every panel, not just this one.

### 2026-10-21: finding lookup at a point is indexed

- `readPoint` answered "which findings cover this cell" with `findings.filter(f => f.cells.includes(cell))`, a scan over every finding's cell list on every pick, so the cost grew with findings × cells while the visitor waited.
- `src/compliance/inspect.ts` now keeps a `WeakMap` from the findings array to a cell → ids map, built on first use. Findings are replaced wholesale when a load finishes, so the key is stable and the index is built once; lookups are a map get. Order still follows the findings array, so the inspector's links read the same.
- Tests: `inspect.test.ts` gains three (the index matches a linear scan for every finding cell; a shared cell lists both findings in findings order, using constructed findings since the seeded scenario has no shared cell; quiet ground and off-grid still return nothing). 115 unit tests, 19 browser checks.

### 2026-10-21: the depth rule knows which pit zone it is in

- R2 looped the zones and overwrote each cell's status, so with overlapping zones the **last** zone in the array decided the verdict while exceedance and volume took the maximum. A warning could therefore carry an exceedance past the violation band. The explanation always quoted `pitZones[0]` whatever zone produced the verdict, and the inspector and profile chart also used the first matching zone, so a two-zone site would have reported a floor that did not cause the finding.
- `ruleDepth` now records, per cell, the zone that produced its verdict, keeps the **worse** status, and on a tie keeps the deeper exceedance, so status, exceedance and volume always describe the same breach. `toFindings` tags a depth finding with `pitZoneId` (that zone, the one behind its deepest cell) and `explain` quotes that zone's approved floor.
- The inspector's pit reading and the profile chart's floor line pick the governing zone by the same rule (deepest below its own floor) instead of the first match.
- Tests: `src/compliance/zones.test.ts` (6 tests) with two zones over one cell — worse status in both array orders, floor quoted from the deeper zone in both orders, exceedance and floor agreeing, single-zone behaviour unchanged, and the inspector reporting the governing floor. The seeded five-finding snapshot did not move. 111 unit tests, 19 browser checks.
- Not done: the monitor camera still frames `pitZones[0]` when a fly-to has no finding to aim at; that is camera framing, not a reported figure.

### 2026-10-21: layer controls reach the phone drawer

- Below `md` the floating Map card is `display: none`, so a phone had no way to change what the map draws. The switch list moved into `src/ui/LayerControls.tsx` (`LayerSwitches`) and now renders in the Details drawer below `md`, above the tabs. `md:hidden` on that section keeps exactly one set of controls at every width: the drawer below `md`, the floating card from `md` up.
- The Map card keeps its key and exaggeration; the drawer gets the switches plus the exaggeration slider. No store or state change — both placements call the same `toggleLayer`/`setExaggeration`.
- Fixed a real bug the move exposed: both `ExaggerationSlider` instances used `id="exaggeration"`, and since a label associates with the first element carrying that id, the drawer's slider was unlabelled (duplicate ids are invalid too). It now uses `useId`.
- Tests: `e2e/mobile-layers.spec.ts` (at 390 px every one of the eight switches is visible in the drawer, toggles, and the slider sets 2×; at 800 px the drawer carries none and the card carries all eight), plus a phone-width axe scan with the drawer open in `a11y.spec.ts`. 19 browser checks, 105 unit tests.
- Follow-up from the visual pass: the layer block was capped at `max-h-[45%]` with its own scrollbar, which cut the "Findings" row in half on a 844 px phone. The drawer now has one scroll area under the tabs holding both the layer block and the tab content, so nothing clips mid-row on short screens.

### 2026-10-21: a failed load can be retried in place

- The store only loaded from `idle`, so one failure was permanent and the only way out was a reload. `load` now also runs from `error` when forced, remembers the provider it used, and a `retry` action re-runs it on that same provider. Loading and ready still refuse a second load.
- The provider had two reasons to make retry pointless, both fixed: a rejected survey stayed in its cache (so a retry replayed the same rejection), and a crashed worker stayed in place. Failures now evict the cache entry, and a worker error terminates the worker so the next request spawns a fresh one.
- Both screens report the failure honestly. The monitor's error card gains a **Try again** button. The home page previously spun on "Building the simulated surveys…" for ever; it now says the surveys could not be built, and because its map is `aria-hidden` decoration, the error and the button live in a `role="alert"` card in the document flow instead.
- Tests: three new store tests (second load refused once ready, retry recovers a flaky provider, retry is a no-op when there is nothing to retry) and `e2e/retry.spec.ts`, which fails the first `new Worker(...)` via an init script and then recovers through the button on both screens. 105 unit tests, 16 browser checks.

### 2026-10-21: one terrain worker for the whole page

- The leak was structural: every mount built a `WorkerTerrainProvider`, whose constructor eagerly started a Web Worker, and the store then refused the second load, so each navigation after the first orphaned a worker nothing could shut down (the audit counted 8 created, 0 terminated).
- `WorkerTerrainProvider` now starts its worker on the first survey request instead of in the constructor, and has a real `dispose()` that terminates the worker and fails anything in flight. `acquireTerrainProvider` / `releaseTerrainProvider` share one provider for the page, ref-counted.
- Release defers the shutdown by one tick and cancels it if a screen acquires again. A route change unmounts the old screen and mounts the next in the same task, so the count does hit zero mid-navigation; without the deferral, a quick home-to-monitor hop during the first load would dispose the provider and fail the load.
- Measured in a browser by wrapping `window.Worker`: home, then monitor, then three round trips gives **1 created, 0 terminated**, and the seeded findings still report. Because the deferral cancels, `dispose` in practice only runs when the app itself unmounts (HMR, page teardown); that is the honest reading, and it is why the count stays at one.
- Tests: `src/data/WorkerTerrainProvider.test.ts` (lazy start, one worker for both surveys, dispose terminates and rejects late callers, idempotent dispose, shared instance, last-consumer shutdown, and the cancelled-shutdown case). 102 unit tests.
- Also raised the per-click budget in `hud.spec.ts` from 5 s to 15 s: with 14 software-WebGL browsers in parallel, Playwright's click action can be starved of main-thread time. The `elementFromPoint` assertion is the real guard, not the click.

### 2026-10-21: each terrain surface owns its layer uniforms

- The contour and tint uniforms lived in a module-level `surfaceUniforms` object that every surface material merged into its own shader. So the layer effect wrote state shared by all materials and by both canvases: whichever mounted last won, and the values survived a navigation instead of following the store.
- `src/scene/surfaceUniforms.ts` (`makeSurfaceUniforms`, tested) returns a fresh set per material, so `uContours`, `uTint` and `uInk` are now as per-material as `uOverlay` and `uMorph` already were. `Terrain` creates the set inside its material memo and exposes a `setLayers` closure for the effect — the same shape as the existing `setMorph`, which is also why the React 19 hook linter accepts it (it rejects mutating a memo result directly).
- Verified with a throwaway pixel probe against the dev server, since no unit test can see a shader: clipped to bare terrain, toggling Contours or Elevation tint changes the frame and toggling it back restores it byte for byte. Note for future probes: an element screenshot of the canvas also captures the overlapping Map panel, so clip a region clear of the cards.

### 2026-10-21: the honesty badge shows on phones

- The home page dropped its SIMULATED DATA badge below `sm` (`hidden sm:inline-flex`). The reason it was hidden is geometric: `.home-corner` is a fixed row at the top right holding the badge and the monitor CTA, and at 390 px that row starts around x=78 while the floating brand ends around x=140.
- Fix is to stack the corner below `sm` (`max-sm:flex-col max-sm:items-end`) and show the badge at every width, with the full label rather than an abbreviation. No change from `sm` up, where badge and CTA still sit in one row.
- New `e2e/badge.spec.ts`: at 390, 800 and 1440 px it asserts the badge is visible on home _and_ monitor, and that its box does not intersect the brand's on home. Fourteen browser checks now.

### 2026-10-21: the scale bar stops eating camera clicks

- `ScaleBar` gets `pointer-events-none`: it is decorative and `aria-hidden`, so it should never have taken a click. The utility wins over `.stage > *` because that rule lives in `@layer components` and utilities come after it — the same idiom `Timeline` already uses.
- Position: top-left as before from `xl` up; below `xl` it moves above the timeline (`max-xl:top-auto max-xl:bottom-24`), because the stage is only 360 px wide at 1024 px and cannot hold a 208 px chip and the ~215 px camera group in one row. The collision threshold is a stage narrower than about 437 px, which is every viewport under ~1100 px.
- New `e2e/hud.spec.ts`: at 390, 768, 1024 and 1440 px it asserts `elementFromPoint` at each preset's centre is that preset, then clicks all three and checks the scale reading is still on screen. Runs under `reducedMotion: 'reduce'`, because the HUD's entrance animation holds the presets ~45 px above their resting place for its 1 s delay and the top bar wins the hit test meanwhile — pre-existing and cosmetic, not the chip bug.
- `e2e/canvas.spec.ts`: the bare 5 s canvas wait now has the same 30 s budget as the readiness wait. Nine browser tests in parallel made the lazy scene chunk slower to arrive than the old five-test suite ever did.

### 2026-10-21: unknown addresses rewritten to the home hash

- `plannedHash` in `src/ui/route.ts` (pure, tested): the empty hash, `#/` and `#/monitor` are left alone; every other hash is sent to `#/`. The empty hash is deliberately untouched so the root URL stays the root URL instead of growing a `#/`.
- `App` runs it on mount and on every `hashchange`, rewriting with `history.replaceState` so the correction does not land in the back history. Before this, `#/typo` or `#/monitor/extra` rendered the home page while the address bar claimed otherwise.
- New `e2e/routing.spec.ts` covers a typo hash and a deeper monitor path. Seven browser checks now.

### 2026-10-21: required Node version declared

- `package.json` gains `engines.node` `^20.19.0 || >=22.12.0`, the same range Vite 8 declares about itself, so a wrong toolchain gets npm's `EBADENGINE` warning and Vite's own early "requires Node.js" error instead of an opaque build failure later. Local Node is 24.18.0; CI pins 22.
- Decided not to enforce it. `engines.node` plus Vite's own startup check is enough for a demo; an `.npmrc` with `engine-strict=true` would make installs hard-fail, but the tool sandbox refuses to write that filename (it can carry registry credentials), so it would have to be added by hand, and the call was that it is not worth it. Recorded here rather than tracked as a ticket: a wrong Node still fails early with npm's `EBADENGINE` warning and Vite's error, just not at install time.

### 2026-10-21: narrow-screens spec from the browser audit

- Playwright-driven UI/UX audit (screenshots, pointer probes, keyboard, zoom, drag at 390–1440 px) published as issue Raghav2012Code/pitwatch#2 with `ready-for-agent`: scale-bar chip eats camera-button clicks at 1024 and below, SIMULATED badge hidden on phones, no layer controls on mobile.
- Worker-leak count from the same audit (8 created, 0 terminated across repeated navigation) stays in issue Raghav2012Code/pitwatch#1.

### 2026-10-21: agent-skills setup (issue tracker, labels, domain docs)

- Enabled GitHub Issues on the fork (`has_issues` was off) and created the five triage labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`; `wontfix` was already inherited from the fork defaults).
- `docs/agents/issue-tracker.md` (GitHub via `gh`), `triage-labels.md` (1:1 defaults), `domain.md` (single-context), plus the `## Agent skills` block in `CLAUDE.md`.
- Published the audit spec as issue Raghav2012Code/pitwatch#1 with `ready-for-agent`.

### 2026-10-20: one instruction file for every agent

- `CLAUDE.md` moved to `AGENTS.md`, the tool-neutral name other agents read. `CLAUDE.md` is now a short pointer that imports it (`@AGENTS.md`), so there is one source of truth and no drift between two copies.
- "Claude attribution" in the working rules became "AI attribution"; the top of the file now records that `origin` is a fork of `abivan100-stack/pitwatch-3d`.

### 2026-10-20: CI, browser checks, accessibility automation

- **Playwright** (`e2e/`, config at the root) runs against the production build (`vite preview` on 4173), not the dev server, so a minified-only breakage still fails. Five checks: seeded findings reach the DOM (2 violations, 3 warnings, all five ids), the R3F canvas mounts with a live WebGL context and no console/page errors, home -> monitor navigation, and axe (WCAG A/AA) on both routes.
- **CI** (`.github/workflows/ci.yml`): Node 22 on `ubuntu-24.04`, `npm ci`, `npm run verify`, build, Playwright with chromium, report uploaded on failure. Actions pinned to current majors (v7). Deliberately one job: two would duplicate install and browser download for the same wall clock.
- **New scripts:** `test:e2e`, `test:e2e:ui`, and `verify` (typecheck, lint, format check, unit tests). `test:e2e` is not part of `verify`, because it owns a build and a preview server.
- **Accessibility fixes:** the map's `role="img"` label now follows `epoch` and the engine output instead of always saying "current survey"; `SceneStatus` announces errors as `role="alert"` and keeps `role="status"` for loading.
- Gotchas: R3F keeps the canvas at the 300x150 default until its ResizeObserver runs, so the size assertion polls instead of reading the box once. The a11y scan runs with `reducedMotion: 'reduce'` (the app's own supported mode): `.rise` starts at opacity 0, and a mid-fade scan reports a false contrast failure, which is exactly what happened on the first CI run.
- Not done: still no keyboard way to pick a point on the 3D map (unchanged from M7); the canvas is exposed as an image and the panels carry the data.

### 2026-10-20: M8 deploy check

- Final pass, no code changes. `vercel.json` pins the Vite build; the repo is connected, so pushes to `main` redeploy. Live site returns 200 and serves `og.png`, `favicon.svg` and the Open Graph tags from M7. README already has the Mermaid architecture diagram and Deploy section. Netlify config skipped: Vercel is the one target. Roadmap tables updated, all milestones M1–M8 done.

### 2026-10-20: M7 polish

- **Audit:** axe-core (wcag2a/aa, wcag21aa, best-practice) on home, monitor, Findings tab, an active measurement and home at 800 px: now 0 violations everywhere. Helper `%TEMP%/pitwatch-scripts/axe.mjs <url> <width> [actions]` (axe-core installed there, not in the project).
- **Fixes:** `--color-ink-faint` #62676e to #5a5f66 and `--color-warn` #9a620a to #865509 (both were just under 4.5:1 on the paper backgrounds); home page has `<header>` and `<main>` landmarks; `Row` puts the provenance tag in a `<dd>` (a `<span>` inside `<dl><div>` is invalid); the scrolling tab panel is focusable (`tabIndex=0`).
- **Performance:** the home 3D canvas stops rendering (`frameloop="never"`) when the story is scrolled out of view and resumes on return. Under `prefers-reduced-motion` the home orbit holds still and violation pins do not pulse. Measured: no main-thread hotspot of ours (monitor terrain geometry about 80–100 ms including the baseline morph data; the long tasks in headless Chromium are software WebGL). Monitor was already demand-rendered; terrain generation already in a worker.
- **Permitted zones layer** (off by default): pit zone as long dashes, dump zone as dots, from the permit polygons; key lists them with the approved floor. Closes the M5 gap.
- **Pins:** every other badge (west to east) hangs to the left of its stick, so nearby findings (R1-1, R1-2) sit side by side instead of overlapping.
- Key swatches for the white map lines sit on a dark chip so they read on the pale panel.
- **Home:** the step gauge only shows on screens at least 760 px tall (it overlapped the intro text on short windows); permit-step copy now mentions purple for the most severe findings.
- **Share metadata:** theme-color, Open Graph and Twitter card tags, `public/og.png` (1200×630 screenshot of the permit step), a `<noscript>` line.
- Not done: no keyboard way to pick a point on the 3D map (the Findings tab and the finding links cover reading findings); `THREE.Clock` deprecation warning comes from three/r3f, not our code.

### 2026-10-19: M6 picking, measure, profile, survey slider, fly-to

- **Survey slider:** the timeline has a real control now. A range input (0/1, snaps) over the track plus clickable Baseline and Current labels set `epoch` in the store. The monitor `Terrain` always holds the current survey and morphs to the baseline (`morphTo` + `morph` from the home page), so switching glides. Only two surveys exist, so there is no in-between state to fake. On the baseline, change and finding overlays and pins are hidden (they describe current vs baseline). A `Redraw` component asks the demand-driven canvas for a frame when the epoch changes.
- **Tools:** Inspect and Measure switch (top-left under the scale bar, shortcut `M`, `Esc` clears). Store: `tool`, `picked`, `measureA`, `measureB`, `pickPoint`, `clearPicks`. Terrain `onPick` fires on a click, not a drag (`e.delta` ≤ 4 px). Measure: A, B, a third click starts again. Cursor is a crosshair while measuring.
- **Inspector tab:** `src/compliance/inspect.ts` `readPoint` (pure, tested) gives position, lat/lon (display-only), current and baseline RL ± σ, change ± combined σ with the engine's threshold verdict, slope, lease inside/outside and distance, buffer, pit floor margin, and the findings under the cell (links). Measurement section: horizontal, slope distance, elevation change ± √2σ, average grade, profile chart. Measured on the current survey; horizontal position error is not modelled (the panel says so).
- **Profile:** `src/geo/profile.ts` `profileAlong` (half-cell steps, NaN off-grid, tested); `measureOnSurface` in `geo/measure.ts`. `ProfileChart.tsx` draws current (solid), baseline (dashed) and the approved floor (dotted) only where the line is inside the pit zone. Vertical scale is fitted to the data and the chart says so. A map chip shows the headline numbers so they are visible when the drawer is closed.
- **Map markers:** `PickLayer.tsx`: ring for an inspected point, A/B discs and the draped line for a measurement (sprites at constant screen size via `useScreenSize.ts`, `raycast` disabled so they never block clicks).
- **Findings:** pins are clickable (select + open Findings tab + fly), each card has "Show on map" and a highlight ring when selected. `CameraRig` handles `focus` requests with `focusPose` (close oblique from the south-east, tested).
- Not done: outlines of the pit and dump zones. Pins that overlap (R1-1, R1-2 in top view) are still hard to tell apart without zooming. Picks hit the current surface geometry even while the baseline is shown (small horizontal offset on steep walls).
- Browser check: the Playwright helper takes `{"mouse":[x,y]}` and `{"key":"m"}` actions; epoch buttons are `.epoch-btn:has-text("Baseline")`.

### 2026-10-19: M5 monitor overlays

- Four new layer switches under "Permit and change" in the Map card: Lease boundary (on), Safety buffer (off), Change since baseline (off), Findings (on). Store `LayerId` gained `lease | buffer | change | findings`.
- Change and findings colour the terrain cells (existing `aChange`/`aFinding` attributes and `overlay` strengths from the home page; the switches only set the strengths, marks are built once). `src/scene/marks.ts` (`buildMarks`, `toneOf`, tested) is now shared by the home page and the monitor; `src/ui/findings.ts` re-exports `toneOf`.
- `src/scene/Overlays.tsx`: lease line, buffer line and one pin per finding (stick plus a camera-facing badge with the finding id). The badge is a canvas-textured sprite at constant screen size with the severity shape (triangle, octagon, diamond) and the same inner marks as the panel glyphs, so colour is never the only signal. Not drei `Html`: it logs a React 19 "unmount a root while rendering" error. `src/scene/overlayGeometry.ts` holds the pure helpers (`onGround`, `leaseLine`, shared with the home scene).
- Buffer line: `insetSegments` in `src/geo/polygon.ts` (marching squares on the signed distance to the lease outline, 4 m step, handles the concave lease; tested). It is the same distance test R1 uses, so the line is where the warning band starts.
- Key: `OverlayKey` lists only the overlays that are on, with the change threshold (minChange + kσ, σ shown) and a note that cells and pins come from the engine. Palette: `OVERLAY.lease`, `OVERLAY.badgeInk`, `TONE_COLOR`.
- Not done: outlines of pit and dump zones, pin picking and fly-to (M6). Pins at the east wall (R1-1, R1-2) overlap in top view.
- Browser check gotcha: switch rows are `[role=switch]`; use `[role=switch]:has-text("Safety buffer")` rather than `button:text-is`.

### 2026-10-18: home timeline follows the scroll

- `src/state/story.ts` (`useStory`, t from 0 = baseline to 1 = current) is set from the scroll position: 0 while the baseline block sits on the 65% activation line, 1 when the current-survey block reaches it, linear in between (rAF-throttled scroll listener in `HomePage`).
- `src/ui/home/StoryClock.tsx` replaces the inline clock: the marker slides and the track fills with t (CSS `--t`), month ticks turn blue as they pass, the readout counts the date and day (`addDays` in `format.ts`, tested), and a status line says when the model is a blend between surveys ("an illustration, not a survey").
- `Terrain` gained `morphTo` + `morph`: every vertex also carries the other survey's height and normal (`aAltY`, `aAltNormal`), the skirt its alternate top, the image blends with a second texture, and a custom depth material keeps shadows in step. `uMorph` eases towards the requested value so scroll steps glide. The home model is now one morphing mesh instead of two swapped ones.

### 2026-10-18: home model framing

- The home orbit now circles the block centre (not the pit) at about 38° elevation, and its distance is recomputed from the canvas size each frame so the whole 2048 m block, corners included, stays in view at every angle and aspect ratio (`Orbit` in `HomeScene.tsx`).
- The model sits straight on the survey paper: the boxed neatline frame is gone; the survey date bar is a small floating card under the model.

### 2026-10-18: deployed on Vercel

- Live at https://pitwatch-3d.vercel.app (team `abivan100-stacks-projects`, project `pitwatch-3d`). `vercel.json` pins the Vite build (`npm run build` -> `dist`). The GitHub repo is connected, so pushes to `main` redeploy. Manual: `npx vercel deploy --prod --scope abivan100-stacks-projects` (the local CLI is logged in; the Vercel MCP connection is read-only for project creation and returned 403).
- README: live link at the top, a Deploy section, and updated home and roadmap text. `.vercel/` is gitignored.

### 2026-10-18: home story on the live 3D model

- User did not like the flat photo map. The home story now shows the real 3D model (`src/scene/HomeScene.tsx`, lazy chunk), slowly orbiting the pit with no controls (pointer-events off so page scroll is never captured). Steps drive it: 0–1 baseline survey, 2 current survey, 3 measured change coloured on the terrain (rust cut, blue fill, unchanged ground dimmed), 4+ findings coloured by tone, the lease boundary as a white line just above the ground, and a pin per finding (violations pulse).
- `Terrain` gained optional `marks` (`aChange` −1/0/+1 and one-hot `aFinding` [warning, violation, critical] vertex attributes) and `overlay` strengths that ease in over about 0.6 s via a per-material `uOverlay` uniform. Monitor passes neither, so it is unchanged; M5's change layer can reuse this. Overlay colours in `palette.ts` (`OVERLAY`).
- Removed `SurveyPlan.tsx`, the north arrow (wrong on a rotating model) and their CSS.

### 2026-10-18: README

- Replaced the Vite template README: what PitWatch is and is not, data honesty, the rules table and the scenario's expected findings, run/test/build commands, a Mermaid architecture diagram, folder map, stack and roadmap. M8 will add deployment instructions. No branch: docs change on `main` like the rest.

### 2026-10-18: home map from the real simulated surveys

- The drawn schematic pit on the home page is gone. `src/ui/home/SurveyPlan.tsx` draws the story map from the same data the monitor uses: baseline and current aerial images (canvas -> data URL, rows flipped so north is up), the measured change (rust = excavated, blue = filled, one pixel per grid cell), the baseline rim, the lease boundary, the R1 violation cells in red and a marker for every engine finding. SVG units are local metres with y flipped.
- The home page loads the terrain store itself (same `WorkerTerrainProvider`, load-once), shows "Building the simulated surveys…" until ready, and states the live engine result in the permit step.
- `.plan-box` clips the map so the photo fills the frame but never covers the date bar. Removed the old illustration geometry, `.grow`, `.story-map`, `.bench*`, `.draw` CSS and the unused `ticks` helper.

### 2026-10-18: larger model, survey-paper backdrop

- Camera presets moved in (oblique about 28% closer, top and pit closer too) so the terrain block fills the map area.
- Sky gradient replaced by a survey-paper backdrop: `--color-backdrop`, lighter under the model, soft vignette at the edges, faint decorative contours (`<Relief />` from `schematic.tsx`) behind the canvas. Fog reads `--color-backdrop`. Removed `--color-sky`, `--color-sky-2`, `--color-horizon`, `--color-ground`.

### 2026-10-18: M4 compliance engine

- `src/compliance/` (pure TS): `config.ts` (k = 2, minChange 0.5 m, severity thresholds: the only place to tune), `change.ts` (Δh = current − baseline; excavated below −(minChange + kσ), filled above +(minChange + kσ), σ = √(σ1² + σ2²)), `cluster.ts` (8-connected components, same key only), `engine.ts` (`ruleBoundary` R1, `ruleDepth` R2, `ruleDumping` R3, `severityOf`, `explain`, `evaluate`).
- R1: excavated cell outside the lease = violation, inside but within the buffer = warning. R2: inside a pit zone, below the approved floor by more than kσ = violation, within kσ = warning; uses the current survey's σ (the floor is a fixed level, not a second survey) and counts volume below the floor only. R3: filled cell outside every dump zone = warning.
- Severity: violation is critical if area, volume or exceedance reaches `critical`, else high; warning is medium if it reaches `mediumWarning`, else low. Findings sorted violations first, then severity, then area; ids `R1-1`, `R2-1`, ...
- Scenario result (snapshot in `src/compliance/__snapshots__`): R1-1 encroachment (violation, critical), R2-1 sump (violation, high), R1-2 the pushback where it crosses the buffer (warning), R3-1 tipped heaps (warning), R1-3 buffer scrape (warning, low).
- Scenario fixes so only planted changes are flagged: the current pit is never above the baseline pit surface (mining only removes rock; the ramp had made false fills), tipped heaps packed closer so they form one finding.
- Wired in: terrain store runs `evaluate` on load (`change`, `findings`); top-bar status shows counts with a tone LED; Overview status block lists each rule's result; Findings tab lists cards (glyph, rule, status and severity, explanation, area, volume, max excess, centre) and the change threshold used. Map overlays and fly-to come in M5/M6.

### 2026-10-18: realism pass

- Bench crests and toes are ragged (blast damage): a few metres of noise on the distance inside the rim, none at the rim itself.
- Aerial image: tree crowns cast short shadows south-east (sun from the north-west), the sump holds murky water, haul roads have darker windrows along both edges.
- Commit rule: no Co-Authored-By or other AI attribution (user request).

### 2026-10-18: random pit outline and daylight sky

- Pit outline is no longer hand-drawn: `randomOutline(PIT_SEED, box)` in the scenario builds a seeded blob (random-amplitude, random-phase harmonics 2, 3, 4, 5, 7) stretched to fill the pit box. Same seed, same outline; change `PIT_SEED` for another pit. Baseline is the same outline with the west wall pulled in and the north/south walls drawn in slightly.
- Ramp stops following the wall where a deep offset would fold across a narrow part of the pit, then finishes with a straight drop to the floor centre (steepened only if needed to land on the floor).
- Map backdrop is a daylight sky: soft blue overhead (`--color-sky`, `--color-sky-2`), warm dusty haze at the horizon (`--color-horizon`, also the fog colour), plain-coloured ground below (`--color-ground`), and a faint sun glow at the top-left where the scene light comes from.

### 2026-10-18: elevation tint that reads

- New tint ramp in `palette.ts`: slate blue (pit floor), teal, sage, straw, ochre, rust (ridge). Cool lows, warm highs, muted.
- `elevationScale` (`terrainGeometry.ts`): ramp position is half linear, half by rank (histogram equalised) so the plateau, where most cells are, gets its own colours instead of one flat sand tone. `at(t)` inverts it for the key.
- With the tint on, the shader keeps the photo's light/dark detail at about a third strength (roads, creek, scrub stay faintly visible).
- Key shows five real elevations along the ramp plus a one-line note on the spread.

### 2026-10-18: realistic pit shape and landscape

- Pits are hand-drawn outlines (`PitStage` in the scenario: rim polygon + floor RL), rounded with Chaikin corner cutting (`roundOutline`). Benches follow the outline by distance inside the rim, so the pit is a kidney shape, not an ellipse. `preparePit` adds a bounding box and the ramp; `pitsOf(epoch)` lists the stages per survey.
- Proportions of a real pit: 15 m benches, 8 m berms, 9 m face run (59° faces, 41° overall wall). Current pit 150 m deep (floor RL 272, approved 270, sump 266); baseline floor RL 287. Block sides go down to RL 235.
- Haul ramp (`RAMP`, 30 m wide, 10% grade) leaves the rim where the haul road arrives and spirals down along the wall (more than one lap if needed) until the floor; cut-and-fill across the benches with short batters. The aerial image paints it as a pale road.
- Encroachment is now a benched pushback of the east wall that runs past the lease edge (was a rectangular slot).
- Landscape: Venthar Ridge rises about 40 m to the north (`RIDGE`), a meandering dry creek in the east (`CREEK`) with a sandy bed and trees crowding its banks. Waste dump footprint is lobed, not round.
- Tests: pit stays inside the lease and clear of the buffer, encroachment crosses the lease, pit is elongated, ramp starts at the haul road, reaches the floor and keeps its grade.

### 2026-10-18: monitor layout redesign

- Map fills the screen: canvas moved out of the framed stage to `inset-0`; `src/scene/ViewOffset.tsx` uses `camera.setViewOffset` + ResizeObserver so the model centres in `.stage` and glides as panels open/close. No neatline frame or contour backdrop on the monitor.
- Left card is now "Map": three working layer switches (pill switches), one line about the layers still to come, the key for the active colouring (`MapKey`), the exaggeration slider, and the orbit/R hint. Disabled placeholder rows removed.
- Overview rebuilt: status block first ("Not evaluated yet" + R1–R3 pending), then Surveys (date pair, interval), Current surface (lowest/highest ± σ, grid), Lease (operator, lease area derived from the polygon, buffer, approved floor, origin). KPI tiles and `Kpi` removed; `Row` takes an optional provenance tag.
- Top bar: brand, mine (one line + subtitle), status, SIMULATED DATA, view toggles. Survey date chips removed.
- Timeline is a compact pill inside the map with month initials, an "on map" marker on the current survey, and container queries for narrow stages. Title block removed (duplicate). Scale bar is a small chip top-left.
- CSS: `.card`, `.panel-title`, `.map-chip`, `.switch`, `.status-block`, `.survey-pair`, `.epoch-dot`, `.map-tag`; removed `.sheet`, `.hud-sheet`, `.kpi*`, `.chip`, `.toggle`, `.panel-head`, frame/fade entrance classes.

### 2026-10-18: natural-looking 3D model

- Simulated orthophoto (`src/data/orthophoto.ts`, 768 px ≈ 2.7 m/px): scrub, dry grass, lateritic soil, tree crowns, cleared ground around the pit, haul roads (`ROADS` in the scenario), banded iron rock on faces, dusty berms and ramp, muddy floor, wet sump, waste rock, fresh red cuts, baked shading in hollows. `TerrainSurvey.orthophoto` (optional, provenance simulated) is the stand-in for a drone orthomosaic. `SURFACE_KEY` feeds the map key.
- Terrain shape: domain-warped hills and ridgelines; irregular pit outline (`rimWobble`, phases keep the east wall clear of the buffer); spiral haul ramp (`RAMP`, 10% grade); terraced waste dump that exists in the baseline and grows (`BASELINE_DUMP` -> `CHANGES.zoneDump`); stray dump is now a cluster of truck-tipped heaps. Benches 10 m high, 10 m berm, 7 m face. Each cell is the mean of four sub-samples (area-averaged like a gridded survey) so benches do not alias.
- Generation moved to a Web Worker (`src/workers/terrain.worker.ts`, `WorkerTerrainProvider`), about 1.2 s for both epochs; buffers are transferred. Natural ground is computed once and shared by both epochs and the image.
- Scene: surface shader blends image and hypsometric tint by a uniform; new "Elevation tint" layer (off by default); contours off by default. Block sides are a soil profile by depth below ground (topsoil, laterite, saprolite, bedrock) via an `aTop` attribute. Sky gradient tokens `--color-sky` / `--color-horizon`, fog uses the horizon colour, cooler fill light and a warm low sun.
- Legend shows the surface key when the image is on, the elevation ramp when tint is on. About data says the image is simulated.
- Removed `src/data/zz_probe.test.ts`, a debugging leftover committed in M2.
- Browser checks now use `%TEMP%/pitwatch-scripts/shot.mjs` (playwright-core + the installed Chromium, SwiftShader WebGL). Use exact selectors like `button:text-is("Pit")`; `text=Pit` matches "PitWatch".

### 2026-10-18: M3 3D terrain and monitor redesign around it

- `src/scene/`: `TerrainScene` (lazy chunk; Canvas `frameloop="demand"`, `flat`, PCF shadows, NW key light, fog into paper colour), `Terrain` (surface + block sides built once per survey; exaggeration is a y-scale), `CameraRig` (drei OrbitControls, damped; animated flights; intro flight from high above into the oblique view; keeps the aim point when exaggeration changes), pure helpers `terrainGeometry.ts` (scene axes: x east, y = RL − 400, z = −north), `palette.ts` (hypsometric ramp shared with the legend, strata bands), `presets.ts` (oblique/top/pit poses, north-up, heading, metres per pixel, scale-bar length), `cameraState.ts` (transient store for HUD).
- Shaders via `onBeforeCompile`: contour lines in the terrain fragment shader (5 m, bold every 25 m, ~1 px at any zoom using `fwidth`), contour toggle is a uniform; block sides painted with horizontal rock bands by RL.
- HUD (`src/ui/viewport/MapHud.tsx`): title block, camera presets (Oblique / Top / Pit), compass that turns with the camera (click = face north), elevation legend from the real min/max ± σ, live scale bar at view centre, vertical exaggeration slider 1×–3× (default 1.5×). Loading and error states; `SceneErrorBoundary` catches WebGL failures.
- Terrain store `src/state/terrain.ts` loads mine/limits/surveys once from the provider (tested, including failure). App store: `layers` (terrain, contours), `exaggeration`, `view` requests. Shortcut `R` resets the view.
- Layer panel: Terrain and Contours are real switches (`role="switch"`), Reset view works; the rest still name their milestone. Overview KPI "Lowest point" now reads the survey (RL ± σ).
- Scenario tweak: plateau moved to RL 422 so flat berms and the floor are not on a 5 m contour level (noise made squiggles). Current floor RL 362 (approved 360), sump RL 356.
- Removed the old schematic pit plan, drone flight lines and schematic legend.
- Browser-check gotchas: navigating to the same `#/monitor` URL does not reload, use `location.reload()`; the Playwright window is backgrounded so a screenshot can show an older frame, take two. Unlayered CSS beats Tailwind's `hidden`, so keep component classes inside `@layer components`.

### 2026-10-18: M2 domain, geo and synthetic terrain

- `src/domain/types.ts`: full model from the spec: Vec2/Vec3, Polygon, Mine, GridSpec, TerrainSurvey, PitZone, DumpZone, PermittedLimits, ExcavationState, Measurement, ComplianceFinding, async `TerrainProvider` (so a GeoTIFF provider can drop in later).
- `src/geo/`: `grid.ts` (index/centre/cellAt, bilinear sample, volume), `polygon.ts` (point-in-polygon, shoelace area, distance to outline, centroid), `latlon.ts` (display-only equirectangular local <-> lat/lon; note says use UTM in a real system), `measure.ts`.
- `src/data/`: `rng.ts` (mulberry32, Box-Muller, lattice hash), `noise.ts` (value noise + fbm), `synthetic.ts` (plateau + stepped pit: 10 m benches, 8 m berms, 6 m face run, flat floor; per-epoch Gaussian survey noise σ = 0.05 m), `SyntheticTerrainProvider.ts` (cached).
- `src/data/fixtures/scenario.ts`: seed, 257 × 257 grid at 8 m, lease polygon, 20 m buffer, pit zone (approved floor RL 360), dump zone, and the planted changes: legit expansion, east encroachment (R1 violation), sump 6 m below floor (R2 violation), 1.2 m scrape inside the buffer (R1 warning), stray dump outside the zone (R3 warning), dump inside the zone (no finding).
- Tests (`geo.test.ts`, `data.test.ts`): 30 total passing, including determinism and one check per planted change. Overview shows the survey grid size.
- For M4: use `src/compliance/uncertainty.ts`; change threshold is `minChange + kσ` (spec). Survey noise max is about 0.3 m, so minChange around 0.5 m keeps noise out.

### 2026-10-18: collapsible panels, full screen, shortcuts

- Top bar "View" group: toggle layer panel, toggle details panel (lg+), full screen (only if `document.fullscreenEnabled`). Buttons use `aria-pressed` and `aria-keyshortcuts`.
- Shortcuts on the monitor: `[` layers, `]` details, `F` full screen; ignored while typing or with modifier keys.
- Store: `layersHidden`, `detailsHidden`, `toggleLayers`, `toggleDetails` (tested). `.monitor` gets `data-layers` / `data-details`; unlayered CSS slides panels out with `transform` and moves `.stage` / `.timeline` edges so the map grows into the space.

### 2026-10-18: home sections without cards

- User asked to remove the cards below the map. Permit schedule, noise calculator and resolution panels no longer sit in boxes: no panel backgrounds, borders or shadows; each starts under a 2 px ink rule instead. Raster cells outside the pit are transparent.

### 2026-10-18: more home-page content

- Three sections after the scroll story, each rising into view once (`.reveal` + IntersectionObserver in `HomePage`):
  - `home/PermitSheet.tsx`: the three lease conditions as a numbered schedule, each with the test R1/R2/R3 will apply (> 2σ).
  - `home/NoiseCheck.tsx`: interactive 2σ calculator (σ1, σ2, measured change sliders; presets for drone surveys and global DEMs; number line with the noise band; verdict).
  - `home/Resolution.tsx`: the same idealised pit rasterised at 30 m and 8 m, plus a smooth drone-scale version; raster columns sweep in when shown.
- Footer with the fictional-data note and a monitor CTA. Step gauge is now sticky inside the story column so it leaves with the story. Floating logo got a paper backing.
- New pure module `src/compliance/uncertainty.ts` (`combinedSigma`, `isSignificant`, `K = 2`) with tests; M4 should reuse it.

### 2026-10-18: monitor map upgrades

- Legend is interactive: hover or focus an entry to dim everything on the plan except that feature; click to pin it (`aria-pressed`). Works through `data-hl` on the plan SVG and `data-f` on each feature group. Put `data-f` on a wrapper `<g>` when the element has its own opacity animation, or the animation overrides the dimming.
- Drone flight lines (serpentine, dashed accent) over the pit with an animated drone dot and trail travelling the route (stroke-dashoffset on `pathLength=1` paths, 40 s loop). Listed in the legend.
- Map-sheet title block (top-left of the stage): mine name, mineral, survey dates, grid origin, "Schematic, not to scale". All from fixtures.

### 2026-10-18: monitor entrance animation

- Choreographed open (~2 s): top bar drops in, layer panel slides from the left with rows staggering, side panel from the right with KPI tiles rising, timeline rises and its track draws left to right with month ticks popping in order, map frame settles, backdrop contours fade in, caption and legend rise last.
- `useCountUp` (`src/ui/useCountUp.ts`) counts the 281-day interval up in the KPI and timeline; jumps straight to the value under reduced motion.
- Tab content slides in on every tab change (`.tab-in`).
- Classes: `.enter-down/left/right/up`, `.frame-in`, `.fade-in`, `.stagger` (children delayed by `--i`, base delay `--d`).

### 2026-10-18: home page rebuilt as a scroll story

- Replaced the template-style home page (hero + cards) with a scroll story on a pinned map (`src/ui/HomePage.tsx`). An IntersectionObserver on the `.home` scroller sets the step when a block crosses 65% of the screen height.
- Steps: start (baseline pit draws in) -> baseline survey -> current survey (pit grows via CSS transform, old rim stays as a dashed ghost, survey-clock marker slides to the current date) -> measured change (hatched cut = SVG mask of current rim minus baseline rim) -> permit check (lease line draws, the cut outside the lease turns red via clip-path, pulsing violation marker) -> monitor CTA.
- No nav bar: floating brand and CTA corners, plus a step gauge bottom-left on desktop. On phones the map pins to the top 56vh and the text scrolls below it.
- Gotcha: with `transform-box: view-box`, `transform-origin: 0 0` is the SVG user-space origin, not the viewBox corner.
- Removed the old home CSS (core log, rule insets, plate).

### 2026-10-18: home page

- New home page at `#/` (`src/ui/HomePage.tsx`); the monitor moved to `#/monitor`. Routing is a tiny hash router in `src/ui/route.ts` (`useSyncExternalStore` on `hashchange`), no dependency.
- Sections: hero with framed pit plan, "How it works" as a drill-core log (4 steps), "What it checks" with an inset diagram per rule R1/R2/R3 and the k=2 threshold, provenance tags explained, fictional-data footer. States that the rule engine is not built yet.
- Pit plan, contour backdrop and north arrow moved to `src/ui/schematic.tsx` and shared by both screens. Monitor logo links back home.

### 2026-10-18: map legend

- Added a legend box (bottom-left of the stage, `xl` and up) explaining index contour, bench contour, downhill ticks, haul road and approved floor. Uses the same CSS classes as the plan so the key always matches the drawing.

### 2026-10-18: topo survey-map redesign

- New identity: contour-line backdrop, pit drawn as a top-down contour plan (index contours, depression ticks, haul ramp, dashed approved floor) that draws in once on load; double map neatline; map north arrow.
- Panels are paper sheets with a strata band; top bar has a rock-layer rule; tabs are underlined; KPIs sit in a ruled legend grid; layer toggles are legend checkboxes; timeline epochs use trig-point symbols.
- Font: Inter replaced by Archivo (condensed cut for headings). Palette: limestone, slate, haematite, ochre, map-water blue.
- `src/ui/contours.ts` (+ test) generates the decorative contour loops.

### 2026-10-18: lighter palette

- Switched from the dark control-room palette to a light one: cool grey-white base `#e6ecf1`, near-white panels, deep teal accent `#0a7f96`, darker severity hues for contrast on light surfaces.
- Replaced hardcoded rgb overlays in `src/index.css` with `color-mix` on tokens, so the palette lives only in `@theme`.
- Added this file.

### Earlier

- `fa8e3cb` mission-control redesign: floating glass HUD, animated pit schematic labelled "Schematic, not survey data".
- `ad1895d` app shell and tooling. `9a1b99d` scaffold.
