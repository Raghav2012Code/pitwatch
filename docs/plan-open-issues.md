# Plan: fix the nine open issues (fork copies #17–#25)

The parent repo `abivan100-stack/pitwatch-3d` tracks nine open issues. They are copied into this
fork as #17–#25 (the mapping is in the table below) so the fixes can be planned and built here.
Each copy is byte-identical to its parent issue, plus one line saying where it came from.

Nothing in this plan changes the compliance engine, the seeded scenario, the survey fixtures or
the rule outcomes. Eight of the nine steps change how the app presents what it already computes;
one bounds a calculation that can grow without limit.

## The issues

| Parent | Fork | Pri | Type        | Title                                                          | Step |
| ------ | ---- | --- | ----------- | -------------------------------------------------------------- | ---- |
| #3     | #17  | —   | —           | Clarify uncertainty thresholds and simulated compliance claims | 8    |
| #4     | #18  | P1  | bug         | Bound measurement profiles for off-grid coordinates            | 1    |
| #5     | #19  | P2  | bug         | Keep keyboard focus within the open phone navigation drawer    | 4    |
| #6     | #20  | P2  | bug         | Keep the landing terrain visible after changing map layers     | 5    |
| #7     | #21  | P1  | enhancement | Give the 3D map room at laptop widths                          | 2    |
| #8     | #22  | P1  | enhancement | Put finding evidence first in the phone map drawer             | 3    |
| #9     | #23  | P2  | enhancement | Bring the live mine into the phone landing view                | 6    |
| #10    | #24  | P2  | enhancement | Keep Overview metric labels and provenance clear on phones     | 7    |
| #11    | #25  | P3  | enhancement | Remove unreferenced source image assets                        | 9    |

The parent also holds `docs/competition-ui-ux-improvement-plan.md`, which these issues came from.
Steps 1–7 close the plan's P1 and P2 items that had become issues; step 8 is that plan's second
P0, "Compliance and simulation language matches the engine".

## Ground rules for every step

- One issue per commit, Conventional Commits, no AI attribution, pushed to `origin/main`, then
  stop and ask before the next one. That is the rule already in `AGENTS.md`.
- `npm run verify && npm run test:e2e` must pass before every push. `verify` is typecheck, lint,
  Prettier and the unit tests; `test:e2e` builds the production bundle and runs Playwright
  against it.
- A browser check at 1440, 1100 and 800 px on the screens the step touches, plus 390 px when the
  step is about phones.
- UI stays honest: no claim that the demo proves a real-world breach, provenance tags and ±
  uncertainty kept, no dead controls.
- Where a step changes a default that a browser check depends on, that check is updated in the
  same commit, and the update log entry says so.

## Step 1 — Bound measurement profiles for off-grid coordinates (fork #18)

**Root cause.** Two places build a profile from two typed coordinates with no bound:

- `src/geo/profile.ts:20` — `const n = Math.max(1, Math.ceil(length / (g.cellSize / 2)))`. The
  sample count is the line length over a 4 m step, so a 100 km line asks for 25,001 samples and a
  longer one asks for more. Nothing caps it.
- `src/scene/PickLayer.tsx:81` — the map line calls the same function, so the 3D scene builds a
  25,001-vertex line too.
- `src/ui/panels/InspectorPanel.tsx:157` — the Inspector builds the profile for any two points.
  The "one end is outside the survey area" branch at line 191 is checked **after** the profile
  exists, so an off-grid endpoint still pays for the whole line.

**The fix.**

1. `src/geo/profile.ts`: add `export const MAX_PROFILE_SAMPLES = 2000`. Clamp the sample count to
   it and report what actually happened: `step` (the spacing actually used, metres) and `limited`
   (true when the half-cell step had to be widened to stay inside the cap). A short line is
   unchanged: half-cell steps and `limited: false`.
2. `src/ui/panels/InspectorPanel.tsx`: compute `measureOnSurface` first and only build the profile
   when it returns a measurement. An off-grid endpoint then costs nothing and the existing
   "One end is outside the survey area" message stands.
3. `src/ui/panels/InspectorPanel.tsx`: when `profile.limited`, show one line under the profile
   chart saying the line is longer than the survey and the profile is sampled every N metres
   instead of every half cell.
4. `src/scene/PickLayer.tsx`: the cap applies to the map line for free, because it calls the same
   function. A line with an endpoint off the survey grid is not drawn at all: `onGround`
   (`src/scene/overlayGeometry.ts`) falls back to `BASE_RL` for a point with no elevation, so the
   line sinks out of sight instead of marking the measurement.

**Tests.**

