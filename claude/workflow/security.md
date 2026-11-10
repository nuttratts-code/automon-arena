# workflow · Security at every step (HARD RULE 9)

V1.1 · 10 Nov 2026 (set 190: private blocked by quota, work continues public) · V1.0 · 10 Nov 2026 (set 190: user picked S-A1 B1 C1 D1 — "many creators get their work stolen or attacked; make it an iron rule"). CLAUDE.md HARD RULE 9 is the one-line rule; this file holds the details and wins if they differ. HARD RULE 7 (validate external data) is part ③ of this rule.

## Why
- The repo was public from 6 Nov (set 104, for free CI minutes) to set 190: code, design docs and history could be downloaded by anyone. What was public may already be copied; private stops new copies.
- A shipped game (web page or Godot build) can always be unpacked. Protection = make copying harder + keep proof of ownership (dated git history, LICENSE, owner line in the game).

## The 6 parts (check every step that touches them)
1. **Secrets:** no API key, token, password or private link in the repo, a commit message, a doc, a test fixture, or chat. Keys only through `request_credential` (cloud) or the platform's own secret store (GitHub Actions secrets). Before every commit: `git diff --cached | grep -inE 'api[_-]?key|secret|token|passw|bearer|BEGIN .*PRIVATE'` → must be empty or explained. A leaked key = revoke it first, then clean up.
2. **Outside code / assets:** no library, Godot addon, npm/pip package, font, image, sound or code snippet from elsewhere without (a) its source (official site / repo), (b) its licence allowing our use (commercial too), (c) a credit line where the licence asks, and (d) the user's OK for anything new. Pin versions (CI actions `@vN`, Godot version, pip versions). The repo has zero npm dependencies today — keep it that way unless the user agrees.
3. **External input (= HARD RULE 7):** validate every value from outside before use (saves, AMCFG1/ARUN1/AMATCH1 codes, db docs, imported files, URL params) · no innerHTML with external text · no eval / new Function · no scripts from other sites. Godot: never `load()` / `ResourceLoader` a file the player supplies (resources can run code) — parse JSON and validate fields instead; no `Expression` on external text.
4. **Shipped files are clean:** a page or build given to players contains only the game: no claude/ docs, design notes, lab tools, test fixtures, source maps, debug flags, owner-only buttons left reachable, or personal data. Godot: export filters exclude `tests/`, `tools/`, `*.md`; release export (no debug); **PCK encryption on (S-D1)** with the key in a GitHub Actions secret / local env, never in the repo. Check the export file list before every release.
5. **Accounts:** 2-factor login (2FA) on GitHub, itch.io and Google (the user turns it on; Claude reminds once per new account). GitHub repo private (S-A1); only the user and Claude's app have access; no deploy keys or tokens with more rights than needed.
6. **Every plan step has a security line:** plans (claude/plan-*.md) list, per step, which of parts 1–5 it touches and how it is checked. A step without one is not ready to start.

## Ownership proof (S-B1)
- Root `LICENSE` = All rights reserved (no permission to copy, modify or redistribute). Placeholder art keeps its own CC0 credits (art/placeholder/).
- In-game owner line on the credits spot (game page: next to the placeholder-art credit; Godot: credits screen).
- Keep the git history (never rewrite it — also the no-force-push rule): dated commits are the evidence.

## Repo private + CI (S-A1)
- The user switches the repo to Private on github.com (Settings → General → Danger Zone → Change visibility). Claude cannot do it.
- **Status (set 190, user):** blocked — the user's GitHub Actions minutes quota is full (private repos use it; public CI is free). Main-only CI ≈ 5 min × a few merges/day stays under 2,000 min/month after the reset. User decision: keep working while public (repo unknown, 0 views); retry Private when the quota resets. Until then the repo is public: everything pushed (Godot code too) is visible — never push secrets (part 1) either way.
- CI runs only on push to main (+ manual run): private repos get limited free Actions minutes. Branch work is checked by the local gate before merge (HARD RULE 3), so CI on main still guards what ships.

## Where each part is checked
| Step | Parts | Check |
|---|---|---|
| Any commit | 1 · 3 | secret grep above · HARD RULE 7 review of the diff |
| New dependency / asset / addon | 2 | source + licence + credit + user OK, written in the commit message |
| Merge to main (merge-code) | 1 · 2 · 3 | secret grep on the whole branch diff |
| Publish / release (publish-pages, itch.io) | 4 · 5 | shipped file list clean · owner line present · encryption on (Godot) |
| New account or service | 5 | 2FA reminder · least rights |
| New plan file | 6 | security line per step |
