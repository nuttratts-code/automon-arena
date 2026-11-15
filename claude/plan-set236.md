# Plan set 236 — arena round 36 ทำจริง (into the real Godot game)

Owner picks (15 Nov, set 236): **A1** bake the r36 sample into a real editable scene (.tscn — every tree/bush/rock/grass patch a node the owner drags in the Godot editor; mist/fog/sun/colours as Inspector values) · **B** the latest camera = r36 (`cpitch=8.5`, `cpos=0,6.8,29.4`) · **C1** only the files the scene really uses, compressed (~5–8 MB, not the ~140 MB of test copies) · **D1** the 4 stand-in creatures (from another game) live in `godot/local_standins/` = gitignored + excluded from every export; the game falls back to our own sprites when the folder is missing. **Delete the folder + the loader the day the owner's own creatures arrive** (owner rule set 236 D).
Owner then tunes the scene himself in the Godot editor.

Source of the look: scratch Godot copy `%TEMP%/claude/6778d44212994c0a/e44da554-341a-472f-839e-ef20a29a07a0/scratchpad/g` (set 217 branch `ccr-882ceb4b-0ewtk1` + sample code `tests/s226.gd` = repo copy `claude/preview-set230/s226.gd.txt`) · args `claude/preview-set230/r36_args.txt` via `tools/shot233.sh`.

Security line (HARD RULE 9): stand-ins never in git/exports (.gitignore + export exclude filter + secret/asset grep before each commit) · every shipped asset gets a PROVENANCE row (Poly Haven CC0 credit; owner AI trees/bushes = set 219 D) · no load() of player files.

## Steps (tick when done + pushed)
1. [x] Docs: rule-change art-style §8 (r36 = the arena look, r36 camera, set 217 camera A2 superseded, §8 ban check noted) + security.md stand-in note + version bump → main.
2. [x] Bake tool in the scratch copy: `--e:bake=<dir>` in s226.gd — after the r36 build, keep only the arena (no units, unit shadows, UI), give every node an owner, save generated meshes/textures/materials as files, pack → `arena_r36.tscn` + `env_r36.tres` + `look_r36.json` (camera, sun, post-pass values). Check: reload the .tscn alone → screenshot ≈ r36 still.
3. [ ] Asset list + compress: walk the baked scene's dependencies; convert PNG sources to WebP/JPG where lossless isn't needed; drop unused. Target ≤ 8 MB.
4. [ ] Repo branch `claude/arena-r36` from main: copy scene + assets (`godot/art/arena_r36/`), shaders, `arena_r36.gd` (root script: @export mist/fog/sun/tint knobs); stage3d loads it in place of runeplaza.glb; camera + HD-2D screen pass (s217_hd2d) from r36; app.gd label frame changes from set 217 if needed.
5. [ ] Stand-ins: `.gitignore` `godot/local_standins/` · export_presets exclude filter · loader with fallback · note in README/handoff.
6. [ ] test_ui camera pins + other tests touching the arena; PROVENANCE.csv + credits screen rows.
7. [ ] HD still from the real game (units on) vs r36 still → owner.
8. [ ] merge-code: setup → gate → merge (ripple line) → CI → Relay → close-out.

## Progress
- Step 1: main c039a83.
- Step 2 (done): `s226.gd --e:bake=1` saves every in-code picture as PNG (`<g>/bake236/tex/`) → `godot --headless --import` → `--e:bake=2` swaps them in, saves built-in shaders (`shader/`) + meshes (`mesh/*.res`, glb meshes too), makes the arena_dressing + glb instances local, packs `<g>/bake236/arena_r36.tscn` (762 nodes; Env, Sun, GameCam, post-pass values in meta "post"). Run: `tools/shot233v.sh <name> $(cat r36_args.txt) --e:bake=1|2` (verbose copies of shot*.sh, log in out/last.log). Check `tests/s236_view.gd` (copy s236_view.gd.txt) = the real game + the baked scene only → matches the r36 still except the long unit shadows (unit feature, step 4/5). Size: tscn 252 KB · tex 18 MB PNG (38) · mesh 4.1 MB · + external: art/s217 sky/hills/ground_tile + 3d *_color/_normal PNGs + tests/ shaders s230_ground, s231_patch, s233_terrain.
