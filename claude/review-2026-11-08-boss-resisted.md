# Boss A1 re-measure after R3 rounding (set 149, 8 Nov) — measure only, no value changed
Tool: `cd src && node lab/bossres.mjs 3000 --boss=B1,B2,B4` (new, measure-only; same team flow as bossrun/runerun) · main 955fc8b · AMCFG1 rev 42 = game (only C3 name differs).
Resisted tribe = team with ≥ 4 units of the boss's tribeResist tribe. Target k1 all 60 · resisted wants ≈ 40 (k2: 50 / 30).

| Boss | k1 all | favoured k1 | resisted k1 (set 148 → now) | resisted k2 |
|---|---|---|---|---|
| B1 โกเลม (resists เหล็กกล้า) | 61 | สายฟ้า 84 | 27 → **29** (n113) | 48 (n244) |
| B2 จอมเวทย์ดำ (resists ภูติ) | 65 | เพลิงเผา 92 | 33 → **36** (n229) | 32 (n276) |
| B4 กระจกสะท้อน (resists สายฟ้า) | 66 | เหล็กกล้า 85 | 19 → **24** (n293) | 21 (n266) |

## Cause check (k1 resisted tribe, one rule removed in all phases → win %, gain)
- **B1:** phase fx (armorBar 50/100) +14 · enrage +11 · armorCut +6 · reflect +5 · tribeResist +3 · noArmor 0 · shellBreak −15 (counter rule, helps). → main cause = armorBar shields + enrage; tribeResist itself small.
- **B2:** **cdSlow +36** (72 %) · enrage +17 · healCut +12 · phase fx (stunAll) +7 · hunter +6 · tribeResist +1 · resistWear −6 (counter, helps). → main cause = cdSlow 20/30/50 (ภูติ rely on cooldown skills).
- **B4:** **shockImmune +14** · fastAtk +7 · tribeResist +6 · phase fx +5 · stunPulse +3 · shockOverload −10 (counter, helps). → main cause = shockImmune 50/60/80 (สายฟ้า damage is shock).
- Notes: n600 run gave B1 35 / B2 44 / B4 26 (small samples) → use the n3000 numbers. Gains don't add up (rules interact). k1 all is already above target on B2/B4 (65/66) — any resisted-tribe fix there makes the boss easier overall unless paired with something else.
