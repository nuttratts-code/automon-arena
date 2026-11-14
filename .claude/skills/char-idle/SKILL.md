---
name: char-idle
description: Character still → idle (ภาพนิ่งตัวละคร / ท่ายืน / idle / วิดีโอ Gemini / 8 เฟรม / ยืดหด / ตาเรือง / เลือกท่าหายใจ / เติมขอบดำ) — snap the owner's Gemini still to real pixels, then route B first: the owner makes ONE Gemini video from the still with the fixed prompt, Claude turns it into 8 real-pixel frames (video_idle.py), the owner touches them up in Pixelorama; route A (8 code-idle variants, owner picks) only when the video fails. Record in claude/idle-picks.csv. Also the effect pass (หาจุดเรือง / ลบสายฟ้า / ตาให้คม — owner picks keep/remove/crisp per spot), reading the owner's Pixelorama .pxo save, and the pixel-perfect arena check (ใส่ในฉาก / ขนาดพอดีพิกเซล). Use whenever the owner sends a new character still or video, or asks to redo or finish a character's idle. Rules: claude/art-style.md §2 (wins if anything differs).
---
# Character still → idle (set 221 · route B video added set 222 · effect pass + arena check set 223, 14 Nov 2026)

> Owner rules: set 222 L1 = **video first (route B), code idle (route A) only when the video fails** · set 221 = never apply a code variant silently, the owner picks per character · set 222 = **minimal processing** ("the more it is cleaned, the worse it looks"). Rules: claude/art-style.md §2 · art store: art/library/README.md (usable pieces only, never delete) · licence: AI art = placeholder, UNVERIFIED (set 219 D).

Scripts here (Python 3 + numpy + Pillow (+ opencv-python for video); run with `python -I`):
- `snap.py <in.jpg> <out.png> <block_px> <offset_px> <grid_n>` — AI "fake pixel" still → real-pixel RGBA, magenta bg → transparent, trimmed.
- `video_idle.py <video.mp4> <still_px.png> <out_dir> [n=8] [ms=190] [--frames=a,b,…]` — route B, see step B3. ~5 s per video.
- `colour_lock.py` · `part_copy.py` · `pxo_frames.py` — B4b steady colour, smeared part from frame 1, read the owner's .pxo (set 225).
- `idle_variants.py <still.png> <out.gif> [neck_row waist_row hip_row]` — route A, 8 code variants, 2.4 s loop, ×3 zoom.

## Shared steps (every character)
0. **Forms + effect spots (set 224, art-style §2):** each character has FORM 1 (stars 1–2) and FORM 3 (star 3); do every FORM 1 first, FORM 3 only after its FORM 1 is done. File names carry `_f3` for FORM 3 (`<ID>_f3_still_…`, `<ID>_f3_idle8_…`); idle-picks.csv `form` = 1 or 3. Each creature is designed with 1–2 effect spots (art-style §2) — the video `[EFFECT]` line uses those spots. Stills: check the art-style §2 never/should-not list first (shadow, pink, edge, dark mush, loose particles).
1. **Store the original still** in art/library/pictures/sprites/ as `<ID>_still_gemini_<date>.<ext>` + INDEX.csv row (only if usable — broken/wrong pictures: tell the owner, do not store).
2. **Find the grid:** zoom the source edges (crop + Read) — block size = width of one fake pixel (HL-1: 20.0 px on a 2000 px image), offset = where the first block starts, grid_n = blocks across. Run `snap.py`; Read the result at ×8 — stair-stepped clean edges = right; doubled/half pixels = wrong block or offset, retry.
3. **Store the snapped png** next to the original as `<ID>_still_px<W>x<H>_<date>.png` + INDEX.csv row.

## Route B — Gemini video → 8 frames (default, set 222 L1)
**B1. Owner makes ONE video** in Gemini from a **padded input** (set 225, owner: full body every time, saves Gemini quota by cutting re-rolls): Claude makes `<ID>_gemini_in_1280x720.png` = the snapped still ×4 (nearest) centred on a 1280×720 flat #FF00FF canvas (~45–50% of the height, wide margin all round) — the same 16:9 shape as the video, so Gemini has no reason to zoom/crop. Fall-back: the snapped-or-original still (a new Gemini chat, attach the still, paste the fixed prompt below; fill `[EFFECT]` per character — e.g. HL-1: `small blue sparks in the eye visor and a few tiny lightning sparks on the raised fist`, or `none`).
- **Length:** Gemini decides the clip length (HL-1 clips: 10 s, 24 fps, 1280×720) — any length is fine. Only ~1.5 s of it is used, so **one clip per character**; never ask for longer or for several.
- **Retry at most once**, only for a fail in B4. Second fail → route A (saves Gemini quota).
- The video stays in the owner's Downloads (not in the repo: big, and only the frames are used).

