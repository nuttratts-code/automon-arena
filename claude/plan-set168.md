# Plan set 168 — boss system v2 (C-17.6) · code branch: ccr-e9135bca-58jz37 (session branch; next chat: continue on it or claude/boss-v2 from it)

Decisions: A3 B2 C2 D1 E1 F1 G1 H1 (review-2026-11-09-brainstorm-boss.md) · kits: review-2026-11-09-bosskits.md · rule doc: combat-rules C-17.6 (V7.0).
Tick each step when done + pushed. Numbers = proposals; HARD RULE 6 before any value lands in the game.

- [x] 1. Brainstorm + user picks + C-17.6 doc + this plan (docs → main)
- [ ] 2. User approves kit draft v1 (review-2026-11-09-bosskits.md) — signature mechanics, punish/twist picks, Heat ladder order (values stay proposals)
- [ ] 3. stage.js: global boss settings (g, a, weakDefault, weakCap, resistDefault, heat ladder list) · bossMult → C2 (hp × g^(k−1), atk × (1 + a(k−1))) · mult10/endlessPct ignored (old saves still load) · phase mode "add" for v2 bosses · check: t-boss unit tests
- [ ] 4. battle.js: 6 new rules (plating, mendPulse, rage, staticChain, galeGuard, flameShell) + phase-add + Heat rules injected for k ≥ 3 + weak cap · each rule a unit test (on/off) · BOSS_RULES entries + Thai labels
- [ ] 5. runboss.js/boss.js: pass k → Heat · validate.js/cleanStage for new fields (HARD RULE 7)
- [ ] 6. HARD RULE 6: user presses 💾 → read Balance Room db → AMCFG1 → cfgdiff → per-cell picks · then stage-user.js: 6 v2 bosses (base hp/atk start = today's k1 values)
- [ ] 7. lab: fixed reference team set (generate once, commit json) · bossrun `--tribes` adds neutral-boss baseline column · calibrator `bossrun --fit` (reuse lab/bossfit.mjs bisection): solve one power factor per boss vs targets k1 all 60 / k2 all 50 on the reference set, report only (no --write without user OK)
- [ ] 8. Balance Room (skill ui-work): global boss fields, Heat ladder editor, kit editor for the 6 signature rules, remove mult10/endless fields, baseline column in boss results · screenshots desktop + phone
- [ ] 9. Measure: calibrator + bossrun --tribes 3000 (k3+ 12,000) → show user before/after → per-cell picks → write
- [ ] 10. setup → gate → merge (skill merge-code) → publish game + Balance Room (publish-pages) → clear stale config/main.stage (set 167 B1) → tell user cells to set back
