# Plan: fix #46, scene colours out of the components

**Delivered upstream on 2026-10-27 in `d3be126`**, before this fork got to it, so the plan below is
kept as the record of how the work was scoped. Upstream took steps 1–3 with different names: one
`LIGHT` block instead of `SCENE`, a plain `BACKDROP_FALLBACK` constant instead of a
`backdropColour()` helper, and the existing `OVERLAY.lease` for the home lease line. Step 4 (the
lint guard that keeps hex out of `.tsx`) was not added, so `npm run lint` still would not catch a
new literal; the "no literal remains" claim rests on the one-off `git grep` in the upstream log.

**Step 4 landed on 2026-10-29 as ticket #32**, with a wider scope than planned: the same rule covers
`src/**/*.ts` as well as `.tsx`, because the two inks that had actually been hiding were in the PDF
report's `.ts` module. The plan's `Literal`-only approach was kept, plus static `rgb()`/`hsl()`
strings, and the probes that proved it fires are recorded in the update log.

Upstream issue `abivan100-stack/pitwatch-3d#46`. AGENTS.md says every colour is a token in
`@theme` and a component never hardcodes one. Seven literals in the two 3D scene files break that.
This plan removes them without changing a single pixel: every value is copied verbatim, so the
scenes must render exactly as they do now, and that is checkable.

## What is actually there (verified at `2b4dc32`, not taken from the issue)

| File                         | Line  | Literal              | What it is                                     |
| ---------------------------- | ----- | -------------------- | ---------------------------------------------- |
| `src/scene/TerrainScene.tsx` | 15-17 | `#e8e4d9`            | fallback for `--color-backdrop` in `horizon()` |
| `src/scene/TerrainScene.tsx` | 76    | `#e4ebee`, `#6b5a48` | hemisphere light sky and ground                |
| `src/scene/TerrainScene.tsx` | 79    | `#fff0dc`            | key light                                      |
| `src/scene/HomeScene.tsx`    | 24-26 | `#e8e4d9`            | the same helper again, named `backdrop()`      |
| `src/scene/HomeScene.tsx`    | 160   | `#e4ebee`, `#6b5a48` | the same hemisphere light                      |
| `src/scene/HomeScene.tsx`    | 163   | `#fff0dc`            | the same key light                             |
| `src/scene/HomeScene.tsx`    | 184   | `#fbfaf6`            | home-page lease line                           |

`git grep -nE "#[0-9a-fA-F]{3,8}|rgba?\(" -- "src/**/*.tsx"` returns exactly these seven lines and
nothing else, so the issue's list is complete.

Three facts that decide the shape of the fix:

- **`#fbfaf6` is already a constant.** `OVERLAY.lease` in `src/scene/palette.ts:43` holds it, and
  `Overlays.tsx` and `PickLayer.tsx` already use it for the monitor's lease line. Line 184 is the
  one place that repeats the value instead of importing it.
- **`palette.ts` is the right home.** It is the file that already exists "because three.js needs
  numbers, and the UI legend builds its gradient from the same stops". It is the only source `.ts`
  file with hex literals (20 of them; `scene.test.ts` has one inside a regex assertion), so it is the
  sanctioned place for colour values.
- **The unit tests run in node** (`vite.config.ts`: `environment: 'node'`), so a helper that reaches
  for `document` needs a guard, and `scene.test.ts` already imports `palette` and passes.

Not part of the fix: `src/ui/viewport/MapHud.tsx:165` writes `rgb(${k.rgb.join(' ')})`, which is a
colour computed from `rampAt()` for the elevation key. It is not a literal, and the lint rule below
does not match it.

## Steps

### 1. `src/scene/palette.ts`: one definition, next to the ones already there

```ts
/**
 * Scene lighting and the page backdrop. Three cannot read `var(--color-*)`, so the value is named
 * here once and both scenes share it; `backdrop` mirrors `--color-backdrop` in `@theme`.
 */
export const SCENE = {
  /** `--color-backdrop`: survey paper, the colour the fog fades into. */
  backdrop: '#e8e4d9',
  /** Hemisphere light, from above: cool sky fill. */
  sky: '#e4ebee',
  /** Hemisphere light, from below: warm dust bounced off the ground. */
  ground: '#6b5a48',
  /** Key light: a warm, low sun from the north-west. */
  sun: '#fff0dc',
} as const

/**
 * The backdrop colour at runtime: the CSS token when the document is there, the value above
 * otherwise (the unit tests run in node).
 */
export const backdropColour = () =>
  (typeof document === 'undefined'
    ? ''
    : getComputedStyle(document.documentElement).getPropertyValue('--color-backdrop').trim()) ||
  SCENE.backdrop
```

