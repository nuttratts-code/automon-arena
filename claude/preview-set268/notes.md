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

Rebuild: `cp -r automon-scratch/g g268` (v47 scratch, keeps .godot = no re-import) · delete the `MCPRuntimeServer=` line · patches in this order with `python <patch> g268`: r1-patch-runend → r1-patch-battle → r1-patch-prep → r7-patch-shoptop → r8-patch-hudbottom → r0-patch-harness-ui → r0-patch-harness-runend → r2-patch-slate-timeline (needs r2-timeline.gd.txt beside it) · shots: `sh shoot.sh` (phone 1688x780 → out/s268r2) and `sh shoot_pc.sh` (1920x1061 → out/s268r2pc). The shoot scripts expect `$SP/g268`; stills used: 1_battle, 8_prepH_hybrid, 9_runend, 9b_runend_details.
Security: scratch copy only, no outside assets, nothing shipped.
