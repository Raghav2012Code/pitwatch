# Competition UI/UX Improvement Plan

**Status:** First P0 complete on `ui-redesign`; priorities after it remain proposed.

**Completed feature:** P0 — Finding selection reveals its evidence.

**Based on:** PitWatch 3D interface audit, 21 October 2026

**Goal:** Make the existing simulated mine-monitoring demo clear, credible, quick to present, and usable on laptop and phone screens without losing its surveying identity.

## Direction

Keep the current limestone and slate palette, mine-specific graphics, live terrain, severity glyphs, and report-style pages. Improve the evidence flow first, then align explanations with the compliance engine, open up the map at laptop widths, and refine mobile and presentation details.

Deliver one feature at a time. For each feature, run the repository checks, update the AGENTS.md Update log, commit using Conventional Commits, and push the active review branch. Stop for the user's direction before starting the next feature. Only the first P0 is authorized; the remaining sequence is proposed.

## Priority and sequence

### P0 — Finding selection reveals its evidence

**Status:** Complete on `ui-redesign`.

**Outcome:** Choosing “Show on map” always puts the visitor on a map state where that finding can be seen and understood.

**Work:**

- Ensure the current survey is shown when the selected finding overlay exists only on that epoch.
- Ensure the terrain and finding layers required to show the selected item are enabled.
- Frame and visually distinguish the selected finding. Keep the selected item synchronized between the map and the findings list.
- On phones, close or collapse the details drawer after selection and leave a clear way to reopen the finding details.
- Make the accessible map description reflect the active survey and the overlays currently visible.

**Acceptance:**

- From Baseline, with Findings switched off, selecting any finding opens a view where the selected finding is visible and identifiable.
- The selected finding is consistent across Overview, Findings, and the map.
- The phone flow leaves enough of the terrain visible to locate the finding; reopening details retains the selection.
- The accessible description does not claim hidden findings are marked.

**Validation:** Add focused browser coverage for baseline selection, disabled layers, selecting a second finding, and the phone return/reopen path. Check the view manually at 1440, 1100, 800, and 390 px.

### P0 — Compliance and simulation language matches the engine

**Outcome:** A visitor can distinguish survey noise, the configured report threshold, possible findings, and confirmed real-world compliance.

**Work:**

- On Uncertainty, show the noise threshold and PitWatch reporting threshold as separate values. With the current defaults, explain the 0.14 m two-sigma noise band and the approximately 0.64 m reporting threshold.
- Describe the outcome as statistically distinguishable from modeled survey error, not proof that a real-world change or breach occurred.
- Explain that the configured minimum change allowance applies to boundary and dumping checks; describe the depth rule’s uncertainty input separately.
- Replace “broke the permit” and “breaks the lease” claims with language appropriate to synthetic findings that guide inspection.
- Label the three example conditions as this demo’s simulated permit rules.

**Acceptance:**

- Displayed values are derived from the same configuration and uncertainty values used by the engine; no explanatory threshold is duplicated as a hardcoded constant.
- The default 0.40 m example is described consistently with both the 0.14 m noise band and 0.64 m reporting threshold.
- Landing, findings, rules, and About pages consistently state that data and results are simulated and findings do not prove a breach.
- The existing SIMULATED DATA badge, provenance labels, and uncertainty notation remain visible where relevant.

**Validation:** Cover threshold calculations with meaningful tests, check slider changes and preset buttons in the browser, and review copy against the compliance code and each rule’s behavior.

### P1 — Give the map room on laptop screens

**Outcome:** The mine and selected evidence remain the visual focus while map tools are easy to reach.

**Work:**

- At widths where both floating panels crowd the stage, show one primary panel at a time or make the layer panel compact by default.
- Provide clear visible buttons to switch panels. Keep keyboard shortcuts as an additional route and show their labels or tooltips.
- Recalculate model framing from the unobstructed map area when panels change.
- Provide a visible way to restore the default map view.

**Acceptance:**

- At 1100 px, the central map is no longer squeezed between two full panels; no essential map action is hidden.
- At 1440 px, users can still access findings and layers without losing their context.
- Hiding or restoring a panel does not cover the scale, camera controls, timeline, or selected finding.
- Keyboard focus and pressed/expanded states describe panel visibility correctly.

**Validation:** Check 1440, 1100, 800, and 390 px. Use screenshot review and pointer checks around camera controls, scale bar, timeline, and panel toggles.

### P1 — Make the phone map task-first

**Outcome:** A phone visitor can see a finding, locate it on terrain, and return to its evidence without scrolling through unrelated controls.

**Work:**

