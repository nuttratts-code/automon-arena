# 2-week review — 25 Oct to 8 Nov 2026 (rule D1, set 150; widened from 1 week at the user's request)

Sources read: `git log origin/main` (102 commits — the repo history starts 8 Nov, so everything older is visible only through the archives) · claude/handoff.md · archive/relay/relay-2026-11-08-sets117-137.md (sets 117–149, read in full) · archive/relay/relay-2026-11-07-sets66-116.md (sets 66–116, grep) · archive/relay/relay-2026-10-31.md + relay-sets-54-61.md (sets 54–70, read in full) · relay-2026-11-04*/11-05/11-06 (grep) · archive/handoff-log.md (25–26 Oct) · archive/GEMINI-jules-cancelled.md. Claude cannot read old chats, so items come only from what the Relay recorded. Week 1 = 25 Oct–1 Nov (sets ~32–70) · week 2 = 1–8 Nov (sets ~70–150).
First round of answers (W1–W4, 8 Nov): all "no preference" → asked again together with the new items.

Status: **proposals only — nothing edited yet.** Each change waits for the user's A/B pick.

## Thai summary for the user (1 line per item)
| # | เกิดอะไร | เสนอแก้ที่ | แนะนำ |
|---|---|---|---|
| W1 | gate ขึ้น FAIL ทั้งที่เทสต์ผ่านครบ (หาบรรทัดสรุปไม่เจอ) 2 ครั้ง + ui_smoke สะดุดสุ่ม 4 ครั้ง → ต้องรัน gate ซ้ำ ~4 นาทีต่อครั้ง | publish.md (+ โค้ดเล็ก ๆ ถ้าเลือก A2) | A2 |
| W2 | เปิดหลายแชทพร้อมกัน (ชุด 143–148) → เลขชุดชน, cfgdiff rev38 ต้องทำใหม่, ต้อง merge main เข้า branch หลายรอบ | relay.md | A1 |
| W3 | rebase branch ที่ push แล้ว → commit ซ้ำ 2 ชุดใน main (ชุด 139) | relay.md | A1 |
| W4 | ปุ่มคืนค่าใน Balance Room ทำ 2 รอบ (ชุด 146 → 146 r2) เพราะไม่ได้ถามก่อนว่า "คืนเป็นค่าอะไร" | ui.md | A1 |
| W5 | เครื่องมือวัด (รันจริงใน Balance Room, bossrun) ใช้ขั้นตอนเกมเก่า → ตัวเลขผิด ต้องทำใหม่ (ชุด 138, 140) | measure.md | A1 |
| W6 | gate ครั้งแรกล้มเพราะ ui_smoke ใช้รหัส/ชื่อรูนตายตัว หลังนำเข้าค่าใหม่ (ชุด 131, 146) | balance-import.md | A1 |
| W7 | บรรทัด Publish ใน handoff ยาวสะสมประวัติ (เปลือง token ทุกแชท) | close-out skill | A1 |
| W9 | ตั้งแต่ 31 ต.ค. ตกลงพักงาน Balance Room ไปทำเศรษฐกิจ 5.5 (เป้า ~14 พ.ย.) แต่สัปดาห์นี้งานส่วนใหญ่เป็นข้อความ/รูน/บอส · 5.5 ยังค้าง PL-2 PT-3 SF-7 · เหลือ 6 วัน | close-out skill (นับถอยหลัง MVP1) | A1 |
| W10 | บั๊กที่ผู้ใช้เจอเองระหว่างเล่น ≥ 7 ครั้ง (ชุด 98 99 101 111 117 143 145) | ops-rules / publish.md | A1 |
| W8 | ชื่อ C3 พุงชน/พุ่งชน วนอยู่ 3 ชุด (147–149) | ไม่แก้ (ครั้งเดียว) | A2 |

## Items

