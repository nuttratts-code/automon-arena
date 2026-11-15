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
