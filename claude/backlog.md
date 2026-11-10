# Automon Arena backlog (parked work)

V2.0 · 31 Oct 2026 · set 64 boss phases · not opened until an item is picked up · current focus is in handoff "Next" · open balance issues live in pending.md, not here · older versions: git log

## Gameplay / pacing
- Match length and run pacing (set 181: user decided to KEEP current values and the rule "long matches are not a problem" — overtime 180 s every round; reopen only if the user asks): goal is "the longer you play, the longer you survive", but measured runs keep getting shorter (longest at the start of a run) · reach sandstorm in 9–70% of rounds (target < 5%) · plan "halve HP + defence" was cancelled by the user on 24 Oct · no solution chosen yet
- Values accumulating across runs / matches: measure with runlen/simRun · accumulating skills PL-2 PT-3 WY-3 HL-4 HL-5 WN-1 WN-2 SF-7 charge · permanent abilities have no cap · permanent % values stack additively

## Stage mode (demo) — user decisions 28 Oct, design in progress
- Purpose: public demo; play data (plays collection) of real player teams feeds Ghost Battle (MVP2). Validate rows before use (validateBotTeams); tell players the game records teams.
- Structure: fixed enemy teams (normal monsters) stage by stage · before each stage the player picks 1 of 3 difficulties, each with a different reward · every 5 stages a random boss
- Hearts: same as now (loss = −1 heart, 10 hearts)
- Run: 10 matches = 2 bosses (stages 5 and 10); player may keep playing after that, bosses keep getting stronger (endless)
- Rewards: Claude's proposal (ค่าเสนอ) easy = gold · normal = permanent values · hard = rare unit — plus a **rune system (user idea 28 Oct): team-wide effects, e.g. DNA rune = add a chosen tribe to a unit · revive rune = revive once at 100% HP · gold rune · damage rune. Open: structure (team slots vs on a unit), conflicts with tribe-rules (max 1 extra tribe; extra tribe must match skill mechanic), revive vs อสูร identity and on-down skills (HL-5, PT-3)**
- Rune drops (user 29 Oct): boss = rune guaranteed · normal stage: hard 50% / normal 30% / easy 10% chance of a rune (numbers from user, ค่าเสนอ until measured), else a fallback reward (user OK 29 Oct: easy gold · normal permanent values · hard rare unit) · player can hold many runes · **copies per run set per rune (user 29 Oct set 52, replaces 'no duplicate'): max 1 = unique rune, 2+ = stacks like levels; runes can be renamed** (**set 61 user rule: default copies follow rarity for every rune — ธรรมดา 3 · หายาก 2 · ตำนาน 1; changing rarity resets copies; a different number can still be typed per rune (yellow); old saves holding the pre-61 default numbers are moved to the rarity number, typed numbers kept**) · roll tied to the run seed (reload = same result, Claude decided) · pool exhausted → fallback reward (Claude proposal) · no cap on runes held (user 29 Oct) · after stage 10 (endless) runes drop only from bosses, normal stages give the fallback reward only (user 29 Oct)
- Runes: **v2 (user 29 Oct set 53) replaces the 20-rune list** — 51 presets + user-made runes, 3 rarities, details + answers in claude/archive/reviews/review-2026-10-29-runes-v2.md · all numbers ค่าเสนอ · battle/shop effects = phase 2a/2b
- Enemy teams (user 29 Oct, Claude option 1): per stage pick bot teams by player-strength percentile from claude/archive/reviews/review-2026-10-29-stage-baseline.md — easy ≈ p25 · normal ≈ median · hard ≈ p75 · open: endless stages past the measured range
- User answers 29 Oct (set 52, claude/archive/reviews/review-2026-10-29-stage-phase2.md): **Q1 boss spot set per boss** (all 6 slots / front+mid 4 / front 2 / 1 slot / 1 slot moving every N s) · **Q2 HP colour bars**: boss HP split into bars, each emptied bar = "enemy down" for skills (bar count per boss, ค่าเสนอ 5) · **Q3 A** storm as now · **Q4 endless to stage 50**, normal enemies compounding growth per stage from stage 20 (ค่าเสนอ +8%/stage) · Q5 explained, waiting · Q6 not answered
- **Boss phases (set 64, user 31 Oct, claude/archive/reviews/review-2026-10-31-boss-phases.md):** up to 3 phases per boss, phase 2–3 start after N HP bars are gone, new phase rules replace old, ≤ 2 rules per phase, optional phase-change effects X1–X4 + spot change · rule pool 38 (8 old + R1–R30) · data + Balance Room editor only; battle effect waits for the boss battle engine (2a) · R31 summon parked · heal rules never refill an emptied bar
- Claude's suggestions, not decided: bosses carry a special rule (Balatro-style), pool of 4–6 bosses (demo may start with 2–3), show the next boss from the start of each 5-stage block
- Open: rune design · boss HP/attack/rules/scaling (numbers = ask user) · how skills that target front/back row or trigger "enemy down" work vs a single boss · scoring/storm vs boss · effect on MVP1 target date (user: keep plan as is for now, 28 Oct)

## Economy
- Step 5.5 economy balance (prices, merge, permanent skills HL-4 WN-5 PL-2 PT-4 SF-7 · permanent shots uncapped · legends at level 1) using simulated runs → step 6 polish, mobile test

## Systems not designed yet
- Items (MVP1 shop sells characters only) · Food removed by the user 29 Oct (runes replace it) · Partner removed by the user 28 Oct
- MVP2: Ghost Battle + online · new tie rule (now tie = player wins) · server computes battle result / gold / permanent values itself

## Play data
- Once the user has played: summarise from the plays collection (win rate by round, length, reaching sandstorm, most-used characters) · how to read it: workflow/botteams.md item 14

## Undecided (not urgent)
- Move "split hit to every unit" under the "on self" condition
- Interpretation of "cooldown +20%"
- Confirm the head-image of the 6 tribes (earlier proposal: เหล็กกล้า armoured guardian · เพลิงเผา igniter who burns enemies · สายฟ้า lightning caller · วายุ hunter fast as the wind · ภูติ spellcaster who speeds up time · อสูร one who refuses to fall) · skill ideas kept: charge, growth
- Level 4 (merge three level-3 units, or an item) · look after merging

## Platform (decided 27 Oct)
- Move code/docs to GitHub: done 27 Oct · Jules part cancelled by user 28 Oct
- GitHub Action running build + tests automatically: DONE 28 Oct (`.github/workflows/tests.yml`, runs on every push; ui_smoke/measure stay local)

## Hard tasks to retry with a new model (set 150, habit 6)
- When a new Claude model comes out, pick the hardest item here and retry it; add any task Claude tried and could not finish.
- Boss resisted-tribe win % ≈ 40 target (set 149: B1 29 · B2 36 · B4 24) — find a fix that keeps k1 all-tribe ≤ 60.
- Match/run pacing "longer you play, longer you survive" (see Gameplay / pacing) — set 181: kept as is by the user.
