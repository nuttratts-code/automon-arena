# Set 217 — rune-plaza backdrop samples (ui-preview, NO real code)

Owner picks (12 Nov): A1 hybrid (3D near + painted far layers) · B1 AI (Gemini) art allowed in-game as a placeholder, to be replaced by real art before selling · C1 camera ~22°.
Conflicts to settle at ทำจริง (rule-change): art-style §8 "target picture is not in-game" + angle A 40° (7 Nov) · security part ② provenance line per asset in art/PROVENANCE.csv · rune glyphs on the stones look like real runes / Latin F, P (art-style §8 forbids) → regenerate or paint over.

Owner art (uploads, NOT stored in repo, Gemini-made, white background): full target · stone_tall · plaza (side view) · rock · grass_big · stone_fallen · 4-stone sheet · 6-grass sheet · backdrop (hills + arch, empty white sky).

## R1
- r1-cut.py: white → alpha (un-premultiplied, no halo), sheets split, trimmed, ≤512 px tall; backdrop: bottom 28 % (big flowers) dropped, bottom faded, halves mirrored for width.
- r1-patch-cards.py: PITCH 22 · FOV 26 · LANE_Z ±2.3 · far-lane stagger (= set 216 R5) · glb far parts hidden (Far/Rocks/Arch/Woods/Runes/Flowers) · 8 standing-stone/rock cards (Sprite3D, fixed-Y billboard, unlit) on the back half · 10 grass cards · backdrop card behind.
- After the patch, sample tweaks: backdrop → Vector3(0,-2.5,-24), 17 tall · Near ground albedo ×(1.35,1.45,1.0) · app.gd board_targets battle grow_individual(-90,-165,-90,-4), prep (-side-50,-120,-side-50,-4) → board sits lower, scenery shows (units ~25 % smaller).
- Cost: 19 cards ≈ 38 triangles + plaza glb (heavy parts hidden; at ทำจริง drop them from the export) · textures ≈ 6 MB PNG raw → compress (VRAM/WebP) at ทำจริง.
- Seen: plaza glb stays the old picture (its stone tiles differ from the new plaza art); sky not on screen at 844×390; front grass cards cut by the shop panel in prep.
Rebuild R1: copy godot → <scratch>/g, drop MCPRuntimeServer line, put the owner uploads where r1-cut.py's U points, `python3 -I r1-cut.py <g>/art/s217`, `python3 r1-patch-cards.py <g>`, the tweaks above (sed), `--headless --import`, shots.
- R2 (owner A1 Godot + B1 keep images on this branch): godot/scenes/arena_dressing.tscn (made by godot/tools/s217_make_dressing.gd) holds every card as a node — Far/Backdrop · Stones/* · Grass/* · Guides (ground, plaza disc, 12 slot rings blue = you, red = enemy) · GameCam (battle camera 844×390). r2-patch-dressing.py: stage3d.gd _cards() loads that scene, deletes Guides + GameCam. R1 patch + tweaks are now applied to the real godot/ files ON THIS BRANCH ONLY (sample branch: never merge as is; tests not run). Shots identical to R1, AUDIT clean, MOVE CHECK PASS.
Rebuild R2: on this branch nothing to rebuild — open godot/ in the editor.
## R3 — 3D stone from the owner's 5 views (owner: "send many angles, can you paint every side?")
- Views (owner, magenta bg): art/s217/stone_a_tall_{front,left,back,right,top}.webp — left = camera on the stone's left (front face at the image's right edge). One bad first try (5 views in one sheet, bottom row blurred) → owner re-made them one by one.
- r3-hull-stone.py (pip bpy 5.2 in a scratch venv): carve a voxel grid with the 4 side silhouettes → remesh + smooth → 3000 tris → each face takes the paint of the view it faces (top view only on the cap above 80 % height) → atlas 3×2×512 → godot/art/s217/3d/stone_a_tall.glb (1.3 MB) + Cycles turntable.
- s217_make_dressing.gd: `_model_of()` maps a card to a glb; StoneTall is now the 3D stone (rot Y 12°). Battle shot: works, MOVE CHECK PASS.
- Seen: top cap patchy (top view weak) · hard seam where two views meet at the corners · the 3D stone is lit by the game sun so it reads a bit darker than the unlit cards · carved glyphs still hide F / P shapes (art-style §8) — owner to decide (repaint by Claude or regenerate).
Rebuild R3: `bvenv/bin/python r3-hull-stone.py front left back right top <out> stone_a_tall` → copy glb to godot/art/s217/3d/ → `godot --headless -s res://tools/s217_make_dressing.gd`.

## R4 (13 Nov) — owner's Hunyuan3D stone
- Owner made a 50k-tri rune stone in Tencent Hunyuan3D (4096 PBR textures, 24.7 MB). Tried in the stone viewer: 5k decimate (`stone_hy_runes`), 1.5k decimate + normal bake (`_lite`, UV smear on the back = bad), 2.5k with new UVs + colour/normal bake (`_bake`, thin light seams on the crack edge), full 50k + 1024 textures (`_full1k`, ≈ the original). The 4096 copy (`_full`) stays local, not committed.
- **Owner pick: `stone_hy_runes_full1k`** (full mesh, textures 1024, metal/rough dropped = matte, Godot auto LOD). StoneTall in arena_dressing.tscn now uses it at rot Y 20° (runes face the battle camera); the owner's editor turns of RockL are kept. Battle shot 844×390 OK.
- Open: Hunyuan3D licence unverified (art/PROVENANCE.csv) · glyphs still read like Latin F / P (art-style §8, same as the old card) · 50k tris each = heavy if many stones use it (whole plaza ~145k) → for more stones use the `_bake` route.
- Build scripts (Blender 5.2 CLI, scratch only): import → clear parent + apply → scale to 4.13 tall → (decimate / smart UV + Cycles bake) → textures 1024 → export glb into godot/art/s217/3d/.

## R5 (13 Nov) — 4 depth layers from the owner's full target picture (owner A1 · B1 reuse the Hunyuan stone · C1 cut far layers from the picture · D1 sample only)
- r5-cut-far.py → godot/art/s217/far_sky.png (rows 0–560, stones painted out by a row-wise left/right blend) + far_hills.png (green hills + arch, alpha from a per-column hill line, bottom 70 rows fade into the 3D ground).
- godot/tools/s217_make_r5.gd → godot/scenes/arena_dressing_r5.tscn: 4 Sky card (D 52) · 3 Hills card (D 40) — both square to the battle camera, same screen mapping, picture row 250 at the screen top, row 560 just under the hills/ground line, squashed up/down to fit · 2 Mid ground plane (lit, #7f8c48) + the 10 grass cards · 1 Stones: StoneBig = stone_hy_runes_full1k, 8 more stones + 6 rocks = stone_hy_runes_bake (2.5k) scaled/turned/laid down (≈ 50k + 14×2.5k tris). Guides + GameCam as before. The old arena_dressing.tscn is untouched.
- The real stage3d.gd still loads the old scene; the copy uses r5-patch-load.py (loads r5 first). Owner can open arena_dressing_r5.tscn in the editor (GameCam → Preview).
- Seen: at PITCH 22 / FOV 26 the camera sees only a ~70 px band of far scenery — the sky never shows (only rows 250–470 of the picture); far cards are fitted to the battle camera, so in prep (other camera) the band sits lower · painted-out stone spots show as soft streaks (top-left, top-right) · bake stones read cold blue-grey next to the warm picture · glyphs still Latin-like (art-style §8).
- Rebuild R5: copy godot → <scratch>/g (drop MCPRuntimeServer), `python -I r5-cut-far.py <target.jpg> <g>/art/s217`, `python -I r5-patch-load.py <g>`, `--headless --import`, `--headless -s res://tools/s217_make_r5.gd`, shots `--light`.

## R6 (13 Nov) — owner's v3 pieces (folder ~/OneDrive/Documents/Godot/automon-arena-main/3D, not in repo)
- Got: 3D plaza disc (Hunyuan 50k) · fallen rune slab (Hunyuan 48.6k) · sky · far hills (magenta sky) · ground tile. Not yet: the 5 standing stones (stone_a…e) → the old rune stone (full1k hero + bake copies) stands in.
- ai_glb_prep: plaza_hy.glb (full, 1024 tex, Ø 18.9) · stone_fallen_hy.glb (bake 3k, 0.9 high). r6-cut.py: sky 2048 · far_hills_v3 (keyed, bottom 30 % big meadow cut, bottom 10 % fade) · ground_tile 1024.
- s217_make_r6.gd → arena_dressing_r6.tscn: Far (script scripts/ui/s217_far_fit.gd fits Sky + Hills to the live camera every frame: sky fills the view at 60, hills true shape at 40 with its bottom on the ground line — works for any camera angle) · Mid ground plane 120×56 tiled (1 tile = 7 u, tone 0.78) ending behind the plaza + grass cards · Near plaza (flattened ×0.16 → 0.33 high, top at y 0, tone 0.74) + stones + 2 fallen slabs.
- r6-patch.py (copy only): loads r6, hides runeplaza.glb, optional camera angle arg. Shots at PITCH 22 / 14 / 8: 22 = hills band only, no sky · 14 = hills + mist mountains, still no sky, plaza fills more · 8 = arch + sky edge show, but back units hide behind front ones (HP bars overlap) → 8 is out for play.
- Seen: plaza texture still pale next to the grass · ground tile repeat visible as stripes · stones are still the one old model.
- Rebuild R6: R5 copy steps, then `python -I r6-cut.py <sky> <hills> <ground> <g>/art/s217`, ai_glb_prep (plaza full --height 2.04 · fallen bake --tris 3000 --height 0.9), `python -I r6-patch.py <g> [pitch]`, import, `-s res://tools/s217_make_r6.gd`, shots `--light`.

## R7 (13 Nov) — owner: likes camera 8° (R6 pic 3) + the staggered party of a FF-style reference screenshot (not stored)
- r7-patch-formation.py <g> <COL_X> <LANE_Z> <far-lane x shift> (copy only). Tries: 8° + cols 1.6/4.0/6.4, lanes −3.2/2.6, shift 1.3 → board shrinks, units tiny · **8° and 12° + cols 1.4/3.4/5.4, lanes −3.6/3.0, shift 1.0** (shots R7-cam8 / R7-cam12) → sky + arch show, teams readable; big sprites (the foe bird) still overlap the far-lane unit's HP label; prep framing crowds units together.
- Seen vs the reference: our units are much smaller (board fit keeps the whole plaza + reserves the top 165 px for scenery); reference units are big and the backdrop is a near wall.
- Conflicts for ทำจริง (rule-change): art-style §8 angle A + set 217 C1 (22°) · set 216 R5 LANE_Z ±2.3 · stage3d formation constants feed tests (slot_pos tests, MOVE CHECK).
- Rebuild R7: R6 rebuild, then `python -I r6-patch.py <g> 8` (or 12) + `python -I r7-patch-formation.py <g> 1.4,3.4,5.4 -3.6,3.0 1.0`, shots.

## R8 (13 Nov) — owner: "ขยายตัวละคร" (bigger units)
- r8-patch-bigger.py <g> <SPR_H> <side px> <top px> (copy only): SPR_H 1.7 → 2.3 · battle frame app.gd board_targets grow (-90,-165,-90) → (-10,-90,-10) so the camera frames the units, not the whole plaza · with R7 formation widened: COL_X 1.5/4.1/6.7 · LANE_Z −4.0/3.0 · far-lane shift 1.3 (tried SPR_H 2.6 + COL_X 1.3/3.1/4.9 first: big but units pile up).
- Shots R8-cam8 / R8-cam12 battle + R8-cam12 prep: units ≈ 1.6× taller on screen, teams read apart, sky + hills stay. Left: big (×1.5) units still cover part of the far-lane unit behind · prep framing (pr rect, bench + shop room) keeps your 6 units crowded — prep needs its own pass.
- Rebuild R8: R7 rebuild with `r7-patch-formation.py <g> 1.5,4.1,6.7 -4.0,3.0 1.3`, then `r8-patch-bigger.py <g> 2.3 10 90`, shots.

## R9 (13 Nov) — owner: "stand further apart?"
- Camera 12°, SPR_H 2.3, frame (-10,-90). A = deeper only: LANE_Z −6.0/3.6, far-lane shift 1.8, COL_X 1.5/4.1/6.7 → no unit covers another, unit size ≈ R8 (far lane reads smaller by perspective). B = deeper + wider (COL_X 1.8/4.8/7.8) → camera pulls back, units smaller. Pick so far: A (Claude), owner to confirm.
- Rebuild R9 A: R8 rebuild with `r7-patch-formation.py <g> 1.5,4.1,6.7 -6.0,3.6 1.8` (+ `r6-patch.py <g> 12`).

## R10 (13 Nov) — owner: lanes stood off the plaza → fix · "take out the HP numbers, everything, for now"
- s217_make_r6.gd PLAZA_K 1.35: plaza Ø 25.4 (was 18.9); stones + grass cards pushed out by the same factor (arena_dressing_r6.tscn rebuilt). All 12 slots now sit on the stone.
- r10-patch-clean.py (copy only): unit HP bar + numbers + status chips hidden (battle_view card.visible = false) · floating damage numbers off (_float returns) · slot rune rings not drawn (mi.layers = 0 — visible = false is undone by _foe_rise) · feet stars + tribe mark hidden. Kept: HUD, shop, buttons, the "คู่แข่ง" text lines.
- Note for ทำจริง: hiding HP/rings removes feedback the game needs (who is hurt, where to drop) — owner said "not used yet"; bring them back in a new style later.
- Rebuild R10: R9 A rebuild + `python -I r10-patch-clean.py <g>` + `-s res://tools/s217_make_r6.gd`.

## R11 (13 Nov) — owner: "bring this spacing back (R8 pic) and write it into Godot; bring the character models, I'll adjust myself"
- Written into the REAL godot files on this sample branch (never merge as is; tests not run — test_ui pins the old camera/slot numbers):
  stage3d.gd PITCH 12 · SPR_H 2.3 · COL_X 1.5/4.1/6.7 · LANE_Z −4.0/3.0 · FAR_SHIFT 1.3 · S217_CLEAN (rings, foot stars, tribe marks off) · old runeplaza.glb hidden · loads arena_dressing_r6.tscn · `static var slot_override` filled from its Slots markers · battle_view.gd S217_CLEAN (HP bar/numbers/chips/damage numbers off) · app.gd battle frame (−10, −90).
- arena_dressing_r6.tscn (PLAZA_K back to 1.0): new **Slots** node = 12 Marker3D `Slot<side>_<row>_<lane>` (side 0 = you, lane 0 = far line), each with a preview unit sprite (game art, game height, leaned 12°) + ring. Move a marker → that slot's unit stands there in the game (x/z only). GameCam = the measured battle camera at 12° (Transform3D(..., 0, 5.56, 19.10)).
- Shot R11-battle-mid = same as R8 cam12, field clean. Rebuild: `godot --headless --path godot -s res://tools/s217_make_r6.gd` (overwrites the owner's marker moves — after the owner edits, edit the scene by hand instead).
- R12 (owner: "smaller units"): SPR_H 2.3 → 1.9 in stage3d.gd (real, sample branch); scene rebuilt (owner had not edited it yet) → preview units 1.9, GameCam re-measured (y 5.40, z 19.14). Shot R12-units19-battle-mid.

## R13 (13 Nov) — owner: "keep them inside the plaza, as close to the FF Resonance ref as you can; any size may change"
- Tries (r13-try.sh on the copy): 12° / 16° with lanes −3.6/2.6 → prep pairs stack (far unit hides behind the near one: at a low camera depth barely moves things up the screen) · lesson: the far lane must sit HALF a column out (even interleave → 6 different x per team, like the ref's diagonal) and the lanes need more depth.
- Picked t4 → written to the real files (sample branch): PITCH 14 · SPR_H 2.0 · COL_X 1.8/4.2/6.6 · FAR_SHIFT 1.2 (= half the 2.4 column step) · LANE_Z −5.2/3.2 · plaza ×1.35 (Ø 25.4; farthest slot 9.3 from centre) · GameCam re-measured. Shots R13-battle-mid / R13-prep-late: two clear staggered lines, nobody hidden, sky still shows at the top.
- Why not exactly the ref: the ref looks down more AND has a near cliff wall; our far view is open hills, so a steeper camera loses the hills (see R5/R6). 14° = the compromise.
- R14 (owner: "show a 6 vs 6 fight"): s6v6.gd.txt (copy to <g>/tests/s6v6.gd) enters a fight, then swaps the stage's battle units for 12 sample units → R14-6v6-battle.png (R13 values). Reads as two straight lines of 3 per team (not yet the ref's diagonal); all 12 on the plaza and on screen.

## Baseline (13 Nov, owner: "clear what is unused, this is the base to tune from")
- **Base = R13/R14:** arena_dressing_r6.tscn + s217_make_r6.gd + s217_far_fit.gd + stage3d/battle_view/app.gd values in the Relay.
- Removed (git history keeps them): R1–R5 flat cards (backdrop, stone0–3, rock, stone_fallen, stone_tall, far_sky, far_hills) · R3 hull stone (stone_a_tall + its 5 view pictures in art/s217/) · stone_hy_runes 5k + lite · arena_dressing.tscn / _r5.tscn + their tools · untracked: the 4096 stone_hy_runes_full copy, the editor's stray ae7b… copy in godot/scenes/. PROVENANCE rows of removed files dropped. The R1–R5 rebuild lines above no longer work (files gone).
- Kept 3D: plaza_hy · stone_fallen_hy · stone_hy_runes_full1k (hero) · stone_hy_runes_bake (copies). Stone viewer (asset-3d) still lists whatever glb is in art/s217/3d/.

## R15 (13 Nov) — owner A3 (cliff one side + small rocks) · B1 (owner makes stone_a…e later) · C1 plaza darker/warmer · C2 ground stripes · "background ground empty, lifeless"
- New owner model (Hunyuan 50k layered rock outcrop) → `ai_glb_prep --mode bake --tris 3000 --tex 1024 --height 1.0` → art/s217/3d/rock_cliff_hy.glb (1.62 × 1.6 × 1.0). s217_make_r6.gd: CliffL + CliffL2 (×7.5/6.5/5.5 and ×6/5/5) back-left behind the hero stone, boulders RockR / RockBack / RockL at the plaza edge. Hills stay open on the right.
- **Found:** the plaza tone (R6 "0.74") was never saved — material_override on children of an instanced glb is dropped by PackedScene.pack() unless `set_editable_instance(plaza, true)`. Now saved; PLAZA_TONE 0.62/0.58/0.49 (A, darker) vs 0.70/0.67/0.58 (B, mid, scratch only) shown to the owner.
- Ground: ShaderMaterial (GROUND_SHADER) samples the tile twice (2nd turned 37°, ×0.61) blended by soft noise + large sunlit/shaded patches; the editor had also re-imported the s217 pngs with mipmaps (VRAM compressed) — committed.
- Meadow: 46 seeded extra tufts (seed 21715, off the plaza, out of the cliff corner, taller further back) + "Pollen" CPUParticles3D (70 warm motes drifting).
- Shots: R15-A-plaza-dark / R15-B-plaza-mid (6 vs 6, s6v6.gd). Rebuild: import, `-s res://tools/s217_make_r6.gd`, s6v6 shot.

## R16 (13 Nov) — owner: "take the back rocks out, place the stones exactly like the target picture, tell me what is missing; remove every cut-out grass card"
- Plaza tone = R15 B (0.70/0.67/0.58; owner did not pick → Claude's recommended mid). Cliff (R15 A3) removed by the owner's new order; RockBack too.
- s217_make_r6.gd: all grass cards + the meadow scatter removed. Stones follow the owner's target painting (Downloads, Gemini "rune meadow", not stored): ring list `stones` [name, file, x, z, scale, extra turn, lean], each turned to face the battle camera; hero back-left + small companion, lone back stone, slab + short stone back-right, tall back-right, near-right big, left tall + near-left leaning; front-right broken slab; 4 small boulders (rock_cliff_hy small). Pollen kept.
- Shots: R16-6v6-battle (battle camera shows the back arc only — the side/front stones are off screen) · R16-overview (wide camera like the painting; scratch script overview.gd.txt → <g>/tests/overview.gd `-- --out <png>`, 1376x768).
- vs the painting: our stones are smaller next to the plaza (painting: stones ≈ 1/3 of the plaza width tall) · stones read cold blue-white · missing: flowers (yellow/pink/white), grass blades at the plaza edge, 5 different stone shapes (owner B1), small rock variety (owner has a rock sheet image), plaza tiles in the painting are irregular flagstones (ours = rings).
