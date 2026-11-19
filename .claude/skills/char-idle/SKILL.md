---
name: char-idle
description: Character still → idle (ภาพนิ่งตัวละคร / ท่ายืน / idle / วิดีโอ / เฟรม / ตาเรือง / ใส่ในฉาก). Characters = PIXEL via PixelLab (art-style V2.5); idle method open — ask the owner before route P (painted, retired), B (video → frames) or A (code). Also effect pass, .pxo, arena pixel check.
---
# Character still → idle (set 221 · route B video added set 222 · effect pass + arena check set 223, 14 Nov 2026)

> Owner rules: set 222 L1 = **video first (route B), code idle (route A) only when the video fails** · set 221 = never apply a code variant silently, the owner picks per character · set 222 = **minimal processing** ("the more it is cleaned, the worse it looks"). Rules: claude/art-style.md §2 · art store: art/library/README.md (usable pieces only, never delete) · licence: AI art = placeholder, UNVERIFIED (set 219 D).

> **Art direction (owner set 249):** while the look is still being explored, a direction the owner tries or picks is NOT written into claude/art-style.md by itself — ask "บันทึกลง art-style.md ไหม?" and edit only after the owner says OK; until then record it in the set's Relay line (never memory-only).

> Set 240: owner flow = still → hub button "ส่งให้ Claude ตรวจ + เขียนพรอมต์วิดีโอ" (task `check+veo`: P1 check → P2 cut + padded input + P3 prompt via `tools/asset-hub/veo_prep.py`) → owner makes the Veo video → hub button "ตัดเฟรม + สร้างเงา" runs P4 by itself. Stills and videos arrive through the asset hub (tools/asset-hub/README.md — files in art/hub/files/<ID>/, queue in art/hub/hub.json); put every cut / Veo input / frames sheet back there as a round (by: claude) and answer the queue item. Owner's default queue job "ตัดเฟรม + สร้างเงา" (task `frames+shadow`) = P4 frames → `tools/asset-hub/hub_add.py` (adds the round + first shadow) — steps in tools/asset-hub/README.md.

Scripts here (`painted_idle.py` = route P, set 227; the rest = pixel routes) (Python 3 + numpy + Pillow (+ opencv-python for video); run with `python -I`):
- `snap.py <in.jpg> <out.png> <block_px> <offset_px> <grid_n>` — AI "fake pixel" still → real-pixel RGBA, magenta bg → transparent, trimmed.
- `video_idle.py <video.mp4> <still_px.png> <out_dir> [n=8] [ms=190] [--frames=a,b,…]` — route B, see step B3. ~5 s per video.
- `colour_lock.py` · `part_copy.py` · `pxo_frames.py` — B4b steady colour, smeared part from frame 1, read the owner's .pxo (set 225).
- `outline_fill.py <in> <out>` — full 1 px outline incl. diagonal corners + pink fringe → outline, when B3's fill leaves gaps (WY-1 set 225, owner asked Claude to do it, not by hand) · `eye_recolour.py <out> <in>` — eyes to one colour in all 8 frames, head offset tracked (WY-1 constants inside).
- `idle_variants.py <still.png> <out.gif> [neck_row waist_row hip_row]` — route A, 8 code variants, 2.4 s loop, ×3 zoom.

