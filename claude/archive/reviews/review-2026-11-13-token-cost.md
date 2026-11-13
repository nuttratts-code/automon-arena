# Token cost review — where tokens go vs what comes out (13 Nov 2026, set 220)

Status = DECIDED 13 Nov 2026 (set 220): A deleted (owner order) · B leave ("rare") · C leave ("pointers were tried before and got skipped") · D1 applied · E1 applied.
Claude cannot see real token counts or old chats. Sizes below are file bytes (≈ 1 token per 3–4 English bytes; Thai costs about 2–3× more per byte) and counts from git — estimates, ranked by "cost vs result".

| # | Where | Size / count | What came out | Verdict |
| --- | --- | --- | --- | --- |
| A | brainstorm skill: 4–5 subagents, each starts cold (re-reads CLAUDE.md + sources), then a debate round + moderator | 12 commits, 37 KB of review files | 6 brainstorms; most ended in "parked" or one small pick | worst ratio → **deleted (owner, set 220)** |
| B | Look/sample loops (ui-preview + art look): set 217 = R1–R20 + P0–P1t over 4+ chats, 51 screenshots (~0.5 MB each) read as images, Godot run per round, notes/patch files per round | ~25 rounds, camera tried at 8°/12°/14°/22°/26° | still a sample, nothing on main; owner then said every piece is placeholder | high cost, low landed output |
| C | Fixed load every chat: CLAUDE.md 18 KB (every turn) + Relay hook ~4 KB + skill descriptions 7.5 KB | ~30 KB before any work | needed, but CLAUDE.md repeats rules that skills already hold | medium, every chat |
| D | claude/instructions.md (17 KB Thai) rewritten after every CLAUDE.md change | 6 versions in one week (V5.6 → V6.1) | a copy the owner reads rarely | medium, avoidable |
| E | Big skill bodies loaded on use: art-look 16 KB · asset-3d 11 KB · ui-work 9 KB · weekly-review 9 KB | per use | art-look's §7 sources and §8b lessons are reference, not steps | medium |
| F | Close-out + chat-start overhead per chat (Relay read, 🔒 push, worktree, handoff update, paste-message) | ~4–6 tool rounds each side | needed for the two-account relay | low–medium; grows when a set is split into many chats |
| — | Thai rule docs 57–88 KB | grep-only rule already holds | — | OK |
| — | Gate / tests | background runs, failures-only output | — | OK |

## B. Look/sample loops
- B1 (rec): one round = one contact sheet with 3–4 variants side by side (one image, small size, deviceScaleFactor 1 for Claude's own check) instead of one variant per round; owner picks; full-size shot only for the picked one. Rounds where only numbers change (camera, fog, size) are batched.
- B2: cap a sample set at 8 rounds, then ทำจริง or stop.
- B3: leave.

## C. CLAUDE.md fixed load
- C1 (rec): move long rule bodies that a skill already runs (HARD RULE 1 close-out detail, 3 gate detail, 6 import detail, 9 security list, Git workflow detail) to one-line pointers; target ≤ 10 KB. Rules keep their numbers; the full text lives in the skill/topic file (already the source of truth there).
- C2: leave.

## D. instructions.md rewrite
- D1 (rec): regenerate only once per weekly review (or when the owner asks), not after every CLAUDE.md change; handoff Doc versions shows "instructions behind CLAUDE.md since set N".
- D2: keep regenerating every time.

## E. Big skill bodies
- E1 (rec): split reference parts out (art-look §7 sources + §8b lessons → claude/art-style.md appendix; asset-3d tool notes → its own reference file) so the skill body is only steps (≤ 6 KB each).
- E2: leave.
