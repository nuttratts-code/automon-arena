---
name: ui-preview
description: Automon Arena quick UI sample for the owner (ทำตัวอย่าง / เจนตัวอย่าง / ขอดูก่อน / ภาพตัวอย่าง / ลองแบบนี้ดู / mockup ก่อนแก้จริง) — render the REAL Godot prep/battle screen with a throwaway code patch, show the owner 1–2 screenshots, then restore the code. Use when the owner wants to see a layout/look idea before any real change, and keep looping sample after sample until they say "ทำจริง"; then implement everything once via ui-work. Not for final work (ui-work), values (balance-import) or the battle-scene art look (art-look).
---

# UI preview loop (set 208, user A1 — owner designs, Claude samples, code once at the end)

Rules: nothing is committed during the loop · the owner's scene edits (godot/scenes/*.tscn) are never overwritten · every agreed point is written to a running list in chat (and in the Relay at close-out) so the final pass misses nothing · the owner's reference images = layout idea only, never copy another game's art/look (CLAUDE.md, art rules).

## Setup (once per chat, owner's Windows PC)
- `S=<scratchpad>`; engine: if `$S/godot/Godot_v4.7.2-stable_win64_console.exe` is missing → `mkdir -p "$S/godot" && unzip -q -o "$USERPROFILE/Downloads/Godot_v4.7.2-stable_win64.exe.zip" -d "$S/godot"` (cloud: ui-work 4e).
- Back up every file the patch will touch: `cp godot/scripts/ui/prep.gd "$TEMP/prep.gd.bak"` (one .bak per file).
- Ask the owner to Save (Ctrl+S) any scene they changed in the editor first — the shot reads the file on disk.

## Each sample
1. Start from the backup (`cp "$TEMP/prep.gd.bak" godot/scripts/ui/prep.gd`), then apply the patch with a small python replace that asserts each old snippet occurs once. Mark it `# PREVIEW ONLY (not committed)`. Size knobs via env vars (e.g. `PREVIEW_BENCH_W`) so one patch renders several variants.
2. Render from the repo root (one size is enough for a sample; ~40 s):
   `"$S/godot/Godot_v4.7.2-stable_win64_console.exe" --rendering-driver opengl3 --audio-driver Dummy --path godot --resolution 844x390 -s res://tests/shots.gd -- --out "$S/pvX" > "$S/pvX/run.log" 2>&1`
3. Check: `grep -E "AUDIT 844x390 (prep|prep-bought|prep-late|prep-drag) |SCRIPT ERROR|Parse Error|^ERROR" "$S/pvX/run.log" | sort | uniq -c` — any ERROR = the sample is wrong (find out why before showing it).
4. Read `prep-late.png` (full bench + board + tribes) and, if useful, `prep-bought.png` (early game). Look for overlap with the reroll button, tribe list, board tiles.
5. Restore: `cp "$TEMP/prep.gd.bak" godot/scripts/ui/prep.gd` → `git status --short` must show only the owner's own edits.
6. Copy the chosen PNGs to `$S/preview/<label>.png` (never into godot/ — Godot imports them) → SendUserFile (display render) → Thai reply: what each label shows, what overlaps, recommendation, the running list of agreed points.

## Traps (found set 208)
- `HBoxContainer` / `VBoxContainer` cannot change orientation (`ERROR: Can't change orientation of HBoxContainer`) — swap in a new container (copy anchors + offsets, move the children) or use `BoxContainer` / `GridContainer`.
- Cells keep their content's minimum size: setting `custom_minimum_size = 0` does not shrink a cell below its label + sprite → a column of 5 overflows a short box; hide the name, shorten the box contents, or lay the cell out sideways (picture left, name right).
- `_part(lay, name, cls)` binds by name AND class: changing a scene node's type needs the matching class in prep.gd `_bind`.
- `editor_screenshot` (Godot MCP) shows the empty layout boxes only — the cells are made by code, so samples must come from shots.gd.

## End of loop
Owner says ทำจริง → follow skill `ui-work` with the agreed list (all sizes, tests, gate per HARD RULE 3).
