# handoff State lines moved out (set 250 weekly review O1, 19 Nov 2026)

Web game frozen since set 189; still true, needed only for balance import / web game work.

- Import: follow the fast order in workflow/balance-import.md §0 (V1.31). Import path: main account reads the db and builds the `AMCFG1` code itself (set 166) · 2nd account: Balance Room "คัดลอกค่าให้ Claude" paste → `src/tools/cfgcode.mjs` (workflow/balance-import). Match code `AMATCH1` → `node lab/replay.mjs --code <file> [--fx]`.
- t-skill-calc findings F1–F4: all decided 28 Oct and now real tests; tests/run.js keeps the `WAIT` list (empty) for future findings.
- Run-log viewer (set 110): runlog.html = lab/runlog.template.html + lab/runlogread.js (shared with lab/runlog.mjs); build.mjs page 4; tests/runlog-fixture.js plays a fair run for tests. Player name: core/runlog.js rlName, journal/code/db `nm`.
- Run journal (set 109, core/runlog.js): every run action with gold before→after → game db `runlogs/…` + match replays `parts/r` (set 188) + run code ARUN1 v2 (Log screen copies 60 newest as codes for the Balance Room, set 188); read with `node lab/runlog.mjs <file>`; public-link viewers cannot write db → friends send the run code (full note: archive/handoff-trim-2026-11-10.md).
