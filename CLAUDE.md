# Automon Arena — instructions for Claude

Original creature auto-battler, *inspired by* Batomon Showdown but original: never copy its names, characters, art or text. The owner is no-code and controls both the big picture and the details; Claude is the coding assistant.

## Topic files — open ONLY the topic the current task touches (user rule 8 Nov, set 139)
| Topic | File | Open when |
|---|---|---|
| Relay between the 2 accounts · publish ownership + paste message | claude/workflow/relay.md | WIP branch from the other account, publishing, Relay block updates |
| Publish + page tests | claude/workflow/publish.md | publishing an artifact, running ui_smoke by hand |
| Choices A1/B1 · buttons · guiding the user in tools | claude/workflow/replies.md | before asking the user to pick, or walking them through a tool |
| UI work (design skill first) | claude/workflow/ui.md | building or reshaping any UI/page/mockup |
| Balance import · cfgdiff · bossrun | claude/workflow/balance-import.md (§00) | any task touching game values (HARD RULE 6) |
| Measure · bot teams · data format · setup | claude/workflow/{measure,botteams,data-format,setup}.md | that work only |
| Balance/code detail | claude/ops-rules.md · claude/workflow.md | only when needed |

## HARD RULES — read first, never skip (violations caused real damage)
1. **Close-out block (trigger: merging a code branch to main, or the user says it's done/live, or ~15 turns in one chat). Docs-only commits to main (🔒 lock line, Relay, review files) never trigger it (set 152 B1). At ~15 turns mid-set: finish the current step, push, write the WIP branch + next step in the Relay, then close out — the new chat continues the same set (set 152 C1).** Run the `close-out` skill (.claude/skills/close-out/SKILL.md): update + push claude/handoff.md, then the Thai block (ควรเปิดแชทใหม่ได้แล้ว · user todo · model · paste-message). Never continue into new work in the same chat after this block.
2. New file in src/core or src/game = add it to `CORE` in src/build.mjs in the same commit (a missing entry only breaks the built page, not the tests).
3. **Merge gate (rule 31 Oct, after set 62 shipped a broken build):** first run `cd src && node tools/bootstrap.mjs setup` (build + unit tests, ~3 min) until it passes, fixing every failure; only then run the full gate ONCE (rule 5 Nov: never use the slow gate to find test failures). Before merging to main, run `cd src && node tools/bootstrap.mjs gate` (build + tests + ui_smoke on the BUILT pages, installs python playwright if missing, ~4 min, prints GATE: PASS/FAIL; FAILS [] ERRORS [] required). The gate skips unit tests when setup passed on the exact same files < 6 h ago (round 2 D1, set 139: any edit → tests run again; `gate --full` forces; CI always runs everything). Unit tests alone are not enough — they run on source, not on the built html. If ui_smoke cannot run: set it up first (cloud: `pip install playwright`; ui_smoke uses /opt/pw-browsers/chromium); if still impossible, tell the user in Thai and wait for their decision. Never merge or publish silently untested. **Publish gate:** the chat that publishes must first `git fetch`, build from the LATEST main, and get GATE: PASS on that exact commit — the paste-message for the old chat says so; it reports the gate result in the Relay line.
4. handoff.md says "บาลานซ์: กำลังปรับ" = do not import, do not measure. Overrides everything.
5. Never fix before the cause is known with evidence. Tests/page failing or untestable = do not publish, tell the user immediately.
6. **Check before tuning (user rule 7 Nov, set 130):** any task that touches game values (characters, tribes, rules, runes, bosses, mode settings, bossrun/botgen/import) starts with: ask the user for a fresh AMCFG1 → `cd src && node tools/cfgdiff.mjs <file> --md claude/review-YYYY-MM-DD-cfgdiff.md` → show the user every differing cell and ask, per cell or per group, which side wins (Balance Room or game) → only then edit → publish the Balance Room → tell the user exactly which cells they must set back in the Balance Room (+ 💾). bossrun: run WITHOUT --write first, show the user before/after values, write only after the user agrees. Details: claude/workflow/balance-import.md §00.
7. Validate external data before use · no innerHTML with external text, no eval, no scripts from other sites.

## Language
- Think and write in English, including every doc Claude reads (claude/handoff.md, pending.md, ops-rules.md, workflow*, backlog.md, budget-notes.md, measure-log.md).
- **Reply to the user in Thai**, short, no preamble, no recap. After the 3-line header below, details start with what the user must do/decide; explain technical terms.
- **Reply format (user rule 8 Nov, set 150 B1):** every reply starts with 3 short Thai lines, then details below: ① ทำแล้ว/พบ: what was done or found · ② ต้องตัดสินใจ: what the user must approve/decide (or "ไม่มี") · ③ ไม่แน่ใจ: what Claude is unsure about (or "ไม่มี"). The user may stop reading after line 3.
- End of each task set: Thai summary in chat (what the user must do/decide, what changed, pending) — do not expect the user to open handoff.md.
- Docs the user reads stay Thai: combat-rules, tribe-rules, shop-merge-rules, build-plan. Never translate them. Files still in Thai that the user doesn't read: translate to English when opened.

## Scope
- MVP1 = single-player/offline; don't propose systems beyond it. If behind build-plan.md → warn + suggest cuts. MVP2 = Ghost battle + online.
- Placeholder art = coloured shapes + names; must not resemble the original game (the user makes real art).

## Decisions
- **Ask everything up front, then run to the end (user rule 8 Nov, set 150 A1):** at the start of a task set, ask ALL questions needed to finish it in one go (one AskUserQuestion round, more calls only if > 4 questions); after the answers, work to the end without stopping. Stop mid-task only when: publishing an artifact · changing game values / writing the Balance Room db (HARD RULE 6 per-cell picks and bossrun before/after still apply — ask those up front when the data is already known) · a test/gate fails or the cause is unknown (HARD RULE 5) · something irreversible or outside the agreed scope.
- **Weekly review (set 150 D1):** when the user says "รีวิวสัปดาห์" (planned every Friday): read `git log --since='7 days ago' origin/main` + claude/handoff.md + Relay archive of the week (Claude cannot read old chats) → list each time the user corrected/redid Claude's work or a rule caused waste → per item: fix in CLAUDE.md, a topic file, a skill, or nothing (one-off) + the exact text to add/remove → write claude/review-YYYY-MM-DD-weekly.md, ask A/B per change, edit only after approval.
- **New tools:** prefer written instructions (topic file / skill) over new scripts; write code only when instructions cannot do the job, keep it small (set 150, habit 7).
- Design/rules: offer 2–3 options + a recommended one, wait for confirmation.
- **Every time the user must pick (always-on, not topic-only):** label A/B… with options A1/A2…, explain in text first, THEN call AskUserQuestion buttons (max 4 questions per call; more → next call). Details: claude/workflow/replies.md. Several topics in one message = ask once, do all in one pass.
- Small things (text, colours, button position, internal code): decide and inform.
- The user tunes character stats. New character: propose from the median table. Numbers in skills/rules: always ask first.
- Unbalanced idea / loophole: warn directly first.
- **Conflict check (user rule 7 Nov, set 118 — the user may mistype):** before acting on ANY request, compare it with the current docs/code (rules, settings, earlier decisions). If it contradicts or changes something already decided, STOP and tell the user first in Thai: what exists now (doc + rule id + set), what the request would change, and every side effect/clash it creates — then wait for confirmation. Never silently follow the new wording, never silently keep the old one.

## Docs (all under claude/)
- Source of truth: claude/ docs > imported Balance Room values > Game Bible (non-conflicting parts). Not-yet-imported values are not real.
- combat-rules.md (C) · tribe-rules.md (T) · shop-merge-rules.md (S) · build-plan.md · characters.csv (real source: src/core/characters.js). A request that conflicts with docs = point to the spot and ask. These Thai docs are large (~15k tokens each): grep the rule id / heading and read only that section.
- Values not in docs get "(ค่าเสนอ)"; the label is removed when: character stat = confirmed · measurable rule = chosen + measured · unmeasurable = chosen.
- After confirmation: update docs immediately + short summary + bump that file's version (small +0.1 · core rule +1.0).

## Git workflow
- Start of every chat: `git fetch origin` → read the Relay block at the top of claude/handoff.md → open WIP branch named there, else branch from latest main (full relay rules: claude/workflow/relay.md).
- Work on a branch `claude/<topic>`; commit + push after every meaningful step; never force-push. **Merge to main as soon as the merge gate gives GATE: PASS — no need to ask the user (rule 2 Nov); GitHub Actions must be green only before publishing (set 152).** Gate FAIL or not runnable = do not merge, tell the user. Docs-only commits (Relay, reviews, rule docs) go straight to main.
- GitHub Actions runs the full gate on every push that changes code (docs-only pushes under claude/, art/, *.md are skipped, set 139). Published artifacts (game/balance room/check) are built from `src/` and published with the Artifact tool — open them by URL from handoff.md Links (claude/workflow/relay.md + publish.md).

## Token saving
- 1 task set = decide → edit → test → publish once. End of set (or long chat) → close-out block (HARD RULE 1); handoff.md ≤ 1 screen, older content → claude/archive/.
- Tiny fix but heavy search → log in handoff "งานรอรวม". Do pending items when 3 are queued / the same file is already open / user says so. Warn if pending > 2 task sets.
- Read only what's needed, never re-read, never read whole built HTML. Test output: failures only. Subagents only with the user's approval.
- **Proactive token alert (any time):** when the current work starts using many tokens (large files/outputs, repeated searches, long debugging, growing chat) and Claude sees a cheaper way (narrower read/grep, splitting the task, smaller model, new chat, batching, skipping a step), tell the user immediately in 1–2 Thai lines: what is costly + the cheaper option + trade-off. Don't wait for the end of the set; keep working unless the switch needs the user's decision.
- **Proactive workflow advice (user rule 8 Nov, set 139 — widens the token alert):** whenever Claude notices wasted work, a messy/non-standard way of doing something, or a better, faster, cheaper or more orderly method (in code, tests, docs, the gate, the relay, or how the user and Claude work together), tell the user right away without waiting to be asked: 1–3 Thai lines = what is wasteful + the better way + trade-off (+ A1/A2 options if a choice is needed). Keep working on the current task meanwhile; never change rules or process on that advice until the user agrees. Bigger lists go in a claude/review-*.md file named in the Relay block.

## New chat
Read claude/handoff.md (index + pending) → open only needed files/sections and only the topic files the task touches → check the Balance Room only when the user says they saved → propose the next task set + pending items that can ride along.
