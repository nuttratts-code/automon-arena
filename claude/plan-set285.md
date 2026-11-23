# Plan set 285 — renumber creatures by rarity (owner R1 + T1, 23 Nov; answers A1 B2 C1 D1)

Map old→new (only these move; every -1 stays): HL 7→6 8→7 6→8 · PL 3→2 2→3 7→4 4→5 8→6 5→7 6→8 · PT/WN/WY 7→4 4→5 5→6 8→7 6→8 · SF 3→2 2→3 7→4 4→5 5→6 8→7 6→8.
Checked: each tribe map is a permutation; new order = rarity order, same rarity keeps old order (scratch check.mjs).
Method: ONE regex pass per file `\b(HL|PL|PT|SF|WN|WY)-([1-8])\b` → map lookup (a swap never chains: each hit is mapped once from the original text). Files/folders named by ID: two-step rename via a temp name.
AMCFG1 rev 58 (savedAt 9 Nov) — cfgdiff MATCH (no differing cell). Note: rev did not move, so no new 💾 since 9 Nov.

Owner answers: A1 history files keep old IDs + header note (archive/, measure-log, review-*, preview-set*/, bosstune/, charstat, prompts-set228, mockups) · B2 old saves / drafts converted on load · C1 owner's uncommitted hub edits committed first · D1 Claude rewrites Balance Room db (rev+1) + publishes the Balance Room; game page NOT published (frozen set 189).

Side effects known up front:
- dataHash includes chars → hash changes. botdata.js: IDs remapped + hash set to the new hash (teams identity-preserving, no botgen run).
- bot.js:85 / bot.gd:163 tie-break `id < best` compares ID strings → exact-score ties may pick differently (both sides, parity unaffected).
- humanstats: ARUN1 codes from the live v132 game carry the old hash → counted as "old patch" (no misattribution).

## Steps (tick when done + pushed)
1. [x] C1: commit owner hub edits (hub.json, INDEX.csv, library HL-2/HL-4) to main as-is — after the owner closes the hub (port 5177).
2. [x] Rename pass in live text files: src/ (core, game, lab, tests, tools), godot/ (scripts, tests, data, tools), tools/asset-hub (+tests), .claude/skills, claude/ live docs (combat/tribe/shop-merge rules, build-plan, characters.csv, creature-animals, art-style, idle-picks.csv, workflow/*, workflow.md, pending, backlog, reviews.md), art/placeholder (tables.py, picks.txt, picker_template), art/library/INDEX.csv. Skip binary files and history files (A1).
3. [x] File/folder renames by ID (two-step): art/library/characters/<ID>/ + file names, art/library/pictures, art/placeholder/tiles, godot/tools/idle_preview.
4. [x] save.js B2: readSave accepts `data === OLD_DATA_HASH` (pre-rename hash) → remap IDs in P/B/stats, continue; history + play journals same. save.gd same (change both). Balance Room: DRAFT_KEY v9 → v10 with v9 draft remapped on load; local sim/bench/combo keys remapped on load.
5. [x] botdata.js hash → new dataHash; `node tools/exportdata.mjs` → godot/data/game.json + hash.
6. [x] Godot data: unit_shadows.json, labels.json, art.json (step 2 covers text) · golden rebuild (`node src/lab/golden.mjs`) + parity replay (skill port-parity). → Godot tests 60/61: the 1 fail = test_golden_stage_exact js_pow, same on unchanged main (PC Node 24 vs CI Node 22, known since set 215).
7. [x] Thai docs version bump (+0.1, ID renumber) + handoff Doc versions line · history files get header note (A1).
8. [x] Ripple check (ripple.md map + grep of every changed ID) → ripple line.
9. [x] setup until pass → gate once → merge to main → CI green.
10. [ ] Hub (owner hub closed): hub.json + stillpicks/latest.json + history.jsonl text pass, art/hub/files/<ID>/ folder renames, still-batches batch.json `item`.
11. [ ] Balance Room db: config/main (rev+1, savedAt), results/latest, ui/main, simTeams, ideas text/char → remapped (pinned writes).
12. [ ] Publish Balance Room (skill publish-pages) → Relay line → owner: cells to set back (none expected; local drafts converted).

Security: no secrets touched; no new dependency; db content treated as data; secret grep before each commit.
- Found while working: `\b` misses an ID followed by `_` (PL-2_icon…) → second pass for IDs followed by `_` (library names, hub orig/library paths, batch files). · tools/cfgdiff.mjs main guard never runs on Windows (pathname /D:/…) → ran it via a direct import.
