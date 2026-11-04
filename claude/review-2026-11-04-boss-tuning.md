# Boss tuning — set 78 first pass (4 Nov 2026) · user must pick a direction
Ask (user): bosses B1–B6, 3 phases (phase 2 at half HP, phase 3 at last bar, 200 HP per bar), boss beats every user team but not by much (other tribes push into phase 3), beats its own tribe more clearly (boss still in phase 2). User picked: stage 5 = Lv1 teams, stage 10 = Lv2 teams; Balance Room saved char values; results to be written into the Balance Room.

## Real play (simRun, 1000 runs)
Round 5: 65% of units Lv1, 35% Lv2 · round 10: ~95% Lv2, Lv3 never · legend units appear only after 6 wins.

## Findings
1. Old bosses (B1–B3) win far too hard: boss ends with 4–7 bars vs most teams. B4–B6 are placeholders. Backup: claude/archive/bosses-before-set78.md.
2. **The 6 user teams differ hugely in strength**, and in different ways (Lv1 vs a plain boss: damage in 30 s / survival): ภูติ 1125 / 192 s · สายฟ้า 1095 / dies 65 s · เพลิงเผา 720 / dies 80 s · วายุ 502 / 300 s · อสูร 347 / 150 s · เหล็กกล้า 133 / 300 s. One boss cannot beat both the strongest and weakest team narrowly; best grid result per boss gets 2–8 of 12 cases (6 teams × 2 stages) on target. Fire and lightning teams always lose with ~3 bars left; ภูติ always gets closest.
3. **PT-6 loophole (saved Balance Room skill):** healHitUp +5 to self per hit + atk +20% of own healHit per hit → grows without limit; ภูติ team deals ~2.5× more in 30 s than with the game's current PT-6.
4. Grid search prefers few bars (4–5) + high atk (80–125, cd 4–6 s) → fights end in 30–50 s.
5. Flat rule numbers (burnAura, shockAura, thorns, barBlast) do not grow with the stage → weaker at stage 10.

## Draft kits (ค่าเสนอ, in claude/bosstune/kits.mjs)
B1 โกเลม เหล็กกล้า: reflect + armorCut (→ noArmor in phase 3) + armorBar on phase change · B2 จอมเวทย์ดำ ภูติ: healCut + cdSlow + randomSilence, phase 3 hunter + stunAll · B3 อสุรกายคลั่ง อสูร: lifesteal + downAtk + noRevive, phase 2 feedOnDown, phase 3 enrage + healCut + untargetable · B4 สายฟ้า: shockImmune + shockAura, stunPulse, phase 3 fastAtk + stunAll · B5 จ้าวพายุ วายุ (new name): multi 2, cdPulse, vanish, fastAtk, phase 3 multiUp · B6 ปีศาจเพลิง เพลิงเผา (new name): burn/hit, burnImmune + burnAura, cleansePulse, phase 3 aoe + enrage. Every boss: tribeResist 30% vs its own tribe. Phase atk ×1.3–1.5 (phase 2) and ×1.8–2.2 (phase 3).

## Options for the user (Claude recommends A then C)
- A: fix teams first — PT-6 cap (e.g. healHitUp only up to X) and look at why fire/lightning teams die in ~40 s; then retune bosses.
- B: accept the spread — tune each boss so the strongest team (ภูติ) loses narrowly; the others lose by 2–3 bars.
- C: give each boss a weakness to 1–2 tribes (tribeWeak) so weak teams get closer.
