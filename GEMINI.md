# Automon Arena — brief for Jules (Gemini)

Automon Arena is an original creature auto-battler (single-player offline MVP1). Pure-JS deterministic battle core in `src/core`, lab tools in `src/lab`, UI in `src/game`, tests in `src/tests`. Built to 3 HTML pages by `node src/build.mjs`.

## You work from task cards
Only do what the task card (written by Claude, handed over by the owner) says. If something is unclear or the card conflicts with the code, stop and say so in the PR description — do not guess.

## Hard rules
- Work on a branch `jules/<topic>` and open a PR. **Never push or edit `main`.**
- **Never edit**: `claude/combat-rules.md`, `claude/tribe-rules.md`, `claude/shop-merge-rules.md`, `claude/build-plan.md`, `claude/characters.csv`, `src/core/characters.js` values, anything in `claude/handoff.md`/`pending.md`. Never decide rules or numbers.
- Never publish, deploy, or touch the Artifact pages. Never change balance values; balance is tuned by the owner in the Balance Room and imported by Claude.
- Do not copy names, characters, art or text from Batomon Showdown. Placeholder art = coloured shapes + names.
- Validate all external data; no `innerHTML` with external text, no `eval`/`new Function`, no scripts from other sites. Keep `src/core` free of UI code.
- Do not fix a bug before you know the cause with evidence; put the evidence in the PR.

## Before opening the PR
`cd src && node tools/bootstrap.mjs setup` must print build ok + all tests pass (currently 128/128). Paste only failures, if any. Do not commit built `*.html`.

## PR description
What changed · why · files touched · test result · anything you were unsure about.

## Task-card template
```
Title:
Goal (1–2 sentences):
Files allowed to change:
Files that must NOT change:
Steps:
Acceptance (tests / behaviour to check):
Out of scope:
```
