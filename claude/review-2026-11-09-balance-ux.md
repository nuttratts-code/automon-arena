# Balance Room UX/UI review — set 161 (9 Nov 2026)

Scope: every screen/tab of the Balance Room (pick grid · list · list edit · edit chars · tribes · sim · rules · match · runes/bosses · combo · results VS Bot / VS boss / real runs with all sub-tabs), desktop 1100 px + phone 390 px, light + dark.
Method: screenshots + the ui-work audit snippet (tap targets, text < 10–11 px, text clipped by overflow, off-screen) + checks against common practice (WCAG 2.5.8 target size, WAI-ARIA tabs keyboard pattern, Nielsen heuristics: consistency, recognition over recall, minimalist design, proximity of controls to what they control).

## Fixed in set 161 (no game value changed)
| # | Screen | Problem (principle) | Fix |
|---|---|---|---|
| 1 | Header | Sub-line repeated the 1-2-3 stepper right below it (redundant text) | Sub-line now says only what the stepper doesn't: same calculator as the game · 💾 sends edits to Claude |
| 2 | ลองสู้ | Play controls were above the bench + search panel, far from the board they drive (proximity); "ฝั่งขวา ทีม/บอส" sat below the board although it sets up the right team | Order now: search → right side (team/boss) → play controls → bench → tribe counts → board → team tools → runes → levels → saved teams |
| 3 | ลองสู้ phone | Board needed 360 px + padding → right team's back column cut off, sideways scroll | Board fits 390 px (smaller gaps, no min-width on phones) |
| 4 | ลองสู้ phone | Speed buttons wrapped onto a 3rd row | Label "ความเร็ว" hidden on phones, compact speed buttons → 2 rows |
| 5 | ลองสู้ | Names 10.5 px, HP 9.9 px on the board | 11.8 px / 11.2 px (desktop) |
| 6 | All | Checkboxes 13×13 px (WCAG 2.5.8 ≥ 24) | 18 px box + whole label is a ≥ 32 px target |
| 7 | รูน/บอส | On/off switches 34×20 px | 40×24 px, label row 32 px |
| 8 | กฎเกม | Skill ideas box ("สำหรับ HL-1 …") and skill library shown on the game-rules tab (irrelevant content) | Hidden on rules (and library hidden on runes, which has its own idea box) |
| 9 | ดูแมตช์ / กฎเกม | Skill glossary shown above an empty match tab | Glossary only on chars / tribes / sim |
| 10 | Phone | "⇆ ทำไปลองไป" off-screen in the tab bar; on phones it only stacks two long panes | Hidden ≤ 700 px and combo not applied there |
| 11 | ดูผล | 3–5 column tables stretched to 1000 px (numbers 300 px from their labels) | Tables as wide as their content (min 420 px); big tables unchanged |
| 12 | ดูผล phone | 9 sub-tabs of รันจริง wrapped onto 2 rows (selected underline in the middle) | One scrolling row; chosen tab scrolled into view |
| 13 | All tab bars | No keyboard arrows (WAI-ARIA tabs) | ← → Home End move between tabs |
| 14 | Pick grid / board | Thai marks clipped by overflow:hidden + line-height 1.2 | line-height 1.45–1.5 |
| 15 | ผลต่อสู้ etc. | Search boxes looked like bare browser inputs (26 px next to 42 px selects) | One base style for search/text boxes |
| 16 | List view phone | Wide table scrolled sideways and the name column went with it | Name column frozen on phones |
| 17 | Char form phone | "9 / 16" points wrapped onto 2 lines | No wrap |
| 18 | กฎเกม odds table | Row total "100" sat above the input line | Aligned with the numbers |

## Seen, left as is (works, or a bigger change than a polish set)
- Two navigation levels (steps 1-2-3 + edit sub-tabs) — set 29/30 decision; the sub-tabs only show in step 2 (B5), consistent.
- Result ranking tables keep their own vertical scroll box with frozen header (set 125 decision).
- Long help paragraph under "รันจริง (บอท)" setup — could fold into "อ่านเพิ่ม" like static hints (needs a rewrite of the text; ask before).
- Character form shows the character twice (picker + summary strip) — the strip is the drag handle in ทำไปลองไป mode.
