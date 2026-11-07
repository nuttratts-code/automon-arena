# Whole-system check vs other auto-battlers (set 127 · 7 Nov 2026 · docs only)
Asked by user: "check every game system, compare with other games, what should we NOT do".
Source: combat-rules V3.4, tribe-rules V2.1, shop-merge-rules V10.1, handoff sets 107–126. Other games from Claude's knowledge (not web-checked).
Reference games: Super Auto Pets (SAP), Hearthstone Battlegrounds (HSBG), TFT, Dota Underlords / Auto Chess, The Bazaar, Backpack Battles (BB).
Nothing changed. Each item = risk + options; user picks. Items the user already closed (handoff "do not re-propose") are excluded.

## Risky — recommend changing (high)
| # | What we do now | Other games | Why it is risky | Options |
|---|---|---|---|---|
| R1 | Enemy = bot team with power closest to YOUR board (S-12 set 119); power = HP×dmg + tribe bonus, ignores skills and runes | SAP/HSBG/TFT match by round (or real players), never by your strength | (a) Rubber band: getting stronger never makes wins easier → progress feels pointless. (b) Loophole: a team strong through runes/skills but low HP×dmg gets weak enemies (runes ~9 per run, all active). | A match by round + win count (old set 99 style) · B keep power match but count runes/skills (hard to measure) · C power match with floor = round's median team (recommended: B is costly, C keeps fairness and blocks sandbag) |
| R2 | Sell = full refund of everything paid, incl. merged copies (S-2) | SAP sell 1 gold · HSBG 1 · TFT full only at 1★ | Buying has no risk → fewer real choices. Already open: claude/review-2026-11-07-sell-merge.md (A recommended). | decide that file |
| R3 | Second chance used in 93% of runs (G3 measure set 119) | SAP/HSBG: no revive | When almost everyone gets it, it is just "6th heart + free legend rune", not a special moment; balance must assume it. | A keep (it is a safety net) · B trigger only if ≥ N wins · C drop the free rune, keep the heart |

## Watch — fine for MVP1, decide before MVP2 / more content (medium)
| # | What we do now | Other games | Risk |
|---|---|---|---|
| W1 | Unlimited copies per character (S-2) | TFT/Underlords/HSBG shared limited pool; SAP unlimited | Lv3 = 9 copies of one common is easy with reroll 1. Kept in check only by "no carry-over gold". If a gold rune / interest rune stacks, reroll-to-Lv3 returns. |
| W2 | No caps on any permanent stat + stacking skills (PL-2, PT-3, WY-3, HL-4) | SAP caps 50/50; HSBG uncapped but PvP absorbs it | Fine vs bots in a ≤ 15-round run. MVP2 ghosts: one runaway team crushes everyone; save values near 100,000 guard. Decide caps before ghost battle. |
| W3 | Rune copies multiply ("ผลคูณตามจำนวน", T11 decided) and no slot limit | Bazaar/BB limit by board/bag space | Rune shop was already removed for this (set 95). Watch legend-rune stacking from second chance + boss cards. |
| W4 | Draw = win for the player (C-11) | HSBG/TFT draw = nobody loses | OK vs bots; MVP2 needs a new rule (already noted in C-12). |
| W5 | Shop level = round, levels 12–15 = 30% legend, 5% common | TFT keeps cheap units useful late | Late shops full of legends → commons only matter as Lv3 targets. In a ≤15 round run this is mild. |
| W6 | Overtime starts at 180 s, hard stop 300 s | SAP fights last seconds, TFT ~30 s | Check real playback length on phone; long fights tire players. Not measured. |

## Complexity (UX risk, low–medium)
- Many invisible effects: shock = true damage stacking unlimited, 7-step tick order, revive/down queue, runes on slots that pass to the next unit. SAP succeeds by showing every effect as a short pop-up. Don't add new effect TYPES before the battle view explains the current ones (ticker / floating card already started, sets 120–121).
- 6 tribes × 48 characters × 2/4/6 tiers is fine (TFT-sized), but tribe counts are uneven (Wind 13 vs Fire/Storm 8, T-2 ⚠️) → Fire/Storm 6 tier is harder to reach; charstat set 122 shows fire −8.

## Things done right (keep)
- No prep timer (single player) · gold does not carry over (blocks infinite reroll) · shop level auto by round (SAP-style, no trap choice) · duplicate names count once for tribes (TFT) · placeholder art + original names (IP safe) · bots built from real simulated runs, not cheated stats.

## Never do (general lessons from other games)
- Copy names/art/UI of another game (CLAUDE.md) · pay-to-win or loot boxes · hidden odds (we show shop odds — keep) · add systems beyond MVP1 (items, food, partner already cut) · balance by feel without measuring (we have Balance Room — keep using it).

## DECISIONS (user fills)
- R1: ? · R2: (sell-merge file) ? · R3: ? · W-items: keep for now unless user says otherwise.
