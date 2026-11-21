# Set 268 — set 216 screen samples (R1–R8) on the v47 arena (ui-preview, SAMPLE — NO MERGE)

Owner picks (21 Nov): A1 continue the set 216 screens · B1 on the new v47 arena (scratch g), not the old repo arena · C1 set 267 hub lock left alone.
Agreed list = set 216 items 1–13 (`claude/ui-sample-216:claude/preview-set216/notes.md`), all still pending owner OK. Camera items 8–11 (R3–R6 PITCH/FOV/LANE seds) are NOT applied: the v47 GameCam (art-look, set 239) replaces them. Board rect lines from R7/R8 are applied but the v47 harness sets its own camera (prep = D1 hybrid zoom, HYBZ 0.5).

## R1 — the same screens moved onto v47
- Battle: two HP bars + clock top, one speed button + stop / skip bottom (216 R1).
- Prep: shop row on top + odds + reroll top-right, status row + HUD icons bottom, bench left, Fight bottom-right (216 R7+R8), D1 prep zoom behind.
- Run end: left sheet (title, 3 tiles, top-damage unit, extra-mode line, buttons), เล่นต่อ plate bottom-right, details sheet on the right half (216 R1).
- Run end camera = the battle view as baked (no run-end framing yet; the final team is the stand-ins).
Seen: phone width (1688x780 = 2.16:1) shows WHITE strips at the top-left/right corners behind the HP bars and the run-end sheet — the v47 picture card is made for 1.81:1 (1920x1061). PC shots fill fine. → art-look item, not screen UI.
Tells (library §4): see-through sheets over the 3D scene (run end: units ghost behind the text) · text on busy ground without an outline (battle ticker beside the speed button, prep "รอบ 1 · ชนะ 0/10", odds "100%") · 3 identical number tiles (owner list item 1, kept) · same cut corner everywhere (owner pick set 212). Below 3 non-owner tells → shown as is. critique: self-check only (design-critique skill not run, token saving) · tells 2.

