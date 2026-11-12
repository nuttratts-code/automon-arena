# Set 216 — UI sample from the ui-patterns library (ui-preview)

Owner order (12 Nov): "use everything learned to tune our screens, samples first, no real code". Picks: A1 run end + A2 battle + A4 prep · B2 new info/buttons allowed.
Library: claude/ui-patterns.md V1.6 (§1c §1d §2 §7 R1–R3, O1–O6).

## R1 — references · decisions
- **Run end:** layout = Underlords result (placement big, team shown, play again prominent) · feel = Octopath victory (big title top-left, bonus row, battlefield behind). Different: no placement number (single player), our cut-corner sheet, team stands in OUR 3D plaza instead of cards.
- **Battle:** layout = Octopath / FF Resonance edge HUD (O1: UI on the edges, the diorama in the middle) · feel = Underlords clarity (one bar tells who is winning). Different: auto-battle → no command buttons; two team HP bars instead of a turn line.
- **Prep:** DO 27 (compare at the moment of buying, TFT/Underlords tribe preview). Different: count drawn on the shop card next to the tribe shape, same yellow/white as the tribe row.
- Three non-default decisions: (1) the result is a stone sheet on the LEFT with the 3D plaza + final team on the right, never a dark full-screen overlay (R3) · (2) play-again plate sits where Fight sits (bottom-right, same plate, R2) · (3) battle speed = one cycling button, freeing the bottom bar (O5 already existed as 5 buttons).

## Agreed list (owner confirms per round)
1. (R1, pending) Run end: left sheet = title 30 px (green win / red loss) · one summary line · 3 number tiles (ชนะ · แพ้ · ชนะติดกัน, R1 "3 numbers max") · NEW "ตัวเด่นของ run" row (top-damage unit sprite + damage) · extra-mode warning one line · small buttons คัดลอกโค้ด + สถิติ·รีเพลย์ · player + rename link.
2. (R1, pending) Run end: 3D plaza stays on behind (app _sync_stage includes run_end), final team stands on the right half (board_targets gets a run-end rect; prep.render() before showing so the stage shows the final board).
3. (R1, pending) Run end: bottom-right = big plate "เล่นต่อ (แมตช์พิเศษ)" when offered, "เริ่ม run ใหม่" plain above it; when no extra mode "เริ่ม run ใหม่" becomes the big plate.
4. (R1, pending) Run end: stats · replays · history moved behind "สถิติ · รีเพลย์" (a sheet over the right half), content unchanged.
5. (R1, pending) Battle top: NEW two team HP bars (you left green, foe right red, total HP of each side, numbers above) meeting at a clock plate; foe name right; "ทีมคุณ" left; replay tag next to it.
6. (R1, pending) Battle bottom: 5 speed buttons → one button "เร็ว N×" that cycles 1→2→4→8→16.
7. (R1, pending) Prep shop card: NEW count next to each tribe shape = the tribe count if this unit goes on the board ("3/4"); yellow when it reaches a step; hidden when the same unit is already on the board.

Guesses: MVP = most damage (app.stats.dmg) · tribe preview counts the board only (team.gd count_tribes), not the bench · texts not yet in ui_th.json (ทำจริง).
Tells left (library §4): same cut corner everywhere (owner pick set 212) · cool palette (owner pick) · display font (open §6) · 3 identical number tiles (mild). design-critique skill not installed in this session — skipped.
Not shown: dark mode, 667 width.

Rebuild: copy godot → <scratch>/g, drop MCPRuntimeServer line, `--headless --import`, then `python r1-patch-runend.py <g>` (copies r1-run_end.gd.txt) → `python r1-patch-battle.py <g>` → `python r1-patch-prep.py <g>`.

## R2 — camera test (owner asked: prep camera lower so the background shows)
Conflict: art-style §8 angle A (owner 7 Nov: high look-down, horizon ~40 % from the top) · stage3d.gd PITCH 40 actually puts the horizon off screen (set 215 note). Test only, owner decides (rule-change).
- R2-cam22-*: PITCH 22 (const in stage3d.gd). Battle: standing stones + horizon show. Prep: almost no change (prep camera zooms into own half), back row hides behind the front row.
- R2-cam24-zoomout-prep-late: PITCH 24 + prep board rect shrunk (app.gd board_targets: grow_individual(-side-50, -70, -side-50, -4)) → plaza edge + stones show at the top, units ~20 % smaller.
Rebuild R2: after R1, `sed` PITCH in scripts/ui/stage3d.gd + the board_targets line above (test values, not patches).

