# Sell price after merging — decision needed (set 120, 7 Nov)

User asked (7 Nov): selling a merged unit should refund one copy less, e.g. Lv2 made of 3+3+3 sells for 6 (the price of 2 copies), "same system at every level".

**Conflict:** shop-merge-rules S (line 13) "ขาย = คืนเต็มราคาที่จ่ายทั้งหมด (รวมทุกตัวที่ใช้รวมร่าง)" · code core/shop.js sell() refunds `u.paid`. Not changed yet — waiting for the user's pick.

Lv3 is ambiguous (Lv3 = 3 × Lv2 = 9 copies). Example with a 3-gold character:

| option | Lv1 | Lv2 | Lv3 | rule |
|---|---|---|---|---|
| A (recommended) | 3 | 6 | 15 | every merge loses 1 copy (Lv2 = 9−3 · Lv3 = 3×6 − 3) |
| B | 3 | 6 | 24 | one copy less once, whatever the level (paid − 1 copy) |
| C | 3 | 6 | 12 | each level keeps 2 of 3 parts (Lv3 = 2 × Lv2) |

Side effects (all options):
- bots sell too (core/bot.js) → bot teams must be regenerated (botgen, new hash) and the G3 economy measure is stale.
- copies with paid 0 (rune เงา) / fast merge rune (2 copies) / buy+merge: refund floors at 0.
- S line 14 (sell + rebuy loop) stays valid; sell skills (fireShopSkill) unchanged.

## DECISION (user 7 Nov, set 127): option A — BUILT (set 127 build): merge() sets paid = sum − 1 copy price (floor 0); sell refunds paid.
