# Measurement log per task set (Automon Arena)

V1.6 · 7 Nov 2026 (set 127 build G3 added) · was V1.5 · 28 Oct 2026 (set 49 added) · holds detailed measurement results moved out of handoff.md to keep it short · open only to look up past numbers or compare · in-game values are in combat-rules.md (section "default values to test") and tribe-rules.md

## Set 127 build · G3 (7 Nov 2026 · R2 sell −1 copy/merge + R1 floor + set 128 lock, new bot teams)
`node lab/runerun.mjs 600` (simple player bot, runes on) · same bot teams both columns · set 119 reference (10→5 hearts, no lock, full refund): cleared 18.5% · normal won 45.5% · second chance 93% · k1 54.5% · k2 reached 53% won 66.5%.
| | floor 100% (game default) | floor 0 (= set 128 lock + R2 only) |
|---|---|---|
| run cleared | 25.0% | 41.7% |
| normal rounds won | 50.6% | 62.1% |
| second chance used | 91.5% | 84.0% |
| boss k1 won | 55.7% | 67.3% |
| boss k2 reached / won | 61.5% / 64.5% | 90.0% / 59.1% |
| boss k3 in normal run reached / won | 8.8% / 75.5% | 10.5% / 61.9% |
Reading: the set-128 lock (enemy from pre-shop power) made runs much easier (+23 pt clear vs set 119); the floor pulls most of it back (25%). R2 effect not separable here (bots also sell less profitably).

