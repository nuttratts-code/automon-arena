# Set 96 review — early-game gold too high (5 Nov) · docs only, nothing changed

User played a run after set 95: "early-game gold feels too much — show how other games balance it".

## Ours now (S-7)
start 25 · +25/round (+2 win) · gold carries over, no cap · units 3/4/5/6/8 · sell = FULL refund · reroll 2 · team 5 + bench 6.
Round 1: 25 gold = 8 commons → full team (15) + 5 rerolls, or a Lv2 merge already in round 1. Full refund = no gold is ever lost → leftovers pile up.
History: set 83 raised 10/10 → 25/25 because the bot made 0% full-Lv2 teams by round 5 at 10/10 (bot never plans merges → it is weaker than a human at low gold).

## Other games (approximate, from memory — genre references only)
| game | round-1 gold | per round | unit cost | sell back | carry over | buys per round (income ÷ cheapest) |
|---|---|---|---|---|---|---|
| Super Auto Pets | 10 | 10 flat | 3 | 1 | no (resets) | ~3 |
| Hearthstone Battlegrounds | 3 | 3 → +1/turn → 10 cap | 3 | 1 | no | 1 → 3 |
| TFT / Underlords (auto-chess) | ~2–4 | 5 base + interest + streak | 1–5 | ~full at 1★ | yes (interest rewards saving) | ~1–3 early (gold also buys levels) |
| Backpack Battles | ~12 | grows each round | varies | ~half | yes | ~2–4 |
| **Automon now** | **25** | **25 flat** | **3–8** | **full** | **yes** | **~8** |

Common patterns: (1) early rounds are TIGHT (1–3 buys) and income RAMPS up; (2) selling loses value (sell < buy) so every buy is a choice; (3) either gold resets each round, or carrying it is a deliberate strategy (interest) with a limit.

## Options (all numbers ค่าเสนอ — user picks)
- **A (rec) Ramp income** like HSBG: round 1 = 10, +3 per round, max 25 (10,13,16,19,22,25,25…). Only the early game changes; round 6+ = same as now. New rule `shop.goldRamp` (+ Balance Room row).
- **B Lower flat + reset** like SAP: 12/round, leftover gold lost each round. Simplest feel, removes hoarding, but bigger change to the whole run.
- **C Sell refund 50%** (rounded down; merged units = half of total paid). Keeps 25/25 but every buy/pivot costs. Can combine with A.

Any option → afterwards: regenerate bot teams + re-tune bosses (`lab/runerun.mjs ... --write`) + check normal-round win 85/70/55 per difficulty; risk = bot (no merge planning) gets weaker than humans at low gold → may need bot merge logic first. `lab/econ.mjs` can show the round-by-round effect before deciding.
