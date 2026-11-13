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
