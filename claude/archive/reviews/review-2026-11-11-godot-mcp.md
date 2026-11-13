# Review 11 Nov 2026 — Godot MCP options (set 208 side question)

Owner asked: would an MCP link to Godot help Claude, and which one. Nothing installed. Sources read 11 Nov 2026 (READMEs, LICENSE, releases, commits, dependency files; tool code NOT audited).
PC has Node 24, Python 3.11, uv 0.13 — every candidate below can run here.

## What we have today (no MCP)
Claude drives Godot 4.7.2 by command line: Godot tests, shots at 4 sizes + AUDIT, MOVE CHECK, scene generator (make_prep_layout.gd).
Missing: Claude cannot see the owner's OPEN editor, cannot edit the open scene live (owner gets a Reload prompt), cannot read errors while the OWNER plays (F5).

## Candidates
| | NPGameDev toolkit + server | hi-godot/godot-ai | hybridindie/godot-mcp | tomyud1/godot-mcp | Coding-Solo/godot-mcp |
|---|---|---|---|---|---|
| Live open editor | yes (EditorInterface) | yes | yes | partial (edits files on disk) | no (command line only) |
| Editor screenshot | yes | not stated | "screenshot" (target unclear) | game only | no |
| Errors while game runs | yes | yes | yes | yes | yes (own run) |
| Code-eval tool | yes `execute_code` (hidden in read-only mode, can be denied) | `game_eval` (scope unclear) | none stated | none | none (past GDScript-injection fix) |
| Auth on local link | random token per start · loopback only | rotating credentials · loopback | not stated | none | n/a |
| Read-only mode / tool gating | yes `GODOT_MCP_READ_ONLY=1` + per-tool deny | no | toolsets off by default | no | no |
| Godot 4.7 | CI-tested 4.2–4.7 | needs 4.7+ | validated 4.7.2 | 4.4+ (4.7 install steps) | not stated |
| Version pin | exact npm pins, plugin pins server | exact pins, signed releases | exact pip pin possible | unpinned | npx = latest |
| Export safety | runtime channel self-disables in exported builds | not stated | not stated | not stated | n/a |
| Telemetry / auto-update | update check (can be turned off); opt-in self-update | anonymous telemetry, opt-out | none; update check opt-in | — | — |
| Licence | MIT (name/logo not licensed) | MIT | MIT | MIT | MIT |
| Activity | releases Oct 29; commits Nov 11; ★15 server / ★127 addon | release Nov 3; ★3.5k; 5 issues | release Nov 5; ★58; 1 maintainer | release Aug 24; ★454 | last commit Apr 16; ★6.6k; 35 PRs open |
| Runtime | Node ≥22 | Python ≥3.11 + uv | Python ≥3.11 + uv | Node | Node ≥18 |

## Findings
1. Only the live-editor kind adds anything over today (see "Missing"). Coding-Solo and tomyud1 add little → drop.
2. Best safety design on paper: **NPGameDev** (token, read-only mode, res:// sandbox, audit log, export self-disable, exact pins, CI on 4.7). Weak point: young and small (server ★15) — few eyes on the code.
3. Most used + signed releases: **hi-godot/godot-ai**. Weak points: no read-only mode, telemetry on by default (must turn off), needs the addon in the project.
4. hybridindie: careful design (gated toolsets, dry-run, consent tokens) but one maintainer, ★58, no link auth stated.
5. Every live option = an editor addon inside godot/addons → HARD RULE 9: source + licence + credit + owner OK, pin version, turn off auto-update/telemetry, and exclude addons/ from export (check export_presets.cfg) so it never ships with the game.
6. Token cost: an MCP's tool list is sent every turn in every chat while connected → connect it only in Godot chats (project-local config), read-only toolset first.

## Options
- **D1 (recommended) wait** — keep the command-line path; reconsider at art-look step 1 (lots of look tuning in the editor), re-check these repos then.
- **D2 try NPGameDev, read-only** — pinned version, `GODOT_MCP_READ_ONLY=1`, `execute_code` denied, update check off, addon excluded from export, on a test branch; one chat to judge if live screenshots / errors save real time; remove if not.
- **D3 try hi-godot/godot-ai** — same trial rules, telemetry off; more users, but no read-only mode.
