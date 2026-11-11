# Godot UI to-do (set 203 · loop: claude/workflow/setup.md §6)
The user plays in the Godot editor and sends screenshots + numbered notes, one screen at a time (B1). **Set 205 user pick:** open notes are fixed together with the 3D scene work (plan-godot-migration step 8), not in separate 2D sets. Claude logs each note here under its screen, asks design options before changing a design, fixes one screen per set, and ticks `[x]` with the set number when merged. Web game v132 stays frozen (set 189 C1).

## Name screen
## Rune offer
## Prep / shop
- [x] (set 204, user E1 · done set 205: godot/scripts/ui/arena.gd) **One shared arena for prep + battle:** battle = wide camera showing both halves (player left, enemy right, art-style §8) · prep = camera zooms into the player's half and the shop/bench panel appears, layout like now · press fight = panel leaves, camera zooms out to reveal the enemy. 2D now (Camera2D, ~0.6 s tween, placeholder background); the step-8 3D diorama later keeps the same camera idea. Rules unchanged (display only). Check 740×330 text size when the panel sits over the zoomed arena.
## Battle
## Result card · match details
## Run end
## Menu · Log · credits · resume
## Known before set 203
- [ ] 740×330: text draws at 8.9 px (prep needs the full 480 base height; a compact prep layout would fix it) — set 202, owner may decide.
