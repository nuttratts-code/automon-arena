# Stage mode baseline: player damage per stage (29 Oct 2026)
Tool: `src/lab/stagedps.mjs` (branch claude/stage-mode) · 1000 runs · seed 4242 · player = shop bot (core/bot.js) through the real shop · opponents = current 90 bot teams · 1 match = 1 stage (hearts as now).
DPS = damage per second the player team deals to a passive dummy in the first 30 s (skills + tribe bonuses included, storm excluded). Team HP = sum of base max HP (no tribe bonus).

| stage | DPS p25 | median | p75 | team HP median | units | sum of levels |
|---|---|---|---|---|---|---|
| 1 | 2 | 2 | 3 | 270 | 2.9 | 3.0 |
| 2 | 4 | 5 | 6 | 524 | 5.5 | 5.8 |
| 3 | 4 | 5 | 7 | 600 | 6 | 6.6 |
| 4 | 4 | 6 | 8 | 660 | 6 | 7.1 |
| 5 (boss) | 5 | 7 | 10 | 756 | 6 | 8.1 |
| 6 | 7 | 9 | 14 | 860 | 6 | 9.2 |
| 7 | 8 | 12 | 17 | 960 | 6 | 10.2 |
| 8 | 9 | 13 | 18 | 1060 | 6 | 11.0 |
| 9 | 10 | 14 | 20 | 1100 | 6 | 11.5 |
| 10 (boss) | 10 | 14 | 21 | 1140 | 6 | 11.7 |
| 11–15 | 10–11 | 15–16 | 24–27 | 1160–1240 | 6 | 12 |
| 16–19 | 12–13 | 17–19 | 29–34 | 1260–1350 | 6 | 12 |

Notes
- Growth flattens after stage ~10: bot reaches 6 units ≈ Lv2 each and stops merging to Lv3; only permanent values keep growing. Endless bosses must not outscale this (runes not included here).
- Bot is a simple buyer; real players are probably stronger → treat as a floor, re-check with real play data (plays collection) after the demo.
- Use (user chose 29 Oct): enemy team for easy ≈ p25, normal ≈ median, hard ≈ p75 of that stage; boss sized from median DPS × fight time.
