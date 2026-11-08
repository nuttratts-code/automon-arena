---
name: balance-import
description: Automon Arena import of game values from the Balance Room (นำค่าเข้าเกม / AMCFG1 / ค่าจากห้องบาลานซ์ / ปรับค่า) (AMCFG1 code → cfgdiff → user picks → apply → tests → gate → publish → cells to set back). Use for ANY task that touches game values (characters, tribes, rules, runes, bosses, mode settings, bossrun/botgen/import) — HARD RULE 6. Ordered runbook; the rules themselves live in claude/workflow/balance-import.md (§00 + §0) and win if anything differs.
---
# Balance import runbook (set 157 — skill from the close-out skill check)

Stop first if the handoff Relay says `บาลานซ์: กำลังปรับ` (HARD RULE 4). All commands run in `src/`. Heavy jobs (botgen, bossrun, gate) run ONE at a time in the background (2 cores); do light work meanwhile.

## A. Ask up front (one AskUserQuestion round, rule A1)
1. Ask the user for a fresh AMCFG1: Balance Room → 💾 → "คัดลอกค่าให้ Claude" → paste. Save it to the scratchpad as `amcfg.txt`.
2. If characters or tribes changed: the user must have pressed "วิเคราะห์" before 💾 (check ①, set 153 I1).

## B. Compare (HARD RULE 6)
3. `node tools/cfgdiff.mjs <amcfg.txt> --md ../claude/review-YYYY-MM-DD-cfgdiff-revNN.md` (NN = AMCFG1 rev; exit 0 MATCH · 1 DIFFERS · 2 bad input).
4. DIFFERS → commit the review file to main (docs-only) → explain in Thai, ask per cell/group with buttons: **ยึด Balance Room** or **ยึดเกม**. Never pick a side yourself.

## C. Apply (only the "ยึด Balance Room" cells)
5. `node tools/cfgcode.mjs <amcfg.txt> <out>` → validates, writes `<out>/main.json`, prints pre-import check MATCH/DIFFERS (DIFFERS blocks only when chars/tribes changed) + open ideas (answer them in chat).
6. Chars/tribes/rules: `cp core/characters.js core/characters.before.js` → `node tools/apply-config.mjs <out>/main.json` → `node tools/csv.mjs core/characters.before.js` → move `src/characters.csv` to `claude/characters.csv` → delete the .before copy.
7. Stage (runes/bosses/mode settings): `node tools/apply-stage.mjs <out>/main.json --take <part | part:id,…>` (e.g. `bosses:B1,runes:T2,settings:foeFloor`).
8. Re-run step 3: every taken cell must be gone from the diff.
9. Renamed/changed runes or characters → `grep -n '<id or name>' tests/ui_smoke.py tests/*.js` and fix BEFORE any test run (W6). Changed kits → old kit as retired test `ID@n`. Check only those: `node tools/bootstrap.mjs test <ID>`. Commit + push.

## D. Rebuild data
10. Chars/tribes changed → background `node lab/botgen.mjs 2400 4` (~6.5–13 min). Meanwhile: draft the Relay line, `Artifact read` the Links URLs (writer check).
11. Bosses affected → background `node lab/bossrun.mjs 600 75 62 50` (NO --write) → show the user the before → after table (hp, atk, phase atk, mult10, endlessPct, win %) → only after they agree: same command + `--write`, check the printed values are the same. Commit + push.

## E. Gate → merge → publish
12. `node tools/bootstrap.mjs setup` until it passes (fix every failure here).
13. Background `node tools/bootstrap.mjs gate` ONCE → GATE: PASS (FAILS [] ERRORS []) → merge to main (no user OK needed). FAIL → stop, tell the user (HARD RULE 5; false FAIL → publish.md §9.3).
14. Publish: run the `publish-pages` skill (game + Balance Room so page defaults = game values; check page if tests changed). Publishing = a stop point: tell the user first.
15. Owner account: clear config/main (chars/tribes {}, bump rev + savedAt, appliedAt/appliedNote).

## F. Tell the user (Thai)
16. Exactly which cells they must set back on the Balance Room page (every "ยึดเกม" cell + any value Claude changed, e.g. bossrun) and then press 💾 — otherwise the next import reverts them.
17. Close-out (HARD RULE 1): Relay line names the AMCFG1 rev, cfgdiff result, tools re-checked (measure.md §00), GATE result, published versions.
