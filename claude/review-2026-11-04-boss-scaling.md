# Boss scaling measure (set 80, 4 Nov 2026)
Code bosses = core/stage-user.js (config/main v282, set 78c). Win = boss killed (time out = not a win). Scripts: `node lab/bossmeasure.mjs 150` (k table) · `node lab/bossmult.mjs 100` (multiplier scan). All proposals below are ค่าเสนอ — the user picks.

## 1. Random 6-unit teams vs bosses (avg of B1–B6, n 150 per boss, no runes)
| team | k1 | k2 | k3 | k4 | k5 | k6 | k8 | k10 |
|---|---|---|---|---|---|---|---|---|
| Lv1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Lv2 | 40 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| Lv3 | 94 | 45 | 30 | 18 | 9 | 4 | 1 | 0 |
Random runes add little: Lv3 k2 45 → 49 (2 runes) → 56 (5 runes). Hardest: B5 (Lv3 k2 29%). Easiest at k1: B1.

## 2. Real teams from simulated runs (bot plays the run, perm stats included, no runes)
| round | avg level | % units Lv3 | k1 | k2 |
|---|---|---|---|---|
| 5 | 1.36 | 0 | 0 | 0 |
| 10 | 1.96 | 1 | 7 | 0 |
| 15 (runs still alive) | 2.00 | 1 | 20 | 0 |
→ With bossEvery 5, boss #1 (stage 5) and boss #2 (stage 10, ×mult10 = ×2) are almost unbeatable for normal players. A full-Lv3 team almost never exists inside the main run.

## 3. Multiplier scan (boss HP + atk × m, relative to boss #1 now; win % avg B1–B6)
| team | ×0.3 | ×0.4 | ×0.5 | ×0.6 | ×0.7 | ×0.8 | ×1 | ×1.2 | ×1.5 | ×2 | ×2.5 | ×3 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| round 5 (real) | 79 | 48 | 18 | 6 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| round 10 (real) | 98 | 95 | 79 | 56 | 34 | 20 | 5 | 1 | 0 | 0 | 0 | 0 |
| round 15 (real) | 99 | 97 | 87 | 75 | 56 | 40 | 16 | 6 | 1 | 0 | 0 | 0 |
| random Lv2 | 99 | 96 | 90 | 84 | 71 | 59 | 39 | 25 | 9 | 3 | 0 | 0 |
| random Lv3 | 100 | 100 | 100 | 100 | 100 | 99 | 95 | 88 | 74 | 54 | 32 | 16 |
- All-Lv3 team: 50% at about ×2 = boss #2 now (stage 10). Boss #1 now (×1) is ~95% for them.
- Real stage-5 team: 50% at ~×0.4 · real stage-10 team: 50% at ~×0.6 · stage 15: ~×0.75.

## Options (waiting for user pick)
- **A (recommended): bosses as a fair ~50% fight at their stage.** Base HP+atk ×0.4 (boss #1, stage 5) · mult10 1.5 (= ×0.6 of today's base, stage 10) · endlessPct ~16% so the all-Lv3 team (×2 of today's base) hits 50% around stage 50 (k10). Note today's endlessPct 15% already fits this, once the base is lowered.
- **B: easier (~80% at their stage).** Base ×0.3 · mult10 ~1.7 (×0.5) · endlessPct ~19% (wall at stage 50).
- **C: keep as is.** Bosses stay end-game walls: all-Lv3 team = 50% at boss #2; normal players cannot pass stage 5.
Caveats: main-run economy (stage mode may give more gold later) · runes, perm growth in endless not modelled past round 15 · B1 endlessPct is 30% (others 15%).
