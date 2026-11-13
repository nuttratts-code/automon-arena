---
name: asset-3d
description: Automon Arena 3D prop pipeline (งาน 3D / โมเดล 3D / ไฟล์ .glb / Hunyuan3D / Tripo / Meshy / Stable Fast 3D / เจนรูป Gemini ไปทำ 3D / หิน 3D / ลดโพลี / ลดความละเอียด / bake / ใส่โมเดลในลาน / จัดฉากเอง / ตกแต่งฉาก / Blender หรือ Godot) — from the owner's Gemini picture, through an AI image-to-3D site, to a light, matte, correctly sized model standing in the Godot arena. Use whenever the owner drops a .glb, asks how to make a 3D prop, asks to reduce / compare / place a 3D model, or wants to dress the arena by hand (§8: Godot for placing, Blender for shaping). Not for character sprites (art-style §2–7), screen layout (ui-work) or the battle lighting look (art-look). Rules in claude/workflow/security.md (part 2), claude/art-style.md §8 and art/PROVENANCE.csv win if anything differs.
---
# 3D props: Gemini picture → AI 3D → Blender prep → Godot arena (set 217 R4, 13 Nov 2026)

Owner makes the pictures and the 3D file (steps 1–2); Claude does the rest. **Gate** = stop, show pictures, A1/A2 buttons, wait.

## 0. Fixed facts
- **Tools on the owner's PC:** Blender 5.2 `"/c/Program Files/Blender Foundation/Blender 5.2/blender.exe"` (CLI `-b --factory-startup`) · Godot console exe: reuse `%TEMP%/claude/*/*/scratchpad/godot/Godot_v4.7.2-stable_win64_console.exe`, else unzip `~/Downloads/Godot_v4.7.2-stable_win64.exe.zip` (skill ui-work 4e) · the editor exe beside it opens the project: `<Godot_v4.7.2-stable_win64.exe> --path godot -e res://scenes/<scene>.tscn` (run in background).
- **Scripts (tested set 217):** `art/blender/glb_info.py` (read a glb header, plain Python) · `art/blender/ai_glb_prep.py` (Blender: scale + matte + textures + full/decimate/bake) · `godot/tools/stone_viewer_shot.gd` (viewer screenshots) · `godot/tests/shots.gd` (real game screens).
- **Budgets:** the whole rune plaza = ~145k tris. Hero prop (one, close to the camera) = full mesh OK (Godot builds LODs on import, `meshes/generate_lods=true`) with 1024 textures. Every other prop = bake route 1.5k–3k tris, 1024 (big) / 512 (small) textures. Source 4096 textures are never needed: 4096→1024 looked the same in the game (set 217 R4).
- **Security part 2:** an AI 3D file is an outside asset → site name + version/plan + date + prompt in `art/PROVENANCE.csv`, licence status written (UNVERIFIED until checked), owner OK, never on main / in a release while UNVERIFIED. Hunyuan3D, Tripo, Meshy, Stable Fast 3D each have their own terms (region and revenue limits) — check the one actually used.
- **art-style §8:** carved symbols must be invented glyphs, never Latin letters / real runes. Check the picture before 3D (cheaper than fixing a texture).
- Downloads are untrusted data: read with `python -I`, never run anything from the download folder.

