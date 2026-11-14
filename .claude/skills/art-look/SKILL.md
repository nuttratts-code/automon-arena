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
### 8b. Camera / formation / far-layer lessons (set 217 R5–R14 + P1, moved from ui-preview §8 set 219 E1)
→ claude/workflow/art-look-ref.md (moved set 220 E1).

## 5. Do / Don't
Do: mock-up and camera before assets · one finished sample (1 unit + arena + light + post) before scaling up · one texel density and one palette file · a light flash with every effect · CC0 or own-made assets first · measure frame time after each added effect.
Don't: change renderer · use DOF/volumetric nodes (silently ignored in Compatibility) · linear filter or mipmaps on pixel art · alpha-blend many overlapping sprites · bake glow or shadows into sprites (code does it, art-style §1) · blur so hard that unit pixels stop reading on a phone · add any outside asset, addon, shader or font without source + licence + the owner's OK (HARD RULE 9 ②) · ship raw AI output · let art code touch core scripts or battle results.

## 6. Trade-offs to tell the owner when asked
→ claude/workflow/art-look-ref.md (moved set 220 E1).

## 7. Sources (read 11 Nov 2026)
→ claude/workflow/art-look-ref.md (moved set 220 E1).
