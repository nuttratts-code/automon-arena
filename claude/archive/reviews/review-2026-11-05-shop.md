# Shop rework — decisions agreed 5 Nov 2026 (set 88, not started)

User confirmed all items below in chat (old account chat, 5 Nov). Numbers marked (ค่าเสนอ) = proposed by Claude, user accepted the table but values are still tunable. Implement in one set.

## 1. Character pool
- Unlimited copies per character (already the case — no change).

## 2. Shop level (replaces rarity unlock by wins)
- Remove `shop.unlockWins` gating (and `shop.weights`) → rarity odds come from the player's shop level.
- 15 levels, start at level 1. Player presses "upgrade shop" during the shop phase.
- Upgrade cost to reach level n = 2 × (n − 1) → 2, 4, 6 … 28 (total 210 to reach 15). No round gating.
- Upgrade does NOT reroll the shop (new odds apply on next reroll / next round). Shop stays 5 slots.
- Odds table (%, sums 100; each rarity peaks at 70 every 3 levels) (ค่าเสนอ):

| Lv | common | uncommon | rare | epic | legendary |
|---|---|---|---|---|---|
| 1 | 90 | 10 | 0 | 0 | 0 |
| 2 | 80 | 18 | 2 | 0 | 0 |
| 3 | 70 | 25 | 5 | 0 | 0 |
| 4 | 50 | 40 | 10 | 0 | 0 |
| 5 | 30 | 55 | 15 | 0 | 0 |
| 6 | 15 | 70 | 13 | 2 | 0 |
| 7 | 10 | 50 | 35 | 5 | 0 |
| 8 | 7 | 33 | 52 | 8 | 0 |
| 9 | 5 | 15 | 70 | 10 | 0 |
| 10 | 4 | 10 | 50 | 33 | 3 |
| 11 | 3 | 7 | 33 | 52 | 5 |
| 12 | 2 | 5 | 13 | 70 | 10 |
| 13 | 2 | 4 | 9 | 50 | 35 |
| 14 | 2 | 3 | 7 | 33 | 55 |
| 15 | 1 | 3 | 6 | 20 | 70 |

- Claude warned: legendary 70% at max (only 6 legendary types) → Lv3 legendaries easy. User kept 70. Measure and report.

## 3. Interest
- Start of each round, before income: +1 per 5 gold held (floor(gold/5)). **No cap** (user: try uncapped first; Claude warned about hoarding snowball → measure).

## 4. Win / lose streak
- Win streak: from the 3rd consecutive win onward, each win gives +10 INSTEAD of the normal +2. Tie counts as a win. A loss resets it.
- Lose streak: from the 3rd consecutive loss onward, each loss gives +10. A win/tie resets it. (Claude warned about intentional losing; user chose to keep it.)
- Paid with next round's income (same timing as current win bonus). Boss matches count like normal matches (S-10).

## Follow-up work in the same set
- core/shop.js + rules.js (config, validation ranges, Balance Room rule rows) · save format (shop level, streak counters) + load validation · game UI: upgrade button + level + odds display, interest/streak messages.
- core/bot.js: learn upgrade / saving for interest / streak; regenerate bot teams (botgen, BOT_TEAMS hash) · re-tune bosses (target from set 87: boss #1 70–80%, boss #2 lower) · update shop-merge-rules (S-2, S-6, S-7, S-8; also "90 teams" → 360) + version bump · gate → merge → publish.
