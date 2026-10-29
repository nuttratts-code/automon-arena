# Rune system v2 — user request 29 Oct 2026 (set 53) · ANSWERED 29 Oct, Balance Room part built (Q13 A)
Source: user message 29 Oct (Thai). Builds on claude/review-2026-10-28-runes.md (T1–T12, U1–U8) and core/stage.js. Every number = ค่าเสนอ until the user confirms.

## User answers (29 Oct)
Q1 A rune = attached skill/effect · Q2 A badge from scope · Q3 scope list OK · **Q4 B DNA = real tribe** (bonus + tribe-targeted skills) · Q5 A field runes boost whole team · **Q6 B player picks the partner** (สายสัมพันธ์/คู่หู) · Q7 A cheat death on one unit · Q8 OK · Q9 OK · Q10 OK (direct hit only) · **Q11: without the rune the player sees NOTHING of the enemy; with it: positions + full details** · **Q12: 3 rarity tiers** (ธรรมดา/หายาก/ตำนาน; 5-tier list mapped: ธรรมดา+ไม่ธรรมดา → ธรรมดา, หายาก → หายาก, หายากมาก+ตำนาน → ตำนาน; weights 60/30/10 ค่าเสนอ, boss skips ธรรมดา) · Q13 A Balance Room only, battle/shop code in phase 2a.

## Built (set 53, core/stage.js + Balance Room tab)
- 51 preset runes: eco T1–T4 X2 X3 X8 · builder stat runes T5–T7 U3 U5 U6 S1–S9 X1 X10 X11 (effect/scope/flat-% editable) · DNA D1–D6 · field F1–F6 · special T8–T12 X4–X7 X9 U2 U4 U7 U8 · U1 removed (→ D1–D6).
- User-made runes (max 40): stat (effect list RUNE_EFFECTS) or skill (any battle skill; copy from a character skill). Saved as `stage.custom`.
- Set-52 saved values of T5/T6/T7/U3/U5/U6 migrate to `v`.

## Already done this set
- Food system removed (user decision): combat-rules V2.7 (C-10), shop-merge-rules V1.13 (S-2, S-3, S-8), backlog. Food never existed in code.