## Set 49 · balance import (28 Oct 2026 · values entered the game)
Source: AMCFG1 code pasted in chat by the user (second account cannot read the db) · config saved 15:24:53Z · measured 15:24:33Z · pre-import check MATCH · 12 characters: HL-2 HL-6 HL-7 HL-8 PL-4 PL-6 PT-2 PT-3 PT-6 PT-8 SF-6 SF-8 (rows; new kits HL-2 / PT-6 / PT-8; SF-6 / SF-8 / PT-8 stats) · no tribe changes.
- Claude measure (bootstrap final): n 24000, seed 4242, 533 s, abnormal 0 · avg match 84.3 / 79.5 / 73.5 / mix 74.3 s.
- Outliers (user's values, passed): WY-8 mix −11.0 · PT-6 mix −9.4 (Lv3 −8.5) · WN-6 mix −2.1 (Lv1 −7.3, Lv3 +11.8). Near edge: HL-2 +5.8 · PL-4 +4.5 (Lv3 +9.7) · SF-5 +4.6 (Lv1 +9.2) · WY-6 (Lv1 +9.2) · WN-1 +5.0 · WN-3 +5.1 · WN-5 −5.3.
- Winning-team tribe share (mix): steel 29.8 · fire 25 · thunder 24 · wind 38.4 · spirit 29 · demon 39.6.
- Bot teams regenerated (hash 521fadbf). Old skill kits of HL-2/PT-6/PT-8 kept as retired-skill tests (reflectDebuff now unused by any character).

## Set 38 · balance import (27 Oct 2026 · values entered the game)
Source: config/main v203 (48 characters + 6 tribes, saved 27 Oct 09:19Z) · results/latest v9 (user measured in the Balance Room, n 24000, aborted 0) · checks passed: results.edits == config/main, aborted 0.
- Imported by apply-config; bot teams regenerated (90 teams, hash 58de9165, 131 s). Pages published: game v57, balance room v102, check v56. config/main cleared (v204).
- Claude re-measure after import (bootstrap final): n 24000, seed 4242, 198 s, abnormal 0.
  - Outliers (user's intent, passed): SF-8 mixed +6.5 (Lv1 13.3, Lv2 11, Lv3 7.9) · WY-8 mixed −11.3 (Lv1 −13.9, Lv2 −12.6, Lv3 −12.6)
  - Near-limit (passed): HL-7 5 · PL-3 5.6 · SF-5 3.2 (Lv1 9.1) · SF-6 0 (Lv1 9.1) · PT-5 −5.7 · WN-1 5 · WN-6 −2.5 (Lv3 9.3)
  - Tribe presence among winners: อสูร 39.9 · วายุ 37.9 · เหล็กกล้า 30.7 · ภูติ 27.7 · สายฟ้า 24.8 · เพลิงเผา 24.2 %
- New tribe bonus values entered (see tribe-rules T-4). Five tests that cited old tribe-bonus values were made value-independent (helper TBR pins the old values; the set-32 hash test rewritten) — tests 128/128.
- ⚠ Open: results.suspicious has 10 matches with damage far above total HP (PT-5, WN-3, HL-7). Not fixed; handoff Next item 2.

## Set using config v156 (25 Oct 2026 · values NOT entered · user chose to revert, then edit in the Balance Room)
Source: config/main v156 (saved 25 Oct 18:18) edited 48 characters · skills of 33 · tribes unchanged · tribe members equal at 8 each (extraTribes all removed) · no pending ideas.

- Pre-measure checks: value checker passed · every-hit no-cooldown + multi-hit: WY-5 (armor/hit +2), WY-7 (removed 5.4 s skill cooldown) · HP compounding on every hit taken PT-6 +3% WN-3 +2% · SF-3 attack 0 · WN-1 Lv1 HP 90 (user confirmed keep)
- Measured 24,000 and 48,000, seed 4242, all 3 levels (sub-assistant): outliers 11 · abnormal 0 · 48,000 results:
  - Too strong: SF-5 +12.3 (Lv1 +20) · PL-5 +9.6 (Lv3 +16.3) · PL-1 +8.2 · WY-1 +6.2 · PT-6 Lv3 +12 (mixed +2)
  - Too weak: WY-8 −11.1 · WN-6 −10.3 · PL-6 −10.2 (Lv3 −11.4) · PT-8 −7.6 · PT-4 −6.7 · PT-5 −6.7
  - Near-limit: PL-8 −5.7 · WY-4 +5.2 · WN-1 +6.0
  - Average match Lv1 71 · Lv2 70.2 · Lv3 69.6 · mixed 66.8 s · tribes among winners: วายุ 40.7 · อสูร 38.9 · เหล็กกล้า 29.5 · ภูติ 28.1 · สายฟ้า 25.3 · เพลิงเผา 24.8 %
- Tried HP/attack tuning (formula 5+5 rounds of 12,000) then measured 24,000: outliers down to 3 → SF-5 +10.9 · WY-8 −7.3 · PL-8 −6.2 · near-limit HL-6 −5.2 · PL-3 +5.3 · WN-1 +5.7 · PT-6 Lv3 +9.7
  - Resulting values far from the user's (Lv1 HP/attack): PL-1 40/2 · PL-5 45/5 · PL-6 365/10 · WY-8 275/6 · PT-4 260/7 · PT-5 155/12 · PT-6 175/9 · PT-8 215/12 · WN-6 310/31 · WY-1 50/2 → **user chose to revert, not used**
  - Cause of PL-1/PL-5 strength: burn per hit, not HP/attack · SF-5 goes down at start so power values have no effect · WY-8 strong via its skill
- User chose (to enter in the Balance Room themselves): SF-5 shock every unit on down 15/30/60 → 10/20/40 · WY-8 cooldown slowdown 30/60/120% → 20/40/80%

## Set 21 (24 Oct 2026 · values entered, game v47)
Source: config v79 (PL-4 PL-6 PT-4 PT-5 PT-7 PT-8 WN-4) · during measuring the in-tick order was fixed to be side-independent (combat-rules V1.40), so every character shifted slightly

- First measure 24,000 (before order fix): outliers PT-4 mixed −6.7 · WN-4 mixed +17.7 (Lv3 +25) · near-limit HL-5 −5.2 · side-swap test failed (PT-8 reflect burn × PL-4)
- WN-4 lowering base values did not help (formula 4 rounds: HP 130 · attack 6 still +15 and under 50% of the median) · tried skill at 12,000: skill cooldown 12 s mixed +3.5 (Lv3 +7.8) · 8 s +4.8 (Lv3 +10.3) · 50% chance +5.9 (Lv3 +9.7) → user chose: add skill "every hit → own cooldown slower 40%"
- PT-4 base values tuned (Claude): tried 12,000: 260/12 cooldown 7/6/5 −5.1 · 280/13 6/5/5 −4.5 · 300/14 7/6/5 −4.0 · formula reached 345/16 at −3.9 but HP exceeds PT-8 (very rare) → chose 280/560/1120 · 13/26/52 · 6/5/5 s
- Confirmed 24,000 seed 4242 all 3 levels: **all 48 passed** · outliers 0 · near-limit 0 · abnormal 0
  - PL-4 mixed −0.7 · PL-6 +2.8 (Lv2 +8.9) · PT-4 −3.9 · PT-5 −3.4 · PT-7 +2.9 · PT-8 −3.4 · WN-4 −0.4 (Lv3 +1.7)
- Average match Lv1 78.3 · Lv2 75.7 · Lv3 74.1 · mixed 72.1 s
- Tribes among winners: วายุ 50.2 · อสูร 44.1 · ภูติ 40.7 · เหล็กกล้า 38.0 · สายฟ้า 24.6 · เพลิงเผา 24.1 %
- Side swap: random teams 3,000 + teams forced to have the new skill 16,000 matches (seeds 21 99 7 5) results identical every match

## Set 19 (24 Oct 2026 · values entered, game v44)
Source: config v71 (ภูติ/อสูร + 4 tribes) + 4 values Claude tuned last round (HL-6 PL-4 PL-6 SF-6) · user edited after tune19: PL-4 burn 2/4/8 · WY-5 armor/hit 20/20/20 · PT-3/WN-3 uncommon

- First measure 12,000 (all tribes): outliers 10 · PL-6 Lv1/2 +10.3/+10.4 · SF-6 Lv1/2 +11/+10.5 · WY-8 Lv3 +11.7 · PT-1 +7.6 · PT-7 +8 · PT-8 −6.8 · PT-6 −6.9 · WN-3 +14.7 · WN-4 −9.4 · WN-6 −10.3 · near-limit HL-6 −5.1 · PL-8 −4.7 (Lv1 −9.4) · PT-4 −5.2
- Base values tuned (lab/formula.mjs 8 rounds + by hand) HP / attack / cooldown:
  - HL-6 965/2000/3935 · 17/33/67 · PL-8 250/495/975 · 12/24/49 · PL-6 HP 265/530/1200 · SF-6 HP 400/800/1720
  - WY-8 HP 300/520/850 · cooldown 10/11/12 s · PT-1 115/235/415 · 2/4/9 · 6 s · PT-7 110/215/430 · 7 · 5.5 s
  - PT-4 245/470/955 · 29/60/119 · PT-8 225/455/900 · 31/62/125 · PT-6 420/850/1710 · 29/57/114
  - WN-4 400/800/1595 · 20/40/80 · WN-6 480/985/1965 · 33/65/130
  - WN-3: formula reduced to 125/250/440 · 2/4/9 → conflicts with rarity rule (อสูร attack) → user chose 1A: heal skill 30→15% · attack 10/20/40 · HP 140/280/560
- Confirmed 24,000 seed 4242 all 3 levels: **all 48 passed** · outliers 0 · near-limit 0 · abnormal 0 · WN-3 mixed +3.8
- Average match Lv1 75.5 · Lv2 74.7 · Lv3 73.6 · mixed 70.6 s ⚠️
- Tribes among winners: วายุ 50.1 · อสูร 43.3 · ภูติ 41.1 · เหล็กกล้า 38.1 · สายฟ้า 24.5 · เพลิงเผา 24.2 %
- Test "side swap reverses the result" failed because WN-5 random target → made the random roll separate per side (combat-rules V1.36)

## Trial config v43 (23 Oct 2026 · set 16 · values NOT entered)
Scope: all HL PL SF WY + PT-1 · edits as user chose (SF-5 self down + shock every unit · WY-8 freeze → % slowdown · SF-8/WY-6 skill "damage 0 to everyone" → hit everyone with split value)

- Measured 24,000 with the above: outliers 13 · Lv1 average match 57 s (previous in-game set 42.9 s)
- Too strong: HL-7 Lv3 +16.4 · HL-6 Lv1 +13.8 · WY-4 +8.0 · WY-5 +6.4 · WY-8 +11.2 (Lv3 +20.3) · PT-3 +6.3
- Too weak: PL-6 −15.9 · SF-6 −16.0 · WY-6 −13.5 · SF-8 −9.9 · PL-8 −8.3 · PL-4 −7.9
- Tribes among winners: เพลิงเผา 25.2 · สายฟ้า 26.9 · อสูร 45.2 · ภูติ 43.9 %
- Over the permanent-value cap in that config: WY-3 permanent multi-hit 2/4 and PL-2 permanent burn 6/9 (+1/+3)
- Violated tribe identity: HL-4 HP 150 < ordinary เหล็กกล้า 200
- SF-6 shock-everyone skill removed
- **Game hang:** two WY-8 in a row stacked multi-hit until the game hung → user chose "tune in the Balance Room" · no whole-game hit cap · no opinion on WY-8 → values not entered

## History
- V1.4 (27 Oct 2026): translated to English; set 38 added
- V1.3 (25 Oct 2026): results of config v156 trial (not entered)
- V1.2 (24 Oct 2026): set 21 results
- V1.1 (24 Oct 2026): set 19 results
- V1.0 (23 Oct 2026): file created, config v43 results moved from handoff.md
- 7 Nov 2026 set 119 (G3, lab/runerun.mjs 600 runs seed 8800, player bot with runes, hearts 5 + second chance, real unscaled foes, extra to round 20): run cleared 18.5% · normal rounds won 45.5% (by streak 0:34.7 1:48.1 2:56.8 3:62.1 4:66.0 5+:77.4) · second chance used 93.3% of runs · boss k1 54.5% (600) · k2 66.5% (319 = 53% of runs) · k3 74.8% (123; normal run 40 = 6.7%, won 70%).
- 7 Nov 2026 set 129 (user idea B: floor moves with results · lab/runerun.mjs 600 runs seed 8800, `--dyn=STEP,CAP,START` = floor starts START, win +STEP, loss −STEP, clamp 0..CAP; measure only, game code unchanged): fixed floor 100: cleared 25.0% / normal won 50.6% · 80: 31.8% / 56.4% · 60: 41.5% / 62.1% · 0: 41.7% / 62.1% · dyn 10 start 0: 41.7% / 62.1% (floor p10/50/90 = 0/30/90) · dyn 5: 41.7% · dyn 15: 40.5% / 61.4% · dyn 10 start 50: 37.3% / 60.4% (50/70/100) · dyn 10 start 80: 29.0% / 55.0% (70/90/100). Reading: the floor only bites when the board is below ~60% of the round median; B from 0 stays below that most of the run → plays like no floor (and gives no throw guard early). The bot never sandbags, so throw-guard strength is not measured here.
