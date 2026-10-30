# Automon Arena handoff (English · updated 30 Oct 2026 · instructions V3.0)
Read by Claude every new chat. Keep ≤ 1 screen; move finished items to claude/archive/ (full pre-trim copy: archive/handoff-2026-10-30-full.md). User gets a Thai summary in chat at the end of each task set.

## Relay (two accounts take turns — rules in CLAUDE.md)
- Account active now: **second account (rattanakon.ns), set 54 30 Oct** · **no open WIP branch — `claude/stage-mode` MERGED into main 30 Oct** (tests 229/229 · ui_smoke FAILS [] ERRORS [] · Actions success) · set 54 done: rune themes (หมวดย่อย เกราะ/เงิน/ไฟ… + group-by switch) → claude/review-2026-10-30-rune-themes.md · **balance room v120 published** (built from src)
- Set 55 (30 Oct, 2nd account): rune tab UX pass "A" (commit 92815b3, merged; tests pass, probe no errors): removed duplicate category filter row, one-line rune rows, icon pills, group switch next to search, intro hint folded. **Published 30 Oct 17:53** (user confirmed, via the old Balance Room chat). Known/skipped by user: custom-rune edits not counted in "แก้แล้ว N จุด"; ui_smoke 'battle perm skill applied after match' flaky once (passed on rerun, game code unchanged).
- Set 56 (30 Oct, 2nd account): rune/boss tab UX (user picked A+A + equal-height fields) **done + merged to main** (tests 229/229 · ui_smoke FAILS [] ERRORS [] · screenshots desktop/mobile/dark OK): boss = foldable cards, 1-line summary w/ segmented HP bar, 4 field groups, cooldown in seconds (saved as ms), "เทียบทีมกลาง" table (stage 5/10 only, ignores armor/rules); runes = one toolbar (search · หมวด dropdown · group · + เพิ่มรูน menu), odds in rarity headers, 2-line rows, "ใช้" switch, row tap opens edit; all stage fields label-above, 36px, aligned grid; skill glossary hidden on this tab. **Publish pending: balance room (set 56)** via old Balance Room chat.
- Set 57 proposal: other tabs → claude/review-2026-10-30-other-tabs.md (recommended A = tidy ลองสู้ only) · waiting for user pick
- Next step: (0) user publishes balance room set 56 from the old chat; (0b) user picks set 57 option; (1) user tunes runes in Balance Room → 💾 → pastes `AMCFG1` code → set core/stage.js defaults from config.stage; (2) phase 2a battle code (boss + battle runes) — ask before starting
- Open: MVP1 step 5.5 pending (28 Nov at risk) · config/main NOT cleared
- Publish: game v63 · balance room set 55 (v121?, exact number not reported) · check v64 (not republished)
- 2nd account (rattanakon.ns) artifact access depends on the chat type: **this cloud session (Artifact tool, 30 Oct 17:05) opens game + balance room as writer** and can publish. The chat that reported "not found" used get_artifact/read_artifact (a different surface) — those tools cannot see artifacts shared from another account. Cloud session 30 Oct 17:25 (mcp claude-artifacts read_artifact) → "not found" again: publish still pending. **Publish only via the old chat opened from the Balance Room page — see CLAUDE.md "Publish workflow".** Rule: publish only from a session whose `Artifact read` of the Links URL says "writer".

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
combat-rules V2.7 · tribe-rules V2.1 · shop-merge-rules V1.13 · build-plan V1.45 · instructions V3.0 (Thai) · ops-rules v1.1 · pending V1.1 · workflow V1.26 (publish V1.27 · measure V1.27 · botteams V1.23 · balance-import V1.28 · setup V1.27 · others V1.22) · backlog V1.2 · budget-notes V1.1 · measure-log V1.5 · match-tabs-spec V1.3 (done) · characters.csv 28 Oct

## Links (update existing, never create new · main account only)
- game https://claude.ai/artifact/2HnrsoguqeWpBAj7BjxqDL · balance room https://claude.ai/artifact/6hWvgNcKtQmSmvWg4xrgdq (db: config/main ui/main ideas skillPicks results/latest simTeams) · check https://claude.ai/artifact/WTPqFrsDWwoifmdX3ZCJSC

## File index
- Rules (Thai, user reads): combat-rules (C) · tribe-rules (T) · shop-merge-rules (S) · build-plan · stats characters.csv (real source src/core/characters.js · read rows only)
- ops-rules.md · workflow.md index → workflow/{setup,publish,measure,botteams,balance-import,data-format}.md · pending.md · backlog.md · budget-notes.md · measure-log.md · archive/ (README = index) · instructions.md (Thai copy for user, never open)
- Code: `cd src && node tools/bootstrap.mjs setup` (build + tests). Balance Room = shell `src/lab/balance.template.html` + fragments `src/lab/balance/` (README = map); never read built HTML (~320 KB). Match tab = `js/50-match-analysis.js` + `js/51-match-units.js`.
- Tests: ui_smoke `python3 tests/ui_smoke.py <built html dir> <screenshot dir>` ~3–4 min, run in background.
