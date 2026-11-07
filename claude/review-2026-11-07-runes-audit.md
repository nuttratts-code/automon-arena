# Rune audit (7 Nov 2026, after set 125) — no code changed
Method: every active rune in STAGE_USER equipped on 12–20 random Lv2 teams (scratch script), fight compared with/without the rune; suspicious ones checked in code (core/runes.js, core/runrunes.js, core/battle.js, core/shop.js).
All battle runes change fights; run-only runes are read by shop.js / game page. Problems found:

## Real problems (rune does less than its card says)
1. **T8 ธงเผ่า (flag)** — tribe is always the rune record's `tribe` (config: เหล็กกล้า). The player never picks a tribe, but the card text says "เผ่าเลือกตอนได้รูน" and does not name the tribe. battle.js only counts it for a tribe the team already has → useless for non-steel teams.
2. **T11 ห้ามแพ้ (growth)** — max 2 copies, but runes.js:122 passes winStreak instead of copies → holding 2 = holding 1 (verified: hitAmp 15 both at streak 5).
3. **D1–D6 เลือด… (addTribe)** — max 2 copies, but a 'one' rune id is worn by one unit only; the 2nd copy adds the same tribe again = nothing (verified).

## Works, but almost never matters (design, not a bug)
4. **T10 สองคนเพื่อนตาย (lastStand, legend)** — only while the wearer is the last unit alive. 20 test fights (wearer back row): alone once, for 1.5 s; front row: never. Win rate unchanged 12→12.

## Small text/code mismatch
5. **T2 ดอกเบี้ย** — 2 copies double gold AND cap (cap 20 → 40) while the card says "สูงสุด 20".

## Fix options (user picks)
- T8: A) pick tribe from the player's board when taking the rune (recommended) · B) flag counts the team's most common tribe automatically · C) one flag rune per tribe (6 runes).
- T11: A) copies multiply step + cap (recommended) · B) max = 1.
- D1–D6: A) max = 1 (recommended) · B) each copy may go on a different unit (bigger change: needs per-copy wearing).
- T10: A) keep · B) also count "2 left" · C) stronger numbers (user tunes).
- T2: A) card text shows cap × copies (recommended) · B) cap not multiplied.

# Part 2 — run-only runes: effect works in core, but the game page is not designed for it (user asked: ทำนาย, แผงใหญ่)
Checked game/run.template.html + built game.html (Playwright, 1366×768 and 844×390, bag T3×2 + X9).
6. **T3 แผงใหญ่ (shopSlots)** — .shop grid is fixed `repeat(5, …)` → slots 6–8 wrap to a 2nd row. Phone 844×390: page grows to 443px tall (scrolls, 2nd row cut off). Desktop: 2nd row squeezes the board. ui_smoke never tests >5 slots.
7. **X9 ทำนาย (scout)** — only one text line inside the "ศัตรูรอบนี้" popup (e.g. "หน้าบน PT-2 … Lv1 · …"), not shown on the board; enemy runes only as a count ("มีรูน N แบบ"). The enemy is picked from the player's CURRENT board power (nextFoe at render and again at fight start) → after scouting, changing the board can change the enemy, so the preview is not a promise. Not designed: when the enemy is locked, how it is shown.
8. **T4 มองหา (freeRoll)** — reroll button always shows "· 1" and is disabled when gold < 1 (run.template ~1074–1075) even with free rerolls left → with 0 gold the free reroll cannot be used. (shop.js reroll itself handles free first.)
9. **X3 รวมร่างเร็ว (fastMerge)** — shop.js merges at 2, but page hints use S.mergeCount (3): shop "ready" glow (~1093), shopMergeTargets / mergeTargets (~1040–1047) → no glow / drop targets when the rune makes 2 enough.
10. **X2 ดึงดูดตัว, U7 คงทน, U8 เงา** — work, but nothing on the page shows the effect (no "×3" on shop odds, no perm +% note). Low priority.
OK as is: T1 ทอง, T2 ดอกเบี้ย (message at round start), X8 แลกหัวใจ (own button).

## Fix options part 2
- T3: A) cards shrink to fit up to 8 in one row (recommended) · B) keep 2 rows, shrink the board on phone.
- X9: A) lock the enemy when the shop round starts + show the enemy team as mini board in the popup with rune names (recommended) · B) keep text, lock enemy only.
- T4, X3: bug fixes (no design choice).
