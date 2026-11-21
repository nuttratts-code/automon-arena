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

Rebuild: `cp -r automon-scratch/g g268` (v47 scratch, keeps .godot = no re-import) · delete the `MCPRuntimeServer=` line · patches in this order with `python <patch> g268`: r1-patch-runend → r1-patch-battle → r1-patch-prep → r7-patch-shoptop → r8-patch-hudbottom → r0-patch-harness-ui → r0-patch-harness-runend · shots: `sh shoot.sh` (phone 1688x780 → out/s268r1) and `sh shoot_pc.sh` (1920x1061 → out/s268r1pc). The shoot scripts expect `$SP/g268`; stills used: 1_battle, 8_prepH_hybrid, 9_runend, 9b_runend_details.
Security: scratch copy only, no outside assets, nothing shipped.
