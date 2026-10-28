# Rune proposal (28 Oct 2026, stage mode demo) — waiting for user picks
Context: backlog "Stage mode (demo)". User ideas: DNA, revive, gold, damage. Claude assumed structure option 3 (team runes in slots + unit runes used on one unit) — not confirmed. No numbers yet: every number = ask user first.

## Structure (proposal)
- Team runes: 3 slots (ค่าเสนอ), effect on whole team, can sell for gold, same rune max 1 per team
- Unit runes: used on 1 unit, stays on it (kept through merge, lost when sold — ค่าเสนอ), max 1 per unit
- Rarity follows unit rarity (ธรรมดา → ตำนาน); hard difficulty / boss drop rarer runes
- Demo: start with ~10 runes, add later

## Team runes
- R-T1 ทอง (user): +gold after each stage
- R-T2 ดอกเบี้ย: +gold per X gold saved (risk: snowball, balance with step 5.5)
- R-T3 แผงใหญ่: +1 shop slot
- R-T4 สุ่มฟรี: 1 free reroll per shop
- R-T5 คม (user "damage"): +% damage whole team
- R-T6 แนวหน้า: front row +armor at match start
- R-T7 แนวหลัง: back row cooldown faster
- R-T8 ธงเผ่า: chosen tribe counts +1 for tribe bonus (risk: easy 6-tier; cap at tier 4?)
- R-T9 ล่าบอส: +% damage vs boss only
- R-T10 คนสุดท้าย: when 1 ally left standing, it gets big buff
- R-T11 เติบโต: small team buff that grows each stage won, resets on loss (Balatro-style scaling)
- R-T12 แก้วบาง: big damage up, whole team max HP down (risk/reward)

## Unit runes
- R-U1 DNA (user): add a chosen tribe. Conflicts tribe-rules line 7 (max 1 extra tribe, must match skill). Proposal: counts for tribe bonus only, not for tribe-targeted skills
- R-U2 ชุบ (user): revive once per match. Overlaps อสูร tribe revive + WN-4; on-down skills (HL-5, PT-3) fire twice. Proposal: once per match, HP less than 100%
- R-U3 เร่ง: this unit cooldown faster
- R-U4 โล่: this unit +armor, taunts (enemies hit it first)
- R-U5 เพลิงติด: this unit's hits add fire (fire team synergy for non-fire units)
- R-U6 ลูกโซ่: this unit +1 multi-hit
- R-U7 คงทน: permanent values of this unit grow x% more
- R-U8 เงา: sell this unit → get a Lv1 copy back (risk: economy loop — maybe once)

## Not recommended (warned)
- +1 level rune (skips merge, breaks shop economy)
- fire never decays (C rule "fire −2/s", burn team wins outright)
- +1 heart rune (run length, hearts are the stage-mode safety net)
