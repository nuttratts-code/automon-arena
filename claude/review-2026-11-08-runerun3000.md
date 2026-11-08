# Review 8 Nov 2026 (set 140): user's own analysis of Balance Room "รันจริง" 3000 runs — Q&A + changes to do NEXT chat
Rule: this chat only answers + logs. Nothing applied. Next chat starts with HARD RULE 6 (fresh AMCFG1 → cfgdiff → user picks per cell).

## A. Boss 2nd encounter (k2) must be harder than the 1st (k1)
User: bots pass the 2nd boss more easily than the 1st → k2 must be harder.
Evidence (measure-log):
- set 132 runerun 600: k1 won 63.3% · k2 won 84.7%
- set 137 runerun 600 (latest, after rev 32 import): k1 68.2% · k2 71.6% (reached 71.7%) · k3 68.6%
- bossrun was last run with targets 60 / 62 / 50 → k2 was meant to be about equal to k1, not easier.
Cause 1 (confirmed in code): `lab/bossrun.mjs` line 25 still collects boss-round teams with the OLD flow
(`simRun` + `pickBotTeam`, NO runes, no pickFoe) — the same staleness set 138 fixed for the Balance Room
(`lab/analyze.js runPlayStats`). Real runs (runerun) have runes on both sides → player teams at round 10 are
stronger than the teams mult10 was tuned on → k2 lands easier than its target.
Cause 2 (expected, not yet measured): survivorship — only runs still alive at round 10 meet k2 (~72%), and those
are the stronger runs. Separate this from cause 1 by measuring k2 win % on ALL runs vs survivors.
Options (next chat, ask user):
- A1 (rec): port bossrun to the runerun flow (reuse runPlayStats team capture: pickFoe + runes both sides) →
  set user targets with k2 < k1 (e.g. k1 60 · k2 50 · k3 45 — numbers = user's call) → run WITHOUT --write,
  show before/after mult10 + endlessPct per boss → write only on OK → runerun 3000 to confirm.
- A2: quick fix only: raise every boss's mult10 by a flat % (user picks %) and re-measure; no tool change
  (faster but repeats the drift next time teams change).
- A3: A1 + also count survivorship (target k2 on survivors, as players feel it).
Touches game values → HARD RULE 6 first. After write: tell user which boss cells (mult10 / endlessPct /
hp / atk) to set back in the Balance Room ด่าน tab + 💾. Version bump: none of the Thai docs list boss k2 numbers
(boss rules still only in review files — pending bundle item).

## Q2 (answered, no change yet). How to read the card "ชนะแมตช์ทีมบอท" (+ table by win streak)
Code: lab/analyze.js line 305 · = % of matches vs bot teams (bosses + dummy excluded) the player bot did not lose,
over ALL runs, main run AND extra matches. Draw counts as a win (`won1 = winner !== 1`, same as the game's heart rule).
Foe strength adapts (foeFloor 100, −20 per loss from 2 losses in a row, min 40, any win → 100), so ~50% is by design;
the by-streak table shows win % rising with streak = stronger boards keep winning.
Possible later tweaks (only if user asks): split main vs extra · show draws separately.
Q2b: "แมตช์" column = matches played with that streak before them. Row "5 ขึ้นไป" = streak 5, 6, 7 … pooled
(`Math.min(5, m.ws)`), incl. long streaks in extra matches → can exceed row 4. Possible tweak: rows 5 / 6–9 / 10+.
