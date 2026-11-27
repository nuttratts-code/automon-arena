# Hub tablet (set 305) — แก้พิกเซลภาพนิ่งบนแท็บเล็ต

Private Artifact https://claude.ai/artifact/JuP4Jgm4HEpPNPWksVzrDS (owner only). Owner picks set 305: A2 the 96 ★ stills only (form 1 + 3, no icons/frames) · B1 basic tools · C1 pull = new round + ★ · D1 private Artifact OK.

## What is where
- `hub-tablet.html` = the page (published as is; the Artifact tool wraps it). Tools: pencil / eraser / fill / eyedropper, image colours + own colours, undo / redo, two-finger zoom + pan, pen-only switch, hold-to-compare, ×1 ×2 preview, versions strip. Pictures with hub `flip` are shown mirrored like the hub still step; the pointer maps back, files stay unmirrored.
- `pics.json` (published beside the page) = the 96 pictures: `key` (`<ID>_f<form>`), `item`, `form`, `round` (hub round it came from), `flip`, `asset` (artifact asset id; picture = `/_blob/<asset>`), `srcFile`; `extra` = 133 Claude set 298 fix rounds (`kind` clean = เก็บภาพ, edge = ขอบดำสนิท; owner turn 2, set 305) shown in the versions strip, never ★ by themselves; opening one and pressing บันทึก = an `edits` row ("use this one", `from` = that asset) · `hubRev` = hub.json rev when uploaded (2146); `palettes` = hub `items[ID].palette` at that time.
- Artifact db: `edits/<auto>` = one per save `{key, item, form, round, asset, from, w, h, t}` (`from` = the asset it was edited from) · `palettes/<ID>` = `{colors: [#rrggbb…], t}` the owner's own colours added on the tablet.
- `testserver.mjs` = local test only (mock db + assets): `node tools/asset-hub/tablet/testserver.mjs` → http://localhost:5199 (env `REPO` = repo folder for the original pictures).

## Pull back into the hub (Monday, owner C1)
1. `ArtifactData list` collection `edits` (and `palettes`) with `out_dir` in the scratchpad.
2. Per `key` keep only the newest `t` (a row whose `from` is a set 298 asset and pixels equal it = the owner picked Claude's round: star that existing hub round instead of uploading a copy) (earlier saves are steps of the same work; they stay in the Artifact). Check the hub ★ still of that item + form is still `round` from pics.json — if the owner changed it on the PC meanwhile, ask before pulling that one.
3. Download each kept asset: `Artifact read` with `url` + `path` = asset id.
4. Hub server running: `POST /api/upload?item=<ID>&slot=still&form=<f>&by=owner&name=tablet_<ID>_f<f>.png` with header `Origin: http://127.0.0.1:5177` → new round, ★ (owner C1). Then in hub.json set that round's `flip` = the source round's `flip` and `note` = `แก้บนแท็บเล็ต (set 305) จาก <round>`, bump `rev` (server stopped or reload after).
5. Palettes: add each `palettes/<ID>` colour to `items[ID].palette` (no duplicates, ≤ 64, `#rrggbb`), bump `rev`.
6. `node tools/asset-hub/server.mjs --check`, commit hub.json (+ art/library copies only if the owner ★ by hand later), tell the owner to press F5 and look.