Fixed prompt (English, paste as is):
```
Animate this exact pixel-art character as a subtle idle breathing loop.

CAMERA: completely locked. No zoom, no pan, no tilt, no shake, no camera movement at all. The character stays exactly the same size and in exactly the same position for the whole video.

FRAMING: the whole character stays fully inside the frame for the whole video, from the highest point (horns, ears, halo, wing tips, tail tip) down to the feet, with the same wide empty magenta margin on every side as the input image. Never zoom in, never crop any part of the body.

AUDIO: none. Silent video, no music, no sound effects.

BACKGROUND: flat solid magenta #FF00FF for the entire video. No floor, no ground line, no shadow, no gradient, no vignette.

MOTION: very small and slow. Only the chest and shoulders rise and fall slightly, like slow breathing (one breath every 2 seconds). Arms move together with the shoulders by 1–2 pixels at most. Feet and legs stay perfectly still and planted. Glowing parts (eyes, runes, crystals) may glow brighter and dimmer gently with each breath.

EFFECT: [EFFECT]

STYLE LOCK: keep the exact same pixel art, same pixel size, same palette, same dark outlines and same details as the input image in every frame. Do not redraw. Crisp hard pixel edges, no blur, no anti-aliasing, no motion blur.

DO NOT ADD: smoke, dust, text, new objects, or any effect not listed under EFFECT.

LOOP: the last frame must be identical to the first frame so the video loops seamlessly.
```
If it zooms or adds smoke: put `Static shot, tripod camera, sprite sheet style animation.` on the first line and retry (this is the one retry).

**B2. Claude stores nothing yet** — the frames are about to be touched up (art/library rule 0). Work in the scratchpad.

**B3. Run** `video_idle.py <video> <ID>_still_px….png <scratch>/<ID>`. What it does — and nothing more (set 222):
- grid = one block size for both axes (Fourier) + phase (least change inside blocks) from frame 0; every frame snapped on that same grid;
- magenta → transparent; pink fringe removed **only where it touches transparency**;
- camera check on the **feet strip** (bottom 8 rows must not move/grow; sparks change the top/sides, so the whole box is no test) — later frames (Gemini often zooms near the end) are dropped;
- loop pick: the most alike start/end pair 1.2–3.0 s apart inside the still part → 8 evenly spaced frames, 190 ms each;
- **missing dark outline filled**: a transparent pixel next to a light edge pixel gets the most common dark edge colour of the picked frames (HL-1 `#0b0931`); ~40–110 px per frame. It does NOT catch every gap (diagonal corners, gaps inside the body) — the owner finishes them by hand (B5);
- **effects never get a dark rim (owner rule set 225):** effect pixel = outside the body core (present in ≥ 5 of 8 frames, grown 2 px) AND a colour the still does not have, or any bit not touching the body. No outline is added next to them and the video's own dark pixels around them are made transparent. A swaying tail/wing stays body (body colours) and keeps its outline. Prints `dark rim removed around effects per frame`; Read a ×8 crop of the effect frames to check.
- out: `idle_0..7.png`, `sheet_8x1_<W>x<H>.png`, `anim.png` (APNG), `preview.gif` (×4 on grey).
It prints grid, still-camera range, loop + frame numbers, outline colour. `--frames=…` forces frame numbers (HL-1 approved: `105,110,114,119,123,128,133,137`).

**B3b. Video cropped part of the body (set 224, PL-1 — owner: never re-roll for this, it wastes Gemini quota):** Gemini often zooms so the legs or a flame tip leave the frame in EVERY frame. Do not retry; patch it:
- the B3 frames use the same block size as the still (check: width matches) → find the video frame's place on the still (best offset of frame 0 against the still; PL-1 = 3 rows down, 1 col left);
- canvas = the still's size; rows above a seam row (≈ 2 rows above the video's bottom edge) come from each video frame, rows below from the still (legs stay planted). **Rows above the video's top edge must stay EMPTY** — filling them from the still left a frozen flame tip on every frame (set 224 bug);
- a part cut flat by the frame top (flame, ear): add a 5-row tapering tip per frame from that frame's own top-row colours (brightest inside, darkest at the sides, leaning like the still);
- the legs from the still look frozen → measure the body rise per frame (mean top row of the back) and offer leg variants in ONE GIF (1 still · 2 stretch with falloff · 3 rigid thigh follows the rise + shin stretches · 4 = 2 + knee 1 px forward · 5 = 2 ×2); owner picked **3** for PL-1;
- owner edits to frame 0 (e.g. flame outline removed) → copy that frame's region as is and apply the same rule to the other frames **inside a box with both x limits** (an open-ended box also stripped the horn outline, set 224 bug); count outline px of nearby parts before/after.

