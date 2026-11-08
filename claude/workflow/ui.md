# workflow · UI work

V1.2 · 8 Nov 2026 (set 158: points to skill ui-work; merge-code checks it) · V1.1 · 8 Nov 2026 (set 151 review W4 reset buttons) · V1.0 set 139: moved out of CLAUDE.md — user rule 7 Nov, set 125. Open whenever a task builds a new UI or reshapes an existing one.

Step-by-step runbook: skill `.claude/skills/ui-work/SKILL.md` (set 158). This file holds the rules and wins if they differ; when a rule here changes, update the skill in the same commit.

- Every time Claude builds a new UI or reshapes an existing one (game page, Balance Room, check, runlog viewer, mockups, any artifact page), first invoke the design skill with the Skill tool: `frontend-design:frontend-design` (also `artifact-design` before writing a new artifact page).
- Follow it: plan → build → screenshot and critique (desktop + phone width) before the gate.
- Keep the existing palette/fonts of a page unless the user asks for a new look.
- Placeholder art = coloured shapes + names; must not resemble the original game (the user makes real art). Art style notes: claude/art-style.md.
- **Reset / delete / overwrite buttons (review W4, set 151 — set 146 reset button built twice):** ask up front (A1 rule) what the button returns to (game values · last saved · defaults) and what it covers (one tab · whole page); the button must open a confirm dialog that names what will be lost.
