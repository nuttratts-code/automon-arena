# workflow · GDScript notes for the Godot port

V1.0 · 12 Nov 2026 (set 209, user C2a: our own short file instead of an outside Godot skill — review-2026-11-12-skills.md). Only what this project learned in sets 192–208; each line names where it came from. Generic Godot patterns (gameplay autoloads, event bus, object pools, component nodes) are NOT our structure — do not introduce them without a rule-change round.

## 1. The port (plan-godot-migration §2–§3)
- The JS core is the reference. A src/core file with a "change both" comment has a twin in godot/scripts — edit both in one commit, then skill `port-parity`.
- Game values come only from godot/data/game.json, written by `cd src && node tools/exportdata.mjs`. Never hand-edit it or keep a second copy of a value in a script.
- Captions in godot/data/ui_th.json must exist in src/game/run (a node test checks it).

## 2. Numbers and order (each one broke parity once)
- 32-bit math: GDScript ints are 64-bit → mask with `& 0xFFFFFFFF`; `Math.imul` is emulated in 16-bit halves (scripts/rng.gd).
- Rounding: use `js_round` (JS rounds .5 up; `round()` rounds half away from zero).
- Division: `5 / 2 == 2` for ints — make one side a float when JS divides floats.
- `pow` / `log`: use `js_pow` / `js_log` (scripts/jsmath.gd, V8 port) where the core does.
- Sorting: `sort_custom` is not stable → always add an index tie-break.
- Loops over dictionaries: check the key order equals the JS insertion order.
- Floats read from JSON can be 1 ulp off → golden files carry `{"$f": bits}` and tests compare bits (tests/golden_util.gd).

## 3. Outside input (security.md part 3)
- Never `load()` / `ResourceLoader` / `Expression` on anything a player can supply. Saves and pasted codes = text → `JSON.parse_string` → validate every field (scripts/validate.gd, save.gd).

## 4. Tests (godot/tests)
- A test passes by returning `"ok"`; the run passes on the last line `GODOT TESTS: PASS n/n` — grep it, never trust the exit code (a broken test file once hung the runner).
- Under the headless runner a scene is not in a running tree, so `_ready` does not run → UI tests call `app.build()` (tests/test_ui.gd `_app()`).
- `TESTS_ONLY=ui,project` runs only those files while developing; CI runs everything with `--require-golden`.
- A new screen adds its states to tests/shots.gd (sizes and the AUDIT line: skill `ui-work` step 4e).

## 5. Screens (sets 196–208)
- Renderer = gl_compatibility (the only one that runs in browsers); base viewport 854×480.
- godot/scenes/prep_layout.tscn belongs to the owner: code binds parts by name, a deleted part just disappears, colours / fonts / icons come from metas. `tools/make_prep_layout.gd` resets it and overwrites the owner's edits — never run it without asking.
- A part the owner should drag must not sit inside a Container (containers lock position; there is a test). Only code-filled lists stay rows.
- Children of a PanelContainer ignore anchors — use alignment or spacers. Changing a node's type in the scene also needs the `_part(lay, name, type)` call changed.

## 6. Files and tools
- Commit the `.gd.uid` file with every new script.
- GDScript uses tabs. Heredocs holding GDScript break in Git Bash → write a patch file with the Write tool.
- A new dev-only folder or addon → add it to `exclude_filter` in godot/export_presets.cfg in the same commit (security.md part 4).
- Engine: pinned 4.7.2 via godot/tools/get_godot.sh (cloud) or the console exe on the owner's PC; run from the repo root with `--path godot`.
- **Compatibility light trap (set 214):** a DirectionalLight3D with `shadow_enabled` is added in sRGB space in gl_compatibility → 3–5× too bright (white floor). Keep shadows off on the stage sun (blob shadows instead); exp fog counts from the camera — use `FOG_MODE_DEPTH`; `ambient_light_energy` does nothing with `AMBIENT_SOURCE_SKY`. Evidence: claude/preview-set214/notes.md.
- **tools/make_prep_layout.gd trap (set 213):** it regenerates every node unique_id and drops the scene uid → re-map the old ids by script after running it.
- **Import trap (set 215, CI #915 red):** a fresh checkout has no `.godot/imported`, so `load()` of any png/glb fails under `-s res://tests/run.gd` until `--headless --path godot --import` has run (the godot CI job now imports first). Code that loads art must fall back when it is missing (stage3d `_scene()` → `_code_floor()`).
- **Arena scene (set 215):** `godot/art/arena/runeplaza.glb` + `plaza.png` are made by `blender -b art/scene/runeplaza-v5.blend --python art/blender/export_godot.py -- <dir>` then `python -I art/blender/plaza_clean.py <dir> godot/art/arena/plaza.png` (~1 min, ~1.5 GB RAM; close other heavy apps). Edit the .blend, re-run both, re-import, re-shoot.
- .tscn order (set 216): a node block must come after its parent's block; reparenting a node by editing `parent=` alone, with the parent defined later in the file, drops the node without an error.
