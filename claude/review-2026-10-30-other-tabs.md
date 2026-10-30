# Review 30 Oct — other Balance Room tabs (set 57 proposal, waiting for user)

Checked built balance.html desktop 1280 (after set 56): เลือกตัว (grid + list), แก้ตัวละคร, ลองสู้ (before/after run), ดูแมตช์, ดูผล. No page errors.

## Already fine — no change proposed
- เลือกตัว grid · แก้ตัวละคร (stats left, skills right, median row under each stat) · ดูแมตช์ (per-unit bars, folds) · ดูผล (cards + tables).

## Needs work: ลองสู้
1. Team setup buttons (สุ่มทีม · ล้างทีม · + ใส่ตัวที่แก้อยู่ · ปิดโบนัสเผ่า ซ้าย/ขวา · เลขสุ่ม · คัดลอกรหัสแมตช์) sit at the very bottom, below the unit card — far from the arena and the จำลอง button.
2. The result (ทีมไหนชนะ · เวลา) is at the bottom: after pressing จำลอง the user must scroll to see it.
3. Three separate hint lines ("จัดทีม… อ่านเพิ่ม", "แตะช่อง… กดค้าง…", "แตะตัวละคร… อ่านเพิ่ม").

## Options
- **A (recommended): tidy ลองสู้ only.** Result summary moves next to the จำลอง controls (one line: ผล · เวลา · ดูรายละเอียดแมตช์); team setup buttons join the "เลเวลทุกตัว" row right under the arena; the 3 hints merge into one fold. Bench stays above the arena (earlier user decision, ui_smoke checks it).
- B: A + small consistency on แก้ตัวละคร (number boxes right-aligned like the rune/boss tab, shorter top hint on เลือกตัว).
- C: leave the other tabs as they are.
