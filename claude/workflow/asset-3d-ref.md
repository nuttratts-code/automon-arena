# asset-3d reference (moved out of the skill body set 220 E1)

V1.0 · 13 Nov 2026 (set 220 E1). Section numbers match skill asset-3d.

## 8. Owner dresses the arena by hand (owner pick 13 Nov: Godot for placing, Blender for shaping)
When the owner wants to arrange the scene themselves, point to **Godot** (give these steps in Thai):
| job | where |
|---|---|
| move / turn / scale stones, grass, far backdrop; add a prop; look through the game camera | **Godot** `scenes/arena_dressing_r6.tscn` (no export loop, game camera built in; `Slots` markers move where units stand) |
| change a prop's shape or paint | Blender → this skill §4 again |
| change the plaza floor (`art/arena/runeplaza.glb`) | Blender `art/scene/runeplaza-v5.blend` → Claude exports with `art/blender/export_godot.py` (edits made on the imported glb in Godot are lost) |
Steps for the owner: open the editor (§0) → double-click `scenes/arena_dressing_r6.tscn` → pick a node under `Near` / `Mid` / `Slots` → **W** move · **E** turn · **R** scale → game view: select `GameCam`, tick **Preview** (untick to keep editing) → new prop: drag a glb from `art/s217/3d/` onto `Near` → **Ctrl+S** → tell Claude to commit.
Owner rules: `Guides` (slot rings, plaza disc, ground) are editor-only helpers — do not move them, real slots live in stage3d.gd · keep props in the back half / away from the camera side so nothing hides the units.
Claude after the owner saves: `git diff godot/scenes/arena_dressing_r6.tscn` → game shot (§6.3) → commit the scene as the owner's work.
**Baked @tool data check (set 217 R18/R20 — happened twice):** the editor runs @tool scripts (e.g. `scripts/ui/s217_grass.gd`) and Ctrl+S saved what they built into the .tscn (`[sub_resource type="MultiMesh"/"ArrayMesh"/"QuadMesh"/"ImageTexture"…]` + `multimesh = SubResource(...)`, plus `<export> = null` lines) → 0.6–2.2 MB scene. After every owner save: `wc -c` the scene (normal ≈ 0.1–0.2 MB) and `git diff -U0 … | grep -E "^[-+](\[node|transform|\[sub_resource|multimesh|= null)"` → keep only the owner's `transform` / `visible` changes; delete the baked sub_resources (python, by id, assert each id is gone) and their `multimesh =` / `= null` lines; reshoot; commit. Prevention in any new @tool builder: drop the built resource on `NOTIFICATION_EDITOR_PRE_SAVE`, rebuild on `NOTIFICATION_EDITOR_POST_SAVE`. Also: an editable instance (`set_editable_instance`) saves the whole imported mesh — tint imported models with a small script on the instance root instead (`scripts/ui/s217_tint.gd`). Never regenerate the scene with `s217_make_r6.gd` over owner edits; mirror only what Claude itself changes into that tool.
