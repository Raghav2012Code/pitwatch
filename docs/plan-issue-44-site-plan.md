# Plan: redesign the Overview site plan (fork #30 / parent #44)

The issue says the figure "reads as a change mask painted on a square". Measured against
`src/ui/panels/SitePlan.tsx` and `src/ui/pages/OverviewPage.tsx`, that is fair: one 2.4 M pixel
canvas data-URL at 92% opacity, the fixture rectangles for the zones, a flat ground fill, pins
sized in metres, and the scale bar and north arrow sitting on the drawing.

This plan rebuilds what the figure shows, not its stroke widths. It changes no scenario data, no
compliance output and no other page: the same `change`, `limits` and `findings` the 3D map uses.

## Ground rules

- Pure geometry lives in `src/geo` (no React, three or zustand there, enforced by ESLint). The
  figure stays a component; anything that can be tested without a browser is a pure function.
- No new dependency. Marching squares already exists in this repo (`insetSegments` in
  `src/geo/polygon.ts`) and is the technique the issue names.
- Colours come from `@theme` tokens only. Severity keeps its glyph (triangle / octagon / diamond),
  never colour alone.
- The change layer is only cells that beat the noise threshold, as today. Nothing in the figure is
  invented to fill space: where a layer cannot be made honestly, it is left out.
- `npm run verify && npm run test:e2e` before the push, browser check at 1440, 1100, 800 and
  390 px, then the AGENTS.md update-log entry and the ask before the next issue.

## Deliberate non-goals

- **No scenario change.** A bigger site and real zone outlines are #45; this figure draws whatever
  geometry exists, so it survives that issue without a rewrite. The zones stay rectangles here and
  are labelled as permitted extents.
- **No hillshade.** A shaded relief would have to be a raster, and the issue's done-when line says
  no data-URL raster in the figure. Contours carry the ground instead.
- **No new page, route or store state.** Everything reads from `useTerrain` slices the figure
  already selects.

## What the figure has to answer

1. Where is the mine inside its lease? — lease loudest, permitted extents next, ground context faint.
2. What changed? — cut and fill as vector shapes, on contoured ground.
3. Where are the findings? — an outlined area, its id in text, and a pin that is a real hit target.

## Steps

### 1. Pure geometry: `src/geo/plan.ts` (new) + `src/geo/plan.test.ts`

Four functions, each small and independently testable:

- `maskRings(mask: Uint8Array, grid: GridSpec): Vec2[][]` — marching squares at the half-cell
  boundary over a 0/1 mask, rings walked anticlockwise, holes returned as their own rings so the
  path can use `fill-rule="evenodd"`. Used for the change classes and for a finding's cell set.
- `contourSegments(elevations: Float32Array, grid: GridSpec, interval: number): { rl: number; d: Segment[] }[]`
  — the same walk over the elevation field, grouped by level. Linear interpolation along the cell
  edge so a 4 m cell does not show as a staircase.
- `planTransform(grid: GridSpec)` — the single place that turns local metres into SVG user units
  (north up) and, for the marker layer, into percentages of the figure.
- `changeRings(change: ExcavationState)` — the two masks through `maskRings`, so the component never
  touches grid indices.

Marching squares on 513² cells is ~263 k cell reads per layer: three layers (cut, fill, contours at
1 m or 5 m) is under 1 M reads, once per data change, memoised. If the measured cost is over a
frame, drop contour density to every second cell before doing anything more clever.

**Tests.** A single cell yields one closed ring whose shoelace area is one cell; an L-shaped mask
yields one ring; a ring with a hole yields two; the summed area of `changeRings(change)` matches
`excavated`/`filled` cell counts × cell area within one cell; a synthetic plane gives evenly spaced
contour levels and a cone gives closed rings of decreasing size; contours never leave the grid.

### 2. Rebuild `src/ui/panels/SitePlan.tsx`

- **Header:** title, `ProvenanceTag value="derived"` on the figure itself (not beside the button),
  `Explore in 3D` on its own. Legend moves into the figure's margin band.
