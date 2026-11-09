# Brainstorm — boss redesign: dynamic + simple tuning for any boss count (set 168, 9 Nov 2026)

Size A2 (5 experts × 2 rounds, sonnet subagents) · goal B2 (ranked idea list) · user constraints: keep 6 bosses · each boss keeps exactly 1 weak + 1 resisted tribe · keep each boss's tribe identity.
Simulated experts = same model; diversity comes from role/bias/evidence, not real expertise. Nothing in the game changed. Input: claude/review-2026-11-09-bosstribe.md (set 167, 3000 runs).

## Question
How to redesign the bosses (skills may be rewritten) so tuning is more dynamic and much simpler, with one formula for any k (k1–k3 in the run, k4+ in extra matches)?
Success = few hand knobs · one curve for every k · targets (k1 all ≈60, resisted ≈40, weak ≈75–80 · k2 all ≈50, resisted ≈30) hit without per-boss hand fixing · readable boss identity.

## Problem in numbers (from code + set 167)
- Strength by k is per boss: k2 = × mult10 (2.35–2.71), k≥3 = × (1+endlessPct)^(k−2) with endlessPct 80–109 % → 6 different curves (stage.js bossMult).
- ~40–60 knobs per boss (hp atk cd multi mult10 endlessPct, 2 phase-atk overrides, 6–8 rules × 3 phases) ≈ 300 knobs.
- tribeWeak uneven +50…+300 %; it carries the balance (off → weak tribe 16–63). Weak win % does not track the multiplier (B5 +50 % → 89 · B1 +300 % → 78).
- One rule can dominate (B2 cdSlow off: k1 all 61→85); most rules move the resisted tribe ≤ 6 pts.
- Tribe leak: อสูร teams 69–90 on almost every boss, สายฟ้า 20–36 at k2 on 5/6 bosses, mixed teams 66–79 > mono → general tribe power, not only weak/resist.

## Panel
A Dana — systems designer (clean formulas, one curve) · B Kai — boss encounter designer (readable answer per boss) · C Mali — owner/player advocate (few sliders) · D Rex — skeptic/red team (pre-mortem, exploits) · E Sora — wildcard tabletop + scope realist (point-buy, effort).

## Evidence pack (tiers: T1 primary · T2 press/guides · T3 blogs = ideas only)
- E1 Hunicke 2005, ACM ACE 429–433 — DDA by adjusting supply/demand (Hamlet, Half-Life) — T1 — https://users.cs.northwestern.edu/~hunicke/pubs/Hamlet.pdf
- E2 Giovannetti GDC 2019 "Slay the Spire: Metrics Driven Design and Balance" — balance by win/pick-rate metrics — T1 talk (summaries T3) — https://gdcvault.com
- E3 Hades patch notes (Supergiant 2020) — harder bosses via an extra mechanic per "Extreme Measures" rank, tuned per boss afterwards — T1 — https://www.supergiantgames.com/blog/hades-welcome-to-hell-update-patch-notes/
- E4 Hades Pact of Punishment — difficulty = stackable named modifiers, same on every boss, readable — T2 — https://rpgsite.net/feature/10287-hades-pact-of-punishment-heat-modifiers-and-how-to-maximize-your-rewards
- E5 TFT PvE rounds at fixed points, early ones near-guaranteed; Encounters trade risk for reward — T2/T3 — https://wiki.leagueoflegends.com/en-us/Teamfight_Tactics_%28game%29
- E6 Difficulty curves: exponential suits endless/score and guarantees a wall; hybrid exp-HP / linear-dmg common — T3 — https://www.abratabia.com/game-design/difficulty-curves.php · https://steamcommunity.com/app/2356780/discussions/0/4635988522932680277
- E7 RotMG adaptive boss HP from a measured input — T3 — https://realmeye.com/wiki/hp-scaling
- E8 DDA critique: lowering boss stats can mask design flaws — T3 — https://www.wayline.io/blog/dynamic-difficulty-adjustment-participation-trophy
- Gap: no T1 source on auto-battler boss scaling formulas; every formula below is a design guess to be measured with bossrun.

