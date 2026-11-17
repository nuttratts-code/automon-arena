# Asset hub (set 240) — คลังงานศิลป์ Automon

Local web page where the owner keeps every art round per creature (prompt → still → cut → Veo input → video → frames → shadow) and where Claude picks the work up. Owner picks set 240: B2 all features · C2 Godot reads the shadow · D1 existing art seeded · E1 feet + one oval + sun-cast.

## Run
- Owner: `npm run assets` in the repo folder → open http://127.0.0.1:5177 (only this PC can reach it).
- Claude (desktop app): `preview_start` name `asset-hub` (D:\GitHub\.claude\launch.json).
- `node tools/asset-hub/server.mjs --check` = validate hub.json · `--export` = write godot/data/unit_shadows.json.
- `node tools/asset-hub/seed.mjs` = add new characters from src/core/characters.js + new files in art/library/pictures/sprites/ (keeps everything already there).

## Where things live
| What | Where | Git |
|---|---|---|
| Hub data (items, rounds, notes, prompts, shadows, queue) | `art/hub/hub.json` (`rev` +1 on every save) | committed |
| Owner uploads + Claude's working outputs | `art/hub/files/<ID>/<slot>[_move][_fN]_<date>_<hash8>.<ext>` | ignored (local) |
| Starred (★) rounds | copied to `art/library/characters/<ID>/` + INDEX.csv row (library rules: never delete / overwrite) | committed |
| Shadow values for the game | `godot/data/unit_shadows.json` (button "ส่งค่าเงาเข้า Godot") | committed, shipped |

Round fields: `slot` still · cut · veoin · video · frames · file — `form` 1/3 — `move` idle/attack/hit/die — `star` = the one in use — `archived` = hidden, file kept — `licence` (default AI placeholder - UNVERIFIED) — `promptId` = the prompt version it was made from — frames add `meta {cols, rows, fw, fh, n, ms}`.

## Claude's queue ("ดูคิว" / "ดูคิว asset hub")
1. Read `art/hub/hub.json` → `queue` items with `state: "open"` (each names `item`, `step`, `form`, `move`, `text`).
2. Do the work with the usual runbook (skill `char-idle` route P: cut, padded Veo input, frames; art-style §5–6 for prompts).
3. Put results back: server running → `POST /api/upload?item=ID&slot=cut&form=1&by=claude&name=x.png` (body = file, header `Origin: http://127.0.0.1:5177`); otherwise copy the file into `art/hub/files/<ID>/` and append a round to hub.json by hand (unique `id`, `by: "claude"`, bump `rev`). New prompt = append to `items[ID].prompts` (`by: "claude"`, `form`). A frames round needs `meta`.
4. Set the queue item `state: "done"` + a short Thai `reply`, bump `rev`, commit hub.json (+ library files if starred).
Never star for the owner — the owner picks.

## Shadow numbers (E1)
`feet` = picture point on the slot (fraction, y down) + `size` = that picture in px; the game shifts the sprite only when its texture has the same size (main still shows the old placeholder tiles, so feet wait for the real art at the r38 port). `oval` dx/dy/w/h in tile units (game default 0.8 × 0.45), `a` strength.
`cast` = the shadow that follows the body (owner set 240 follow-up: this is the one to tune): the picture rows above the ground line projected along the sun — x stays x, height h goes to `sun × h × len × reach` (reach 0.96 = stage3d sun) — so it starts at the feet. Orange tip handle = length (per creature) + sun direction (`settings.sunAngle`, ONE value for every creature, exported as `sun` [x, z]); dragging the shadow body = `ox`/`oy` start offset (tile units); `str` strength, fading to 35 % at the head. Port: build it this way (side axis = world x), not with the s239 v45 perpendicular side axis, so the game matches the hub preview.
`lift` = oval height above the floor (r38 plaza needs it higher, see s239 v44 notes).

Security (HARD RULE 9): Node built-ins only · binds 127.0.0.1 · POSTs only from its own page origin · upload whitelist (png jpg webp gif mp4 webm mov glb pxo txt) ≤ 600 MB · ids `[A-Za-z0-9_-]` · file reads stay inside art/hub/files and art/library · page uses textContent + CSP self · Godot clamps every number it reads.
