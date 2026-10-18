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
- Light "daylight survey" palette. All colours are tokens in `@theme`; components use `var(--color-*)` or `color-mix(...)` with them. Never hardcode a hex or rgb in a component.
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

### 2026-10-18: lighter palette

- Switched from the dark control-room palette to a light one: cool grey-white base `#e6ecf1`, near-white panels, deep teal accent `#0a7f96`, darker severity hues for contrast on light surfaces.
- Replaced hardcoded rgb overlays in `src/index.css` with `color-mix` on tokens, so the palette lives only in `@theme`.
- Added this file.

### Earlier

- `fa8e3cb` mission-control redesign: floating glass HUD, animated pit schematic labelled "Schematic, not survey data".
- `ad1895d` app shell and tooling. `9a1b99d` scaffold.
