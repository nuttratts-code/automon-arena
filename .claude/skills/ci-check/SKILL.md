---
name: ci-check
description: CI result on the owner's Windows PC (เช็ค CI / CI เขียวไหม / ผลเทสต์บน GitHub): `gh` CLI first (installed + signed in 24 Nov), built-in browser on the GitHub Actions list only if gh fails; report the run for a commit, read a failed log. Used by chat-start, daily-brief, merge-code, publish-pages, godot-release.
---
# CI check (set 207 browser way · set 291: gh first — owner installed + signed in gh 24 Nov)

> Rules: CLAUDE.md "Git workflow" (CI rule set 153 G1) — they win if anything differs (description trimmed set 219 A1).

1. **gh (default on the PC, account nuttratts-code, keyring login).** Full path works even when a fresh shell lacks PATH: `"C:\Program Files\GitHub CLI\gh.exe"`.
   - Run for a commit: `gh run list --branch main --limit 5 --json number,databaseId,headSha,status,conclusion,displayTitle` → match `headSha` to `git log --oneline -1 origin/main`, then apply step 4 (`conclusion` success = green · `status` in_progress/queued = running · failure = red).
   - Failed log: `gh run view <databaseId> --log-failed` (last ~50 lines are enough) → skill `find-cause`. No browser and no sign-in needed (replaces 4b).
   - gh "not recognized" / "not logged in" / auth error → step 2 and tell the owner (`gh auth login` fixes it). Cloud chats: GitHub MCP `actions_list` (merge-code step 6).
2. Fallback — built-in browser (`mcp__Claude_Browser__navigate`, no dev server needed):
   `https://github.com/nuttratts-code/automon-arena/actions?query=branch%3Amain`
   The owner is signed in to GitHub there (private repo). A sign-in page instead → ask the owner to sign in in the pane, then carry on.
3. `mcp__Claude_Browser__get_page_text` with `max_chars` ~1500 (newest runs are first). Each run reads: title · `completed successfully` / `failed` / `currently running` · `#NNN` · `Commit <short sha>` · duration.
4. Find the run whose `Commit` = the commit you need (`git log --oneline -1 origin/main`).
   - `completed successfully` → CI green: write `CI run #NNN on <sha> green` in the Relay line.
   - `currently running` / `In progress` → do NOT poll or sleep. Write `CI run #NNN on <sha> running at close-out → next chat checks` in the Relay line (runs take 7–12 min).
   - `failed` → skill `find-cause` (HARD RULE 5): open the run page and read its failing step; never publish on a red run.
   - No run for that commit: docs-only pushes (claude/, art/, *.md) skip CI (set 139) — say so.
4b. **Reading a failed job's log without gh (set 249, owner A2; gh step 1 is the default now):** the run list and job steps show without sign-in (repo is public), but the LOG lines need a signed-in GitHub ("Sign in to view logs"; `meta[name=user-login]` empty = not signed in). The built-in pane is usually NOT signed in → ask the owner which: sign in in the pane, or use Claude in Chrome (their real Chrome, signed in). In Chrome: open `…/actions/runs/<run>/job/<job>`, then one javascript call: wait ~4 s, `document.querySelectorAll('check-step')[N-1]` (N = failed step number), click its `summary` if `details` is closed, wait ~5 s, read `innerText` (last ~50 lines). `…/commit/<sha>/checks/<job>/logs` gives "Server Error" — don't use it. Get the job id from the run page links (`/job/\d+`). Close the Chrome tab after. Example: run #936 → ubuntu 26.04 font packages (fixed 5044915).
5. Never click anything on GitHub or run a changing gh command (`gh run rerun`, `cancel`, `gh repo edit`, settings) without the owner's OK; read-only gh (`run list`, `run view`) needs no ask. No polling (`gh run watch`, loops) — a running run goes into the Relay line as in step 4.
