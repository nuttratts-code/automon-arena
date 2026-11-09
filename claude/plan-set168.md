# Plan set 168 — boss system v2 (C-17.6) · code branch: **claude/confident-einstein-hkf8t2** (steps 3–5 pushed, 9b0940c · setup PASS 339/339 · not merged: merge at step 10)

Decisions: A3 B2 C2 D1 E1 F1 G1 H1 (review-2026-11-09-brainstorm-boss.md) · kits: review-2026-11-09-bosskits.md · rule doc: combat-rules C-17.6 (V7.0).
Tick each step when done + pushed. Numbers = proposals; HARD RULE 6 before any value lands in the game.

- [x] 1. Brainstorm + user picks + C-17.6 doc + this plan (docs → main)
- [x] 2. User approved (I1, 9 Nov) kit draft v1 (review-2026-11-09-bosskits.md) — signature mechanics, punish/twist picks, Heat ladder order (values stay proposals)
- [x] 3. stage.js: global boss settings (g, a, weakDefault, weakCap, resistDefault, heat ladder list) · bossMult → C2 (hp × g^(k−1), atk × (1 + a(k−1))) · mult10/endlessPct ignored (old saves still load) · phase mode "add" for v2 bosses · check: t-boss unit tests
- [x] 4. battle.js: 6 new rules (plating, mendPulse, rage, staticChain, galeGuard, flameShell) + phase-add + Heat rules injected for k ≥ 3 + weak cap · each rule a unit test (on/off) · BOSS_RULES entries + Thai labels
- [x] 5. runboss.js/boss.js: pass k → Heat · validate.js/cleanStage for new fields (HARD RULE 7)
- [ ] 6. HARD RULE 6: user presses 💾 → read Balance Room db → AMCFG1 → cfgdiff → per-cell picks · then stage-user.js: 6 v2 bosses (base hp/atk start = today's k1 values)
- [ ] 7. lab: fixed reference team set (generate once, commit json) · bossrun `--tribes` adds neutral-boss baseline column · calibrator `bossrun --fit` (reuse lab/bossfit.mjs bisection): solve one power factor per boss vs targets k1 all 60 / k2 all 50 on the reference set, report only (no --write without user OK)
- [ ] 8. Balance Room (skill ui-work): global boss fields, Heat ladder editor, kit editor for the 6 signature rules, remove mult10/endless fields, baseline column in boss results · screenshots desktop + phone
- [ ] 9. Measure: calibrator + bossrun --tribes 3000 (k3+ 12,000) → show user before/after → per-cell picks → write
- [ ] 10. setup → gate → merge (skill merge-code) → publish game + Balance Room (publish-pages) → clear stale config/main.stage (set 167 B1) → tell user cells to set back

## Notes from steps 3–5 (set 168 cont., user A1 B1 C1)
- B1: only bosses with `v2: true` use the new system; today's 6 bosses unchanged (no value changed). C1: defaults = proposals (stage.boss2: g 2.5 · a 1.5 · weakPct 50 · weakCap 100 · resistPct 50 · heatRepeatPct 20 · heat = kit ladder).
- Data: `stage.boss2` (BOSS2_SETTINGS + heat list, cleanBoss2) · per boss `v2` · `weak` (≠ own tribe) · optional `weakPct` / `resistPct` (absent = boss2 default). Rules may carry a 3rd value `v3` (BOSS_RULES index 7).
- Phase-add + weak/resist + Heat are built in core/boss.js `bossV2Phases` / `heatRules` (battle engine unchanged: live rules = the phase list). `bossUnit(b, k, extra, g2)` / `bossAt(..., g2)`; runboss passes stage.boss2. Balance Room/lab still use the default g2 (step 8 wires the room).
- Choices Claude made (tell the user, change if they object): Heat past the list = steps 1–2 again, value × (1 + heatRepeatPct %) each time · S4 counts normal hits only · S5 cuts normal hits + skill damage (not burn/shock bursts) · S6 cuts all damage except execute, only normal hits strip a layer · S1 cuts normal hits only · S3 counts normal hits; a heal that restores 0 HP doesn't calm · plating/shell state carries across phases (not reset).
- New log event `chainAbsorb` (game/view.js subtracts armor). Tests: src/tests/t-boss2.js (12).
