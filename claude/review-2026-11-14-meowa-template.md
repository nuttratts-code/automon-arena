# Review 2026-11-14 — HD2D-template-meowa vs the set 217 arena (ideas only)

Source: github.com/Meowa-AI/HD2D-template-meowa (Godot 4.6, last commit 29 Jul 2026, 13 stars), shallow clone in scratchpad, read: scripts/HD2D.gd, HD2DEnvironment.gd, HD2DStage.gd, WebCompatibility.gd, CloudShadows.gd, AnimatedBillboard.gd, shaders/windblown.gdshader, grass_blade.gdshader, project.godot.

**HARD RULE 9 part 2:** the repo has NO licence file, so all rights are reserved. Copy nothing (code, shaders, numbers, assets); write our own versions from the ideas. The project also imitates Octopath ("Orsterra"), and its comments claim "exact Cassette Beasts values", so don't reuse its numbers either. Owner picked A1 (read + compare, no code) in set 221.

## What it does, and how that compares with ours

| # | Template idea | Ours (set 217 branch ccr-882ceb4b-0ewtk1) | Verdict |
|---|---|---|---|
| 1 | Web mode (`OS.has_feature("web")`) switches OFF fog, glow, SSAO, DOF, colour adjust and sun shadows, and uses a linear tonemap, so its web build looks flat | P0 proved our screen-texture tilt-shift + grade pass works on the web (s217_hd2d.gd) | **Ours is better.** Don't copy their web approach. One idea worth keeping: one central `web` switch for counts (motes, cards). Phase 7 item 24 |
| 2 | Blob shadow: Decal on desktop, on web a flat unshaded quad with a radial alpha texture drawn in code | R19 L2 shadow cards under stones (same flat-quad idea) | Confirms our L2 way. Reuse our card code for gap item 12 (small foot shadow under units) |
| 3 | Cloud shadows: 7 big Decals drift across the field with the wind | Not in our scene. Decals don't run in gl_compatibility (their web build turns them off too) | **New idea for phase 4:** scroll a soft noise darkening inside our own ground shader, which costs nothing extra on the web |
| 4 | Windblown shader: sway grows toward the top (height²), base pinned, phase from world x/z so neighbours move out of step | s217_grass.gd R18 does the same (top-only sway) | Already have it. Reuse it for the owner's new grass picture + bushes (phase 3 items 13/15) |
| 5 | Foreground frame: 2 out-of-focus bushes near the camera at the screen edges | P1 parked the foreground rocks | **Idea for phase 3:** retry near-camera framing props, blurred by our tilt-shift band. Check the shop panel doesn't cover them (R1 saw front cards cut) |
| 6 | Battle profile separate from field: front-lit sun, no sun shadow, no fog, dark background | One arena profile; fog + far layers in the world (P1) | Nothing to take. Our arena is the battle scene |
| 7 | Shadow tint via a lilac ambient colour (Godot has no shadow colour) | Gap item 17 = choose grade: warm/desaturated vs cool lifted shadows | Same as option 2 of item 17. The ambient colour route is a cheap way to sample it in phase 4 |
| 8 | AnimatedBillboard: a horizontal sprite sheet stepped with region_rect, each unit starts at a different frame so the idles don't breathe in step | Phase 2 items 9–10 (64×64 sprites, idle 6 frames) | **Idea for phase 2:** start each unit's idle at a different frame |
| 9 | Sprite3D setup: fixed-Y billboard, nearest filter, opaque-prepass alpha cut, origin at the feet | Same family in stage3d (art-look §2) | Nothing new |
| 10 | Dust motes GPUParticles | Pollen motes (R16b) | Already have it |
| 11 | project.godot: Forward+ on PC, gl_compatibility only for web (feature override); MSAA ×2 on PC, 0 on web | We target gl_compatibility everywhere (art-look) | Nothing new. A Forward+ PC build would be a rule change; out of scope |

## Ideas worth taking (all own code, each goes through its phase's skill)
- P2: start each unit's idle at a different frame (#8) · foot shadow card from our L2 code (#2).
- P3: near-camera framing props, retried after P1 (#5).
- P4: cloud shadows drifting in the ground shader (#3) · sample cool lifted shadows through the ambient colour for item 17 (#7).
- P7: one web/phone switch for particle and card counts (#1).

Security line: nothing downloaded into the repo. The clone stays in the scratchpad and is never committed or shipped.
