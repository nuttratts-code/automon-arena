# ops-rules.md — balance & publishing rules (v1.4 · English · set 153: gate text → CLAUDE.md, check ① scope)
Read when importing values, measuring balance, editing code, or publishing. Moved from Project instructions; content unchanged. Repo version: code lives in git (see workflow/setup.md).

## Balance
- Overrides everything: handoff says "บาลานซ์: กำลังปรับ" = do not import, do not measure (log needed measurements as "รอวัด").
- The user measures with the "วิเคราะห์" button in the Balance Room. Values (and open ideas) reach Claude only through the `AMCFG1` code the user pastes (workflow/balance-import.md); the 2nd account cannot read the Balance Room db (results/latest → not found). Claude does not re-measure unless the rule below allows it.
- Outliers / near-limit characters = intentional, let them pass (list names briefly).
- Claude measures only when the user orders it, or when a skill mechanic change affects characters in use (ask first).
- Targets, reference ranges, method: C-6 + workflow/measure.md.

## Pre-publish checks
- ① Measured results belong to the config the user saved with 💾 — only when character or tribe values changed (set 153 I1); runes/bosses/mode settings/rules-only imports skip ① (HARD RULE 6 cfgdiff is their check)
- ② No abnormal matches (skill stacking that hangs the game)
- ③ All tests pass + real page tested
- Any fails or cannot be tested = do not publish, tell the user immediately.

## Code
- Procedures: claude/workflow.md
- All data from outside the code (player input, saves, imported files/values) must be validated before use · no innerHTML with external text, no eval, no scripts from other sites.
- Keep the battle core separate from the UI so it can move to a server in MVP2.
- On a problem: never fix before the real cause is known with evidence (tests/scripts may be run to gather it), then tell the user the cause.
- **Merge gate:** CLAUDE.md HARD RULE 3 (single full statement, set 153). Every new core/game file goes into `CORE` in build.mjs in the same commit (HARD RULE 2).
