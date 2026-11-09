# Plan set 172 — placeholder pixel art into the game page (user A2 B2 C2 + runes A1 + bosses B1)
Picks: art/placeholder/picks.txt (ARTPICK code pasted by the user, 9 Nov).
1. [x] art/placeholder: tables.py (PICK/RUNES/BOSSES/SCENES shared) · build_art.py → copies chosen tiles to art/placeholder/tiles/, writes src/game/art.js (GAME_ART data URIs) · check: script prints counts 48 units + 4 bosses + rune keys + 3 scenes.
2. [x] src/game/view.js: setUnitArt(map) · unitShape draws sprite + tribe badge when art exists (Balance Room never calls it → shapes stay) · boss card class is-boss · check: unit tests.
3. [x] src/build.mjs: game/art.js in the game page file list only (Balance Room keeps shapes, C2).
4. [x] src/game/run.template.html: CSS (sprite, badge, field floor/wall prep=shop B, battle=arena B, result=marble A), rune icon in runeCard, credit line in legend popup, setUnitArt at start · check: screenshots 1366/844/667/390 + phone audit.
5. [x] ui_smoke: board unit shows a sprite img; rune card has an icon.
6. [x] setup → gate → merge → CI → ask user before publishing → Relay + close-out.
