# Full system test + review (31 Oct 2026, main 05d26d1)

Status: report only — **no code changed**. User picks which suggestions to do.

## What was run
| Test | Size | Result |
|---|---|---|
| Merge gate (build + unit tests + ui_smoke on built pages) | 232 tests · 231 UI checks × 2 screen sizes | **GATE: PASS** (tests 101 s · ui_smoke 195 s) |
| Shop/save fuzz: random buy/sell/move/reroll/lock + fights + endMatch | 1,500 runs · 454k actions · 15k matches | 0 problems (failed actions never change state, gold never < 0, every state passes validateRunState, save/replay/history round-trip OK, battle deterministic) |
| Battle fuzz: random teams 1–6 units, Lv1–3, 25% with big random perms | 20,000 matches | 0 crashes / NaN / bad winner · max 191 s · 0 aborted |
| Side fairness: same team both sides / A-vs-B then B-vs-A | 3,000 + 3,000 | mirror = 100% draw · swap mismatch 0.00% (no side bias) |
| Bad-data fuzz: cleanStage, readSave, readHistory, parseCfgCode, parseMatchCode | 5,000 + 15,000 inputs | cleanStage never throws, always idempotent, boss phases always valid · parsers reject with a clear error (by design) |
| Quick economy probe: simRun bot-vs-live-bot | 400 runs | see "Economy signals" |

## Bugs found
- **B1 (tiny, display only):** system-check page (`check.template.html` "proposed values" list) still says tribe bonuses 2/4/6 "counted but no effect yet" — tribe bonuses are live in battle.js. Fix = delete/reword that line.
- No bugs found in game logic (shop, merge, charges SF-7, save, replays, battle, stage clean).

## Code nits (no player impact now)
- N1 `save.js` charges length check uses literal `6` and `si ≤ 5`; `bot.js arrange` uses `6`/`slice(0,6)` — should read `rules.maxBoard` (matters only if board size changes).
- N2 `cleanStage`: a boss entry missing fields falls back to the **code** boss (STAGE_BOSSES), not the user's confirmed values in stage-user.js. Only hits partial/old data.
- N3 `reroll`/`buy`/`sell` don't refuse when `st.over` (UI blocks it; core should too for MVP2 server).
- N4 Bot B's `lastWon` copies the player's (bot gets win bonus when the player wins) — consistent in game, simRun, tests → intentional "mirror economy"; just undocumented in shop-merge-rules.

## Economy signals (input for step 5.5, bot plays both sides — not final)
- Median run 14 rounds, median 10 wins, 207/400 runs reach 10 wins.
- Gold left at fight: median 2, max 54 (bot sometimes hoards).
- Only 22/400 runs ever field a Lv3 unit (median first at round 10) → bot merges poorly *or* Lv3 is too hard to reach; matters for Q4 (bot as reference player).
- **Storm in 25.5% of these late-run matches** (check-page target < 5% is for fixed-level teams) → fights get long as permanent stats pile up.
- Uncapped permanent stats reach: atk +190, hpPct +200%, armor +145, cdPct 135% (past 100 → cooldown pinned at the minimum), burn 63, shock 4. Supports measuring permanents first (economy option C or A).

## Workflow suggestions
- W1 Cloud env: python playwright is missing at start → every gate pays a pip install. Add `pip install playwright` to the environment setup script (user does it in environment settings).
- W2 Answer economy Q1–Q4 (claude/review-2026-10-31-economy.md) — MVP1 28 Nov; 5.5 target 14 Nov is 2 weeks away and no code started.
- W3 Add the shop fuzz above as a permanent test (cheap: ~200 runs ≈ 5 s) so future shop/save changes are checked automatically.
- W4 Process docs are heavy (CLAUDE.md 9.6 KB + handoff 6.6 KB read every chat; combat-rules/build-plan ~57 KB each). handoff Relay block has grown past "1 screen" — trim it to current state only.
- W5 13 merged claude/* branches still on GitHub — user deletes them on github.com.

Scripts used (not committed): fuzz.mjs, fuzz2.mjs, econ.mjs in the session scratchpad; W3 would commit a trimmed version.
