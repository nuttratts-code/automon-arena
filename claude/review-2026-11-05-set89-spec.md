# Set 89 spec — shop simplification (user decided 5 Nov 2026, not started)
Replaces parts of set 88 (claude/review-2026-11-05-shop.md). Research: claude/review-2026-11-05-shop-research.md.

Decided by user:
1. Shop level rises automatically by round (Super Auto Pets style): every round played counts 1, win or lose. Remove the upgrade button / upgradeShop / levelCostStep. Mapping editable in the Balance Room (กฎเกม).
2. Reroll cost 1 → 2.
3. Remove win/lose streak bonus (+10) and interest entirely.

Open (ask at start of set 89, recommended first):
- a) Pace: table round → shop level, default round n = level n, cap 15 (recommended) · or SAP-like every 2 rounds (Lv15 only at round 29; runs last ~10–19 rounds).
- b) Gold carry-over between rounds: keep (recommended, no change) · or SAP-like no carry-over (unspent gold lost).
- c) Normal win bonus +2: keep (recommended) · or remove (SAP has none).

Work: core/shop.js (shopLv from round, drop interest/streak/upgrade), rules + Balance Room rows, save v3 (drop shopLv/streak fields or derive), game UI (remove button + income line, keep level chip + odds), tests, ui_smoke, bot (drop lv habit/save), botgen, bossrun (boss #1 70–80%, #2 lower), S docs S-2 S-6 S-7 S-11 + version, gate, merge, publish.
