# Plan set 207 — 3D prep/shop screen (P0 + P1–P9) · branch claude/shop-3d

User picks (11 Nov): A1 bench + shop in ONE tray row (board taller) · B1 reroll = icon + "ฟรี n" · C1 tap the odds line = shop popup (it already shows next-round income) · D2 drop the new-player cue · E1 drop bench count · F1 drop the top "เผ่า" button, the left tribe column opens the popup · G2 yellowish card for ANY owned copy + "อัปดาว" ribbon only when buying completes a star-up · H1 no publish.
Mockup prep_screen_3d_mockup_v1 is not in the repo (shown in an older chat) → built from the P notes; owner judges in the editor.
Display only: no rule, value or save change. Security (all steps): no outside asset/font/addon (reroll icon drawn in code), no external input, nothing shipped beyond godot/ scripts.

| # | File · change | Check |
|---|---|---|
| 1 | slot_cell.gd + prep.gd · **P0**: one hover cell at a time (prep keeps `_hover`, clears the old one; pointer leaving the cell clears it) · arena cells show states on the tile rim only (no 2D frame) · picked-up board unit's sprite dimmed until drop/cancel | test_ui: drag over 2 cells → only the last is drop_ok; cancel → none; shots |
| 2 | stage3d.gd · **P1**: enemy tiles hidden at the prep pose, rise in during the dolly (k) | test_stage; shots prep + zoom-mid |
| 3 | prep.gd · **A1 + P7 + P5**: tray = one row [reroll · bench ×5 · shop ×5 · fight]; no bench label/count; fight smaller, title only | AUDIT 1366/844/740/667 no hits |
| 4 | prep.gd · **P2**: HUD chips, bench cells, shop cards, buttons on semi-transparent panels | shots light + dark |
| 5 | prep.gd · **P3 + P4**: reroll = drawn icon + price / "ฟรี n"; shop-level button removed → odds line (rarity dots + %) above the shop, tap = shop popup | test_ui tap odds → popup; shots |
| 6 | prep.gd · **P6**: column labels on the floor tiles, visible only while dragging | shots drag state |
| 7 | prep.gd · **P8 + F1**: left tribe column (shape + count, active bright), tap = tribe popup; top "เผ่า" button removed; board target leaves room for it | test_ui; shots |
| 8 | prep.gd + ui_th.json · **P9 + G2**: shop card fixed layout (picture · tribes · name left · price right); "มีแล้ว" removed; owned → yellowish bg; ribbon `g_upstar` "อัปดาว" when buy = star-up | test_ui ribbon on/off |
| 9 | tests/shots.gd, test_ui.gd, ui-todo-godot.md ticks · ripple grep (own_have, own_ready, fight_n, cue_, bench, shop_lv, TribeBtn) | Godot tests · shots · setup → gate → merge |
