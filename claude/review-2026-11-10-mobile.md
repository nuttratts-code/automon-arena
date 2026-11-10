# Step 6 mobile check — game page (10 Nov 2026, set 175) · audit only, no code changed
Built from main (after set 174). Sizes 1366×768 · 844×390 · 740×330 · 667×375 · 390×844 (ui.md "Phone audit"). Screens: name · prep r1 · prep late (r14, Lv2–3, legends, bench 3, locked shop card) · menu/rune/tribe/diff/shop-level popups · shop unit card · battle · result · match details · run end. Script: ui-work 4b snippet (scratch, not committed).
Pass everywhere: no page scroll · no JS errors · run end OK. Not reached: rune offer (none at r1 in this flow) · resume after reload.

## Findings (grouped for the user's pick)
- **A Battle in portrait 390×844:** lane headers wrap to 2–3 lines ("หลัง · คู่แข่ง (บอส)") · top-right "คู่แข่ง: ที…" cut · unit cells tall with small sprites and lots of empty space · names cut + name/HP text 9.3–9.9 px (< 10 px).
- **B Small tap targets (< 24 px):** auto-skip checkbox `#autoSkip` 16–20 px (all sizes) · `#shopLv` 76×22 (landscape phones) · unit card glossary rows `.term` 19–22 px tall · match-details filter rows 22 px + checkboxes `#logProc` `#logNoSet` 13 px.
- **C Small / cut text:** enemy rune line in battle 9.6 px (phones) · burn/shock chips 9.6 px · battle log line clipped ("7.0 วิ ทีมคุ…") · late-game bench + shop names cut ("นักจุด…", "มังกรวายุคลั…") at 390 and 1366.
- **D Layout:** portrait prep top = 3 rows (hearts/gold · tribe/bag/foe · ?/⋯ alone on row 3) · tribe popup on 740×330 / 667×375: close button only after scrolling the list.
