---
name: char-idle
description: Character still → idle (ภาพนิ่งตัวละคร / ท่ายืน / idle / วิดีโอ / เฟรม / ตาเรือง / ใส่ในฉาก). Characters = PIXEL via PixelLab (art-style V2.5); idle method open — ask the owner before route P (painted, retired), B (video → frames) or A (code). Also effect pass, .pxo, arena pixel check, and new-creature still batches via the PixelLab Pro API (ภาพนิ่ง PixelLab / เจน 25 แบบ / เรฟสไตล์ / ชุดสี).
---
# Character still → idle (set 221 · route B video added set 222 · effect pass + arena check set 223, 14 Nov 2026)

> **Now (art-style V2.5, set 250 M1):** characters = PIXEL via PixelLab · the idle method is OPEN — ask the owner which route (B video → frames · A code variants) before starting; both routes live in `claude/workflow/char-idle-ref.md`.

> **Idle = PixelLab PixMiniMax (art-style V2.7, set 257 owner E1):** Claude in Chrome → pixellab.ai → Creator → Animate → **Animate with text** → model **PixMiniMax** · First frame AND Last frame = the creature's ★ still from the hub (`art/hub/files/<ID>/…`, file-input upload; "Smoothed pixel art detected" → Use anyway unless the owner says otherwise) → the clip loops by itself · Advanced: Camera view Side · Direction = the way the still faces (WN-1 East) · Remove background on · Frame count 8 · **Color palette = From a palette image → the same ★ still** (0 new colours) · Description: type `idle breathing loop, subtle body rise and fall, feet planted, no camera move, ends exactly on the first pose` → press **Enhance action with AI** (rewrites the box) → READ the result (motion only, must return to the start pose, no flying / walking) → append `Hooves stay planted, legs and tail barely move, static camera, no zoom.` (adapt to the body: legs / tentacles / floating) · keep "Enhance description with AI during generation" **OFF** (its boilerplate adds "thick outlines, flat colors") · set text with form_input (typing into the box can land elsewhere when the panel scrolls) · Generate (1 credit) → hover the new tile → Download (~/Downloads, 3×3 sheet, cell = still size) → **use cells 2–9** as the 8×1 sheet (cell 1 ≈ the input) → hub frames round (by: claude, NOT starred, ms 150 ค่าเสนอ, no pingpong; add the round directly, NOT with hub_add.py, so the shadow stays) → measure feet row / new colours / mean top row per frame (rise and return) / per-step change and send a GIF. One creature at a time until the owner OKs it. V3 + ping-pong (V2.6) = fallback; routes B/A below = last fallback.

> Owner rules: set 222 L1 = **video first (route B), code idle (route A) only when the video fails** · set 221 = never apply a code variant silently, the owner picks per character · set 222 = **minimal processing** ("the more it is cleaned, the worse it looks"). Rules: claude/art-style.md §2 · art store: art/library/README.md (usable pieces only, never delete) · licence: AI art = placeholder, UNVERIFIED (set 219 D).

> **Art direction (owner set 249):** while the look is still being explored, a direction the owner tries or picks is NOT written into claude/art-style.md by itself — ask "บันทึกลง art-style.md ไหม?" and edit only after the owner says OK; until then record it in the set's Relay line (never memory-only).

> Set 240: owner flow = still → hub button "ส่งให้ Claude ตรวจ + เขียนพรอมต์วิดีโอ" (task `check+veo`: P1 check → P2 cut + padded input + P3 prompt via `tools/asset-hub/veo_prep.py`) → owner makes the Veo video → hub button "ตัดเฟรม + สร้างเงา" runs P4 by itself. Stills and videos arrive through the asset hub (tools/asset-hub/README.md — files in art/hub/files/<ID>/, queue in art/hub/hub.json); put every cut / Veo input / frames sheet back there as a round (by: claude) and answer the queue item. Owner's default queue job "ตัดเฟรม + สร้างเงา" (task `frames+shadow`) = P4 frames → `tools/asset-hub/hub_add.py` (adds the round + first shadow) — steps in tools/asset-hub/README.md.

Scripts here (`painted_idle.py` = route P, set 227; the rest = pixel routes) (Python 3 + numpy + Pillow (+ opencv-python for video); run with `python -I`):
- `snap.py <in.jpg> <out.png> <block_px> <offset_px> <grid_n>` — AI "fake pixel" still → real-pixel RGBA, magenta bg → transparent, trimmed.
- `video_idle.py <video.mp4> <still_px.png> <out_dir> [n=8] [ms=190] [--frames=a,b,…]` — route B, see step B3. ~5 s per video.
- `colour_lock.py` · `part_copy.py` · `pxo_frames.py` — B4b steady colour, smeared part from frame 1, read the owner's .pxo (set 225).
- `outline_fill.py <in> <out>` — full 1 px outline incl. diagonal corners + pink fringe → outline, when B3's fill leaves gaps (WY-1 set 225, owner asked Claude to do it, not by hand) · `eye_recolour.py <out> <in>` — eyes to one colour in all 8 frames, head offset tracked (WY-1 constants inside).
- `idle_variants.py <still.png> <out.gif> [neck_row waist_row hip_row]` — route A, 8 code variants, 2.4 s loop, ×3 zoom.