## R2 — owner (21 Nov, two reference pictures of another game's HUD, NOT stored): "menus in these colours + a cooldown gauge on top like this"
Conflict told + owner picks: D1 dark slate see-through panels replace the set 212 near-solid light panels (sample now, rule-change at ทำจริง) · A1 every screen · B1 one timeline, act point at the LEFT end, both sides on it (foe = red frame) · C2 team HP bars removed (HP = the bars over each unit).
14. (R2, pending) Palette: UI tokens → slate (panel #25334a, card #2c3c55, line #c3d1df thin light edge, ink #f2f5f8, accent #3f78a6, hp #4ccaa6) via data/tone.json "light" (dark mode also changes the 3D, so the light set is replaced) · panels GLASS 0.94 → 0.80.
15. (R2, pending) Battle top: cooldown timeline (s268_timeline.gd) = line + diamond ticks, big open diamond = act point at the left, each living unit a diamond portrait (head crop of its sprite) sliding left as its cooldown runs, the next to act drawn bigger · clock plate stays at the right · team names gone (the ticker line at the bottom still says the foe).
16. (R2) Text straight on the scene (battle ticker, prep round line) = white + dark outline.
Guesses: the sample timeline uses MADE-UP cooldowns (2–8 s) for the 12 stand-ins (S268REAL=1 = real data path: last "set" event + "stat" cd; stun/freeze approximate) · portraits = auto head crop of the stand-in sprites (real icons = hub set 267 work).
Tells: see-through dark panels (owner pick R2 — kept) · 3 identical tiles (owner list item 1) · cut corners (owner set 212). critique: self-check · tells 0 new.

## R3 — owner: "use the hub creatures, not stand-ins"
17. (R3) Units = the six -1 creatures' ★ form-3 stills from the hub (set 266 files f3<ID>.png + s266f3_meta.json in g/tests/s225; shoot env S259RIGHT/S259IDS/S259FOE/S259META as in s266_f3_live.sh) · timeline portrait = head square at the top-right of the sprite (files face right), mirrored so every portrait faces the act point (left) · nearest-pixel filter.
Still made-up cooldowns on the timeline (stand-in battle data).

## R4 — owner: "button colours are not like the reference at all — as close as possible, shape too"
18. (R4, pending) Measured from the owner's reference picture: corners 2 px (near square, was cut 7) · ONE 1-px edge #8ea3b1 · body #2c4a5e at 85 % (GLASS 0.85) · no plate ledge (TH.ledge off, Fight plate = same frame, blue #2f6f99) · white text with a thin dark outline on every Label/Button · unit HP bars = black track, 1-px light frame, teal-green #3bc88d with a bright top line.
Left as is (owner picks, ask): shop cards still 0.55 see-through (R7) · heart/gold chips keep their own colours. Not done: the reference's slightly lighter header band (StyleBoxFlat has no gradient).

## R5 — owner: "buttons more see-through"
19. (R5, pending) Button bodies 60 % (theme BTN_A, prep glass_btn too), Fight plate 75 % so the main action still leads · panels/cards stay 0.85 · shop cards 0.55 (R7).

## R6 — owner: "use the frames I cut (hub icons) on the top"
20. (R6, pending) Timeline portraits = the owner's own hub icons (form 3, newest icon_f3 round per creature in art/hub/files/<ID>/, set 267 crop: diamond with parts poking out), drawn as is (not mirrored) at 1.25× the frame diamond over a dark fill, own = white frame, foe = red frame. Fallback = the R3 auto head crop.
Files used (21 Nov): HL-1 eb638b69 · WN-1 1fa45ec2 · PL-1 2d6b6fd2 · SF-1 38368c0a · WY-1 b98e3b7a · PT-1 a3c705cc.

## R7 (set 268 round 7 — files r7-icon.gd.txt + r7b-patch-battleicons.py; not the set 216 r7-patch-shoptop) — owner picture: "remove every bottom button of the battle screen, use symbols like this, bottom-right"
Conflict told: skip-to-result + auto-skip are existing features (web v132) → owner A2 B2 removed both · C2 ticker line removed. Rule-change at ทำจริง (features go away).
21. (R7, pending) Battle bottom = only two bare symbols bottom-right, no box: pause = two grey bars with a dark edge (▶ while paused) · fast-forward = two red triangles, tap cycles 1→2→4→8→16, the speed shows beside it above 1× · drawn in code (s268_icon.gd), no outside asset.

## Round 8 (file s268r8-patch-tiles.py) — owner picture: three see-through teal tiles with a word on top + a white icon → "change the buttons to this"
Owner picks: A1 two tiles only (pause + fast-forward; the picture's middle "autoplay" has no job in an auto-battler) · no words on the tiles.
22. (round 8, pending) Pause / fast-forward = see-through teal tiles (#1d6079 at 62 %, 74 % pressed), corners 8 (rounder than the R4 2-px panels — only these two), no edge, 58×54 · white icons (#e8f6fa) with a soft drop below · speed number beside ▶▶ above 1× (kept from R7).

## Round 9 (files s268r9-*) — owner: "the buttons look pasted on, not part of the game — how do others do it?"
Why (told the owner): colour taken from another game's sky scene (ours = warm meadow) · smooth vector icons beside pixel sprites (library DO 16/18 one hand) · no light (DO 11) · tile shape/colour unlike every other panel. Ideas: A1 pixel icons in the sprites' hand on our slate button (Octopath / Into the Breach) · A2 carved runestone tablets (DO 11 material) · A3 bare pixel glyphs on the scene (Triangle Strategy, DO 30). Owner: A1.
23. (round 9, pending) Pause / ▶ / ▶▶ = 13×13 pixel icons drawn on a pixel grid: 1-px dark outline #0e1620 (same as the sprites' outline), fill #d6e2e9, lit top/left edge #ffffff, shaded bottom/right #93a6b3 (sun top-left) · on the standard slate button (2-px corners, 1-px edge, BTN_A 60 %) · replaces the round 8 teal tiles.
Not yet: the icon pixel is ~1.5 UI units, not locked to the sprite pixel (k 3) — lock it at ทำจริง.

## Round 10 (s268r10-patch-nobg.py) — owner: "try the icons alone, no background"
24. (round 10, pending) Pause / ▶▶ = the round 9 pixel icons only, no button box (invisible touch area 58×54 kept).

## Round 11 (s268r11-patch-tonedown.py) — owner: "tone the buttons down, they stand out too much"
25. (round 11, AGREED 21 Nov — owner "พอดีแล้ว"; agrees 21 R7 symbols bottom-right + 23 pixel icons + 24 no box too) Pixel icons grey-blue: fill #9fadb6, lit #bcc8cf, shade #75848f, outline #16202a at 85 %, whole icon 80 % opaque.

Rebuild: `cp -r automon-scratch/g g268` (v47 scratch, keeps .godot = no re-import) · delete the `MCPRuntimeServer=` line · patches in this order with `python <patch> g268`: r1-patch-runend → r1-patch-battle → r1-patch-prep → r7-patch-shoptop → r8-patch-hudbottom → r0-patch-harness-ui → r0-patch-harness-runend → r2-patch-slate-timeline (needs r2-timeline.gd.txt beside it) → r4-patch-refshape → r5-patch-btnglass → r6-patch-icons (reads art/hub/files from the repo folder) → r7b-patch-battleicons (needs r7-icon.gd.txt) → s268r8-patch-tiles → s268r9-patch-pixicons → s268r10-patch-nobg → s268r11-patch-tonedown · shots: `sh shoot.sh` (phone 1688x780 → out/s268r11) and `sh shoot_pc.sh` (1920x1061 → out/s268r11pc). The shoot scripts expect `$SP/g268`; stills used: 1_battle, 8_prepH_hybrid, 9_runend, 9b_runend_details.
Security: scratch copy only, no outside assets, nothing shipped.
