# Rune themes (set 54 · 30 Oct 2026 · second account)

User asked: group runes more finely, e.g. armor runes, money runes. Small UI change → decided + informed (no rule/number change).

## What was built (Balance Room v120, branch claude/stage-mode)
- New finer grouping "หมวดย่อย" on top of the existing RUNE_CATS (ค่าพลัง/สกิล/เพิ่มเผ่า/เวทสนาม/พิเศษ/เงิน/ร้าน stay as they are).
- Themes: โจมตี/ดาเมจ · เกราะ/ป้องกัน · HP/ฟื้นฟู · ความเร็ว · ไฟ · ช็อต · กดศัตรู · รอดตาย · เงิน/ร้าน · เผ่า · อื่นๆ
- Rune tab: theme filter chips (with counts) + "จัดกลุ่มตาม: ความหายาก | หมวดย่อย" switch; each rune shows a theme pill; search matches theme names.
- Code: `src/lab/balance/js/22-stage-form.js` (RUNE_THEMES, RUNE_THEME_EFF, RUNE_THEME_FIXED, RUNE_THEME_FIELD, runeThemeOf) · CSS `.rune-chips`, `.pill.rune-theme` in `css/40-results.css`.
- Mapping rules: builder/custom stat runes follow their current effect (x.eff); custom skill runes follow x.do via RUNE_EFFECTS; fixed runes via RUNE_THEME_FIXED; field runes by tribe; eco → เงิน/ร้าน.
- Current counts (51 runes): ดาเมจ 12 · เกราะ 4 · HP 5 · ความเร็ว 3 · ไฟ 3 · ช็อต 2 · กดศัตรู 2 · รอดตาย 3 · เงิน 8 · เผ่า 7 · อื่นๆ 2.

## Open (user may want to change)
- Which theme a rune belongs to is Claude's choice (e.g. ดูดเลือด → HP/ฟื้นฟู, ติดไฟตอนเริ่ม (enemy) → ไฟ, คงทน/ส่องทีม → อื่นๆ). User can ask to move any rune.
- Theme is UI-only: not saved in config, no effect on combat or AMCFG1.
- Known minor: chip counts refresh only on the next filter click after changing a rune's effect in its editor.
- Tests 229/229; ui_smoke not re-run (was already failing on this branch before this set).
