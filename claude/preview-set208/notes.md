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

## Open / to watch
- Gold stars blend into gold sprites (e.g. the snake) — owner may want white stars.
- Odds text without outline sits on the floor (grey/blue digits a bit faint) — offered a faint backing strip.
- Lock tap target must be ≥ 24 px (shots AUDIT "small").
- Check 390 px tall/narrow sizes: bench 150 wide + bigger arena may collide on 667/390.