## Route P — painted creature (RETIRED by art-style V2.5)
→ Moved to `claude/workflow/char-idle-ref.md` (set 250 M1). Painted creatures are retired; do not offer route P unless the owner asks.

## Shared steps (pixel routes A/B — before set 227)
→ Moved to `claude/workflow/char-idle-ref.md` (same heading; set 250 K1 — read it only when this route/step is used).

## Route B — Gemini video → 8 frames (default, set 222 L1)
→ Moved to `claude/workflow/char-idle-ref.md` (same heading; set 250 K1 — read it only when this route/step is used).

## Route A — code idle variants (fallback after a 2nd video fail, or on the owner's order)
→ Moved to `claude/workflow/char-idle-ref.md` (same heading; set 250 K1 — read it only when this route/step is used).

## Tried in set 222 and dropped — do not offer again unless the owner asks
GPT-made frames (owner: no) · cut-out bone rig with rotated parts (RotSprite; joints and stiffness) · 37 frames (too many to touch up; 8 is enough) · 16-frame rig in Pixelwright (parts can only move, not rotate) · (PixelLab was dropped here in set 222 — back as the idle method since set 257) · heavy cleaning of video frames (see B4).

## Still batch — PixelLab Pro API (set 259, owner A2 at close-out)
Use when designing a NEW creature still (concept variants), before any idle. Script: `pixellab_still.py` (this folder).
1. `python -I .claude/skills/char-idle/pixellab_still.py --dry --desc "<features in English, no game/IP names>" --style <one creature png> --palette <colour source png> --out <scratch dir>` → show the request; balance check is in the live run.
2. Live run (drop `--dry`): POST `/v2/generate-image-v2` → poll `/v2/background-jobs/{id}` → 25 images at 48 px for **10 generations** (size sets the count: ≤32 px = 64, 42–50 = 25, 86–170 = 4, >170 = 1). Writes g00..g24 + sheet.png + request.json.
3. **Owner picks before the hub (set 259):** save `style.png` + `batch.json` in each batch folder → `tools/asset-hub/still_batch.py picker` page (shortlist + hub ID menu + eye check) → owner pastes `STILLPICK` → `still_batch.py add` per line (rounds not ★, history of all 25 per batch; tools/asset-hub/README.md "Still batch picks"; script on branch claude/asset-hub until merged). For an arena look: place picks in the arena with `automon-scratch/s239t/s259_pmd5.sh` pattern (pmd_meta-style json: hf 1, k 5, pad_b) — ×5 = owner's tone pick (20 Nov).
Lessons (20 Nov, 3 runs): style image gives outline/detail/shading AND stance/pose (an upright ref → upright results) but never copied the ref's shape or colours · `style_options.color_palette:false` + `target_palette` hex = colours held exactly · seed changes the whole batch, not each image — no-seed did not add variety; vary `--desc` or `--style` per call · note the returned seed of a liked batch to refine it later · Bitforge (`/create-image-bitforge`) = 1 image per generation but style_image must equal image_size and the 48 px shape broke — do not use.
Security: key only from env PIXELLAB_API_KEY · outputs outside the repo until the owner OKs a pick · a style ref from someone else's art (e.g. `automon-scratch/pmd-ref`) may be used for shipped creatures since set 259 A2 — input only (never edit/trace its frames), owner checks a side-by-side by eye, PROVENANCE row, the file stays out of the repo (claude/workflow/security.md part 2). Owner-supplied tip: pick the style/palette ref with the tribe's main colour (fire → a mostly-red sprite).

## Notes
- claude/idle-picks.csv is what the Godot code reads later (wired into godot/ only on the owner's order, with a ripple check — HARD RULE 8). Route B in game = AnimatedSprite3D / SpriteFrames from the 8 frames; route A = Sprite3D scale at screen resolution (never resize the image itself).
- Size: 8 frames × 48 characters ≈ 3 MB (fine); 37 frames ≈ 14 MB.
- Numbers (1.2–3.0 s, 25%, 1.2%, 2.4 s…) are ค่าเสนอ until tested in the real game.
- Attack / hit / death are code for every character (art-style §2) — not part of this skill.
