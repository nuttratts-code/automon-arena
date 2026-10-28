# Batch 31 options: measured results as colours on the step-1 grid + tribe overview (28 Oct 2026)

Status: WAITING for user pick (asked in chat 28 Oct). Nothing coded yet.

## What exists today
- Step 1 grid (`src/lab/balance/js/31-steps.js` renderGrid): tribe rows × rarity columns, one chip per character (ID + name, gold edge = edited).
- Measured result per character already has a verdict (`verdict()` in src/lab/analyze.js): ok / near / out, from the existing thresholds (mixed ±6, per level ±10 — measure.md). Shown today only as text in the step-2 character form.
- Per-tribe result: uplift per tribe step (results summary `tribes[t][step].uplift / vsMixed`).
- Source: the last "วิเคราะห์" run on this page (lastRun). results/latest in the db is the same data saved for Claude.
- Colours reuse the existing verdict → no new numbers needed.

## Options
- **A (recommended): colour + number on each chip.** Chip edge/background: green ok · yellow near · red out · grey "not measured / edited after measuring". Small number under the name = mixed gap (e.g. +6.5). Tribe header gets a short line per tribe step (e.g. "ขั้น 2 +4 · ขั้น 4 +9"), coloured the same way. Legend line above the grid. Size: small–medium, Balance Room only.
- **B: colour only, no numbers.** Same colours, number only in the tooltip / step-2 form. Cleanest on a phone, but you must tap to see how far off.
- **C: A behind a toggle button "แสดงผลวัด"** (off by default, remembered). Grid stays as today unless switched on.

## Note
- The colours need a fresh "วิเคราะห์" after the set-49 import (the saved results are older). Until then chips show grey.
- Tribe-step colours: tribe uplift has no ok/near/out threshold today → option A shows tribe numbers uncoloured unless the user sets a threshold (would be a new number = ask).
