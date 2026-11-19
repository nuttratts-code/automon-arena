# Weekly review — 12–19 Nov 2026 (set 249) · WAITING FOR OWNER

Sources: `git log` origin/main since 12 Nov, handoff Relay, Claude memory files (Claude cannot read old chats; "not shown" ≠ proven). Sets this week: 230–240, 248 (+ 241–247 art work in automon-scratch, no Relay trace).

## Part 1 — what went wrong

### A. Sessions opened at D:\GitHub (18 Nov) skipped the whole rulebook
- Evidence: from 18 Nov sessions started in the parent folder → CLAUDE.md, SessionStart hook, chat-start and close-out did not load. Results: no 🔒 lock line for set 248 (no lock commit after 795a4bd), no close-out for the 18 Nov chats (one chat ran 36+ owner messages vs ~15), 7 memories saved to the wrong project memory (moved 19 Nov), reply drifted to English 4× (owner flagged "พิมพ์อิ้ง").
- Fixed 19 Nov: owner reopened in automon-arena; memories merged; outer .claude/launch.json deleted. Owner earlier declined a turn-counter hook.
- Gap left: nothing stops it happening again except memory (which only loads inside automon-arena — so it never sees the bad case).
- **A1 (rec):** add a 3-line `D:\GitHub\CLAUDE.md` (local file, not in any repo): "Automon work → stop, tell the owner in Thai to reopen the session in D:\GitHub\automon-arena." It loads automatically at D:\GitHub, costs ~60 tokens. **A2:** nothing more (rely on the owner).

### B. Art decisions of 18 Nov lived only in memory + scratch (sets 241–247)
- Evidence: art direction changed 3× in 4 days (V2.0 painted 15 Nov → "drop pixel / Scenario" 18 Nov 04:14 → PixelLab pixel 18 Nov 10:34); none reached claude/art-style.md until 19 Nov (V2.5, 0bb1a30). Set numbers 241–247 are used in scratch folder names (s241_codedraw, s242, s245_scenario, s246) but have no Relay line; the set 248 line says "sets 246–248".
- Owner corrections behind it: owner sprites downscaled unasked · batch gens "don't help" · crab shape wrong without a ref — all now in V2.5.
- **B1 (rec):** add one line to skill `char-idle` + `art-look` step 1: "an art-direction change the owner picks = rule-change → art-style.md version bump in the SAME chat (not memory only)". **B2:** leave (V2.5 covers today's state).
- **B3 (also):** write a short archive note `claude/archive/relay/relay-2026-11-19-sets241-247.md` listing what sets 241–245 tried (pixelize, code-draw, FF shader, Scenario) and why each was dropped, from the memory notes — so no chat retries them. Rec: yes.

### C. Set 240 follow-ups went to main without the gate
- Evidence: 8 commits on main after the set 240 merge (af4da6c … f6eaa1a) changed tools/asset-hub code and `godot/data/unit_shadows.json` (read by stage3d.gd); no commit names GATE: PASS; 38089a8 and f3ced2d have no `ripple:` line. HARD RULE 3 = gate before merging to main. CI result for them: not shown.
- Why missed: "small follow-up" felt like part of an already-gated set; asset hub is a local tool.
- **C1 (rec):** clarify HARD RULE 3: "after a merge, further code changes go on the branch again (or a new one) — every push to main that changes code needs its own GATE: PASS; local-only tool code under tools/ may use `setup` only (unit tests) if no file under src/ or godot/ changes". Then run ci-check once for f6eaa1a. **C2:** keep the rule as is, just run the gate before the set 248 merge (it covers these files too).

## Part 2 — workflow audit

### D. char-idle description too long (loaded every chat)
- `.claude/skills/char-idle/SKILL.md` description = 1,266 chars (limit 400, set 219 A1); 19 Nov V2.5 note made it longer. Others slightly over: art-look 425, ui-patterns 477, weekly-review 451, ui-preview 423, asset-3d 405.
- **D1 (rec):** cut char-idle to ≤ 400 (keep: when to use, PixelLab note, route names; move the trigger word list into the body). Others: leave (≤ 20 % over). **D2:** trim all to ≤ 400.

### E. instructions.md (Thai summary) is stale
- CLAUDE.md changed this week (b3cec6d asset-hub row, 0bb1a30 char-idle row); instructions.md V6.2 = 13 Nov. Set 220 D1: regenerate here.
- **E1 (rec):** regenerate at the end of this review (V6.3).

### F. Small hygiene (grouped)
- reviews.md has no row for review-2026-11-14-lumina.md and review-2026-11-14-meowa-template.md.
- weekly-review §3.5 doc-vs-code grep gives 2 false MISSING (`lab/bossref.js` matched inside `bossref.json`; `tools/web_check.py` lives in godot/tools) → widen the check to also try `godot/$f` and use `\.(mjs|js|py)\b`.
- Relay "Set 248" says last 714749c; branch is at 6c95898 (owner uploads committed 19 Nov).
- **F1 (rec):** fix all three. **F2:** skip.

## Rule compliance (3b) — summary
| Set | Lock 🔒 | Gate | Close-out | Notes |
|---|---|---|---|---|
| 236, 237, 238 | ✓ | samples/docs (no gate needed) | ✓ | |
| 239 | ✓ (83e71fc) | sample | docs only | |
| 240 | ✓ (795a4bd) | ✓ GATE PASS b3cec6d | ✓ (aa4be41) | follow-ups → item C |
| 241–247 | not shown | — | not shown | outside project folder → item A/B |
| 248 | ✗ | not merged yet | ✗ | outside project folder → item A |
No game values changed, no publish, no measurement this week. UI sets (asset hub) — `UI: design skill ✓ · shots ✓` marker not in the set 240/248 Relay lines (local tool page; not shown).
