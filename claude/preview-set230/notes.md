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
- **Owner: B/C "worse than before"** → layered noise detail rejected. Owner asked what a full FF Re floor would need.

## Full FF Re floor = what changes (answer to owner, hd-2d-ref scene-anatomy §3 arena 01Gra_67 + lighting §3–4)
1. Floor = one big ground mesh + layered material from small TILEABLE painted textures (256–1024: flagstone · dirt · grass/moss) mixed by a painted mask (vertex colour), not one unique AI texture (our plaza_hy).
2. Loose stones/gravel = separate small meshes on top (arena: templestone ×27, gravel ×22), same master material family as floor + rocks.
3. Baked light (lightmap + sun shadow bake, all 234 pieces) = contact shade under every stone/rock → ties them to the floor. We have none (Compatibility: no live sun shadows; LightmapGI bake in Compatibility = to verify).
4. Grass layer on top of rocks + grass cards at bases; paler, softer grade, cool shadows.
- Needs: owner tileable textures (Gemini "seamless tileable" or CC0 with OK, HARD RULE 9 ②) · Blender ground mesh + mask paint · bake test · rule-change art-style §8 (set 217 plaza_hy + hand-placed stones, set 226 plaza tone).
- Why the noise sample failed: FF Re detail comes from painted tile textures with real stone shapes; one-scale noise reads as dirt/static.

## Full FF Re rebuild — round 1 (owner A2 CC0 · B2 free flagstones · C1 keep stones · D1; art-style V2.2, plan-set230.md)
- CC0 picks (Poly Haven, CC0, licence page checked; owner OK to download): `grey_stone_path` (Amal Kumar, 1.8 m real size) + `mossy_rock` (Rob Tuytel, 3 m), 1k diff + nor_gl + rough PNG, md5 = API. Kept in scratch `cc0/` + `<g>/tests/s225/`, NOT in the repo. Credit + art/PROVENANCE.csv row when anything ships. Thumbnails were ~250 KB each (told owner 0.5 MB total — wrong estimate, said so).
- `--e:gnd=1` (s226.gd.txt `_s230_ground` + `s230_ground.gdshader.txt`): hides Plaza, adds a flat disc (CylinderMesh r = plaza box × `grs` 0.92 = 11.7 units) with world-xz flagstone (`gtile`, `gtint`), moss by joint luminance (linear `jlo` 0.03 / `jhi` 0.065) + noise patches (`pamt`, `pcut`) + rim band (`gedge`); stones keep own textures + same moss on up faces (`smoss`, `mtint`).
- Scale: scene units ≠ metres — real-size tile 1.8 gives pebble-size slabs; `gtile=8` ≈ old slab size. mossy_rock is mostly grey lichen rock → needs `mtint` green (1.9 = neon, 0.9,1.6,0.5 ok).
- Sheet `s230-cc0-ground.png`: A now · B `gtile=8 gtint=1.25,1.22,1.15` · C B + `mtint=0.9,1.6,0.5 jamt=1 jhi=0.09 pamt=0.3 gedge=0.78 smoss=0.6 gbri=1.1`.
- Own read: photo flagstones read realistic next to painted stones/creatures; moss lands as scattered patches, not in joints (luminance mask catches dark spots). Not done yet: plan step 4 baked contact shade, grass cards at rim.
