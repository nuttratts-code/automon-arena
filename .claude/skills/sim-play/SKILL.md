---
name: sim-play
description: Automon Arena simulated playthrough of the GAME page on a phone held sideways (จำลองการเล่น / เล่นจำลอง / ตรวจหน้าเกม / หาบัค UI / เช็คบัคหน้าเกม). A Playwright bot plays whole runs (UI drags + bot shop), opens every popup, takes screenshots and flags page errors, off-screen / covered buttons and clipped text. Use when the user asks Claude to play-test or bug-hunt the game UI without listing the bugs. Fixes still follow find-cause (HARD RULE 5) and the merge gate (HARD RULE 3).
---
# Simulated phone playthrough (set 179)

Scripts live in this folder. OUT = a fresh folder in the scratchpad (never rm -rf a variable path; make a new folder name instead).

1. Build: `cd src && node build.mjs`.
2. **Wrap the page** (must — the local file has no viewport meta; the publish step adds it): `sh .claude/skills/sim-play/wrap.sh src/game.html $OUT/wgame.html`.
3. Runs (844×390, isMobile + hasTouch), in the background, each ~2–8 min:
   - `node .claude/skills/sim-play/play.cjs $OUT/p1 $OUT/wgame.html 1` — UI only (drag buys/places; weak team, early rounds).
   - `node .claude/skills/sim-play/play.cjs $OUT/b1 $OUT/wgame.html 1 bot` — adds `botShop` → reaches late rounds / 10 wins / run end. (Bot buys skip the run log, so run-log oddities there are not bugs.)
   - `node .claude/skills/sim-play/tour.cjs $OUT/wgame.html $OUT/t light` (and `dark`) — match details tabs, every HUD popup, menu, unit/shop detail card, replay, portrait (rotate screen).
   - `node .claude/skills/sim-play/touch.cjs $OUT/wgame.html $OUT/touch.png` — real touch drags (CDP) shop→bench→board→sell.
   Make the OUT subfolders first (`mkdir -p`).
4. Read the printed issue list (play.cjs dedupes; `covered by DIALOG/#result` is filtered as normal modal cover). Then LOOK at screenshots — most real bugs this way were visual (set 179: unreadable `+ถาวร`, English "down", missing label gaps, "HP +% +20"). Save tokens: paste 4 shots into one 2×2 sheet with PIL and Read the sheet; crop + 2× zoom for small text.
5. Also check: rune/unit icons missing (`GAME_ART` vs runes on), text in English, toasts over popups.
6. Report to the user in Thai (3-line header): bugs found with evidence, what is fixed vs needs their decision (art picks, game values = HARD RULE 6, design). Fix → setup → gate → merge (skill merge-code).
