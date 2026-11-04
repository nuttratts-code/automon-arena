# Boss #1 fit for all-Lv2 teams (set 81, 4 Nov 2026)

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
