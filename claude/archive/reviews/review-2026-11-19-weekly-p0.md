# Weekly review 12–19 Nov — part 0 (first run, set 250 R2/S1)
n**DECIDED (owner, set 250):** X1 = hygiene warnings in .claude/hooks/session-start.sh (applied; next part 0 checks whether F/H repeat) · T2 = itch.io waits for the 3D scene (set 205 kept) → Claude warns mid-December if step 8 is not done.

Numbers = estimates from `git log` on origin/main (commit subjects, not real time spent).

## 1. Plan vs deadline (MVP1.5 = 31 Dec 2026, 6 weeks left)
- plan-godot-migration: steps 1–7 done (sets 190–202: all logic exact vs JS + every screen). Open: **8** 3D scene (pulled forward by owner set 205 B2; arena look samples sets 216–239, r38 port not started) · **9** itch.io upload (web build + zip ready since set 203; waits for step 8 by owner pick) · **10** workflow docs.
- MVP1.5 scope (set 193 C1) = Godot plays like the web game + on itch.io; **art P5 not counted**. So the target itself is reachable now; only step 9 needs the owner (create page + upload).
- This week no plan step moved: godot/scripts 8 commits (last week 33); work went to art samples, asset hub, docs.
- **Risk:** if the r38 port + art rounds run past mid-December, itch.io slips past 31 Dec. Cut option: upload the current build as a Draft now (set 205 lets the owner order it), keep improving art after.

## 2. Numbers (this week vs last week)
| | 12–19 Nov | 5–12 Nov |
|---|---|---|
| commits on main | 276 | 760 |
| rework (fix/follow-up/undo/redo/revert/again/wrong) | 23 = 8 % | 46 = 6 % |
| landed (touch godot/ src/ tools/) | ~31 = 11 % | ~257 = 34 % |
| art/ commits | 49 | — |
Open decisions older than 7 days: econ55 · rune names v2 · rune text · runerun3000 (all 8 Nov, 11 days) · project audit set 180 (10 Nov, 9 days).

## 3. Did last week's fixes work? (review-2026-11-13-weekly A–I)
| Item last week | Again this week? |
|---|---|
| A sample branch on main · B lost skill · C samples in the repo | no (samples stayed in automon-scratch) |
| E `ripple:` line missing | **yes** — set 240 follow-ups (38089a8, round 1 C) |
| F review hygiene | **yes** — 2 reviews without rows (round 1 F), 4 decided reviews not archived (round 2 H) |
| G doc versions / Thai summary stale | **yes** — instructions.md stale (round 1 E) |
| H handoff > 1 screen | **yes** — 13.6 KB (O1 this round) |
| D content missing from a commit | not shown |
Four items repeated → text rules are not enough for them (§3b "missed twice").

## 4. One experiment for next week (recommended)
**X1:** add 3 warning lines to the existing SessionStart hook (.claude/hooks/session-start.sh, prints at every chat start): handoff.md size > 9 KB · decided review files still in claude/ · `open` reviews older than 7 days. No new rule text; a printed warning each chat instead. Next week's part 0 checks: did F/H repeat?
**X2:** no hook; close-out skill gets a hygiene step (text again — failed twice).
**X3:** nothing.
