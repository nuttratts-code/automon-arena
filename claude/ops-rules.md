# ops-rules.md — balance & publishing rules (v1.1 · English)
Read when importing values, measuring balance, editing code, or publishing. Moved from Project instructions; content unchanged. Repo version: code lives in git (see workflow/setup.md).

## Balance
- Overrides everything: handoff says "บาลานซ์: กำลังปรับ" = do not import, do not measure (log needed measurements as "รอวัด").
- The user measures with the "วิเคราะห์" button in the Balance Room · Claude uses results/latest, never re-measures.
- Outliers / near-limit characters = intentional, let them pass (list names briefly).
- Claude measures only when the user orders it, or when a skill mechanic change affects characters in use (ask first).
- Targets, reference ranges, method: C-6 + workflow/measure.md.

## Pre-publish checks
- ① Measured results belong to the config the user saved with 💾
- ② No abnormal matches (skill stacking that hangs the game)
- ③ All tests pass + real page tested
- Any fails or cannot be tested = do not publish, tell the user immediately.

## Code
- Procedures: claude/workflow.md
- All data from outside the code (player input, saves, imported files/values) must be validated before use · no innerHTML with external text, no eval, no scripts from other sites.
- Keep the battle core separate from the UI so it can move to a server in MVP2.
- On a problem: never fix before the real cause is known with evidence (tests/scripts may be run to gather it), then tell the user the cause.
