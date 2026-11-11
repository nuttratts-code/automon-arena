---
name: merge-code
description: Automon Arena merge of a code branch into main (รวมเข้า main / merge / ส่งโค้ด / เทสต์ผ่านแล้ว) — setup until all unit tests pass, then the full gate ONCE, merge, push, CI check, Relay line, then close-out. Use whenever a set changed anything under src/ (or other non-docs files) and the work is ready. Rules live in CLAUDE.md HARD RULES 2/3/5 + claude/workflow/setup.md §5 and win if anything differs.
---
# Merge code to main (set 158 — skill from HARD RULE 3 + setup.md + relay.md)

Docs-only commits (claude/, *.md, .claude/skills, Relay) skip this skill and go straight to main.

1. **New files:** every new file in src/core or src/game is in `CORE` in src/build.mjs in the same commit (HARD RULE 2): `git diff --name-status origin/main...HEAD -- src/core src/game | grep ^A` → each one grep'd in src/build.mjs.
1b. **UI check (set 158 A1):** `git diff --name-only origin/main...HEAD | grep -E '^src/(game/|lab/balance/|.*\.template\.html)'` lists files → the `ui-work` skill must have run in this chat (design skill + screenshots 1100/390 looked at). Not done → do it now, before the gate. Relay line gets `UI: design skill ✓ · shots ✓`.
1c. **Ripple check (set 186 A1, claude/workflow/ripple.md):** every changed id/name/text/value/field grep'd across src + claude docs + tests (old spelling too) and the ripple.md map row walked; each commit message carries its `ripple:` line. Missing → do it now. Relay line gets `ripple ✓`.
1d. **Security (HARD RULE 9, claude/workflow/security.md):** `git diff origin/main...HEAD | grep -inE 'api[_-]?key|secret|token|passw|bearer|BEGIN .*PRIVATE'` → empty or explained · any new dependency/asset/font/addon has source + licence + credit + user OK in the commit message · external input validated (HARD RULE 7).
2. **Catch up:** `git fetch origin` → `git merge origin/main` into the branch (never rebase/force-push). Conflicts in another chat's work → tell the user.
3. **Setup until pass:** `cd src && node tools/bootstrap.mjs setup` (~3 min). Read failures only. While fixing, `node tools/bootstrap.mjs test <word in test name>` runs just the related tests. Fix only with the cause known (HARD RULE 5, skill `find-cause`); repeat setup until ✅. Never use the gate to find test failures.
4. **Gate once:** `node tools/bootstrap.mjs gate` (~4 min; skips unit tests if setup passed on the exact same files < 6 h ago; `gate --full` forces). Need `GATE: PASS` with `FAILS [] ERRORS []`. ui_smoke cannot run → `pip install playwright` (cloud uses /opt/pw-browsers/chromium); still impossible → tell the user in Thai and wait. FAIL → do not merge, find the cause, tell the user.
5. **Merge:** `git checkout main && git pull && git merge --no-ff <branch> && git push origin main` (cloud session: also push the session branch). Nothing else changed since the gate — if main moved, merge again and re-run step 3–4 on the new files.
6. **CI:** GitHub MCP `actions_list` (owner's PC without gh/MCP: skill `ci-check`) → the run for the merge commit on main is green (needed before any publish, set 153 G1). Red → find the cause, do not publish.
7. **Relay (docs-only on main):** set line = branch → main <short sha> · GATE: PASS (tests x/x · ui_smoke x/x) · UI note if step 1b applied · `ripple ✓` · values changed or not · publish or not.
8. **Next:** publishing in this set → `publish-pages` skill. Then `close-out` skill (HARD RULE 1: merging a code branch triggers it).
