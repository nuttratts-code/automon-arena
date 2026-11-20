# Idle timing + body size reference (set 259, 20 Nov) — REFERENCE ONLY

Source: measured from the PMD Sprite Collab idle sheets in `automon-scratch/pmd-ref` (PC-local, CC BY-NC + another company's IP).
Only numbers are kept here; no frame, picture or name from that set is copied (REFERENCE-ONLY.txt). Not a rule, not (ค่าเสนอ) values — a yardstick for owner decisions (art-style V2.5 "ท่ายืน", chibi tone vs V2.5).

Method (script in the chat scratchpad, re-runnable): 978 top-level species folders, `Idle` anim of AnimData.xml; durations are 60 fps ticks (1 tick = 16.7 ms); body box = union of opaque pixels over all idle frames of the side-facing row (row 2). Size class = the set's own `ShadowSize` (0 small · 1 medium · 2 large). Shape = body box height/width: tall ≥ 1.25 · wide ≤ 0.8 · round between. Values = median (p25–p75).
Limits: no species data in the clone → flyers / four-legged / two-legged cannot be told apart; "feet lift" counts hops and floaters together.

## 1. Idle timing by shape and size

| group | n | frames | most common frame counts | loop ms | ms per frame | long first hold | feet lift ≥ 3 px | bob px |
|---|---|---|---|---|---|---|---|---|
| all | 978 | 6 (4–8) | 4 ×270 · 6 ×138 · 8 ×125 | 1067 (833–1333) | 178 (133–272) | 59% | 38% | 2 (1–4) |
| round | 492 | 5 (4–8) | 4 · 6 · 2 | 1067 (833–1333) | 187 (136–300) | 60% | 31% | 2 (1–4) |
| tall | 365 | 6 (4–8) | 4 · 6 · 8 | 1000 (800–1233) | 164 (129–225) | 58% | 55% | 3 (1–4) |
| wide | 121 | 4 (3–8) | 4 · 2 · 14 | 1233 (933–1500) | 217 (137–317) | 57% | 16% | 1 (1–3) |
| small | 84 | 6.5 (4–8) | 8 · 4 · 6 | 933 (800–1200) | 153 (129–200) | 40% | 59% | 3 (2–4) |
| medium | 700 | 5 (4–8) | 4 · 6 · 8 | 1017 (817–1333) | 175 (133–278) | 61% | 39% | 2 (1–4) |
| large | 194 | 6 (4–8) | 4 · 6 · 2 | 1216 (950–1667) | 200 (136–329) | 61% | 28% | 2 (1–4) |

- "Long first hold" = one frame lasts ≥ 2.5× the others (rest pose held, then a quick breath/blink). Most common tick values: 2, 8, 4, 6, 10, 12, 40 → frames are uneven, not one fixed ms.
- Trend: small = more frames, faster loop (~0.9 s), bigger bob; large/wide = fewer frames, slower loop (~1.2 s), body barely moves (1–2 px).
- Ours today (set 258 idle preview): 8 frames × 150 ms = 1200 ms loop, even timing → inside the range (frames upper quartile, loop median-to-large); the set uses uneven holds where ours is even.

## 2. Body size small / medium / large (side view, art pixels)

| size | n | body height | body width | at ×5 on screen (height) |
|---|---|---|---|---|
| small | 84 | 22 (20–25) | 17 (14–21) | ~110 px |
| medium | 700 | 26 (23–30) | 22 (19–27) | ~130 px |
| large | 194 | 33 (29–41) | 32 (27–44) | ~165 px (tallest 69 → ~345) |

- Steps are small: large is only ~1.3× medium in height, ~1.5× in width; size reads more from width/bulk than height.
- ×5 = the scale the owner liked in the set 259 chibi look test.