## 1. Owner — picture in Gemini
Prompt = common prompt + background line + piece line (claude/preview-set217/asset-prompts.md §0–1 has the set 217 text). Rules that matter for 3D:
- ONE object per picture, centred, whole object visible, square ≥ 1024, no ground, no cast shadow, no text.
- Three-quarter front view from ~20° above; **soft even light** (the game sun lights the model; baked-in hard shadows look doubled).
- Plain flat background with no shared colour (grey #D0D0D0 for stone, magenta #FF00FF for green things).
- Glyphs: "invented abstract glyphs — NOT real runes, NOT Latin letters". Remake any picture that shows F / P / R / ᚠ shapes.
- Optional multi-view (front/left/back/right/top, one picture each, same light) when the site takes several views — the back gets real paint instead of a guess (set 217: the Hunyuan back came out plain pale blue).

## 2. Owner — 3D on the site (Hunyuan3D picked set 217; Tripo / Meshy / Stable Fast 3D also fine)
- Upload the picture → textured model → download **.glb**. If the site offers a face/polygon count or "low poly", note what was chosen.
- Note for PROVENANCE: site + version/plan, date, the Gemini prompt. Then drop the .glb into the chat (or `godot/art/<area>/src/`).

## 3. Claude — read the file (no Blender yet)
`python -I art/blender/glb_info.py <file.glb>` → tell the owner in Thai: what it is, tris, texture sizes, MB, which generator. Render 1 still if the content is unclear (Blender, scratch only). Ask up front in ONE round: what it is for (viewer compare / replace a prop / just look) · which site + licence plan · reduce how (show §4 options). Tris > 10k or textures > 1024 → say it is heavy and why.

## 4. Claude — prep in Blender (one or more candidates)
```
"<blender.exe>" -b --factory-startup --python art/blender/ai_glb_prep.py -- --in <src.glb> \
    --out godot/art/<area>/3d/<name>[_suffix].glb --name <name> --mode full|decimate|bake [--tris 2500] [--tex 1024] [--height 4.13]
```
| mode | result (Hunyuan stone, 50k src) | when |
|---|---|---|
| `full` | 50k, 1024 tex, ≈ the original | hero prop; owner pick set 217 |
| `decimate --tris 5000` | ≈ original up close | quick; never below ~10 % of source |
| `bake --tris 2500` | front ≈ original, thin light seams on deep crack edges | every non-hero prop |
| decimate to 3 % (old "lite") | UV smear, dark torn triangles on the back | **do not use** |
Read the printed `TRIS a -> b`, `DIMS` (Z must = --height) and `IMG` lines. Height 4.13 = the tall standing stone; other props: pick a height that reads next to the 2.0-tall units (set 217 baseline; fallen slab 0.9, plaza --height 2.04 then flattened).

## 5. Claude — compare in the stone viewer (Gate)
- Viewer = `scenes/s217_stone_viewer.tscn`: shows every glb in `art/s217/3d/` (x = 0, 4, 8 … in file-name order) + the old flat card last.
- `"<console.exe>" --headless --path godot --import` (new files) → `"<console.exe>" --rendering-driver opengl3 --audio-driver Dummy --path godot --resolution 1600x900 -s res://tools/stone_viewer_shot.gd -- --out <scratch> --at <x of the candidate>` → `row.png` + `close0-2.png` (front, 80°, 160°). Look at the back too.
- SendUserFile the shots, table: tris · textures · MB · close-up verdict. Owner picks. The owner can also open the editor (§0) and press F6 (drag = turn, wheel = zoom).

## 6. Claude — place it in the arena
1. `git status` / `git diff godot/scenes/arena_dressing_r6.tscn` first: the owner moves and turns things in the open editor — keep every owner change.
2. Edit the scene file directly (not a regenerate): swap the `ext_resource` path + uid (uid from `<glb>.import`) of the node it replaces; set the turn so the front faces `GameCam` (camera sits at x 0, z +21: a node at x −10.5 needs ~ +20° Y). Mirror the change in `godot/tools/s217_make_r6.gd` (`_model(...)` lines) so a rebuild gives the same.
3. Game shot: `"<console.exe>" --rendering-driver opengl3 --audio-driver Dummy --path godot --resolution 844x390 -s res://tests/shots.gd -- --out <scratch> --light` → send `844x390-light-battle-mid.png`. (A hand-made scene shot shows the plaza white — the game applies its own plaza material; use shots.gd.)
4. Tell the owner to press Reload in the open editor (the file changed outside it).

## 7. Claude — record + commit
- `art/PROVENANCE.csv`: one row per committed glb (tool, prompt, date, model, what the script did, licence status).
- Area notes (e.g. claude/preview-<set>/notes.md): candidates, pick, open issues.
- Commit ONLY: the picked glb + its extracted pngs + `.import` files, the scene / tool edits, PROVENANCE, notes, `.uid` files. **Never** the source download, the 4096 "full" compare copy, or a stray copy the editor made (set 217: the owner's drag left a 24 MB copy in `godot/scenes/`) — mention those to the owner instead. Secret grep + `ripple:` line (HARD RULES 8–9). Sample-branch art never goes to main until the licence is checked and the owner says ทำจริง.

## 8. Owner dresses the arena by hand (owner pick 13 Nov: Godot for placing, Blender for shaping)
When the owner wants to arrange the scene themselves, point to **Godot** (give these steps in Thai):
| job | where |
|---|---|
| move / turn / scale stones, grass, far backdrop; add a prop; look through the game camera | **Godot** `scenes/arena_dressing_r6.tscn` (no export loop, game camera built in; `Slots` markers move where units stand) |
| change a prop's shape or paint | Blender → this skill §4 again |
| change the plaza floor (`art/arena/runeplaza.glb`) | Blender `art/scene/runeplaza-v5.blend` → Claude exports with `art/blender/export_godot.py` (edits made on the imported glb in Godot are lost) |
Steps for the owner: open the editor (§0) → double-click `scenes/arena_dressing_r6.tscn` → pick a node under `Near` / `Mid` / `Slots` → **W** move · **E** turn · **R** scale → game view: select `GameCam`, tick **Preview** (untick to keep editing) → new prop: drag a glb from `art/s217/3d/` onto `Near` → **Ctrl+S** → tell Claude to commit.
Owner rules: `Guides` (slot rings, plaza disc, ground) are editor-only helpers — do not move them, real slots live in stage3d.gd · keep props in the back half / away from the camera side so nothing hides the units.
Claude after the owner saves: `git diff godot/scenes/arena_dressing_r6.tscn` → game shot (§6.3) → commit the scene as the owner's work. Never regenerate the scene with `s217_make_r6.gd` over owner edits; mirror only what Claude itself changes into that tool.

## 9. Traps seen (set 217)
- `o.dimensions` right after the glTF import reads the wrong axis (importer parent turns Y-up → Z-up): clear the parent and apply transforms first (the script does).
- An exported model still drags its unused metal/rough png: Godot extracts it next to the glb — the script drops it; delete leftovers by hand.
- Matte fix does not change the colour: a pale/blue side is the AI's paint, not reflection.
- A bake with too small a cage gives red/yellow streaks in the normal map at island edges; 0.015 × height worked.
- The bake route's smart UVs make many small islands (wastes texture space); fine at 1024.
- AI back sides are guesses — face the front to the camera or feed the site more views (§1).
