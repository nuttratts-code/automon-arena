# Godot UI to-do (set 203 · loop: claude/workflow/setup.md §6)
The user plays in the Godot editor and sends screenshots + numbered notes, one screen at a time (B1). **Set 205 user pick:** open notes are fixed together with the 3D scene work (plan-godot-migration step 8), not in separate 2D sets. Claude logs each note here under its screen, asks design options before changing a design, fixes one screen per set, and ticks `[x]` with the set number when merged. Web game v132 stays frozen (set 189 C1).

## Name screen
## Rune offer
## Prep / shop
- [x] (set 206, user B2 · A2 B1 C1) **3D arena:** godot/scripts/ui/stage3d.gd = placeholder floor (code only) + key light + Camera3D angle A (pitch 40°) + Sprite3D units; prep/battle cells sit on projected slots (no box; states light the tile rim); fight/next = camera dolly. Board names dropped (name on the tap card); rarity = ring on the tile.
- [x] (set 204, user E1 · done set 205: godot/scripts/ui/arena.gd) **One shared arena for prep + battle:** battle = wide camera showing both halves (player left, enemy right, art-style §8) · prep = camera zooms into the player's half and the shop/bench panel appears, layout like now · press fight = panel leaves, camera zooms out to reveal the enemy. 2D now (Camera2D, ~0.6 s tween, placeholder background); the step-8 3D diorama later keeps the same camera idea. Rules unchanged (display only). Check 740×330 text size when the panel sits over the zoomed arena.
- **Owner notes after set 206 close-out (11 Nov, prep screen on the 3D arena) — build in set 207; mockup shown in chat (prep_screen_3d_mockup_v1). Open questions marked Q:**
  - [x] (set 207) P1 Zoomed-in prep camera shows ONLY your half (no enemy tiles in view).
  - [x] (set 207) P2 Panel backgrounds (HUD chips, bench, shop cards, buttons) semi-transparent over the arena.
  - [x] (set 207, B1 "ฟรี n") P3 Reroll button = icon + price only (drop the word "สุ่มใหม่"). Q: how to show free rerolls (rune) — icon + "ฟรี n"?
  - [x] (set 207, C1 tap odds = shop popup) P4 Remove the shop-level button; show the shop odds (chance per rarity at the current shop level) outside, always visible. Q: the button also showed next-round income (+25) and opened the shop popup — keep those somewhere (e.g. tap the odds line) or drop?
  - [x] (set 207, D2 cue dropped) P5 Fight button smaller; remove "ลงสนาม x/6 ตัว". Q: the same line carried the new-player cue ("ซื้อตัว" / "ลากตัวขึ้นบอร์ด") — drop too, or show it only when the board is empty?
  - [x] (set 207) P6 Column labels หลัง/กลาง/หน้า sit ON the floor tiles (frees the top), hidden except while dragging a unit.
  - [x] (set 207, E1 count dropped) P7 Remove the "ม้านั่ง" label. Q: the bench count (5/5) goes with it?
  - [x] (set 207, F1 top button removed) P8 Left side: tribe icons + how many units of each you have now. Q: the top "เผ่า 2/6" button stays (it opens the tribe popup) or this column replaces it (tap = popup)?
  - [x] (set 207, G2 yellowish = any owned, ribbon = star-up) P9 Shop card fixed layout: picture top · all tribes (main + extra) below · name bottom-left · price bottom-right; nothing moves. Remove "มีแล้ว". A copy you already own → yellowish background + "อัปดาว" ribbon top-right. Q: ribbon on any owned copy, or only when buying it completes a star-up (merge)? It replaces the gold merge frame (set 202 7f2)?
  - [x] (set 207) P0 (bug) drag leaves green frames on every passed cell — see handoff Relay set 206 (fix first).
  - [x] (set 207, user B2) **Editable layout:** godot/scenes/prep_layout.tscn — the owner moves / resizes / deletes the prep parts (Top · Field · Tray · TribeCol …) in the Godot editor; code binds them by name (a deleted part just disappears). Reset to default = `tools/make_prep_layout.gd` (overwrites edits). Bench + shop stay on two rows (user withdrew the one-row A1). Units in the shop smaller than in battle (finding ①) → owner tunes via the scene.
## Battle
## Result card · match details
## Run end
## Menu · Log · credits · resume
## Known before set 203
- [x] (set 206, user D1) 740×330: text drew at 8.9 px → windows under 360 px high get a 400-high base (app.gd `_on_resize`), text ~10.7 px; the 3D board shrinks to fit (small at that size — owner to judge).
