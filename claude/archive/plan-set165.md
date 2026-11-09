# Plan set 165 — Balance Room "สรุปแรง/อ่อน" + per-level stats (branch claude/charming-planck-ktvj9h)

User picks (9 Nov): focus Balance Room first · A1 new first result sub-tab in รันจริง (บอท) · B1 compare with same rarity (and same level) · C1 flag gap 5 points AND > 2 × error, < 30 matches = low data (ค่าเสนอ) · D1 combat table layout unchanged · E2 level picker (all/Lv1/Lv2/Lv3) on BOTH the summary tab and the combat table.

1. [x] lab/matchcalc.js mxCombatAdd: optional per-level accumulator (level from the start event; summons = summoner's level) · check: tests/t-skill-calc.js new test (per-level sums = all-level totals)
2. [x] lab/analyze.js runPlayStats: chars[].lv {1,2,3: {g,w}} + combatLv · new pure charFlags(rows) (median of same rarity, gap 5, 2×SE, 30 floor) · check: unit test
3. [x] lab/balance body.html + js/63-analyze-run.js: sub-tab "สรุปแรง/อ่อน" (badge + reason, cards on phone) + level picker on it and on the combat table · css
4. [x] screenshots 1100 / 390 / dark · ui_smoke check for the new tab
5. [x] setup → gate → merge → CI → publish balance room (ask) → close-out
