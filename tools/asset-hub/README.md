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

Round fields: `slot` still · cut · veoin · video · frames · file · icon — `form` 1/3 — `move` idle/attack/hit/die — `star` = the one in use — `archived` = hidden, file kept — `licence` (default AI placeholder - UNVERIFIED) — `promptId` = the prompt version it was made from — frames add `meta {cols, rows, fw, fh, n, ms}`.

## Auto frames + shadow (owner A1, set 240 follow-up)
The page button "ตัดเฟรม + สร้างเงา" (video and frames steps, also in the "ส่งงานให้ Claude" dialog) runs step 2b + 2c below on this computer, no chat: `POST /api/frames?item&round&form&move` (needs the page's exact Origin) → server spawns `python -I painted_idle.py <video> <tmp> 32 150 --bg=auto` then `hub_add.py` (fixed args, no shell, one job at a time, 10 min cap, tmp dir removed) → a done queue entry `by: "auto"` with the numbers + warnings (`clipWarnings`: feet drift > 2 px on the sheet, body touching a video edge, loop seam diff > 3). The page polls `GET /api/job`. Needs `python` (or env `PYTHON`) with opencv, numpy, scipy, pillow. The owner judges the look from the frames player; Claude's eyes only when the owner sends the item to the queue.
hub_add.py keeps the feet point the owner already set (owner D1, set 246): old `shadow.feet` is mapped onto frame 1 through the creature's solid-pixel box in the old picture and in the new frame (works when the frames are a different size); no old feet / old file gone → guessed from frame 1.

## Steps, frame strip, icon (owner set 246)
- Steps: ภาพนิ่ง + ตัดพื้น · วิดีโอ · เฟรม · เงา · ไฟล์อื่น · พรอมต์. The image prompt and the Veo input + video prompt share the last tab "พรอมต์" (owner C1); `ui.step = 'veoin'` opens it.
- Shadow tab shows every frame of the shadow's frames sheet (else the starred / newest form-1 idle frames) as thumbs; click = pause on that frame; "ใช้เฟรม N เป็นภาพนิ่ง" uploads that frame as a new still round (newest = ★ used, old stills kept; flip copied) (owner A1).
- Still step box "ไอคอน (กรอบข้าวหลามตัด)" for the shop / bench screens (owner B1): the dialog shows the game picture (★ cut, else ★ still); drag the diamond onto the part to keep, wheel / slider = size (even px), arrows = 1 px. Output = N×N real pixels (no scaling), outside the diamond transparent, no border; saved as slot `icon` (newest = ★ used), crop kept in `items[ID].iconCrop {round, x, y, n}`; older icons are thumbs, click = use that one.
- Picture in use + facing (owner set 248 round 2): the still step lists originals and cuts as two separate groups (no pair view; click a row to look at it). Originals + cuts of a creature form share ONE ★ (server `starGroup`) = the picture every page and the game use (`usedPic`: ★, else the cut of the newest still, else that still), shown in a yellow bar at the top of the still step; a new cut / pixel edit / frame-as-still is used at once. Facing = what the still step shows: a still / cut is drawn as its file, mirrored when ⇋ กลับข้าง (`flip`) is on (the switch turns the original and its cuts together); video, frames, Veo input and icon turn the same way as the picture in use (no switch on those steps). Files are never changed; editors map the pointer back to file pixels. Export `units[ID].mirror` = the picture in use is shown mirrored. One-time data move (set 248): still / cut `flip` inverted to keep each picture's look, ★ moved to the old team picture, marked `settings.migr249`.
- Shadow editor source: idle frames newer than the picture in use (= made from it), else the picture in use. Per-frame shadows (owner set 248 B): the system's shadow covers every frame; click a frame thumb = edit that frame only (paused, orange dot = has its own), "ทุกเฟรม" = edit the shared one, "ล้างเงาเฟรมนี้" = back to the shared one. Stored as `shadow.frames {i: {feet, cast}}` (feet = file fractions), exported as `units[ID].frames`; dropped when the shadow moves to another picture.
- Every write (save, upload, star, export) shows a big green "✓ บันทึกแล้ว" at the bottom centre for 1.5 s; a failed write stays red until closed (owner D1, set 247).

## Claude's queue ("ดูคิว" / "ดูคิว asset hub")
1. Read `art/hub/hub.json` → `queue` items with `state: "open"` (each names `item`, `task`, `video`, `form`, `move`, `text`).
2. **`task: "frames+shadow"` (owner flow set 240: the owner presses "ส่งงานให้ Claude" → "ตัดเฟรม + สร้างเงา") = the default job:**
   a. Video = the round id in `video` (the owner's starred video for that form + move); file = `art/hub/files/<item>/…` (`file` field minus `hub/`).
   b. Frames: skill `char-idle` route P step P4 — `python -I .claude/skills/char-idle/painted_idle.py <video> <scratch>/out 32 150` (writes `sheet_32x1_<W>x<H>.png` + `preview.gif`, prints ms per frame and feet row min/max — must be equal). Check one GIF frame on a flat colour (no green rim). A bad clip (camera moved, cut-off body) → do not add; answer the item with the reason instead.
   c. Add + shadow: `python -I tools/asset-hub/hub_add.py <item> <sheet.png> <ms> --form <f> --move <m>` → frames round (by: claude, not starred) + the creature's shadow set on it (feet guessed from frame 1, size = one frame, owner's oval / body-shadow numbers kept, defaults for a new one).
   d. Answer: queue item `state: "done"` + Thai `reply` (loop length, ms, feet row check, "ติดดาวเฟรมถ้าโอเค แล้วเปิดขั้นเงาปรับต่อ"), bump `rev`. Commit hub.json (uploads stay local). Send the GIF to the owner.
   (Normally the owner presses the button instead — see "Auto frames + shadow"; a queued frames+shadow item means they want Claude's eyes on it.)
2b. **`task: "check+veo"` (owner flow set 240 follow-up: still → "ส่งให้ Claude ตรวจ + เขียนพรอมต์วิดีโอ") — the owner's main still job:**
   a. Still = round id in `still` (starred, else newest still of that form). Read it at ~700 px.
   b. Check the rules: char-idle P1 (tribe readable by colour + silhouette, fantasy not a plain animal, face not too fierce, no pink on the body, flat green/magenta background) + art-style §5–6 (painted look matching the scene, form 1 vs 3 size) + not resembling the original game (CLAUDE.md scope). Also the item's tribe / name in hub.json.
   c. Pass → write the Veo prompt from the char-idle P3 template, filling FRAMING / MOTION / EFFECT from THIS picture (highest parts, feet, tail/mane/plates, glow spots); `python -I tools/asset-hub/veo_prep.py pass <qid> --reply <file> --veo-prompt <file> --dry <scratch>/vp` → Read `cut_check.png` (no green rim, no shadow bits) → run again without `--dry` (adds cut round, veoin round = 1280×720 padded input, prompt kind "veo"; page shows it in step 4 with download + copy).
   d. Fail → `veo_prep.py fail <qid> --reply <file> --gemini-prompt <file>`: reply = each failed rule + what to change; Gemini prompt = the item's latest still prompt fixed for those points (owner B1).
   e. Commit hub.json; tell the owner pass/fail in Thai (pass: send the veoin picture is not needed, the page has it).
3. Other tasks (free text): do them with the usual runbook (char-idle P2 cut / padded Veo input, art-style §5–6 prompts). Put results back with `POST /api/upload?item=ID&slot=cut&form=1&by=claude&name=x.png` (server running, header `Origin: http://127.0.0.1:5177`) or copy into `art/hub/files/<ID>/` + append a round by hand (unique `id`, `by: "claude"`, bump `rev`). New prompt = append to `items[ID].prompts` (`by: "claude"`, `form`). Then step 2d.
Never star for the owner — the owner picks. The page notices the new rev on its next save (it reloads); tell the owner to press F5.

## Team + size tab ("จัดทีม · ขนาด", owner set 246)
Owner picks: A scene on/off · B1 free slider + pixel snaps (1× 1.5× 2× 2.5× 3×) · C1 saved per creature + exported · D1 starts with our 6, every slot changeable.
- Background `art/hub/files/_team/arena_battle_1920x1061.png` (local, ignored) + slot feet points `TEAM_SLOTS` in app.js both come from the Godot battle test: automon-scratch `g/tests/s240_cuts.gd` with `TEAMDUMP=1` (prints `TEAMSLOT k x y` as view fractions, hides every unit). New arena or camera → render again and update both.
- Picture per slot = cut of the starred form-1 still, else that still; trimmed to its pixels, feet = bottom centre on the slot point; our side faces right (pictures face left; `flip` rounds are already mirrored).
- Positions are locked to the slot centres by default: drag a creature onto another slot = swap the two in `settings.team.ids` (empty slot = move there); the slot buttons in the panel also swap by drag. Switch off "ล็อคตำแหน่ง" = `items[ID].free = true`, then dragging / arrow keys set `items[ID].offset = {x, y}` (screen px, x toward the foe, y down, negative = floating, ±400/±300); exported as `scale[ID].offset` only while unlocked. Unlocked creatures can also turn: slider / ⟲ ⟳ / Q E (1°, Shift 15°) = `items[ID].rot` degrees clockwise on screen around the feet, ±180, exported as `scale[ID].rot` (owner B1/C1, set 247). Locking again deletes `free`, `offset` and `rot` (back to the slot centre, upright; Ctrl+Z restores, owner A1 set 247).
- Feet point ("ปรับจุดเท้า") = the same `items[ID].shadow.feet` the shadow tab uses (owner B1): the feet land on the slot. Editing it here re-points the shadow at this still (`shadow.round`, `shadow.size`) after a confirm when the shadow was set on another picture.
- `items[ID].scale = {k, size, round}`: k = screen px per picture px in the 1920×1061 battle view; default 2 for pictures ≤ 256 px tall, else 180 px tall. `settings.team = {ids[6], showBg}`.
- Export adds `scale` {ID: {k, size}} to godot/data/unit_shadows.json (clamped 0.05–8). The game does not read it yet (r38 port: `pixel_size = k × world size of one screen px`, apply only when the texture size matches).

## Shadow numbers (E1)
`feet` = picture point on the slot (fraction, y down) + `size` = that picture in px; the game shifts the sprite only when its texture has the same size (main still shows the old placeholder tiles, so feet wait for the real art at the r38 port). `oval` dx/dy/w/h in tile units (game default 0.8 × 0.45), `a` strength.
`cast` = the shadow that follows the body (owner set 240 follow-up: this is the one to tune): the picture rows above the ground line projected along the sun — x stays x, height h goes to `sun × h × len × reach` (reach 0.96 = stage3d sun) — so it starts at the feet. Orange tip handle = length (per creature) + sun direction (`settings.sunAngle`, ONE value for every creature, exported as `sun` [x, z]); dragging the shadow body = `ox`/`oy` start offset (tile units); `str` strength, fading to 35 % at the head. Owner F1: `blur` softness (0..1 → blur radius 0.12 × picture height, blur the silhouette once) and `k` {tl,tr,bl,br} = per-corner offsets [x, z] in tile units of the shadow quad (bl/br = feet end, tl/tr = head end), drawn as a bilinear warp of the quad. Port: build it this way (side axis = world x), not with the s239 v45 perpendicular side axis, so the game matches the hub preview.
`lift` = oval height above the floor (r38 plaza needs it higher, see s239 v44 notes).

Security (HARD RULE 9): Node built-ins only · binds 127.0.0.1 · POSTs only from its own page origin · upload whitelist (png jpg webp gif mp4 webm mov glb pxo txt) ≤ 600 MB · ids `[A-Za-z0-9_-]` · file reads stay inside art/hub/files and art/library · page uses textContent + CSP self · Godot clamps every number it reads.
