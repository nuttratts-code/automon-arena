---
name: chat-start
description: Automon Arena start of every chat (เริ่มแชท / เริ่มงาน / ทำต่อ / อ่าน handoff) — fetch, read the Relay, check the บาลานซ์ line, push the 🔒 lock line, open the WIP branch or a fresh branch from main, then propose the next task set. Use at the first turn of EVERY chat in this repo, before any other work, even when the user only asks a question. Rules live in CLAUDE.md "Git workflow"/"New chat" + claude/workflow/relay.md and win if anything differs.
---
# Chat start (set 158 — skill from CLAUDE.md "Git workflow" + relay.md)

The SessionStart hook (.claude/hooks/session-start.sh) already ran `git fetch` and printed the Relay block — use that output; re-read handoff.md only if the hook printed nothing.

1. **Relay:** read the Relay block of `origin/main:claude/handoff.md` (index + pending only; open other files only when the task needs them).
2. **Balance line (HARD RULE 4):** `บาลานซ์: กำลังปรับ` → no import, no measure this chat, whatever the request.
3. **Other 🔒 lines:** a lock line touching the same files/areas, game values or the Balance Room db → stop and ask the user (Thai) before starting. Stale lock (no open WIP branch on origin, nothing newer than the last Relay set) → remove it with a one-line note, no need to ask (relay.md set 152 E-b).
4. **Lock line (relay.md W2):** set N = highest set number on main + 1. Push to main, docs-only, as the first line under `## Relay`: `- 🔒 set N · <topic> · files/areas: …`. Pure question with no edits → still push it once the chat starts editing anything.
   - Push to main from a clean worktree of origin/main (`git worktree add <scratch>/main origin/main`), so the session branch is not switched.
5. **Branch:** Relay names an open WIP branch → check it out and continue from its "Next step" (a `claude/plan-setN.md` named there → continue from its first unticked step). Otherwise the session's assigned branch (cloud) or `claude/<topic>` from latest main. Session-branch chats also push docs-only commits to main (relay.md set 152 E1).
6. **Propose (Thai, 3-line header):** the next task set + pending items that can ride along ("งานรอรวม": do them when 3 are queued or the same file is open) + MVP1 warning if behind build-plan.md. Ask ALL questions for the set in one AskUserQuestion round (rule A1), then work to the end.
6b. **Plan file (set 163 C1):** a set that touches > 3 files or clearly needs more than one chat → before editing, write `claude/plan-setN.md`: numbered steps (file · change · how to check), tick each when done + pushed. Keep it on the WIP branch (docs-only plan → main).
7. Task touches game values → `balance-import` skill · publishing → `publish-pages` · code to main → `merge-code` · rule/design change → `rule-change` · measuring → `measure-balance`.
