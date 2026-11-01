# Plan: fix #33, draw the real symbols in the PDF report

**Delivered on 2026-11-01.** One decision changed during implementation: the font is Noto Sans
rather than Archivo, because Archivo's character map has no Greek sigma (checked with `fontTools`)
and the report must draw `(2σ)`. Everything else below is the plan as built.

Fork issue `Raghav2012Code/pitwatch#33`. Today `src/compliance/report.ts` spells the engine's
symbols out before they reach jsPDF (`±` → `+/-`, `m²` → `m2`, `σ` → `sigma`) because jsPDF's
built-in Helvetica cannot draw them; the comment there records why: _jsPDF mangles a whole string
when one character is outside the font_ (the update log of 2026-10-29 shows page 1 printing
replacement glyphs). The goal is the opposite: the PDF draws what the screen draws.

The issue also asks for two honesty conditions: an unmappable character must degrade to a visible
placeholder (never mojibake), and the font's licence must ship beside the asset.

## What is actually there (verified at `8880001`, not taken from the issue)

| Fact                                                                 | Where                                                              |
| -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| The report draws with `helvetica` only, normal and bold              | `src/ui/reportPdf.ts` (every `setFont` call)                       |
| Four symbols reach the PDF through `explanation`                     | `src/compliance/engine.ts:163-178` — `m²`, `±`, `(2σ)`, `m³`       |
| `pdfSafeText` maps 13 characters and replaces anything else with `?` | `src/compliance/report.ts:29-51`                                   |
| The CSV keeps the real characters (no change wanted)                 | `src/compliance/report.ts:70`                                      |
| The PDF is lazy: jsPDF is imported inside `savePdfReport`            | `src/ui/reportPdf.ts:25`                                           |
| The browser check reads compressed content streams and asserts ASCII | `e2e/dashboard.spec.ts:158-175`                                    |
| jsPDF is 4.2.1                                                       | `package.json`                                                     |
| Archivo is already the app's typeface and is OFL-1.1                 | `package.json` (`@fontsource-variable/archivo`), `src/index.css:2` |

jsPDF 4.2.1 facts that decide the shape (checked in the library source, not assumed):

- `doc.addFileToVFS(name, base64)` + `doc.addFont(name, family, style)` loads a TTF; the default
  encoding for it is `Identity-H`.
