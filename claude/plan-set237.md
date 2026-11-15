# Plan set 237 — real 3D meadow arena (r37) from the owner's AI overhead picture

Owner picks (15 Nov, set 237): **A1** real 3D layout (height terrain, no one-camera fake) · **B** keep the r36 game camera (pitch 8.5°, pos 0,6.8,29.4, FOV 19.2) · **C2** build it for real now, no sample rounds; "measure the tree distances and place them to match".
Reference: the owner's AI overhead picture (in chat, 15 Nov): a stone plaza ringed by standing stones and bushes · a dirt path left↔right and one going back to the lake · tree belts on both sides · a meadow sloping down to a wide lake · a rock ridge on the left · hills and mountains behind with mist.

Security line (HARD RULE 9): same as set 236. Only the owner's AI trees/bushes, Hunyuan rocks and Poly Haven CC0 textures already in the scratch copy; nothing new from outside; stand-ins stay local.

## Steps
1. [x] Meadow height `th237()` in `tests/s233_terrain.gdshader` + `_s237_th()` in `tests/s226.gd` (change both). Flat meadow to z −60, gentle drop to the lake shore at z ≈ −105, lake basin centred (−15, −172) r 150×72, water `wl=-2`, rock ridge (−16,−46)→(−62,−122) with a steep meadow-side face + rock tint on slopes, right hills from x 18, hills/mountains past dm 110 (back half only). Paths `path237()` / `_s237_path()`: left↔right across the plaza, and from the plaza back (x≈3) winding to the lake.
2. [x] Placement `_s237_trees` (belts measured off the picture: sides z −22…−72, front sides, right hill, left lakeside, far shore, ridge-top row; ≥ 3.6 m apart, dry land only, off the paths, outside r 17.5) + 26 meadow shrubs + 16 owner rock meshes on the ridge face (`_s237_ridge_rocks`). Bush ring skips the path.
3. [x] Args `claude/preview-set230/r37_args.txt` (= r36 + `meadow=1 wl=-2 hc2=0 tpath=1 rmid=12` + mist over the lake). Bake → `<g>/art/arena_r37/arena_r37.tscn` (900 nodes, 13 MB, self-contained). View check `ARENA=res://art/arena_r37/arena_r37.tscn` + `tests/s236_view.gd` = OK.
4. [ ] **Owner decision (conflict):** art-style §8 ban (owner, 7 Nov) = "meadow + big trees with light shafts + winding stream + dirt path in the middle of the frame". r37 has the back path in mid-frame (no stream; the sun-shaft card from r36 is still there). Stills: `claude/preview-set237/r37-game.jpg` (path) vs `r37-game-nopath.jpg`.
5. [ ] After the pick: rule-change art-style §8 (r37 = the arena, ban wording) + re-bake if the path changes → plan-set236 step 4 uses `arena_r37` instead of `arena_r36`.

## Known gaps
- With the 8.5° camera, mountains above ~15 m sit above the top of the frame; only their feet show (the owner kept the camera).
- Overhead views show horizontal shadow stripes on the far ground (shadow cascades on the displaced terrain; not in the game view).
- Units in the in-game check are still the old main sizes (stage3d port = set 236 step 4).
