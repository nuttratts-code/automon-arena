# Automon Arena backlog (parked work)

V1.3 · 28 Oct 2026 · added stage mode (demo) decisions · V1.2 translated to English (was Thai V1.1) · not opened until an item is picked up · current focus is in handoff "Next" · open balance issues live in pending.md, not here

## Gameplay / pacing
- Match length and run pacing: goal is "the longer you play, the longer you survive", but measured runs keep getting shorter (longest at the start of a run) · reach sandstorm in 9–70% of rounds (target < 5%) · plan "halve HP + defence" was cancelled by the user on 24 Oct · no solution chosen yet
- Values accumulating across runs / matches: measure with runlen/simRun · accumulating skills PL-2 PT-3 WY-3 HL-4 HL-5 WN-1 WN-2 SF-7 charge · permanent abilities have no cap · permanent % values stack additively

## Stage mode (demo) — user decisions 28 Oct, design in progress
- Purpose: public demo; play data (plays collection) of real player teams feeds Ghost Battle (MVP2). Validate rows before use (validateBotTeams); tell players the game records teams.
- Structure: fixed enemy teams (normal monsters) stage by stage · before each stage the player picks 1 of 3 difficulties, each with a different reward · every 5 stages a random boss
- Hearts: same as now (loss = −1 heart, 10 hearts)
- Run: 10 matches = 2 bosses (stages 5 and 10); player may keep playing after that, bosses keep getting stronger (endless)
- Rewards: Claude's proposal (ค่าเสนอ) easy = gold · normal = permanent values · hard = rare unit — plus a **rune system designed by the user (waiting for the user's design)**
- Claude's suggestions, not decided: bosses carry a special rule (Balatro-style), pool of 4–6 bosses (demo may start with 2–3), show the next boss from the start of each 5-stage block
- Open: rune design · boss HP/attack/rules/scaling (numbers = ask user) · how skills that target front/back row or trigger "enemy down" work vs a single boss · scoring/storm vs boss · effect on MVP1 target date (user: keep plan as is for now, 28 Oct)

## Economy
- Step 5.5 economy balance (prices, merge, permanent skills HL-4 WN-5 PL-2 PT-4 SF-7 · permanent shots uncapped · legends at level 1) using simulated runs → step 6 polish, mobile test

## Systems not designed yet
- Food · items · Partner (MVP1 shop sells characters only)
- MVP2: Ghost Battle + online · new tie rule (now tie = player wins) · server computes battle result / gold / permanent values itself

## Play data
- Once the user has played: summarise from the plays collection (win rate by round, length, reaching sandstorm, most-used characters) · how to read it: workflow/botteams.md item 14

## Undecided (not urgent)
- Move "split hit to every unit" under the "on self" condition
- Interpretation of "cooldown +20%"
- Confirm the head-image of the 6 tribes (earlier proposal: เหล็กกล้า armoured guardian · เพลิงเผา igniter who burns enemies · สายฟ้า lightning caller · วายุ hunter fast as the wind · ภูติ spellcaster who speeds up time · อสูร one who refuses to fall) · skill ideas kept: charge, growth
- Level 4 (merge three level-3 units, or an item) · look after merging

## Platform (decided 27 Oct)
- Move code/docs to GitHub + Jules (details in build-plan, MVP2 scope) · still open: user checks Jules access in Google AI Pro and connects Jules to the repo
- GitHub Action running build + tests automatically: DONE 28 Oct (`.github/workflows/tests.yml`, runs on every push; ui_smoke/measure stay local)