- Text for an Identity-H font is written as hex **glyph ids**, not Unicode, and the document carries
  a `/ToUnicode` CMap that maps each glyph id back to its code point. A test that wants to read the
  drawn text must use that CMap (the literal `(…)Tj` regex in today's spec will find nothing).
- jsPDF embeds only the glyphs actually used (`glyIdsUsed`), so a report does not grow by the full
  font size — but the font asset itself is fetched by the browser, and that weight is what the
  issue asks to measure.
- Identity-H works on UTF-16 code units, so characters outside the BMP (emoji) are not drawable.

## Decisions

1. **Font: Noto Sans Regular 400 and Bold 700** (OFL-1.1), instanced from the variable face at
   `wdth=100`. The plan first named Archivo, the app's own typeface, but its character map has no
   Greek sigma — checked with `fontTools` before any code was written — and the report must draw
   `(2σ)`. Noto Sans covers Latin, Latin Extended-A and Greek, so one face can draw every string.
   The PDF typeface differing from the screen's Archivo is the accepted cost.
2. **Subset to an explicit charset**, not the full face: basic Latin, Latin-1 Supplement, Latin
   Extended-A, and the symbols the app can produce (`± σ Σ Δ ² ³ · × – — ‘ ’ “ ” …`). That covers
   accented mine or operator names and every engine string.
3. **The charset is the contract.** One file, `charset.txt`, is read by the subsetter and asserted in
   a unit test against the runtime sanitizer's constant, so the font and the guard cannot drift.
4. **Deliver fonts as Vite `?url` assets fetched only when the PDF is built**, never inlined into the
   first-screen chunk. The findings page already imports the report module statically; the font must
   stay out of that parse path.
5. **Sanitizer, not spell-out:** `pdfText(text)` keeps characters the subset covers and turns
   anything else into `?` (visible, never mojibake). CSV and on-screen text are untouched.
6. **Keep the existing layout numbers.** The block-height estimate stays `13.4 + lines × 4.6`; the
   font swap can change line wrapping, so the page count is re-checked before the numbers are kept.

## Steps

### 1. Fonts on disk, with their provenance

New directory `src/assets/fonts/pdf/`:

- `NotoSans-VF.ttf` — source variable face (not shipped, deleted after subsetting; SHA-256 recorded).
- `NotoSans-Regular.ttf`, `NotoSans-Bold.ttf` — the subsets that ship.
- `charset.txt` — one line, every character the PDF may draw, generated once from these ranges:
  `U+0020–U+007E` (basic Latin), `U+00A0–U+017F` (Latin-1 Supplement and Latin Extended-A), and
  `U+00B0 U+00B1 U+00B2 U+00B3 U+00B5 U+00B7 U+00D7 U+0394 U+03A3 U+03C3 U+2013 U+2014 U+2018
U+2019 U+201C U+201D U+2026` (the symbols the app can produce; the duplicates with Latin-1 are
  harmless in a text file). The file itself is the authority — no hand-typed copy in this plan.
- `OFL.txt` — the licence text from the Noto Sans directory of the Google Fonts repository, naming
  "Copyright 2022 The Noto Project Authors".
- `SOURCE.md` — the download URL for the variable face, its SHA-256, the tool versions and the exact
  commands below, plus the measured sizes of the two subsets.

Regeneration is a one-off, not a build step; there is no new npm script:

```sh
python -m pip install fonttools brotli
python -m fontTools.varLib.instancer NotoSans-VF.ttf wdth=100 wght=400 -o NotoSans-Regular.ttf
python -m fontTools.varLib.instancer NotoSans-VF.ttf wdth=100 wght=700 -o NotoSans-Bold.ttf
python -m fontTools.subset NotoSans-Regular.ttf --text-file=charset.txt --layout-features='*' --output-file=NotoSans-Regular.ttf
python -m fontTools.subset NotoSans-Bold.ttf    --text-file=charset.txt --layout-features='*' --output-file=NotoSans-Bold.ttf
```

**Done when:** both subsets load in jsPDF in a throwaway probe, `OFL.txt` is beside them, and the
sizes are written into `SOURCE.md`.

### 2. `src/compliance/pdfCharset.ts`: the runtime contract

```ts
/** Every character the shipped PDF subset can draw. Mirrors src/assets/fonts/pdf/charset.txt. */
export const PDF_CHARSET = ' … ' // the same string, generated once and checked by a test

/** Text the embedded font can draw; anything else becomes a visible '?', never mojibake. */
export const pdfText = (text: string): string =>
  [...text.normalize('NFC')].map((c) => (PDF_CHARSET.includes(c) ? c : '?')).join('')
```

Remove `PDF_ASCII` and `pdfSafeText` from `report.ts`; update the four call sites in `reportPdf.ts`
and the two tests that import it. Keep the CSV path untouched.

**Done when:** `pdfText('Excavated 7,696 m² … ± 0.14 m (2σ). About 1,200 m³ removed.')` returns the
string unchanged, `pdfText('漢')` returns `'?'`, and no `sigma` substitution remains anywhere.

### 3. `src/compliance/pdfCharset.test.ts`

- `PDF_CHARSET` equals the text of `src/assets/fonts/pdf/charset.txt` imported with Vite's `?raw`
  (the test runs through Vite, and the file starts with a space, so it is compared without trimming).
- Every character the app can draw is in the set: build the real findings with the existing pattern
  (`SyntheticTerrainProvider` + `evaluate`, as `areas.test.ts` does) and assert `pdfText(explanation)`
  equals `explanation` for each — this is what proves the subset covers the engine's words.
- `pdfText` keeps `± ² ³ σ`, turns `漢`/emoji into `?`, and normalises decomposed accents (`e` +
  U+0301 → `é`).
- The old mapping is gone: `expect(pdfText('Δ')).toBe('Δ')`.

### 4. `src/ui/pdfFont.ts`: load on demand

```ts
// Cache the fetched files per page; registering is per document.
let fontData: Promise<{ regular: string; bold: string }> | null = null

/** Fetch both subsets once, per page, and register them with this document. */
export async function registerPdfFonts(doc: Jsdoc): Promise<void> {
  fontData ??= (async () => {
    const [regular, bold] = await Promise.all([fetch(regularUrl), fetch(boldUrl)])
    return {
      regular: bytesToBase64(await regular.arrayBuffer()),
      bold: bytesToBase64(await bold.arrayBuffer()),
    }
  })()
  let data: { regular: string; bold: string }
  try {
    data = await fontData
  } catch (error) {
    fontData = null // a failed download is retryable, as the terrain load is
    throw error
  }
  doc.addFileToVFS('NotoSans-Regular.ttf', data.regular)
  doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal')
  doc.addFileToVFS('NotoSans-Bold.ttf', data.bold)
  doc.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold')
}
```

- `bytesToBase64` is pure and exported; a unit test covers empty, 1 byte, the 3-byte boundary and a
  few kilobytes (no `apply`-spread on a large array).
- `?url` imports keep the binaries out of the JS chunk; the fonts are requested only on first
  **Download PDF**.
- If a fetch fails, throw a message the button already surfaces ("The PDF could not be built"),
  and clear `fontsReady` so a retry can work.

**Done when:** the PDF builds from a cold load, the network log shows the two `.ttf` assets only
after the click, and a second click reuses them.

### 5. `src/ui/reportPdf.ts`: draw with the embedded face

- `await registerPdfFonts(doc)` right after `new jsPDF(...)`.
- Replace every `setFont('helvetica', …)` with `setFont('NotoSans', …)`;
  keep sizes, colours, positions and the plan drawing untouched.
- Keep `pdfText(...)` on every drawn string, including the key, footer and labels; dates and ids
  pass through unchanged.

**Done when:** the probe PDF renders the plan and every finding exactly as now, except the symbols;
`splitTextToSize` still splits each explanation into the same number of lines (compare against a
saved copy of the old output), so the `13.4 + lines × 4.6` estimate stays honest.

### 6. `e2e/dashboard.spec.ts`: read the real glyphs back

Extend the existing check (same test, same download):

1. Inflate only streams that contain `BT` or `/ToUnicode`; skip the font binary.
2. Parse every `/ToUnicode` CMap (`beginbfchar` pairs, plus `beginbfrange` if present) into
   `gid → codepoint`.
3. Decode every hex string shown by `Tj`/`TJ` (`<…>` units of 4 hex digits) through that map.
4. Assert:
   - the decoded text contains `±`, `m²`, `m³` and `(2σ)`;
   - the decoded R1-1 explanation equals the R1-1 explanation the page shows (open the row's
     disclosure first, read its text), which is the "fails if one character is dropped" condition;
   - no `?`, no `sigma`, no U+FFFD, and no drawn string without a CMap entry.

**Done when:** the test fails if `pdfText` is reverted to the old spell-out (prove it), and passes
with the fix.

### 7. Accented name check, not committed

Temporarily set the fixture mine name to `Venthar Ridge Ünlüt` (U+00DC, U+00FC), build, download,
decode the subtitle with the same helper, confirm both characters; revert the fixture. The two
accents are inside Latin-1, so the subset must carry them; if they print `?`, the charset file and
the subset are out of sync and step 3 should have caught it.

### 8. Measure, log, verify

- Record `dist` asset sizes for the two fonts and the PDF byte size before/after at the default
  filters (5 findings). Measured: old 19,813 B, new 49,396 B (+29,583 B); the two font assets add
  101,576 B to the export's download, and the app's first-screen JS grew by 1,108 B (the font URL
  constants and loader). Quote these in the update log as the issue requires.
- `npm run verify` and `npm run test:e2e`.
- Update log entry under 2026-11-01 (or the day it ships) with the numbers, the licence location and
  the two guard tests.
- No README claim changes: the README does not mention ASCII text. If it names the PDF's look, add
  one line.

## Files

| File                                | Change                                           |
| ----------------------------------- | ------------------------------------------------ |
| `src/assets/fonts/pdf/*`            | new: two subsets, charset, OFL, SOURCE           |
| `src/compliance/pdfCharset.ts`      | new: charset constant, `pdfText`                 |
| `src/compliance/pdfCharset.test.ts` | new: charset/file agreement, sanitizer behaviour |
| `src/compliance/report.ts`          | delete `PDF_ASCII`/`pdfSafeText`                 |
| `src/compliance/report.test.ts`     | drop the `pdfSafeText` block, keep CSV tests     |
| `src/ui/pdfFont.ts`                 | new: `registerPdfFonts`, `bytesToBase64`         |
| `src/ui/pdfFont.test.ts`            | new: base64 edges                                |
| `src/ui/reportPdf.ts`               | register fonts, switch family, call `pdfText`    |
| `e2e/dashboard.spec.ts`             | decode Identity-H text via ToUnicode CMap        |

## Risks and ceilings

- **Wrapping drift.** Noto Sans's advance widths differ from Helvetica's, so `splitTextToSize` can
  change line counts and move the last finding onto page 2. Mitigation: compare line counts and page
  count against the old file; adjust nothing in the height formula unless the comparison shows it.
- **Extraction tools.** With Identity-H, naive PDF text extractors (and our own first attempt) see
  glyph ids. The ToUnicode map makes the file correct for readers; the plan's check reads it the way
  a reader does.
- **Coverage ceiling.** Latin + Greek sigma/delta only. A CJK or emoji name prints `?`, which is the
  required visible placeholder, not mojibake. Named here so it is a decision, not a surprise.
- **Font streams in the inflate loop.** The existing check inflates every `stream` it finds; the
  embedded TTF is binary, so the new decoder must scan only streams that look like text (contain `BT`
  or `/ToUnicode`) or it will parse noise.
- **Licence.** OFL-1.1 permits embedding and subsetting; Noto Sans declares no Reserved Font Name,
  so the subsets keep the name. `OFL.txt` beside the files satisfies the notice requirement.

## Out of scope

- #34 (a long finding continuing onto the next page) — blocked by this, tackled separately.
- The CSV export, the on-screen text and the print stylesheet already use the real characters.
- Re-using the web font files (`@fontsource-variable/archivo`, WOFF2) directly: jsPDF reads TTF.
