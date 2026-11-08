# Review 8 Nov 2026 (set 146): R3 rounding (+% gains ≥ +1) + AMCFG1 rev39 import — before/after runerun 3000
Before = origin/main ad9d54c (set 145) · After = branch claude/dreamy-euler-6dlklr (R3 + rev39: 25 rune names, PT-4 name, C3 พุ่งชน, T12 scope one, C7 legend max 1, botgen regenerated).
Same seed/flow (lab/runerun.mjs 3000). runecheck: before 49 ok + 4 warn (S7 S8 T5 T11 rounding to zero) → after 53 ok.

## Run level
| | before | after |
|---|---|---|
| run cleared | 14.7% | 14.2% |
| normal rounds won | 46.2% | 45.2% |
| boss k1 won | 60.8% | 64.7% |
| boss k2 won | 50.7% | 51.9% |
| boss k3 won | 49.5% | 47.7% |

## Runes (uplift pts · decided %) before → after
| rune | before | after |
|---|---|---|
| S7 | 0.4 · 0.6% | 1.4 · 1.9% |
| S8 | 0.6 · 1.1% | 1.1 · 1.3% |
| T5 | 1.7 · 1.9% | 2.3 · 2.6% |
| T11 | 0.7 · 1.1% | 1.5 · 1.9% |
| T12 | -0.2 · 8.3% | -0.7 · 5.4% |
| C7 | 14.9 · 15.0% | 14.2 · 14.4% |
| S5 | 38.4 · 38.6% | 40.3 · 40.6% |
| C1 | 14.2 · 14.8% | 15.1 · 15.6% |
| U6 | 11.2 · 11.7% | 11.0 · 12.0% |
| F6 | 10.0 · 10.3% | 9.9 · 10.2% |
| X7 | 9.6 · 10.7% | 9.8 · 10.4% |
| S4 | 4.8 · 5.1% | 6.3 · 6.9% |
| U3 | 5.6 · 7.0% | 6.1 · 7.2% |
| T6 | 5.6 · 6.0% | 5.8 · 6.7% |
| C3 | 1.7 · 1.9% | 1.4 · 1.7% |
| S2 | 1.6 · 1.8% | 0.9 · 1.1% |
| F2 | 3.2 · 3.6% | 2.9 · 3.1% |
| F1 | 0.7 · 0.8% | 0.5 · 0.5% |
| F3 | 0.7 · 0.8% | 0.6 · 0.7% |
| T10 | 0.7 · 0.7% | 0.4 · 0.4% |
| T9 | 0.3 · 0.4% | 0.9 · 0.9% |
| X6 | -2.2 · 7.6% | -1.7 · 8.4% |
| U4 | -5.3 · 14.0% | -4.7 · 13.6% |

Raw outputs: run `node lab/runerun.mjs 3000` on each commit (≈4.5 min).

## R3 alone (same code + same bot teams, R3 switched off vs on · runerun 3000 / charstat 1500)
The before/after above also includes new bot teams + T12/C7 → to isolate R3, upGain/upMul were patched to plain floor in a scratch copy.
| | R3 off | R3 on |
|---|---|---|
| run cleared | 14.7% | 14.2% |
| normal won | 46.0% | 45.2% |
| boss k1 / k2 / k3 | 59.3 / 50.8 / 48.3 | 64.7 / 51.9 / 47.7 |
| uplift S7 · S8 · T11 | 0.3 · 0.1 · 0.6 | 1.4 · 1.1 · 1.5 |
- Biggest R3 effect: boss k1 +5.4 pts (target set 142b was ~60). k2/k3 within noise.
- Characters (charstat 1500, winAdj): every change within ±8 pts, all small-sample or noise-sized (largest: PL-8 −7.7 n 35 · PT-2 −6.1 n 1800 · WN-4 −6.0 n 205 · HL-4 −5.8 n 39 · WY-2 +5.5 · PT-3 +4.9). No abnormal mover.
- before/after charstat (old vs new bot teams) swings much more (PL-8 fielded 393 → 35) = bot-team regeneration, not R3.
- Option for the user (HARD RULE 6, not done): re-tune k1 back to ~60 with bossrun (show before/after first).
