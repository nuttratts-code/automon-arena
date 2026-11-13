# art-look reference (moved out of the skill body set 220 E1 — read only when the step needs it)

V1.0 · 13 Nov 2026 (set 220 E1). Section numbers match skill art-look.

### 8b. Camera / formation / far-layer lessons (set 217 R5–R14 + P1, moved from ui-preview §8 set 219 E1)
- **Horizon math:** the camera sees from PITCH−FOV/2 to PITCH+FOV/2 below level (FOV 26 → ±13°). PITCH > 13° = no horizon on screen, so far paintings stand where the view meets the ground. Fit far cards to the LIVE camera every frame (`scripts/ui/s217_far_fit.gd`: sky fills the view, hills keep their shape with the bottom on the ground line) instead of placing them in the world; crop any big foreground meadow off the far picture (the 3D ground is the foreground).
- **Far layers in the world (set 217 P1, replaces the live-fit cards above once the owner keeps it):** measure the camera first (CAMXF line below). Everything below the top-of-view ray (PITCH − FOV/2 below level; FOV 19.2 / PITCH 14 → 4.4°) can show; to see sky, drop the ground past the plaza (plateau: ground shader `VERTEX.y -= 60·smoothstep(20, 45, r)`) and put each card's visible top where you want it on screen: `y = cam.y − D·tan(PITCH − FOV/2 + frac·FOV)` (frac 0 = screen top). Sky quad no fog, hills keep fog. Patches + numbers: claude/preview-set217/p1-patch-depth.py + p1t-patch-tune.py. Props on the slope reuse the shader drop in GDScript (`p1_drop`, change both).
- **Foreground framing does not fit a 6 vs 6 board** (P1): the board fills the width, free corners sit under the speed/stop/skip buttons → rocks cover front-lane units or hide behind the UI. Ask the owner before trying again.
- **Web look check (P0):** official templates live in `%APPDATA%/Godot/export_templates/4.7.2.stable` (web only, sha512 from get_godot.sh). Copy main scene → `claude/preview-set217/p0-web6v6.gd.txt` (boots into 6 vs 6, freezes time, steps STATE n via the window title), `--export-release Web`, then `CHROMIUM_PATH=<Chrome> python -I claude/preview-set217/p0-web.py <build> <shots>` (real GPU, headed). Compare with the desktop opengl3 PNGs of the same states.
- **Patch files on Windows:** some .gd files are CRLF → normalise to 
 before `assert old in s`, write back CRLF (p1-patch-depth.py `patch()`); rebuild from fresh repo copies of the patched files, never re-run a patch on an already patched copy.
- **Formation rule:** at a low camera, depth barely moves a unit up the screen, so the far lane must sit HALF a column out (FAR_SHIFT = column step / 2) → 6 different x per team, nobody hidden; give the lanes depth (R13: COL_X 1.8/4.2/6.6 · FAR_SHIFT 1.2 · LANE_Z −5.2/3.2), then grow the plaza until the farthest slot has margin. Wider columns make the camera dolly out (units shrink) — prefer depth.
- **One try per command:** `claude/preview-set217/r13-try.sh <g> <out> <pitch> <spr_h> <cols> <lanes> <far_shift> <plaza_k> <side px> <top px>` (needs `export G=<console exe>`) patches the copy, rebuilds the dressing scene, shoots. Compare `battle-mid` AND `prep-late` (prep crowds first).
- **Measure the battle camera** for the editor's GameCam: in the copy only, add `if k == 1.0: print("CAMXF ", var_to_str(cam.transform))` in stage3d `set_k`, run the shots, copy the most frequent CAMXF line.
- **6 vs 6 shot** (bot round 1 has only 2–3 units): copy `claude/preview-set217/s6v6.gd.txt` to `<g>/tests/s6v6.gd` and run it like shots.gd → `6v6-battle.png`.
- **Hide field overlays** for a clean look: `mi.layers = 0` on the rings (`visible = false` is undone by `_foe_rise`), card.visible / `_float` return in battle_view (R11 put them behind `S217_CLEAN` flags).
- **Before regenerating a scene the owner may have edited** (`s217_make_*.gd` overwrites it): `git status`/`git diff` the .tscn first; if changed, edit the file by hand instead.

## 6. Trade-offs to tell the owner when asked
- For: units stay cheap 2D (no models, rigs, 3D animation); pixel art leaves room for imagination and is quick to time; the 3D set gives light, depth and effects.
- Against: cohesion tuning is slow and per scene; sprites look like paper when light/shadow are off; camera freedom is limited; blur + glow cost frame time on phones and in the browser; the style is widely used, so the game needs its own identity (tribes, rune plaza, palette).
- Compatibility-only (A1) means the blur is a screen-space trick, less smooth than real depth of field. A desktop-only Forward+ look was option A2, not chosen.

## 7. Sources (read 11 Nov 2026)
- Developer interview on the reference game's cinematic pixel art: https://80.lv/articles/interview-how-final-fantasy-resonance-turns-hd-2d-pixel-art-into-a-cinematic-experience
- Unreal Engine spotlight (2019) and follow-up interview (2023) with the style's original team: https://www.unrealengine.com/en-US/spotlights/octopath-traveler-s-hd-2d-art-style-and-story-make-for-a-jrpg-dream-come-true · https://www.unrealengine.com/developer-interviews/octopath-traveler-ii-builds-a-bigger-bolder-world-in-its-stunning-hd-2d-style
- Famitsu talk summary (lighting on pixel art, 2D/2.5D/3D tiering, selective sharpness): https://www.famitsu.com/news/201906/07169244.html
- Trademark and criticism: https://en.wikipedia.org/wiki/HD-2D
- Godot 4.7 renderer feature table, SpriteBase3D, CameraAttributesPractical: https://docs.godotengine.org/en/4.7/tutorials/rendering/renderers.html · https://docs.godotengine.org/en/latest/classes/class_spritebase3d.html · https://docs.godotengine.org/en/latest/classes/class_cameraattributespractical.html
- Earlier project research: claude/review-2026-11-10-brainstorm-art-workflow.md
- Verified set 214: a shadowed sun is 3–5× too bright in Compatibility (sRGB-space shadow pass) → stage sun has shadows off; any real cast shadow needs a re-test first (claude/preview-set214/notes.md).
- Not verified: Alpha-cut Discard casting shadows in Compatibility; screen-texture mipmaps in the web export; SSAO cost on phones. Test each in step 2 before building on it.
