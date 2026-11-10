# Brainstorm — art workflow (backgrounds + characters) — 10 Nov 2026 (set: chat after 179)

Size A2 (5 simulated experts × 2 rounds, same model — diversity from role/bias/evidence only) · goal B2 (ranked tips).
**Question:** how to lay out folders, steps, tools and hardware to reach the owner's look (pixel characters in a lit 3D diorama, tilt-shift) with a no-code owner + Claude as coder. Success = consistent, original, game-ready art without pro skills.
**Caveat:** the owner's reference video (youtu.be/v6jEeB2M2SU) could NOT be opened (proxy 403, no search hit) → its real look is UNVERIFIED; plan assumes HD-2D-like (matches build-plan.md l.11-14 + art-style.md).

## Fit pack
MVP1 = offline web, real art is post-MVP1, game moves to Godot after MVP1 (6 Nov) · art-style.md V0.3: 64×64 sprites, 3/4 right, ≤16 colours, Gemini → Aseprite/Pixelorama cleanup (HL-1 passed), AI backgrounds failed → Blender bpy script (art/blender/arena_scene.py) · Godot HD-2D test (set 135): "matches, needs many adjustments" (textures lost from Blender, flat sky/clouds, fireball behind sprite) · original only, no game names / "HD-2D" in AI prompts · placeholder = CC0 Dungeon Crawl.

## Evidence pack
- T2 2019 Unreal spotlight: Octopath HD-2D = pixel sprites + 3D environment, point lights make sprites cast shadows; ~1.5 months to reach the look, small team — https://www.unrealengine.com/en-US/spotlights/octopath-traveler-s-hd-2d-art-style-and-story-make-for-a-jrpg-dream-come-true
- T3 Wikipedia: "HD-2D" is a Square Enix trademarked NAME, not the style — https://en.wikipedia.org/wiki/HD-2D
- T3 Godot recipe: 3D env + billboarded sprites + orthographic camera; depth tilt-shift shader — https://godotshaders.com/shader/depth-based-tilt-shift/ · forum: pixel sprite jitter in 2.5D (Godot 4.7) — https://forum.godotengine.org/t/pixel-art-sprite-jitters-while-moving-in-a-2d-gameplay-in-a-3d-world-2-5d-setup-godot-4-7/145750
- T1/T2 GDQuest pixel-art setup for Godot 4 — https://www.gdquest.com/library/pixel_art_setup_godot4/
- T1 Godot docs + Blender manual: glTF drops HDRI lighting; baked AO needs a workaround; Blender export has backface culling off — https://docs.godotengine.org/en/4.4/tutorials/assets_pipeline/importing_3d_scenes/available_formats.html · https://docs.blender.org/manual/en/latest/addons/scene_gltf2.html
- T3 AI-sprite vendor blogs (unverified, marketing-adjacent): lock palette, fixed canvas, one anchor image, never ship raw AI sheets, tiles have no reference so palette = prompt only, AI for backgrounds/prototypes + hand-polish heroes — e.g. https://www.spritecook.ai/blog/how-to-create-pixel-art-characters-with-ai
- T3 Aseprite Wizard (Godot importer) — https://github.com/viniciusgerevini/godot-aseprite-wizard (one anecdote of sheet-slicing misalignment)
- Guess/own knowledge (verify): US Copyright Office position = purely AI-made output generally not copyrightable.

## Panel
E1 HD-2D tech artist · E2 pixel-art animator · E3 no-code owner's advocate · E4 skeptic/legal red team · E5 cost realist + tabletop-diorama wildcard.

## Round 1 — top picks
- E1: look-first Godot spike with placeholder sprites; one-way folders + style bible; no HDRI/baked AO, relight in Godot.
- E2: golden set of 6 hand-finished anchors + ONE global ~48-colour .gpl palette; Pillow script (grid-snap, quantize, magenta removal, feet alignment); minimal animation by transforms; commons AI, rares hand-polished.
- E3: look-board page (owner picks A1/A2 stills = style anchor); numbered folders with contact-sheet approval + PROVENANCE.csv; Blender albedo+depth, Godot lights.
- E4: style bible + provenance ledger first; raw AI never ships; Blender → flat PNG layers, not live 3D in MVP1; 2-week look-dev spike.
- E5: paper-theatre (3–4 flat parallax layers + fake tilt-shift), vertical slice of 3 chars + 1 arena on owner's phone; Blender kit-bash only later; Pixelorama before buying Aseprite.

