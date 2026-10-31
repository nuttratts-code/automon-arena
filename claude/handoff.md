# Automon Arena handoff (English · updated 31 Oct 2026 set 61 · instructions V3.1)
Read by Claude every new chat. Keep ≤ 1 screen; move finished items to claude/archive/ (full pre-trim copy: archive/handoff-2026-10-30-full.md). User gets a Thai summary in chat at the end of each task set.

## Relay (two accounts take turns — rules in CLAUDE.md)
- Account active now: **second account (rattanakon.ns), set 54 30 Oct** · **no open WIP branch — `claude/stage-mode` MERGED into main 30 Oct** (tests 229/229 · ui_smoke FAILS [] ERRORS [] · Actions success) · set 54 done: rune themes (หมวดย่อย เกราะ/เงิน/ไฟ… + group-by switch) → claude/review-2026-10-30-rune-themes.md · **balance room v120 published** (built from src)
- User pasted AMCFG1 (30 Oct 16:33, stage only): C1 custom skill rune "สนามวายุ" multiUp→tribeAllies v2 scope tribe วายุ (stacks per Wind unit — warned user) + F4 deleted + renames/copies on T5 T7 U3 U6 S7 S8 T9. User is re-editing after set 60 → wait for a new paste before setting stage.js defaults.
- Sets 54–61 (rune/boss/stage UX, rune effects, copies by rarity, ideas in code): full notes in claude/archive/relay-sets-54-61.md · all merged + published (balance room v120–v126).
- **Set 62 (31 Oct, 2nd account) — MERGED to main (user OK 31 Oct):** user's AMCFG1 (31 Oct 08:36Z, stage only) = new defaults: `core/stage-user.js` (STAGE_USER) → `stageDefaults()` = stageBase() + STAGE_USER via cleanStage; custom runes C1–C6 now defaults (C1 'พายุ' = multi +2 tribe วายุ, no stacking). Tests 231/231 (t-validate expectations updated). ui_smoke FAILS [] ERRORS [] only after build fix (stage-user.js added to CORE in build.mjs; the first merge lacked it → built balance page threw 'STAGE_USER is not defined'). **⚠️ v127 (16:06) was published from the BROKEN build → republished from fixed main as v128 (31 Oct 16:28), done.** Cloud container: `pip install playwright`; ui_smoke.py uses /opt/pw-browsers/chromium; pass an ABSOLUTE dir path. 4 ideas in paste still 'รอ Claude'.
- **Process fixes (31 Oct, user asked all 4):** `bootstrap.mjs gate` (build+tests+ui_smoke, PASS required before merge AND publish; auto-installs python playwright) · core/ vs CORE check in tests/run.js (node-only, tests/t-build.js — must NOT go in browser-bundled tests: import.meta broke system-check.html once) · handoff Relay trimmed (sets 54–61 → archive/relay-sets-54-61.md) · CLAUDE.md HARD RULES first. Gate PASS 232/232 + ui_smoke FAILS [] ERRORS [].
- Next step: (1) ~~publish set 62~~ done v127; (2) phase 2a battle code — ask before starting
- Open: MVP1 step 5.5 pending (28 Nov at risk) · config/main NOT cleared
- Publish: game v63 · balance room **v128 (set 62 build fix, 31 Oct 16:28)** (v127 was broken: STAGE_USER undefined) · check v64 (not republished)
- Artifact access: a cloud session using the Artifact tool may be "writer" (set 59 published v124 from a new chat). **Try publishing from the current chat first; fall back to the old Balance Room chat only if `Artifact read` is not writer — CLAUDE.md "Publish workflow" (V3.1).**
- **31 Oct (2nd account, new chat):** this chat had the `mcp__claude-artifacts__*` tools (not the old `Artifact` tool). They return "not found" for all 3 Links artifacts (URL, decoded UUID, shared list empty) although the user sees them as can-edit; the guide says artifacts of another organization are refused. A test page made here ("ทดสอบการมองเห็น (ลบได้)", https://claude.ai/artifact/MP8KPjK3QLL4KUsizMvZZW) IS visible to the user → tool bound to this account; the owner account's artifacts count as another org. If a chat has only these tools → publish via the old Balance Room chat (publish pending).

## State (durable facts only — history in archive)
- Balance: import done (set 49, 28 Oct; measure n 24000 seed 4242, abnormal 0, outliers SF-8 +6.5, WY-8 −11.3 = user intent). results/latest is stale (re-measure only if user asks) · DRAFT_KEY v9 · bot teams 90, hash 521fadbf
- Import path: Balance Room "คัดลอกค่าให้ Claude" → `AMCFG1` code → `src/tools/cfgcode.mjs` (workflow/balance-import). Match code `AMATCH1` → `node lab/replay.mjs --code <file> [--fx]`.
- `healHitUp` effect exists, not assigned to any character (needs measuring once used).
- Closed by user, **do not re-propose**: SF-6 stealShock loop + overkill in "dealt" metric (kept as is, 27–28 Oct) · Jules (cancelled 28 Oct).
- t-skill-calc findings F1–F4 print as `WAIT` (not failures); user picks (archive/review-2026-10-28.md).
- Open design note: sticky `.topbar` ~148px — user may want it slimmer.
- 13 merged claude/* branches: user deletes on github.com (proxy cannot); keep main + claude/stage-mode.

## Pending bundle ("งานรอรวม")
- MVP1 target 28 Nov 2026 · step 5.5 economy ~14 Nov (proposed) · step 6 polish/mobile 28 Nov → warn if behind.
- Optional: remove the `simSummary` table fold (kept in ชุด 37) — only if user asks.
- tribe-rules T-6 still lists "วายุ ขั้น 2 +17" from old measure — re-measure only if user asks.

## Doc versions
combat-rules V2.7 · tribe-rules V2.1 · shop-merge-rules V1.13 · build-plan V1.45 · instructions V3.1 (Thai copy still V3.0) · ops-rules v1.1 · pending V1.1 · workflow V1.26 (publish V1.27 · measure V1.27 · botteams V1.23 · balance-import V1.28 · setup V1.27 · others V1.22) · backlog V1.2 · budget-notes V1.1 · measure-log V1.5 · match-tabs-spec V1.3 (done) · characters.csv 28 Oct

## Links (update existing, never create new · main account only)
- game https://claude.ai/artifact/2HnrsoguqeWpBAj7BjxqDL · balance room https://claude.ai/artifact/6hWvgNcKtQmSmvWg4xrgdq (db: config/main ui/main ideas skillPicks results/latest simTeams) · check https://claude.ai/artifact/WTPqFrsDWwoifmdX3ZCJSC

## File index
- Rules (Thai, user reads): combat-rules (C) · tribe-rules (T) · shop-merge-rules (S) · build-plan · stats characters.csv (real source src/core/characters.js · read rows only)
- ops-rules.md · workflow.md index → workflow/{setup,publish,measure,botteams,balance-import,data-format}.md · pending.md · backlog.md · budget-notes.md · measure-log.md · archive/ (README = index) · instructions.md (Thai copy for user, never open)
- Code: `cd src && node tools/bootstrap.mjs setup` (build + tests). Balance Room = shell `src/lab/balance.template.html` + fragments `src/lab/balance/` (README = map); never read built HTML (~320 KB). Match tab = `js/50-match-analysis.js` + `js/51-match-units.js`.
- Tests: ui_smoke `python3 tests/ui_smoke.py <built html dir> <screenshot dir>` ~3–4 min, run in background.
