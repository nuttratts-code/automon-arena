# Set 213 — prep/battle spacing sample (ui-preview)

Source review: claude/archive/reviews/review-2026-11-12-prep-ui.md. Owner picks (12 Nov): A1 outer margin 16 + phone safe area · B "ปล่อยไว้" (board position and the back-row star overlap stay as they are) · C: sell label + next-round gold · D1 samples first.

## Agreed list (owner confirms per round)
1. (R1, pending) Outer margin 8 → 16 base on prep (Top/Field/Tray) and battle (MarginContainer). Top bar top 12.
2. (R1, pending) Bench box moved up 10 (-212..32): the 5 rows need ~241 base, the old box was 236 → row 5 spilled onto the first shop card.
3. (R1, pending) Reroll width 54 → 96 (= Fight) so the centred shop row has equal gaps both sides. Heights unchanged (top 62: at 40 it hit the bench).
4. (R1, pending) Gold chip: " รอบหน้า +N" (base income of the next round, 14 px); tooltip: next income · win bonus · unspent gold does not carry over (S doc, set 107). Guess: win bonus not in the label (too long).
5. (R1, pending) Sell hint: while an own unit is dragged, the shop dock shows a panel "ลากมาวางที่ร้านเพื่อขาย +N เงิน" (N = paid, = shop.sell refund), red frame.
6. Not visible in a shot: phone safe area (notch) — code only at ทำจริง (DisplayServer safe area → margins).

## R2 — owner picked H1 (code depth) + free icon pack (12 Nov)
Outside asset: Kenney "Board Game Icons" 1.1 · source kenney.nl/assets/board-game-icons · licence CC0 (License.txt in r2-icons/) · credit "Kenney (www.kenney.nl)" (not required, add on the credits screen at ทำจริง) · owner OK 12 Nov (download asked + approved in chat). Zip kept only in scratch.
References: Hearthstone (feel: physical plates — buttons/cards as objects; different: no wood/gold ornament, owner's cool tone + cut corners kept) · TFT (top-right HUD = icon + number; different: our own pixel icons, no tier metals).
Three decisions: (1) depth = hard dark ledge bottom 4 / right 2 on every button, chip and filled card (= the Fight plate language), never a soft shadow (§4 tell) · pressed = ledge 2 + content down 2 · (2) light from the top-left: tribe shapes get a darker edge + a small white highlight top-left · (3) icons resampled to sprite pixel density (20/24 px, hard alpha), stat icons with a 1-px dark outline, HUD icons plain silhouettes tinted ink (DO 16: no smooth vector next to pixel art).
7. (R2, pending) Ledge on HUD buttons, reroll, heart/gold chips, bench rows, shop cards (empty sold slots too).
8. (R2, pending) HUD: rune = book icon + count, enemy = skull icon + %, legend "?" = notepad icon (guess: words "รูน"/"ศัตรู" dropped, tooltip keeps them). Menu "⋯" unchanged.
9. (R2, pending) Shop card stats: sword / heart / hourglass pixel icons (same colours as before).
10. (R2, pending) Tribe shapes: dark edge + highlight.
Not changed (owner picks): pixel heart/gold chip icons, padlock, reroll arrow, palette, cut corners.
Tells left: same cut corner on everything (owner pick) · cool palette (owner pick) · display font (open §6). Icons are a 2nd hand (Kenney) next to DCSS sprites — same pixel density, named here.

Open notes: battle clock "4.3 วิ" still close to the right edge at 844 (sits outside the margin box?) — check at ทำจริง. Texts must go to godot/data/ui_th.json at ทำจริง.

Rebuild: copy godot → <scratch>/g, drop MCPRuntimeServer line, `python r1-patch1.py <g>` → r1-patch2 → r1-patch3 → r1-patch4, then r2: `python -I r2-icons.py "<kenney>/PNG/Double (128px)" <g>/art/ui_icons 20` → `python -I r2-hud-icons.py … 24` (or copy r2-icons/*.png) → `python r2-patch.py <g>`, then `--headless --import`.

## R3 — owner picked J1: still backdrop (12 Nov)
11. (R3, pending) art/scene/runeplaza-v5.png (our own Blender render, set 132) as a still backdrop: Environment BG_CANVAS + CanvasLayer -1 TextureRect (cover); 3D ground/plaza/stone tiles/midline hidden; rims, sprites, foot marks stay 3D.
Known sample limits: the picture does not follow the camera (prep zoom → units stand on the grass above the plaza; battle → rings don't line up with the slots) · black cast-shadow blocks beside some sprites now show (were hidden under fog) · odds row harder to read over the picture. Light theme only (dark would need a night render).
**Finding (real game, not a sample):** stage3d.gd fog (density 0.012, gl_compatibility) paints the whole 3D floor in the horizon colour — light = pure white (255,255,255 sampled), dark = flat grey-blue. With fog off the plaza is still near-white (sun 1.15 + sky ambient 0.8 too bright in the Compatibility renderer). This is the main reason the arena looks flat/white today. Fix at ทำจริง or in an art-look set (find-cause first, HARD RULE 5): R3-test-fog-off-1366.png.
Rebuild R3: copy art/scene/runeplaza-v5.png → <g>/art/bg/runeplaza.png → `python r3-patch.py <g>`.
