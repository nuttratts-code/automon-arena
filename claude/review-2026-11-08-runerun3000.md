# Review 8 Nov 2026 (set 140): user's own analysis of Balance Room "รันจริง" 3000 runs — Q&A + changes to do NEXT chat
Rule: this chat only answers + logs. Nothing applied. Next chat starts with HARD RULE 6 (fresh AMCFG1 → cfgdiff → user picks per cell).

## A. Boss 2nd encounter (k2) must be harder than the 1st (k1)
User: bots pass the 2nd boss more easily than the 1st → k2 must be harder.
Evidence (measure-log):
- set 132 runerun 600: k1 won 63.3% · k2 won 84.7%
- set 137 runerun 600 (latest, after rev 32 import): k1 68.2% · k2 71.6% (reached 71.7%) · k3 68.6%
- bossrun was last run with targets 60 / 62 / 50 → k2 was meant to be about equal to k1, not easier.
Cause 1 (confirmed in code): `lab/bossrun.mjs` line 25 still collects boss-round teams with the OLD flow
(`simRun` + `pickBotTeam`, NO runes, no pickFoe) — the same staleness set 138 fixed for the Balance Room
(`lab/analyze.js runPlayStats`). Real runs (runerun) have runes on both sides → player teams at round 10 are
stronger than the teams mult10 was tuned on → k2 lands easier than its target.
Cause 2 (expected, not yet measured): survivorship — only runs still alive at round 10 meet k2 (~72%), and those
are the stronger runs. Separate this from cause 1 by measuring k2 win % on ALL runs vs survivors.
Options (next chat, ask user):
- A1 (rec): port bossrun to the runerun flow (reuse runPlayStats team capture: pickFoe + runes both sides) →
  set user targets with k2 < k1 (e.g. k1 60 · k2 50 · k3 45 — numbers = user's call) → run WITHOUT --write,
  show before/after mult10 + endlessPct per boss → write only on OK → runerun 3000 to confirm.
- A2: quick fix only: raise every boss's mult10 by a flat % (user picks %) and re-measure; no tool change
  (faster but repeats the drift next time teams change).
- A3: A1 + also count survivorship (target k2 on survivors, as players feel it).
Touches game values → HARD RULE 6 first. After write: tell user which boss cells (mult10 / endlessPct /
hp / atk) to set back in the Balance Room ด่าน tab + 💾. Version bump: none of the Thai docs list boss k2 numbers
(boss rules still only in review files — pending bundle item).

## Q2 (answered, no change yet). How to read the card "ชนะแมตช์ทีมบอท" (+ table by win streak)
Code: lab/analyze.js line 305 · = % of matches vs bot teams (bosses + dummy excluded) the player bot did not lose,
over ALL runs, main run AND extra matches. Draw counts as a win (`won1 = winner !== 1`, same as the game's heart rule).
Foe strength adapts (foeFloor 100, −20 per loss from 2 losses in a row, min 40, any win → 100), so ~50% is by design;
the by-streak table shows win % rising with streak = stronger boards keep winning.
Possible later tweaks (only if user asks): split main vs extra · show draws separately.
Q2b: "แมตช์" column = matches played with that streak before them. Row "5 ขึ้นไป" = streak 5, 6, 7 … pooled
(`Math.min(5, m.ws)`), incl. long streaks in extra matches → can exceed row 4. Possible tweak: rows 5 / 6–9 / 10+.

## B. Per-boss win % spread too wide (user: lowest 49%, highest 79%)
Table "บอสในรัน แยกแต่ละตัว" rows = boss × encounter (ครั้งที่ k) → compare rows with the SAME k only.
6 bosses on (B1–B6, mult10 1.96–2.56). 3000 runs → ~500 matches per boss at k1 → noise ±4–5 pts, so a 30-pt gap is real
(unless a row has < ~100 matches, e.g. k3 / extra-only rows).
Likely cause: same as A cause 1 — bossrun scales each boss on no-rune teams; bosses whose rules interact with runes
or with certain tribes drift by different amounts. Also tribe counters (column "เผ่าหลักที่ชนะได้ดีสุด/แย่สุด").
Options (next chat, rides with A): B1 (rec) re-run fixed bossrun per boss on real-run teams → every boss hits the same
target at each k (spread ≈ noise, target band e.g. ±5 pts — user's call) · B2 keep some spread on purpose
(easy/hard bosses as variety; user names which) · B3 tune only the outliers by hand.
Need from user: which boss + ครั้งที่ is 49% and which is 79%.
User data (3000 runs, all k1 round 5, ~470–540 matches each → real gaps):
B4 กระจกสะท้อน 49.5% (bars 4.4/5, 63.8s; เหล็กกล้า 80% / สายฟ้า 8%) · B5 จ้าวพายุ 57.3% (อสูร 80 / วายุ 37) ·
B6 ปีศาจเพลิง 71% (วายุ 96 / สายฟ้า 37) · B1 โกเลม 75% (สายฟ้า 98 / เหล็กกล้า 57) · B2 จอมเวทย์ดำ 79.8% (เพลิงเผา 93 / ภูติ 57) ·
B3 อสุรกายคลั่ง 79.8% (ภูติ 97 / สายฟ้า 55). Mean ≈ 68.7% vs last bossrun target1 60 → k1 also ~9 pts too easy on average.
Bars 4.4–4.8/5 everywhere → losing teams nearly finish the boss (close fights, small scale changes move win % a lot).

## C. Tribe counter inside one boss (new, from B data)
B4 สายฟ้า 8% vs เหล็กกล้า 80% = a lightning player almost always loses boss 1 when B4 is drawn (random draw, 1 in 6).
Others: worst tribe 37–57%. Options: C1 (rec) cap: every tribe ≥ ~30% vs every boss at k1 (look at B4 rule vs shock/lightning
first — find the cause in code before tuning, HARD RULE 5) · C2 keep counters as intended flavour (tell player the boss
earlier = counter-play) · C3 only fix B4 สายฟ้า.

## D. Table "ตามรอบ" (user data, 3000 runs) — how to read + what looks off
Columns: ยังเล่นอยู่ = % of runs that played this round (main run + extra matches after 10 wins) · ชนะ % = of those matches,
% not lost (draw = win) · round 20 = training dummy → always 100% (ignore).
Win % by round: r1 55.5 · r2 61.2 · r3 46.4 · r4 59.6 · r5 boss 68.9 · r6 45.1 · r7 38.5 · r8 39.3 · r9 48.5 · r10 boss 72.1 ·
r11 33.1 · r12 47.2 · r13 55.5 · r14 50.3 · r15 boss 73 · r16 40 · r17 61.2 · r18 69.1 · r19 72.6. Alive r8 94% → r10 67% → r12 47%.
Readings (to verify next chat, not proven):
- Zigzag = adaptive foe strength (any win → foe 100%, 2+ losses → −20% each) → wins and losses alternate by design.
- Boss rounds (69–73%) are EASIER than the bot rounds around them (33–48%) → bosses feel like a free win; matches A/B.
- Dip right after each boss (r6 45 · r11 33 · r16 40): a boss win resets foe strength to 100% (suspect) + teams power jump.
  r7–r8 (~39%) is where runs start dying (alive 99 → 81%).
- r17–19 high (61–73%) = survivorship: only ~11–17% of runs left, mostly strong boards in extra matches.
Options (next chat): D1 (rec) after A/B retune, re-measure runerun 3000 and check boss rounds ≈ or below the bot rounds
around them · D2 also look at r6–r8 / r11 difficulty (bot team power curve or foe-floor rule; ask user before touching) ·
D3 page tweak: split main run vs extra matches per round so survivorship does not hide difficulty.