- Unit, `src/geo/profile.test.ts`: a 100 km line returns at most
  `MAX_PROFILE_SAMPLES` samples and `limited` is true; a 200 m line returns the same points as
  before and `limited` is false; `step` matches the spacing used.
- Browser, `e2e/keyboard.spec.ts`: in Measure mode type A at E 0 / N 0 and B at E 100000 / N 0 and
  submit. Assert the page stays responsive (the panel renders within the usual budget), that the
  panel explains that the line cannot be profiled, and that no error is logged.

**Risk.** The profile chart (`src/ui/panels/ProfileChart.tsx`) reads `profile.d` and
`profile.series`; a coarser sample set is still a valid series, so the chart only needs the new
`step`/`limited` values for its note.

**Done when** the typed 100 km measurement produces a clear message and no long profile, the
unit tests cover the cap, and the seeded findings and the ordinary 200 m measurement are unchanged.

## Step 2 — Give the 3D map room at laptop widths (fork #21)

**Root cause.** The stage reserves fixed space for both panels:

- `src/index.css:265-280` — `.stage { left: 272px }` from 48rem, `right: 392px` from 64rem.
- `src/ui/LayerPanel.tsx:17` — the map card is 240 px wide.
- `src/ui/SidePanel.tsx:40` — the details panel is `min(360px, 100% − 32px)` wide.
- `src/state/store.ts:27-28` — `layersHidden` and `detailsHidden` both start `false`, so both
  panels are open on arrival.

At 1100 px the shell rail takes 64 px, the map area is 1036 px, and the stage is
1036 − 272 − 392 = **372 px** — a narrow slot for the model that is the point of the screen.

**The fix.** The details panel starts closed below 1280 px; the map card stays open because it
holds the key and the exaggeration control.

1. `src/state/store.ts`: add `detailsUserSet` (false until the visitor uses the toggle) and a
   `setDetailsHidden(hidden)` action that does not mark it as the visitor's choice. `toggleDetails`
   sets `detailsUserSet: true` as well.
2. `src/ui/pages/MapPage.tsx`: on mount, if the viewport is below 1280 px and `detailsUserSet` is
   false, close the details panel with `setDetailsHidden(true)`. The visitor's own toggle always
   wins, in either direction.
3. The header's **Details panel** button (`src/ui/shell/Header.tsx:83`) is already visible from
   1024 px up, so the panel can be brought back with a visible control. Its `aria-pressed` already
   reflects `!detailsHidden`, so it reads correctly when collapsed.
4. Below 1024 px the phone drawer already replaces the panel, so nothing changes there.

**Tests.**

- Browser, new `e2e/map-width.spec.ts`: at 1100 px the `.stage` box is at least 600 px wide, the
  map card is visible, and the details panel is collapsed; clicking the header's Details panel
  button opens it and the stage shrinks again. At 1440 px the details panel is open on arrival, as
  before.

**Risk.** The default Playwright viewport is 1280 px, so the specs that assume an open details
panel (`dashboard.spec.ts`, `finding-evidence.spec.ts`, `keyboard.spec.ts`) are unaffected — 1280
is not below 1280. `hud.spec.ts` runs at 1024 px but only touches the camera presets and the scale
bar, which live in the stage. The one spec that clicks the Details panel toggle
(`finding-evidence.spec.ts:23`) runs at 1440 px.

**Done when** the stage at 1100 px is at least 600 px wide, the controls are still one click away,
and the 1440 px layout is unchanged.

## Step 3 — Put finding evidence first in the phone map drawer (fork #22)

**Root cause.** `src/ui/SidePanel.tsx:70-77` — below `md` the floating Map card is hidden, so the
layer block renders in the drawer **before** the tab panel. Eight switches plus the exaggeration
slider take about 440 px, so the first finding starts well below the drawer tabs.

**The fix.** Put the phone layer controls behind a labelled disclosure and move them below the
finding content.

1. `src/ui/SidePanel.tsx`: move the `md:hidden` layer section from above the tab panel to below
   it, and wrap it in a `<details>` whose summary reads "Map layers and vertical scale".
2. The disclosure stays closed by default, so the drawer opens on the tabs and the findings.
3. `src/ui/LayerControls.tsx` is unchanged: the same `LayerSwitches` component and the same
   `ExaggerationSlider`, so there is still exactly one set of controls at any width.

**Tests.**

- Browser, `e2e/mobile-layers.spec.ts`: the existing check "every layer switch and the
  exaggeration slider are reachable from the phone drawer" opens the disclosure first, then
  toggles each switch and moves the slider. A new check asserts that at 390 px the first finding
  is visible in the drawer without scrolling, and that the layer switches are inside a collapsed
  disclosure with an accessible name.

