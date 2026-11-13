---
name: close-out
description: Automon Arena close-out block (HARD RULE 1; ปิดงาน / เสร็จแล้ว / ขึ้นแล้ว / จบชุด). Use when a code branch is merged to main (docs-only commits do not count), when the user says the work is done/live, or after ~15 turns in one chat. Updates claude/handoff.md, pushes, and prints the Thai close-out message with a ready-to-paste prompt for the next chat.
---
# Close-out (HARD RULE 1, moved here from CLAUDE.md in set 150)

0. **Skill check (user rule set 155 A1 — every close-out, BEFORE step 1, because a new chat cannot read this chat):** look at what this chat did and decide if a procedure should become a skill. Candidate when ALL: it will happen again (done ≥ 2 times, or clearly recurring) · it has several steps (~5+) or exact commands · it went wrong or the user corrected it at least once. Not a candidate: one-off work, or a procedure already fully written in a topic file/skill (then propose editing that file instead).
   - Candidate → explain in Thai (what the skill would do, which steps/commands, why) and ask with buttons: A1 จดเป็นสกิล · A2 แก้ไฟล์หัวเรื่องเดิมแทน · A3 ไม่ต้อง. On A1/A2: write it now (`.claude/skills/<name>/SKILL.md`, English, frontmatter name + description with its trigger; test every command in it once; set 209 A2: use `anthropic-skills:skill-creator` for the writing guide and the description / trigger check — its eval runs spawn subagents, so only with the user's OK), add a pointer where CLAUDE.md or the topic file covers that work, commit + push (docs-only → main), then continue with step 1.
   - No candidate → the output says `สกิลใหม่: ไม่มี`.

**Before step 0 (user rule set 184 B1):** a merged code set that the user wants live is published FIRST (skill `publish-pages`), in this chat — publishing the set's own work is not new work; never hand it to the next chat. Ask about publishing in the set's first question round.

Run steps 1–3 in this order. Never start new work in the same chat afterwards. Triggered at ~15 turns mid-set: first finish the current step and push, and write the WIP branch + exact next step in the Relay (set 152 C1).

1. **Update claude/handoff.md**
   - Add the newest set to the Relay block: set number, date, branch → main, GATE result (tests x/x · ui_smoke x/x), publish (artifact + version or "no publish"), values changed or not, user todo, next step (with a plan file: its name + next step number; a finished plan moves to claude/archive/, set 163 C1). **Cap ≈ 600 characters per set entry (set 218 H1):** status · branch + last sha · gate/publish · values · next step; round-by-round detail goes to the set's notes.md / plan file and the entry links it (on a sample branch as `<branch>:path`).
   - Relay keeps only the newest 2 sets + any set still open as WIP (set 211 B1: a WIP set stays until its own close-out); move older entries to claude/archive/relay/ (append to the newest relay-*.md archive file).
   - Update "Doc versions" if any doc version was bumped; update "Publish (current)" if something was published — that line keeps ONLY the current versions + the commit they came from; older entries go to the archive (review W7, set 151).
   - Remove this chat's 🔒 lock line from the Relay (workflow/relay.md, review W2).
   - Keep handoff ≤ 1 screen.
2. **Commit + push** (docs-only Relay commit may go straight to main).
   - **Push to main only from a clean worktree of origin/main (set 218 A1):** same commands as chat-start step 4 (worktree add → edit → commit → `git push origin HEAD:main` → worktree remove/prune). Never `git push origin <work-branch>:main` or `HEAD:main` from a work/sample branch — set 217 fast-forwarded a whole sample branch onto main that way (undone in 0455397).
   - **Before every push (set 218 D1):** `git status --porcelain` is empty and `git show --stat HEAD` lists every file the step meant to change (sets 208/210 pushed commits with a file missing).
3. **Output in Thai, in this order** (start with the 3-line header from CLAUDE.md "Reply format"):
   - `ควรเปิดแชทใหม่ได้แล้ว`
   - Skill check result (step 0): the new skill's name, or `สกิลใหม่: ไม่มี`.
   - What the user must do first (e.g. Balance Room cells + 💾, test the game) — or "ไม่มี".
   - MVP1 countdown (review W9, set 151): 1 line = days to the next build-plan.md target + step status (on time / behind → suggest cuts).
   - Recommended model + 1-line reason: Sonnet = routine · Opus = deep design or hard bugs · Haiku = trivial.
   - A ready-to-paste message for the new chat in a code block. It contains: "อ่าน claude/handoff.md", the set number to continue from, the WIP branch if any, and the next-task options (A1/A2…) — options go IN this message, never offered in the old chat. If the next chat must publish, the message says: git fetch, build from latest main, GATE: PASS on that commit, report the result in the Relay line.