## Round 1 — key points
- A Dana: one curve Power(k) = base × share_i × g^(k−1); per boss only share, weakMult, resistMult (~3 + ~5 globals); later each rule gets one 0–1 intensity, phases ADD a rule instead of replacing; auto-solve weak/resist; cap weakMult ≈ +150 %.
- B Kai: rewrite each kit as 3 verbs (signature · punish · phase-3 twist); weak/resist come from mechanics (weak tribe bypasses the signature, resisted tribe is countered); one capped global weak multiplier; k3+ adds a named mechanic (Hades-style); exactly 1 hard-control per kit; leave-one-out sim per verb.
- C Mali: "three-dial boss" (Power · Weak-hit · Resist) + ~3 globals ≈ 21 numbers; rules fixed as identity recipes; calibrator: owner types target win %, tool solves and explains "why"; named modifiers past k2.
- D Rex: fix the tribe layer first (boss problem is partly a tribe problem); shared g^(k−1) to k3 then linear; calibrate only hp/atk/weakMult; watch match length; validate k3+ with ≥ 12,000 runs; REJECTS scaling bosses to player power (rewards a deliberately weak board, E8).
- E Sora: template + "Heat" budget — ~4 identity knobs per boss; Heat(k) = H1 + s·(k−1) buys modifiers from a fixed shared ladder; global weak/resist; one auto-bisected power trim per boss; hybrid curve HP × g^(k−1), atk × (1 + a·(k−1)); max 3 rules per boss; fixed reference team set.

## Round 2 — debate highlights
- Calibrator attacked by B, D, E: a solver aimed at weak/resist targets absorbs the tribe leak into boss numbers (สายฟ้า weak everywhere → extreme resist values) → a later tribe fix silently breaks all 6 bosses; ±0.9 pt noise at n=3000 makes bisection jitter; weakMult becomes a free crutch again (E8). Fix proposed: solve ONLY overall power, cap weak, calibrate against a fixed reference team set.
- Mechanic-based weak/resist (B) attacked by A and C: unmeasured, removes the owner's slider (a fix becomes code work), and a single global weak value can't land all bosses (B5 +50 % → 89 vs B1 +300 % → 78).
- Adopted across experts: tribe baseline on a neutral boss / fixed reference teams (A, C, D, E) · weak cap ≈ +150 % (A, E) · max 3 rules per boss + shared modifier ladder at k3+ (B, E) · leave-one-out test per rule (B, D).
- Final picks: A one curve + 3 knobs + auto weak/resist after baseline · B answer-kit rewrite + capped global weak · C three dials + calibrator + baseline · D tribe layer first, then curve + 3 knobs, calibrate afterwards · E template + Heat ladder + global weak/resist + power trim.

