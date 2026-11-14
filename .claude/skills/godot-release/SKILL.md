---
name: godot-release
description: Godot release for itch.io (ออกตัวเกม / อัป itch.io / export / ทำไฟล์เกม): latest main + green CI, parity + security checks, web export, WEB CHECK, clean file list, zip for the owner. Only on the owner's order. Web artifacts use publish-pages.
---
# godot-release (set 209 — thin runbook; the build commands live ONLY in publish.md §10, do not copy them here)

> Rules: claude/workflow/publish.md §10 + claude/workflow/security.md parts 4–5 — they win if anything differs (description trimmed set 219 A1).

1. **Stop point (rule A1):** a release leaves the PC → before building, tell the user which commit and which target (web only today). The itch.io page stays Draft / Restricted until the user opens it (set 203 D1).
2. **Latest main + CI:** `git fetch origin`, build from a clean worktree of origin/main; the newest code CI run on that commit is green including the `godot` and `godot-web` jobs (skill `ci-check` on the PC). Code changed after it → no release.
3. **Parity + security before the build:** AI-made art in the build → remind the owner of the accepted risk (security.md part 2, set 219 D: Hunyuan3D EU/UK/KR gap) and check its credits line + PROVENANCE rows. skill `port-parity` passed on this commit (or CI job `godot` green = the same check) · skill `security-review` on the code changed since the last release · secret grep (security.md part 1).
4. **Build · check · zip:** publish.md §10 steps 1–3, exactly as written there (WEB CHECK: PASS needed).
5. **Public text (set 221):** game title, itch.io page, trailer and credits never say "HD-2D"/"HD2D" (Square Enix trademark) nor name other games; grep the build text + page draft. **Shipped files (security.md part 4):** the §10 step 2 file list, plus `strings build/web/index.pck | grep -i 'mcp'` empty (dev-only addon and its autoload must not ship) · credits screen shows the owner © line, the Godot MIT text and the font licences.
6. **Hand over:** SendUserFile the zip; the user uploads by hand (set 203 C1). Claude never uploads and never uses butler or an API key unless the user orders it (then the key only through request_credential). Guide the page settings from §10 step 4; remind 2FA on itch.io once (part 5).
7. **PC (Windows) / Android downloads:** not decided yet. They need PCK encryption with custom export templates (S-D1; key only in env / an Actions secret) → ask the user with options first and write the steps into publish.md before building anything.
8. **Record:** Relay line per §10 step 5 (commit, WEB CHECK result, zip name); Links gets the page URL when the user sends it.