**B4. Check, then show** (Read the sheet; send preview.gif with SendUserFile). Fail = retry the video (B1 limit):
- camera still < 3 s, or no loop found (script stops) · seam change > 25% (visible jump) · the character is redrawn (different shape/details from the still) · background not flat magenta.
- Shimmer of ~15% of pixels per frame is normal for AI video — the owner accepted it (set 222). Do NOT clean it (palette lock, temporal median, optical flow, hysteresis all made it worse in set 222).

**B5. Owner touch-up in Pixelorama** (free, installed at `C:\Users\nuttr\OneDrive\Documents\GitHub\Pixelorama-Windows-64bit\Pixelorama-Windows-64bit\Pixelorama.exe`; Claude can open a file with PowerShell `Start-Process <exe> -ArgumentList '"<file>"'`):
- open **`anim.png` (APNG)** — it opens as 8 frames. A plain PNG sheet opens as ONE picture (set 222 trap);
- outline colour: type the hex printed in B3 into the colour box; Pencil (P); click frames in the timeline;
- save: File → Export → Spritesheet, 8 columns × 1 row, over the sheet file → tell Claude. Claude splits the sheet back into `idle_0..7.png` + `anim.png` (crop by width/8).
- **The owner often presses Save instead (set 223 trap):** that writes `<file>.pxo` next to the APNG and the sheet stays old. Always check file times first; read the frames from the .pxo (zip: `data.json` → `frames[i].cels[layer]` `image_size` + `offset`; `image_data/frames/<i+1>/layer_<l+1>` = raw RGBA of that cel size, placed at its offset). Unsaved edits sit only in the open window (title ends with `(*)`) and in `%APPDATA%/Pixelorama/backups/` — never close that window for the owner.

