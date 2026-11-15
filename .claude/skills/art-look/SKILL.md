---
name: art-look
description: Battle-scene look in the Godot port (ฉากสู้ / ภาพ HD-2D / แสง เงา เบลอ / เอฟเฟกต์สกิล / sprite ในฉาก / ปรับลาน / ตัวอย่างฉาก) — pixel sprites in a lit 3D set: arena, camera, light, fog, post effects, VFX, look samples. Not screens/menus (ui-work/ui-preview), props (asset-3d), values (balance-import).
---
# Art look (set 201 — research 11 Nov 2026; owner picks A1 · B1 · C1 · D2)

> Rules: claude/art-style.md, claude/plan-godot-migration.md P5, claude/workflow/security.md — they win if anything differs (description trimmed set 219 A1).

Claude does the work; the owner decides. Every **Gate** below = stop, show stills next to the target, offer A1/A2 (+ a recommended one), wait.

## 0. Fixed facts — do not re-decide
- **When:** real art work is plan step 8 (P5), after the P4 screens (owner pick C1, 11 Nov). Before P5 only this skill and docs change. A look spike earlier needs the owner's explicit OK (it eats into the 31 Dec target).
- **Renderer stays `gl_compatibility`** (owner pick A1; the only one that runs in the browser = plan G2b). So: **no built-in depth of field, no volumetric fog, no SSR/SSIL/SDFGI.** Glow, tonemap, adjustments, depth fog and custom full-screen shaders work. Godot 4.7 docs list SSAO as supported in Compatibility — check it in the web export before relying on it. Never switch renderer or add a second look without a rule-change.
- **Sprites:** claude/art-style.md §2 is the spec (64×64, 3/4 facing right, feet on row 58, ≤ ~16 colours, 1 px tinted outline, light from top-left, shown 2× unfiltered). Tool chain = Gemini → cleanup in Pixelorama/Aseprite by the owner (owner pick D2, art-style §4–7). Claude does not redraw sprites in another tool unless the owner asks.
- **Arena:** art-style §8 — rune plaza, built in 3D with Blender (`art/blender/`), camera A looking down (horizon ~40 % from top), board 2 sides × 3 columns × 2 rows, player left. Board layout and rules are not art decisions.
- **Reference:** the owner's target is the battle look of a 2026 pixel-sprite-on-3D RPG (boss-fight video, studied 11 Nov). Take the LOOK only (light, depth, sprite grounding, VFX). Never copy its characters, monsters, UI, layout or symbols, and never the look of the game named in CLAUDE.md line 1.
- **Words:** no game names, artist names or "HD-2D" in any AI prompt (art-style §4). "HD-2D" is a Square Enix trademark for the name, not the style — never use it in player-facing text or store pages.
- **Engine in the cloud:** Godot 4.7.2 via `godot/tools/get_godot.sh`; stills under Xvfb with `--rendering-driver opengl3` (ui-work step 4e). Judge the look on what the web export shows, not on a Forward+ render.
- **Owner's PC** (for local checks): Radeon RX 580 4 GB, driver from 2023 (update before first run), ~8 GB usable RAM. No local AI image/3D generation.

