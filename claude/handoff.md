# Automon Arena handoff (English · updated 27 Oct 2026 · instructions V3.0)
Read by Claude every new chat. User gets a Thai summary in chat at the end of each task set (decision 26 Oct).

## Relay (two accounts take turns — rules in CLAUDE.md)
- Account active now: **account 2** · open WIP branch: none (work from main) · last done: set D (a)+(b) MERGED into main (fast-forward, user agreed 27 Oct; Action green run 40512454097, local tests 128/128, ui_smoke FAILS [] ERRORS []; branch `claude/set-d-docs-tests-split` can be deleted by user) · next step: Next 1 (anomaly, Opus) · open decisions: none · publish pending: system-check page changed (embeds new test files) — republish check only if user wants; game/balance room byte-identical, nothing to republish · publish access: writer on all 3 artifacts

## State
- **Balance: done · import done (set 38, 27 Oct)** · config/main cleared (v204, empty chars/tribes) · results/latest v9 is now stale vs. the new game (user re-measures only if they want) · DRAFT_KEY v9
- Published: game v57 · balance room v102 · check v56 · tests 128/128 (split into tests/helpers.js + t-*.js topic files in set D; helper TBR now in tests/helpers.js) · bot teams 90, hash 58de9165
- Post-import measure (n 24000, seed 4242, abnormal 0): outliers SF-8 +6.5, WY-8 −11.3 (user's intent, passed) · details in measure-log
- ⚠ **ANOMALY still open (27 Oct): results.suspicious has 10 matches with damage far above total HP** (dmgPerHp 11–255). Worst: level 3, side B [HL-2 HL-3 SF-6 HL-5 PT-5 SF-7], PT-5 dealt 1,379,755. Others: PT-5 (lv1/lv2), WN-3 (team HL-1 PL-2 SF-1 WN-3 WN-2 SF-6), HL-7 (3 mix teams). Suspect damage loop / reflect / damage counted after death. Cause unknown — investigate with evidence (replay seed + match index from results.suspicious; seed in results.seed) before any fix. Not fixed.
- **Set B done and MERGED into main (branch `claude/split-balance-template`, no behaviour change):** `src/lab/balance.template.html` (3452 lines) → 33-line shell + 23 fragments in `src/lab/balance/{css,js}/` + `body.html` (map: `src/lab/balance/README.md`). build.mjs got `<!--@include path-->`. Proof: sha256 of balance.html / game.html / system-check.html identical before vs after · tests 128/128. New `.github/workflows/tests.yml` runs `node tools/bootstrap.mjs setup` on every push (ui_smoke/measure not in CI). Docs updated: setup.md V1.26, match-tabs-spec V1.2, backlog V1.2 (now English), GEMINI.md.
- Open design note: sticky `.topbar` is ~148px (~16% of a 900px screen) — user may want it slimmer.
- ui_smoke.py needs args: `python3 tests/ui_smoke.py <dir with built html> <screenshot dir>` (run `node build.mjs` in src first). ~3–4 min: run in background, wait with Monitor.
- Publish note: artifact must be Artifact-`read` (no path) before publishing; first publish may be refused, see workflow/publish.md.
- **Repo migration DONE (28 Oct, merged into main):** code+docs now live in git https://github.com/nuttratts-code/automon-arena (`src/`, `claude/`, CLAUDE.md, GEMINI.md). `cd src && node tools/bootstrap.mjs setup` = build + tests (128/128). recover.py / extract-from-pages.py removed; setup.md, workflow.md, bootstrap.mjs rewritten for git. Publishing artifacts still via Artifact tool (publish.md). Jules flow + Gemini limits: GEMINI.md. Platform decision recorded in build-plan V1.43 + backlog V1.1.
- In git, archive/ and instructions.md are NOT copied (stay in the Project). Project docs are now a stale copy — git is the source of truth; do not sync both.

## Next
0. **Set D: DONE and MERGED into main (27 Oct).** (a) build-plan V1.44: finished parts → claude/archive/build-plan-done.md + heading index; combat-rules V2.2: heading index. (b) mechanics.js split into helpers.js + 8 t-*.js files (tests reordered by topic; same 128 names, 128/128, balance.html/game.html sha identical, only system-check.html differs). Old branches: user deletes (proxy cannot).
1. Investigate suspicious-damage anomaly (Opus): reproduce one match from seed/index, find cause with evidence, report to user before any fix. If a bug is fixed, re-measure needed.
2. User: verify Jules access (Google AI Pro), connect Jules to the repo. Then Claude: first task card test for Jules. (GitHub Action for tests: done in set B.)
3. Batch 31: measured results as colors on the grid, step 1 + tribe overview.

## Pending bundle ("งานรอรวม")
- Translate remaining workflow files to English when next opened: workflow/data-format.md, balance-import.md · same for budget-notes. Done: handoff, pending, measure-log, backlog, workflow.md, workflow/{setup,publish,measure,botteams}.md.
- build-plan stale lines (not touched in set D): section "โครงสร้างโค้ด" still says code lives in claude/src/ and mentions tools/extract-from-pages.py (removed) — fix when next opened.
- Ask user: set target dates in build-plan? (none = cannot warn "behind schedule").
- Optional: user may later ask to remove the `simSummary` table fold (kept in ชุด 37).
- Possible follow-up: tribe-rules T-6 still lists "วายุ ขั้น 2 +17" from old measure — re-measure tribe tier effects only if user asks.

## Doc versions
combat-rules V2.2 · tribe-rules V2.1 · shop-merge-rules V1.11 · build-plan V1.44 · instructions V3.0 (Thai) · ops-rules v1.1 · pending V1.1 · workflow V1.26 (publish V1.26 · measure V1.27 · botteams V1.23 · balance-import V1.26 · setup V1.27 · others V1.22) · backlog V1.2 (English) · budget-notes V1.0 · measure-log V1.4 (English) · match-tabs-spec V1.2 (done) · characters.csv 27 Oct

## Links (update existing, never create new)
- game https://claude.ai/artifact/2HnrsoguqeWpBAj7BjxqDL · balance room https://claude.ai/artifact/6hWvgNcKtQmSmvWg4xrgdq (db: config/main ui/main ideas skillPicks results/latest simTeams) · check https://claude.ai/artifact/WTPqFrsDWwoifmdX3ZCJSC

## File index
- Rules (Thai, user reads): combat-rules (C) · tribe-rules (T) · shop-merge-rules (S) · build-plan · stats characters.csv (real source src/core/characters.js · read rows only)
- ops-rules.md (EN) balance/publish · workflow.md index → workflow/{setup,publish,measure,botteams,balance-import,data-format}.md · match-tabs-spec.md (EN, done)
- pending.md · backlog.md · budget-notes.md · measure-log.md · archive/ (README = index) · instructions.md (Thai copy for user, never open)
- src/**: in the repo; run `cd src && node tools/bootstrap.mjs setup` (workflow/setup.md)
- Balance Room source = small shell `src/lab/balance.template.html` + fragments in `src/lab/balance/` (README.md = map). Open only the fragment needed; never read the built balance.html (~320 KB). Match analysis tab = `js/50-match-analysis.js` (mxRecords) + `js/51-match-units.js` (mx*, renderMatch, mxUnitBody).
- Publish note: first publish of a rebuilt page from git may show a diff vs. the live page; check it contains only intended edits.
