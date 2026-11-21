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

## Round 12 (s268r12-patch-states.py) — owner: "what do pause / fast-forward look like after a tap?"
Owner picks: A — 16x stays for TESTING ONLY, removed on release day (owner: "จดไว้อย่าลืม" → also in skill godot-release) · B1 pause icon stays || when paused (round 7's ▶-while-paused dropped) · C1 the word FAST without a number (round 7 speed number dropped).
26. (round 12, pending) Rest = faint (icon 55 %) · on = more solid (95 %) + a small word under the button: STOP while paused, FAST above 1x · fast-forward triangles: 1x one faint · 2x one solid · 4x two · 8x three · 16x four (test builds only) · tap cycles back to 1x · ff touch area 70x54 (room for four).
Round 12b (owner: "move the word up, it is about to fall off the bottom"): word baseline size.y + 8 → + 1 (right under the icon). Shots R12b-states.png · R12b-pc-1_battle_stop.png.
Round 12c (owner: "word colour to match the buttons, it stands out too much"): word = the icon grey-blue #9fadb6 + the icon outline, same alpha as the icon. Shots R12c-states.png · R12c-pc-1_battle_x4.png.
Shots: R12-states.png (bottom-right crop, every state, 2x nearest) · R12-pc-1_battle_x4.png (full screen at 4x). Harness S268STATES=1 shoots 1_battle_<state> stills in the same run.

## Round 13 (s268r13-patch-tl-sides.py) — owner: "split the gauge by side: ours above, foes below, running on the same line"
Round 12c (STOP/FAST word in the icon grey-blue) not yet OK'd — the owner moved on to the timeline.
27. (round 13, pending) Timeline: own portraits ride ABOVE the line, foes BELOW, same line / act point / scale · timeline height 60 → 112.
Round 13b — owner picture (another game's timeline, NOT stored): each diamond's tip touches the line (no stem, no dot). Shots R13-pc/phone-1_battle.png (with stems) · R13b-pc-1_battle.png (tips on the line).

## Round 14 (s268r14-patch-clock.py) — owner: "the clock like the STOP word below"
28. (round 14, pending) Clock top-right = no plate, icon grey-blue #9fadb6 text with the icon's dark outline (#16202a 80 %, 4 px). Shot R14-pc-1_battle_stop.png.
Seen (all rounds, not new): the clock's "mono" font has no Thai, so "วิ" draws as a wrong glyph → at ทำจริง use a font with Thai or write "s".

## Round 15 (s268r15-patch-tl-small.py) — owner: "make the gauge bar smaller"
29. (round 15, pending) Whole timeline ~0.72x: portraits r 19 → 14 (next to act 27 → 20), act point 24 → 17, ticks 4 → 3, line 1.5 px, trail band 7 px, height 112 → 82. Shot R15-pc-1_battle.png.

## Round 16 (s268r16-patch-tl-bands.py) — owner picture (another game's timeline end, NOT stored): "make the end like this, gradient darker toward the edge, both sides, the foe's red"
30. (round 16, pending) Teal trail → two bands on the line, 13 px: own ABOVE (blue #1f4f86), foe BELOW (red #8c1e2c); darkest (35 % darker, 95 %) at the act point, half (50 %) by 30 % of the line, clear at the right end · act point = bigger diamond (r 22) with a double white frame holding the icon of the unit about to act · height 82 → 86.
Guess: "the end" read as the act point (left end) + the band ends there. Shots R16-pc-1_battle.png · R16-zoom.png (left half, 2x).

## Round 17 (s268r17-patch-tl-gap-fade.py) — owner, two crops of round 16: "where red and blue join, don't run into the white frame — leave a small gap; fade the whole bar with the colour"
31. (round 17, pending) Bands start 7 px clear of the act diamond's outer frame, left end slanted parallel to the frame · white line + tick diamonds fade with the bands (0.85 at the act point → 0.5 at 30 % → 0.12 at the right end).
Guess: "the white line" read as the act diamond's white frame (the owner's crop shows that spot), not the centre line between the bands. Shots R17-pc-1_battle.png · R17-strip.png · R17-zoom-end.png (4x).

## Round 18 (s268r18-patch-tl-gap4-framefade.py) — owner: "band gap = the gap between the inner diamond frames; the running units' frames fade too"
32. (round 18, pending) Band gap from the act frame 7 → 4 px (= gap between the act diamond's two white frames, r 28 / r 24) · running portraits' frames (white own / red foe) fade with the bar (same curve as the line, floor 0.2). Shots R18-pc-1_battle.png · R18-strip.png · R18-zoom-end.png (4x).

## Round 19 (s268r19-patch-livebattle.py + live_r19.sh) — owner: "open the battle screen for me to see"
Live window (1600x884): `sh live_r19.sh` from automon-scratch → stays on the battle screen after the 1_battle still; timeline runs on the sample cooldowns, clock counts, pause / fast-forward work by mouse. Real fight frozen (BHOLD) so no result sheet; stand-ins don't attack. Close the window to stop.

## Round 20 (s268r20-patch-tl-smooth.py) — owner, after the live window: "unit frames don't fade; smoother arrival at the left"
33. (round 20, pending) Frame + the dark tile behind each running icon fade with the bar (frame = bar curve, floor 0.12; tile 35 % → 100 %) · arrival: portrait grows smoothly r 14 → 20 over the last 15 % (no pop at 97 %), fades out over the last 4 % while the act diamond fades its icon in; the icon of the unit that just acted fades out of the act diamond over the first 15 % of its next cooldown; restarting units fade in over the first 6 %. Shot R20-strip.png; motion = live window (live_r19.sh).

## Round 21 (folded into s268r20-patch-tl-smooth.py) — owner: "the unit that reaches the left slot stays until another one replaces it"
34. (round 21, pending) Act diamond always shows the last unit that arrived (full); the next arrival crossfades in over its last 7 % and the old one fades out at the same time — the slot is never empty.

Rebuild: `cp -r automon-scratch/g g268` (v47 scratch, keeps .godot = no re-import) · delete the `MCPRuntimeServer=` line · patches in this order with `python <patch> g268`: r1-patch-runend → r1-patch-battle → r1-patch-prep → r7-patch-shoptop → r8-patch-hudbottom → r0-patch-harness-ui → r0-patch-harness-runend → r2-patch-slate-timeline (needs r2-timeline.gd.txt beside it) → r4-patch-refshape → r5-patch-btnglass → r6-patch-icons (reads art/hub/files from the repo folder) → r7b-patch-battleicons (needs r7-icon.gd.txt) → s268r8-patch-tiles → s268r9-patch-pixicons → s268r10-patch-nobg → s268r11-patch-tonedown → s268r12-patch-states → s268r13-patch-tl-sides → s268r14-patch-clock → s268r15-patch-tl-small → s268r16-patch-tl-bands → s268r17-patch-tl-gap-fade → s268r18-patch-tl-gap4-framefade → s268r19-patch-livebattle → s268r20-patch-tl-smooth → s268r22-patch-idle → s268r22c-patch-hubfeet → s268r23-patch-unify → s268r24-patch-popups (shots: shoot_pc_r24.sh = POPS=1) · shots: `sh shoot.sh` (phone 1688x780 → out/s268r11) and `sh shoot_pc.sh` (1920x1061 → out/s268r11pc). The shoot scripts expect `$SP/g268`; stills used: 1_battle, 8_prepH_hybrid, 9_runend, 9b_runend_details.
Security: scratch copy only, no outside assets, nothing shipped.

## Round 22 (s268r22-patch-idle.py + shoot_pc_r22.sh / live_r22.sh) — owner: "swap the battle units for the creatures that already have frames"
35. (round 22, pending) Units = the owner's ★ form-1 PixelLab idle sheets from the hub (8 frames × 72x62, 150 ms, hub size k 4, feet = lowest opaque row): own = hub team SF-2 / HL-1 / PL-2 / PT-2 / HL-2 / WY-2 · foe = PL-1 / SF-1 / WY-1 / PT-1 / WN-1 / WN-2 · timeline icons = their ★ form-1 icons (the form-3 icons kept in tests/s268icons_f3). Files: tests/s225/i1<ID>.png + s268i1_meta.json; timeline also strips the "i1" prefix. Run after s268r20 in the Rebuild list. Shot R22-pc-1_battle.png; motion = `sh live_r22.sh`.
Seen: form-1 units at k 4 are smaller on screen than the round 3 form-3 stills at k 3.
Round 22b (owner: "why do some face the wrong way?"): cause = SF-1 and WN-2 have the hub ⇋ กลับข้าง switch on (their ★ form-1 still has flip = true; the PixelLab files face LEFT), the round 22 patch ignored it. Fix: meta "mirror" from the ★ still's flip → harness flips those sprites (+ shadow follows flip_h) and the timeline icon is mirrored too. Shot R22b-pc-1_battle.png.
Round 22c (owner rule set 268, now in CLAUDE.md Decisions: every character use applies EVERY hub setting) — s268r22c-patch-hubfeet.py (run after s268r22-patch-idle.py):
- Feet = the hub shadow-tab feet point (file fractions, mirrored with the flip) on the slot, not the lowest opaque row.
- Sun-cast shadow = hub cast math: silhouette = rows above the feet, anchored at the feet x, strength × str/0.5, length × len (WN-1 0.923 / 0.69 is the only non-default), soft edge = blur × 0.12 × frame height (3×3 taps). Arena sun direction stays the scene's (hub sunAngle = hub preview only).
- Frame order: none of the 12 ★ sheets has pingpong → forward loop 1→8 is what the hub plays (round 22 was already right).
- Patch prints WARN if a creature has per-frame feet, corner k, oval on, ox/oy or pingpong (none today).
Seen: WN-2 and PT-1 float a little — their hub feet point sits 4.5 / 3.6 px below the body (WN-2's shadow was saved on an older frames round rcb47a9e0, ★ is b14ae2ba) → owner fixes it in the hub shadow tab if not meant. Shot R22c-pc-1_battle.png.

## Round 23 (s268r23-patch-unify.py + shoot_pc_r23.sh) — owner 21 Nov: "battle screen OK — lock this concept; make the other screens follow"
Battle items 26–35 = **OK (owner, chat 3)** = the locked concept: no plates · icon/word alone with the clock's dark outline (#16202a 80 %, 4 px) · fading bands (darkest at the edge they hang from, clear toward the scene) · own blue #1f4f86 / foe red · thin white lines.
36. (round 23, pending) Prep + run end follow it: theme buttons = word alone + thin white underline (45 %) · prep HUD buttons (book / skull / edit / …) + reroll + heart / gold chips = no plate · shop cards = dark band hanging from the card bottom (85 % → clear at the top) · bench rows = band from the left edge (filled 80 %, empty 30 %) · lock / merge / pick / drop states keep their coloured frame on a clear box · main action (เริ่มสู้ / เล่นต่อ) = own-blue glow from the bottom-right corner (radial, clear by the top-left) · run end sheets = full-height dark band from the screen edge (left sheet to 56 % width, details from the right), stat tiles without boxes. Global theme outline colour = #16202a 80 % (battle labels too). Shots R23-pc-8_prepH_hybrid · R23-pc-9_runend · R23-pc-9b_runend_details · R23-zoom-buttons. Not covered yet: popups (unit card, rune offer, match pop), name / title screens, phone size.
ui-patterns: references = battle screen (this set, owner-locked) for feel · Octopath/FF Resonance §1d (text on dark gradient over the scene, no boxes) for layout · decisions: bands not plates · main action = corner light, not a button object · words as buttons with a line. Tells left 2: shop cards are still an identical card row (genre convention) · band boxes keep straight side edges.

## Round 24 (s268r24-patch-popups.py + shoot_pc_r24.sh) — owner: "go on — popups + name screen; no phone size yet"
37. (round 24, pending) Popups follow the locked look: dialog = dark sheet #16202a 90 %, thin white line top + bottom only (rune offer = gold line), no side frame, no drop shadow · dim = ink blue 50 % (was brown) · inner cards (rune cards, offer cards) = the shop-card bottom band (reads as no box on the dark sheet) · unit card = same sheet · text input = clear with a white underline (focus frame kept) · credits sheet = same. Shots R24-pc-p1_tribes · p2_legend · p3_card · p4_offer · p5_name. Harness: POPS=1 in s239_prep.gd opens them on the prep screen.
Open for the owner: the name screen still sits on the plain navy app background (no arena behind) — the one screen that does not show the scene. Tells: navy gradient background + centred title (name screen only). Not done: phone size (owner: later), match details popup (mx), run log popup.

## Round 23 (s268r23-patch-actring.py, after s268r22c) — owner crop of the act diamond: "inner ring = colour of the unit that arrived; when a new one comes it moves to the outer ring; our side blue"
36. (round 23, pending) Act diamond rings carry side colours: inner (solid, r 24) = side of the unit now in the slot, outer (thin, r 28) = side of the one before it; on each arrival both shift outward with the round 21 crossfade (last 7 %) · own side colour white → blue #4d8ff2 (Color 0.30, 0.56, 0.95) for the act rings AND the running own portrait frames · foe stays red. Shots R23-pc-1_battle.png · R23-zoom.png; motion = `sh live_r23.sh`.
Guess: "สีฝั่งเรา" read as every own-side frame on the timeline (running portraits too), not only the act rings.

## Round 24 (s268r24-patch-realfight.py, after s268r23) — owner: "is it the real cooldown? try it"
37. (round 24, sample) Real fight: env S268FIGHT="<own 6>+<foe 6>" (game ids, slot i = row i/2, lane i%2, level 1, no runes) → app.player_side / foe_units / _sim(detail, live) → _show_battle; no BHOLD freeze. Real units keep their uids; the harness swaps each picture for its hub idle sheet by character id (stage3d stores "cid"), same hub rules as 22c, and moves the lunge "home". S268REAL=1 → timeline = real cooldowns ("stat" cd + "set" lastAct), icons by character id. Live window (`sh live_r24.sh`): the screen's own pause / fast-forward drive the fight, idle frames animate (the round 19/22 live window did NOT animate idle frames — that loop ran before the frame animator).
Seen: own SF-2/HL-1/PL-2/PT-2/HL-2/WY-2 vs PL-1/SF-1/WY-1/PT-1/WN-1/WN-2 at level 1 runs to the 150 s time limit (winner 1) · real cooldowns are 5–7 s and 8 of 12 share 6000 ms, so their portraits sit exactly on top of each other on the timeline (design question for the owner) · the old game's blue cell boxes (skill/target highlight) still show over the 3D units. Shots R24-pc-1_battle_3s.png · R24-pc-1_battle_9s.png.

## Round 25 (s268r25-patch-ties.py, after s268r24) — owner: "some bars stack on each other — how do others do it? make samples to compare"
Research (one pass, thin web results; game examples from memory): positional timelines (Grandia, Child of Light) let portraits overlap or nudge them; list timelines (FFX CTB, Star Rail) use fixed order slots; players ask for spacing that still shows the time gap.
38. (round 25, pending owner pick) Env S268TIE: a1 = nudge apart along the line (min gap 26 px, first to act on the left, ties by uid) · a2 = true spot, front portrait only + "xN" count badge · a3 = fixed order slots 52 px apart (loses "how long"; changes round 2 B1). Compare picture R25-compare.png (real fight at 3.8 s: NOW / A1 / A2 / A3). Live per mode: `sh live_r25.sh a1` (a2 / a3; empty = stacked).
Seen in A1: the purple ram + chameleon still touch (icons poke out of the frame wider than the 26 px gap).

## Round 26 (s268r26-patch-snap.py, after s268r25) — owner pick after R25: none of A1–A3; own design instead
"move by the white dots in steps, not a long slide; same-time units stack as overlapping diamonds in the gap after the dot; our colour always on top; tap a stack = it opens so every frame shows side by side"
39. (round 26, pending) Env S268SNAP=1: a portrait sits on the white dot at or right of its true spot (14 gaps; jumps one dot at a time, reaches the act point when it acts) · units on the same dot stack to the right inside the gap, 12 px apart, the one acting first at the dot and on top · every foe drawn first, own last (own on top) · tap / click a stack = open (34 px apart = whole frames), tap it again or elsewhere = close (mouse_filter STOP on the timeline). S268EXP=1 opens the biggest stack (stills). Picture R26-snap-and-open.png (top = stacked, bottom = foe stack opened). Live: `sh live_r26.sh` (click a stack).
Guesses: "same time" = landing on the same dot (cooldowns 6.0 s and 6.5 s can share a dot) · own and foe never share a stack (own above the line, foe below), so "own on top" = draw order where they touch.

## Round 27 (s268r27-patch-widen.py, after s268r26) — owner crop of the opened foe stack: "when opened, widen the bar too — isn't one dot gap one action?"
40. (round 27, pending) Opening a stack widens the gap after its dot to fit it (34 px per extra portrait + 40); dots and portraits to the right squeeze into the rest of the line, left part unchanged (one-frame lag from the previous draw). Picture R27-open-widen.png. Live: `sh live_r27.sh` (click a stack).
Answer to the owner: no — the line is each unit's OWN cooldown progress (0 → 100 %), 14 equal gaps = 1/14 of that unit's cooldown, so one gap is ~0.4 s for a 6 s unit and ~0.36 s for a 5 s unit; it is not one action and not the same seconds for everyone.

## Round 28 (s268r28-patch-openall.py, after s268r27) — owner answers: B2 40 px · "keep the look; one tap opens every stack at once; design for all 6 having the same cooldown" · A = asked back (below)
41. (round 28, pending) Tap any stack = EVERY stack opens (portraits 40 px apart); tap again anywhere on the bar = all close. Each dot with an open stack widens the gap after it to the widest side there (own above / foe below share the gap); the other gaps share the rest (min 8 px each); if that still does not fit, the opened gaps shrink together. Env S268ALL=1 = start opened (stills). Picture R28-openall-compare.png: top = closed · middle = all open · bottom = worst case own 6× SF-1 (same 6 s cooldown) all open. Live: `sh live_r28.sh` (click a stack). Shots: shoot_pc_r28_closed / _all / _tie6.sh.
Owner question "do both sides hit at the same time?": yes — combat-rules C-3: the fight runs in 0.1 s ticks; every unit whose cooldown ends in the same tick acts in full, both sides, targets picked at the start of the tick, downs decided at the end (two units can down each other). Question A (what one gap means: own % / real seconds 0.5 s / queue order) asked again with this answer.
Round 28b (s268r28b-patch-sec.py, after s268r28) — owner: "40 too wide, use 10; try one gap = 0.1 s".
42. (round 28b, pending) Env S268OGAP = opened spacing (default now 10) · env S268SEC=0.1: a portrait sits on the dot of its REAL time left (ceil), 1 gap = 0.1 s = one fight tick, so units on one dot act in the same tick (combat-rules C-3); the line = 1.4 s ahead, units with more time left are hidden and fade in at the right end. Picture R28b-sec-compare.png (clock 5.6 s): closed · open 10 · open 36 (frames just apart, for comparison) · 6× SF-1 open 10. Live: `sh live_r28b.sh`.
Seen: 10 is tighter than the closed stack (12), so "open" at 10 looks almost the same as closed · at 0.1 s per gap most units (cd 5–7 s) are hidden most of the time and cross the whole line in 1.4 s.
Round 28c (s268r28c-patch-zoom.py, after s268r28b) — owner: "dot spacing = whatever fits 6 same-cooldown units; opened frames just a small gap apart; opening widens every gap, empty ones too".
Env S268STP = closed dot spacing (100 = a closed 6-stack 5×12 + 32 fits) → ~7 gaps on the PC line; opened spacing default 36 (frame 32 + 4). Open-all = the whole line zooms evenly by what the biggest stack needs. Picture R28c-zoom-compare.png: the zoom pushed the stacks off the right end → owner asked D/E/F.
Owner picks: D1 ("จาง" = กาง: empty gaps widen too) · E3 (whole line zooms + drag to scroll) · F1 (one gap = 0.1 s → ~0.7 s ahead).
43. (round 28d, pending) s268r28d-patch-drag.py (after r28c): tap a stack = open all, the zoom is anchored so the tapped spot stays under the finger; drag left/right while open = scroll (clamped to the zoomed line); a press moving < 6 px = tap (tap again = close); while scrolled, things left of the act point hide. Stills: S268ALL=1 anchors on the biggest stack, S268SCROLL adds px. Picture R28d-drag-compare.png: closed · open (anchored) · scrolled back to the start · own 6× SF-1 open at 5.9 s. Live: `sh live_r28d.sh` (click a stack, then drag).
Seen: at 0.1 s per gap and ~7 gaps only units ≤ 0.7 s from acting show (cd 5–7 s units are hidden most of the time).
Round 28e — owner after the r28d live window: "0.7 s ahead is too fast to follow, other ways? research". One research pass (TV Tropes visual initiative queue, SWGOH forum: many-ready-at-once is hard to read, Octopath/Trails show more turns ahead, WoW cooldown-timeline addons). Options G1 uneven gaps / G2 0.5 s + same-tick glow / G3 slow the fight while open → owner picked G1 only.
44. (round 28e, pending) s268r28e-patch-uneven.py + s268r28e2-patch-fit.py (after r28d; r28d patch also widened the scroll clamp by 6 opened frames): env S268SECS=0.1,0.1,0.2,0.4,0.8,1.6,3.2 = seconds per gap from the act point outward (6.4 s total; more = parked faded at the right end); gaps stay equal on screen, a shared dot near the act point is still one 0.1 s tick. Opening scrolls just enough that the tapped stack (stills: the biggest) fits before the line end. Picture R28e-uneven-compare.png: closed · open · own 6× SF-1 open. Live: `sh live_r28e.sh`.