**B4b. Steady colour + smeared parts (set 225, SF-1 — owner: later frames must keep frame 1's colours):** run before B5 on every character, then show a before/after GIF:
- `python -I colour_lock.py <frames_dir> <out_dir>` — removes each frame's colour drift vs frame 1, a pixel close (< 40) to frame 1's colour at the same spot takes it, moved parts take the nearest frame 1 colour; sparks (white/pink light) untouched. Prints shift / locked / moved / spark kept per frame. (This replaces the set 222 "do not clean" advice for colour only; shimmer cleaners like temporal median stay dropped.)
- a part still muddy after that (SF-1 ears: video blurred yellow + purple into brown) → `python -I part_copy.py <dir> <out> x0 x1 y0 y1` pastes frame 1's box into frames 2–8 at the best offset (head bob 0–2 px). Box on the part only (above the head line). Find the box on a ×12 grid crop of frame 1.
- **Frame order check after the owner's save:** measure a moving part (tail tip x per frame) — SF-1's save had frames 1↔2 swapped (tail went right then jumped left); a smooth swing = one way for ~half the frames, then back. Fix the order from the owner's frames, never from the old ones (owner: "แก้จากงานที่ผมปรับ").
- Read the save with `python -I pxo_frames.py <file.pxo> <out_dir>` (B5 trap) — always work on top of the owner's latest save, in a NEW folder, and open the result in a new Pixelorama window.

**B5a. Effect pass (set 223 — every character has effects in other places, so nothing here is fixed to HL-1):**
1. `python -I fx_map.py <frames_dir> <out.png>` → numbered red boxes on frame 0 + one line per spot (box, frames, colour). Send the picture; explain each spot in Thai.
2. Owner picks per spot: **keep · remove · make crisp** (A1/A2… buttons).
3. remove → `fx_remove.py` (fills masked pixels from their neighbours) · crisp eye/visor line → `fx_eyeline.py` (fixed-length 2-row line, keeps the video's glow pulse in 3 levels from each frame's original brightness — the owner rejected a pulse-less eye; loose sparks lose their black rim). **Both scripts still hold HL-1's box/colour constants** (`reg[...]`, thresholds): set them from the B5a.1 line of that spot before running; Read a ×7 crop of all 8 frames before/after each run.
4. Re-open the result in Pixelorama for the owner (new window; output to a NEW folder so an open window is never overwritten).

**B5b. Arena check (owner A1 set 223):** copy godot → scratchpad copy, apply the current sample camera patches (preview-set217 notes: FOV 19.2 → p1-patch-depth.py → p1t-patch-tune.py), put the sheet at `<g>/tests/hl1_idle.png`, `arena_shot.gd.txt` → `<g>/tests/`, run with the console exe `--rendering-driver opengl3 --audio-driver Dummy --resolution 844x390 -s res://tests/<name>.gd -- --out <dir>` (it swaps unit id 9001 for the sheet; change the id/slot for another character).
- **Pixel-perfect** (1 texel = 1 screen px): `pixel_size = 2·d·tan(fov/2) / DisplayServer.window_get_size().y` (NOT get_visible_rect = 854×480 base, NOT the root texture size). At the old fixed height the 2-row eye dropped out in some frames. Check: sprite height on screen = alpha height in the sheet (diff against a shot with the sprite hidden).
- **GIF trap:** PIL ADAPTIVE palette drops small accents (the eye vanished from GIFs only). Use `quantize(colors=256, method=FASTOCTREE, dither=NONE)` and count the accent pixels per GIF frame before sending.
- Outline: the owner tried sel-out and no-line (set 223) and **kept the black outline** — do not offer again unless asked.

**B6. Store + record** after the owner says it is done: copy the sheet + APNG + the owner's .pxo to art/library/pictures/sprites/ as `<ID>_idle8_*_<date>` + INDEX.csv rows (a later owner fix = new `_v2` names, never overwrite — library rule 1); row in claude/idle-picks.csv with `variant=video` and the frame numbers in `note`. Docs-only → straight to main.

## Route A — code idle variants (fallback after a 2nd video fail, or on the owner's order)
A1. **Rows:** defaults neck 28% / waist 56% / hip 70% of the height fit HL-1. For other shapes (blob, bird, long tail) look at the png on a coordinate grid and pass the rows by hand.
A2. **Glow:** the printed `glow px` must be > 0 and on the eyes/runes. 0 or wrong spots → tell the owner (option: a mask file later, art-style §2).
A3. **Render** `idle_variants.py` → scratchpad; Read frame ~20 to check; send with SendUserFile.
A4. **Gate — owner picks:** explain the 8 in Thai first, then AskUserQuestion (max 4 options per question → show the recommended 3–4):
   1 sprite-res scale (reference only, looks wrong) · 2 strong squash 2.5%/1.5% · **3 light squash 1.2%/0.8% + breath hold** · 4 accordion (drop a row at waist, then neck) · 5 upper body sinks 1 px · 6 = 3 + 1 px sway · 7 hover 0–2 px (flying / spirit) · 8 still + glow only (stone / statue / object).
   Recommend by body: heavy/armoured → 3 or 5 · flying → 7 · object-like → 8 · soft/blob → 2. A new mix → new function in idle_variants.py (keep old numbers; new = 9, 10…).
A5. **Record** in claude/idle-picks.csv (`character,variant,neck_row,waist_row,hip_row,set,note,form`).

## Tried in set 222 and dropped — do not offer again unless the owner asks
GPT-made frames (owner: no) · cut-out bone rig with rotated parts (RotSprite; joints and stiffness) · 37 frames (too many to touch up; 8 is enough) · 16-frame rig in Pixelwright (parts can only move, not rotate) · PixelLab (paid; no result came back) · heavy cleaning of video frames (see B4).

## Notes
- claude/idle-picks.csv is what the Godot code reads later (wired into godot/ only on the owner's order, with a ripple check — HARD RULE 8). Route B in game = AnimatedSprite3D / SpriteFrames from the 8 frames; route A = Sprite3D scale at screen resolution (never resize the image itself).
- Size: 8 frames × 48 characters ≈ 3 MB (fine); 37 frames ≈ 14 MB.
- Numbers (190 ms, 1.2–3.0 s, 25%, 1.2%, 2.4 s…) are ค่าเสนอ until tested in the real game.
- Attack / hit / death are code for every character (art-style §2) — not part of this skill.
