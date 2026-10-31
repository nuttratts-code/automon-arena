# Automon Arena handoff (English · updated 31 Oct 2026 workflow review · instructions V3.2)
Read by Claude every new chat. Keep ≤ 1 screen; move finished items to claude/archive/ (full pre-trim copy: archive/handoff-2026-10-30-full.md). User gets a Thai summary in chat at the end of each task set.

## Relay (two accounts take turns — rules in CLAUDE.md · full pre-trim block: archive/relay-2026-10-31.md)
- **บาลานซ์: เสร็จแล้ว** (HARD RULE 4 reads this line; set to "กำลังปรับ" while the user is tuning → no import, no measure)
- Account: second (rattanakon.ns), 31 Oct · **no open WIP branch** — set 65 boss tab (claude/vigilant-meitner-aq2l7w) MERGED to main f1f6335 (user OK · GATE: PASS 232/232 · ui_smoke 232/232 both sizes FAILS [] ERRORS []): boss card UI cleanup + boss spot = any slots (mini board 3 rows × 2 lanes, presets, "move" = 1 slot jumping among picked slots ≥2; data: old ids or 'c'/'m' + 6 bits, core/stage.js spotInfo/spotCode/spotShort; phase spot via "เปลี่ยนที่ยืน"). **Balance room publish PENDING (owner account; get_artifact = not found here; paste-message given to user).**
- Last done: sets 62–64 merged · 31 Oct full system test (claude/review-2026-10-31-system-test.md, no logic bugs) → fixes merged to main 5a5220f (B1 check-page stale line · N1 maxBoard · N2 cleanStage boss fallback = user defaults · N3 buy/sell/reroll refuse after run end · W3 shop fuzz test) · GATE PASS tests 233/233 · ui_smoke 232/232 both sizes FAILS [] ERRORS [] · published.
- Next step: user picks the next set (economy Q1–Q4 when ready · boss battle engine 2a · other).
- **Economy 5.5 Q1–Q4 POSTPONED by user (31 Oct)** — claude/review-2026-10-31-economy.md; do not push for answers until the user returns to it. Probe data in review-2026-10-31-system-test.md.
- Parked (ask first): phase 2a rune + boss battle engine (Q5/Q6 in review-2026-10-29-stage-phase2.md) · user may re-edit stage runes (wait for AMCFG1 paste) · config/main NOT cleared.
- Publish: game v65 · balance room v131 (set 65 pending) · check v65 (31 Oct, main 5a5220f, GATE PASS 233/233 · ui_smoke 232/232). Always `Artifact read` the Links URL first; publish directly if writer, else "publish pending" + paste-message (CLAUDE.md).
- User-side todo: W1 add `pip install playwright` to the cloud environment setup script · W5 delete 13 merged claude/* branches on github.com.

## State (durable facts only — history in archive)
- Balance: import done (set 49, 28 Oct; measure n 24000 seed 4242, abnormal 0, outliers SF-8 +6.5, WY-8 −11.3 = user intent). results/latest is stale (re-measure only if user asks) · DRAFT_KEY v9 · bot teams 90, hash 521fadbf
- Import path: Balance Room "คัดลอกค่าให้ Claude" → `AMCFG1` code → `src/tools/cfgcode.mjs` (workflow/balance-import). Match code `AMATCH1` → `node lab/replay.mjs --code <file> [--fx]`.
- `healHitUp` effect exists, not assigned to any character (needs measuring once used).
- Closed by user, **do not re-propose**: SF-6 stealShock loop + overkill in "dealt" metric (kept as is, 27–28 Oct) · Jules (cancelled 28 Oct).
- t-skill-calc findings F1–F4 print as `WAIT` (not failures); user picks (archive/review-2026-10-28.md).
- Cross-account: the 2nd account cannot read Balance Room db (`ideas`, `results/latest` → not found) → values and ideas reach Claude only through the AMCFG1 paste.
- Open design note: sticky `.topbar` ~148px — user may want it slimmer.
- 13 merged claude/* branches: user deletes on github.com (proxy cannot); keep main + claude/stage-mode.

## Pending bundle ("งานรอรวม")
- MVP1 target 28 Nov 2026 · step 5.5 economy ~14 Nov (proposed) · step 6 polish/mobile 28 Nov → warn if behind.
- Optional: remove the `simSummary` table fold (kept in ชุด 37) — only if user asks.
- tribe-rules T-6 still lists "วายุ ขั้น 2 +17" from old measure — re-measure only if user asks.

## Doc versions
combat-rules V2.7 · tribe-rules V2.1 · shop-merge-rules V1.13 · build-plan V1.45 · instructions V3.2 (Thai copy V3.2) · ops-rules v1.3 · pending V1.2 · workflow V1.27 (publish V1.28 · measure V1.27 · botteams V1.23 · balance-import V1.28 · setup V1.28 · others V1.22) · backlog V2.0 · budget-notes V1.1 · measure-log V1.5 · match-tabs-spec V1.3 (done) · characters.csv 28 Oct

## Links (update existing, never create new · main account only)
- game https://claude.ai/artifact/2HnrsoguqeWpBAj7BjxqDL · balance room https://claude.ai/artifact/6hWvgNcKtQmSmvWg4xrgdq (db: config/main ui/main ideas skillPicks results/latest simTeams) · check https://claude.ai/artifact/WTPqFrsDWwoifmdX3ZCJSC

## File index
- Rules (Thai, user reads): combat-rules (C) · tribe-rules (T) · shop-merge-rules (S) · build-plan · stats characters.csv (real source src/core/characters.js · read rows only)
- ops-rules.md · workflow.md index → workflow/{setup,publish,measure,botteams,balance-import,data-format}.md · pending.md · backlog.md · budget-notes.md · measure-log.md · archive/ (README = index) · instructions.md (Thai copy for user, never open)
- Code: `cd src && node tools/bootstrap.mjs setup` (build + tests). Balance Room = shell `src/lab/balance.template.html` + fragments `src/lab/balance/` (README = map); never read built HTML (~320 KB). Match tab = `js/50-match-analysis.js` + `js/51-match-units.js`.
- Tests: merge/publish gate `cd src && node tools/bootstrap.mjs gate` (~4 min, run in background; GitHub Actions runs the same gate on every push) · `final` only when a balance measure is needed.
