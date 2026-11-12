---
name: port-parity
description: Automon Arena JS ↔ Godot parity check (parity / พอร์ต / ผลไม่ตรงกัน / golden / แก้ core แล้ว Godot ต้องตรง) — the JS core is the reference; after a change to src/core, to game values or to godot/scripts logic, rebuild the golden fixtures from JS and replay them in Godot until every log matches exactly. Use whenever a set edits a src/core file that carries a "change both" comment, changes game values (game.json), or edits godot/scripts/*.gd game logic. Rules live in claude/plan-godot-migration.md (§2 steps 1–6, §3 risks) and win if anything differs.
---
# port-parity (set 209 — runbook from plan-godot-migration §2/§3; the CI job `godot` runs the same commands)

1. **Find the pairs:** `git diff --name-only origin/main...HEAD -- src/core godot/scripts godot/data` → for each changed src/core file `grep -n "change both" <file>`: the .gd file and test named there change in the same commit (and the other way round). JS is the reference — never bend JS to match Godot unless JS is the bug (skill `find-cause`).
2. **Values or data changed:** `cd src && node tools/exportdata.mjs` → godot/data/game.json + hash (CI fails when it is stale). Game values themselves only through `balance-import` (HARD RULE 6).
3. **Golden fixtures:** `cd src && node lab/golden.mjs` → godot/tests/golden/ (git-ignored, ~180 MB, always rebuilt from the current core — never trust an old set).
4. **Godot tests:** engine = cloud `bash godot/tools/get_godot.sh <scratch>/godot` · owner's PC = the console exe (skill `ui-work` step 4e). While developing: `TESTS_ONLY=battle,rng <godot> --headless --path godot -s res://tests/run.gd` (names = tests/test_<name>.gd). Before merging, the full run in the background (~11 min): `<godot> --headless --path godot -s res://tests/run.gd -- --require-golden` → last line `GODOT TESTS: PASS n/n` (grep it; never trust the exit code alone).
5. **Run code both ways:** `cd src && node lab/golden-save.mjs check ../godot/tests/golden/godot-arun1.txt` and the same for `godot-ui-arun1.txt` (a Godot-made ARUN1 code must open in the Balance Room reader).
6. **Mismatch = find the cause first (HARD RULE 5):** narrow to one battle/run and the first differing event, then walk the §3 risk list: 32-bit math (`imul`, `>>> 0`) · `js_round` vs `round()` · sort without an index tie-break · int vs float division · float parse (golden floats are `{"$f": bits}`) · dictionary / key order.
7. **A new ported file:** break the .gd on purpose once → its test must fail → restore (sets 193/194 did this). Add the "change both" comment to the JS file.
8. **Record:** commit `ripple:` line names both files; the Relay line says `Godot tests n/n (golden)`. Then skill `merge-code`.

Security: ③ golden + game.json are data only (JSON, validated on load) · ④ godot/tests/ and tools/ are excluded from every export.