**Risk.** `e2e/a11y.spec.ts:63` opens the phone drawer to scan it with axe; the switches inside a
closed `<details>` are hidden from the scan, which is correct, but the check must still open the
disclosure if it wants to scan them.

**Done when** the first finding is above the fold of the phone drawer, the switches are still
reachable in one disclosure, and only one set of controls exists at every width.

## Step 4 — Keep keyboard focus within the open phone navigation drawer (fork #19)

**Root cause.** `src/ui/shell/AppShell.tsx:26-40` — when the drawer opens, focus moves to the
first navigation item and Escape closes it. Nothing keeps Tab inside: `.shell-main` (the header and
the page) is still focusable, and the scrim (`src/ui/shell/AppShell.tsx:56`) only covers it
visually. Focus becomes invisible on obscured content while the drawer is open.

**The fix.** Trap the focus in the drawer while it is open, in the same effect that already handles
Escape.

1. On Tab, collect the drawer's focusable controls (`a[href]`, `button:not([disabled])`,
   `[tabindex]:not([tabindex="-1"])`) inside `#sidebar` that are visible, and wrap: Tab on the last
   one moves to the first, Shift+Tab on the first moves to the last.
2. Keep the existing behaviour: Escape closes the drawer and focus returns to the button that
   opened it (already implemented at `AppShell.tsx:38`).
3. The scrim keeps `tabIndex={-1}` so it is never a stop in the tab order.

**Tests.**

- Browser, `e2e/a11y.spec.ts` (the phone drawer check): open the menu at 390 px, press Tab more
  times than the drawer has controls and assert focus is still inside `#sidebar`; press Shift+Tab
  from the first control and assert it wraps to the last; press Escape and assert focus returns
  to the Menu button.

**Risk.** None to the layout. The check is additive to an existing spec.

**Done when** Tab and Shift+Tab cannot leave the open drawer, and Escape still restores focus.

## Step 5 — Keep the landing terrain visible after changing map layers (fork #20)

**Root cause.** `src/scene/Terrain.tsx:345` — `<group scale={[1, exaggeration, 1]}
visible={layers.terrain}>` reads the map's layer state from the app store. `HomeScene`
(`src/scene/HomeScene.tsx:147`) renders that same `Terrain` component, so turning Terrain off on
the map hides the landing page's featured model, and the landing page has no control to turn it
back on.

**The fix.** Visibility becomes the caller's decision, not a global side effect.

1. `src/scene/Terrain.tsx`: take an optional `visible?: boolean` prop and use
   `visible ?? layers.terrain`. The map passes nothing, so its Terrain switch still works.
2. `src/scene/HomeScene.tsx`: pass `visible` so the landing model is always drawn.

**Tests.**

- Browser, new check in `e2e/home.spec.ts` or a new `e2e/landing-terrain.spec.ts`: open
  `#/monitor`, switch Terrain off, go back to the landing page, and assert the model is still
  drawn. A pixel probe of the hero canvas (compare the spread of the rendered pixels) tells a
  drawn model from an empty one; the same probe technique is already used in this repo's shader
  checks.
- Browser: on `#/monitor`, switching Terrain off still hides the terrain, and switching it on
  brings it back.

**Risk.** The `Terrain` component is used in two places only (`TerrainScene` for the map,
`HomeScene` for the landing page), so the prop has exactly two call sites.

**Done when** the landing model survives a map layer change, the map's Terrain switch still
works, and neither page's other layers change.

## Step 6 — Bring the live mine into the phone landing view (fork #23)

**Root cause.** `src/index.css:1503-1520` — `.hero` is a single-column grid below 64rem, and
`src/ui/HomePage.tsx:193` puts `.hero-copy` (headline, paragraph, actions, figures) before
`.hero-stage` (the model, line 236). `.hero-stage` also has `min-height: 540px`, so on a 390 × 844
phone the copy and the figures fill the first screen and the model starts below the fold.

**The fix.** On narrow screens the model comes first and the introduction is tightened.

1. `src/index.css`: below 64rem, order `.hero-stage` before `.hero-copy` (`order: -1` on the
   stage) and give the stage a smaller `min-height` (about 46vh) so a meaningful part of it is
   inside the first screen. At 64rem and up the two-column layout is unchanged.
2. `src/ui/HomePage.tsx`: at phone width, shorten the hero paragraph and the figure list so the
   dashboard action and the route to the 3D map both stay in the first screen under the model.
   The headline keeps its meaning and the `SIMULATED DATA` badge stays visible.

**Tests.**

