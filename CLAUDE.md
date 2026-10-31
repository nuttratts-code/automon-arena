# Automon Arena — instructions for Claude

Original creature auto-battler, *inspired by* Batomon Showdown but original: never copy its names, characters, art or text. The owner is no-code and controls both the big picture and the details; Claude is the coding assistant.

## HARD RULES — read first, never skip (violations caused real damage)
1. **Close-out block (trigger: every merge to main, or the user says it's done/live, or ~15 turns in one chat).** Stop and output, in Thai: ควรเปิดแชทใหม่ได้แล้ว · what the user must do first · recommended model (Sonnet routine / Opus deep design or hard bugs / Haiku trivial) + 1-line reason · a ready-to-paste message for the new chat (next-task options go IN that message, not offered in the old chat). Update claude/handoff.md + push before it. Never continue into new work in the same chat after this block.
2. New file in src/core or src/game = add it to `CORE` in src/build.mjs in the same commit (a missing entry only breaks the built page, not the tests).
3. **Merge gate (rule 31 Oct, after set 62 shipped a broken build):** before merging to main, run `cd src && node tools/bootstrap.mjs gate` (build + tests + ui_smoke on the BUILT pages, installs python playwright if missing, ~4 min, prints GATE: PASS/FAIL; FAILS [] ERRORS [] required). Unit tests alone are not enough — they run on source, not on the built html. If ui_smoke cannot run: set it up first (cloud: `pip install playwright`; ui_smoke uses /opt/pw-browsers/chromium); if still impossible, tell the user in Thai and wait for their decision — never merge or publish silently untested. Never merge or publish silently untested. **Publish gate:** the chat that publishes must first `git fetch`, build from the LATEST main, and get GATE: PASS on that exact commit — the paste-message for the old chat says so; it reports the gate result in the Relay line.
4. handoff.md says "บาลานซ์: กำลังปรับ" = do not import, do not measure. Overrides everything.
5. Never fix before the cause is known with evidence. Tests/page failing or untestable = do not publish, tell the user immediately.
6. (Balance/code details: claude/ops-rules.md, claude/workflow.md — read only when needed.) Validate external data before use · no innerHTML with external text, no eval, no scripts from other sites.

## Language
- Think and write in English, including every doc Claude reads (claude/handoff.md, pending.md, ops-rules.md, workflow*, backlog.md, budget-notes.md, measure-log.md).
- **Reply to the user in Thai**, short, no preamble, no recap. Start with what the user must do/decide; explain technical terms.
- End of each task set: Thai summary in chat (what the user must do/decide, what changed, pending) — do not expect the user to open handoff.md.
- Docs the user reads stay Thai: combat-rules, tribe-rules, shop-merge-rules, build-plan. Never translate them. Files still in Thai that the user doesn't read: translate to English when opened.

## Scope
- MVP1 = single-player/offline; don't propose systems beyond it. If behind build-plan.md → warn + suggest cuts. MVP2 = Ghost battle + online.
- Placeholder art = coloured shapes + names; must not resemble the original game (the user makes real art).

## Replies
- Work the user does in tools (Balance Room, game page): name the tool, one step at a time, wait for "done".
- "Why / how should" questions = short answer, change nothing until told.
- Characters as ID+name, e.g. PL-3 (name). Rules: C- combat · T- tribe · S- shop.

## Decisions
- Design/rules: offer 2–3 options + a recommended one, wait for confirmation. Several topics in one message = ask once, do all in one pass.
- Small things (text, colours, button position, internal code): decide and inform.
- The user tunes character stats. New character: propose from the median table. Numbers in skills/rules: always ask first.
- Unbalanced idea / loophole: warn directly first.

## Docs (all under claude/)
- Source of truth: claude/ docs > imported Balance Room values > Game Bible (non-conflicting parts). Not-yet-imported values are not real.
- combat-rules.md (C) · tribe-rules.md (T) · shop-merge-rules.md (S) · build-plan.md · characters.csv (real source: src/core/characters.js). A request that conflicts with docs = point to the spot and ask.
- Values not in docs get "(ค่าเสนอ)"; the label is removed when: character stat = confirmed · measurable rule = chosen + measured · unmeasurable = chosen.
- After confirmation: update docs immediately + short summary + bump that file's version (small +0.1 · core rule +1.0).

## Git workflow
- Work on a branch; merge to main only after tests pass (and the user agrees).
- Setup/test: `cd src && node tools/bootstrap.mjs setup` (build + tests); GitHub Actions runs the full gate on every push. Published artifacts (game/balance room/check) are built from `src/` and published with the Artifact tool — see claude/workflow/publish.md.

## Relay between two Claude accounts (decision 27 Oct)
Two Claude accounts take turns on this repo: when one hits its usage limit, the other picks up. Only ONE account works at a time.
- **Start of every chat:** `git fetch origin` → check the "Relay" block at the top of claude/handoff.md → if it names an open WIP branch, check it out and continue from "Next step"; otherwise branch from latest main.
- **Relay block always lives on main (decision 27 Oct):** every Relay update is also committed to main right away (docs-only commit: handoff.md, review/report files under claude/; no code). Reports/lists the user must pick from go in a file under claude/ (e.g. claude/review-YYYY-MM-DD.md) named in the Relay block — never only in chat. If main's Relay looks stale, also check `git ls-remote origin 'refs/heads/claude/*'` for newer branches.
- **While working:** commit + push after every meaningful step (a limit can cut the chat at any moment; unpushed work is lost). Branch name: `claude/<topic>`. Never force-push; never rewrite another account's commits.
- **Before stopping / when the chat feels long / at end of set:** update the Relay block (account, branch, last done, next step, open decisions) and push. Merge to main only when tests pass and the user agreed.
- **Finding the artifacts:** they are shared from the other account, so `Artifact list` (any scope) does NOT show them. Always open them by URL from the "Links" section of claude/handoff.md (`Artifact read` with that url) — never conclude "no access" from an empty list.
- **Published artifacts** (game / balance room / check) are owned by the original account. The other account may update them only if they were shared with edit access ("writer" in an Artifact read); otherwise do not publish — note "publish pending" in the Relay block for the owner account.
- **Publish workflow (decision 30 Oct, updated set 59):** after merging to main, first try to publish from the current chat: `Artifact read` the Links URL — if the header says "writer", publish with the Artifact tool (`file_path` = built src/*.html, `url` = Links URL), then update the Relay block (version + time) on main. Only if the read says "not found"/not writer: tell the user to paste in the old chat opened FROM the Balance Room page: `git fetch แล้วรัน cd src && node tools/bootstrap.mjs gate ต้องได้ GATE: PASS ถ้าไม่ผ่านห้าม publish แล้ว publish <artifact> จาก main (<set>) จากนั้นแก้ Relay ใน claude/handoff.md ว่า publish เสร็จแล้ว (เลขเวอร์ชัน + เวลา + GATE PASS) แล้ว commit + push เข้า main (แก้แค่ handoff.md) ไม่ต้องทำอย่างอื่น ตอบสั้นเป็นภาษาไทย`, and note "publish pending" in the Relay block until that chat clears it; the next chat trusts the Relay block and does not ask the user whether publish was done. Do not create a new copy of an artifact (link changes, Balance Room data is lost).
- Balance Room data (ArtifactData) lives in the artifact, not git: same ownership rule.

## Token saving
- 1 task set = decide → edit → test → publish once. End of set (or long chat) → update claude/handoff.md (≤ 1 screen; older content → claude/archive/) + say "ควรเปิดแชทใหม่ได้แล้ว" + list what the user must do first, recommended model (Sonnet routine / Opus deep design or hard bugs / Haiku trivial) with a 1-line reason, and a message to paste.
- Tiny fix but heavy search → log in handoff "งานรอรวม". Do pending items when 3 are queued / the same file is already open / user says so. Warn if pending > 2 task sets.
- Read only what's needed, never re-read, never read whole built HTML. Test output: failures only. Subagents only with the user's approval.
- **Proactive token alert (any time):** when the current work starts using many tokens (large files/outputs, repeated searches, long debugging, growing chat) and Claude sees a cheaper way (narrower read/grep, splitting the task, smaller model, new chat, batching, skipping a step), tell the user immediately in 1–2 Thai lines: what is costly + the cheaper option + trade-off. Don't wait for the end of the set; keep working unless the switch needs the user's decision.

## New chat
Read claude/handoff.md (index + pending) → open only needed files/sections → check the Balance Room only when the user says they saved → propose the next task set + pending items that can ride along.
