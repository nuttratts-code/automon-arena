# Review — Godot prep/battle screen spacing after set 212 (12 Nov 2026, set 213)

Owner asked: "many parts don't fit — some too close to the edge, some too far apart; anything to add?"
Shots: main ca0eabc, `tests/shots.gd --light` at 1366x768 · 844x390 · 667x375. AUDIT clean at all sizes (no clip/off/small/tiny) — so every point below is a look/spacing point the audit cannot see.
Units: "base" = the 854×480 design viewport (1366 wide ≈ ×1.6).

## A. Too close to the edge
- A-1 Outer margin is 8 base everywhere (prep.gd:187-210 top/field/tray, battle.gd:65). = ~1 % of the screen; genre references keep 16–24 and add the phone safe area. Worst spots: "รอบ 12 · ชนะ 7/10" text sits bare on the left edge with no box; battle timer "4.3 วิ" touches the right edge at 844; battle speed row / skip buttons and the Fight plate sit ~8 px from the bottom.
- A-2 No phone safe-area (notch / rounded corners) handling seen — on a real landscape phone the left bench and the "…" button can sit under the notch/corner.

## B. Things touching / overlapping
- B-1 Bench row 5 (bottom ≈ 620 @1366) overlaps the first shop slot's top-left corner (shop top ≈ 602, starts x 238 < bench right 252).
- B-2 Back-row foot marks (tribe + stars) overlap the heads of front-row sprites (e.g. snake over zombie's stars; angel's stars on the tree). Hard to read stars of back units.
- B-3 Shop card padlock sits on top of the sprite art (art box and lock share the top-right corner).

## C. Too far apart / unbalanced
- C-1 The board sits left of centre: ~300 px (@1366) of empty field on the right, while the left is crowded by bench + chips.
- C-2 Shop row not centred between reroll and Fight: gap left ≈ 145 px, right ≈ 78 px. Card x also shifts between states (238 vs 243).
- C-3 Top bar = 3 loose groups: round text, then a ~110 px gap to heart/gold, then a huge gap to the right buttons. Heart/gold boxes (64 tall) don't match the right buttons (60).
- C-4 Reroll button is alone under the bench, shorter than the shop cards (top 634 vs 602) — looks unattached.
- C-5 Odds row ("10% 20% …") floats in the gap with no label; a new player can't tell what it is.
- C-6 Battle: opponent name shown twice (top-left and in the bottom bar).

## D. Things worth adding (owner decides)
- D-1 Empty board at round 1 shows no drop tiles (tiles appear only while dragging) — show faint tiles all through prep.
- D-2 Bench: name cut ("ป้อมปราการเห…"); no "bench full" signal.
- D-3 Sell hint: selling = drag onto the shop dock (set 197 B1), but nothing says so until the red rim appears mid-drag — a small "ลากมาที่นี่เพื่อขาย +N" label on the dock while dragging an own unit.
- D-4 Field count "ในสนาม n/6" near the board (cheap, standard in the genre).
- D-5 Gold-next-round preview next to the gold box (only if the economy rule allows showing it — rule doc S, ask).
- D-6 Round track (rounds left to boss) — open idea, not urgent.

## Proposed order
1. A-1/A-2 + B-1 + C-2/C-3/C-4 = one spacing pass (layout constants only, no rule change).
2. B-2/B-3 + C-1 = arena/card placement (needs shots per size).
3. D items the owner picks.
Owner design rule: a look change goes through `ui-preview` samples first, code once after "ทำจริง".
