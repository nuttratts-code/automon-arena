# Step 5.5 economy — plan + questions (31 Oct 2026)

Status: **waiting for user answers** (Q1–Q4). Nothing changed in code/rules yet.

## Scope (build-plan 5.5)
Prices · merge · permanent skills HL-4 WN-5 PL-2 PT-4 SF-7 · uncapped permanent shock · in-fight skills that set permanent stats + their cap · legends at level 1 — checked with simulated runs.

## Current values (shop-merge-rules S-7)
Gold 10 first / +10 per round / +2 after a win · reroll 1 · shop 5 · bench 6 · prices 3/4/5/6/8 · unlock wins 0/1/3/5/6 · odds 45/30/15/7/3 (ค่าเสนอ) · no interest.

## Tools already in repo
`core/botteams.js simRun` (bot player plays a full run vs the 90 bot teams) · `lab/runlen.mjs` (match length per round).

## Plan options
- **A (recommended) — measure first, then tune.** New `lab/econ.mjs` on top of simRun: per round → gold spent / unspent, rerolls, team level-sum, Lv2/Lv3 counts, legends bought at Lv1 and their win share, permanent stats gained per skill (HL-4 WN-5 PL-2 PT-4 SF-7, uncapped shock), win rate per round. Report → user picks what to change → re-measure. ~2–3 sets.
- **B — rule review only.** Claude lists likely problems from the rules (no new tool), user decides. Faster, less evidence.
- **C — A but only permanent skills first** (biggest risk: uncapped shock), prices/odds later.

## Questions
1. Option A / B / C?
2. Target run feel: how many rounds should a typical run last, and when should Lv3 / first legend appear? (Claude proposes once measured if no preference.)
3. Uncapped permanent shock: keep uncapped unless measurement shows a runaway, or add a cap now?
4. The bot player's buying logic (core/bot.js) is the "player" in simulation — OK to accept its play level as the reference?
