# Review 8 Nov 2026 (set 144): rune system test + rune stats in real runs
Nothing in game values was changed. All tuning below waits for the user (HARD RULE 6: fresh AMCFG1 → cfgdiff first).

## Part 1 — rune check vs description (lab/runecheck.js · test "set 144" · Balance Room ดูผล → รันจริง → tab รูน → "ตรวจรูนทั้งหมด")
53 active runes · each played in a fixed test fight (6 plain units one per tribe vs dummy / burning / hitting enemy) or the real shop code, with 1 copy and max copies.
Checks: in-scope units move by the description's number, out-of-scope units do not move, copies stack as written.
Result: **49 match · 0 wrong · 4 "match but rounding erases it at real character scale"** (median Lv1 character: atk 4 · hp 100 · cd 7000):
- S7 ดาบไม้คู่ (แถวหลัง พลังโจมตี +10%) · S8 ดาบไม้ (ตัวเดียว พลังโจมตี +15%): floor(4 × 1.10/1.15) = 4 → +0 at Lv1; also +0 at Lv2 (atk 8 → 8.8 → 8 for S7)
- T5 กองดาบเหล็ก (แถวหลัง ดาเมจตี +15%): damage per hit 4 → 4
- T11 ห้ามแพ้ (+3%/win): +9% at 3 wins = +0; needs ~7+ wins in a row to add 1 damage
Real-run numbers agree (uplift ≈ 0.4–1.7 pts).
Mutation check: breaking copy stacking / taunt in core/runes.js makes the test fail (done once, reverted).
Limits: run-only runes are checked with the game's values (an edited-but-not-imported Balance Room value is not used by the shop code) · scout = only "page shows it" flag.

## Part 2 — runes in real runs (runerun 3000, set 142b values · full output archive/runerun-2026-11-08-set144-runes.txt)
Method: every main-run match where the player bot holds a battle rune is fought again with that rune removed (same team, same enemy).
uplift = win % with − without · decided = % of matches the rune changed the result · game = points of the overall win % that rune moves.
Median uplift: common 3.1 · rare 1.7 · legend 4.5. Flags (ค่าเสนอ): strong/weak = > max(3, 2·SE) from its rarity median · big = game ≥ 1.
| rune | rarity | held % runs | uplift ±SE | decided | game | flag |
|---|---|---|---|---|---|---|
| S5 ระดมยิง (ทั้งทีม มัลติฮิต +1) | legend | 22.0 | +38.4 ±0.8 | 38.6% | +4.6 | strong big |
| C7 ข่ายแสง (ทุก 10 วิ ฟื้น 20%) | rare | 7.7 | +14.9 ±0.9 | 15.0% | +0.8 | strong |
| C1 พายุ (วายุ มัลติฮิต +2) | legend | 24.7 | +14.2 ±0.6 | 14.8% | +1.8 | strong big |
| U6 ปีก (ตัวเดียว มัลติฮิต +1) | rare | 7.8 | +11.2 ±0.8 | 11.7% | +0.6 | strong |
| F6 นรก (อสูร พลังโจมตี +15) | legend | 23.2 | +10.0 ±0.5 | 10.3% | +1.1 | strong big |
| X7 ตามมา (คู่หูตีตาม 100%) | legend | 25.4 | +9.6 ±0.5 | 10.7% | +1.1 | strong big |
| U2 หวนคืน | legend | 24.0 | +7.8 ±0.5 | 8.0% | +0.8 | strong |
| U3 · X5 | rare | ~8 | +5.6 · +4.7 | | | strong (small) |
| T10 · F1 · F3 | legend | ~25 | +0.7 each | <1% | | weak |
| T12 เลือดเข้าตา | legend | 25.2 | −0.2 ±0.5 | 8.3% | 0 | weak (wins and loses as often) |
| X6 สายสัมพันธ์ | rare | 8.2 | −2.2 ±0.7 | 7.6% | −0.1 | weak (hurts) |
| U4 ยั่วยุ (โล่ 10% + ล่อเป้า) | rare | 7.6 | −5.3 ±1.0 | 14.0% | −0.2 | weak (hurts: pulls hits onto a back-row unit) |
Pattern: multi-hit runes (S5, C1, U6) dominate — multi-hit multiplies atk AND per-hit burn/shock/armor/heal. Flat atk (F6 +15 on atk ~4–16) is huge vs % atk runes that round to 0.
Run-only runes: bot almost never takes T1 / T4 / X8 (it prefers battle runes) → no data; X2/X3/X9 runs end with ~1.5 more wins but biased (long runs see more offers).
Caveat: the player bot places 'one' runes on its strongest unit and taunt/link the same way; a human may place U4/X6 better.

## Options for the user (next chat, after AMCFG1 + cfgdiff)
- A1 (rec): tune the outliers only: S5 (e.g. legend → keep multi +1 but scope แถวหลัง / or remove from offers), C1, C7, U6 down · S7/S8/T5 change to flat values (e.g. +1/+2 atk) or bigger % so they survive rounding · U4/X6 redesign · then runerun 3000 to re-check.
- A2: change the rounding rule (keep fractions of atk inside the fight) — core rule, affects every % effect and character skill → big re-measure.
- A3: leave as is (variety), only fix the 4 rounding runes.
