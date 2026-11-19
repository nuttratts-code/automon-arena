# Plan set 237 — real 3D meadow arena (r37) from the owner's AI overhead picture

Owner picks (15 Nov, set 237): **A1** real 3D layout (height terrain, no one-camera fake) · **B** keep the r36 game camera (pitch 8.5°, pos 0,6.8,29.4, FOV 19.2) · **C2** build it for real now, no sample rounds; "measure the tree distances and place them to match".
Reference: the owner's AI overhead picture (in chat, 15 Nov): a stone plaza ringed by standing stones and bushes · a dirt path left↔right and one going back to the lake · tree belts on both sides · a meadow sloping down to a wide lake · a rock ridge on the left · hills and mountains behind with mist.

Security line (HARD RULE 9): same as set 236. Only the owner's AI trees/bushes, Hunyuan rocks and Poly Haven CC0 textures already in the scratch copy; nothing new from outside; stand-ins stay local.

## Steps
1. [x] Meadow height `th237()` in `tests/s233_terrain.gdshader` + `_s237_th()` in `tests/s226.gd` (change both). Flat meadow to z −60, gentle drop to the lake shore at z ≈ −105, lake basin centred (−15, −172) r 150×72, water `wl=-2`, rock ridge (−16,−46)→(−62,−122) with a steep meadow-side face + rock tint on slopes, right hills from x 18, hills/mountains past dm 110 (back half only). Paths `path237()` / `_s237_path()`: left↔right across the plaza, and from the plaza back (x≈3) winding to the lake.
2. [x] Placement `_s237_trees` (belts measured off the picture: sides z −22…−72, front sides, right hill, left lakeside, far shore, ridge-top row; ≥ 3.6 m apart, dry land only, off the paths, outside r 17.5) + 26 meadow shrubs + 16 owner rock meshes on the ridge face (`_s237_ridge_rocks`). Bush ring skips the path.
3. [x] Args `claude/preview-set230/r37_args.txt` (= r36 + `meadow=1 wl=-2 hc2=0 tpath=1 rmid=12` + mist over the lake). Bake → `<g>/art/arena_r37/arena_r37.tscn` (900 nodes, 13 MB, self-contained). View check `ARENA=res://art/arena_r37/arena_r37.tscn` + `tests/s236_view.gd` = OK.
4. [x] Owner 15 Nov: **paths removed** (`tpath=0`; trees/bushes no longer keep gaps for them), so the §8 ban ("dirt path mid-frame") is no longer hit; no ban change needed.
5. [x] Owner 15 Nov: **layered mountains behind the lake** like the picture: `_s237_layers` = 3 own procedural ridge quads (z −282/−290/−298, just in front of the sky card at −300; near green → far pale blue, sharper peaks far, no fog on them) + mist at their feet (`mist=22 mz 255–280 mty −1`); terrain's own mountains off (`mtk=0`, both copies have `mt_k`); the r36 hills card is off again (`hc2=0`). Re-baked arena_r37 (3 S237Range nodes), view check OK. Full args: preview-set230/r37_args.txt.
6. [ ] rule-change art-style §8: r37 = the arena (replaces r36) → plan-set236 step 4 ports `arena_r37`.

## Known gaps
- With the 8.5° camera the frame top is ~1° above the horizon: the far ridge peaks are cut by the frame (the owner kept the camera).
- Overhead views show horizontal shadow stripes on the far ground (shadow cascades on the displaced terrain; not in the game view).
- Units in the in-game check are still the old main sizes (stage3d port = set 236 step 4).
