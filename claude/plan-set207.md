# Plan set 207 — 3D prep/shop screen (P0 + P1–P9) + editable layout scene · branch claude/shop-3d

User picks (11 Nov): B1 reroll = icon + "ฟรี n" · C1 tap the odds line = shop popup (it already shows next-round income) · D2 drop the new-player cue · E1 drop bench count · F1 drop the top "เผ่า" button, the left tribe column opens the popup · G2 yellowish card for ANY owned copy + "อัปดาว" ribbon only when buying completes a star-up · H1 no publish.
A1 (bench + shop in one row) was built, then **withdrawn by the user** ("ไม่เอาส่วนร้านค้ากับส่วนม้านั่งไว้แถวเดียวกัน") → two rows. Samples A3 compact / A2 board under the panel were shown; the user then asked to place things freely → **B2: the prep layout becomes a Godot scene the owner edits** (godot/scenes/prep_layout.tscn), built in this set; the size problem (finding ①) is left to the owner's own layout edits.
Mockup prep_screen_3d_mockup_v1 is not in the repo (older chat) → built from the P notes.
Display only: no rule, value or save change. Security (all steps): no outside asset/font/addon (reroll icon drawn in code), no external input, the scene holds no fonts/art/colours, tools/ not exported.

| # | Step | Check | Done |
|---|---|---|---|
| 1 | P0: one drop-ok hover cell at a time · arena cells rim-only · dragged sprite dimmed | test_drag_one_hover | ✓ |
| 2 | P1: enemy tiles hidden at the prep pose, rise in during the dolly | test_stage3d | ✓ |
| 3 | Tray = 2 rows: bench ×5 + odds line · reroll · shop ×5 · fight (P7 no bench label, P5 title only) | AUDIT all sizes | ✓ |
| 4 | P2 glass panels · P3 reroll icon · P4 odds line → shop popup · P6 floor labels while dragging · P8 tribe column · P9 shop card + ribbon | shots prep-upstar / prep-drag | ✓ |
| 5 | B2: prep.gd = default layout + bind by name (stand-in for a deleted part) + metas for colour/font/icon/box · tools/make_prep_layout.gd writes the scene | test_prep_layout_scene · 54/54 | ✓ |
| 6 | ui-todo ticks · ripple · setup → gate → merge · close-out | gate | |
