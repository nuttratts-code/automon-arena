# Set 99 review — matchmaking (3-unit enemy at match 2) + boss after every 4 wins (6 Nov 2026)

## 1. Matchmaking — cause (evidence, nothing changed yet)
- Game picks the enemy with `pickBotTeamAt(BOT_TEAMS, wins, seed, round, tier)` (core/botteams.js): cell = wins (0–9) × loss span (losses before the match: 0–2 / 3–5 / 6–9).
- Set 24 rule: a span only holds teams from rounds ≤ the span's FIRST round (losses ≤ span minimum).
- So cell wins 0 · span 0 (player rounds 1–3) holds ONLY round-1 teams = 3 units, Lv1 (all 12 teams).
  → lose match 1 → match 2 (and 3) = 3-unit round-1 enemy, while the player has round-2 gold and a full board.
- Same lag everywhere, worse in later spans (data now):
  | cell | player round | bot team rounds |
  |---|---|---|
  | wins 0 · losses 0–2 | 1–3 | 1 only |
  | wins 0 · losses 6–9 | 7–10 | 1–5 |
  | wins 5 · losses 6–9 | 12–15 | 6–12 |
  | wins 1+ · losses 0–2 | k+1 … k+3 | k+1 only |
- Why it matters more now: since set 89 the shop level comes from the ROUND, and since set 96 income grows per round → team strength follows the round, not the wins. A team from 2–5 rounds earlier is much weaker.

### Options
- **A (recommended): exact cell = wins × exact losses** (= exact round of the player). 10 × 10 cells × 12 teams. Empty/thin cells → nearest cell with the SAME round (one win more/less), never a later round. Keeps "more wins = stronger enemy". Data ~3× bigger (botdata.js ~120 KB → ~350 KB), botgen longer.
- B: cell = round only (1–19), ignore wins. Smallest data, every cell full; a losing player meets the average team of that round (harder for losers).
- C: keep cells, change the set-24 rule to "teams from the player's round range (rounds of the span)". Smallest change, still up to 2–3 rounds off inside a span.
- All options: regenerate bot teams + re-tune bosses + re-measure difficulty win %.

## 2. Boss after every 4 wins (user ask)
Proposed reading: 4 normal wins → the 5th match is the boss (boss when wins = 4, 9, 14 …). Beating the boss counts as a win.
- With winsToFinish 10: boss 1 at wins 4, boss 2 at wins 9 = the run's LAST match is a boss. Boss 3 (now at round 15) would need wins 14 → never reached.

### Open questions
- Q1 lose to the boss → **(a, recommended) same boss again next match until beaten** (hearts drain) · (b) boss skipped, continue normal matches, boss comes back after 4 more wins.
- Q2 3rd boss → **(a, recommended) 2 bosses per run (wins 4 and 9)** · (b) raise winsToFinish to 15 (boss 3 at wins 14) · (c) boss every 3 wins (wins 3, 7… ) instead.
- Boss tuning targets stay boss 1 ~75% / boss 2 ~62% (ค่าเสนอ); bosses re-tuned after the change.
