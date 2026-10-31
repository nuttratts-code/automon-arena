# Automon Arena handoff (English · updated 31 Oct 2026 workflow review · instructions V3.2)
Read by Claude every new chat. Keep ≤ 1 screen; move finished items to claude/archive/ (full pre-trim copy: archive/handoff-2026-10-30-full.md). User gets a Thai summary in chat at the end of each task set.

## Relay (two accounts take turns — rules in CLAUDE.md)
- **บาลานซ์: เสร็จแล้ว** (HARD RULE 4 reads this line; set to "กำลังปรับ" while the user is tuning → no import, no measure)
- Account active now: **second account (rattanakon.ns), 31 Oct, workflow-review set** · **no open WIP branch** — `claude/modest-wozniak-antecb` (docs + CI only) MERGED to main 31 Oct (user OK · GATE: PASS 232/232 · ui_smoke 231/231 both sizes FAILS [] ERRORS [] · Actions gate success)
- Last done: set 62 (stage defaults from user AMCFG1 → `core/stage-user.js`) merged + balance room **v128** published (v127 was broken) · process fixes (gate, CORE check) · workflow review 31 Oct: CI now runs the full gate (build + tests + ui_smoke), publish.md rewritten for the new artifact tools, stale docs fixed/archived, Jules docs archived. Older notes: archive/relay-sets-54-61.md.
- **Decisions 31 Oct (user):** (a) publishing stays with the owner (first) account — 2nd account publishes only if `get_artifact` works on the Links URL, else "publish pending" + paste-message for the old Balance Room chat · (b) **pause Balance Room/rune tooling work; next focus = MVP1 step 5.5 economy** (28 Nov at risk).
- Next step: start MVP1 step 5.5 (economy) — read build-plan step 5.5, propose the plan + questions to the user first. 4 ideas from the 31 Oct paste still 'รอ Claude' (answer in chat when the user pastes AMCFG1 again). Phase 2a rune battle code = parked (ask before starting).
- Open: config/main NOT cleared · user may still re-edit stage runes (wait for a new AMCFG1 paste).
- Publish: game v63 · balance room **v128 (31 Oct 16:28)** · check v64. No publish pending.
- Artifact access: the `mcp__claude-artifacts__*` tools in the 2nd account return "not found" for all 3 Links artifacts (owner account = another org). Publish via the owner account (decision (a)).

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
combat-rules V2.7 · tribe-rules V2.1 · shop-merge-rules V1.13 · build-plan V1.45 · instructions V3.2 (Thai copy V3.2) · ops-rules v1.3 · pending V1.2 · workflow V1.27 (publish V1.28 · measure V1.27 · botteams V1.23 · balance-import V1.28 · setup V1.28 · others V1.22) · backlog V1.9 · budget-notes V1.1 · measure-log V1.5 · match-tabs-spec V1.3 (done) · characters.csv 28 Oct

## Links (update existing, never create new · main account only)
- game https://claude.ai/artifact/2HnrsoguqeWpBAj7BjxqDL · balance room https://claude.ai/artifact/6hWvgNcKtQmSmvWg4xrgdq (db: config/main ui/main ideas skillPicks results/latest simTeams) · check https://claude.ai/artifact/WTPqFrsDWwoifmdX3ZCJSC

## File index
- Rules (Thai, user reads): combat-rules (C) · tribe-rules (T) · shop-merge-rules (S) · build-plan · stats characters.csv (real source src/core/characters.js · read rows only)
- ops-rules.md · workflow.md index → workflow/{setup,publish,measure,botteams,balance-import,data-format}.md · pending.md · backlog.md · budget-notes.md · measure-log.md · archive/ (README = index) · instructions.md (Thai copy for user, never open)
- Code: `cd src && node tools/bootstrap.mjs setup` (build + tests). Balance Room = shell `src/lab/balance.template.html` + fragments `src/lab/balance/` (README = map); never read built HTML (~320 KB). Match tab = `js/50-match-analysis.js` + `js/51-match-units.js`.
- Tests: merge/publish gate `cd src && node tools/bootstrap.mjs gate` (~4 min, run in background; GitHub Actions runs the same gate on every push) · `final` only when a balance measure is needed.