## What the user asked (summary)
1. DNA rune → one rune per tribe (e.g. รูนเพลิง = add fire tribe to the chosen unit), all 6 tribes.
2. Runes can be made from existing skill effects; mark each rune "เฉพาะตัว" or "ส่วนรวม".
3. Stat runes for everything: damage, cooldown, armor, fire, shock, HP, multi-hit, … · choose scope (team / row / one unit) · value flat or %.
4. New runes: ดูดเลือด · ดึงดูดตัว (chosen owned character shows in shop more) · รวมร่างเร็ว (chosen owned character merges with fewer copies, 3 → 2) · เลี่ยงจุดตาย (cancel one lethal hit) · ป้อมปราการ (team HP up, attack down) · field rune per tribe (tribe's effect stronger, e.g. เหล็ก = armor gained +20%) · สายสัมพันธ์ (partner takes the hit) · คู่หู (partner attacks along) · แลกหัวใจ (−heart → gold) · ส่องทีม (see enemy team before the fight) · ถ่วงเวลา (enemy cooldown up) · กัดกร่อน (enemy max HP down).
5. Drop rate per rune; better runes rarer.
6. Balance Room rune tab easier to read; group by rarity.

## Questions (★ = Claude recommends)
- **Q1 Rune structure.** ★A rune = an attached skill: pick effect (any in-battle skill effect: atkUp/atkPct, hpUp/hpPct, armor/armorPct, cdCut/cdPct, burnHitUp/Pct, shockHitUp/Pct, multiUp, healHitUp, lifesteal, maxHpCut, cdSlowPct, …) + trigger (match start / passive / hit …) + target scope + value. Reuses the battle engine and the skill tests (cheapest, every existing skill effect becomes a rune). B separate rune-only stat modifiers (simpler editor, but every effect coded twice).
- **Q2 "เฉพาะตัว / ส่วนรวม".** ★A badge from scope: scope "1 ตัว" = เฉพาะตัว (player puts it on one unit) · row / lane / tribe / whole team / enemy team = ส่วนรวม. B means unique (max 1 copy) vs stackable — already exists as "copies per run".
- **Q3 Scope list.** ★ one unit · front / middle / back row · top / bottom lane · one tribe · whole team · enemy team (for ถ่วงเวลา, กัดกร่อน). OK?
- **Q4 DNA per tribe (6 runes, replaces U1; this is old Q5).** ★A added tribe counts for tribe bonus only. B counts as a real tribe (bonus + skills that target that tribe). Either way the rune ignores the T-1 "max 1 extra tribe" rule.
- **Q5 Field runes (6).** Proposal: เหล็กกล้า armor gained +20% · เพลิงเผา fire applied +20% · สายฟ้า shock applied +20% · วายุ hit damage +20% · ภูติ healing +20% · อสูร damage +20% after any ally goes down. ★A boosts the whole team (any unit gaining armor etc.) B only units of that tribe.
- **Q6 สายสัมพันธ์ / คู่หู partner.** ★A partner = neighbour in the same lane (automatic, no extra UI) B player picks the partner (extra drag UI). Rules either way: redirected damage never redirects again (no loop) · a follow-up attack never triggers another follow-up · คู่หู fires once per attack, not per hit (multi-hit units would chain too much) · partner down = rune off. Numbers: redirect 50% of the hit (ค่าเสนอ).
- **Q7 เลี่ยงจุดตาย.** ★A unit rune: first lethal hit on that unit each match is fully cancelled (damage, fire, shock of that hit), unit stays at its HP, no on-down skills fire. B team rune: first lethal hit on any ally each match.
- **Q8 แลกหัวใจ.** −1 heart → +10 gold (ค่าเสนอ), once per shop round, not allowed at 1 heart. ⚠ hearts are the stage-mode safety net; with รวมร่างเร็ว/ดอกเบี้ย this snowballs. OK?
- **Q9 ดึงดูดตัว / รวมร่างเร็ว.** ดึงดูดตัว: chosen character's shop chance ×3 (ค่าเสนอ). รวมร่างเร็ว: chosen character merges with 2 copies. ⚠ รวมร่างเร็ว = Lv3 from 4 copies instead of 9 — strongest rune in the game; ★ make it ตำนาน + max 1 copy per run.
- **Q10 ดูดเลือด.** ★ heals % of direct hit damage only (not fire/shock ticks), like WN-4 lifesteal. ⚠ if it counted shock, the SF-6 shock loop (handoff anomaly) would make units unkillable. Value 15% (ค่าเสนอ).
- **Q11 ส่องทีม.** ★A without the rune the player sees only enemy tribes + count; with it, the full team and positions. B everyone always sees the full team (drop the rune).
- **Q12 Rarity + drop weights.** Same 5 tiers as units. Weights ธรรมดา 45 / ไม่ธรรมดา 30 / หายาก 15 / หายากมาก 7 / ตำนาน 3 (ค่าเสนอ, like the shop) · boss drop: no ธรรมดา. Proposed rarity: ธรรมดา T1 T4 · ไม่ธรรมดา T2 T6 T7 U3 U5 DNA×6 ส่องทีม ถ่วงเวลา แลกหัวใจ · หายาก T3 T5 T9 T11 U4 U6 field×6 ดูดเลือด ป้อมปราการ กัดกร่อน สายสัมพันธ์ · หายากมาก T8 T10 T12 U2 U7 คู่หู เลี่ยงจุดตาย ดึงดูดตัว · ตำนาน U8 รวมร่างเร็ว · runes the user adds: rarity picked per rune.
- **Q13 Scope / date (also old Q6).** MVP1 target 28 Nov, step 5.5 economy not started. ★A this set = Balance Room only (rune data, add-rune editor, rarity view, drop weights); battle/shop code in phase 2a. B also code all battle effects now (~3–4 sets). C park runes, do step 5.5 first.

## Balance Room UI plan (Claude decides, after answers)
- Sections by rarity (folds, count per section), filter chips by kind (ค่าพลัง · สกิล · เผ่า · สนาม · พิเศษ · เงิน/ร้าน), name search.
- Each rune = one compact line (name, rarity colour, เฉพาะตัว/ส่วนรวม badge, short effect text, on/off); tap to edit values.
- "+ เพิ่มรูน" builds a rune from the skill effect list (Q1 A), with scope + flat/% + rarity + copies per run.
