# Weekly review — 20–27 Nov 2026 (set 304) · DECIDED 27 Nov: A1 · B1 · C1 · D1 · E1 · F1 · G1 · X1 (dates 4 / 14 / 21 Dec) — applied set 304

Rounds 1–3 in one file. Numbers = estimates from `git log` on origin/main (commit subjects / bytes, not real time or tokens). Claude cannot read old chats: "not shown" ≠ "did not happen".

## Part 0 — progress + 3 numbers

**Plan vs deadline (MVP1.5 = 31 Dec 2026 → 34 days ≈ 5 weeks left).** plan-godot-migration steps 1–7 done. Open: **8** 3D scene with real art (r38 arena port — waiting for owner OK of v47 since 17 Nov, port not started) · **9** itch.io (build ready since set 203; waits for step 8, owner pick set 205) · **10** workflow docs. **Step 8 did not move for the 2nd week in a row.** This week went to: asset hub tools (sets 264–298, 7 gated merges), PixelLab creature stills (~35 new library folders), creature ID renumber (set 285), shop-screen sample loop (sets 268 → 299 → 301–303, rounds r38–r46, notes 165–224, none landed). Last week's T2: Claude warns mid-December if step 8 is not done — at this pace it will not be.

| | 20–27 Nov | 12–19 Nov |
|---|---|---|
| commits on main | 199 | 276 |
| rework (fix/follow-up/undo/redo/revert/again/wrong) | 6 = 3 % | 23 = 8 % |
| landed (touch godot/ src/ tools/) | 14 = 7 % | ~31 = 11 % |
| code merges with GATE: PASS + `ripple:` | 7/7 | — |

Open decisions > 7 days: arena r38/v47 OK + zoom D1 (sets 238/239, 10 days) · hd2d-gaps (13 d) · lumina / meowa ideas (13 d) · rune names + rune text (19 d, owner set 251: "later, at the rune port") · art-workflow plan (after MVP1).

**Did last week's fixes work?** (review-2026-11-19-weekly A–F, r23 G–L, X1)
| Last week | Again this week? |
|---|---|
| A sessions opened at D:\GitHub | not shown (parent CLAUDE.md note works) |
| B owner decisions living only in memory | **yes** — 5 rules only in memory (item A) |
| C code follow-ups to main without the gate | **no** — 0 direct code commits on main ✓ |
| D char-idle description too long | **yes** — 555 chars, + 6 more skills > 400 (item F) |
| E instructions.md stale | by design (regenerated here) — CLAUDE.md changed 3× (item E) |
| G/H/L Relay > 2 sets + DONE lines · handoff > 9 KB · long lines | **yes** — 11.4 KB, 6 sets incl. DONE set 301 (item D) |
| X1 hygiene warnings in the start hook | partly: warnings print every chat, nobody acts on them mid-week; the close-out trim (set 295) worked once |

**One experiment for next week → item X** (deadline calendar).

## Part 1 — what went wrong this week

### A. Owner rules saved only in Claude's memory (repeat of last week's B)
Where: memory folder on this PC (not in the repo). **Correction while applying:** rule 4 was already in CLAUDE.md "Ask before deciding — every order" (set 299, 048244a) → 4 rules, not 5. Five owner rules exist nowhere in the repo, so the 2nd account, a cloud chat or a fresh PC never sees them:
1. no "ทำจริง?" question at the end of a sample round (set 299, "ต้องแก้อีกเยอะ") → belongs in ui-preview step 6/7;
2. show full-colour shots, never the `*-low.png` palette files → ui-preview;
3. small parts (chips/icons/marks) → PIL list sheet, not in-game shots → ui-preview;
4. on every order: list understanding + doubts, ask with buttons before editing → CLAUDE.md "Ask everything up front";
5. Google Flow: one creature at a time, closest ref → char-idle (or drop if Flow is retired).
- **A1 (rec):** one line each into the named skill/doc (memory stays as a pointer). Docs only.
- A2: leave in memory.

### B. Godot `.import` files show up untracked again
`godot/tools/idle_preview/{HL,PL,PT,SF,WN}-1.png.import` are untracked on main checkouts; set 285 had to drop committed ones (11a3b3b). Next careless `git add -A` repeats it.
- **B1 (rec):** add `godot/tools/idle_preview/*.import` to .gitignore → "งานรอรวม" (code-side file, rides with the next code set).
- B2: nothing.

