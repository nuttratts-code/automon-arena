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
