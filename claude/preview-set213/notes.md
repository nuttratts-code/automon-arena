# Set 213 — prep/battle spacing sample (ui-preview)

Source review: claude/review-2026-11-12-prep-ui.md. Owner picks (12 Nov): A1 outer margin 16 + phone safe area · B "ปล่อยไว้" (board position and the back-row star overlap stay as they are) · C: sell label + next-round gold · D1 samples first.

## Agreed list (owner confirms per round)
1. (R1, pending) Outer margin 8 → 16 base on prep (Top/Field/Tray) and battle (MarginContainer). Top bar top 12.
2. (R1, pending) Bench box moved up 10 (-212..32): the 5 rows need ~241 base, the old box was 236 → row 5 spilled onto the first shop card.
3. (R1, pending) Reroll width 54 → 96 (= Fight) so the centred shop row has equal gaps both sides. Heights unchanged (top 62: at 40 it hit the bench).
4. (R1, pending) Gold chip: " รอบหน้า +N" (base income of the next round, 14 px); tooltip: next income · win bonus · unspent gold does not carry over (S doc, set 107). Guess: win bonus not in the label (too long).
5. (R1, pending) Sell hint: while an own unit is dragged, the shop dock shows a panel "ลากมาวางที่ร้านเพื่อขาย +N เงิน" (N = paid, = shop.sell refund), red frame.
6. Not visible in a shot: phone safe area (notch) — code only at ทำจริง (DisplayServer safe area → margins).

Open notes: battle clock "4.3 วิ" still close to the right edge at 844 (sits outside the margin box?) — check at ทำจริง. Texts must go to godot/data/ui_th.json at ทำจริง.

Rebuild: copy godot → <scratch>/g, drop MCPRuntimeServer line, `python r1-patch1.py <g>` → r1-patch2 → r1-patch3 → r1-patch4, then `--headless --import`.
