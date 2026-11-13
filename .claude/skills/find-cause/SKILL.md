---
name: find-cause
description: Cause before any fix (เทสต์ไม่ผ่าน / บั๊ก / พัง / error / gate FAIL / CI แดง / หน้าเพี้ยน): reproduce with the smallest command, narrow down, state the cause with evidence, then fix and re-run the same command. Use whenever a test, setup, gate, CI, ui_smoke or page fails, or the owner reports a bug.
---
# Find the cause (set 163 B1 — borrowed from Superpowers systematic-debugging)

> Rules: CLAUDE.md HARD RULE 5 — they win if anything differs (description trimmed set 219 A1).

1. **Reproduce:** run the smallest command that shows the failure (`cd src && node tools/bootstrap.mjs test <word in test name>`, or that one ui_smoke check). Read failures only. Cannot reproduce → do not fix, tell the user in Thai.
2. **Narrow down:** what changed since it last passed (`git log`, `git diff <last green commit>`)? Read the FIRST failing line/assert, not the last one. Open only the files that line points to.
3. **State the cause with evidence:** one sentence + the file:line or output that proves it. Only then edit. No cause yet → no edit (HARD RULE 5).
3b. **Same bug elsewhere (set 186 A1):** grep the faulty pattern/term across src + docs + tests (claude/workflow/ripple.md) — fix every copy in the same commit, `ripple:` line in the message.
4. **Check the fix:** the step-1 command now passes, then setup / gate as usual (merge-code). Two failed fixes in a row → stop, go back to step 3, tell the user what is known and unknown.
5. Report in the 3-line header: ① the cause + fix · ③ anything still unproven.
