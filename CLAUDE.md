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

Vite 8, React 19, TypeScript strict, Tailwind v4 (tokens in `@theme` in `src/index.css`), Zustand, Vitest. three.js / R3F arrive in M3.

## Design

- Mission-control layout: full-bleed viewport, floating glass panels (layer panel left, side panel right, timeline bottom), HUD corner brackets on `.stage`.
- Topographic survey-sheet look: limestone paper base, slate ink, map-water blue (`accent`) for interaction, haematite `oxide` and `ochre` for identity and strata bands only (never status). Contour-line backdrop, double map neatline around the stage, panels are paper `.sheet`s with a strata band (`--strata`) down the left edge.
- Type: Archivo variable; `.cond` (font-stretch 72%) for headings and big figures. JetBrains Mono for coordinates and dates.
- All colours are tokens in `@theme`; components use `var(--color-*)` or `color-mix(...)`. Never hardcode a colour in a component.
- Severity colour always pairs with a glyph shape: warning = triangle, violation = octagon, critical = diamond.

## Milestones

|     | Milestone                                                                               | Status |
| --- | --------------------------------------------------------------------------------------- | ------ |
| M1  | App shell, tooling, UI                                                                  | done   |
| M2  | Domain types, geo utils, seeded synthetic terrain + tests                               | next   |
| M3  | 3D terrain view                                                                         |        |
| M4  | Compliance engine R1 boundary, R2 depth, R3 dumping (k=2, σ=√(σ1²+σ2²)) + snapshot test |        |
| M5  | Overlays                                                                                |        |
| M6  | Panels, picking, measure, profile, epoch slider                                         |        |
| M7  | Polish                                                                                  |        |
| M8  | README with Mermaid diagram, Vercel/Netlify config                                      |        |

## Update log

Newest first.

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
