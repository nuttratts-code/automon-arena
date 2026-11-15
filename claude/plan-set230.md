# Plan set 230 — FF Re-style plaza floor (SAMPLE in the scratch Godot copy; real code later via rule-change done + ui-work/merge-code)

Owner picks (15 Nov): A2 CC0 tileable textures · B2 free-shape flagstones (art-style V2.2) · C1 keep owner-placed stones + grass top + baked shade · D1 bake test + Blender ground now.
Notes + shots: claude/preview-set230/notes.md · scratch copy: see notes.

1. [x] CC0 candidates (Poly Haven, CC0): flagstone · dirt · grass/moss · gravel → contact sheet → owner picks. Security: download only after owner OK (file + source + size); licence page checked; credit line in art/PROVENANCE.csv when anything is committed; textures stay in scratch until ทำจริง.
2. [~] (sample: Godot CylinderMesh + shader mask instead of Blender; Blender only if owner keeps this route) Blender ground: flat round plaza disc (~same radius/height as plaza_hy) + outer ground, UV in metres, painted mask (R = flagstone, G = moss joints/edge, B = dirt) → glb. Check: top view render. Security: own-made mesh, no outside addon.
3. [~] round 1 done (s230-cc0-ground.png) Godot layered shader (base flagstone tiled ~1–2 m + dirt + moss by mask + grass Top on up faces of stones) on ground + stones. Check: arena shot vs A (tint 3). Security: own code, no external scripts.
4. [~] round 3 (s231-shade-fix.png; direction bug = plane hidden under the raised ground, fixed in the ground shader; moss olive) round 2 (s230-bake.png; CPU shade map) Baked shade: stones + ground into Blender at the Godot scene positions → Cycles bake AO/shadow into a ground lightmap texture (Godot LightmapGI bake in Compatibility = check first; Blender bake = fallback that surely works). Check: shot shows contact shade under every stone. Security: local only.
5. [ ] Owner review round(s) → notes.md · then ทำจริง (rule done V2.2 → ui-work branch → merge-code gate).
