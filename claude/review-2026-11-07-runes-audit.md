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
