---
name: scratch-cleanup
description: Disk cleanup on the owner's PC (เคลียร์ไฟล์ / ไฟล์บวม / พื้นที่เต็ม / ลบของเก่า / Temp ใหญ่): measure what grew, sort keep vs delete, owner OK on one list, delete by explicit full paths, git gc, fix doc paths. Use when the owner says files grew, the disk is full, or asks to clear old work.
---
# Scratch cleanup (set 238, 16 Nov 2026 — done twice; owner A1)

Deleting is permanent → the owner approves ONE list first (AskUserQuestion, A1 delete all / A2 part / A3 none). Never delete what is not on that list.

## Never delete
- `art/library/` (owner art store, set 221) · the live scratch Godot copy `…/GitHub/automon-scratch/` (moved out of %TEMP% 16 Nov) · this chat's own folders (its scratchpad path and its `tasks` folder — two different hash folders under %TEMP%/claude) · `%TEMP%/claude/bash-edit-diff` and `sandbox-status-*` / `C--Users-*` (harness) · `godot/.godot`, `godot/tests/golden` (caches, rebuilt by tools).
- Any %TEMP%/claude folder with a file changed in the last 3 h — another open chat may use it.

## 1. Measure (Git Bash, ~1 min)
```bash
du -sh /c/Users/nuttr/AppData/Local/Temp/claude/* | sort -h | tail -10
du -sh /c/Users/nuttr/AppData/Local/Temp/claude/6778d44212994c0a/*/ | sort -h | tail -10
du -sh /c/Users/nuttr/OneDrive/Documents/GitHub/* | sort -h
git status --porcelain --ignored | awk '{print $2}' | xargs -r du -sh 2>/dev/null | sort -h | tail -10
du -sh .git; git count-objects -vH; git worktree list
```
Big items so far: old chats' scratch Godot copies (0.2–0.9 GB each), render/clip `out/` folders, orphan worktree folders `GitHub/wt-*`.

## 2. Sort
- Grep active docs for each folder id: `grep -rl <id> claude/*.md claude/workflow .claude CLAUDE.md` (old preview notes don't count — history only).
- A folder holding owner-picked results: check those results are in `art/library` (`git ls-files | grep <name>`) before listing it.
- Orphan worktree folder (`git status` says "gitfile does not point to a valid repository"): compare its files with the repo (`cmp`); delete only if it has no file the repo lacks.
- Registered worktree: `git branch -a --contains <its HEAD>` must show a pushed branch and `git -C <wt> status --porcelain` must be empty.
- Recent-use check: `find <folder> -mmin -180 -print -quit` non-empty → skip.

## 3. Delete (after the owner's OK)
- The safety check blocks `rm -rf` on globs or variables (`dir/*`, `$T/*`). Write every target as a full literal path (or `cd <parent> && rm -rf <name> <name> …` with literal names). Do not script around the check.
- Stale worktree: `git worktree remove <path>`; on Windows git cannot delete `.git/worktrees/<name>` ("Permission denied") → `rm -rf` that literal path, then `git worktree prune`.
- "Device or resource busy" = a program (usually the Godot editor) has the folder open → tell the owner to close it without saving and reopen the project from its new place.
- Then `git gc --prune=now -q`. `.git` stays ~530 MB because the AI .glb originals are committed; shrinking it means rewriting history — don't.

## 4. After
- Moved anything a doc names → fix the path everywhere (`grep -rn <old path>`), ripple line in the commit, docs-only → main.
- Report in Thai: GB freed per group, what was skipped and why, anything the owner must do (reopen Godot).
