# Plan set 205 — one shared arena for prep + battle (user E1 set 204 · A1/B1 set 205)
Branch `claude/arena-one` · display only, no rule/value change · Godot only (web v132 frozen).
User picks set 205: **A1** build now (zoom in for the shop, zoom out for the fight, ~0.6 s) · **B1** 740×330 text size not fixed this set (only "not worse").
Claude's small picks (told the user): plain two-tone floor + midline · enemy half hidden off-screen during prep · 0.6 s at every battle speed · replays from prep zoom too (from the run end: no zoom).

## Design (frontend-design pass)
- One motion moment only: the camera move. Easing cubic in-out, 0.6 s total.
- Palette unchanged: floor = `arena`, frame = `arena-line`, midline = `mid`; enemy half = `arena` darkened 6 % so the two halves read apart.
- Camera feel without scaling text: during the move the prep board and the battle field are hidden and `arena.gd` draws the world itself (floor, midline, 6+6 slot frames, unit pictures, no text). Every slot rect is lerped from its prep spot to its battle spot; the enemy slots start where the same "camera" maps them = off-screen right. When the move ends the real cells (crisp text) take over at exactly those spots.
- Overlays: prep top (hud + message) slides up, prep tray (bench + dock) slides down in the first 0.25 s; battle hud + rune row slide down and battle dock slides up in the last 0.25 s. Back to prep = the same in reverse.
- Steady screens look like now (Field panels keep their own floor) → low risk for tests and shots.

## Steps (tick = done + pushed)
1. [ ] `godot/scripts/ui/arena.gd` (new, node "World", full rect, mouse ignore, hidden when idle): `play(from_rects, to_rects, tokens, dur)` lerps per-slot rects + floor rect + midline, draws unit textures (`TH.art("unit", id)`, else tribe colour square), emits `done`. `rects_of(controls)` helper. Check: test_ui unit test lerp at t=0/0.5/1.
2. [ ] `prep.gd`: wrap Hud+Msg in "Top" and BenchBar+Dock in "Tray" plain-Control holders (inner VBox offset tweenable, sizes follow the holder); node names Board/Field/Bench/Dock kept. `slide(t)` sets both offsets. Check: test_ui prep tests still pass.
3. [ ] `battle.gd`: same holders for Hud+RuneRow ("Top") and Dock ("Tray"); `slide(t)`; `hold()` = load without playing until the move ends. Check: battle tests pass.
4. [ ] `app.gd`: World added between bg and prep; `_show_battle` from prep → load battle hidden, wait 1 frame for layout, read prep `b_*` cell rects + battle `0:r:l` / `1:r:l` cell rects, play the move, then show cells + `view.play()` (auto-skip runs after the move); `_on_next` / replay back to prep → reverse move. `zoom_s` var (0 = instant; headless tests are not in a tree → instant). Battle result is already applied before the move (set 22 rule untouched).
5. [ ] `tests/shots.gd`: `zoom_s = 0` for the normal states + one extra shot `zoom-mid` (move frozen at t=0.5) per size; `tests/test_ui.gd`: lerp test + fight still reaches the result headless. Check: Godot `TESTS_ONLY=ui,project` then full Godot tests.
6. [ ] Shots 1366×768 · 844×390 · 740×330 · 667×375 (+dark 1366/844): read AUDIT lines + PNGs; 740×330 not worse than set 202 (8.9 px).
7. [ ] `claude/ui-todo-godot.md` tick E1 with set 205 · ripple grep (Field/Board/Bench/Dock/Hud, shots names) · secret grep · setup → gate → merge → Relay line → close-out.

Security line: no new assets/addons/packages (placeholder art already credited) · no external input read · nothing new shipped beyond the game scripts.
