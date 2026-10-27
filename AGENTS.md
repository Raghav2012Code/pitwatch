# PitWatch 3D: agent notes

3D mine monitoring and regulatory compliance demo. Frontend only, no backend. Every value is synthetic and labelled so.

Work is committed and pushed to `origin/main`. This checkout's `origin` is `abivan100-stack/pitwatch-3d`; verify the remote and current branch before any push. Historical log entries retain the repository and issue references that were accurate when those changes were made.

## Working rules

- After every feature: run the checks below, add an entry to **Update log**, commit (Conventional Commits, no Co-Authored-By or other AI attribution), push to `origin/main`, then ask the user before starting the next feature.
- Keep the session task list current while a run is in flight: mark a ticket in progress when you start it, and completed the moment its checks pass and it is pushed. Not once per batch, and not at the end — a list still showing pending work that has already shipped is worse than no list, because it makes the visible progress wrong.
- UI must stay honest: the dashboard shows the SIMULATED DATA badge and the landing page a small "simulated data" note (no large callout, no "demo" wording), provenance tag on values (measured | derived | simulated | unverified), ± uncertainty, no hardcoded alerts, no dead buttons. Unbuilt controls are disabled with a tooltip naming the milestone that enables them.
- `src/domain`, `src/data`, `src/geo`, `src/compliance` are pure TypeScript. ESLint blocks react, three, @react-three/* and zustand imports there.

## Checks

```sh
npm run verify && npm run test:e2e
```

`verify` is typecheck, lint, format check and unit tests; `test:e2e` builds and serves the production bundle for Playwright. Then a browser check at 1440, 1100 and 800 px wide (dev server: `npx vite --port 5179 --strictPort`).

## Stack

Vite 8, React 19, TypeScript strict, Tailwind v4 (tokens in `@theme` in `src/index.css`), Zustand, Vitest, three 0.186 + @react-three/fiber 9 + drei 10 (scene is lazy-loaded).

## Design

- App structure: landing page (`#/`) and a dashboard shell (`src/ui/shell/`: slate sidebar with a vertical drill-core strip, header with page title, status and SIMULATED DATA badge). Pages in `src/ui/pages/`: Overview, 3D map (`#/monitor`), Findings, Permit rules, Uncertainty, About the data. The sidebar is a 64 px icon rail on the 3D map by default (`sidebar: 'auto'`), full width elsewhere, a drawer below `lg`. Dashboard pages are ruled report sections, not stacks of identical cards.
- 3D map layout: full-screen 3D canvas on a survey-paper backdrop (`--color-backdrop`, faint `<Relief />` contours, soft vignette; fog uses the same colour); a `ViewOffset` shifts the projection so the model centres in `.stage` (the area the side cards leave free, click-through except its controls). Left "Map" card (layers, key, exaggeration), right details card (Findings and Inspector tabs), camera presets + compass top-right, scale bar top-left from `xl` up and just above the timeline below that (a stage under ~437 px cannot hold the chip and the camera group in one row), timeline pill bottom-centre. Soft `.card` surfaces (8 px radius, shadow); strata stripes only on the sidebar edge, the landing bar and footer.
- Each fact appears once: mine name in the sidebar, survey dates in the timeline and the Surveys section, nothing duplicated in map overlays.
- Landing page (`#/`) shows the live 3D model of the simulated surveys, driven by four buttons, not by scroll. Below `lg` the model comes first and the copy follows it, tight enough that both calls to action stay in the first screen. Topographic look: limestone paper, slate ink, map-water blue (`accent`) for interaction, haematite `oxide` and `ochre` for identity only (never status).
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

### 2026-10-27: findings PDF export

- The Findings page gains **Download PDF** next to Download CSV and Print report. `src/ui/reportPdf.ts` builds an A4 report with jsPDF (new dependency, loaded on demand so the first screen does not pay for it): title and survey dates, a "SIMULATED DATA, not a legal determination" line, a vector plan of the lease (lease solid, pit zones dashed, dump zones dotted, each finding marked by id), then one block per shown finding (rule, status, severity, area, volume, max excess, centre, explanation). Every page footer says the data is simulated. The filters apply, as for the CSV.
- The plan is drawn from the permit polygons and finding centroids, not a screenshot of the 3D canvas, which is not mounted on the Findings page.
- Test: one browser check downloads the file and asserts the name, the `%PDF-` header and a non-trivial size. The page layout was not inspected visually (no PDF renderer on this machine); only the file structure was checked.

### 2026-10-27: audit, scene colours moved to the palette (issue #46)

- Audit result: `npm run verify` and `npm audit --omit=dev` clean; one rule violation found. Seven hex literals in `TerrainScene.tsx` and `HomeScene.tsx` broke "never hardcode a colour in a component". Scene lighting (`LIGHT`), the backdrop fallback (`BACKDROP_FALLBACK`) and the lease line (`OVERLAY.lease`) now come from `src/scene/palette.ts`; no hex or rgb literal remains in `src/**/*.tsx` apart from the data-driven swatch in `MapHud`.
- Playwright now runs 3 workers locally (was one per core). On a loaded machine software-WebGL browsers starved and three checks (`home` at 800, `hud` at 768, `mobile-layers`) timed out in the full run; each passed alone.
- Verification: `npm run verify` (170 unit tests) and `npm run test:e2e` (74 checks) pass in one run. An earlier run on a busy PC timed out two `terrain.test.ts` tests, also on a clean tree; they passed once the load dropped.

### 2026-10-26: full visual audit, landing loading bar

- Screenshotted all seven pages at 1440 and 390 px and read each. No overflow, clipping, collision or contrast problem found. One gap: while the surveys build, the landing model card showed only a line of text on an empty panel. It now shows the same moving strata bar as the dashboard loading card.

### 2026-10-26: polish pass (speed, links, rail labels)

- **Faster start:** the two surveys now build in two Web Workers at once (`WorkerTerrainProvider` keeps one worker per survey), so the wait is the slower survey, not the sum. Time to the first engine result in headless Chromium fell from 11.1 s to about 6.5 s. The first-principles profile (node, single thread) was natural field 0.6 s, baseline surface 1.3 s, current surface 2.5 s, each aerial image 2.1 s, rules 0.09 s; the image and the current surface are the next candidates if more is needed. Early-outs added to the dump functions are exact (they return 0 only where the function is already 0) and did not change a snapshot value.
- **Shared links:** `#/monitor?finding=R2-1` opens the map on that finding once the engine has reported, an unknown id is ignored, and the address follows the selected finding afterwards. `route.ts` matches on the part of the hash before `?`; a typo is still rewritten to home. Findings rows gain **Copy link**.
- **Rail labels:** the icon rail shows an instant label beside the icon on hover and keyboard focus (the native tooltip was slow); on screens at least 540 px tall the rail no longer clips it.
- **Landing:** the headline is three lines at 1440 and 1920 px (it was four after the honest rewording); the loading card says what is being built.
- Tests: route unit tests for the query, four browser checks (shared link, address follows selection, unknown id, Copy link puts a working link on the clipboard), worker tests for two parallel workers. `README.md` and `STATUS.md` refreshed.