### C. Rule doc edited during an open sample loop, then reversed
ui-patterns DO 39 (Fight button): set 300 "keeps the owner's pale-blue Fight" (26–27 Nov) → set 301 B1 "dark blue, glowing edge, exactly as the picture" (27 Nov) → V2.3. Also the version-line paren fix landed twice (3c73d45, 5548645 — same subject, two chats). The look is still moving (r46), so each rule-doc edit may be undone again.
- **C1 (rec):** while a sample loop is open, look decisions go to the sample's notes.md only; ui-patterns.md / rule docs are edited once, at ทำจริง (same idea as last week's B for art-style.md). One line in ui-preview.
- C2: keep editing the library each round.

## Part 2 — workflow audit + rule compliance

Compliance ✓: 7/7 code merges GATE: PASS + `ripple:` · no direct code commits on main · no new src/core files · no values changed in code · no publish · Doc versions line matches all 5 Thai docs · set numbers unique · every set had a 🔒 line. Not shown: rule-change markers for shop-merge-rules V12.7 bench 6 (ค่าเสนอ, set 302) — code still 5; already in the Relay as "balance-import set for bench 6".
Doc vs code: script check found only false hits (`lab/bossref.json` read as .js; `cut_magenta.py` = scratch tool, documented) → nothing.

### D. handoff / Relay hygiene (repeat G/H/L)
handoff.md 11.4 KB (limit 9 KB). Relay holds 6 sets: 303, 302 (open samples), **301 (DONE)**, 299 (open, line ~1 KB), 239 + 238 (parked arena since 17 Nov).
- **D1 (rec):** now, in this set: set 301 → archive; 238 + 239 → one "Parked: arena r38/v47 waits for owner OK" line; 299 line cut to ≤ 300 chars (detail stays in notes.md).
- D2: wait for the next close-out.

### E. instructions.md (Thai summary) behind CLAUDE.md
CLAUDE.md changed 3× since 19 Nov: ui-patterns row (§9 V1.8) · Ideas row (+ Gemini second opinion, set 293) · close-out trigger 250k tokens (sets 292–295). (The ui-patterns row still says "V1.8"; the library is V2.3 → wording fix too.)
- **E1 (rec):** update only those 3 spots in instructions.md (cheap).
- E2: regenerate the whole 25 KB file.

### F. Skill size (loaded every chat / every use)
**Correction while applying:** the description lengths below were counted in bytes (Thai = 3 bytes); in characters only char-idle was over 400 (407; others 302–334). F1 still applied: all 7 trimmed (now 275–346 chars).
Descriptions > 400 chars (set 219 A1): char-idle 555 · ui-patterns 476 · weekly-review 450 · art-look 424 · ui-preview 422 · asset-3d 404 · measure-balance 402 (all descriptions = 8.4 KB every chat). Bodies > 8 KB (set 220 E1): char-idle 18 KB · weekly-review 16 KB · art-look 15 KB · asset-3d 10 KB · ui-work 9.3 KB · ui-preview 9 KB.
- **F1 (rec):** trim the 7 descriptions to ≤ 400 now (wording only, keep trigger words); move reference text of char-idle + weekly-review into `claude/workflow/<skill>-ref.md` (headings + pointers stay).
- F2: descriptions only.
- F3: leave.

### G. Small hygiene (grouped)
- claude/prompts-set228-form1.md = Gemini painted-route prompts; painted route retired (art-style V2.5) → archive.
- 4 review files have no status line (bosskits, bosstribe, mobile, meowa-template) — reviews.md has their rows, so only add the status line.
- **G1 (rec):** do both. G2: leave.

## Round 2 — skill + doc usage (commit mentions 20–27 Nov)
close-out 46 · ui-patterns 14 · char-idle 10 · ui-preview 4 · ci-check 2 · godot-release 2 · art-look / balance-import / chat-start / daily-brief / find-cause / merge-code / weekly-review 1 · **0:** asset-3d, godot-play (draft since set 209, never run live), measure-balance (dormant), port-parity, publish-pages, rule-change, scratch-cleanup, sim-play (dormant), ui-work. merge-code was really used (7 gated merges) — commits just don't name it. No new overlap found; ChatGPT (set 301) + Gemini (set 293) second opinions both exist: CLAUDE.md names both docs → fine. Outside material: PROVENANCE.csv has 0 UNVERIFIED rows (main + ui-sample-268). PMD reference = numbers only, local, owner exception set 259 A2 → OK. Lost files: no resets on main.

