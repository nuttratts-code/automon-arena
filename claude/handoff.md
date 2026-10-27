# Automon Arena handoff (English · updated 28 Oct 2026 · instructions V3.0)
Read by Claude every new chat. User gets a Thai summary in chat at the end of each task set (decision 26 Oct).

## State
- **Balance: done · import done (set 38, 27 Oct)** · config/main cleared (v204, empty chars/tribes) · results/latest v9 is now stale vs. the new game (user re-measures only if they want) · DRAFT_KEY v9
- Published: game v57 · balance room v102 · check v56 · tests 128/128 (5 tribe tests now value-independent: helper TBR in tests/mechanics.js) · bot teams 90, hash 58de9165
- Post-import measure (n 24000, seed 4242, abnormal 0): outliers SF-8 +6.5, WY-8 −11.3 (user's intent, passed) · details in measure-log
- ⚠ **ANOMALY still open (27 Oct): results.suspicious has 10 matches with damage far above total HP** (dmgPerHp 11–255). Worst: level 3, side B [HL-2 HL-3 SF-6 HL-5 PT-5 SF-7], PT-5 dealt 1,379,755. Others: PT-5 (lv1/lv2), WN-3 (team HL-1 PL-2 SF-1 WN-3 WN-2 SF-6), HL-7 (3 mix teams). Suspect damage loop / reflect / damage counted after death. Cause unknown — investigate with evidence (replay seed + match index from results.suspicious; seed in results.seed) before any fix. Not fixed.
- Open design note: sticky `.topbar` is ~148px (~16% of a 900px screen) — user may want it slimmer.
- ui_smoke.py needs args: `python3 tests/ui_smoke.py <dir with built html> <screenshot dir>` (run `node build.mjs` in src first). ~3–4 min: run in background, wait with Monitor.
- Publish note: artifact must be Artifact-`read` (no path) before publishing; first publish may be refused, see workflow/publish.md. extract-from-pages.py now loads check → game → balance so the balance page's newer code wins (no more MISMATCH on battle.js/labels.js).
- **Repo migration DONE (28 Oct, branch `claude/migrate-to-git`, not yet merged to main):** code+docs now live in git https://github.com/nuttratts-code/automon-arena (`src/`, `claude/`, CLAUDE.md, GEMINI.md). `cd src && node tools/bootstrap.mjs setup` = build + tests (128/128). recover.py / extract-from-pages.py removed; setup.md, workflow.md, bootstrap.mjs rewritten for git. Publishing artifacts still via Artifact tool (publish.md). Jules flow + Gemini limits: GEMINI.md. Platform decision recorded in build-plan V1.43 + backlog V1.1.
- In git, archive/ and instructions.md are NOT copied (stay in the Project). Project docs are now a stale copy — git is the source of truth; do not sync both.

## Next
1. Investigate suspicious-damage anomaly (Opus): reproduce one match from seed/index, find cause with evidence, report to user before any fix. If a bug is fixed, re-measure needed.
2. User: verify Jules access (Google AI Pro), connect Jules to the repo, merge the migration PR/branch into main. Then Claude: first task card test for Jules; optional GitHub Action for tests.
3. Batch 31: measured results as colors on the grid, step 1 + tribe overview.

## Pending bundle ("งานรอรวม")
- Translate remaining workflow files to English when next opened: workflow/data-format.md, balance-import.md · same for backlog/budget-notes. Done: handoff, pending, measure-log, workflow.md, workflow/{setup,publish,measure,botteams}.md.
- Ask user: set target dates in build-plan? (none = cannot warn "behind schedule").
- Optional: user may later ask to remove the `simSummary` table fold (kept in ชุด 37).
- Possible follow-up: tribe-rules T-6 still lists "วายุ ขั้น 2 +17" from old measure — re-measure tribe tier effects only if user asks.

## Doc versions
combat-rules V2.1 · tribe-rules V2.1 · shop-merge-rules V1.11 · build-plan V1.43 · instructions V3.0 (Thai) · ops-rules v1.1 · pending V1.1 · workflow V1.26 (publish V1.26 · measure V1.27 · botteams V1.23 · balance-import V1.26 · setup V1.25 · others V1.22) · backlog V1.1 · budget-notes V1.0 · measure-log V1.4 (English) · match-tabs-spec V1.1 (done) · characters.csv 27 Oct

## Links (update existing, never create new)
- game https://claude.ai/artifact/2HnrsoguqeWpBAj7BjxqDL · balance room https://claude.ai/artifact/6hWvgNcKtQmSmvWg4xrgdq (db: config/main ui/main ideas skillPicks results/latest simTeams) · check https://claude.ai/artifact/WTPqFrsDWwoifmdX3ZCJSC

## File index
- Rules (Thai, user reads): combat-rules (C) · tribe-rules (T) · shop-merge-rules (S) · build-plan · stats characters.csv (real source src/core/characters.js · read rows only)
- ops-rules.md (EN) balance/publish · workflow.md index → workflow/{setup,publish,measure,botteams,balance-import,data-format}.md · match-tabs-spec.md (EN, done)
- pending.md · backlog.md · budget-notes.md · measure-log.md · archive/ (README = index) · instructions.md (Thai copy for user, never open)
- src/**: in the repo; run `cd src && node tools/bootstrap.mjs setup` (workflow/setup.md)
- ⚠ **src/lab/balance.template.html is ~320 KB: never print/read it whole**. Match analysis tab = mx*/renderMatch/mxUnitBody.
- Publish note: first publish of a rebuilt page from git may show a diff vs. the live page; check it contains only intended edits.
