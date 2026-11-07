# Set 119 design: normal run = normal bots only · strong bots only in extra mode (7 Nov, proposal, NOT built)

User: a player who loses some matches reaches round 11–19 before 10 wins and meets scaled bots + boss 3 (round 15) inside the normal run. Wanted: normal run (before 10 wins) = only normal bots; strong/scaled bots + extra bosses only in extra mode (after 10 wins, "เล่นต่อ").

## Now (conflicts, per CLAUDE.md conflict check)
- S-12 set 108: real unscaled bot teams up to ROUND 10 (foeRealUntil); from round 11 power-follow scaling + win streak. Hearts 10 + 10 wins → a normal run can last up to round 19.
- S-10 set 108: bosses on fixed rounds 5/10/15/20/30/40, round 50 dummy — round 15/20 bosses can land inside a normal run (boss 3+ also gets bossExtraPct +20%, meant for extra matches).
- S-13: growth 8%/round from round 20 (round 20 is always extra already).
- shop.js end-of-round-10 warning "enemies get much stronger from round 11".

## Proposal A (recommended) — split by phase, not by round
Normal run (wins < 10):
- enemy = real bot team, never scaled (pct 100) at any round 1–19; picked as now (closest power to your team from nearby rounds, no streak bonus).
- bosses only #1 (round 5) and #2 (round 10); boss rounds 15/20 inside a normal run → a normal bot instead.
Extra mode (after 10 wins → "เล่นต่อ"):
- power-follow scaling + win streak +5%/win (cap 25%) start here.
- bosses at the next fixed rounds 15/20/30/40 (whichever are still ahead), boss #3+ = +20% each; round 50 dummy; growth from round 20 unchanged.
- the "enemies get much stronger" warning moves to the end-of-run screen / "เล่นต่อ" button.
Setting foeRealUntil (round) is replaced by "until 10 wins".

## Proposal B — keep rounds, just widen the safe window
foeRealUntil 10 → 19 and boss rounds 15/20 skipped when not in extra. Simpler but still round-based (a normal run that is still going at round 20 is impossible anyway, so B ≈ A in play, differs only in code/settings wording).

## Open question for the user
Q1 normal-run team pick: (a, rec) closest power to your team, unscaled (as now) · (b) random team from that round's pool, ignoring your power.

## Update (same day, user follow-up) — current shape, still NOT built
- Normal run = rounds 1–19 (hearts out or 10 wins ends it; round 20 is never reached in a normal run). Real bot teams, unscaled, no win-streak bonus. Bosses 5/10/15; boss at 15 drops the +20% extra-match bonus when met in a normal run (proposed, user to confirm).
- Extra mode (after 10 wins → เล่นต่อ): real team of that round + flat % — user said "20" (read as option ก +20%, to confirm). After round 20: +8%/round compounding as now. Bosses 15/20/30/40 still ahead, #3+ +20% each, round 50 dummy.
- NEW (user): "Demo": start hearts 10 → 5. On losing the last heart: 1 free heart + pick 1 of 3 random LEGEND runes, no reroll.
  Conflicts: shop.hearts 10 (rules.js) · with 5 hearts a normal run lasts ≤ 14 rounds (≤ 15 with the free heart) → boss at 15 only reachable via the free heart · boss reward is legend 1 of 2 (S-12), this is 1 of 3.
  Open: what "Demo" means (whole game vs a separate mode) · once per run? · normal run only or extra mode too? · legend pool exhausted → fill from other rarities (existing S-12 rule)?

## Decided by user (7 Nov, later) — supersedes the open items above
- Run capped at 15 matches for now (lastStage 50 → 15); extend later once there is more play data.
- Applies to the live game for everyone ("Demo" = the current public game).
- Start hearts 10 → 5. On the 5th loss (hearts would hit 0): +1 free heart AND pick 1 of 3 random legend runes (no reroll) — once per run, in normal run or extra mode. Legend pool empty → fill from other rarities (S-12 rule).
- Math: 5 losses + 1 free heart → the 6th loss ends the run; 10 wins needs ≤ 15 matches → cap 15 fits exactly.
- Still to confirm: extra mode +20% flat on the real team · round 15 = real boss #3 (training dummy at the last round removed for now) · boss #3 met in a normal run without the +20% extra-match bonus.

## FINAL spec for set 119 (user 7 Nov) — supersedes everything above
- Normal run: max 15 matches. Start hearts 5. Enemy = real bot team from the pre-generated pool (bots that played like humans; NOT the player's team), unscaled, no win-streak bonus. Bosses at rounds 5/10/15, strength grows by boss number as now (bossAt k) but WITHOUT the +bossExtraPct 20% in a normal run.
- Extra mode (after 10 wins → เล่นต่อ): continues up to round 20; round 20 = training dummy (last round). Enemy = real bot team of that round +20% hp/atk (flat). Boss at round 15 if met in extra mode: k=3 growth + 20%. Power-follow scaling + win-streak bonus (set 107) are not used anymore (maybe keep code, settings off).
- Second chance: on the 5th loss → +1 heart + pick 1 of 3 random legend runes, no reroll · once per run · normal or extra · empty legend pool → other rarities.
- lastStage 50 → 20; extra-mode end = round 20 dummy. Growth from round 20 (8%) no longer reachable.
- Docs to update: S-10, S-12, S-13 (+ version bump, core rule → +1.0), Balance Room setting labels.
