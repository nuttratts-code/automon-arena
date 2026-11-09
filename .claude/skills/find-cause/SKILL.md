---
name: find-cause
description: Automon Arena cause-finding before any fix (เทสต์ไม่ผ่าน / บั๊ก / พัง / error / gate FAIL / CI แดง / หน้าเว็บเพี้ยน) — reproduce with the smallest command, narrow down what changed, state the cause with evidence, then fix and re-run the same command. Use whenever a unit test, setup, the gate, a CI run, ui_smoke or a published page fails, or the user reports a bug. HARD RULE 5 is the rule and wins if anything differs.
---
# Find the cause (set 163 B1 — borrowed from Superpowers systematic-debugging)

1. **Reproduce:** run the smallest command that shows the failure (`cd src && node tools/bootstrap.mjs test <word in test name>`, or that one ui_smoke check). Read failures only. Cannot reproduce → do not fix, tell the user in Thai.
2. **Narrow down:** what changed since it last passed (`git log`, `git diff <last green commit>`)? Read the FIRST failing line/assert, not the last one. Open only the files that line points to.
3. **State the cause with evidence:** one sentence + the file:line or output that proves it. Only then edit. No cause yet → no edit (HARD RULE 5).
4. **Check the fix:** the step-1 command now passes, then setup / gate as usual (merge-code). Two failed fixes in a row → stop, go back to step 3, tell the user what is known and unknown.
5. Report in the 3-line header: ① the cause + fix · ③ anything still unproven.
