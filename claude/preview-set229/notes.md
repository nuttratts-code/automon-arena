# Set 229 — arena look tests (sample only, scratch copy — NOT on any branch as code)

Scratch Godot copy used: `%TEMP%/claude/6778d44212994c0a/e44da554-341a-472f-839e-ef20a29a07a0/scratchpad/g` (may be wiped — rebuild per art-look §8c, then apply the files here).
- `s226.gd.txt` = tests/s226.gd with set 229 options: `_rim` (rejected), `_stone_tone`, `ptex`, `rimdbg`.
- `stage3d-patch.txt` = stage3d.gd line 344: env `S229_SMOOTH=1` skips `_s217_pixel_tex` (set 217 R19 L3 pixel stones).
- `s229_texel.gd.txt` → `<g>/tests/s229_texel.gd` (headless): texture px per metre per prop.

## Rounds (owner)
1. Boar still → pixel 56/80/112 px, 24 colours ± dark outline; in arena ×2 / ×3 (×3 crowds 6v6). Pixel alone does not fix "looks AI" (realistic shapes).
2. Reference creatures (other games, scratchpad only, never commit): toy/figure style fits the arena; one strong colour per creature; green glow clashes with grass.
3. Gemini prompts for the boar in 3 themes → claude/prompts-set229-boar-themes.md (A1 toy · A2 cel ink · A3 pixel source). Owner has not sent results yet.
4. Background soft = tilt-shift blur `lod` 2.6 (try 1.2) + stones blocky = set 217 R19 L3 (128 px Nearest) → smooth stones (`S229_SMOOTH=1`) = owner liked.
5. Plaza "floats": rim shadow ring tried → owner: not shadow, it is colour. Plaza tone (set 226 warm beige) vs untinted cool stones. Moss recolour M1/M2, palette transfer from the pillar texture (plaza_T1, YCbCr Reinhard) + `plaza=0.72,0.6,0.38` = closest numbers — owner: still does not match.
6. Root cause found: texel density — plaza 25 px/m vs stones 74–89 (all 1024 px). Library original `art/library/3d/originals/plaza_hunyuan_2026-11-14_766336cf.glb` has 4096 textures (prep cut them).

## Current best args (on top of the look-G list in art-look §8d)
`S229_SMOOTH=1 … --e:lod=1.2 --e:stone_tone=0.88,0.86,0.8 --e:pzn=1 --e:ptex=plaza_T1 --e:plaza=0.72,0.6,0.38` (no `rim`).

## Next
A1 put the 4096 (and 2048) plaza texture back, compare in the arena · A2 detail overlay (pillar-stone detail tiled ~1 m on the plaza) · then colour pass again. Everything = rule-change art-style §8 + ui-work at ทำจริง (changes set 217 L3 + set 226 plaza tone).
