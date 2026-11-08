# Boss #1 fit for all-Lv2 teams (set 81, 4 Nov 2026)

## UPDATE 4 — option A: boss growth after #1 (identity bosses, v286 chars, n 200 per boss, avg win % (min–max boss))
Assumed team at boss #k (Claude's model, not measured from play): #1 all Lv2 no runes · #2 Lv2 + 50% Lv3 + 2 random runes · #3 75% Lv3 + 3 runes · #4 all Lv3 + 4 runes · #5+ all Lv3 + 5 runes. Perm stats not modelled.
| mult10 / endlessPct | #1 st5 | #2 st10 | #3 st15 | #4 st20 | #5 st25 | #6 st30 | #8 st40 | #10 st50 |
|---|---|---|---|---|---|---|---|---|
| today 2 / 15 | 54 | 30 | 34 | 35 | 25 | 14 | 3 | 1 |
| A1 1.55 / 18 (recommended) | 54 | 56 | 59 | 58 | 42 | 24 | 6 | 1 |
| A2 1.55 / 12 | 54 | 56 | 65 | 72 | 60 | 45 | 27 | 10 |
Player power stops at Lv3 + runes, so any growth makes late bosses a wall; A1 = 50–60% through #4 then steep, A2 = easier mid, gentler end. Lv3 + 8 runes at ×3.8 (A2 #10) = 15%. B1 endlessPct was 30 in code / 15 in v286 → set all to the chosen value.

## UPDATE 3 — identity bosses (UPDATE 2 values) across levels / boss # / runes (v286 chars, n 300 per boss, avg B1–B6 win %)
boss # k → stage 5k; mult: k1 ×1 · k2 ×2 · k3 ×2.3 · k4 ×2.6 · k6 ×3.5 · k8 ×4.6 · k10 (stage 50) ×6.1 · k11+ endless.
| team | k1 | k2 | k3 | k4 | k6 | k8 | k10 | k11 | k13 |
|---|---|---|---|---|---|---|---|---|---|
| all Lv1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| all Lv2 | 54 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| Lv2 + 25% Lv3 | 75 | 11 | 7 | 3 | 0 | 0 | 0 | 0 | 0 |
| Lv2 + 50% Lv3 | 89 | 24 | 15 | 9 | 2 | 0 | 0 | 0 | 0 |
| Lv2 + 75% Lv3 | 96 | 41 | 26 | 16 | 4 | 0 | 0 | 0 | 0 |
| all Lv3 | 98 | 56 | 42 | 28 | 7 | 1 | 0 | 0 | 0 |
| Lv2 + 2 random runes | 56 | 4 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| Lv2 + 5 random runes | 68 | 6 | 3 | 1 | 0 | 0 | 0 | 0 | 0 |
| Lv3 + 5 random runes | 100 | 68 | 55 | 38 | 13 | 3 | 1 | 0 | 0 |
Bosses are even (B1–B6 within ~±5 at each cell). Lv3 is max level → from boss #4 on nothing in the game today beats them (perm stats not modelled).
Economy sim (bot plays, hearts/wins unlimited, goldPerRound 10/15/20/25): stage 5 avg Lv 1.36/1.68/1.89/1.92, full-Lv2 teams 0/8/58/78% → full Lv2 at stage 5 needs ~20–25 gold/round. But the bot never builds Lv3 (≤ 9% units Lv3 even at stage 40) → bot cannot answer when Lv3 comes. Estimate by hand: Lv3 = 9 copies (3× Lv2); at ~20 gold/round ≈ 10 more rounds → full Lv3 ~stage 15–20 at best (legend units much later).
Next decision for user: lower boss growth after #1 (mult10 2 → ~1.2–1.3 and smaller endlessPct) so Lv3 teams meet ~50% at the stage they reach; and bot Lv3 logic if real-run measures are wanted.

## UPDATE 2 — boss identity by tribe (user ask: golem should be tanky, อสุรกายคลั่ง hits hardest, จ้าวพายุ atk not tiny)
Rule: HP = 1000 × tribe HP mult × s, atk = 100 × tribe atk mult × s (T-3.1 mults: เหล็กกล้า 1.4/0.6 · ภูติ 0.9/0.7 · อสูร 1.0/1.4 · สายฟ้า 0.9/0.8 · วายุ 0.8/0.5 · เพลิงเผา 0.9/0.8); s fitted per boss for ~55% (Lv2 random teams, k1, v286 chars). Phase atk keeps today's ratio to base (B5 vs its old base 55). cd/multi/rules unchanged. Script src/lab/bossidfit.mjs. All ค่าเสนอ.
| boss | s | HP | atk | phase atk p2/p3 | win % | worst tribe | best |
|---|---|---|---|---|---|---|---|
| B1 โกเลม (ถึก) | 0.95 | 1350 | 57 | 74 / 103 | 55 | เหล็กกล้า 48 | สายฟ้า 71 |
| B2 จอมเวทย์ดำ | 1.0 | 900 | 70 | 91 / 126 | 58 | ภูติ 52 | เพลิงเผา 80 |
| B3 อสุรกายคลั่ง (ตีแรง) | 0.62 | 600 | 87 | 113 / 157 | 55 | อสูร 45 | เหล็กกล้า 60 |
| B4 กระจกสะท้อน | 0.95 | 850 | 76 | 114 / 167 | 52 | สายฟ้า 39 | เหล็กกล้า 70 |
| B5 จ้าวพายุ (×2 ฮิต) | 0.75 | 600 | 38 | 50 / 68 | 51 | สายฟ้า 41 | เหล็กกล้า 64 |
| B6 ปีศาจเพลิง | 0.95 | 850 | 76 | 114 / 167 | 53 | เพลิงเผา 40 | วายุ 62 |
Average ~54%. Note B3 is steep: s 0.58 → 60%, 0.66 → 43%.