## Round 2 — debate highlights
- Flat pre-rendered plates (E4/E5): attacked by E1, E2 — baked light disagrees with sprite light, no shadows/glow on floor, tilt-shift fixed to one focus plane → "pixel art on a painted backdrop" (what the owner already rejected). E5 attacked the Blender-render route: no viewer/GPU, CPU renders take minutes, owner can't tweak.
- Live relighting in Godot (E1/E3): attacked by E4 — depends on glTF/jitter/web-export limits in an engine not yet shipped; must be judged on the phone/web build.
- Golden set (E2): attacked by E3 — "hand-finished" needs pixel skill the owner lacks; palette locked before seeing coloured light may look muddy.
- **Adopted by ≥4 of 5:** one global palette file + Pillow cleanup script · PROVENANCE.csv · contact-sheet approval per batch · spike/look-board BEFORE bulk art. E2 reordered: spike first, golden set second. E1 capped spike at ~2 weeks with a written fallback to flat layers. E3 demoted its Blender-passes idea to post-slice.

## Score (1–5; effort: 5 = cheap)
| Idea | Impact | Fit | Effort | Risk (5=safe) | Evidence |
|---|---|---|---|---|---|
| Style bible + palette file + cleanup script + provenance CSV | 5 | 5 | 5 | 5 | T3 + judgment |
| Look-board / contact-sheet approval by owner | 4 | 5 | 5 | 5 | judgment |
| Look-first Godot spike (6 sprites, 1 Blender arena, lights, tilt-shift, phone/web build, ≤2 weeks, fallback flat layers) | 5 | 4 | 3 | 4 | T2 + T3 |
| Backgrounds as flat parallax layers (fallback) | 3 | 4 | 4 | 4 | T3 + guess |
| Blender scene → live Godot relight (albedo only, no HDRI/AO) | 5 | 3 | 2 | 2 | T1 limits |
| Blender kit-bash prop library | 3 | 2 | 1 | 2 | guess |

## Consensus / disagreement / minority
- **Consensus:** lock style first (palette, size, light direction, outline); raw AI never ships; one-way folders; log provenance; test in the real engine at real size (phone screenshot + looping clip) before scaling; don't paint glow/shadow (code does it); don't name games/artists in prompts; 64 px locked unless the spike says otherwise.
- **Open:** live 3D relight (E1/E3) vs flat parallax layers (E4/E5). Spike decides.
- **Minority report (E5):** 32 px sprites on a paper-theatre flat set give ~80% of the feel at ~20% of the cost; ignored by 4/5 because rarity needs detail room — may still be right if the spike shows 64 px looks mushy/coarse in motion.

## Recommended folders (proposal)
```
art/style/        palette.gpl · rules.md (size, light top-left, outline) · prompt templates · golden refs
art/characters/<tribe>/<id>/raw_ai/ → clean/(.aseprite = master) → export/(png sheet+json)
art/backgrounds/  blend/ · export/(glTF or layer PNGs)
art/review/       contact sheets + look-board pages (owner picks)
art/PROVENANCE.csv  id · tool · prompt · date · model · human-edit y/n · licence
```
Tools: Gemini (sprites) · Pixelorama free / Aseprite ~$20 · Pillow script (Claude writes) · Blender + bpy (free, cloud CPU) · Godot (free). Hardware: any laptop; GPU/tablet optional (tablet only if owner wants to draw).
Do/Don't list is in the chat summary.

## Options for the owner
- **A1 (recommended):** now only the cheap base (style bible + palette + cleanup script + provenance + look-board). Spike after MVP1 as planned.
- **A2:** also run the look-first spike now (≤2 weeks, fallback flat layers) — conflicts with build-plan l.14 "no real art work in MVP1" → needs an explicit OK.
- **A3:** switch to flat parallax + 32 px (minority) — changes art-style V0.3 (64 px), needs rule-change.
Next step per skills: docs/art-style → `rule-change`; any look-board page → `ui-work`.
