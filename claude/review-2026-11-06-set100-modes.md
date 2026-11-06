# Set 100 spec — difficulty modes ปกติ / ยาก / นรก + rune reroll (user, 6 Nov 2026 · do in the NEXT chat)

## User request (as given)
- Rename difficulty ง่าย / กลาง / ยาก → **ปกติ / ยาก / นรก**.
- **ปกติ**: enemy = a real bot team the player could build, NO stat change (100%), just a random team (from the round's cell).
  Rune card rarity: common 80% · rare 15% · legend 5%.
- **ยาก**: random team + stat buff so the player wins normal rounds **65–75%**. Rune card rarity: common 10% · rare 75% · legend 15%.
- **นรก**: random team + stat buff so the player wins normal rounds **55–65%**. Rune card rarity: common 5% · rare 25% · legend 70%.
- New: the rune reward cards can be **re-rolled 2 times every round**.

## Current state (set 99) for reference
- Tier = team picked at 25/50/75% strength rank of the round cell (4 teams per tier) × diffEasy/Norm/Hard 92/99/106 %.
- Measured set 99: all at 100% ≈ ง่าย 80 · กลาง 70 · ยาก 30 % normal-round win.
- Rune offer = fixed mix per tier (off{Easy,Norm,Hard}{C,R,L} counts, 3 cards) · boss win = pick 1 of 2 legend.

## Open points to confirm with the user at the start of set 100 (short, recommended option first)
1. "random team" = any of the round's 12 bot teams (ignore the 25/50/75 tier split) for all 3 modes? (rec: yes, one pool; buff only differs)
2. Win % target = normal (non-boss) rounds, like before? (rec: yes) · buff % found by measuring (runerun), written as ค่าเสนอ.
3. Rune %: each of the 3 cards rolls its rarity by these % (rarity sold out → other rarities, as now)? (rec: yes)
4. Reroll 2 per round: free, re-rolls all 3 cards, unused rerolls do not carry over? Boss reward (2 legends) also re-rollable? (rec: free · all cards · no carry · boss too)
5. Default mode at game start = ปกติ (rec).

## Work list
core/runrunes.js (tiers, offer by %, reroll + state field → run state bump) · core/stage.js settings (new rows, Balance Room ด่าน tab) · game page buttons/text/popup + reroll button on the offer dialog · lab/runerun.mjs modes · tests (t-runrun, ui_smoke) · re-tune buffs + bosses · docs S-12 (Thai) version bump · gate → merge → publish 3 pages.