The values are copied from the code being replaced, not retyped from the issue.

### 2. `src/scene/TerrainScene.tsx`

Delete `horizon()` (lines 14-17) and import `backdropColour` instead: `const fog = useMemo(() => backdropColour(), [])` stays exactly where it is, so the fog is read at the same moment. Replace the two light literals with `SCENE.sky`, `SCENE.ground`, `SCENE.sun`.

### 3. `src/scene/HomeScene.tsx`

Delete `backdrop()` (lines 24-26); `const fog = useMemo(() => backdropColour(), [])` at line 128 unchanged in timing. Same three light replacements. Line 184 takes `{OVERLAY.lease}` — `OVERLAY` is already imported? It is not, so add it to the existing `import { TONE_COLOR } from './palette'` line.

### 4. The guard that keeps it true

The issue's "done when" is a property of the tree, so make the tree enforce it. ESLint already has a
`src/**/*.tsx` block with `no-restricted-syntax` (the `useTerrain` rule); add two selectors there:

```js
{
  selector: 'Literal[value=/^#[0-9a-fA-F]{3,8}$/]',
  message: 'Colours live in src/scene/palette.ts (or an @theme token); components do not hardcode them.',
},
{
  selector: 'Literal[value=/^rgba?\\(/]',
  message: 'Colours live in src/scene/palette.ts (or an @theme token); components do not hardcode them.',
},
```

Scoped to `.tsx`, so `palette.ts` and the tests are unaffected. `'#/monitor'` and `'#/overview'` do
not match (a hash route is not three to eight hex digits).

### 5. Tests

- `src/scene/scene.test.ts`, in the existing `describe('palette')`: `backdropColour()` returns
  `SCENE.backdrop` when there is no `document`. That is the node path the helper adds, and it is the
  only new behaviour — the rest is substitution.
- No test asserts a hex value in the two scenes (they are canvas components), so nothing else needs
  rewriting. `npm run lint` is the real check on step 4: it must stay clean, which it only does once
  all seven literals are gone.

### 6. Prove the picture did not move

The whole risk of this change is a colour that quietly shifts. Before touching anything, capture the
monitor canvas at the Pit preset and the landing canvas at a fixed step; after the change, capture
the same two and compare. The same machine, the same software WebGL, the same pose: the diff should
be zero. If it is not, a value was retyped wrong and the diff says which light.

Also read the four values against `src/index.css` once: `--color-backdrop` must be `#e8e4d9`.

### 7. Checks, log, commit

- `npm run verify` (170 unit tests today, plus the one added here) and
  `npm run test:e2e -- --workers=2` (74 checks). The browser suite includes the landing screenshot
  comparison and the monitor checks, so a broken scene fails there too.
- Update log entry naming the seven literals, the new `SCENE` block, and the lint rule.
- One commit, Conventional Commits, no AI attribution, pushed to `origin/main`. Comment on
  `abivan100-stack/pitwatch-3d#46` with the commit; leave closing it to the owner, as with #44.

## Done when

- No hex or rgb literal remains in `src/**/*.tsx` — enforced by lint, not by hand-checking.
- The two scenes are lit and fogged exactly as before (before/after canvas diff is empty).
- Both scenes take the backdrop, lights and lease line from one place.
- `npm run verify` and `npm run test:e2e` pass.

## Risks

- **A retyped value.** The only way to change the render. Mitigated by copying from the code and by
  the canvas before/after comparison.
- **Timing of the `getComputedStyle` read.** It is read once in a `useMemo` per scene today, and the
  helper keeps that; no new read is added per frame.
- **Lint false positives.** The rule is scoped to `.tsx` and anchored to a whole string, so routes,
  ids and computed colours are untouched. If a legitimate exception ever appears, it takes an inline
  disable with a reason, not a widened rule.
- **`document` in tests.** Guarded, with a test for the guard.
