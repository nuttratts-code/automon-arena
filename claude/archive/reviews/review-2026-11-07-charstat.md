# Character results from "real-player" bot runs (set 122, 7 Nov)

User asked (before the economy tuning): which characters are stronger / weaker than their price when bots play like real players → user tunes stats once.
Tool: `cd src && node lab/charstat.mjs 3000` (128 s, read-only). Full table: claude/charstat-2026-11-07.txt.
Method: 3000 runs with core/bot.js (same flow as lab/runerun.mjs), normal matches only, both sides (player bot + real bot team). 144,360 fielded units.
- winAdj = win % of matches the character played − average win % of that side at that round (points). vsPrice = winAdj − average of the same price.
- Noise ≈ ±2 points at ~2000 fielded, ±4 at ~500, ±9 at ~100. 600-run and 3000-run tables agree.
- Limits: the bot buys by base stats only (skills not read) → WY-3, WY-8 never fielded, PL-6 101, WN-4 313. winAdj also carries tribe/team effects (who a character is played with), so it is a guide, not proof.

Tribe average vsPrice: SF +5.4 · PT +4.7 · HL +3.0 · WY +1.7 · WN −4.3 · PL −8.2 (fire weak as a whole → maybe tribe bonus, not each unit).

Strong for price (vsPrice ≥ +6): PT-6 +20.6 · HL-6 +11.2 · SF-3 +9.9 · HL-7 +9.8 · PT-4 +9.5 · SF-5 +9.3 · HL-8 +8.6 · SF-1 +7.8 · WN-4 +6.3 (few) · PT-1 +6.2 · SF-7 +6.1
Weak for price (vsPrice ≤ −6): PL-2 −19.3 · WN-5 −15.3 · HL-4 −14.0 · PL-1 −12.4 · PL-4 −12.0 · PL-6 −11.0 (few) · PL-8 −9.8 · WN-6 −8.3 · WN-2 −6.7 · WN-8 −6.0
Note: HL-4, WN-5, PL-2 are shop/permanent-skill characters (value builds over the run) — a low match win may be by design.

## Balance Room "VS Bot" shows many "หลุด" (user 7 Nov) — cause found, not fixed (waiting for user pick)
- lab/measure.mjs 12000 seed 4242 on current main: 26 of 48 out. Every price-3 unit +12…+16 (too strong), every legend −21…−33 (too weak).
- Cause: target formula lab/analyze.js rawTarget = 5 × (price − 5) was set when prices were 3/4/5/6/8 (targets −10/−5/0/+5/+15). Set 107 made prices 3/5/7/10/15 → targets −10/0/+10/+25/+50 (legend must win +50 points: impossible). Stats did not change; the yardstick did. Real-run charstat shows PT-6 strongest while VS Bot calls it −28.
- Options: A (recommended) target by rarity step, same spacing as before: −10/−5/0/+5/+15 · B keep 5 per gold · C 2 per gold: −4/0/+4/+10/+20.
- Side bug: lab/analyze.js imports rarityOdds from core/stage.js which no longer exists → `node lab/measure.mjs` crashes (Balance Room bundle strips imports; only VS บอส random-rune mode would throw). Fix with the next code set.
