# Brainstorm — in-game log for owner + friends' play (set 175, 10 Nov)

**Question (user):** how should the log system on the game work when friends or the owner play? **User picks:** A2 standard (5 experts, 2 rounds) · B2 run log + B3 delivery to owner (user will give friends Editor rights) · C2 ranked list.
**Note:** experts are simulated (same model, sonnet); diversity comes from role, bias and evidence only. Web evidence = search summaries, not page reads → numbers unverified.

## What exists (checked in code/handoff)
- Run journal (set 109, core/runlog.js): every action + gold before→after, deterministic replay from seed, db `runlogs/<seedhex>-<startMs>` + ARUN1 run code, player name (≤20 chars), `DATA_HASH` already stored as `L.data` (run.template.html:1132). Viewer: lab/runlog.mjs + runlog page (set 110). Public-link friends cannot write to db → send the run code.
- Missing: any human signal ("why"), a readable build/ruleset label (only a hash), an owner phone digest, a friend-facing "what is sent" notice.

## Evidence pack
- E1 T3 opengamedata docs — missing build/version in payload, no failure context = classic mistakes — https://opengamedata-doc.readthedocs.io/en/latest/guides/engineer/logging/setup/index.html
- E2 T2 Game Developer, Telemetry-Supported Game Design — data shows what, not why; pair with a playtest question — https://www.gamedeveloper.com/design/telemetry-supported-game-design
- E3 T3 bugnet.io — log commands + seed; checksum finds drift; engine change invalidates old replays — https://bugnet.io/blog/how-to-build-a-session-replay-system-for-game-debugging
- E4 T2 Game Developer, replay system — https://www.gamedeveloper.com/programming/what-just-happened-creating-a-replay-system
- E5 T3 Slay the Spire community tools (run files uploaded/parsed) — https://ststracker.app/about
- E6 T3 bugnet.io GDPR — per-person opt-in, collect minimum, say what is collected — https://bugnet.io/blog/crash-reporting-gdpr-indie-games

## Panel + round 1 (all five converged)
- **Mira** (telemetry): version stamp + 1–2 tap "why"; one-button Copy my run; phone digest.
- **Noi** (owner phone + casual friend): one-tap Send my run (feeling inside); digest card ~6 lines; version + "which round felt unfair".
- **Kai** (skeptic): feedback + copy card; version/rev/checksum; digest only after the owner names a question; Editor risk.
- **Tan** (scope realist): version+hash stamp; feeling prompt; digest-lite reusing viewer; do NOT build server/email/new path.
- **Pim** (wildcard): feelings stamp pinned to a round; version+checksum; digest later; show friends what is sent.

## Round 2 highlights
- Consensus: stamp + 1-tap feeling + show-what-is-sent line + nickname-only. Digest demoted to "second / only after a first real friend session" (4 of 5 moved).
- Disagreement 1 — delivery: Copy-my-run as main (Noi, Mira, Tan) vs auto-write as main for Editor friends, copy as fallback (Pim).
- Disagreement 2 — Editor rights: scoped logs db/path (Noi, Pim, Kai) vs "pack shows no per-path rights; separate db = new artifact to maintain; use backup + copy path" (Mira, Tan). Unknown fact: can the db scope rights? Not verified.
- Checksum: Pim/Mira(A) for, Kai/Tan/Noi defer until drift shows.
- Minority report (Kai/Pim/Tan): with 2–3 friends, a digest is wasted work — talk to them with the round number the feeling tap gives you. Likely right at current scale.

## Score (1–5; effort 5 = cheap)
| Idea | Impact | Fit | Effort | Risk | Evidence |
|---|---|---|---|---|---|
| I1 Readable build + AMCFG1 rev label in head/ARUN1 (hash exists) | 4 | 5 | 5 | 5 | T3 E1/E3 |
| I2 End-of-run 1-tap feeling + optional round pick (stored in run) | 5 | 4 | 4 | 4 | T2 E2 |
| I3 "What is sent" line + nickname default, no free text | 3 | 5 | 5 | 5 | T3 E6 |
| I4 Copy-my-run button on end screen (check what exists first) | 4 | 5 | 4 | 5 | fact |
| I5 Auto-write to db for Editor friends | 3 | 3 | 3 | 2 | guess |
| I6 Owner digest list (1 line/run, tap → replay), no pooled stats | 3 | 3 | 2 | 3 | T3 E5 |
| I7 State checksum | 2 | 2 | 3 | 3 | T3 E3 |
| I8 Backup runlogs before a friend test (owner step) | 3 | 4 | 5 | 5 | guess |

## Recommendation
- **A1 minimal:** I1+I2+I3 (+I4 if missing). All S. (recommended)
- **A2:** A1 + I6 digest-lite + I8.
- **A3:** A2 + I5 auto-write + I7 checksum.
Side effects: I2 is a new UI → skill ui-work (ask button questions first). No game values change. I5 needs the db-scope question answered.
