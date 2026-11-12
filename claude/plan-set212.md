# Plan set 212 — build the agreed prep-screen design for real (set 208 "ทำจริง")

Owner said ทำจริง on 12 Nov after sample round 9. Source of truth = `claude/preview-set208/notes.md` items 1–20
(+ R5–R9 shots there). The sample hack (`sample.diff`, `r5…r9-patch*.py`) shows WHAT to build; never paste it as is —
re-implement cleanly (skill `ui-work` 4e Windows PC + 4f, skill `ui-patterns` 2b). Branch: `claude/prep-canvas` (WIP, not on main).

## Owner decisions for this build (12 Nov, one question round — do not ask again)
- B1 **cut corners** on every box (StyleBoxFlat corner_detail 1, no anti-alias, radius ≤ 7; motif = arena floor slabs).
- C1 **tile rims hidden in battle too** — a rim shows only while a unit is dragged (all own-side rims) or when a state lights it.
- D1 **keep the Godot MCP Toolkit trial** (godot/addons, deny list in .claude/settings.json comes to main with this merge).
- UI tone = **cool** (R5-A2): dark tokens panel #1c2a33 · soft/card #253743 · line #7fa3b5 · accent #8cc0de · on-accent #13212a.
- Claude decides + informs (small things): shop padlock tap = lock/unlock that slot (≥ 24 px target, shots AUDIT "small") ·
  stars stay gold · cooldown shown as a bare number (seconds, 1 decimal, ".0" dropped) · light mode gets a matching cool palette
  (Claude picks, check contrast) · strip `_note` from exported godot/data jsons (pending bundle, set 203).

## Build notes (set 212, as built — differs from the step text where noted)
- Step 1: colours.json is generated from the frozen web CSS (node test) → the cool tokens live in a new hand-written `godot/data/tone.json`
  that theme.gd c() reads first (light + dark; bg/mute/arena-line cooled too). Contrast ≥ 4.5:1 for ink/mute/gold-ink/on-accent.
- Step 4: tribe row = `TribeRow` (flat Button) + `TribeChips` (GridContainer). Short window (400-high base, ≤ 360 px tall) → the owner's
  tall bench box would hit the chips, so the chips move to the field's top-right strip as a 3-column grid (prep._fit_bench).
- Step 11: the `_note` keys were in hand-written files (ui_th.json, credits.json), not exported ones → deleted, text moved into
  theme.gd / credits.gd comments; new test test_data_no_dev_notes guards every data/*.json.
- Shots tool: `--light` forces the light theme on a dark-mode PC; label meta `trim_ok` = agreed "…" (bench names) not counted as clip.

## Steps (tick + push each)
1. [x] **Colours + boxes** — godot/data/colours.json (dark cool tokens above + light cool set; check every other screen still reads:
   popups, name screen, run end use the same tokens) · theme.gd `box()` cut corners · `primary()` = plate lit from top-left
   (dark bottom 4 px / right 2 px edge). Check: shots all screens 844 dark + light, no magenta. Security: no outside asset.
2. [x] **Panels near-solid** — prep.gd GLASS 0.72 → 0.94 (set 207 P2 glass is on the tell list; owner saw it in R5–R9).
3. [x] **Bench = vertical list of 5 rows** (notes 1, 10, 19): picture 42 left (no badge/stars on it) · name, under it tribe shapes
   (main first) left + plain stars right-aligned · gap 12 · ~150 wide box from the scene · 5 slots (game value, unchanged).
   Bench picks rows/list from its box shape (Relay set 208). No stats line (does not fit). Long names end in "…".
4. [x] **Tribe chip row** (notes 2, 11): round chips (dark fill, tribe rim, shape) + "count/next step" (RULES.tribeSteps; yellow =
   reached) · team tribes only · top-left of the field, 12 px under the round title · tap = tribe popup · old TribeCol button removed
   (scene part too). Check: ripple on TribeCol name (tests/test_ui, shots.gd, ui-patterns/ui docs).
5. [x] **Foot marks in 3D** (notes 14, 16, 18): tribe shape + gold stars as children of each prep unit's Sprite3D at its feet,
   depth-tested (a unit in front hides them); shape side = star height (MARK 0.34 world, FOOT_PX 0.0058, shape 5 % lower);
   2D badge row on board cells removed; prep units pass `level`. Battle units: unchanged (HP bars) — note it in the Relay.
6. [x] **Rims** (notes 12 + C1): stage3d rim meshes hidden unless lit or a drag is on (`show_rims` from drag_started/ended).
7. [x] **No "+ถาวร" mark** on units (note 13) — card shows it on tap. ripple: `perm_dot` caption in ui_th.json (remove if unused,
   keep src/game/run parity rule in mind — the caption test checks godot texts exist in src, not the reverse).
8. [x] **Shop card** (notes 4, 15, 17): fixed ~104 wide, centred dock ±282 · tribe shapes stacked left · picture 42 · padlock
   top-right (gold closed / grey open) **tappable** · "อัปดาว" ribbon top centre · stats row (sword/heart/clock drawn in code,
   level-1 atk · hp · cd, 14 px bold) · name + price bottom · dock top 62 → 40 · odds line centred 12/40, no outline ·
   field bottom 22 px higher; arena bigger (note 6: Field top 82 → 44, prep margin 150 both sides).
9. [x] **Heart/gold icons cropped** (note 7) — theme.art group "ui" crop to used rect, squared.
10. [x] **Scene** — godot/scenes/prep_layout.tscn regenerated (tools/make_prep_layout.gd) so the owner's editor matches; owner's
    own moves (Bench box left/tall) kept. Test: no draggable part inside a Container (set 208 test stays green).
11. [x] **exportdata** — strip `_note` keys (src/tools/exportdata.mjs) → re-export godot/data. Security part ④.
12. [x] **Tests + shots** — TESTS_ONLY=ui,project then all Godot tests · shots 1366/844/740/667 (+ dark 1366/844) + 390x844
    rotate notice · every AUDIT clean (zoom-start/mid `off` expected) · MOVE CHECK: PASS · new test: shop padlock tap toggles lock;
    rims hidden at rest / shown while dragging. Pattern check (ui-patterns after-shot: tells < 3) + design-critique + accessibility.
13. [x] **Ripple + docs** — grep every changed name (TribeCol, perm_dot, GLASS, glass_btn, BENCH_*, SHOP_H) across godot/ src/
    claude/ tests; ui.md / plan-godot-migration P4 notes if a rule changed; ui-patterns §6 (motif = cut corner, tone = cool: close
    those open points, bump version); commit line `ripple:`.
14. [ ] **merge-code** — secret grep · `cd src && node tools/bootstrap.mjs setup` until PASS → `gate` once → merge to main → CI green
    (skill ci-check) → Relay line (UI: design skill ✓ · shots ✓ · critique ✓ · patterns ✓ (tells left n)).
15. [ ] **close-out** (HARD RULE 1). No artifact publish in this set (Godot build is not published as an artifact).