- **Ground:** current survey contours from step 1, two weights (5 m minor, 25 m index), faint ink,
  drawn under everything. The pit reads as closed depressions, the waste dump as a mound, the haul
  ramp as the gap through the benches — all from elevation, nothing drawn by hand.
- **Change:** `changeRings` paths filled with the `OVERLAY.cut` / `OVERLAY.fill` tokens, hairline
  stroke in the same hue, `fill-rule="evenodd"`. The `<image>` data-URL path is deleted.
- **Findings:** for each finding, `maskRings` of its `cells` drawn as an outline in its tone, plus
  its id as text next to the glyph. The existing pin becomes the click target on top, not the only
  evidence.
- **Extents:** lease at full weight, the two zones below it, each labelled with its
  `MINE.approvedZones` name. Order of ink is lease → zones → change → contours → markers.
- **Margin band:** scale bar, north, mine name, current survey date and `grid 513 × 513 at 4 m`,
  drawn outside the map field, so nothing sits on the lease.

### 3. Marker layer at screen size

Markers move out of the metre-scaled SVG into an absolutely positioned HTML layer over it, one
`<button>` per finding at `left`/`top` percentages:

- Size in CSS pixels, so a pin is the same on a phone as on a desktop: 44 px hit area below `md`,
  smaller disc above.
- Collision handling in pixel space: one `ResizeObserver` on the figure gives metres-per-pixel, and
  the existing greedy nudge (`placePins`) runs against 44 px instead of 104 m. Leader lines only
  where a pin was nudged.
- Keyboard and touch come free with a real `<button>`: Enter and Space both activate it, focus ring
  is a token, `aria-pressed` marks the selected finding. The `role="button"` + `tabIndex` +
  `onKeyDown` trio in the current file goes away.
- The map's selected finding is marked on the plan (`aria-pressed`), as today, and selecting a pin
  still calls `selectFinding` then `navigate('monitor')`.

### 4. CSS

Replace the `.plan-*` block in `src/index.css`: figure frame, ground, contour minor/index weights,
change fills, extent weights, label type (JetBrains Mono for the ids, Archivo for the zone names),
margin band. Every colour a `var(--color-*)`; no literal hex. Reduced motion: no transitions at all
in the figure, so there is nothing to guard.

### 5. Tests and browser checks

- `src/geo/plan.test.ts` — the unit tests in step 1.
- `e2e/site-plan.spec.ts` — keep its three passing checks (pin opens its finding; Enter and Space;
  phone tap) and add: the figure contains no `<image>`; each finding id is visible as text; at
  390 px every pin's box is at least 44 × 44 px; the scale bar and north arrow boxes do not
  intersect the lease path's box; no horizontal overflow at 390, 800, 1100 and 1440 px.
- `e2e/overview-metrics.spec.ts`, `dashboard.spec.ts`, `a11y.spec.ts` — rerun, not rewritten. If a
  selector moves, the update is part of this commit and the log entry says so.
- A browser review at the four widths, keyboard only, and with `prefers-reduced-motion: reduce`.

### 6. Record, commit, push

Update-log entry with the measured contour cost, the pin sizes at 390 and 1440 px, and any check
whose selector changed. One commit, Conventional Commits, then ask before the next issue.

## Done when

The issue's own list, which this plan is written to satisfy: the plan reads without hovering or the
key; the change layer is vector with a token colour; findings show an area and an id in text; pins
are 44 px at 390 px with no overflow at any of the four widths; furniture is off the drawing;
selection and keyboard still work; `npm run verify && npm run test:e2e` pass; the design rules in
`AGENTS.md` hold.

## Risks

- **Contour cost.** 513² on every load; measured before the UI work if it turns out noticeable.
- **Labels at 390 px.** Five ids in a 390 px figure will collide. If nudging cannot solve it, drop
  the id labels below `sm` and keep the area outlines plus the glyph, and say so in the log rather
  than shipping overlapping text.
- **The two rectangles.** The pit zone still overlaps the lease edge at the east because the fixture
  says so. It stays drawn literally; the label and the key call it a permitted extent, and #45 is
  the issue that changes the outline.
