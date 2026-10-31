# Automon Arena code workflow (index)

V1.27 · 31 Oct 2026 (handoff headings match the real file; Jules removed) · V1.26 · 28 Oct 2026 · translated to English + adapted for the git repo · read only when about to edit code · **open only the sub-file for the job at hand** · history V1.1–V1.21 → claude/archive/workflow-V1.21-full.md (stays in the Project, not in the repo)

| Job | File | Old sections |
| --- | --- | --- |
| Set up code, tests, build, git, docs, csv | claude/workflow/setup.md | 1 2 5 |
| Publish, test pages, two-level checks (find cause before fixing · ui_smoke once) | claude/workflow/publish.md | 3 4 9 9.1 |
| Balance measuring, permission, subagents, proving a mechanic is unaffected | claude/workflow/measure.md | 12 6 11 |
| Bot teams, run length, replays, play data | claude/workflow/botteams.md | 13 14 |
| Import values from the Balance Room (ArtifactData) | claude/workflow/balance-import.md | 8 |
| Character/skill data format | claude/workflow/data-format.md | 7 |

## Task set (rule 10 · always)
- 1 task set = decide → edit → test → publish once. Ask all decision questions at once as multiple choice; do not start heavy work until answered.
- **Keep bug-fixing separate from value-import sets.** Import set = import → check → measure → publish. A bug that does not block → note in handoff. A blocking bug (tests fail) → ask the user: A fix in this set · B revert the values that broke it and publish the rest.
- No publishing mid-set for small edits. End of set → update handoff.md.
- Save context: do not search for a file you are about to read; do not read tools the job does not use.

## Code safety
- Everything from outside the code must be validated before use (type, range, integer): player input · save files · Balance Room values (db config/main, ideas, results/latest, simTeams) · characters.csv · bot teams. Invalid = reject/report, never crash.
- No innerHTML with external text (use textContent) · no eval/new Function · no scripts from other sites.
- MVP1: validate saves on load (format, ranges, version); invalid = clear or report.
- MVP2: battle results, gold, rewards are computed server-side only · `core/` must never call UI code (`game/`, `lab/`) so it can move to a server.

## Token saving
- Rule docs: `grep -n '^##.* C-6' claude/combat-rules.md` and read only that section (IDs C-/T-/S-) · edit with scripts/Edit, never retype whole files · add new sections at the end, never renumber existing IDs.
- Character values: `grep '^PL-3,' claude/characters.csv`, never print the whole file.
- Use bootstrap summaries for test/measure/ui_smoke; no raw output. Screenshots only when checking a visual problem.
- Subagents use more tokens overall → propose only when the main chat would otherwise fill up (measure.md 11).
- Long chat mid-set → update handoff and tell the user to open a new chat.

## handoff.md (same headings every time · status only · ≤ 1 screen)
Relay (first line "บาลานซ์: กำลังปรับ/เสร็จแล้ว" · account + branch · last done · decisions · next step · open · publish versions · artifact access) → State (durable facts) → Pending bundle ("งานรอรวม") → Doc versions → Links → File index. Proposed-but-unmeasured values live in pending.md.

## Other docs
- claude/backlog.md — parked work, not opened until picked up.
- claude/archive/ — history, old measurements, decision reasons (in the Project only; open when the user asks "why").
- CLAUDE.md (repo root) — standing instructions. (Jules/Gemini cancelled 28 Oct; old brief in archive/GEMINI-jules-cancelled.md.)
