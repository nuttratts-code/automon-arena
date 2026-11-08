# Workflow audit round 2 — deeper check (8 Nov 2026, set 153 · report only, nothing changed)

Round 1 (set 152): claude/archive/reviews/review-2026-11-08-workflow-audit.md. Round 2 also checked the docs against the code (src/tools/bootstrap.mjs, src/tools/cfgcode.mjs, src/lab/*, .github/workflows/tests.yml) and the review files under claude/.

## F. The 🔒 lock line is only in a topic file (gap)
relay.md requires a lock line right after reading the Relay, but CLAUDE.md "Start of every chat" (Git workflow) does not mention it, and relay.md opens only for WIP / publish / Relay work. Evidence: chat set 152 skipped it.
- F1 (rec): add "→ push the 🔒 lock line (relay.md)" to CLAUDE.md "Start of every chat".
- F2: drop the lock line (only one account works at a time anyway).

## G. Set 152 rule "CI green before publish" cannot always be met
CI skips docs-only pushes (tests.yml paths-ignore claude/**, art/**, *.md). If the newest main commit is docs-only (e.g. a Relay line), that commit has no CI run at all.
- G1 (rec): "the newest CI run on main for a commit that changed code must be green, and no code changed after it".
- G2: drop the CI check before publish (the publishing chat runs the gate itself anyway).

## H. Two run tools do not use the shared run flow (doc vs code)
measure.md §00 (set 151 W5): runerun, bossrun, econ55, charstat and Balance Room รันจริง take runs from `lab/analyze.js runPlayStats`. Code: runerun, bossrun, bossres and the Balance Room do; **econ55.mjs and charstat.mjs still call `simRun` with their own loop.** Their numbers can drift from รันจริง (the same problem as sets 138/140).
- H1 (rec): log as a code task in "งานรอรวม"; move both to runPlayStats in the next code set (setup + gate as usual), proving same output first.
- H2: write an exception in measure.md (measure-only tools may keep their own loop).

## I. Pre-import check ① vs an old results/latest
ops-rules ① + measure.md §0: results/latest.edits must equal the saved config; cfgcode.mjs prints MATCH/DIFFERS (exit 1 on DIFFERS). handoff State: results/latest is still the set-49 measure and live numbers now come from runerun (set 138). Not written anywhere: must the user press "วิเคราะห์" before 💾 when only runes / bosses / rules changed? And when characters changed?
- I1 (rec): ① applies only when character or tribe values changed (user presses วิเคราะห์ then 💾); stage/rules-only imports skip it (cfgdiff in HARD RULE 6 is the check).
- I2: ① always applies (current text, strict).
- I3: drop ① (live numbers come from runerun).

## J. Review files out of order
reviews.md rule: open reviews stay in claude/, decided ones move to archive/reviews/ and get a row. 8 files in claude/ have no row:
- **Waiting for the user, not in handoff "Open decisions":** review-2026-11-08-runenames.md (rune names DRAFT v2) · review-2026-11-08-runetext.md (rune text rewrite DRAFT).
- Done (applied/report only) but not archived: boss-resisted (set 149) · cfgdiff-rev38 · cfgdiff-rev39 · r3-rounding (set 147) · runes (set 144) · skilltext (applied set 142) · weekly (set 151).
- J1 (rec): archive the 7 done files with rows; add the 2 drafts to reviews.md (open) and to handoff "Open decisions".
- J2: leave as is.

## K. Small stale items (wording only)
- handoff State "bot teams 360 (set 89 …)" — botteams.md: 228 teams since set 99.
- handoff Links "main account only" — the runlog viewer is owned by the 2nd account (same line says so).
- handoff Relay line "Set 142b todo DONE" — finished item, belongs in the archive (Relay = newest 2 sets).
- botgen time: balance-import §0 step 4 "~6.5 min" vs botteams.md §13 "~13 min".
- cfgdiff file name: CLAUDE.md / balance-import use `review-YYYY-MM-DD-cfgdiff.md`; two runs on one day collide (sets used `-rev38`, `-rev39`) → name `review-YYYY-MM-DD-cfgdiff-revNN.md`.
- The merge-gate rule is written out in 4 places (CLAUDE.md HARD RULE 3, ops-rules, publish.md §9, setup.md §1) → set 152 had to edit 3 of them; drift risk. Keep the full text in CLAUDE.md, the others point to it.
- K1 (rec): fix all of K. K2: leave.