### 2026-10-26: findings report export

- The Findings page gains **Download CSV** and **Print report**. `src/compliance/report.ts` (pure, tested) writes one row per shown finding (id, rule, status, severity, area, volume, max excess, centre, explanation) and a final `data` column that says `simulated` on every row, so an exported file cannot be mistaken for a real result. The filters apply: the file holds what is on screen.
- Print uses a print stylesheet: sidebar, header and controls are hidden, rows do not split across pages, and every explanation is opened for the print and closed again afterwards. The page prints a one-line "simulated data" header with the survey date.
- Tests: four unit tests for the CSV (header, rounding and simulated marker, quoting, empty list) and one browser check that downloads the file and reads it back.
- Considered and not done: deep links that restore a selected finding (the hash router rewrites unknown hashes, so it needs a router change first) and a GeoTIFF provider (needs real sample data to design against).

### 2026-10-26: issues #44 and #45, a bigger site and a redesigned plan

- **#44, site plan:** the Overview plan is a vector drawing (contours, change traced as SVG paths, each finding's cells outlined, pins sized in CSS pixels with a 44 px hit area, title block with survey date, north and scale). The zone text labels were dropped because they collided with pins; the key names the zones instead.
- **#45, the site:** main pit enlarged to about 910 × 620 m and 180 m deep (floor RL 242, approved 240; 12 benches). New satellite pit south of it (floor RL 336, approved 334, its own zone and ramp, smaller in the baseline), a second waste dump with its own zone (grows inside the zone, no finding), a settling pond, a seven-leg haul road network with two junctions and the lease gate, two broad rises and a wider creek floodplain. Pit and dump zones are now outlines that follow the workings (the pit rims scaled 1.14 and 1.22, lobed footprints for the dumps) instead of rectangles. The grid stays 513 × 513 at 4 m.
- The five planted findings are unchanged in rule, status and severity (R1-1 critical, R2-1 high, R1-2 medium, R3-1 medium, R1-3 low). The compliance snapshot moved deliberately: the sump sits at (880, 1020) in the larger pit, and areas and volumes shifted by up to 3% (R1-1 7,632 to 7,696 m²; R2-1 1,520 to 1,552 m²).
- Camera: the Pit preset moved back to [560, 900, 1120] so the larger pit frames with more than one wall profile; Oblique and Top need no change.
- Measured, not guessed: survey build to findings on the Overview was 11.1 s in headless Chromium (about 10 s before). A frame-time A/B in the same software-GL browser, orbiting at the Pit preset, gave a median of 867 ms per frame before and 1,117 ms after (+29%). Software rendering makes both absolute figures meaningless; the geometry is the same vertex count, so the extra cost is fragment area from the larger view. A real GPU was not available to confirm 60 fps.
- Tests: `data.test.ts` and `orthophoto.test.ts` follow the new positions; the pit-layout test now expects two approved workings. Verification: `npm run verify` (164 unit tests) and a full browser run are recorded with the commit that closes #45.

