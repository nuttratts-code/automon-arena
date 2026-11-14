# Review 2026-11-14 — battle-scene look: gaps vs the HD-2D reference, in phases

Sources: skill hd-2d-ref (references/automon-comparison.md, numbers from the reference game demo, [DATA]/[INFER]/[APPROX] labels there) · skill art-look §1 checklist + §2 rules · claude/art-style.md §2/§8 · sample branch ccr-882ceb4b-0ewtk1 at 8fd4575 (set 217 R21: stage3d.gd, s217_hd2d.gd, s217_far_fit.gd, s217_grass.gd, battle_view.gd). Nothing in this file is decided; each phase goes through its own skill (rule-change / ui-preview / ui-work / art-look gates).

Summary: camera and framing are already close to the reference (scene width at the board ~16–17 m both). Biggest gaps: ① sprites read as paper (unlit `shaded = false`, placeholder 32×32 one frame) ② no depth (flat ground hides the sky, far cards stuck to the camera) ③ almost no battle motion/VFX (only floating numbers, stage.flash, card nudge).

Order follows art-look §2: camera → blockout → real assets → lighting last.

## Phase 0 — lock the base (no new art)
1. Camera decision: keep PITCH 14 · VFOV 26 (dist ~19.9 m) or reference lens HFOV 40.16 KEEP_WIDTH pulled back to ~28 m (flatter "diorama"; re-check R13 "nobody hides anyone"; fit_pose/project() must switch to the horizontal fov).
2. ทำจริง set 217: rule-change (art-style §8 camera A "horizon ~40 % from top" + set 216 R5) → fresh branch from main → rebuild from claude/preview-set217/notes.md (never regenerate s217_make_r6; owner hand-edited .tscn) → update test_ui camera/slot pins → setup → gate.
3. Web-export checks before building on them (claude/workflow/art-look-ref.md §7 "not verified"): screen-texture mipmaps for tilt-shift · alpha-cut Discard sprite shadows · SSAO cost.

## Phase 1 — depth blockout (Claude, placeholder art)
4. Ground outside the plaza slopes down 5–15 m from ~13 m to 40–100 m (reference shows sky this way, not by lowering pitch).
5. Far hills as in-world cards, 2–3 layers at 100–200 m below plaza level (parallax on the prep→battle dolly) instead of s217_far_fit camera-locked cards.
6. Sky: dome / 2–3 scrolling cloud rings (unshaded alpha-scissor, works in compat) instead of camera-locked sky_clouds.png.
7. Fog: fog_depth_begin 34 → ~15, end 110 → 200+, curve ~1.6–2.0.
8. Foreground framing: a few low rocks/bushes at bottom-left/right (~8–12 m from camera), blurred by the tilt-shift band.

## Phase 2 — sprites stand in the scene (owner art)
9. Real 64×64 sprites (art-style §2) replacing CC0 32×32 placeholders.
10. Minimum frames: idle / attack / hit / die (reference idle = 6 images at 7.5 fps).
11. Scene tint via modulate first; normal-map lighting only as an A/B for the owner (art-look §4 step 3).
12. Glowing outline on selected/acting unit · small foot shadow.

## Phase 3 — dressing (owner art mostly)
13. New grass tuft texture (removed R21) + yellow/pink/white flowers.
14. Standing stones stone_a…e + small rocks (now one rune stone reused).
15. Low bushes / far tree billboards (no big tree with light shafts — art-style §8 ban).
16. Ruined arch on a far hill (§8 landmark, not in the set 217 scene) · irregular plaza pavers.

## Phase 4 — light + colour pass (with sprites present)
17. Grade choice: current warm/desaturated vs saturated with cool lifted shadows.
18. Baked AO in Blender textures (compat has no GI).
19. Accent lights on runes · retune blur, vignette, bloom with real sprites.

## Phase 5 — battle motion + VFX
20. Attack lunge, hit flash, position-only camera shake.
21. Skill VFX with a light flash per effect (art-look §4 step 5, Gate 3 per family).
22. Battle-start camera (1.0 s ease) and victory camera (3.8 s).

## Phase 6 — in-scene UI
23. New style for slot rings + HP bars (hidden by S217_CLEAN).

## Phase 7 — ship checks
24. Frame time on web + phone; cut order from art-look §4 step 6.
25. Licences: Hunyuan rock_cliff_hy UNVERIFIED, Gemini images = placeholder; PROVENANCE.csv rows.

Schedule note: P5 art is not counted in the 31 Dec target (plan-godot-migration); phases 1+ eat into it.

Security: docs only; no secrets, no outside assets added.

## Outside references noted (set 221, owner: "just note it", nothing decided)
Read these when a phase starts; ideas only, own code:
- claude/review-2026-11-14-meowa-template.md: Godot HD-2D template, NO licence. P2 idle frame offset + foot shadow · P3 near-camera framing props · P4 drifting cloud shadows in the ground shader, cool-ambient shadow sample · P7 one web count switch.
- claude/review-2026-11-14-lumina.md: three.js HD-2D engine, MIT. P2 sun-facing sprite shadow copy (after the set 214 fix) · P4 pixel-exact sharp band + gentler edge, fog = sky horizon colour, bloom clamp, split toning · P7 shader warm-up at load.
- Player opinions (web search, set 221): the top complaint is too much blur ("everything off-centre is blurred"), then heavy bloom and 2D/3D mismatch. Keep the sharp band wide in P4.
- github GSansigolo/SimpleHD2D (Godot 4.1, last commit Nov 2023, NO licence, likely uses a sprite from a commercial game ("terra") → never take its files). Very basic: far DOF only, SSIL + light glow, shadowed sun, nearest-filter pixel materials, vignette canvas shader, 90° camera turn tween. Everything here we already have. One idea: **GridMap + MeshLibrary of pixel-textured blocks (floor/wall/stair)** so the owner can paint ruins/plaza pieces by hand in the editor. Use it in P3 if the owner wants block-built dressing.
- Wikipedia "HD-2D" (read 14 Nov 2026): Square Enix team (Asano) + Acquire, Octopath Traveler 2018, Unreal Engine 4. Core recipe = pixel sprites + billboards in full 3D, a light that makes sprites cast shadows, tilt-shift/DOF, bloom, volumetric light, fog, particles, parallax, active camera. Critics: the style is "wearing thin" (2025). **"HD-2D" / "HD2D" are Square Enix trademarks (EU + JP, filed Jan 2019).** Never put "HD-2D" in our game's title, store page, itch.io text or trailer; say e.g. "pixel sprites in a lit 3D diorama" (internal docs may keep the word). P7 ship check + godot-release text check. Also: don't look like a plain copy; our own touch (rune glow, meadow plateau) matters.