## Round 3 — token cost vs result (estimates)
| Where | Size / count | What came out | Verdict |
|---|---|---|---|
| Fixed load per chat | CLAUDE.md 22.9 KB + Relay hook ~5 KB + skill descriptions 8.4 KB + memory index | every chat | F1 + D1 cut ~3–4 KB |
| Shop-screen sample loop (sets 268, 299, 301–303) | rounds r38–r46 + 4 looks × palettes + GPT mocks · notes 165–224 · ~50 commits · screenshots read as images every round | owner target picture + ui-patterns V2.2–2.3; **0 code on main** | biggest sink; owner-driven and useful, but uncapped → item X |
| Hub tools (sets 264–298) | 7 merges | landed, gated | good |
| PixelLab stills | ~35 new library folders | art in the library | good |
| This chat | ~40k tokens, git greps only | this file | fine (usage skill not run — it sees this chat only) |
Standing owner answer B (set 220) said "look loops are rare → leave". **This week it was not rare** (the premise changed) — so it is raised once, as item X, not as a rule.

## X. Experiment for next week — a dated plan to 31 Dec (recommended)
- **X1 (rec):** the owner sets 3 dates now (example: shop screen ทำจริง by 4 Dec · r38 arena port by 14 Dec · itch.io Draft by 21 Dec). Claude writes them into plan-godot-migration steps 8–9; daily-brief prints "today vs plan" every morning. No "ทำจริง?" prompts in sample rounds (memory rule stays). Next part 0 checks: did the first dated step land on main?
- X2: daily-brief prints only a countdown + step 8 status (no dates).
- X3: nothing; T2 stays (Claude warns mid-December).

## Monthly rule test (§9)
Not this week — first weekly review of December.

## Added after the decision — this chat's token use (owner B1, explain-usage on the transcript)
Effective units (cache read ×0.1 · cache write ×2 · output ×5) for this chat, 56 model calls, ≈ 1.7 M total:
| Group | ≈ units | share |
|---|---|---|
| Fixed instructions re-read every call (system prompt + app tool lists + skill/plugin list + CLAUDE.md + memory ≈ 98k tokens before any work) | 630k | 36 % |
| Re-reading the growing chat (thinking carried along, cache rewrites — cannot be split further) | 530k | 31 % |
| Claude's own writing (thinking, replies, edit scripts) | 300k | 17 % |
| Shell commands + results (git log / grep) | 145k | 8 % |
| File reads / writes (char-idle 18 KB read, review file, scripts) | 60k | 4 % |
| Skills loaded (chat-start, weekly-review) | 45k | 3 % |
| Questions, task list, wrap-up | 20k | 1 % |
Findings: ① the fixed load (~98k tokens, CLAUDE.md is only ~7k of it) is paid again on every model call → the number of calls is the main lever: 56 calls × ~10k = ~550k. Many small greps = many calls. ② The chat was already ~194k at the owner's 2nd message, so a weekly review cannot fit rounds 1–3 + apply + more in one chat.
### Y. (new, for the next chat) cut the per-call fixed load
- Y1: check which connectors/plugins load every chat (Figma, Blender, Pixelwright, Playwright, Godot MCP, Chrome, computer-use, docs, firecrawl/design plugins) and turn off the ones a normal Automon chat never uses (owner turns them on when needed) + Claude batches checks into fewer, bigger commands.
- Y2: only the batching habit (no connector change).
- Y3: nothing.

### Y result (set 306, 27 Nov)
- Measured: first call of 6 recent chats = 96–98k tokens fixed (≈46k shared system part + ≈50k project part); this chat 96.3k.
- Use in 126 transcripts / 14 days: Chrome 3 chats · frontend-design 5 · design plugin 2 (ui-work 4f critique) · Figma 1 · computer-use 1 · Playwright plugin 1 call · Godot MCP 1 call · Pixelwright, Blender, Claude Docs, firecrawl, scheduled-tasks 0.
- Estimate: unused connectors/plugins ≈ 10k of the 96k (tool names + server instructions + skill list) → ~3–5 % per chat; cutting calls 56 → ~40 saves ~15–20 % (each call re-reads fixed load + chat).
- Owner Y1 + Z1: CLAUDE.md Token saving "Fewer model calls" bullet (instructions V6.6); owner turns off Pixelwright, Blender extension, Claude Docs, firecrawl, Playwright plugin (account/app level — Claude cannot toggle them); design plugin kept because ui-work 4f uses it (Claude's list had it by mistake); local `.mcp.json` GODOT_MCP_PROJECT_PATH pointed at the old OneDrive folder → D:/GitHub/automon-arena/godot.
- Check next weekly review: first-call fixed load (target < 90k) and calls per chat.
