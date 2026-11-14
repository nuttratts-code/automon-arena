---
name: char-idle
description: Character still → idle pick (ภาพนิ่งตัวละคร / ท่ายืน / idle / ยืดหด / ตาเรือง / เลือกท่าหายใจ) — snap the owner's Gemini still to real pixels, render 8 code-idle variants side by side as a GIF, the owner picks ONE per character, record it in claude/idle-picks.csv. Use whenever the owner sends a new character still or asks to re-pick a character's idle. Rules: claude/art-style.md §2 (wins if anything differs).
---
# Character still → idle pick (set 221, 14 Nov 2026)

> Owner rule set 221: one idle setting may not suit every character → **always show the variants and let the owner pick per character**; never apply variant 3 (the default) silently. Rules: claude/art-style.md §2 · art store: art/library/README.md (usable pieces only, never delete) · licence: AI art = placeholder, UNVERIFIED (set 219 D).

Scripts here (Python 3 + numpy + Pillow; run with `python -I`, Windows font Tahoma for Thai labels):
- `snap.py <in.jpg> <out.png> <block_px> <offset_px> <grid_n>` — AI "fake pixel" still → real-pixel RGBA, magenta bg → transparent, trimmed.
- `idle_variants.py <still.png> <out.gif> [neck_row waist_row hip_row]` — 8 variants, 2.4 s loop, ×3 zoom. Prints size, rows, glow pixel count.

## Steps
1. **Store the original** in art/library/pictures/sprites/ as `<ID>_still_gemini_<date>.<ext>` + INDEX.csv row (only if usable — broken/wrong pictures: tell the owner, do not store).
2. **Find the grid:** zoom the source edges (crop + Read) — block size = width of one fake pixel (HL-1: 20.0 px on a 2000 px image), offset = where the first block starts, grid_n = blocks across. Run `snap.py`; Read the result at ×8 — stair-stepped clean edges = right; doubled/half pixels = wrong block or offset, retry.
3. **Store the snapped png** next to the original as `<ID>_still_px<W>x<H>_<date>.png` + INDEX.csv row. Note the size (spec 64×64; bigger is OK, say so).
4. **Rows:** defaults neck 28% / waist 56% / hip 70% of the height fit HL-1 exactly. For other shapes (blob, bird, long tail) look at the png on a coordinate grid and pass the rows by hand.
5. **Glow:** the printed `glow px` must be > 0 and on the eyes/runes. 0 or wrong spots → tell the owner (option: a mask file later, art-style §2).
6. **Render** `idle_variants.py` → claude/preview-set217/ (sample branch) or the scratchpad; Read frame ~20 to check; send with SendUserFile.
7. **Gate — owner picks:** explain the 8 in Thai first, then AskUserQuestion (max 4 options per question → ask "group" first or show the recommended 3–4):
   1 sprite-res scale (reference only, looks wrong) · 2 strong squash 2.5%/1.5% · **3 light squash 1.2%/0.8% + breath hold (default)** · 4 accordion (drop a row at waist, then neck) · 5 upper body sinks 1 px · 6 = 3 + 1 px sway · 7 hover 0–2 px (flying / spirit) · 8 still + glow only (stone / statue / object).
   Recommend by body: heavy/armoured → 3 or 5 · flying → 7 · object-like → 8 · soft/blob → 2.
   The owner may ask for a new mix → add it as a new function in idle_variants.py (keep old numbers stable; new = 9, 10…) and re-render.
8. **Record** one row per character in claude/idle-picks.csv (`character,variant,neck_row,waist_row,hip_row,set,note`). This csv is what the Godot code reads later (to be wired into godot/ only on the owner's order, with a ripple check — HARD RULE 8). Docs-only → commit straight to main.

## Notes
- Never resize the image itself in game: squash = Sprite3D scale at screen resolution (variant 1 shows why).
- Numbers (1.2%, 2.4 s, …) are ค่าเสนอ until tested in the real game.
- Attack / hit / death are code for every character (art-style §2) — not part of this pick.
