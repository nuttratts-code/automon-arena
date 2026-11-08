---
name: close-out
description: Automon Arena close-out block (HARD RULE 1). Use on every merge to main, when the user says the work is done/live, or after ~15 turns in one chat. Updates claude/handoff.md, pushes, and prints the Thai close-out message with a ready-to-paste prompt for the next chat.
---
# Close-out (HARD RULE 1, moved here from CLAUDE.md in set 150)

Run in this order. Never start new work in the same chat afterwards.

1. **Update claude/handoff.md**
   - Add the newest set to the Relay block: set number, date, branch → main, GATE result (tests x/x · ui_smoke x/x), publish (artifact + version or "no publish"), values changed or not, user todo, next step.
   - Relay keeps only the newest 2 sets; move older entries to claude/archive/relay/ (append to the newest relay-*.md archive file).
   - Update "Doc versions" if any doc version was bumped; update "Publish (current)" if something was published — that line keeps ONLY the current versions + the commit they came from; older entries go to the archive (review W7, set 151).
   - Remove this chat's 🔒 lock line from the Relay (workflow/relay.md, review W2).
   - Keep handoff ≤ 1 screen.
2. **Commit + push** (docs-only Relay commit may go straight to main).
3. **Output in Thai, in this order** (start with the 3-line header from CLAUDE.md "Reply format"):
   - `ควรเปิดแชทใหม่ได้แล้ว`
   - What the user must do first (e.g. Balance Room cells + 💾, test the game) — or "ไม่มี".
   - MVP1 countdown (review W9, set 151): 1 line = days to the next build-plan.md target + step status (on time / behind → suggest cuts).
   - Recommended model + 1-line reason: Sonnet = routine · Opus = deep design or hard bugs · Haiku = trivial.
   - A ready-to-paste message for the new chat in a code block. It contains: "อ่าน claude/handoff.md", the set number to continue from, the WIP branch if any, and the next-task options (A1/A2…) — options go IN this message, never offered in the old chat. If the next chat must publish, the message says: git fetch, build from latest main, GATE: PASS on that commit, report the result in the Relay line.
