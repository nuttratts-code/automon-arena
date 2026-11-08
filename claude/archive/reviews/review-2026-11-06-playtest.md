# Player-view playtest + genre comparison (6 Nov 2026, main 9e21921)

Status: report only. **No code was changed.** The user picks what to do (P = pick list at the end).

## What was run
| Test | Result |
|---|---|
| Build + unit tests | 313/313 pass |
| Scripted "player" on the BUILT game.html (Playwright): buys toward one tribe, merges, sells, rerolls, places by row hint, takes rune cards, fights, skips | ~20 full runs: ปกติ ×8 · ยาก ×1 (phone 844×390) · นรก ×7 · ~250 matches · **0 page errors · 0 console errors/warnings** |
| Screenshots read by eye | prep, shop, unit/tribe/mode popups, rune offer, battle, result, run end (1366×768 + 844×390) |
| Edge probes | buy the 3rd copy · fight with 0 units · reload mid-battle · resume dialog · phone text overflow |

Caveat: the scripted player is much weaker than `lab/runerun.mjs` (it lost most นรก runs 0–2 wins, while the lab bot measures 60% normal-round win in นรก). Its win rates are NOT balance evidence; balance numbers below come from the earlier lab measures.

## Bugs / defects found
| # | What | Evidence | Size |
|---|---|---|---|
| B1 | **ฟื้น/ฮิต from skills stacks with no cap inside a match** (PT-8 +10 to back-row spirits on every hit, PT-6 +5; PT-5's ally strike can make PT-8 hit extra). Long matches (นรก = enemy ×131% → slower) reach 180/hit. | core/characters.js:106–109, battle.js:606 (no cap) | balance (user asked earlier) |
| B2 | handoff State line "healHitUp not assigned to any character" is stale (PT-6, PT-8 use it). | claude/handoff.md | doc |
| B3 | English word **"down"** shown to players: dead-unit tag in battle, live popup, battle ticker/log ("✖ X down"). | run.template.html:179, :1083 · labels.js:331 | small text |
| B4 | A warning toast from the shop (e.g. "รวมร่างต้องมี … ครบ 3 ตัว") stays on top when the battle starts and covers the field header. It does fade (gone after 6 s). | screenshots battle-r5 | cosmetic |
| B5 | Phone (844×390) shop cards cut text: name "นักล่าสา…", rarity "WY-1 · s…". | screenshot 844 prep | cosmetic |

Not bugs (checked OK): fight with 0 units asks "ยืนยันสู้"; reload mid-battle → resume dialog, the result already counted (no save-scum), state valid; mode/rune offer flow; replays.

## Game-feel findings vs similar games
Reference games (public knowledge): Teamfight Tactics (TFT), Hearthstone Battlegrounds (HSBG), Super Auto Pets (SAP), Backpack Battles (BB), The Bazaar.

| # | Finding in Automon | How the genre does it | Suggestion |
|---|---|---|---|
| G1 | **Matches are long.** Game-time median 88 s, p75 137 s, 13 of 54 sampled > 150 s; round 1 (3 vs 3 commons) took 156 s. At the default 2× that is ~45–70 s of watching × 15–20 rounds. | TFT combat ~20–40 s · HSBG ~10–30 s · SAP/BB 5–20 s. Short fights keep "shop → fight" loop snappy. | A: default speed 4× + remember last speed · B: "auto-skip to result" toggle · C: shorter fights (overtime start 180 s → ~60–90 s, or lower HP/armor scale). A+B are UI only (no balance change); C needs re-measure. |
| G2 | **Merge is manual.** Buying the 3rd copy leaves 3× Lv1; player must drag them together; a wrong drag gives an error toast. Bench full = cannot buy the 3rd copy. | TFT/HSBG/SAP: 3rd copy merges automatically on buy, even with a full bench. | Auto-merge when a buy completes 3 copies (merged unit goes to the board copy's spot), allow that buy with a full bench. S doc line 22 says "ไม่อัตโนมัติ" → needs the user's OK (rule change S). |
| G3 | **Keywords are not explained** where the player looks: unit popup shows "ช็อต/ฮิต 1 · ไฟ/ฮิต 0 · มัลติฮิต" with no meaning; tribe chip "0/2" has no label. | TFT/HSBG: hover keyword = short tooltip; trait tracker on the side with "2/4" steps. | Tap a stat name → one-line meaning (labels.js already has texts like 'down'); show only non-zero stats on the card; tribe chip tooltip "เผ่าที่ทำงาน/ทั้งหมด". |
| G4 | **Units are small on a big empty field.** 1366×768: board cells ~430×200 px, unit icon ~50 px; phone battle hides names, HP bars thin, damage numbers small. | Genre makes units the main visual; HP bars thick; big damage pops. | Scale unit icon with the cell (e.g. 60–70% of cell height), thicker HP bar, larger damage numbers. Placeholder art only — no balance effect. |
| G5 | **Run end screen is plain text** (team as a list, replay list). | TFT/HSBG show the final board as pictures + placement. | Show the final team as unit shapes + stars; keep stats below. |
| G6 | **Late gold has little use.** Shop level follows the round (no level buying, no interest since set 89), so after the board is full gold only goes to rerolls (1 each). Scripted player piled 100–200 gold when it stopped rerolling. | TFT: gold → levels/XP + interest choices · SAP: 10 gold/turn, no carry-over · HSBG: tavern upgrades. | Watch in real play first (a human rerolls more). If it shows up: cap carried gold, or a gold sink (e.g. buy shop odds / extra rune reroll). Design change → options when the user wants. |
| G7 | Mode chosen **per round** (ปกติ/ยาก/นรก for rune rarity) | Close to The Bazaar / BB "choose your encounter" risk-reward. | Good and distinct — keep. Only add: show the chosen mode on the fight button ("เริ่มสู้ · นรก") so a wrong pick is visible. |
| G8 | Rune card + reroll, boss every 4 wins, hearts 10 / wins 10 | HSBG/TFT augments, SAP 10 trophies / 5 lives. | Matches the genre; no change. |

## Pick list (user decides; recommended first)
- **P1 (rec, UI only, no balance):** B3 + B4 + B5 + G1-A/B (default 4×, remember speed, auto-skip toggle) + G3 tooltips.
- **P2 (rule change, needs OK):** G2 auto-merge on the 3rd copy.
- **P3 (balance, needs numbers from user):** B1 cap on ฟื้น/ฮิต from skills per match (or lower PT-8 in Balance Room).
- **P4 (visual):** G4 bigger units + G5 picture end screen.
- **P5 (design, later):** G1-C shorter fights · G6 gold sink — after the user plays a few runs.
