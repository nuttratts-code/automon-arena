# Workflow audit — unclear / conflicting rules (8 Nov 2026, set 152 · DECIDED: user picked A1 B1 C1 D1 — all applied in set 152)

Scope read: CLAUDE.md · claude/workflow.md · claude/workflow/*.md · claude/ops-rules.md · claude/handoff.md · .claude/skills/close-out/SKILL.md · claude/instructions.md.
Labels follow replies.md. "Rec" = Claude's recommended option.

## A. Stale text / broken references (wording only — CLAUDE.md wins)
| # | Where | Problem | Fix (A1) |
|---|---|---|---|
| A-a | publish.md §3 lines 7–8 | Uses old tools `get_artifact` / `publish_files` / `slug` / `base_version` that no longer exist; relay.md uses `Artifact read` + publish `file_path`+`url`. Two different publish procedures. | Replace §3 "Who/How" with the relay.md procedure. |
| A-b | botteams.md §13 "Publish (V1.19)" | Third publish procedure (1st refused → cmp → 3rd passes) — old tool behaviour. | Delete the bullet, point to publish.md §3. |
| A-c | publish.md §3 line 7 | Points to "CLAUDE.md 'Publish workflow'" — moved to relay.md in set 139. | Point to relay.md. |
| A-d | publish.md §3 vs relay.md | publish.md: "publishing stays with the owner account (31 Oct)"; relay.md (set 59): any chat whose `Artifact read` says writer publishes; runlog viewer is owned by the 2nd account. | Keep relay.md rule (writer = may publish), drop the 31 Oct sentence. |
| A-e | relay.md line 10 vs close-out skill + handoff | Archive path `claude/archive/relay-*.md` vs `claude/archive/relay/`. All files are already in archive/relay/. | Use `archive/relay/` everywhere; no file move needed. |
| A-f | workflow.md lines 3, 41 | "archive … stays in the Project, not in the repo" — archive is in git now. | Remove "Project only". |
| A-g | measure.md §0 + §12 | "handoff item 4" / "handoff item 1" — handoff has no numbered items any more. | Say "Relay block". |
| A-h | setup.md §5 vs CLAUDE.md | "never commit code straight to main without the user's OK" vs "merge to main on GATE: PASS, no need to ask". | Rewrite: code reaches main only via merge after GATE: PASS. |
| A-i | balance-import.md §0 step 6 vs CLAUDE.md/setup/publish | gate "~9 min" vs "~4 min". | Use one number (measure next gate run). |
| A-j | instructions.md (Thai summary the user reads) | Still V4.0 (set 139); handoff says instructions V5.0. Missing set 150/151 rules: ask up front (A1), 3-line reply (B1), close-out skill, weekly review, 🔒 lock line. Its own header says Claude must redo it whenever CLAUDE.md changes. | Regenerate the 1-page Thai summary. |
| A-k | CLAUDE.md Language vs Reply format | "Start with what the user must do/decide" vs 3-line header whose line ① is "ทำแล้ว". | Say: the 3 lines come first; then details start with the user's to-do. |
| A-l | workflow.md "Task set" | "Import set = import → check → measure → publish" — Claude no longer measures on import (measure.md §0, user measures). | "import → check → publish". |

## B. Close-out trigger fires on docs-only commits to main (real conflict)
HARD RULE 1: close-out on **every merge to main** and "never continue into new work after it". But relay.md makes Claude push to main at the START of every chat (🔒 lock line), and balance-import §00 step 3 commits the cfgdiff review file to main mid-task. Read literally, every chat must close out right after it starts.
- B1 (rec): trigger = merge of a code branch to main · user says done/live · ~15 turns. Docs-only commits (lock line, Relay, review files) never trigger it.
- B2: keep as written.

## C. "~15 turns" vs "ask up front, then run to the end" (A1, set 150)
A1 says work to the end without stopping; HARD RULE 1 says close out at ~15 turns; workflow.md says "long chat mid-set → tell the user to open a new chat". No rule says which wins when a set is half done at turn 15.
- C1 (rec): at ~15 turns finish the current step, push, update Relay with a WIP branch + next step, then close-out (new chat continues the same set).
- C2: finish the whole set first, then close-out.

## D. Import order skips `setup` (conflicts with HARD RULE 3)
HARD RULE 3: run `setup` until it passes, then the gate ONCE — never use the slow gate to find test failures. balance-import.md §0 goes from targeted tests (step 3) straight to the gate (step 6), no `setup`. Sets 131 and 146 failed their first gate after imports.
- D1 (rec): add "`setup` until pass" before step 6.
- D2: import sets are exempt (gate directly).

## E. Other unclear points (need a decision, smaller)
- E-a CI: publish.md §9 + setup.md say "check GitHub Actions is green before merging"; CLAUDE.md merges on local GATE: PASS. Must Claude wait for CI? Rec: local GATE: PASS is enough to merge; check CI before publishing.
- E-b Stale 🔒 lock line: if a chat is cut by the usage limit, its lock line stays, and the next chat must "stop and ask". Rec: a lock line older than the last Relay set entry, or from the same account with no open WIP branch, may be removed with a one-line note.
- E-c Owner account input path: HARD RULE 6 always asks for an AMCFG1 paste; balance-import §0 step 1 / §8 reads config/main + results/latest from the db directly. Rec: AMCFG1 for both accounts (one path); the db read only for the results/latest fingerprint check when the account can read it.
- E-d Which branch for docs edits that are not Relay (CLAUDE.md, workflow/*.md, skills): straight to main or branch + merge? CI skips them either way. Rec: straight to main as docs-only (same as Relay).
- E-e Session branch vs CLAUDE.md: cloud sessions are told to push only to a session branch (e.g. claude/jolly-mccarthy-xetdve), while relay.md says Relay/lock-line commits go to main. Rec: in such sessions, push to the session branch and ask the user once whether docs may go to main.
