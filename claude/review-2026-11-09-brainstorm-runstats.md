# Brainstorm — run-end stats for judging character strength (set 165, 9 Nov)

**Question (user):** after one run ends, what data should be recorded/shown so the owner can most easily judge which characters are too strong / too weak? What is missing, what is unnecessary?
**Success:** spot a strong/weak character in < 1 min on a phone, numbers not misleading, small build/maintenance cost.
**User picks:** A2 standard (5 experts, 2 rounds) · B3 compare the options we already have · C none.
**Note:** experts are simulated (same model, sonnet); diversity comes from role, bias and evidence only.

## What exists now (options compared)
- **O1** game end-of-run screen: result, wins/hearts/rounds, final team (+ perm stats), W/D/L, best streak, avg match seconds, **top-3 damage**, local history, replays.
- **O2** run code (ARUN1) → runlog viewer: full journal, gold flow, anti-cheat replay. Per run only, never pooled.
- **O3** Balance Room วิเคราะห์ (bot sim): win rate per character, tribe tier lift, boss, rune lift.
- **O4** Balance Room รันจริง (บอท): per character fielded, damage dealt by source, taken, HP lost, armor blocked, heal/armor given, kills, survive %, rarity, stronger/weaker-than-tier flag, low data < 30.
- **O5** match analysis tab (one match in detail).
- Fact checked in code: ARUN1 already stores both full teams of every match (save.js replayEntry) → "fielded in which match + W/L" is derivable with no new capture.

## Evidence pack
- E1 Auto Chess dev log (T1, 2020): selection rate, retention rate, synergy rates, not win rate alone — https://ac.dragonest.com/en/news/detail/e62cec9e805
- E2 VALORANT balance process (T1): non-mirror WR = best power proxy but selection bias; data is diagnostic, cross-check with players — https://playvalorant.com/en-us/news/dev/trust-the-balance-process-data-and-insights/
- E3 Hearthstone Arena balance (T1): bucket cards by WR AND pick rate — https://playhearthstone.com/en-us/blog/22788308
- E4 Clash Royale designer GDC talk (T2): use rate + WR, but intuition; ask WHY popular — https://www.gamedeveloper.com/design/-i-clash-royale-i-s-card-balancing-guru-leans-less-on-metrics-more-on-design-intuition
- E5 HSReplay stats (T2/T3): "played WR" biased (played when already winning) — https://hsreplay.net/articles/4/mulligan-luck-arena
- E6 MetaBot StS2 (T3): pick + WR + lift vs average; small samples (3–16 runs) give fake extremes — https://metabot.gg/en/slay-the-spire-2/cards/win-rate
- E7 Blizzard Overwatch Stadium (T1): pick + WR per hero, shift after nerfs — https://news.blizzard.com/en-us/article/24197406/

## Panel + round 1
- **Mira** (systems designer): make O4 the one screen, single "power" = lift vs average + fielded + chip; per-char ledger in ARUN1; pooled codes human vs bot.
- **Dev** (statistician): character board = pick rate, fielded WR, lift, bot WR beside it; pool codes; record end cause + rune picks + active tribe tiers. Skip buy/sell counts, gold, bench time.
- **Noi** (owner / phone UX): verdict list with badge TOO STRONG / OK / TOO WEAK / NOT ENOUGH DATA + 1-line reason, tap for detail; per-char card in run; pool with 30-match floor.
- **Kai** (skeptic): trim O4 to ~5 columns + verdict; dominant low-sample warning; only add "what ended the run"; no pooling page for tens of runs; O3 + O4 must agree before any change.
- **Rin** (sports scouting): plus-minus = fielded-win lift from ARUN1; pooled table in runlog viewer; "lost to round X / boss Y" line.
- All 5 agreed: cut top-3 damage as headline (favours damage dealers, hides tanks/healers) · every % shows N, grey < 30 matches · use lift vs average, not raw fielded WR (E5 bias) · pair fielded/pick rate with WR.

## Round 2 highlights
- 4 of 5 attacked Kai's "no pooling + bot must agree": O3 and O4 are both bot data → not independent; humans are the only independent check; pooling is a cheap parse loop over existing codes (~30 runs ≈ 300 matches).
- Kai attacked the "human vs bot disagree" flag: with tens of runs it fires from noise → only allowed above the 30-match floor and worded "look, don't change". Panel accepted this.
- Dev: never mix baselines in one column (human lift = vs the run's own WR · bot lift = vs tier average).
- Mira: record active tribe tiers + runes, else lift blames the character for its tribe/rune.
- Everyone moved the per-char run card from effort M → S after the ARUN1 fact. Kai softened: accepts a human lift column, secondary only.
- Rin's order: verdict chips on O4 → lift column → pooling.

## Scores (1–5; effort 5 = cheapest)
| Idea | Impact | Fit | Effort | Risk (5 = safe) | Evidence |
|---|---|---|---|---|---|
| I1 Verdict badges on O4 (strong/ok/weak/low data + reason), fold extra columns | 5 | 5 | 5 | 4 | T1 E1/E3/E7 |
| I2 Low-sample guard everywhere (N shown, grey < 30) | 4 | 5 | 5 | 5 | T3 E6 + common sense |
| I3 End screen: replace top-3 damage with "ended by round X / boss Y" + per-char card (fielded, W/L, level) | 4 | 5 | 4 | 4 | T1 E2/E4 (ask why) |
| I4 Lift vs average instead of raw WR | 4 | 4 | 4 | 4 | T2 E5, guess (sabermetrics) |
| I5 Pool many run codes (runlog viewer) + human vs bot lift + "look, don't change" | 3 | 4 | 3 | 3 | T1 E2 · weak while runs are few |
| I6 Record active tribe tiers + rune picks per match | 3 | 4 | 4 | 4 | T1 E1 (synergy rates) |
| I7 buy/sell counts, gold per char, bench time | 1 | 2 | 3 | 3 | none — all experts cut |

## Consensus / disagreement / minority
- **Consensus:** I1 + I2 + I3 + I4 first; cut top-3 damage headline; skip I7.
- **Open disagreement:** who is the judge — bot data (Dev, Kai) vs human runs as an independent check (Mira, Noi, Rin). Middle ground taken: bot = verdict badge, humans = a "disagree → look, don't change" flag only above 30 matches.
- **Minority report (Kai):** no pooling page yet — with few testers it will mostly say "not enough data"; build it only once there are ~30+ human runs. Might be right: cost is small but the page could be empty for weeks.

## Recommendation
- **A1 (recommended):** phase 1 = I1 + I2 + I4 in the Balance Room รันจริง (บอท) tab · I3 on the game end screen (+ I6 stored for later) · phase 2 (when ~30 human runs exist) = I5.
- **A2 (lean, Kai):** I1 + I2 + only the "ended by" line; no per-char card, no pooling.
- **A3 (full now):** A1 + I5 pooling page in the same set.
- Side effects: thresholds of the badges are numbers → owner decides (HARD RULE 6 style, ask first) · UI → skill ui-work · end screen change touches the game page + run code (I6 = ARUN1 version bump) · no game values change.