## R3 — owner: "camera like Final Fantasy" (FF Resonance HD-2D: low, telephoto, scenery behind)
Conflict (told the owner): changes art-style §8 angle A (7 Nov, high look-down) → rule-change + art-style update at ทำจริง.
8. (R3, pending) stage3d.gd PITCH 40 → 20 · FOV 34 → 26 (longer lens = flatter, diorama feel) · prep board rect shrunk (app.gd board_targets grow_individual(-side-50, -70, -side-50, -4)) so the plaza edge + standing stones show above the team.
Seen: battle shows stones + horizon; prep shows stones at the top; units ~20 % smaller in prep; at 20° back-row units sit behind front-row HP bars (battle foe side) — needs a fix at ทำจริง (lift HP bars / stagger lanes). Beyond the stones the scene is dark (hills/arch not in the 215 export). Tilt-shift blur not tried (Compatibility renderer has no DOF; would need a screen shader).
Rebuild R3: after R1, sed PITCH 20.0 + FOV 26.0 in scripts/ui/stage3d.gd + the board_targets line.

## R4 — owner: "lower still"
9. (R4, pending) PITCH 20 → 12 (FOV 26, prep zoom-out kept). Stones + sky fill the top third in both screens. Cost: rune rings become thin ellipses, units overlap more (prep: back-row unit half hidden; battle foe side: 3 units in a pile, HP bars stacked) → at ทำจริง lanes need more depth spacing or HP bars lifted.
Rebuild R4: as R3 with PITCH 12.0.

## R5 — owner: "our units stand on top of each other — can we do it like this?" (owner screenshot of FF Resonance battle, 12 Nov, NOT stored in repo)
What the reference does: camera ~20–25° · each side a wide diagonal formation · every unit offset sideways AND in depth, so nobody stands straight behind anyone.
10. (R5, pending) PITCH 12 → 22 (FOV 26, prep zoom-out kept) · LANE_Z ±1.4 → ±2.3 (lanes further apart in depth) · far lane (lane 0) shifted 1.0 away from the midline (stagger) → stage3d.gd slot_pos: x = sign × (COL_X[row] + (1.0 if lane == 0 else 0.0)). Display only; rows/lanes in the game rules unchanged.
Seen: no unit hides another in prep or battle; HP bars no longer stack; stones + horizon show at the top. Prep units smaller than today.
Rebuild R5: as R3 + PITCH 22.0, LANE_Z [-2.3, 2.3], the slot_pos line above.

## R6 — owner: "ด้านบนเค้าเหลือเยอะจัง" (read as: the FF shot leaves a lot of scenery on top → push our board down)
11. (R6, pending — reading unconfirmed) board fitted into the lower part: app.gd board_targets prep top cut = 38 % of the field (side cut back to -side), battle top cut = 32 %. Scenery fills the top ~40 %; units smaller again (prep ~25 % smaller than today).
Rebuild R6: as R5 + those two grow_individual lines.

## R7 — owner: "shop on top, faint background" (A3 + see-through; conflict told: set 212 shop at the bottom, thumbs reach, set 212 near-solid panels)
12. (R7, pending) Dock + odds row + reroll moved under the top bar (tscn parent Top; dock x shifted +40 to clear the tribe chips, reroll 74 wide at the right) · message line under the odds (y 164) · prep board rect = y 168 → bottom (app.gd board_targets) · shop cards bg alpha 0.55 (slot_cell.gd shop branch; set 212 GLASS 0.94 stays for the rest).
Seen: board + units much bigger (the empty bottom tray is gone) · the shop covers the top band, so the far scenery is mostly hidden; through the cards you see the plaza floor · back-row heads touch the odds row · Fight stays bottom-right, bench left.
Rebuild R7: after R5 (or R6), `python r7-patch-shoptop.py <g>`.
