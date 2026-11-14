# Art library — คลังภาพและโมเดล (ห้ามลบ · set 221, owner A1 + B1, 14 Nov 2026)

Every picture and model the owner gives (Gemini pictures, Hunyuan3D downloads, views, sheets) and every prepared version Claude makes from them is kept here **forever**. This folder is the source; the game only uses copies.

## Rules (Claude)
1. **Never delete, move or overwrite a file here.** No cleanup, no "remove unused", no "baseline". This holds even when a scene stops using the piece. A new version gets a new name (`_v2`, a date, a short hash).
2. **New owner file → library first.** Save it here before any other step, with a readable name `<what>_<tool>_<date>[_<hash8>].<ext>`, and add a row to INDEX.csv in the same commit.
3. **To use in the game:** copy from here into `godot/art/...` (prep scripts read from here, write to godot/). When the game stops using a piece, delete only the godot/ copy.
4. **Never shipped (HARD RULE 9 part 4):** this folder is outside the Godot project, so an export can never include it. Never point a Godot resource at it, and never move it under godot/.
5. **Git:** everything is committed, big originals too (owner B1). It is pushed to main (art/ = docs-only for CI). Binary types are listed in .gitattributes.
6. **Licence:** AI pieces are placeholders (owner accepted the risk, set 219 D). INDEX.csv carries the tool and status. A piece that goes into the game also gets its art/PROVENANCE.csv row as before.

## Folders
- `3d/originals/` — raw downloads from the AI 3D site (full 50k, 4096 textures), untouched.
- `3d/prepared/` — Claude's Blender-prepared versions (decimated, baked, scaled), with their texture files.
- `pictures/<set>/` — owner pictures (Gemini cards, sheets, views, sky, hills, ground) and Claude's cut-outs of them.

Index of every file: INDEX.csv.