### 2026-10-24: simplified abstractions found in the repository audit

- Replaced `WorkerTerrainProvider`'s reference counter and deferred teardown timer with one lazy page-lifetime provider. `App` stays mounted across hash navigation and StrictMode effect replay, while the provider still starts its worker only when survey data is requested. Provider module edits trigger a full reload after disposing the old worker, so the store cannot retain a stale instance across HMR.
- Removed the unused `isDashboard` route predicate and its standalone test; repository search confirmed there were no production callers. Other route helpers and behavior are unchanged.
- Verification: `npm run verify` passes (137 unit tests in 19 files); `npm run test:e2e -- --workers=1` passes all 69 checks. `git diff --check` also passes.

### 2026-10-24: issue #36 terrain resolution

- Increased the synthetic elevation grid from 257 × 257 at 8 m spacing to 513 × 513 at 4 m spacing over the same 0–2048 m extent. Sub-sample offsets scale with cell size so their former ±2 m bound is preserved.
- Updated the compliance snapshot for the finer cells. The five finding IDs, rules and statuses are unchanged; affected areas and volumes were deliberately recalculated. Resolution copy now describes 4 m cells and a 513 × 513 grid.
- Added geometry checks for vertex counts, extent, UV bounds, finite coordinates, upward-facing triangles and skirts. A 30 s setup budget is scoped to the slower two-survey compliance fixture.
- Corrected the Findings E2E row selector to match the page's `li.frow` markup. The landing-terrain screenshot check now waits for the route-specific canvas, uses an 800 × 720 viewport, and allows 120 s for its four 3D comparisons; the map canvas is in `.scene-wrap`, while `.stage` contains the HUD.
- Browser review at the Pit camera preset: the pit benches are visibly smoother. Startup was about 5.2 s at 8 m and 10.0 s at 4 m in the same browser and machine. Across three controlled orbit drags at 1440 × 900, the 4 m candidate's median frame interval was 16.7 ms and p95 was 16.8–16.9 ms; 6 of 731 intervals exceeded 33.3 ms, with a 100.1 ms maximum. The 8 m baseline had 0 of 638 intervals over 33.3 ms, with the same 16.7 ms median and 16.8 ms p95. This is sustained near-60 fps with occasional frame hitches; it is not a claim of zero dropped frames.
- Verification: `npm run verify` passed (140 tests in 19 files). `npm run test:e2e -- --workers=1` passed all 69 checks in one run, including the 1440, 1100, 800 and 390 px resolution/overflow review. The screenshot test uses its route-specific canvas and an 800 × 720 viewport; the monitor accessibility and evidence-restoration checks have 60 s budgets, the terrain-resolution check 60 s and the screenshot comparison 120 s. `git diff --check` passed.
- Issue #36 was closed after the verified push to `origin/main`. Issue #21 remains open for the planned final umbrella review after the other open issues are complete.

### 2026-10-23: remaining improvement issues and final bug check

