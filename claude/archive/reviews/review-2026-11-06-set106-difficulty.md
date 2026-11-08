# Set 106 — difficulty / bot / late gold: options (6 Nov 2026)

Status: proposal only, nothing changed. User feedback (playtest pick 5): bots too weak (picking units without reading skills and just upgrading wins), too much gold left late, mode choice barely matters (ปกติ is easy), extra matches too weak. Fight length: keep as is.

## Why it is easy now (from code + earlier measures)
| # | Cause | Evidence |
|---|---|---|
| W1 | Enemy bot teams are pre-made by a simple shop bot (botgen) and picked by round × tier. The bot rarely builds Lv3; a human who just merges reaches Lv2/Lv3 faster → human board power outgrows the table. | set 83 note "bot never builds Lv3"; lab player bot = same AI, so lab win% (ปกติ 72%) under-estimates a human |
| W2 | Loss streak makes enemies EASIER (rnFoeTier: 1 loss = mid, 2+ = weak) but a win streak never makes them harder. | core/runrunes.js rnFoeTier |
| W3 | Mode only multiplies enemy hp/atk (113% / 131%) while giving far better runes (นรก 70% legend). Bosses are not mode-scaled → harder modes make bosses EASIER (ยาก 86/76/67 · นรก 92/83/75 % vs ปกติ 77/66/53). | set 100 handoff |
| W4 | Extra matches (after 10 wins): enemy is the same round table + bosses k grow slowly. | runboss.js, set 99 |
| W5 | Gold: no level buying / interest since set 89; income 25/round + win 2 → only rerolls (1 each) to spend. | S-7, set 89/96 |

## Options (numbers = ค่าเสนอ, user picks)
- **D1 (rec) Enemy follows the player's power, not only the round.** At fight time pick the bot team whose power ≥ player board power × mode % (ปกติ 95 · ยาก 110 · นรก 125 ค่าเสนอ); win streak raises it (+5%/win, cap +25%). Uses core/power.js already used by botgen. Re-measure with runerun.
- **D2 Upgrade-focused bot for bot teams.** Regenerate the 360 teams with a bot that merges like a human (keeps pairs, rerolls for the 3rd copy, Lv3 from mid-game). Cheaper than D1 but the table stays fixed per round.
- **D3 Bosses scale by mode** (boss hp/atk × mode %), so นรก bosses are hardest, and extra-match bosses grow faster (each extra boss +20% ค่าเสนอ) — this is option (ค)+(ก) from set 100.
- **G1 Gold sink / cap (pick one):** (a) carry-over cap 20 gold (TFT/SAP-like, simple) · (b) buy shop level early for gold (bring back level buying, e.g. 4 × level) · (c) spend gold on a rune-card reroll / heal 1 heart (e.g. 15 gold, once per round).
- Recommended package: D1 + D3 + G1(a). Then re-measure (runerun 600 per mode) and the user plays one run per mode.
