# Review 2026-11-09 — ideas borrowed from Superpowers (set 163, user picked A1: do not install, borrow ideas)

Superpowers (obra/superpowers) was compared with our 9 skills. Not installed. Reasons: we already have its brainstorming (= rule-change), verification (= merge gate), debugging rule (= HARD RULE 5) and skill-writing check (= close-out). It also clashes with our rules: autonomous subagents for hours (we only use subagents when the user approves), questions asked over several rounds (set 150 A1 says ask everything once), asking merge-or-PR (rule 2 Nov says merge on GATE: PASS), strict test-first coding, auto-triggering skills that compete with ours, English engineer-style plans, and a telemetry logo from an outside site (HARD RULE 7).
Two ideas are worth borrowing. Each one waits for the user's A/B pick. Nothing is edited before approval.

## B. How to find the cause (from systematic-debugging)
HARD RULE 5 says "find the cause first" but does not say how. Draft steps:
1. **Reproduce:** run the smallest command that shows the failure (`node tools/bootstrap.mjs test <word>`, or one ui_smoke check). If it cannot be reproduced, do not fix. Tell the user.
2. **Narrow down:** what changed since it last passed (`git diff <last green>`, `git log`)? Look at the first failing line, not the last one.
3. **State the cause with evidence:** one sentence plus the file:line or output that proves it. Only then edit.
4. **Check the fix:** the same command from step 1 now passes, then setup or the gate as usual. Two failed fixes in a row → stop, re-check step 3, and tell the user.
- B1 (recommended): a new short skill `find-cause` (~10 lines). It triggers when a test, gate, CI run or page fails, or when the user reports a bug. HARD RULE 5 and merge-code step 3 point to it.
- B2: add the 4 steps directly into the HARD RULE 5 text in CLAUDE.md. This makes CLAUDE.md longer and adds tokens to every chat.
- B3: skip.

## C. A step-by-step plan for big sets (from writing-plans)
Big sets that run over more than one chat lose details in the Relay line. Draft:
- A set that touches > 3 files, or that will clearly need more than one chat → write `claude/plan-setN.md` before editing. It holds numbered steps (file · change · how to check it), each ticked off when done and pushed. The Relay line names the plan file and the next step number. The file moves to claude/archive/ at close-out.
- C1 (recommended): add this to chat-start step 6 and close-out (the Relay "next step" = plan step number).
- C2: skip. The Relay "next step" stays as it is now.
