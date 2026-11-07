# Review 7 Nov 2026 — common units can't reach Lv3 before late game (research only, no code)

User (set 133): difficulty OK, but late game arrives too fast → can't find common units for Lv3.

## Cause (numbers from current game: rules.js shop + 48 chars)
- Lv3 = 9 copies (mergeCount 3). Commons = 12 types, shop 5 slots, unlimited pool, shop level = round (roundLevels 1..15).
- Common odds by level: 100/70/50/40/30/20/10/10/10/10/5/5 → one SPECIFIC common per slot: 8.3% (r1) → 2.5% (r5) → 0.8% (r7+).
- Expected copies of one specific common seen, cumulative, 4 shops/round (3 rerolls):
  r1 1.7 · r3 3.7 · r5 4.8 · r8 5.5 · r10 5.8 · r12 6.0 → **never reaches 9**. From round 7 a copy needs ~24 shop views.
- Gold is not the limit (25/round, reroll 1); the odds curve is.
- Even at 100% commons, 9 copies need ~22 shop views → structural: 12 types × 5 slots.

## History / conflict (must tell user)
- Set 88 found reroll-to-Lv3-commons too easy (unlimited copies + cheap reroll) → set 89/91 lowered commons (5–10% late). Raising commons again re-opens that: early reroll into Lv3 commons. Watch with runerun/charstat.

## Options (model numbers, same 4 shops/round)
| | idea | specific common copies by r5 / r8 / r10 | side effects |
|---|---|---|---|
| A | odds table: commons stay higher (100/80/65/55/45/35/30/25/20/20/15/15) — Balance Room only | 5.8 / 7.3 / 7.9 | fewer rare/legend in shop → weaker late teams; still short of 9 |
| B | shop level slower (roundLevels 1,1,2,2,3,3,4,4,5,5,6,6…) | 6.5 / 8.7 / 9.7 | everything later (rare/legend too); bosses/foe floor feel harder |
| C | built-in "focus": a character you own at Lv2 shows ×3 in its rarity (same as rune X2 ดึงดูดตัว, automatic) | 6.7 / 8.4 / 9.2 | only helps units you commit to; X2 rune loses value (raise X2 or rework) |
| A+C | both | 10.1 / 13.9 / 15.6 | easiest; loophole risk highest → may need smaller mult (×2) |

Recommended (Claude): **C** (×2–×3, ค่าเสนอ), optionally + mild A. Keeps late shop rich, rewards committing; X2 rune then needs a new role.
All numbers ค่าเสนอ. Before building: HARD RULE 6 (fresh AMCFG1 → cfgdiff) · regen bot teams (botgen) · G3 measure (runerun 600) + charstat · gate · publish.

## DECISIONS
User DECIDED (set 133): **no C · odds table only** — user's table (set in Balance Room, ค่าเสนอ until measured):
Lv1 100/0/0/0/0 · Lv2 80/20 · Lv3 70/30 · Lv4 55/45 · Lv5 45/50/5 · Lv6 40/50/10 · Lv7 35/45/20 · Lv8 30/40/25/5 · Lv9 25/35/30/10 · Lv10 20/30/35/15 · Lv11 14/25/40/20/1 · Lv12 10/20/40/25/5 · Lv13 10/15/35/30/10 · Lv14 10/10/30/35/15 · Lv15 5/10/30/30/25.
Model: specific common seen r8 7.6 · r13 8.9 (old 5.5 / 6.1). Avg shop price r7 7.1→4.7, r10 8.7→6.0 → game ~3–4 rounds slower; fixed bosses 5/10/15 likely harder.
Next: AMCFG1 → cfgdiff → import table → botgen → runerun 600 (clear %, boss k1–k3, round commons hit Lv3) → show user before publish.
