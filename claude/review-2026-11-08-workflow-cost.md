# Workflow cost review — tokens + speed (8 Nov 2026, set 139, docs only)

User asked: analyse the whole project workflow — where tokens are wasted, what to adjust, what is slow.
Measured on main c4d534c. Token counts are estimates (English ≈ 3.8 chars/token, Thai ≈ 1.3 chars/token).

## 1. Token cost (what Claude reads)

| # | Where | Size | Cost | Why it matters |
|---|---|---|---|---|
| T1 | claude/handoff.md | 35.9 KB, 63 lines (lines up to 3,000 chars) | ~9,500 tokens | Read at the start of EVERY chat. Its own header says "≤ 1 screen". Relay holds ~25 set entries (sets 118–138) + a Publish line that repeats every version. Only the newest 1–2 entries are ever used. Biggest single waste. |
| T2 | CLAUDE.md | 12.3 KB | ~3,300 tokens | Loaded into every chat. Contains rarely-needed detail (full Thai publish paste message, relay mechanics, button spec, rule history dates). |
| T3 | Close-out every ~15 turns | — | ~15–20k tokens per restart | Each new chat re-reads CLAUDE.md + handoff + the files for the task. With T1 fixed the restart cost halves. |
| T4 | Thai rule docs | combat-rules ~18k · build-plan ~15k · shop-merge ~14k · tribe ~5k tokens | Thai is ~3× more tokens per character than English | Reading one whole doc to check one rule costs 15k+. Must grep by rule id (C-/T-/S-) and read only that section. No line index exists today. |
| T5 | 39 review files + many relay archives in claude/ root | — | small per use | Glob/ls noise; finished reviews should live in claude/archive/reviews/. |

## 2. Speed (what makes a set slow)

| # | Where | Measured | Detail |
|---|---|---|---|
| S1 | Unit tests (tests/run.js) | 81 s for 319 tests | ONE test = 63 s (78%): t-validate.js "ทุกคู่สกิลที่หน้าบาลานซ์ให้เลือก ใช้งานได้จริงในตัวคำนวณ" = 10,276 skill combos × 3 matches = 30,828 simulated matches. No single combo is slow (max 51 ms); it is pure volume. validateConfig part is only 1.3 s. |
| S2 | matchStats at the end of run.js | 5.5 s | Prints match-length stats on every full run; it is not a test. |
| S3 | Tests run twice per merge | +~90 s | `setup` runs build+tests, then `gate` runs build+tests again before ui_smoke. GitHub Actions then runs the full gate a third time. |
| S4 | pip install playwright | every fresh container | Still pending user-side todo W1 (cloud setup script). |
| S5 | Actions on docs-only pushes | 1 full gate run per Relay commit | Every Relay/handoff commit to main and every branch push runs the ~5 min gate in Actions (free, but noise + a red X when flaky). |

## 3. Options (answer e.g. "A1 B1 C1 D1 E1")

- **A — trim handoff.md**
  - A1 (recommended): Relay keeps only the newest 2 sets + open WIP + pending; Publish line keeps only current versions; older entries → claude/archive/relay-2026-11-08-sets117-138.md. ~9.5k → ~2k tokens per chat. Add a rule: trim at every close-out.
  - A2: keep the newest 5 sets (~4k tokens).
  - A3: leave as is.
- **B — the 63 s test**
  - B1 (recommended): setup/gate run 1 match per combo with a rotating seed (~22 s, every combo still validated + fought once); full 3 matches only in Actions/`final`. Unit tests ~81 s → ~40 s.
  - B2: 1 match per combo everywhere.
  - B3: keep.
  - (rides along: move matchStats to `final` only, −5.5 s)
- **C — skip Actions on docs-only pushes**
  - C1 (recommended): `paths-ignore: claude/**, art/**, *.md` in .github/workflows/tests.yml.
  - C2: keep running on every push.
- **D — playwright in the cloud setup script (W1)**
  - D1 (recommended): Claude proposes the environment change with the environment tool (user just approves the prompt).
  - D2: user adds it manually in Settings.
- **E — CLAUDE.md + close-out**
  - E1: move rarely-used detail (publish paste text, relay mechanics, button spec) to claude/workflow/*.md, keep 1-line pointers; close-out at end of each set or ~25 turns instead of ~15.
  - E2: slim CLAUDE.md only, keep 15 turns.
  - E3: leave as is.
- Also (no decision needed, Claude does it): grep rule docs by id instead of full reads; move finished review files to claude/archive/reviews/ when A is done.

## DECISIONS
(pending user answer)
