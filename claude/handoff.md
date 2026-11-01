# Automon Arena handoff (English · updated 31 Oct 2026 workflow review · instructions V3.2)
Read by Claude every new chat. Keep ≤ 1 screen; move finished items to claude/archive/ (full pre-trim copy: archive/handoff-2026-10-30-full.md). User gets a Thai summary in chat at the end of each task set.

## Relay (two accounts take turns — rules in CLAUDE.md · full pre-trim block: archive/relay-2026-10-31.md)
- **บาลานซ์: เสร็จแล้ว** (HARD RULE 4 reads this line; set to "กำลังปรับ" while the user is tuning → no import, no measure)
- Account: second (rattanakon.ns), 1 Nov · **no open WIP branch** — set 67 (boss name on EVERY cell the boss stands on in the Balance Room sim: card on first cell + dashed name tags on the rest, follows bossMove / phase spot X5, tap tag = select boss; engine only adds `cells` to boss in start/phase events) MERGED to main d5aa767 (user OK · GATE: PASS on d5aa767, ui_smoke 254/254 both sizes). **Balance room published v134 (1 Nov, main 7f78163 = d5aa767 + docs, GATE: PASS tests 255/255 · ui_smoke 254/254 both sizes FAILS [] ERRORS []).**
- Previous: set 66 — set 66 BOSS BATTLE ENGINE + RUNES IN BATTLE (claude/boss-engine) MERGED to main 0588d72 (user OK · GATE: PASS tests 254/254 · ui_smoke 253/253 both sizes FAILS [] ERRORS []). **Balance room published v133 (1 Nov, main 0588d72, same GATE PASS).**
- Set 66 what shipped (phase 2a): `core/runes.js` turns equipped runes into ordinary skills/unit fields (no per-rune engine code) · `core/boss.js` boss record → fighter + phase helpers · `core/battle.js` boss = ONE fighter on several slots (Q1 A), HP bars = "enemy down" once per bar (high-water mark, refills never re-trigger), phases by bars lost with rules replacing (Q3 A), all 38 rules E1–E8 + R1–R30, phase fx X1–X5, moving spot · rune rules as decided: U2 ชุบ rune-first + limited uses, U4 โล่ pulls the boss too · Balance Room "ลองสู้" tab: ฝั่งขวา ทีม/บอส + rune panel for the left team (`lab/balance/js/42-sim-boss.js`) · tests `tests/t-boss.js` (23).
- Bug found + fixed in set 66: boss lifesteal/regen healed past the bar it was in, so a bar that should have emptied never did → heal is now capped at the top of the bar the boss is in right now.
- Not in the engine (phase 2b, run flow): eco/shop/drop/scout runes (RUNE_RUN_ONLY in core/runes.js), รูนเติบโต stacks (needs win streak), permUp · match code (AMATCH1) does not cover boss fights yet.
- Next step: user picks (2b run flow: difficulty pick, rune drops, rune shop · write the boss/rune rules into combat-rules + tribe-rules for the user to read · measure boss fights · economy Q1–Q4 when ready).
- **Economy 5.5 Q1–Q4 POSTPONED by user (31 Oct)** — claude/review-2026-10-31-economy.md; do not push for answers until the user returns to it. Probe data in review-2026-10-31-system-test.md.
- Parked (ask first): user may re-edit stage runes (wait for AMCFG1 paste) · config/main NOT cleared.
- Publish: game v65 · balance room v134 (set 67, 1 Nov, GATE PASS on 7f78163) · check v65 (31 Oct, main 5a5220f). Always `Artifact read` the Links URL first; publish directly if writer, else "publish pending" + paste-message (CLAUDE.md).
- User-side todo: W1 add `pip install playwright` to the cloud environment setup script (still needed every gate run) · W5 delete merged claude/* branches on github.com (now 12).

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
- Boss/rune rules are only in review files + code so far: write them into combat-rules (C) / tribe-rules (T) when the user next touches those docs.
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
