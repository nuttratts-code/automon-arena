---
name: char-idle
description: Character still → idle (ภาพนิ่งตัวละคร / ท่ายืน / idle / วิดีโอ / เฟรม / ตาเรือง / ใส่ในฉาก). Characters = PIXEL via PixelLab (art-style V2.5); idle method open — ask the owner before route P (painted, retired), B (video → frames) or A (code). Also effect pass, .pxo, arena pixel check.
---
# Character still → idle (set 221 · route B video added set 222 · effect pass + arena check set 223, 14 Nov 2026)

> **Now (art-style V2.5, set 250 M1):** characters = PIXEL via PixelLab · the idle method is OPEN — ask the owner which route (B video → frames · A code variants) before starting; both routes live in `claude/workflow/char-idle-ref.md`.

> **Idle = PixelLab (art-style V2.6, set 257 owner A1):** Claude in Chrome → pixellab.ai → Creator → Animate → **Animate with text** (V3) · First frame = the creature's ★ still from the hub (`art/hub/files/<ID>/…`, file input upload; "Smoothed pixel art detected" → Use anyway unless the owner says otherwise) · prompt `idle breathing, subtle body rise and fall, feet planted, no camera move` · Frame count 8 · Remove background on · palette None · Generate (2 credits) → Download (lands in ~/Downloads as a 3×3 sheet, cell = still size; cell 0 = the input still → drop it) → 8×1 sheet → hub frames round (by: claude, NOT starred, `meta.pingpong: true`, ms 150 ค่าเสนอ, do NOT move the shadow: add the round directly, not with hub_add.py) → measure feet row / new colours / per-step change / loop seam and send GIFs. One creature at a time until the owner OKs it. Routes B/A below = fallback only. The owner rules below are kept from sets 221–222.

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

## Notes
- claude/idle-picks.csv is what the Godot code reads later (wired into godot/ only on the owner's order, with a ripple check — HARD RULE 8). Route B in game = AnimatedSprite3D / SpriteFrames from the 8 frames; route A = Sprite3D scale at screen resolution (never resize the image itself).
- Size: 8 frames × 48 characters ≈ 3 MB (fine); 37 frames ≈ 14 MB.
- Numbers (1.2–3.0 s, 25%, 1.2%, 2.4 s…) are ค่าเสนอ until tested in the real game.
- Attack / hit / death are code for every character (art-style §2) — not part of this skill.
