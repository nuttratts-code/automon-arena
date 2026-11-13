---
name: ui-preview
description: Screen design samples before real code (ภาพตัวอย่าง / ทำตัวอย่างให้ดู / ยังไม่แก้โค้ดจริง / ลองจัดหน้า): the owner changes the layout round by round, Claude shows each round's screenshot, real code once at ทำจริง via ui-work. Screens/menus only; arena/battle-scene look samples → art-look.
---
# ui-preview (set 208)

> Rules: claude/workflow/ui.md — they win if anything differs (description trimmed set 219 A1).

1. **Scratch copy, never the repo:** `cp -r godot <scratchpad>/g` (≈5 MB) and delete the `MCPRuntimeServer=` autoload line in the copy's project.godot (no MCP server in sample runs). The real branch and the open Godot editor stay untouched.
2. **Godot binary:** claude/workflow/gdscript.md §7 (reuse the PC console exe where it is; cloud = get_godot.sh).
2b. **Pattern check (set 210):** before the first hack of a round that changes the LOOK (shape, colour, material, font, card/frame style — not a pure move/resize), run skill `ui-patterns` "Before drawing": 2 named references + 3 non-default decisions.
3. **Hack the copy** with small Python patch files (write them with the Write tool; heredocs with GDScript break in Git Bash). Tabs: write 4 spaces and convert. Assert every old string exists.
   - Slot cells are PanelContainers → anchors on their children are ignored; use alignment / spacers.
   - Moving a node to another parent in prep_layout.tscn (set 216 R7/R8): fix the children's `parent="Old/…"` paths too, and the moved blocks must come AFTER the new parent's block in the file, else Godot drops them silently (`_part` then returns a spare → null errors). Ref: claude/preview-set216/r8-patch-hudbottom.py.
   - Camera / formation tests: `PITCH`, `FOV`, `LANE_Z`, `COL_X` + `slot_pos()` in scripts/ui/stage3d.gd and the prep/battle rects in app.gd `board_targets()` — one `sed` per try (set 216 R2–R6).
   - Changing a node type in the scene (e.g. HBox→VBox) also needs the `_part(lay, name, type)` call changed.
4. **Shoot:** `"$G" --rendering-driver opengl3 --audio-driver Dummy --path g --resolution 844x390 -s res://tests/shots.gd -- --out <dir>` (~1 min, no xvfb on Windows). Look at `prep-late` / `prep-upstar` / `prep`; AUDIT line must stay clean.
5. **Show:** copy the chosen shots to `<scratchpad>/preview/Rn-*.png`, SendUserFile, reply with the 3-line Thai header + what changed + any guess you made. **Rounds that change SCREEN UI** (panels, text, icons, layout — set 219 B1): before showing, run `design:design-critique` on the round's shot and add its top 1–2 findings as notes for the owner (set 209 A2) — critique findings never change the sample on their own; only the 5b tell fix may (set 211 A1). Round after round, keep patching the same copy. notes.md records per round `critique ✓ · tells n` or `look round — art-look §1 checklist at phase end` (set 219 B1).
5b. **Tell count (set 210; screen-UI rounds only, set 219 B1):** before SendUserFile, run skill `ui-patterns` "After the screenshot" on the round's shot; 3 or more tells → fix the sample first, except anything the owner picked (agreed list / notes.md / docs / Relay) — that one is never changed on Claude's own, ask A1/A2 (set 211 A1); report references · decisions · tells left in the reply.
6. **Keep it safe across chats/PC shutdown (set 212 A2):** after EACH round, copy that round's patch script(s) into `claude/preview-setN/` as `rN-patch*.py` (new files the patch needs: `rN-<name>.gd.txt`) + the round images + update `notes.md` (agreed list + a "Rebuild:" line = the order of patches), commit + push on the WIP branch, name it in the Relay. Do NOT save a whole-folder `git diff --no-index` (it drags in godot/.godot cache files and CRLF-only noise; never delete the copy's `.godot` to clean it). Next chat: recreate the copy (step 1), apply the saved base diff if one exists (set 208 `sample.diff`: rewrite its scratch path prefix to `godot/`, `git apply -p1` inside an empty folder holding the copy as `godot/`), then run the patches in the "Rebuild:" order.
6b. **Import before the first shot** of a fresh copy (and after anything touched `.godot`): `"$G" --headless --import --path g` — without it the MCP addon scripts fail to parse (`MCPToolkitError not declared`) and shots run with errors.
6c. **Sample branch mode (set 218 C1 — sets 216/217 had to put godot/ files in git because the owner arranges scenes in the Godot editor):** allowed only when the owner edits the sample in the editor; otherwise stay with step 1.
   - Branch `claude/sample-setN` (or the session branch), its Relay line starts with `SAMPLE — NO MERGE`; every path in the Relay that exists only there is written `<branch>:path` (e.g. `claude/sample-set217:claude/preview-set217/notes.md`).
   - Before each round's shots: `git status --porcelain` on the folder the owner edits → anything changed (editor saves, tone, env) is committed or written into notes.md first (set 217: R6–R14 tone was never saved).
   - After an owner editor save, mark any generator script in notes.md `STALE — edit the .tscn, never regenerate` (set 217 s217_make_r6.gd).
   - Docs/skills written during the set go to main from a clean origin/main worktree, never by pushing the sample branch (relay.md set 218 A1; 0455397 undid exactly that).
7. **ทำจริง:** re-implement cleanly from notes.md through skill `ui-work` (all sizes, dark, tests, ripple) — never paste the sample hack as is.

## 8. Arena / battle-scene look samples → skill art-look §8 (moved set 219 E1)
