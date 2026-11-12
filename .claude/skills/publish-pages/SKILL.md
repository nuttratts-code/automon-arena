---
name: publish-pages
description: Automon Arena publish (เผยแพร่ / ขึ้นเว็บ / อัปหน้า) of the game / Balance Room / check pages (and runlog viewer) to their existing artifact links — writer check, latest main, gate, CI, Artifact publish, Relay update, or the paste-message when this account cannot publish. Use whenever a set publishes or the user says publish/เผยแพร่/ขึ้นเว็บ. Rules live in claude/workflow/publish.md §3 + relay.md and win if anything differs.
---
# Publish runbook (set 157 — skill from the close-out skill check)

Publishing is a stop point (rule A1): tell the user what will be published before doing it. Never create a new artifact — always update the Links URL (a new copy changes the link and loses Balance Room data).

1. **Who:** `Artifact read` each Links URL in claude/handoff.md (Artifact list does not show shared artifacts — never conclude "no access" from a list).
   - Header "writer" → this chat publishes.
   - "not found"/not writer → do not publish. Relay: `publish pending`. Give the user the paste-message from relay.md "Publish workflow" (for the old chat opened from the Balance Room page). Skip to step 6.
   - runlog viewer belongs to the 2nd account; game/balance room/check to the main account.
2. **Latest main:** `git fetch origin` → `git checkout main && git pull` (or a clean worktree of origin/main; remove it after the publish — worktree cleanup (chat-start step 4)). Read incoming commits: another chat's work → tell the user.
3. **Gate (HARD RULE 3):** `cd src && node tools/bootstrap.mjs setup` (skip if it passed on these exact files) → `node tools/bootstrap.mjs gate` → GATE: PASS on this exact commit. FAIL / cannot run → do not publish, tell the user.
4. **CI (set 153 G1):** newest GitHub Actions run on main for a commit that changed code is green and no code changed after it (GitHub MCP actions_list; docs-only commits have no run).
4b. **Security (HARD RULE 9 part ④⑤):** the page/build ships only the game (no claude/ docs, lab tools, tests, debug flags, source maps; owner-only buttons stay owner-only) · owner line `©` present on the game page credits · Godot/itch.io release: release export, PCK encryption on for PC/Android (web build: none, set 203 B1), export file list checked, account has 2FA. itch.io web build steps: claude/workflow/publish.md §10.
5. **Publish:** Artifact publish with `file_path` = `src/game.html` · `src/balance.html` · `src/system-check.html` (built by the gate) and `url` = the Links URL, `label` = set name. Pages in parallel. Conflict → read the live version, compare, merge, publish again. Never read or paste the built HTML.
6. **Relay on main (docs-only):** `Publish (current)` line = ONLY the current versions + the commit they came from (older → archive/relay/); set line names GATE result + versions. Push to main (fetch + merge if rejected, never rebase).
7. **Tell the user (Thai):** what was published (versions), what to check on the page, any Balance Room cells to set back + 💾 (from balance-import step 16).
