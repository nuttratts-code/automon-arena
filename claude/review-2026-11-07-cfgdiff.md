# Round-1 check: Balance Room AMCFG1 rev 21 (saved 7 Nov 13:20Z) vs game main (set 130) · tools/cfgdiff.mjs

Characters, tribe bonuses, game rules, mode settings: MATCH (the 10 chars were imported in set 129). Runes F4 F5 S3 S9: already deleted in the game (match). Differences below.
Context: game bosses = set-129 bossrun output (Balance Room values × ~0.81–0.88, endlessPct from older k3 tuning); with the Balance Room bosses, bossrun measured k1 ≈ 50% win (target 75).

**User picks (DECIDED set 131: Q1 ยึดเกม · Q2 delete T2 · Q3 delete C2 — applied):** Q1 bosses B1–B6: Balance Room / game · Q2 rune T2 ดอกเบี้ย deleted: Balance Room (delete) / game (keep) · Q3 custom rune C2 เกราะเหล็กคู่ missing from Balance Room: delete from game / keep (user re-adds on page).

DIFFERS — 38 cell(s)

### รูน (1)

| ID | ชื่อ | ช่อง | Balance Room (AMCFG1) | เกมตอนนี้ |
|---|---|---|---|---|
| T2 | ดอกเบี้ย | del (ลบ) | true | false |

### รูนที่สร้างเอง (1)

| ID | ชื่อ | ช่อง | Balance Room (AMCFG1) | เกมตอนนี้ |
|---|---|---|---|---|
| C2 | เกราะเหล็กคู่ | (ทั้งตัว) | – | มี |

### บอส (36)

| ID | ชื่อ | ช่อง | Balance Room (AMCFG1) | เกมตอนนี้ |
|---|---|---|---|---|
| B1 | โกเลม | hp (HP) | 980 | 690 |
| B1 | โกเลม | atk (พลังโจมตี) | 41 | 28 |
| B1 | โกเลม | mult10 | 2.63 | 2.37 |
| B1 | โกเลม | endlessPct | 34 | 76 |
| B1 | โกเลม | phase2.stats.atk | 54 | 37 |
| B1 | โกเลม | phase3.stats.atk | 76 | 54 |
| B2 | จอมเวทย์ดำ | hp (HP) | 660 | 480 |
| B2 | จอมเวทย์ดำ | atk (พลังโจมตี) | 52 | 36 |
| B2 | จอมเวทย์ดำ | mult10 | 2.92 | 2.74 |
| B2 | จอมเวทย์ดำ | endlessPct | 35 | 87 |
| B2 | จอมเวทย์ดำ | phase2.stats.atk | 66 | 48 |
| B2 | จอมเวทย์ดำ | phase3.stats.atk | 94 | 68 |
| B3 | อสุรกายคลั่ง | hp (HP) | 470 | 330 |
| B3 | อสุรกายคลั่ง | atk (พลังโจมตี) | 66 | 47 |
| B3 | อสุรกายคลั่ง | mult10 | 2.1 | 2.12 |
| B3 | อสุรกายคลั่ง | endlessPct | 32 | 78 |
| B3 | อสุรกายคลั่ง | phase2.stats.atk | 87 | 59 |
| B3 | อสุรกายคลั่ง | phase3.stats.atk | 122 | 84 |
| B4 | กระจกสะท้อน | hp (HP) | 630 | 470 |
| B4 | กระจกสะท้อน | atk (พลังโจมตี) | 56 | 41 |
| B4 | กระจกสะท้อน | mult10 | 2.52 | 2.58 |
| B4 | กระจกสะท้อน | endlessPct | 22 | 68 |
| B4 | กระจกสะท้อน | phase2.stats.atk | 84 | 63 |
| B4 | กระจกสะท้อน | phase3.stats.atk | 125 | 92 |
| B5 | จ้าวพายุ | hp (HP) | 500 | 370 |
| B5 | จ้าวพายุ | atk (พลังโจมตี) | 31 | 24 |
| B5 | จ้าวพายุ | mult10 | 2.43 | 2.55 |
| B5 | จ้าวพายุ | endlessPct | 27 | 70 |
| B5 | จ้าวพายุ | phase2.stats.atk | 41 | 31 |
| B5 | จ้าวพายุ | phase3.stats.atk | 54 | 39 |
| B6 | ปีศาจเพลิง | hp (HP) | 570 | 390 |
| B6 | ปีศาจเพลิง | atk (พลังโจมตี) | 52 | 36 |
| B6 | ปีศาจเพลิง | mult10 | 2.81 | 2.85 |
| B6 | ปีศาจเพลิง | endlessPct | 39 | 63 |
| B6 | ปีศาจเพลิง | phase2.stats.atk | 77 | 52 |
| B6 | ปีศาจเพลิง | phase3.stats.atk | 113 | 77 |
