# Plan set 240 — asset hub (owner B2 all features · C2 Godot now · D1 seed existing · E1 feet + oval + cast · A1 one oval)

Security line (HARD RULE 9): Node built-ins only (no packages), server binds 127.0.0.1 only, uploads = ext whitelist + size cap + id regex + no path traversal, files saved with new names (never overwrite), Godot reads the shadow JSON with range checks. Hub working files stay outside godot/ (never shipped).

1. [x] `tools/asset-hub/server.mjs` — local server (127.0.0.1:5177): serves the page, `/api/hub` GET/POST, `/api/upload`, `/api/export`, files from art/hub + art/library (read-only). Check: `node tools/asset-hub/server.mjs --check`.
2. [x] `tools/asset-hub/index.html` + `app.js` + `style.css` — board (search, tribe/status filter, tribe+form grouping), character card (prompt + history, rounds per slot with star/note/licence/archive, checklist + green auto-check, background switch, compare side-by-side/slider, video frame step + loop + camera-drift check, arena preview, shadow editor feet/oval/cast), Claude queue, library tab (INDEX.csv), other asset kinds + moves. Check: browser pane.
3. [x] `tools/asset-hub/seed.mjs` — D1: 48 characters from src/core/characters.js + existing library stills/sheets (sprites/) as rounds. `art/hub/hub.json` committed; uploaded files `art/hub/files/` git-ignored; starred rounds copied to `art/library/characters/<ID>/` + INDEX.csv row (library rules 0–2).
4. [x] Export `godot/data/unit_shadows.json` (oval in tile units, feet as image fraction + the image size it was set on, cast len/strength for the r38 port, global lift).
5. [x] `godot/scripts/ui/stage3d.gd` — read unit_shadows.json (validated), oval size/offset per unit, feet shift only when the texture size matches; test in tests/test_stage.gd.
6. [x] Docs: art/library/README.md (characters/ folder), char-idle skill pointer, CLAUDE.md topic row, package.json script `assets`. Ripple grep.
7. [x] Merge gate (setup → gate) → merge → Relay + close-out.
