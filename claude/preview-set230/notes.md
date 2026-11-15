# Set 230 — plaza texture 4096 / 2048 in the arena (sample only, scratch Godot copy from set 229)

Scratch copy: `%TEMP%/claude/6778d44212994c0a/e44da554-341a-472f-839e-ef20a29a07a0/scratchpad/g` (same as set 229). Godot exe moved to `Documents/GitHub/Godot_v4.7.2-stable_win64.exe/` (shot.sh fixed).

## What was done
- Pulled albedo + normal (4096, RGB) out of `art/library/3d/originals/plaza_hunyuan_2026-11-14_766336cf.glb` → `plaza_O4096`, `plaza_ON4096`, LANCZOS 2048 copies. Same mesh/UVs as the arena plaza (150,000 indices), so a texture swap is enough.
- Same colour transfer as set 229 plaza_T1 (YCbCr mean/std, re-derived from 1024 src → T1, error 0.5/255) → `plaza_T4096`, `plaza_T2048`.
- `s226.gd.txt`: `ptex` now loads with mipmaps + anisotropic filter (`--e:pmip=0` = old way), new `--e:pnor=<file>` swaps the plaza normal map.
- Shots: current best args + `ptex=plaza_T1 / T2048 / T4096 / T4096 + pnor=plaza_ON4096` → `s230-plaza-res-1to1.png` (1:1 crops).

## Result
- Edge sharpness on the plaza (mean pixel step): 1024 9.99 · 2048 10.72 · 4096 10.92 · 4096+normal 11.05 (stones 6.5, in the blur band). Plaza colour unchanged (129,108,79).
- Cause: the Hunyuan texture is painted soft — 4096 vs 1024 differs by only 1.46/255 on average (contrast std 35.9). More pixels do not add detail; texel density (set 229 item 6) was a real gap but not the visible one.
- So: 4096 ≈ 2048 ≈ 1024 on screen. If kept, 2048 is enough (cost ×4 memory of 1024, 4096 = ×16 for no gain).

## Next (owner picks)
A2 detail overlay (pillar-stone detail tiled ~1 m on the plaza, `detail_*` on StandardMaterial3D) · or repaint/regenerate the plaza texture with more grain · then colour pass.

## Why the plaza looks yellow (owner asked, same chat)
- Cause = the set 229 "best" tint `--e:plaza=0.72,0.6,0.38`: blue ×0.38 vs red ×0.72 → plaza R/B 1.63 (stones R/B 1.04). The texture itself is a grey stone (untinted R/B 1.20).
- Shots `s230-plaza-tint.png`: 1 current tint · 2 no tint (1,1,1) · 3 light warm grey (0.75,0.73,0.68, R/B 1.23). Owner picks.
- **Owner pick: 3** → current best args now `S229_SMOOTH=1 … --e:lod=1.2 --e:stone_tone=0.88,0.86,0.8 --e:pzn=1 --e:ptex=plaza_T2048 --e:plaza=0.75,0.73,0.68` (2048 = same look as 4096, ¼ memory).

## How FF Resonance builds its floor (skill hd-2d-ref, lighting-and-materials §3–4 · numbers only, no assets)
- One master material for floor AND rocks/cliffs (Basecolor_Base family) → ground and stones share one colour family by construction.
- Layers: Base texture tiled by `Base_Scale` (0.02 far ground · 0.1 outer ground · 1.0 rocks) · vertex colour R = dirt path layer · G = stone/cliff layer · Top layer world-aligned (grass on up-facing faces, dirt patches on grass) masked by slope + a noise texture · `Brightness` multiplier (0.5 cliffs · 0.6 far ground).
- Textures are 256–1024, smooth (not pixel); detail comes from tiling, not from one big unique texture. Path colour in a screenshot = (179,163,123) warm beige; whole picture paler/softer, cool shadows.
- For Automon: plaza = one unique Hunyuan texture (soft, 25 px/m) vs stones with their own textures → explains both the soft look and the colour gap. FFR-style fix = A2+: a tiled stone detail layer (world-aligned, ~1 m) + a shared moss/grass Top layer (noise mask) on BOTH plaza and stones, same Brightness family.

## FF Re-style floor sample (owner: "Make the sample")
- Own code only: `s230_floor.gdshader.txt` → `<g>/tests/s230_floor.gdshader` (import before shots, trap 1). `s226.gd` `--e:ffr=1` swaps plaza + Stone*/Fallen*/Rock* (15 meshes) to it: base texture × tint · world-aligned triplanar detail (`dsc` m per tile, `damt`) · moss on up-facing faces masked by world noise (`mamt`, `mcut`, `msc`, `mcol`, `mstone=0`) · `bri`.
- Detail source: `--e:dnoise=1` = FastNoiseLite grain (`dcell=1` cellular, 0 = smooth mottling, `dfreq`), no picture, no repeat. Without it = high-pass crop of the fallen-stone atlas (`tests/s225/det_stone.png`) → reads as a grid even after rot/flip averaging (D) — dropped.
- Sheet `s230-ffr-floor.png`: A tint 3 only · B `dnoise=1 damt=0.35 dsc=2` · C `dnoise=1 dcell=0 damt=0.5 dsc=2 mamt=0.7 mcut=0.5` · D picture detail. Owner picks.
- Rendered plaza mean colour barely moves (A 133,125,109 → B/C ~126,123,103); the change is texture, not colour.
