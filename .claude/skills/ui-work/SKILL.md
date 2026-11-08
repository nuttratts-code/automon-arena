---
name: ui-work
description: Automon Arena UI work (หน้า / แท็บ / ปุ่ม / ตาราง / จัดหน้า / หน้าตา / เมนู / popup / Balance Room / หน้าเกม / check / runlog viewer / mockup) — any task that adds or changes something the user SEES on a page, even when it feels like data work (a new stats tab, a sortable table, a new button, new text layout). Ask button/scope questions up front → design skill → build → screenshots desktop + phone → critique → gate. Rules live in claude/workflow/ui.md and win if anything differs.
---
# UI work (set 158 — skill from claude/workflow/ui.md; sets 138/138b/144/146 skipped the rule)

Counts as UI: any change to src/game/** markup/CSS/view code, src/lab/balance/** (css, js that builds DOM, body.html), *.template.html, runlog viewer, or a new artifact page. A new tab/table/column/button of numbers IS UI.

1. **Ask up front (rule A1), in the set's first question round:** where it goes (page · tab), what it shows, phone layout. Reset / delete / overwrite button → what it returns to (game values · last saved · defaults) and what it covers (one tab · whole page); it must open a confirm dialog naming what will be lost (ui.md W4).
2. **Design skill:** invoke `frontend-design:frontend-design` with the Skill tool before writing UI code (also `artifact-design` before a new artifact page). Keep the page's existing palette/fonts unless the user asks for a new look. Placeholder art = coloured shapes + names, never like the original game (claude/art-style.md).
3. **Build:** textContent for external text (no innerHTML), no eval, no outside scripts (HARD RULE 7).
4. **Screenshots + critique:** `cd src && node build.mjs`, then Playwright (chromium preinstalled) at desktop 1100 px and phone 390 px — the changed screen, light + dark if the page has both. deviceScaleFactor 1 (for Claude only). Look at them: cut text, overflow, horizontal scroll, tap targets, contrast. Fix, re-shoot. (ui_smoke also leaves shots in `$TMPDIR/automon-shots` after a gate.)
5. **Test:** add/extend a ui_smoke check for the new element when it can break silently. Then `merge-code` (setup → gate).
6. **Record (so the weekly review can check it):** the set's Relay line says `UI: design skill ✓ · shots 1100+390 ✓` (or why not).