## Route P — painted creature (DEFAULT since set 227, art-style V2.0)
Pixel-only steps (snap, outline fill, colour_lock, Pixelorama, scenematch S2, 8 frames 250 ms) do NOT apply to painted creatures.
P1. **Still:** owner paints in Gemini with the art-style §5 painted starter (attach the scene painting) + §6 template, FORM 1 first. Check: tribe readable by colour + silhouette, fantasy (not a plain animal), face not too fierce (owner set 227), no pink on the body. Gemini often adds a darker painted frame + a ground shadow and a dull green (#35A541…) instead of #00FF00 — the cut handles all three.
P2. **Cut + padded input:** key alpha = `clip(1 − (g − max(r,b) − 8) / 20)` + keep the largest blob (drops frame/shadow bits) + despill `g ≤ max(r,b)·1.05` + 3 px min-filter → crop. Check on magenta at ~700 px (Read) — no green rim, no shadow patches under the feet (the first boar needed the tighter 8/20 key). Padded Veo input = cut ×(0.55·720 px tall) centred on 1280×720 #00FF00 → send it with SendUserFile and say "use THIS picture, not the original" (set 227: the owner used the original — the clip zoomed to ~78 % of the height; fine that time, but long tails/horns would be cut).
P3. **Video:** Veo settings as B1 (3.1 · Frames · 16:9 · 1080p · .mp4). Prompt = B1 fixed prompt with: "this exact painted creature" · STYLE LOCK "keep the exact same painting, brushwork, colours and details … Do not redraw, do not change the lighting, no motion blur" · BACKGROUND adds "no frame or border" · MOTION per body (tail swish, mane sway, plates move with the body and never change shape) · EFFECT = its effect spots pulse with each breath · DO NOT ADD smoke, dust, sparks, fire, text, new objects. Fill MOTION/EFFECT per creature from its still (boar = set 227, worked first time):
```
Animate this exact painted creature as a subtle idle breathing loop.

CAMERA: completely locked. No zoom, no pan, no tilt, no shake. The creature stays exactly the same size and in exactly the same position for the whole video.

FRAMING: the whole creature stays fully inside the frame for the whole video, from [highest parts] down to the [feet], with the same wide empty green margin on every side as the input image. Never zoom in, never crop.

AUDIO: none. Silent video.

BACKGROUND: flat solid pure green #00FF00 for the entire video, exactly like the input image. No floor, no ground, no shadow, no gradient, no frame or border, no glow or light spill onto the background.

MOTION: small and slow. The chest and shoulders rise and fall like slow breathing (one breath every 2 seconds). [The tail swishes gently. The head bobs very slightly.] [Feet] stay perfectly still and planted. [Armour plates move with the body and never change shape.]

EFFECT: [effect spots] glow gently brighter and dimmer with each breath.

STYLE LOCK: keep the exact same painting, brushwork, colours and details as the input image in every frame. Do not redraw, do not change the lighting, no motion blur.

DO NOT ADD: smoke, dust, sparks, fire, text, new objects.

LOOP: the last frame must be identical to the first frame so the video loops seamlessly.
```
(Green creature → magenta #FF00FF everywhere above; P2 key = `min(r,b) − g` instead of `g − max(r,b)`; P4 add `--bg=m` — magenta path tested only on a synthetic frame (set 227), check the first real clip closely. `--bg=auto` = pick green/magenta from the border of frame 1; the asset hub button uses it, set 240.)
P4. **Frames:** `python -I painted_idle.py <video.mp4> <out_dir> 32 150` → loop = most alike frame pair 1.2–3.0 s apart, 32 frames evenly between (owner set 227 R4: 32, not 16/64), green cut as P2 per frame, union crop, LANCZOS to 150 px body height → `sheet_32x1_<W>x<H>.png` + `preview.gif` (×2 on grey, ms = loop length / 32). Prints loop pair + diff, `feet row min/max` (must be equal — the camera did not move), ms per frame. Read one GIF frame on a flat colour to check the cut; send the GIF.
P5. **Arena check:** sample branch `ccr-882ceb4b-0ewtk1` recipe (art-look §8c; `claude/preview-set217/s227-shot.sh <name> --e:ids=a/b/c/d/e/f --e:foe=… --e:hf=32`, sheet in `<g>/tests/s225/<name>.png`, 1 texel = 1 screen px). Shadows: round blob for now (cast shadows `--e:sh=1 --e:shtex=…` tried s227 R6, owner: "still odd", open).
P6. **Store** (after the owner OKs): original painting + cut png + 32-frame sheet to art/library/pictures/sprites (`<ID>_still_paint_gemini_<date>.jpg` · `<ID>_still_paint_cut_<W>x<H>_<date>.png` · `<ID>_idle32_sheet_32x1_<W>x<H>_<date>.png`) + INDEX rows; idle-picks.csv `variant=video-painted-32` (+ loop frames in note). At ทำจริง the frames go into a grid sheet ≤ 4096 px wide (phones). Fallback when the video fails twice: M3 = code breathing warp of the still (feet fixed, y ×(1+0.025·sin·w), x ×(1−0.012·sin·w), w = ((H−y)/H)^1.5) — sample code in the set 227 notes R3.

## Shared steps (pixel routes A/B — before set 227)
→ Moved to `claude/workflow/char-idle-ref.md` (same heading; set 250 K1 — read it only when this route/step is used).

## Route B — Gemini video → 8 frames (default, set 222 L1)
→ Moved to `claude/workflow/char-idle-ref.md` (same heading; set 250 K1 — read it only when this route/step is used).

## Route A — code idle variants (fallback after a 2nd video fail, or on the owner's order)
→ Moved to `claude/workflow/char-idle-ref.md` (same heading; set 250 K1 — read it only when this route/step is used).

## Tried in set 222 and dropped — do not offer again unless the owner asks
GPT-made frames (owner: no) · cut-out bone rig with rotated parts (RotSprite; joints and stiffness) · 37 frames (too many to touch up; 8 is enough) · 16-frame rig in Pixelwright (parts can only move, not rotate) · PixelLab (paid; no result came back) · heavy cleaning of video frames (see B4).

## Notes
- claude/idle-picks.csv is what the Godot code reads later (wired into godot/ only on the owner's order, with a ripple check — HARD RULE 8). Route B in game = AnimatedSprite3D / SpriteFrames from the 8 frames; route A = Sprite3D scale at screen resolution (never resize the image itself).
- Size: 8 frames × 48 characters ≈ 3 MB (fine); 37 frames ≈ 14 MB.
- Numbers (1.2–3.0 s, 25%, 1.2%, 2.4 s…) are ค่าเสนอ until tested in the real game.
- Attack / hit / death are code for every character (art-style §2) — not part of this skill.
