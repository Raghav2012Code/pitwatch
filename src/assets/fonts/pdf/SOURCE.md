# PDF report font

`NotoSans-Regular.ttf` and `NotoSans-Bold.ttf` are subsets of **Noto Sans**, the variable face from
Google Fonts, instanced at `wdth=100` and `wght=400` / `700`, then restricted to the characters in
`charset.txt`. They are used only by the downloaded findings PDF; the app's own typeface stays
Archivo.

Why Noto Sans and not Archivo: the report must print the engine's `σ`, and Archivo's character map
has no Greek sigma. That was checked with `fontTools` before choosing: Archivo's cmap is missing
`U+03A3` and `U+03C3`. Noto Sans covers Latin, Latin Extended-A and the Greek the report needs.

- Source: https://github.com/google/fonts/blob/main/ofl/notosans/NotoSans%5Bwdth%2Cwght%5D.ttf
- Source SHA-256: `BFB7BB691513F12E734DC346C03A03F784912432D7E3FA8E56EFCF906FE86B3D`
- Licence: SIL Open Font License 1.1, see `OFL.txt` (Copyright 2022 The Noto Project Authors)
- Tool: `fontTools 4.68.0` (`brotli` for the WOFF2 path, not used here)

Shipped sizes:

| File                   | Bytes                |
| ---------------------- | -------------------- |
| `NotoSans-Regular.ttf` | 50,796               |
| `NotoSans-Bold.ttf`    | 50,780               |
| `charset.txt`          | 570 (329 characters) |

Regenerate (one-off, not a build step; the exact commands that produced the files above):

```sh
python -m pip install fonttools brotli
curl -L -o NotoSans-VF.ttf "https://raw.githubusercontent.com/google/fonts/main/ofl/notosans/NotoSans%5Bwdth%2Cwght%5D.ttf"
python -m fontTools.varLib.instancer NotoSans-VF.ttf wdth=100 wght=400 -o NotoSans-Regular.ttf
python -m fontTools.varLib.instancer NotoSans-VF.ttf wdth=100 wght=700 -o NotoSans-Bold.ttf
python -m fontTools.subset NotoSans-Regular.ttf --text-file=charset.txt --layout-features=* --output-file=NotoSans-Regular.ttf
python -m fontTools.subset NotoSans-Bold.ttf    --text-file=charset.txt --layout-features=* --output-file=NotoSans-Bold.ttf
```

`charset.txt` holds basic Latin, Latin-1 Supplement, Latin Extended-A and the symbols the app can
produce (`± ² ³ σ Σ Δ ° µ · × – — ‘ ’ “ ” …`). `src/compliance/pdfCharset.ts` repeats that string for
the runtime guard, and a unit test fails if the two drift apart.
