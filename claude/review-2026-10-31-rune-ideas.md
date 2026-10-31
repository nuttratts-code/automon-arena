# Rune ideas from the 31 Oct AMCFG1 paste — Claude answers (31 Oct 2026)
Status: user chose 1(a); 2/3/4 = build all, user tunes (31 Oct). DONE in core/stage.js RUNE_SPECIAL (catalogue only — battle engine still ignores runes, phase 2): freeze (sec 3, bossPct 50) · regenLow + regen (sec 5, pct 10/5) · armorShare (pct 50, count 1) · hpToArmorHit (hpPct 50, rate 2% of lost HP — 20% would give +60 armor/hit). All ค่าเสนอ.
Old status: waiting for user choices. All 4 are NEW effects (none exists in core/stage.js). Every number = ask user.
Why they stay "รอ Claude" in the Balance Room: status changes only when a reply is written to db `ideas`; the 2nd account cannot write that db. The stage values in the same paste (savedAt 31 Oct 08:36) are already game defaults (set 62, core/stage-user.js); `measured` = 28 Oct measure snapshot (history, not pending).

1. Enemy team stopped 3 s — options: (a) at fight start, legend, 1 copy (recommended) · (b) when the first ally goes down · (c) every N s. Warn: stops all 6 enemies → very strong; bosses maybe half duration.
2. Heal every x s — options: (a) lowest-HP ally heals % max HP (recommended) · (b) whole team small heal · (c) the rune holder only. Ask: x seconds, %.
3. When this unit gains armor, a random same-tribe ally also gains armor — options: (a) ally gets % of the gained armor (recommended), copied armor does NOT trigger again (no loop) · (b) full amount, cooldown. Ask: %.
4. Convert 50% HP into armor/hit at 20% — unclear: 20% of the lost HP? e.g. HP 600 → −300 → armor/hit +60 (normal armor/hit is 3–12 → far too strong). Need clarification before options.
