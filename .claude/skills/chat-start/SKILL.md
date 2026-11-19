---
name: chat-start
description: Start of every chat (เริ่มแชท / ทำต่อ / อ่าน handoff): fetch, read the Relay, check the บาลานซ์ line, push the 🔒 lock line, open the WIP branch or a fresh branch, propose the next set. Use at the first turn of EVERY chat in this repo, even for a question.
---
# Chat start (set 158 — skill from CLAUDE.md "Git workflow" + relay.md)

> Rules: CLAUDE.md "Git workflow"/"New chat" + claude/workflow/relay.md — they win if anything differs (description trimmed set 219 A1).

The SessionStart hook (.claude/hooks/session-start.sh) already ran `git fetch` and printed the Relay block — use that output; re-read handoff.md only if the hook printed nothing.

1. **Relay:** (a Relay line says "CI … not yet checked / running" → check it first: GitHub MCP, or skill `ci-check` on the PC)
    read the Relay block of `origin/main:claude/handoff.md` (index + pending only; open other files only when the task needs them).
2. **Balance line (HARD RULE 4):** `บาลานซ์: กำลังปรับ` → no import, no measure this chat, whatever the request.
3. **Other 🔒 lines:** a lock line touching the same files/areas, game values or the Balance Room db → stop and ask the user (Thai) before starting. Stale lock (no open WIP branch on origin, nothing newer than the last Relay set) → remove it with a one-line note, no need to ask (relay.md set 152 E-b).
4. **Lock line (relay.md W2):** set N = highest set number on main + 1. Push to main, docs-only, as the first line under `## Relay`: `- 🔒 set N · <topic> · files/areas: …`. Pure question with no edits → still push it once the chat starts editing anything.
   - Push to main from a clean worktree of origin/main, so the session branch is not switched. **PC (set 250 W3):** use the fixed folder `D:\GitHubutomon-scratch\main` — `status --porcelain` empty → `checkout -q --detach origin/main` → edit → commit → `git push origin HEAD:main`; keep the folder (do not remove it). Cloud or folder missing: `git worktree add <scratch>/main origin/main` and clean up as below.
   - **Cleanup of a temporary worktree right after the push (set 211):** `git worktree remove <path>` then `rm -rf .git/worktrees/<name>` (on Windows git cannot delete that folder itself — "Permission denied" — so leftovers piled up across chats) → `git worktree prune` → `git worktree list` shows only the main folder. Never remove a worktree with uncommitted changes (`git -C <path> status --porcelain` empty first).
5. **Branch:** Relay names an open WIP branch → check it out and continue from its "Next step" (a `claude/plan-setN.md` named there → continue from its first unticked step). **Catch up first (set 250 W1, relay.md):** main has newer commits in CLAUDE.md / .claude / claude/workflow (`git log --oneline HEAD..origin/main -- CLAUDE.md .claude claude/workflow`) → `git merge origin/main` into the WIP branch + push, so this chat's rules, skills and hooks are current (the CLAUDE.md already loaded is old → re-read the changed lines with `git diff HEAD@{1} HEAD -- CLAUDE.md`). Otherwise the session's assigned branch (cloud) or `claude/<topic>` from latest main. Session-branch chats also push docs-only commits to main (relay.md set 152 E1).
5b. **Daily brief (set 250):** the hook printed `🌅 DAILY` → run skill `daily-brief` now (first chat of the day); its list feeds step 6.
6. **Propose (Thai, 3-line header):** the next task set + pending items that can ride along ("งานรอรวม": do them when 3 are queued or the same file is open) + MVP1 warning if behind build-plan.md. Ask ALL questions for the set in one AskUserQuestion round (rule A1), then work to the end.
6b. **Plan file (set 163 C1):** a set that touches > 3 files or clearly needs more than one chat → before editing, write `claude/plan-setN.md`: numbered steps (file · change · how to check), tick each when done + pushed. Keep it on the WIP branch (docs-only plan → main).
7. Task touches game values → `balance-import` skill · publishing → `publish-pages` · code to main → `merge-code` · rule/design change → `rule-change` · measuring → `measure-balance`.