- Separate Layers from Findings and Inspector, using a compact disclosure or a clearly labelled section switch.
- Move rarely changed layer controls behind that section; keep the primary finding content near the top.
- Add a compact key for active map colours, elevation units, overlays, and severity glyphs.
- Collapse the drawer after “Show on map,” retaining a small selected-finding affordance.

**Acceptance:**

- Opening Details shows a useful finding summary without first scrolling past all eight switches.
- The active map key is reachable on mobile and updates with enabled layers.
- “Show on map” reveals terrain; the selected finding remains available by reopening Details.
- No content is clipped on short phone viewports or at 200% browser zoom.

**Validation:** Check 390 px and a short viewport, test every switch and tab with touch-sized interactions, then scan the open and closed states for accessibility issues.

### P1 — Keep keyboard focus inside the navigation drawer

**Outcome:** Keyboard users can open and close phone navigation without focus moving behind it.

**Work:**

- Make background content unavailable to focus while the drawer is open.
- Keep focus within the open drawer, support Escape, and restore focus to the opening control when it closes.
- Manage focus sensibly after navigation changes the route.

**Acceptance:**

- Forward and backward Tab remain in the open drawer.
- Escape closes it and restores focus to Menu.
- Choosing a route closes the drawer and moves the user to a meaningful heading or main-content starting point.
- Screen readers receive a clear drawer name and open/closed state.

**Validation:** Browser checks cover Tab, Shift+Tab, Escape, route selection, and keyboard-only access. Run axe on the open and closed drawer.

### P2 — Improve contrast and presentation readability

**Outcome:** Findings remain easy to read at a glance on a laptop and comfortable to operate on a phone.

**Work:**

- Adjust warning, violation, and critical legend foreground/background combinations to provide contrast margin.
- Increase finding explanations, primary metrics, provenance, and map actions where the current small sizing weakens scanning.
- Give “Show on map” actions adequate padding and a clear focus state; keep coordinates visually secondary.
- Use a hierarchy that makes status, rule, main evidence, and inspection action distinct.

**Acceptance:**

- Settled Findings legend passes contrast checks at desktop and phone widths.
- Critical finding evidence is readable in the 1100 px map panel without the text colliding with controls.
- Map actions are visibly interactive and comfortably tappable on the phone layout.
- Severity continues to pair colour with the existing shape glyphs.

**Validation:** Run an axe scan on settled screens, inspect Findings and Overview at 1440, 1100, 800, and 390 px, and verify keyboard focus.

### P2 — Bring the model higher on narrow landing pages

**Outcome:** Tablet and phone visitors encounter the live mine sooner without losing the explanation or either entry point.

**Work:**

- Shorten the introductory copy at narrow widths.
- Move a compact live model preview higher in the page.
- Keep clear paths to both the dashboard and 3D map, with the simulated-data disclosure visible.

**Acceptance:**

- At 800 and 390 px, a meaningful portion of the live model appears earlier than in the current layout.
- The primary action is clear, the secondary route remains easy to find, and no badge or control overlaps the brand.
- Desktop landing composition remains intact.

**Validation:** Review settled model screenshots at 1440, 800, and 390 px and test both entry links by keyboard and touch.

### P3 — Optional guided competition demo

**Outcome:** A presenter can show the product’s core method in a short, repeatable sequence.

**Work:**

- Offer an optional, manually advanced sequence: compare surveys, reveal measured change, open one finding, and show its permit evidence.
- Provide a clear reset to the normal dashboard state.
- Do not auto-advance, hide the simulation disclosure, or imply the demo connects to real operations.

**Acceptance:**

- Every step uses the existing synthetic surveys and engine results.
- The presenter can exit at any point and return to the normal map.
- The demo works at laptop and phone widths and does not trap keyboard or screen-reader users.

**Validation:** Rehearse the full sequence at 1440 and 1100 px, then verify phone layout, keyboard controls, and reset behavior.

## Delivery gates

For each feature, use the repository’s required checks:

```sh
npm run verify && npm run test:e2e
```

Then review the browser at 1440, 1100, and 800 px as required by AGENTS.md; include 390 px for phone work. Capture the updated screen, inspect the relevant interaction, add an Update log entry, commit, push the active review branch, and stop for the user’s direction before starting the next feature. This redesign is under review in PR #2, so its feature commits belong on `ui-redesign` until that PR is merged.

The completed feature passes `npm run verify` (131 unit tests across 17 files) and `npm run test:e2e` (51 production browser checks). Screenshots and interaction review at 1440, 1100, 800, and 390 px confirmed visible selected evidence, closed and reopened phone details, no horizontal overflow, and no browser errors. A development browser probe also confirmed that React StrictMode no longer clears the finding camera request on map entry.
