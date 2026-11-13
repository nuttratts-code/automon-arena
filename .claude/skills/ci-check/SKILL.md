---
name: ci-check
description: CI result on the owner's Windows PC (เช็ค CI / CI เขียวไหม / ผลเทสต์บน GitHub) when `gh` and the GitHub connector are missing: read the GitHub Actions list in the built-in browser and report the run for a commit. Used by chat-start, merge-code and publish-pages.
---
# CI check without gh (set 207, user A1 — chat-start needed it and `gh` was missing on the PC)

> Rules: CLAUDE.md "Git workflow" (CI rule set 153 G1) — they win if anything differs (description trimmed set 219 A1).

1. Try the cheap way first only if it exists: `gh run list --branch main --limit 5` (PowerShell). "not recognized" / "command not found" → step 2. (Cloud chats: GitHub MCP `actions_list`, merge-code step 6.)
2. Built-in browser (`mcp__Claude_Browser__navigate`, no dev server needed):
   `https://github.com/nuttratts-code/automon-arena/actions?query=branch%3Amain`
   The owner is signed in to GitHub there (private repo). A sign-in page instead → ask the owner to sign in in the pane, then carry on.
3. `mcp__Claude_Browser__get_page_text` with `max_chars` ~1500 (newest runs are first). Each run reads: title · `completed successfully` / `failed` / `currently running` · `#NNN` · `Commit <short sha>` · duration.
4. Find the run whose `Commit` = the commit you need (`git log --oneline -1 origin/main`).
   - `completed successfully` → CI green: write `CI run #NNN on <sha> green` in the Relay line.
   - `currently running` / `In progress` → do NOT poll or sleep. Write `CI run #NNN on <sha> running at close-out → next chat checks` in the Relay line (runs take 7–12 min).
   - `failed` → skill `find-cause` (HARD RULE 5): open the run page and read its failing step; never publish on a red run.
   - No run for that commit: docs-only pushes (claude/, art/, *.md) skip CI (set 139) — say so.
5. Never click anything on GitHub (re-run, cancel, settings) without the owner's OK.