## 1. What the target look is made of (checklist for every comparison)
1. Sprites read as standing IN the scene: contact shadow under the feet, scene-coloured tint, same light direction as the arena.
2. Sharp focus band where units stand; foreground and far background soft.
3. One clear key light on the play area, darker edges (vignette), a few bright accents (runes, crystals).
4. Air: light motes or dust, slight depth fog toward the back.
5. Skill effects are bright, higher-resolution than the sprites, and throw coloured light on floor and neighbours.
6. Selected or acting unit has a clean glowing outline.
7. UI stays flat and sharp above everything (it is ui-work's job; never blurred by post effects).

## 2. Design rules from the original developers (sources in §7)
- Putting pixel sprites on a 3D set is not the look. The work is cohesion: tune light, blur and bloom together per scene, with sprites present.
- Pixel art already has painted light. Full real-time lighting on top doubles it and looks wrong: keep lighting on sprites restrained, use one fixed "stage" light.
- Object tiering: smaller than a unit = 2D sprite · bigger = full 3D · about unit-sized = 2.5D (front faces only). Organic props (grass, rocks, trees) mostly 2.5D.
- Crisp pixels in the focus area, deliberately soft elsewhere; less detail at the edges makes the whole image read richer.
- Every combat effect gets a point light flashed with it, so units cast shadows on the set.
- Sprites do not turn with the camera: a camera change can make them float or sink. Fix placement per camera angle; a big angle change needs redrawn sprites. Keep the battle camera fixed (camera A) unless the owner asks for moves.
- Order of work: target image → rough 3D mock-up → camera → revisions → real assets → lighting pass last.
- Aim at late-16-bit pixel art carried forward, not early-3D-console looks (those read as old, not nostalgic).
- It costs more than it looks. Budget most time for tuning, not asset production.

## 3. Before any edit
1. `chat-start` (Relay, 🔒 lock line naming `godot/` art files, branch `claude/<topic>`). Another lock on the same files → ask first.
2. Conflict check against art-style.md, plan-godot-migration.md step 8 and §0 above. A request that changes any of them → `rule-change` first.
3. Ask everything up front in one round: which scene, which units, which effects, phone sizes to judge on, whether anything may be published.
4. Plan file `claude/plan-setN.md` with a Security line per step (HARD RULE 9 ⑥).
5. Start from the prototype, not from zero: branch `claude/bold-fermi-jaq4an` → `art/godot-test/` (set 135: main.gd, post.gdshader tilt-shift + vignette + warm grade, sprite normal/glow masks, arena_board.json camera + cells). It was built on **Forward+** — see §4 step 2 for what must be replaced.

## 4. Steps
1. **Target sheet.** One page: the owner's target still(s), the §1 checklist, the current Godot still at 844×390 and 1366×768. **Gate 1:** owner confirms what "close enough" means (which checklist items matter most).
2. **Port the prototype to Compatibility** in a scene of its own under `godot/` (never inside ui/ scripts):
   | Forward+ feature in the prototype | Compatibility replacement |
   |---|---|
   | Far depth of field (CameraAttributesPractical) | Full-screen tilt-shift shader (post.gdshader: screen texture + mip LOD by screen Y). Check screen-texture mipmaps work in the web export; if not, a 2-pass blur into a SubViewport |
   | Volumetric fog | Depth fog + a few additive fog cards + motes |
   | SSAO | Try built-in (4.7); if absent or slow on phones, bake contact shade into floor textures + blob shadows |
   | MSAA 3D ×4, 4096 shadows | Start at MSAA off, 2048 shadows; raise only if the phone test allows |
   | Glow, AgX tonemap, adjustments | Keep; re-tune values (Compatibility glow differs) |
   Blender materials are lost in glTF (known gap): textures must be image files, set to Nearest filter per material.
3. **Sprites in the scene.** Sprite3D / AnimatedSprite3D: `texture_filter` Nearest · one `pixel_size` for every unit (no per-unit scaling; bigger rarity = bigger canvas content, art-style §2) · `alpha_cut` Discard (hard edge, writes depth, no sorting bugs; Opaque Pre-Pass only when a sprite needs soft alpha) · `shaded` off first, tint with `modulate`; try the prototype's normal-map lighting only as an A/B for the owner · billboard off, quad turned to face camera A by hand · blob or real shadow under row 58. `render_priority` only works with alpha cut Disabled.
4. **Light and post, together, with sprites in place.** One fixed key light (top-left, matching the painted light), dim cool ambient, accent OmniLights on runes, glow, tilt-shift band centred on the board, vignette, warm grade. **Gate 2:** side-by-side stills, owner picks blur strength, darkness, colour.
5. **Skill VFX.** Each effect = moving image + particles + light flash + timing, driven by the existing battle replay events (never change battle results). Cheapest first:
   | Way | Cost | Result |
   |---|---|---|
   | Code/shader only (recommended start) | free | least realistic; good for light, sparks, lightning |
   | Hand-drawn flipbook | free, slow | fits the sprites best |
   | AI-drawn flipbook sheet | owner's subscription | close to video quality; needs cleanup + provenance |
   | AI video cut into a flipbook | ~$3 per skill | most realistic; paid — ask first |
   CPUParticles3D if GPU particles misbehave in the web export. **Gate 3:** owner picks the way per effect family.
6. **Check on real targets.** Stills at 1366×768 · 844×390 · 667×375 (ui-work 4e) + the web export in Chromium + frame time on a phone-class device. Report per §1 item: pass / gap / next fix. Below 30 fps on the phone → cut effects in this order: SSAO, shadow size, glow, blur quality.
7. **Record + merge.** Assets added → `art/PROVENANCE.csv` row (id · tool · prompt · date · model · human-edit · licence) and credits where the licence asks. Then `merge-code` (setup → gate; Godot tests must still pass). Relay line says `art: stills 3 sizes ✓ · web export ✓ · provenance ✓`.

## 8. Look samples (set 219 E1 — set 217 ran 20+ arena rounds under ui-preview and never opened this skill)
- Arena / battle-scene look samples start HERE: conflict check against art-style.md (§8 camera angle) at the first round, not at ทำจริง.
- Mechanics = skill ui-preview steps 1–6c (scratch copy or sample branch mode, patch scripts, notes.md, Rebuild line); 3D props = skill asset-3d.
- No per-round design-critique / tell count (those are for screen UI); instead run the §1 checklist once per phase and record it in notes.md.

- **Outside references (set 221):** blur/bloom/fog/grade/shadow/web ideas from other HD-style projects + player complaints → claude/workflow/art-look-ref.md §9; read it at the start of each gaps phase.
### 8c. Arena sample shots on the owner's PC (set 226, owner A2 — 7 rounds, 2 traps)
1. Sample branch in a scratchpad worktree (never switch the main folder). Copy `godot/` → `<scratch>/g`, delete `<g>/.godot`, drop the `MCPRuntimeServer` line from `<g>/project.godot`, `sed` `const FOV := 26.0` → `19.2` in `scripts/ui/stage3d.gd`.
2. `python -I claude/preview-set217/p1-patch-depth.py <g>` → `p1t-patch-tune.py <g>`; sheets to `<g>/tests/s225/`; `s226.gd.txt` → `<g>/tests/s226.gd`.
3. Every new picture (sheet, card) goes in BEFORE `Godot_v4.7.2-stable_win64_console.exe --headless --path <g> --import` — a file added after the import does not load and fails silently (trap 1).
4. Shot: console exe `--rendering-driver opengl3 --audio-driver Dummy --path <g> --resolution 1920x1080 -s res://tests/s226.gd -- --out <dir> --look G <args>` (current args: last "Current pick" line of preview-set217/notes.md s226). Wrap it in a small `shot.sh <name> <look> [args]` in the scratchpad.
5. Placing things by screen position: `project_ray_*` and the visible rect are the 854×480 base here — compute rays from `cam.fov` + `cam.global_transform.basis` (trap 2); test a hidden object by colouring it red and counting red pixels.
6. Compare sheets with PIL (Tahoma for Thai labels), crops at 1:1 for pixel questions; copy script + shots + a notes.md line to the sample branch, commit, push.

### 8d. Drop any picture into the arena + set fixes (set 229, owner A2 — 15+ shots in one chat)
1. Picture → sprite: key the background (green: `g - max(r,b)` alpha; white: flood-fill from the edges, min channel > 232), crop, resize to a fixed height (~180 px = painted size) with LANCZOS → `<g>/tests/s225/<ID>.png`. `s226.gd` reads these with `Image.load_from_file`, so no re-import needed (trap 1 is for `res://` textures only).
2. Shot args: `--e:hf=1 --e:k=1 --e:ids=A/B/C/D/E/F --e:foe=…` (6 each side; left side is flipped). Pixel sprites: 80 px tall + `--e:k=2` (=FF Re ×2; ×3 crowds 6v6). ALWAYS pass the full look-G arg list — a shot without it renders the old default look (happened twice).
3. Set fixes added to the scratch copy (sample-only, not on any branch yet): env `S229_SMOOTH=1` skips stage3d `_s217_pixel_tex` (stones back to full smooth textures) · `--e:lod=1.2` lighter blur · `--e:stone_tone=r,g,b` tints Stone*/Fallen*/Rock* · `--e:ptex=<file>` swaps the plaza albedo (file in tests/s225) · `--e:pzn=1` · `--e:rim=1 …` fake contact ring (owner rejected — not shadow).
4. Plaza mesh carries its own grass skirt above the ground: a ring/decal at y 0.02 is hidden — test placement in red first (§8c.5).
5. Texel density check before blaming colour: `tests/s229_texel.gd` prints texture px per metre per prop (plaza 25 vs stones 74–89 at 1024 px). The library originals (`art/library/3d/originals/*.glb`) hold 4096 textures — prep scaled them down.
6. Other games' pictures used only as look references stay in the scratchpad — never commit or ship (HARD RULE 9 ②).

### 8e. Grass + flower patches from owner Gemini sheets (set 231, owner A2 — FF Re-style flat patches)
1. Owner prompt: blades/stems on flat pure magenta (#FF00FF), no ground, nothing touching the edges; flowers white/yellow/pale blue only (pink/purple keys out). 1K is enough — a blade is ~60–100 px tall on screen; 2K only for close cameras.
2. Keyer differs per sheet: **grass** = `claude/preview-set230/cut_magenta.py.txt` (scratch `tools/cut_magenta.py`) (alpha `min(R,B)−G` ramp + despill toward green) · **flowers** = `claude/preview-set230/key_flowers.py.txt` (colour distance to the sampled bg + edge despill; the grass despill kills blue/lilac). Flower keyer also splits stems by alpha column gaps and packs them into equal cells, bottom-aligned (`pgfn` = stem count).
3. Library first (art/library/README rule 2): originals + keyed copies in `art/library/pictures/<set>/` + INDEX rows, before the scratch copy `<g>/tests/s225/`.
4. Build: `s226.gd _s231_patches` (SurfaceTool quads: random ⅓ slice + flip + lean 10–40°, normals UP, COLOR.r 0 root/1 tip; shader `s231_patch.gdshader` forces view-space UP normal — cull_disabled flipped back faces went black). Owner pick H1 args + flowers: notes round 6. Check: blades not black/grey, no magenta fringe, flowers ≈ 1 per 16 blades.
5. **Trees / bushes / ivy cards (set 235 r31–r36):** prompts = set 235 chat list (2K trees, 1K others, magenta, no ground/shadow, white/yellow flowers only). Keyer: **row sheets** → `claude/preview-set230/key_trees.py.txt` (soft alpha + despill ONLY near the background — the grass keyer's global despill turns brown/orange trunks green; split by empty columns) · **grid sheets / strands** → `key_blobs.py.txt` (same key, split by 2-D blobs after a 6 px dilate). Thin-stem ivy breaks into fragments → keep pieces ≥ 400 px tall. Check every cut on grey (composite strip) before use. Build = `s226.gd _s235_trees / _s235_bushes` (unshaded FIXED_Y Sprite3D cards, bottom on `_s233_th`; tint ≈ 0.6,0.74,0.6 — unshaded cards glow yellow at 0.95). Placement lessons: extras go on the BACK of the plaza unless the owner names the front (r34 corner bushes rejected); far trees at the bay (z 24–60) hide, on the ridge (z 78–90) they need a dense dark line, not scattered pale ones. Args: notes.md r31–r36.

### 8f. Terrain, sea, waterfall rounds (set 233, owner A2 — 8 rounds, 3 lessons)
1. **HD stills only** (1920×1080 PNG, a before/after stack is fine) — no motion clips unless the owner asks for one that round (owner stopped a 34 MB clip render, set 233).
2. **Far water colour vs fog:** at 60–200 m on a grazing angle, fog + tonemap lift the water to near white; light colours (#9fbccb) render pure white. Test by setting the water to pure red (pink on screen = it draws, fog washes it), then use darker inputs (`wskyc=#4f7f96 wdeep=#365e72`). Tint params on textured shaders are multipliers (plaza `ptint` base 1.25,1.22,1.15 — values < 1 go dark).
3. **Every round saves its full arg list** in scratch `tools/rNN_args.txt` (run `sh shot233.sh <name> $(cat rNN_args.txt) <tweaks>`), and the closing round copies s226.gd + shaders + args to claude/preview-set230/*.txt — the scratch copy lives in a temp folder that can vanish. Low camera rule: sky only shows above the hill crests, so crests sit below the plateau; things placed on the "first shore" may sit in front of the visible sea — check what is actually on screen.

4. **Set 234 lessons (rounds 16–24):** compare every round against the target picture with `claude/preview-set230/cmp234.sh.txt` (render + stack ref over shot) and check a **1:1 crop** of edges/corners before sending — "floating grass" only showed at full size. The view is narrow (FOV 19.2): only about ±30 m wide at 100 m and ±6.6 m at the front row (z 7), so props past that are off screen; print a th(z) height profile before placing far props (visible ridge face 74–92 m; 40–70 m hidden in the bay; > 100 m on the sea). GDScript `posmod` is integer-only → use `fposmod` for texture-tile lookups. Clean shots for the owner's AI: `--e:noui=1 --e:nounits=1 --e:pg=0`.

### 8g. Bake an arena into the editable scene + view check (sets 236–237, owner A2 — done 4×)
Scratch copy `<g>` = `%TEMP%/claude/6778d44212994c0a/e44da554-341a-472f-839e-ef20a29a07a0/scratchpad/g`, tools in `<g>/../tools`, Godot = `…/GitHub/Godot_v4.7.2-stable_win64.exe/Godot_v4.7.2-stable_win64_console.exe` (GD).
1. **Before every bake:** `ls --time-style=+%H:%M:%S <g>/art/<name>/<name>.tscn` — a time newer than your last bake = the owner saved hand edits in Godot → ask before baking (a bake overwrites the whole file).
2. Bake (folder name = scene name, `bdir` default r36): `sh shot233v.sh <x>1 $(cat rNN_args.txt) --e:bdir=res://art/<name> --e:bake=1` → `timeout 900 $GD --headless --import --path <g>` → same with `--e:bake=2`; `out/last.log` must show `S236 pack 0 save 0`. Self-contained check: `grep -o 'path="[^"]*"' <tscn> | grep -v res://art/<name>/` = empty.
3. View check in the real app: `ARENA=res://art/<name>/<name>.tscn $GD --rendering-driver opengl3 --audio-driver Dummy --path <g> --resolution 1920x1080 -s res://tests/s236_view.gd -- --out <png>`.
4. Owner has Godot open → tell them to press **Reload** when it asks; if the scene then looks broken (lake gone, streaked ground — set 238), close Godot WITHOUT saving and reopen. Since set 238 the bake names meshes/shaders by content hash (`m_<hash>.res`), so a re-bake no longer swaps what a file name holds; bakes before that used counters. Open the editor for them: `Start-Process <GD without _console> --editor --path <g> res://art/<name>/<name>.tscn`.
5. **Far-layer trap (set 237):** the sky card sits at z −300 (width 300) and hides anything behind it; the ground mesh ends at z −450 and shows a flat edge if the terrain rises there. Backdrop quads go just in front of z −300; check with a raised debug camera (`--e:cpitch=2 --e:cpos=0,25,40`). `shot233.sh` greps only s225/s230/s233 lines — use `shot233v.sh` + `out/last.log` to see `s237 …` prints.
7. **r38 picture layers (set 238 V2.4):** after ANY re-bake of arena_r38 run `$GD --headless --path <g> -s res://tests/s238_matte_build.gd` (copy: claude/preview-set230/s238_matte_build.gd.txt) — it adds the S2/S3 picture layers, hides 3D beyond r 22 m, sinks the terrain, sets sun/ambient/fog and turns tilt-shift off. Run it on a fresh bake (or the backup), not twice on the same file. **Then, in this order, the owner-asked edits of set 238** (each edits the saved scene in place; make a backup first; copies in claude/preview-set230/*.txt): `s238_backgrass.gd` (34 tall grass clumps on the back arc) → `s238_backcut.gd` (hides props past the back cut; the cut itself is the terrain shader m238 `bcut_z −19.3 / bcut_w 0.6`) → `s238_newstones.gd` (6 standing stones → owner's new stones; StoneBig + StoneR keep the rune stone) → `s238_bushflowers.gd` (only the flowers part now — the 4 S238CoverBush were removed by the owner, so drop them from that script first) → `DAMT=0 s238_stonedetail.gd`. The S3 picture without its 2 runestones = `s239/nostones.py` (rewrites matte238_s3.png). View check from above: add `TOPCAM=1` to the s236_view.gd command (scratch copy: preview-set230/s236_view_topcam.gd.txt). Never open a full-size compare render the owner did not ask for.
6. Terrain height lives twice (`th237()` shader + `_s237_th()` GDScript): edit both in one script, assert each replace hit; GLSL-only lines (ternary, `slope`) have no GDScript twin.

### 8b. Camera / formation / far-layer lessons (set 217 R5–R14 + P1, moved from ui-preview §8 set 219 E1)
→ claude/workflow/art-look-ref.md (moved set 220 E1).

## 5. Do / Don't
Do: mock-up and camera before assets · one finished sample (1 unit + arena + light + post) before scaling up · one texel density and one palette file · a light flash with every effect · CC0 or own-made assets first · measure frame time after each added effect.
Don't: change renderer · use DOF/volumetric nodes (silently ignored in Compatibility) · linear filter or mipmaps on pixel art · alpha-blend many overlapping sprites · bake glow or shadows into sprites (code does it, art-style §1) · blur so hard that unit pixels stop reading on a phone · add any outside asset, addon, shader or font without source + licence + the owner's OK (HARD RULE 9 ②) · ship raw AI output · let art code touch core scripts or battle results.

## 6. Trade-offs to tell the owner when asked
→ claude/workflow/art-look-ref.md (moved set 220 E1).

## 7. Sources (read 11 Nov 2026)
→ claude/workflow/art-look-ref.md (moved set 220 E1).
