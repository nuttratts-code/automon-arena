# weekly-review — reference (moved from SKILL.md, set 304 F1)

Read only when the step is used. Section numbers match SKILL.md.

## 9. Monthly rule test in a fresh chat (set 250 R2, owner; "the best test of a CLAUDE.md is whether behaviour changes")
Once a month (first weekly review of the month), after the rounds:
1. Pick 3 rules changed in the last month (from this month's review files).
2. For each, write one short task prompt that should trigger it (e.g. "แก้ค่าพลัง PL-3" → HARD RULE 6 cfgdiff first; a code fix → merge-code gate; an art pick → ask before art-style.md).
3. The owner opens a NEW chat in D:\GitHub\automon-arena, pastes the prompt, and stops it after Claude's first reply (no edits needed) — or Claude runs it as a subagent only if the owner OKs that (subagent rule).
4. Pass = the first reply names / starts the rule's step. Fail → the rule's trigger is unclear → report item next week (move it into the skill description or a hook).
Cost: ~3 short chats a month; skip the month if no rule changed.
