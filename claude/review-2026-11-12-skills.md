# Review 2026-11-12 — which extra skills to use (set 209, user asked for research)

Sources: the skills already installed in the session · our 15 skills in .claude/skills · the Claude plugin catalog (nothing for Godot) · community skill indexes (web search, listings only).

## Decided by the user (applied in set 209, branch claude/prep-canvas)
- **A2 — 7 installed skills wired into our runbooks:** `design:design-critique` + `design:accessibility-review` + `design:ux-copy` (ui-work step 4f, ui-preview step 5) · `code-review` low (merge-code 1e) · `security-review` (publish-pages 4b, godot-release 3) · `anthropic-skills:skill-creator` (close-out step 0; no eval subagents without the user's OK) · `anthropic-skills:explain-usage` (weekly-review §1). Compliance check: weekly-review §3b item 10.
- **B1 + B2 + B3 — three new skills:** `godot-play` (DRAFT — the editor was closed, not run live; depends on the set 208 MCP addon trial) · `godot-release` (thin; commands stay in publish.md §10) · `port-parity` (golden replay; `node tools/exportdata.mjs` run once on the PC = files unchanged; golden.mjs + the full Godot run not re-run in this chat, same commands as CI job `godot`).
- **C2 — vet one community Godot skill, then ask again** → below.

## C. Community skill vetted: wshobson/agents · godot-gdscript-patterns
- Source: github.com/wshobson/agents, plugins/game-development/skills/godot-gdscript-patterns · licence MIT (c) 2024 Seth Hobson (repo LICENSE; no licence text inside the skill folder) · targets Godot 4.x.
- Read (through WebFetch summaries, not the raw bytes): SKILL.md (~100 lines) and references/details.md (~430 lines). No URLs, shell commands, installs, network calls or instructions to the agent. **Not read:** references/advanced-patterns.md (scene manager, save system "AES-encrypted files + JSON", performance tips).
- Content: generic patterns — state machine nodes · `GameManager` + `EventBus` autoload singletons · Resource data classes · object pooling · health/hitbox components.
- Fit with this repo: low. Our Godot code is a line-by-line port of the JS core checked by golden replay (plain scripts, one data file game.json, no gameplay autoloads); the patterns would pull new code toward a different architecture and add ~500 lines to context when triggered. Its trigger ("use when building Godot games") fires on every Godot task and competes with ui-work / art-look. The save pattern would need checking against security.md part 3.
- Options: **C2a (recommended)** do not install; write our own short `claude/workflow/gdscript.md` (typing, js_round, stable sort, no load() of player files, test traps — things we already learned in sets 192–208) · **C2b** install it pinned to a commit, with a note in security.md part 2 and a narrowed description · **C2c** drop the topic.
- **Decided (user, 12 Nov): C2a** — not installed; claude/workflow/gdscript.md V1.0 written (CLAUDE.md topic row added).
