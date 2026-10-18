# PitWatch 3D: notes for Claude

3D mine monitoring and regulatory compliance demo. Frontend only, no backend. Every value is synthetic and labelled so.

## Working rules

- After every feature: run the checks below, add an entry to **Update log**, commit (Conventional Commits), push to `origin/main`, then ask the user before starting the next feature.
- UI must stay honest: SIMULATED DATA badge, provenance tag on values (measured | derived | simulated | unverified), ± uncertainty, no hardcoded alerts, no dead buttons. Unbuilt controls are disabled with a tooltip naming the milestone that enables them.
- `src/domain`, `src/data`, `src/geo`, `src/compliance` are pure TypeScript. ESLint blocks react, three, @react-three/* and zustand imports there.

## Checks

```sh
npm run typecheck && npm run lint && npm test && npm run build && npm run format:check
```

Then a browser check at 1440, 1100 and 800 px wide (dev server: `npx vite --port 5179 --strictPort`).

## Stack

Vite 8, React 19, TypeScript strict, Tailwind v4 (tokens in `@theme` in `src/index.css`), Zustand, Vitest, three 0.186 + @react-three/fiber 9 + drei 10 (scene is lazy-loaded).

## Design

- Monitor layout: full-screen 3D canvas under a sky gradient; a `ViewOffset` shifts the projection so the model centres in `.stage` (the area the side cards leave free, click-through except its controls). Left "Map" card (layers, key, exaggeration), right details card (tabs), camera presets + compass top-right, scale bar top-left, timeline pill bottom-centre. Soft `.card` surfaces (8 px radius, shadow); strata stripes only in the top-bar rule and the home page.
- Each fact appears once: mine name in the top bar, survey dates in the timeline and the Surveys section, nothing duplicated in map overlays.
- Home page is a scroll story on a pinned map (`#/`), monitor at `#/monitor`. Topographic look: limestone paper, slate ink, map-water blue (`accent`) for interaction, haematite `oxide` and `ochre` for identity only (never status).
- Type: Archivo variable; `.cond` (font-stretch 72%) for headings and big figures. JetBrains Mono for coordinates and dates.
- All colours are tokens in `@theme`; components use `var(--color-*)` or `color-mix(...)`. Never hardcode a colour in a component.
- Severity colour always pairs with a glyph shape: warning = triangle, violation = octagon, critical = diamond.

## Milestones

|     | Milestone                                                                               | Status |
| --- | --------------------------------------------------------------------------------------- | ------ |
| M1  | App shell, tooling, UI                                                                  | done   |
| M2  | Domain types, geo utils, seeded synthetic terrain + tests                               | done   |
| M3  | 3D terrain view                                                                         | done   |
| M4  | Compliance engine R1 boundary, R2 depth, R3 dumping (k=2, σ=√(σ1²+σ2²)) + snapshot test | next   |
| M5  | Overlays                                                                                |        |
| M6  | Panels, picking, measure, profile, epoch slider                                         |        |
| M7  | Polish                                                                                  |        |
| M8  | README with Mermaid diagram, Vercel/Netlify config                                      |        |

## Update log

Newest first.

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