- Browser, `e2e/home.spec.ts`: at 390 × 844 and 800 × 900, assert the hero stage's box intersects
  the first viewport (its top is above the fold and its height is at least 200 px), and that the
  "Open the dashboard" and "Explore the 3D map" links are still reachable.

**Risk.** The landing page's own tests (`e2e/home.spec.ts`) click the model buttons; a reordered
hero does not change the buttons. `e2e/badge.spec.ts` checks the badge does not overlap the brand
at 390 px — the badge is in the sticky landing bar, which is unaffected.

**Done when** the model is partly visible without scrolling at 390 and 800 px, and both calls to
action are still in the first screen.

## Step 7 — Keep Overview metric labels and provenance clear on phones (fork #24)

**Root cause.** `src/ui/pages/OverviewPage.tsx:125` — the `<dt>` is
`flex items-center justify-between gap-2`, so the provenance tag sits beside the label. The
`.figures` grid (`src/index.css:1148`) is two columns below 64rem, so at 390 px "Removed outside
the lease" wraps against its tag and the two compete.

**The fix.** Stack the label and its tag on narrow screens.

1. `src/ui/pages/OverviewPage.tsx`: the `<dt>` becomes `flex flex-wrap items-baseline
justify-between gap-x-2 gap-y-1 max-sm:flex-col max-sm:items-start`. From `sm` up the label and
   tag stay on one line; below it the tag sits under the label.
2. Nothing else changes: the value and the note keep their order, so the reading order is label,
   value, note, tag.

**Tests.**

- Browser, new check in `e2e/dashboard.spec.ts` or a new `e2e/overview-metrics.spec.ts`: at
  390 px, assert the "Removed outside the lease" label's box does not overlap the provenance
  tag's box, and that the tag sits below the label.

**Risk.** `e2e/a11y.spec.ts` scans the Overview at 1280 px; the change is width-gated, so the
desktop layout is identical.

**Done when** at 390 px no label wraps into its tag, and at 1280 px nothing moves.

## Step 8 — Clarify uncertainty thresholds and simulated compliance claims (fork #17)

This is the largest step and the one that matters most: it is the issue about what the app claims.
The engine's arithmetic does not change. Only the explanation does.

**Root cause — the thresholds.** The app teaches one threshold and the engine uses another.

- `src/ui/home/NoiseCheck.tsx:34` — "PitWatch only reports a change larger than {K}σ". The engine's
  R1/R3 test is `minChange + k·σ` (`changeThreshold`, `src/compliance/change.ts:6`, from
  `src/compliance/config.ts:21`), so with the calculator's default σ1 = σ2 = 0.05 m the noise band
  is about 0.14 m while the reporting threshold is about 0.64 m. The default 0.40 m example is
  distinguishable from noise but **not** reportable.
- `src/ui/home/NoiseCheck.tsx:110` — the verdict reads "Real change" or "Could be noise", and
  `isSignificant` compares against `k·σ` only.
- `src/ui/pages/RulesPage.tsx:20,26,43` — the three conditions are written as "> 2σ" tests and the
  introduction repeats the same claim. R2 is a different test: the surface against the approved
  floor, compared with the current survey's uncertainty, with no minimum-change allowance.

**Root cause — the claims.** The app asserts real-world breaches for a synthetic scenario.

- `src/ui/HomePage.tsx:194` — the headline "See where the digging broke the permit."
- `src/ui/HomePage.tsx:63` — "Each pin is a place that breaks the lease."
- `src/ui/pages/RulesPage.tsx:83` — "Clear in this demo" is honest; the finding labels
  ("violation", "warning") are not explained as the demo engine's classifications.
- `src/ui/pages/FindingsPage.tsx` — the empty state and the labels need the same framing.

**The fix.**

1. `src/ui/home/NoiseCheck.tsx`: show three figures, not two — combined σ, the noise band
   (`k·σ`), and the R1/R3 reporting threshold (`minChangeM + k·σ`) — all read from
   `COMPLIANCE_CONFIG`, so there is no second hardcoded threshold. The verdict becomes three-way:
   within the modelled noise band, distinguishable from the noise, or reportable under R1/R3.
   Retitle "When is a change real?" to "When is a change reportable?".
2. `src/ui/home/NoiseCheck.tsx`: explain the depth rule separately, in its own line: R2 compares
   the ground with the approved pit floor using the current survey's uncertainty, and does not use
   the R1/R3 minimum-change allowance.
3. `src/ui/home/NoiseCheck.tsx`: the sliders and the two presets update the inputs, the thresholds
   and the wording together, so no stale explanation can survive a preset.
