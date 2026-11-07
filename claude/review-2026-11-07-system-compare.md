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


## Options in detail (user asked set 127b: fixes + pros/cons + impact for each)
R1 enemy matching
- A by round + wins (no power): + simple, getting stronger = winning more, no loophole · − strong/weak players get same foes → too easy/too hard swings · impact: stage.js/botteams pickFoe, re-measure G3, clear rate rises.
- B power incl. runes+skills: + fair · − skills/runes hard to score, needs a new measure per rune/skill, every new rune needs a value · impact: big code + lab work.
- C (rec) power match but floor = round median team (and/or cap at +N% above): + blocks sandbag, still adaptive, small code · − still rubber band above the floor · impact: one setting in Balance Room, re-measure G3.
R2 sell: see sell-merge file (A Lv1/2/3 = 3/6/15). + buying has weight · − feels harsher, bots must be regen'd · impact: shop.js sell, bot.js, botgen, G3 stale.
R3 second chance
- A keep: + safety net, kind to new players · − = 6th heart, balance must assume it.
- B only if wins ≥ N (e.g. 5): + reward for doing well, feels special · − weak players lose it (clear rate falls for them).
- C heart only, no free legend rune: + keeps net, less power jump · − less exciting · impact: loseGuard + offer 'sc'; re-measure clear rate (was 18.5%).
W1 unlimited copies: fix = cap per character (e.g. 18) or keep + watch gold runes · + blocks reroll-to-Lv3 · − pool tracking, bots too. Rec: keep for MVP1.
W2 no perm caps: fix = caps per stat (SAP-style) only for ghosts · + MVP2 fair · − kills "infinite scaling" fun. Rec: decide at MVP2.
W3 rune copies multiply: fix = diminishing returns (2nd copy 50%) or max copies 2 · + less legend stacking · − rune choices feel weaker. Rec: watch.
W4 draw = player win: fix at MVP2 (draw = nobody loses heart). No change now.
W5 late shop 30% legend: fix = keep commons 10–15% late · + commons stay useful · − slower to legends. Rec: user tunes table in Balance Room if wanted.
W6 long fights: fix = measure real fight length first; if > ~40 s on phone → overtime start 180 → 60–90 s or faster playback · + less waiting · − overtime decides more fights.
Tribe sizes uneven: fix = give Fire/Storm extra tribe on 2–3 existing characters · + 6 tier reachable · − changes balance, re-measure.

## DECISIONS (user 7 Nov, set 127 — BUILT 7 Nov in the set-127 build chat: R2 core/shop.js merge() · R1 core/botteams.js pickFoe + stage setting foeFloor 100% (ค่าเสนอ))
- **R1 = C:** keep power matching, add a floor. Spec (draft): core/botteams.js pickFoe line `target = pp × foeBase%` → `target = max(pp × foeBase%, floor)`, floor = median `pw` of bot teams in the match round's cell `data.rounds[k]` × new stage setting `foeFloor` (ค่าเสนอ 100% = median · 0 = off; Balance Room แท็บด่าน). Candidate window ±3 rounds unchanged. Tests: floor applied when board weak; unchanged when board ≥ floor. Docs: shop-merge-rules S-12 line set 119 + version bump.
- **R2 = A:** sell after merge loses 1 copy per merge (3-gold unit: Lv1 3 · Lv2 6 · Lv3 15; formula Lv2 = paid − 1 copy price, Lv3 = 3 × Lv2 value − 1 copy price; floor 0 for paid-0 copies). Code: core/shop.js sell() (refund ≠ u.paid) + core/bot.js uses same sell. Then: regen bot teams (botgen, new hash) + re-run G3 (lab/runerun.mjs 600). Docs: S-2 line "ขาย = คืนเต็ม…" + sell-merge file. Show refund on the sell button/card.
- **R3 = A:** keep second chance as is (no change).
- W1–W6 + tribe sizes: keep / watch (no change in MVP1).
- Order next chat: R2 + R1 code → unit tests → botgen regen → G3 measure → gate → merge → publish game + balance room.