## UPDATE — re-measured on the user's save config/main v286 (19:33 Thai, chars HL-6 HL-7 HL-8 PT-6 WN-6 WY-4 WY-5 WY-6 WY-8 edited, B5 atk 20, B1 endlessPct 15). Supersedes the tables below.
Today (×1): average 34% (B1 50 · B2 38 · B3 33 · B4 27 · B5 25 · B6 32) — matches the user's "30-something".
Option A v2 (recommended, ค่าเสนอ, rules unchanged) → average ~55%:
| boss | × | HP | atk | phase atk p2/p3 | win % | worst tribe | best tribe |
|---|---|---|---|---|---|---|---|
| B1 | 0.95 | 950 | 76 | 99 / 137 | 57 | เหล็กกล้า 45 | สายฟ้า 75 |
| B2 | 0.85 | 850 | 77 | 99 / 138 | 55 | ภูติ 45 | เพลิงเผา 73 |
| B3 | 0.85 | 850 | 68 | 88 / 122 | 56 | อสูร 47 | เหล็กกล้า 68 |
| B4 | 0.8 | 800 | 76 | 114 / 167 | 54 | สายฟ้า 37 | เหล็กกล้า 68 |
| B5 | 0.7 | 700 | 14 | 50 / 69 | 55 | สายฟ้า 39 | เหล็กกล้า 70 |
| B6 | 0.8 | 800 | 76 | 114 / 167 | 54 | เพลิงเผา 42 | วายุ 62 |

## Old measure (code values, before v286)
User ask: economy will be raised so a player reaches stage 5 with a full Lv2 team; boss #1 win is only ~30s%. Target: average 50–60%, countered tribe ("แพ้ทาง") 30–40%.
Measured on code bosses (core/stage-user.js = config/main v282), random 6-unit Lv2 teams, k 1, no runes, n 600 per boss. Script: `node lab/bossfit.mjs [n] [m list] [boss ids]` (HP + base atk + phase atk × m; HP rounded to 50). Tribe % = teams where that tribe is active (mixed teams, so the spread looks narrower than for a mono-tribe team).

## Today (×1): average 40%
B1 56 · B2 47 · B3 39 · B4 37 · B5 21 · B6 40

## Option A (recommended, ค่าเสนอ): scale HP + atk per boss, rules unchanged → average ~55%
| boss | × | HP | atk | phase atk (p2 / p3) | win % | worst tribe | best tribe |
|---|---|---|---|---|---|---|---|
| B1 โกเลม | 1.0 | 1000 | 80 | 104 / 144 | 57 | เหล็กกล้า 47 | สายฟ้า 75 |
| B2 จอมเวทย์ดำ | 0.95 | 950 | 86 | 111 / 154 | 54 | ภูติ 44 | เพลิงเผา 73 |
| B3 อสุรกายคลั่ง | 0.9 | 900 | 72 | 94 / 130 | 57 | อสูร 46 | เหล็กกล้า 71 |
| B4 กระจกสะท้อน | 0.85 | 850 | 81 | 122 / 178 | 55 | สายฟ้า 40 | เหล็กกล้า 72 |
| B5 จ้าวพายุ | 0.7 | 700 | 39 | 50 / 69 | 54 | สายฟ้า 38 | เหล็กกล้า 69 |
| B6 ปีศาจเพลิง | 0.85 | 850 | 81 | 122 / 178 | 56 | เพลิงเผา 41 | วายุ 63 |

## Option B: A + tribeResist 30 → 50 (B1–B3) / 40 (B4–B6) — countered tribe only −3 to −4 pts
B1 56 (เหล็กกล้า 43) · B2 53 (ภูติ 40) · B3 55 (อสูร 43) · B4 54 (สายฟ้า 38) · B5 53 (สายฟ้า 38) · B6 55 (เพลิงเผา 38). Small gain; not recommended.

Notes: boss #2 stays ×mult10 (2) of the new base → still a wall for Lv2 (re-check once economy is set). Real run teams at stage 5 today are avg Lv1.36 → these numbers hold only after the economy change.
