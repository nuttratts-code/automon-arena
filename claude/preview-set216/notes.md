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