## Ranked ideas (1–5; Effort 5 = cheapest; Risk 5 = safest)
| # | idea | Impact | Fit | Effort | Risk | Evidence |
|---|---|---|---|---|---|---|
| 1 | One shared curve for all bosses: strength = base_i × g^(k−1) (option: HP exp, atk linear; cap growth after k3) → retire per-boss mult10 + endlessPct (12 knobs → 1–2 globals) | 5 | 5 | 4 | 4 | measured (6 curves) + E6 T3 |
| 2 | Tribe baseline read-out: each tribe's win % vs a neutral boss / fixed reference teams, shown next to boss results; boss targets read relative to it | 4 | 5 | 3 | 5 | measured leak + T3 |
| 3 | Kit cap: ≤ 3 rules per boss (signature · punish · twist), phases ADD one rule instead of replacing whole lists, 1 hard-control max, leave-one-out test per rule | 4 | 4 | 3 | 4 | measured (cdSlow) + E3 T1 |
| 4 | Weak/resist normalized: one global default + per-boss override, weak capped ≈ +150 % | 3 | 4 | 5 | 3 | measured (no tracking) |
| 5 | Calibrator (small sim solver): owner types target win %, tool solves ONLY overall power per boss against fixed reference teams, shows "why" | 4 | 3 | 3 | 2 | E2 T1 (metrics) · conflicts "prefer instructions over scripts" |
| 6 | Shared named-modifier ladder for k3+ / extra matches (Heat): same readable modifiers stack on every boss instead of only more HP | 3 | 4 | 3 | 3 | E3 T1 · E4 T2 |
| 7 | Fix the tribe layer first (สายฟ้า / อสูร) before boss work | 4 | 3 | 2 | 3 | measured; HARD RULE 6; touches normal rounds |
| 8 | Answer-kit rewrite: weak/resist through mechanics (see minority) | 4 | 3 | 1 | 2 | guess (unmeasured) |
| 9 | One 0–1 intensity knob per rule (code derives values) | 3 | 3 | 2 | 3 | guess |
| ✗ | Scale bosses to the player's board power | — | — | — | — | rejected by A D E: rewards a weak board, masks flaws (E8) |

## Consensus · disagreement · minority
- Consensus: one shared curve (#1) · keep 1 identity rule per boss and test rule-off · tribe leak is the biggest risk · do not scale bosses to player power.
- Open disagreement: calibrator now (A, C, E) vs only after the tribe layer is fixed (D) · weak via multiplier slider (A, C, D, E) vs via mechanics (B).
- Minority report (B Kai): weak/resist should come from mechanics, not a ×% number, so a player can SEE why fire beats the spirit boss. Draft kits (proposal, unmeasured):
  - B1 เหล็กกล้า (weak สายฟ้า): Plating — every 3rd hit taken drops to 1; shock ignores plating.
  - B2 ภูติ (weak เพลิงเผา): Mend Pulse — heals X % per pulse; burn blocks the heal.
  - B3 อสูร (weak ภูติ): Rage Meter — atk up per hit taken; heal teams out-sustain it, อสูร burst feeds it.
  - B4 สายฟ้า (weak เหล็กกล้า): Static Chain — every 3rd hit shocks the attacker; armor negates it.
  - B5 วายุ (weak อสูร): Evasion Charges — first N hits per bar miss; big hits burn charges fastest.
  - B6 เพลิงเผา (weak วายุ): Scorch Aura — burn stacks on the front unit; fast teams end it before stacks matter.
  Why it might still be right: today the weak multiplier carries the balance and the rule lists barely move results — a readable "answer" is what a player can build toward. It can ride on top of #1 + #4 (multiplier kept as a capped safety net).

## Recommendation (moderator)
- A1 (recommended) "curve + baseline first": #1 shared curve + #2 tribe baseline read-out + #4 weak cap/global default. Small code (stage.js bossMult, Balance Room fields, bossrun report), knobs ~300 → ~150 at once (curve knobs gone), then measure. Rule change → skill `rule-change`; values → `balance-import` (HARD RULE 6).
- A2 "A1 + kit cleanup": also #3 (≤ 3 rules, phases add) and rewrite the 6 kits around one signature rule each (Kai's drafts as a starting point). Knobs → ~30–40. Bigger: C-17 doc + Balance Room + re-measure all bosses.
- A3 "full Heat system": A2 + #6 shared modifier ladder for k3+/extra + #5 calibrator. Most dynamic, most code; calibrator needs approval as a new tool.
- Side effects: retiring mult10/endlessPct changes k2/k3 strength of every boss → re-measure; Balance Room config/main.stage holds old boss fields (set 167 B1 stale-stage cleanup still pending); C-17.5 rule list doc changes for A2/A3.

## Cost used
5 experts × 2 rounds (sonnet), 6 web searches.