- Sidebar opens as a slim rail on every page (#27). Findings severity key in one row (#30). Resolution heading shortened (#33). About page rewritten with the pipeline and a page guide (#35). New favicon and app icon, bolder and legible at 16 px (#19).
- New Terms and Conditions, License and Contact pages (#22), linked from the landing footer: routes `terms`, `license`, `contact` render outside the dashboard shell. The text is a draft: no licence has been chosen for the repository, so the License page says all rights are reserved until one is added. Needs the owner's review.
- Landing page: the big SIMULATED DATA stamp is now a quiet "Simulated data" note and "demo" wording is gone (#18, #20); the dashboard keeps the full badge and every provenance tag.
- Bug check (#41): `npm run verify` passes (135 unit tests); `npm run test:e2e` passes all 55 checks in one run; every page (landing, six dashboard pages, three legal pages) checked at 1440, 1100, 800 and 390 px for horizontal overflow and console errors, none found. The layers card still covers the left third of the map at 800 px (it is a card there, by design).
- Still open: #36 (finer elevation grid) and the umbrella #21, which needs the owner's eye on the landing page.

### 2026-10-23: improvement issues #13 to #40 (agent-ready ones)

- Home: phone hero puts the live model in the first screen; model buttons are numbered and show the survey dates; the rules read as a ruled ledger (no cards); the hero model no longer spins (horizontal drag turns it); the header gains 3D map and About links and scrolls away on phones.
- Overview: smooth site-plan change layer, "Explore in 3D" next to the plan, new order (verdict, plan beside findings and rules, facts in three columns). Area figures were audited and found correct; `src/compliance/areas.test.ts` pins them.
- Findings page: ruled rows with status and rule filters, figures in line, explanation on demand. The map's Findings tab uses the same rows. Permit rules page is a ledger with the 0.5 m + 2σ threshold up front. Uncertainty: vector cross-sections replace the pixel pits, bigger noise sliders with a plain-language verdict.
- Map: two-row timeline with a 44 px slider hit area on phones, touch-aware hints, narrower side cards, and the layers card starts folded between 1024 and 1280 px. Aerial image is 1.6 m per pixel (elevation grid stays 8 m, so no finding figure moved).
- Not done here: #18, #19, #20, #22, #27, #30, #33, #35 (assigned to the fork contributor), #21 (umbrella, waits on #18 and #20) and #41 (final bug check). #36 is only partly done: the elevation grid is still 8 m.
- Verification: `npm run verify` passes (135 unit tests); `npm run test:e2e` first run had 3 failures from changed selectors and a contrast issue on the new model-button captions; after fixing, the affected specs (a11y, dashboard, finding-evidence, home) pass. Not rerun as one clean full run, and no manual review at 1100 and 800 px of every page.

### 2026-10-21: two unreferenced Vite leftovers removed (fork #25)

- `src/assets/hero.png` (13,057 bytes) and `src/assets/react.svg` (4,126 bytes) came from the Vite template and were imported by nothing: `git grep` for both names and for `src/assets` finds no code, style, test or documentation reference. The folder was left empty and is gone with them. `public/logo.svg` stays: it is a public brand asset.
- Verified the bundle does not change: built with the two files restored and again with them deleted, the `dist` file list and every file size are identical, which is the proof they were never in it.
- `npm run verify` passes (133 unit tests); the browser suite is unchanged at 64 checks.

### 2026-10-21: the app stops teaching one threshold and claiming a breach (fork #17)

- Two separate claims were wrong, and both are explanation only: the engine's arithmetic is unchanged.
- The Uncertainty page taught the noise band (kσ) as _the_ threshold, while R1 and R3 report a change only beyond `minChangeM + k·σ` (`changeThreshold`, `src/compliance/change.ts`): 0.14 m against 0.64 m at the default σ = 0.05 m. The 0.40 m example was therefore called a real change while the engine would report nothing.
  - `src/ui/home/NoiseCheck.tsx` now takes the threshold from the engine's own helper, shows three figures (combined σ, noise band kσ, R1/R3 threshold minChange + kσ), draws both lines on the number line (shaded band, dashed threshold) and gives a three-way verdict: inside the band, distinguishable but not reportable, reportable.
  - R2 is explained on its own line: it measures the ground against a fixed approved floor, uses the current survey's σ alone (2σ2 = 0.10 m at the default) and has no minimum-change allowance, so a floor breach a few centimetres deep is still a warning.
  - The page subtitle is now "How much change the surveys can actually support".
- The copy no longer asserts a breach in the fictional scenario: the landing headline is "See where a simulated mine breaks its permit." (was "…the digging broke the permit"), its Findings and Change captions say what the engine classifies and which lines a change must clear, the Permit rules page states the tests from `COMPLIANCE_CONFIG` (0.5 m + 2σ for R1 and R3, 2σ2 for R2) in both the introduction and each card, the Findings page says findings are the demo engine's classifications and not a legal determination, About says the same about the violation/warning labels, and the `<meta>` description matches. `ThresholdNote` says changes below the line are not reported, instead of calling them noise.
- Tests: new `e2e/uncertainty.spec.ts`. The two thresholds are separate figures at the default preset (0.14 m and 0.64 m); the 0.40 m example is described as distinguishable but not reportable, with both numbers in the sentence; a preset and a slider move the figures and the wording together (11.3 m and 11.8 m, then 12 m becomes reportable); and one copy check walks landing → Findings → Permit rules → About for the simulated framing. Against the old code all three fail (heading missing, one threshold, "See where the digging broke the permit."). 133 unit tests, 64 browser checks.
- Found while running the full suite: `e2e/landing-terrain.spec.ts` compared canvas shots after a fixed 2.5 s sleep and timed out under parallel load. It now waits for the canvas to exist and to be resized off its 300 × 150 default, and has a 90 s budget. Two clean full runs after the change.
- Deliberate: the phone headline needs a wider column (14ch below 64rem) to stay three lines, so the first-screen budget from #23 still holds at 390 × 844 (links 750–801) and 800 × 900 (803–854). At 360 × 780 the second action still wraps below the fold, now about 100 px rather than 59, because this step's Findings caption is longer than #23's measurement.

### 2026-10-21: metric labels and their provenance tags stop competing on a phone (fork #24)

- The Overview's figure cells put the provenance tag beside the label in a `justify-between` row, and the figures grid is two columns below 64rem, so at 390 px "Removed outside the lease" wrapped into its tag.
- The `<dt>` now stacks below `sm` (`max-sm:flex-col max-sm:items-start max-sm:gap-y-1`). From `sm` up the classes are the ones that were there before, so the desktop cells do not move.
- The plan's proposed `flex-wrap` with baseline alignment was not taken: measured, it also drops the tag under the label at 1280 px, because the four-column cell is about 200 px wide and label plus tag do not fit on one line. The change is width-gated only.
- A stacked cell renders label, tag, value, note: the tag sits against the figure it describes. (The plan put the tag after the note; it lives inside the `<dt>`, so it renders before the value.)
- Tests: new `e2e/overview-metrics.spec.ts` measures the label with a DOM range, since it is a bare text node beside the tag span. At 390 × 844 the tag's top must be at or below the label's bottom; at 1280 × 800 the tag must start above the label's bottom, i.e. beside it. Against the old markup the phone case fails (tag top 528, label bottom 562). 133 unit tests, 61 browser checks.
- Browser check at 390 and 1280 px: the phone cells read label, tag, value, note with no overlap, and the desktop cells are unchanged.

### 2026-10-21: the phone landing opens on the model (fork #23)

- The hero put the copy first at every width and the stage had a 540 px floor, so on a 390 × 844 phone the model began at y = 760: the first screen was introduction only.
- Below 64rem the stage is now `order: -1` with `min-height: min(46vh, 420px)`, and the copy is tightened: the paragraph has a one-line phone version (the long one stays from `sm` up), the hero gap and padding shrink, the buttons lose a little padding and type size so the two actions sit on one row, and the model area's floor drops to 140 px — the stage's controls take about 244 px, so the model gets what is left.
- Measured with a throwaway layout probe: at 390 × 844 the stage runs 76–464 and both links sit at y 729–779, inside 844; at 800 × 900 the stage runs 76–490 and the links 803–854. At 360 × 780 the two buttons wrap and the second lands 59 px below the fold — deliberate, since the sizes the plan names are 390 and 800, and cutting more copy would cost the phone more than it gains.
- Tests: `e2e/home.spec.ts` gains a case at each of 390 × 844 and 800 × 900 — the stage box is on the first screen, at least 200 px tall, at least 90% of it inside the viewport, the model canvas is mounted, and both links are fully within the first screen. The plan's literal assertions were not enough: against the old hero they passed, because the stage still nicked the fold (15.5% of it visible at 390, 58% at 800). With the visibility ratio added, the old layout fails at both sizes. 133 unit tests, 59 browser checks.
- Browser check at 390 and 800 px: the model, the four view buttons, the caption, the clock, the headline and both calls to action all sit in one screen.

### 2026-10-21: the landing terrain survives the map's Terrain switch (fork #20)

- `Terrain` read `layers.terrain` from the app store inside the component, and both the map and the landing page render it. Switching Terrain off on the map therefore emptied the landing page's featured model, which has no control of its own to bring it back.
- Visibility is now the caller's decision: `Terrain` takes an optional `visible` and uses `visible ?? layers.terrain`. The map passes nothing, so its switch works exactly as before; `HomeScene` passes `visible` so the landing model is always drawn.
- Tests: new `e2e/landing-terrain.spec.ts`. No test can see a shader and the page exposes no scene graph (checked: the canvas carries only React internals), so it compares canvas screenshots — and it proves its own probe first: at a fixed Top pose, switching Terrain off changes the map shot by 61% of its byte length (1,295,940 to 503,764), while the landing shot after the same switch changes by 0.003%. Run against the old wiring first, the landing assertion fails, so the check catches the regression. 133 unit tests, 57 browser checks.
- Browser check at 1440 px: with the map's Terrain off, the landing model still shows the pit, the waste dump and the findings pins.

### 2026-10-21: keyboard focus stays in the open phone drawer (fork #19)

- The drawer handled Escape and returned focus to the Menu button, but Tab walked straight out into the page behind the scrim, where focus is invisible.
- Tab and Shift+Tab now wrap inside `#sidebar` between its visible controls, and a focus that is somehow outside the drawer is pulled back to the first (or last) control.
- The recorded "focus moves to the first navigation item" never actually worked: `.sidebar` is `visibility: hidden` until the browser applies the open style, and a `focus()` on a hidden element is dropped — the call ran in the effect, before that frame. Focus now retries on the next frames until it sticks, which is state-driven rather than a guessed duration. Escape still returns focus to the opener.
- Tests: `e2e/a11y.spec.ts` gains a keyboard check — focus is inside the drawer on open, more Tabs than there are controls still leave it inside, Shift+Tab too, and Escape closes the drawer with focus back on the Menu button. 133 unit tests, 56 browser checks.
- Found with a throwaway probe script rather than by reading the code: counting focusables and pressing keys showed focus never entered the drawer at all.

### 2026-10-21: findings first in the phone map drawer (fork #22)

- The drawer used to render the layer block before the tab panel, so on a phone the first finding started below eight switches and the exaggeration slider (about 440 px of controls).
- The block now sits below the tab content behind a closed `<details>` with the summary "Map layers and vertical scale". The drawer opens on the findings; opening the disclosure brings the same `LayerSwitches` and slider back, so there is still exactly one set of controls at every width. The floating Map card is unchanged from `md` up.
- Tests: `e2e/mobile-layers.spec.ts` — the reachability check opens the disclosure first, and two new assertions cover the point of the issue: a collapsed, named disclosure (hidden switches before it opens) and the first finding's heading visible near the tabs at 390 px. 133 unit tests, 55 browser checks.
- Browser check at 390 px: the drawer opens straight onto "Lease boundary and buffer" with the layers disclosure closed underneath.

### 2026-10-21: the map gives the model room at laptop widths (fork #21)

- Both floating panels were open on arrival, and the stage reserved a fixed 272 px and 392 px for them, so at 1100 px the model had a 372 px slot between them: the complaint in the issue, confirmed by measurement in the browser.
- The findings panel now starts closed below 1280 px. The map card stays open, because it holds the exaggeration control and the key, and the header's Details panel button brings the findings back with one click. At 1100 px the stage grows from 372 px to 764 px.
- The visitor's own choice wins: `detailsUserSet` in the store records that the panel was toggled or opened to show a selected finding, and the width rule stops deciding after that. The store grew one action, `setDetailsHidden`, which sets the panel without claiming the visitor asked for it.
- Tests: `e2e/map-width.spec.ts` is new and checks both ends of the rule — at 1100 px the panel starts closed, the stage is at least 600 px wide, the map card is there and the visible button opens the panel and takes the room back; at 1440 px the panel is open on arrival.
- A trap worth recording: `vite preview` serves the built files from memory, so a preview server left running from an earlier build serves the old bundle. Playwright reuses an existing preview server, which made the first run of this check fail against stale code.

### 2026-10-21: a measurement cannot ask for unbounded work (fork #18)

- The coordinate form accepts any finite local metres, but the profile along the line was sampled every half cell with no cap: `profileAlong` (`src/geo/profile.ts`) asked for `length / 4` samples, so a typed line of a million kilometres wanted 250 million of them. Two callers paid that cost — the Inspector's profile and the map's draped line (`src/scene/PickLayer.tsx`) — and the Inspector built the profile _before_ it checked whether an end was off the grid, so a line that could not be measured was still profiled in full.
- `profileAlong` now caps the samples at `MAX_PROFILE_SAMPLES` (2000) and says what it did: `step` is the spacing actually used and `limited` is true when the half-cell step had to be widened. A line that fits the cap is unchanged.
- The real saving is upstream of that: the Inspector only builds a profile when both ends have an elevation (`measureOnSurface` first), and the map line is not drawn at all when an end is off the grid, because `onGround` falls back to the base level and the line sinks out of sight. An off-grid end now costs nothing.
- When a profile is limited the Inspector says so under the chart, with the spacing it used.
- Tests: `src/geo/profile.test.ts` gains three (the half-cell step is kept for a line that fits; a 100 km line stays inside the cap and reports the coarser step). `e2e/keyboard.spec.ts` gains one: Measure, then A at E 0 / N 0 and B at a million kilometres east, and the panel must say the line is outside the survey area, offer no measurement and leave the page alive. That check was run against the old code first — it times out there, so it really catches the regression. 133 unit tests, 52 browser checks.
- Browser check at 1100 px: a 200 m measurement still shows the markers, the draped line, the profile chart and the four rows.

### 2026-10-21: the parent's nine open issues, copied here and planned

- The parent `abivan100-stack/pitwatch-3d` has nine open issues (#3–#11). They were copied into this fork as **#17–#25** (`gh issue create`, one per issue), each body byte-identical to the parent's, plus one line saying where it came from. Labels carried over (`bug`, `enhancement`, `ready-for-agent`); both trackers have the same label set. Mapping: parent #3→fork #17, #4→#18, #5→#19, #6→#20, #7→#21, #8→#22, #9→#23, #10→#24, #11→#25. The parent's tracker keeps the originals; these are the fork's working copies.
- `docs/plan-open-issues.md` is the plan: one step per issue, in nine steps, each with the root cause (file and line), the fix, the files, the tests, the risk and a "done when" line. The order is the one to work in: the profile bound first (the only correctness and performance risk), then the map layout, the phone drawer, the focus trap, the landing terrain, the landing layout, the Overview metrics, the copy and threshold work last so its wording lands on settled layouts, and the asset cleanup last.
- Root causes found while planning, all confirmed in the code: `profileAlong` (`src/geo/profile.ts:20`) has no sample cap and is called by both the map line (`src/scene/PickLayer.tsx:81`) and the Inspector (`src/ui/panels/InspectorPanel.tsx:157`, which builds the profile before it checks whether an end is off the grid); `.stage` reserves a fixed 272 px and 392 px (`src/index.css:265-280`) so at 1100 px the stage is 372 px wide; the phone drawer renders the layer block before the findings (`src/ui/SidePanel.tsx:70-77`); the drawer does not trap focus (`src/ui/shell/AppShell.tsx:26-40`); `Terrain` reads the map's `layers.terrain` from the store (`src/scene/Terrain.tsx:345`), so the map's Terrain switch hides the landing model; the hero is one column with the copy first (`src/index.css:1503`, `src/ui/HomePage.tsx:193`); the Overview metric `<dt>` puts the provenance tag beside the label (`src/ui/pages/OverviewPage.tsx:125`); the Uncertainty page teaches one threshold while the engine uses `minChange + k·σ` (`src/ui/home/NoiseCheck.tsx:34` against `changeThreshold`, `src/compliance/change.ts:6`); and `src/assets/hero.png` plus `src/assets/react.svg` are Vite leftovers referenced nowhere, 17,183 bytes together.
- No code changed. `npm run verify` and `npm run test:e2e` were green before the copy (131 unit tests, 51 browser checks) and the tree is unchanged by this entry.

### 2026-10-21: pulled the parent's redesign (fork `main` fast-forward to `f8a302a`)

- The parent `abivan100-stack/pitwatch-3d` merged the `ui-redesign` branch as PR #2 (`38613ad`) and added `f8a302a`. This fork's `main` was an ancestor of `upstream/main`, so the pull was `git merge --ff-only upstream/main`: 12 commits, no conflict resolution, no rewritten history.
- What came in: a landing page at `#/` (the live 3D model driven by four buttons, not a scroll story), a dashboard shell in `src/ui/shell/` (slate sidebar, header, load gate), pages in `src/ui/pages/` (`#/overview`, `#/findings`, `#/rules`, `#/uncertainty`, `#/about`), a schematic site plan on the Overview, the PitWatch logo and favicon set, and `STATUS.md` plus the competition improvement plan. `TopBar`, `PermitSheet`, `OverviewPanel` and `AboutDataPanel` are gone: their content moved to pages, not deleted.
- The parent's `AGENTS.md` header calls the parent the main repo. In this fork that is wrong, so the header was restored to the fork's wording (origin is the fork, the parent is `upstream`); the parent's log entries are kept as it wrote them, and the fork-era issue citations keep the `Raghav2012Code/pitwatch#N` form, which is unambiguous in both repos.
- Nothing else needed changing: `package.json` is identical to before the pull, so no dependency work; our `CoordinateEntry`, `zone.ts`, the layer drawer, the worker reuse and the retry path all survived the parent's merge of the fork's PR #1 untouched.
- Checks after the pull: `npm run verify` passes (131 unit tests in 17 files) and `npm run test:e2e` passes all 51 Playwright checks against the production build. Browser review at 1440, 1100 and 800 px on the Overview and the 3D map: no horizontal overflow, no console errors, findings and pins render.
- Known and left as upstream recorded them: the 3D map is tight at 1100 px with both side panels open, and the layers panel covers a lot of the model at 800 px.

### 2026-10-22: README reflects the merged dashboard

- Documented the Overview site plan, synchronized finding selection and evidence restoration, phone layer controls, foldable map key, and in-place loading retry. Added a five-step inspection walkthrough.
- Setup now uses the lockfile with `npm ci`, quotes the declared Node range, and includes the full verification and responsive-review commands. Updated the architecture labels and source tree to describe the dashboard pages.
- Separated completed M1–M8 milestones from proposed competition improvements and recorded the current map-layout and data limitations, with links to the plan and status handoff.
- Verification: `npm run verify` passes (131 unit tests in 17 files). The first run timed out in the existing Inspector suite setup; a separate full rerun passed without changing configuration. `npm run test:e2e` built successfully and passed 48 of 51 checks, with timeouts in the 1440 px camera and two coordinate-entry checks; all three passed with `--last-failed --workers=1`. This is not a single clean full browser-suite run.
- Manual browser review confirmed the landing page, Overview site-plan content, and selection of R1-1 opening the current map with terrain and finding markers visible. The full 1440/1100/800 px manual review was not repeated; the available browser interface did not expose viewport resizing. No application code changed.

### 2026-10-21: finding selection restores visible evidence (branch `ui-redesign`)

- Selecting a finding now returns the map to the current survey, enables terrain and the findings overlay, opens the Findings tab, restores the desktop details panel, and closes the phone drawer so the terrain is visible. Reopening Details retains the selected item.
- The Overview's attention row and SVG site-plan pin reflect the same selection as the findings list and 3D map. The map's accessible description reports terrain and finding-layer visibility and names the selected finding; it no longer says findings are marked when the layer is hidden or the baseline survey is active.
- Fixed a StrictMode effect replay that cleared a finding's camera request when the map mounted in development. Selection now frames the chosen pin; the pin grows on the 3D map and is visibly outlined on the site plan.
- Verification: `npm run verify` passes (131 unit tests in 17 files); `npm run test:e2e` passes all 51 checks. Browser review of the selected map and Overview at 1440, 1100, 800, and 390 px found no horizontal overflow or browser errors. The development probe confirmed the camera request survives StrictMode and the selected pin is framed.
- The first P0 is complete on `ui-redesign`; remaining competition-plan features stay proposed until the user directs the next one.

### 2026-10-21: site plan and short-screen map controls verified (branch `ui-redesign`)

- The Overview site plan renders the lease, permitted zone, changed cells and five findings from the existing survey and compliance output. Finding pins navigate to the matching selected finding on the 3D map; added Playwright coverage for all five findings, Enter and Space activation, and phone tap/navigation.
- The map's exaggeration slider remains visible at 1366×768, and the legend can be opened and closed without losing the slider. The landing hero and coarse-pointer controls were reviewed at wide and phone sizes.
- Verification: `npm run verify` passes (130 unit tests in 17 files); `npm run test:e2e` passes all 49 checks. Browser review: Overview at 1440, 1100, 800 and 390 px; map at 1366×768; landing at 2560×1440; phone drawer with touch input. No horizontal overflow or browser errors observed.
- `vite.config.ts` caps Vitest at two workers because the full synthetic survey setup timed out once under CPU contention and passed when isolated. The default full verify then passed without relaxing test limits. Replaced a hardcoded white hover color on the site-plan pin with the existing background token.
- `STATUS.md` now reflects the verified branch state. The competition improvement plan is committed on this branch and remains proposed; no plan feature has been started here.

### 2026-10-21: landing page made one piece (branch `ui-redesign`)

- The lower landing page read as separate blocks. Every section now opens the same way (`.landing-head`: heading left, one paragraph right) and is wired to the hero: "From two surveys to a verdict" is a real sequence (1, 2, 3) and each step has **Show on the model**, which scrolls the hero into view and switches the model (`showOnModel` in `HomePage.tsx`); the rule columns show the live engine result per rule (glyph and count, from `findings`); the top bar has "How it works" and "What it checks" buttons that scroll (buttons, not `#` links, because the hash router owns the hash).
- The page now ends in a slate band that matches the dashboard sidebar (`.landing-close`, `btn-light`, `btn-outline-light`, `chip-dark`) holding the CTAs and the honesty note; the old footer is gone. Headings use `text-wrap: balance`; step links and rule results sit at the foot of their column so paragraph length never staggers them; the hero text column is wider so the three facts sit on one row.
- Checked by eye at 1440, 1100, 800 and 390 px; browser tests for the landing page, axe, badge and dashboard pass.

### 2026-10-21: dashboard redesign (branch `ui-redesign`)

- Why: the scroll story was hard to demo. Now a landing page, then a dashboard with a sidebar. All features kept; nothing removed, only moved.
- **Landing** (`HomePage.tsx`): hero with the live `HomeScene` and four buttons (Baseline, Current, Change, Findings; `tweenStory` in `state/story.ts` slides the date bar), a live result line, rule summary, honesty section. Opens on Findings.
- **Shell** (`src/ui/shell/`): `AppShell`, `Sidebar`, `Header`, `LoadGate`, `nav.ts`. Store gains `sidebar` (`auto|open|rail`), `menuOpen` and `leaveMap` (clears fly-to and camera request so the map opens with the intro shot). Skip link is a button (a `#content` hash link would hit the hash router).
- **Routes** (`ui/route.ts`): `#/`, `#/overview`, `#/monitor`, `#/findings`, `#/rules`, `#/uncertainty`, `#/about`; anything else is rewritten to `#/`. The terrain provider is acquired once in `App`.
- **Moved, not lost:** the Overview tab is the Overview page, About data is the About page (plus provenance legend and keyboard shortcuts), the permit sheet is Permit rules (with the live result per rule), the noise calculator and resolution panels are the Uncertainty page. The details panel keeps Findings and Inspector tabs. `FindingCard` / `SeverityLegend` / `ThresholdNote` are exported from `FindingsPanel` and reused by the Findings page; Show on map navigates to the map.
- Removed `TopBar`, `PermitSheet`, `OverviewPanel`, `AboutDataPanel` and the scroll-story CSS. Tokens `--color-side*` and `--color-accent-bright` added for the sidebar.
- Tests: 130 unit; e2e gained `dashboard.spec.ts`, per-page axe scans, landing and routing checks. Fixes found by axe: `.prov-measured` contrast, the scrolling page main is focusable.
- Not done: the 3D map at 1100 px is tight with both panels open (hide one with `[` or `]`); `og.png` still shows the old home page.

### 2026-10-21: a consistent PitWatch logo and favicon

- Replaced the thin pit-section placeholder with a geometric mark: nested terraced pit contours form an observing eye around a survey point. Home and monitor use the same mark alongside the existing Archivo wordmark, with colour inherited from the ink token.
- Generated the visual direction, then redrew it as scalable paths in `public/logo.svg` and `PitMark`. The original transparent PNG and exact generation prompt are in `docs/brand/`. The favicon uses the same geometry in limestone on a slate tile, with a 32 px PNG fallback and an opaque 180 px Apple touch icon linked in `index.html`.
- Browser review covers 1440, 1100, 800 and 390 px, with no brand/badge overlap. All four public icon assets return 200 and decode; inspected the favicon at 16, 32 and 48 px. Typecheck, lint and formatting pass; all 127 unit tests pass with two workers and a 30 s setup allowance after the default run hit setup/test timeouts under concurrent browser load. The first production browser run reported passes for all 23 cases but did not exit; a repeat hit timeouts in existing camera/keyboard checks and was stopped. The default combined check sequence is therefore not a clean pass.
- Delivery limitation: this session's sandbox makes `.git` read-only; staging failed because `.git/index.lock` could not be created. These changes remain local and uncommitted.

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
