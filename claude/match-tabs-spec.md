# match-tabs-spec.md — match analysis: per-unit 4 tabs (English · V1.2 · DONE 26 Oct 2026, ชุด 37 · V1.2 28 Oct: code locations updated after template split)
Status: implemented and published to the Balance Room (v100). Kept as the reference for what the tabs show and how they link to the log.

## What was built
- Collapsed unit row: after "ทำ <total>" a small line "N ฮิต · ไฟ n · ช็อต n".
- Sub-tabs per unit (`mxUnitBody` in lab/balance/js/51-match-units.js; panes built lazily, selected tab remembered per unit):
  1. **ดาเมจที่ทำ** — description line (hits, burn times + total units, shock times + total units, total damage) + source breakdown.
  2. **ดาเมจที่โดน** — one row per enemy (not merged), ONE link per row = log filtered to that pair (burn ticks included). Row "no owner" jumps to its first line. Old combined breakdown kept in a fold.
  3. **อื่นๆ** — non-damage numeric effects, received + given, grouped; every row linked. Event set chosen by Claude (not asked): heal, armor, cleanse, revive, steal, summon, cdCut, reflectDebuff. Stat changes live in tab 4.
  4. **สเตตัส** — final stats from `ini`/`fin` snapshots; each expands to kind rows (skill / tribe bonus / permanent / other) with links, plus a residual row "set at match start" (e.g. tribe start bonuses, no log line).
- Links: open `#simLogFold`, clear filters, scroll + highlight (`lg-hi`); pair filter bar "เอาตัวกรองออก"; target lines beyond the 2000-line limit are still rendered (`keep`). Changing a log filter by hand drops the link filter.
- `simSummary` fold table kept.

## Core change (battle.js)
- Detail on only: non-damage events (armor, heal, buff, atkUp, perm, maxhp, cleanse, steal, cdCut, cdPct, reflectDebuff, revive) get `from` + `d {si, what, src}`; amp stats (hitAmp, burnAmp, shockAmp, healAmp, armorAmp, cdAmp, healToAtk) log extra `buff` events flagged `dx:1`; `ini`/`fin` stat snapshots per unit.
- Detail off = identical events/RNG/results (tests: parity + "ชุด 37" test, suite now 128).
- Side effects: added `from` also widens the log's "ดูเฉพาะ" filter on those events. src core/battle.js now differs from the published game/check pages (they keep the old battle.js until the next import).

## Publish record
- Balance Room only, label "ชุด 37 แท็บรายตัว 4 แท็บ", user waived pre-publish check ① for this UI-only publish. Tests 128/128, ui_smoke 1100 + 390 px: FAILS [] ERRORS []. No measuring done. Balance import still blocked (see handoff).

## Method notes (still valid)
- The Balance Room template is split into small fragments since 28 Oct 2026 (src/lab/balance/, see its README.md): open only the fragment you need.
- Code locations: `mx*` / `renderMatch` in lab/balance/js/51-match-units.js · `mxRecords` in lab/balance/js/50-match-analysis.js · `battleLogLines` + `simLine` in game/labels.js · `apply()` / `log()` / `statNote()` / `snapStats()` in core/battle.js.
