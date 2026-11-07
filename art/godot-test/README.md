# Godot HD-2D look test (set 135, 7 Nov 2026) — prototype only, not the game

Rune plaza v5 (Blender) exported to Godot 4.7 + placeholder pixel sprites lit in 3D. Shows what the post-MVP1 Godot move can look like.

Rebuild (cloud, no GPU — lavapipe software Vulkan):
1. `apt-get install -y mesa-vulkan-drivers` · `pip install bpy pillow` · Godot 4.7 linux zip from github.com/godotengine/godot-builds releases
2. Scene: needs `art/blender/runeplaza_scene.py` + `rock.py` from branch `claude/vibrant-einstein-fl4blz` next to `tools/export_glb.py` → `python export_glb.py <dir>/arena.glb` → copy `arena.glb` into `art/`
3. Sprites: `python tools/make_sprites.py sprites` (albedo, `_n` normal map from edge distance, `_e` glow mask; enemies pre-mirrored)
4. `godot --headless --import --path .` then
   `VK_ICD_FILENAMES=/usr/share/vulkan/icd.d/lvp_icd.json xvfb-run -a godot --path . --rendering-driver vulkan --resolution 1600x740 -- --mode=full --shot=out.png`
   (`--mode=raw` = no effects · attack clip: add `--fixed-fps 24 --write-movie movie/f.png` and `--anim`)

What `full` adds over `raw`: sprite normal maps + glow masks, rune OmniLights, glow/bloom, SSAO, volumetric fog + aerial fog, far DoF, tilt-shift + vignette + warm grade shader, light motes. Camera = Blender camera A exactly (frustum projection + lens shift), cells from `art/arena_board.json`.
Known gaps: procedural Blender materials lost in glTF (replaced by noise textures in Godot) · sky is a plain procedural gradient · cloud cards look flat.
