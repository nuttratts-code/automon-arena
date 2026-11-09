# Plan set 171 — rune rarity odds by round (PARKED until set 170 merges)
Decided by the user (9 Nov): rune rarity odds change per round like the shop table; shown/editable in the Balance Room "กฎเกม" tab.
- A: table like shop `levelOdds` (15 rows × 3: common/rare/legend), user-adjustable (ambiguous "ปรับลดได้": cells editable + may be set to 0; confirm if row count must change).
- B1: starting values (ค่าเสนอ) r1 85/15/0 · r5 65/30/5 · r10 45/35/20 · r15 25/40/35, linear between (round to ints, sum 100).
- C1: only rarity odds move to rules (src/core/rules.js shop-like block); offCards/offBoss*/offScL/rr* stay in stage settings.
- Replaces stage settings rarC/rarR/rarL (currently 60/30/10 flat, set 107) → remove/migrate; tell user which Balance Room cells to set back (+💾).
- Code: src/core/runrunes.js rnRollRar(round) · bots follow automatically · tests · Balance Room rules tab UI (ui-work skill) · docs: shop-merge-rules line ~117, combat-rules C-16 (bump versions).
- Blocked by: lock 170 (stage.js, shop-merge-rules, balance room). Start after 170 merges; take lock as set 171.
