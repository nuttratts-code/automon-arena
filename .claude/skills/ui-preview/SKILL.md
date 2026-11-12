---
name: ui-preview
description: Automon Arena design-sample loop for the Godot screens (ภาพตัวอย่าง / ทำตัวอย่างให้ดู / ยังไม่แก้โค้ดจริง / ลองจัดหน้า) — the owner orders layout changes round by round, Claude shows a screenshot of each round WITHOUT touching the real code, and codes everything once at the end (via ui-work) when the owner says ทำจริง. Use when the owner wants to see a look before it is built.
---
# ui-preview (set 208)

1. **Scratch copy, never the repo:** `cp -r godot <scratchpad>/g` (≈5 MB) and delete the `MCPRuntimeServer=` autoload line in the copy's project.godot (no MCP server in sample runs). The real branch and the open Godot editor stay untouched.
2. **Godot binary:** reuse an existing `Godot_v4.7.2-stable_win64_console.exe` (find under `%TEMP%/claude/*/*/scratchpad/godot/`), else `godot/tools/get_godot.sh`.
2b. **Pattern check (set 210):** before the first hack of a round that changes the LOOK (shape, colour, material, font, card/frame style — not a pure move/resize), run skill `ui-patterns` "Before drawing": 2 named references + 3 non-default decisions.
3. **Hack the copy** with small Python patch files (write them with the Write tool; heredocs with GDScript break in Git Bash). Tabs: write 4 spaces and convert. Assert every old string exists.
   - Slot cells are PanelContainers → anchors on their children are ignored; use alignment / spacers.
   - Changing a node type in the scene (e.g. HBox→VBox) also needs the `_part(lay, name, type)` call changed.
4. **Shoot:** `"$G" --rendering-driver opengl3 --audio-driver Dummy --path g --resolution 844x390 -s res://tests/shots.gd -- --out <dir>` (~1 min, no xvfb on Windows). Look at `prep-late` / `prep-upstar` / `prep`; AUDIT line must stay clean.
5. **Show:** copy the chosen shots to `<scratchpad>/preview/Rn-*.png`, SendUserFile, reply with the 3-line Thai header + what changed + any guess you made. Before showing, run `design:design-critique` on the round's shot and add its top 1–2 findings as notes for the owner (set 209 A2) — never change the sample on its own. Round after round, keep patching the same copy.
5b. **Tell count (set 210):** before SendUserFile, run skill `ui-patterns` "After the screenshot" on the round's shot; 3 or more tells → fix the sample first; report references · decisions · tells left in the reply.
6. **Keep it safe across chats/PC shutdown:** before the chat ends, save `git diff --no-index` of the copy vs godot/ + the round images + an agreed-list `notes.md` into `claude/preview-setN/` on the WIP branch, and name it in the Relay. Next chat: recreate the copy and `git apply` the diff (paths: strip the scratch prefix) to continue.
7. **ทำจริง:** re-implement cleanly from notes.md through skill `ui-work` (all sizes, dark, tests, ripple) — never paste the sample hack as is.
