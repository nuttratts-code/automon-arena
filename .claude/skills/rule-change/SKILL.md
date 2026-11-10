---
name: rule-change
description: Automon Arena change of a game rule, design or doc decision (เปลี่ยนกฎ / แก้กฎ / ดีไซน์ / ไอเดียใหม่ / ระบบใหม่) — conflict check against the docs, 2–3 options + a recommended one with A1/A2 buttons, then after confirmation edit only that section of the Thai rule doc, bump its version, handle the (ค่าเสนอ) label and the handoff Doc versions line. Use when the user proposes or asks about changing how the game works. Game NUMBERS go through balance-import (HARD RULE 6). Rules live in CLAUDE.md "Decisions"/"Docs" + claude/workflow/replies.md and win if anything differs.
---
# Rule / design change (set 158 — skill from CLAUDE.md Decisions + Docs)

1. **Find the spot:** grep the rule id or heading (`grep -n '^##.* C-6' claude/combat-rules.md`) and read only that section. C- combat-rules · T- tribe-rules · S- shop-merge-rules · build-plan. Also check code that implements it (src/core) when the change affects behaviour.
2. **Conflict check (set 118):** the request contradicts or changes something already decided (doc + rule id + set, handoff "Closed by user, do not re-propose") → STOP, tell the user in Thai: what exists now, what would change, every side effect. Wait.
3. **Scope / balance:** beyond MVP1 → say so, don't propose systems beyond it. Unbalanced idea or loophole → warn directly first.
4. **Options:** 2–3 options + a recommended one. Numbers in skills/rules: always ask, never decide. Format (replies.md): explain A/B… with A1/A2… in text first, then AskUserQuestion (label-only buttons, max 4 questions × 2–4 options per call; recommended first + "(Recommended)").
5. **After confirmation — docs first:** edit only that section with Edit (Thai docs stay Thai, never retype the file, new sections at the end, never renumber ids). Values without a measured/confirmed source get "(ค่าเสนอ)"; remove it when: character stat confirmed · measurable rule chosen + measured · unmeasurable rule chosen.
5b. **Ripple check (set 186 A1):** grep the rule id, its key Thai words and any number/name it changes across src + claude docs + tests + pages (claude/workflow/ripple.md map row). Code that disagrees with the new rule → list it for the user (code goes through a branch); other docs/pages that repeat it → fix in the same commit, `ripple:` line in the message.
6. **Version bump:** that doc's header line `Vx.y · อัปเดต: <date> (ชุด N <short what>)` — small +0.1 · core rule +1.0. Update the handoff "Doc versions" line to match.
7. **Commit:** doc-only → straight to main (docs-only). If code must follow, the code goes on the branch and reaches main through `merge-code`.
8. **Tell the user (Thai, 3-line header):** short summary of what changed, the new version, and what is still open.