### W1 — gate false FAIL + flaky ui_smoke (repeat waste)
- Evidence (both weeks, 7 incidents): set 55 (30 Oct) flaky 'battle perm skill' · 31 Oct perm test random seed (~1.3 % fails, fixed) · set 133 "first gate run failed with no summary line printed = ui_smoke flake, cause not found, rerun PASS" · set 149 "1st gate run printed FAIL with 324/324 + summary line not found, re-run PASS" · flaky clicks set 95, set 124 (#dlg, fixed), set 139 (T8 flag, fixed set 143).
- Cost: each rerun ≈ 4 min + chat tokens; cause of the missing summary line still unknown (HARD RULE 5: don't patch blind).
- Proposal:
  - **A1 (rule only)** — add to claude/workflow/publish.md: "Gate FAIL where every count passes (n/n) but the ui_smoke summary line is missing → re-run the gate ONCE (tests are skipped automatically). Second FAIL → stop and tell the user. Log every such rerun in the Relay line as `false-FAIL rerun`."
  - **A2 (recommended: rule + find the cause)** — A1, plus a ~3-line change in src/tools/bootstrap.mjs gate mode: when the summary line is missing, save the full ui_smoke output to `src/shots/ui_smoke-last.txt` so the next occurrence gives the cause. Then fix the cause in its own set.
  - A3 — nothing.

### W2 — parallel chats collide
- Evidence: set 148 "this chat started as 'set 143' from set 142b, sets 144–147 ran in parallel" · set 145 cfgdiff rev38 → "redo cfgdiff on current main before importing" · set 147 commit "rename R3 work to set 147" · set 142 "merge main into [141 WIP] before its gate" · set 148 user said "use the latest Balance Room" before the overlap was known.
- Proposal — add to claude/workflow/relay.md:
  - **A1 (recommended)** — "Start of chat: push one line to the top of the Relay block on main: `🔒 set N · <topic> · files/areas: …` (take N = highest set number on main + 1). A chat that sees a 🔒 line touching the same files/areas (or game values / Balance Room db) stops and asks the user before starting. Close-out removes the line. cfgdiff/import always runs against `origin/main` fetched at that moment."
  - A2 — nothing (user avoids running chats in parallel).

### W3 — rebasing a pushed branch duplicated commits
- Evidence: set 139 round 2 commits appear twice in main (1b375c3 / e5f0125, 885127d / cbf9bea) + "Merge pre-rebase branch history". Same message twice also in 8ad8efc / 7bc6619 (set 136).
- Proposal — **A1 (recommended)** add to claude/workflow/relay.md: "Never rebase a branch that is already pushed. Push rejected → `git fetch` + `git merge origin/<branch>` (or origin/main), then push." · A2 — nothing.

### W4 — destructive button built twice
- Evidence: set 146 reset button → per tab, back to game values; r2 the same day because "user pressed reset expecting their saved names". Also user lost rune names in the browser (db rescued as rev 39).
- Proposal — **A1 (recommended)** add to claude/workflow/ui.md: "Any reset / delete / overwrite button: ask up front (A1 rule) what it returns to (game values · last saved · defaults) and what it covers (tab · whole page); it must show a confirm dialog naming what will be lost." · A2 — nothing.

### W5 — measuring tools drift from the real game flow
- Evidence: set 138 "Balance Room รันจริง was stale (pickBotTeam, no runes, no extra matches)" · set 140 "bossrun collects teams with old no-rune flow" (fixed set 141) → boss numbers re-done.
- Proposal — **A1 (recommended)** add to claude/workflow/measure.md: "Every tool that plays runs (runerun, bossrun, econ55, charstat, Balance Room รันจริง) takes its runs from `lab/analyze.js runPlayStats`. Any set that changes the run flow (foe pick, runes, extra matches, shop) lists in its Relay line which of these tools it re-checked." · A2 — nothing.

### W6 — ui_smoke hard-codes ids that imports change
- Evidence: set 131 "first gate failed: ui_smoke used C2 as the team-rune example → switched to C7" · set 146 commit "ui_smoke C3 name".
- Proposal — **A1 (recommended)** add to claude/workflow/balance-import.md: "After an import that renames or changes runes/characters, `grep -n` the changed ids/names in src/tests/ui_smoke.py and fix them BEFORE `setup`/`gate`." · A2 — nothing (gate catches it anyway, one extra gate run).

### W7 — handoff Publish line keeps history
- Evidence: handoff "Publish (current)" still lists 5 older publishes; the archived Relay shows how that line grew to ~60 entries.
- Proposal — **A1 (recommended)** add to .claude/skills/close-out/SKILL.md: "Publish line = current versions + the commit they came from only; older entries go to the archive." · A2 — nothing.

### W8 — C3 name typo carried across sets 147–149
- One-off (user todo: Balance Room C3 → พุ่งชน + 💾). Option A1: cfgdiff flags name cells that differ only by Thai tone marks. **A2 (recommended): nothing** — rare, small, and HARD RULE 6 already shows the cell.

### W9 — MVP1 schedule drifting (warn rule has no trigger)
- Evidence: 31 Oct user decision "(b) pause Balance Room/rune tooling work; next focus = MVP1 step 5.5 economy (28 Nov at risk)". build-plan: 5.5 target ~14 Nov (ค่าเสนอ), 6 polish/mobile 28 Nov. Sets 138–149 (8 Nov) were mostly Balance Room tabs, skill/rune text, rune names, bosses; 5.5 open decisions PL-2 +31 · PT-3 +22 · SF-7 weak (review-2026-11-08-econ55.md) unanswered. CLAUDE.md already says "if behind build-plan → warn + suggest cuts", but nothing makes Claude check.
- Proposal — **A1 (recommended)** add to .claude/skills/close-out/SKILL.md: "Thai block gets 1 line: MVP1 countdown = days to the next build-plan target + step status (on time / behind → suggest cuts)." · A2 — nothing.

### W10 — bugs found by the user while playing
- Evidence: set 98 next-round button pressable again and again · set 99 enemy with 3 units · set 101 bot teams placed wrong · set 111 rune on a board slot carried to any unit · set 117 player name lost on app kill · set 143 WN-4 sameTribe dropped from text · set 145 rune texts not matching the engine (→ set 144 runecheck, good).
- Proposal — **A1 (recommended)** add to claude/workflow/publish.md (bug section): "Every bug the user reports gets a test that fails before the fix and passes after, in the same commit; the Relay line names the test." (Not checked whether each of the 7 sets already did this.) · A2 — nothing.

## Already fixed during the 2 weeks (no change needed)
- Week 1: set 62 new core file missing from build CORE → broken balance room v127 published (31 Oct) → HARD RULE 2 + the gate (HARD RULE 3) + core/CORE test; no repeat since.
- Week 1: import of config v156 (25 Oct) measured, then the user reverted and edited themselves; set 79 pre-import check DIFFERS → now HARD RULE 6 (cfgdiff before tuning, 7 Nov).
- Week 1: Jules (Gemini) brief written, cancelled by the user 28 Oct — one-off; covered by the set 150 "prefer instructions, keep new tools small" habit.
- Week 1: 2nd account could not see owner artifacts (31 Oct) → publish ownership + paste-message rules in workflow/relay.md.
- Claude skipped choice buttons after the CLAUDE.md split → buttons back in core (set 139).
- Flaky T8 tribe picker in ui_smoke → cause found and fixed (set 143).
- Flaky #dlg popup on worn runes → fixed (set 124).
