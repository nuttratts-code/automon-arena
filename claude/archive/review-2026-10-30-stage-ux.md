# Review 30 Oct — Rune / Boss tab UX (set 56 proposal, waiting for user)

User request: make the Balance Room easier, keep what is already fine, focus on the "รูน / บอส" tab ("มั่วมาก").
Screens checked: built balance.html, desktop 1280 + mobile 390. Other tabs: no change proposed.

## Keep as is
Page colours/fonts, top step bar, main tabs, rune search, rarity sections, ✎ edit-in-place, ideas box.

## Problems found
Rune tab
- 5 rows of controls before the first rune (glossary fold, demo fold, dirty line, long odds paragraph, search+group, 12 theme chips, 2 add buttons).
- Skill glossary fold shows on this tab but is about character skills.
- Each rune row has 8 pieces (name, id, theme pill, 👥, stack, text, unlabeled checkbox, ✎ button) — checkbox meaning not shown.
- Rarity odds = one long grey sentence.
Boss tab (worst)
- Inputs stretched with labels above → ragged rows, very long page (desktop 2660px, mobile 4550px).
- The useful info (boss strength vs player) is grey text at the bottom + a long hint at the top.
- All bosses always open; tribe shown twice (dot + select).
- Cooldown in milliseconds.

## Options — boss tab
- **A (recommended): foldable boss card.** Closed = 1 line (name, tribe/spot, HP bar in N segments, HP, damage/sec, on). Open = small right-aligned inputs in 4 groups (ตัวบอส · การโจมตี · กฎพิเศษ · ความแรงตามด่าน) + a "เทียบทีมกลาง" strip: time for the median team to kill the boss vs time for the boss to kill the team, at stage 5 and 10 (rough, ignores armor/rules), red/green tag. Cooldown shown in seconds (saved as ms as now). One open at a time.
- B: boss table — bosses as columns, stats as rows. Best for comparing bosses; bad on mobile, rules don't fit well.
- C: keep current layout, only tidy (compact inputs in a grid, move hint into a fold). Cheapest, page still long.

## Options — rune tab
- **A (recommended): one toolbar row** [search] [หมวด ▾ dropdown instead of 12 chips] [จัดกลุ่ม หายาก|หมวด] [+ เพิ่มรูน ▾]; rarity odds moved into each rarity header ("ได้บ่อย 60% · บอส 0%"); hide skill glossary on this tab; row = name + effect on line 1, small grey meta (id · หมวด · 👥/👤 · ซ้อน 3) on line 2; checkbox becomes a labeled "ใช้" switch; tap the row to open edit.
- B: only items 1–2 of A (toolbar + odds), rows unchanged.

## Cost
A+A ≈ one task set (22-stage-form.js + css + ui_smoke selectors), no rule or number changes. Publish via the old Balance Room chat after merge.
