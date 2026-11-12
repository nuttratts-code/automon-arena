# Set 208 — prep screen design samples (owner-approved direction, NOT yet coded)

Samples made with skill `ui-preview` on a scratch copy of godot/. `sample.diff` = the exact sample hack
(paths: left = repo godot/, right = scratch copy). It is a SAMPLE, not production code: re-implement cleanly via `ui-work`
(sizes 1366/844/740/667/390 + dark, tests, MOVE CHECK) when the owner says ทำจริง. Images R1–R4 = 844×390 after each round.

## Agreed so far (owner, 11–12 Nov)
1. **Bench (C1):** vertical list of 5 rows on the left, ~150 wide; picture left (no tribe badge, no stars on it) · right column:
   name, then under it tribe shapes (main tribe first) followed by plain stars. Gap picture↔name 12 px. Bench stays 5 slots.
2. **Tribe chips:** row of round chips (dark fill, tribe-colour rim, shape inside) with "count/next step" under each
   (steps 2/4/6 from RULES.tribeSteps; yellow = step reached, white = not yet) · only tribes on the team · placed top-left
   (field top-left, under the round title, above the bench). Old glass TribeCol button hidden.
   ⚠ owner's reference showed "1/1" — we show count/next step; owner did not object yet.
3. **Stars everywhere:** no background pill, gold glyph with thin dark outline. On the arena: size 22, centred on the
   unit's own tile (sits on its own sprite, never on the unit in front).
4. **Shop card:** narrower, fixed ~104 wide, cards centred (Dock shrunk to ±282 around centre) · tribe shapes stacked top→bottom
   on the left (main first) · no tribe badge on the picture · padlock icon top-right (gold closed = locked, grey open = not)
   → will be tappable to lock straight from the shop (sample = drawing only) · "อัปดาว" ribbon moved to top centre.
5. **Shop odds line:** centred on screen above the shop, no outline, moved ~8 px lower (offset_top 34 / bottom 62).
6. **Arena bigger:** Field offset_top 82→44, offset_bottom −151→−118; prep target margin 150 px on BOTH sides (board stays centred, clears the bench).
7. **Heart / gold icons:** the 32 px tiles hold a tiny picture → crop to the used rect (squared) before scaling (theme.art, group "ui").

## Round 5 (12 Nov, set 212) — UI temperature + shape motif, NOT yet picked by the owner
- Rebuild: apply `sample.diff` (R1–R4), then `python r5-patch1.py <copy>` and `python r5-patch2.py <copy>`; shoot with env `UI_TEMP=warm` or `cool`.
- Both: cut corners (chamfer, StyleBoxFlat corner_detail 1, radius ≤ 7, no anti-alias) on every box = our shape motif candidate (not diamond/hexagon; echoes the arena floor slabs) · panels near-solid (glass 0.72 → 0.94) · Fight button = plate lit from top-left (dark bottom 4 px / right 2 px edge).
- R5-A1 warm: dark walnut panels #3b2716 + brass line #b8893e + brass Fight button (opposite of the cool grey-blue arena = DO 20, Claude's pick).
- R5-A2 cool: slate panels #1c2a33 + steel-blue line #7fa3b5 + pale blue Fight button.
- Tells left: one default sans font (display font = open point) · same corner cut on every box.

## Round 6 (12 Nov, set 212) — owner picked the COOL tone (R5-A2); corner style not answered → cut corners kept
- Rebuild: sample.diff → r5-patch1.py → r5-patch2.py → r6-patch.py (cool is now fixed in code, no env needed).
8. **UI tone = cool** (slate panels #1c2a33, steel-blue line #7fa3b5, pale blue Fight) · near-solid panels · cut corners on every box (motif candidate) · Fight = plate lit from top-left.
9. **Arena stars under the unit:** the cell's stars row sits at the bottom of the cell (tile front edge).
10. **Bench stars right-aligned** in each row (tribe shapes stay left under the name).
11. **Tribe chip row 12 px lower** (it crowded the top bar).
12. **Tile rims (blue squares) hidden** — shown only while a unit is dragged (all own-side rims) or when a rim is lit by a state (merge / drop / pick).
13. **No "+ถาวร" mark** on units — the card shows permanent bonuses on tap.

## Round 7 (12 Nov, set 212)
- Rebuild: … → r6-patch.py → copy `r7-stat_icon.gd.txt` to scripts/ui/stat_icon.gd → r7-patch1.py → r7-patch2.py.
14. **Tribe shape + stars at each unit's feet, inside the 3D scene** (children of the sprite, depth-tested): a unit standing in front hides them, same as it hides the unit ("ของใครของมัน"). The 2D badge row on board cells is gone. Prep only (battle units unchanged in the sample).
15. **Shop card stats row** under the picture: attack (sword) · HP (heart) · cooldown in seconds (clock), level-1 values, icons drawn in code, numbers 14 px bold. Cards taller: dock top 62 → 40, odds line 34/62 → 12/40, arena bottom 22 px higher.

## Open / to watch
- Cooldown shows a bare number (no "วิ") — unit on tap only.
- Foot marks are small at 844 (shape ~11 px, stars ~14 px); back-row marks can be fully hidden by a tall front unit (owner's wish, but the player then cannot read that unit's stars without tapping).
- Back-row stars sit at their tile's front edge, close to the heads of front-row units (snake) — watch on other team shapes.
- Rims hidden in battle too (sample) — decide if battle needs them.
- Gold stars blend into gold sprites (e.g. the snake) — owner may want white stars.
- Odds text without outline sits on the floor (grey/blue digits a bit faint) — offered a faint backing strip.
- Lock tap target must be ≥ 24 px (shots AUDIT "small").
- Check 390 px tall/narrow sizes: bench 150 wide + bigger arena may collide on 667/390.