4. Copy pass, so the app describes simulated inspection guidance rather than a proven breach:
   the landing headline and the "breaks the lease" line in `src/ui/HomePage.tsx`, the rule
   conditions and their tests in `src/ui/pages/RulesPage.tsx`, the labels and the empty state in
   `src/ui/pages/FindingsPage.tsx`, and a matching line in `src/ui/pages/AboutPage.tsx`. The
   `SIMULATED DATA` badge, the provenance tags and the ± notation stay as they are.
5. Nothing in `src/compliance/` changes. `changeThreshold` (`src/compliance/change.ts:6`) already
   computes `minChangeM + k·σ` from the live config, so the Uncertainty page reads the engine's own
   helper and the two cannot drift apart. The seeded snapshot must not move.

**Tests.**

- Browser, new `e2e/uncertainty.spec.ts`: on the Uncertainty page, assert the noise band and the
  R1/R3 reporting threshold are shown as two separate values, assert the 0.40 m default is
  described as distinguishable from noise but not reportable, move a slider and press a preset and
  assert the values and the wording change together, then assert the simulated-result wording on
  the landing, Findings, Permit rules and About pages.
- The existing pure tests in `src/compliance/uncertainty.test.ts` already cover the arithmetic; do
  not duplicate them.
- The compliance snapshot test must pass unchanged — the engine did not move.

**Risk.** This is a copy change across five files; the axe scans on those pages must still pass
(the wording gets longer, so contrast and wrapping need a look at 390 px). The landing headline
is the first thing anyone reads, so it is the one line worth arguing about.

**Done when** the two thresholds are shown and named separately, the 0.40 m example is described
correctly, no page claims a real permit was broken, and the snapshot test still passes.

## Step 9 — Remove unreferenced source image assets (fork #25)

**Root cause.** Two Vite template leftovers are in the tree and referenced nowhere:

- `src/assets/hero.png` — 13,057 bytes
- `src/assets/react.svg` — 4,126 bytes

A repository-wide search (`git grep` for each name, plus every import of `src/assets`) finds no
code, style, test, documentation or dynamic reference. Together they are the ~17 KB the issue
mentions. `public/logo.svg` is referenced only from a comment in `src/ui/icons.tsx:59`, but it is
a public brand asset and stays.

**The fix.** `git rm src/assets/hero.png src/assets/react.svg`. If `src/assets` is then empty,
remove the directory. Nothing else changes.

**Tests.** None — there is nothing to test. Verification is that `git grep` finds no remaining
reference, `npm run verify` passes, `npm run build` succeeds, and the built bundle does not
change (same file list, no new chunks).

**Risk.** None. The files are not in the bundle today, so removing them cannot change what the
app serves.

**Done when** the two files are gone, the search is empty, and the build output is unchanged.

## Sequence

1. Step 1 (#18) — the only correctness and performance risk; the pure module goes first.
2. Step 2 (#21) — the map is the screen; the layout default changes here.
3. Step 3 (#22) — the phone drawer, next biggest complaint.
4. Step 4 (#19) — the focus trap, in the same file the drawer already owns.
5. Step 5 (#20) — one prop on the terrain component.
6. Step 6 (#23) — the landing layout, before the copy in step 8 lands on it.
7. Step 7 (#24) — the Overview metric grid.
8. Step 8 (#17) — the copy and threshold work, on settled layouts.
9. Step 9 (#25) — the cleanup, last.

Steps 5 and 6 both touch the landing page and step 8 touches its copy, which is why the copy
comes last. Steps 2 and 3 both change what is visible on the map, and each has its own browser
check.

## What this plan deliberately does not do

- It does not change the compliance engine, the configuration defaults, the severity thresholds,
  the finding data, the survey fixtures or the seeded snapshot.
- It does not add a backend, real mine data, a permit-configuration workflow or any claim that
  the app can determine actual compliance.
- It does not redesign the visual identity. The changes are layout and wording inside the
  existing identity.
- It does not implement the rest of `docs/competition-ui-ux-improvement-plan.md` (the P2 contrast
  pass and the P3 guided demo). Those stay proposals.

## Verifying this plan

Before the first step lands:

- `npm run verify` and `npm run test:e2e` are green on `main` (they were, at 131 unit tests and
  51 browser checks, when the issues were copied).
- The nine fork issues exist with the bodies above, and this file is at `docs/plan-open-issues.md`
  as their provenance line says.

After each step:

- The step's own checks pass, the full `verify` and `test:e2e` pass, a browser check at the
  widths the step touches shows no overflow and no console errors, and `AGENTS.md` has a new
  Update log entry naming the issue, the change and the evidence.
