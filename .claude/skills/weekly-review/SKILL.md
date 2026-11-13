---
name: weekly-review
description: Automon Arena weekly review (รีวิวสัปดาห์ / รีวิวโฟล / ตรวจกฎ / กฎถูกข้ามไหม) (CLAUDE.md "Weekly review", rule D1 set 150 + workflow audit sets 152–153). Use when the user says "รีวิวสัปดาห์" (planned every Friday) or asks to review/audit the workflow, rules or docs for unclear or conflicting points. Finds user corrections and waste of the week, checks whether the week's work actually followed the rules (UI, gate, values, publish, lock, close-out, doc versions), then audits the rule docs against each other and against the code, writes claude/review-YYYY-MM-DD-weekly.md, asks A/B per change, and edits only after approval.
---
# Weekly review (D1 + workflow audit)

Report first, edit only after the user picks. Read with grep / `sed -n`, never whole large files. Reply format, labels and buttons: CLAUDE.md + claude/workflow/replies.md.

## 0. Start
`git fetch origin` → read the handoff Relay → push the 🔒 lock line (relay.md) → work on main for docs (docs-only, relay.md).

## 1. What went wrong this week (D1)
- Sources: `git log --since='7 days ago' --format='%h %ad %s' --date=short origin/main` · claude/handoff.md · this week's entries in claude/archive/relay/ (Claude cannot read old chats).
- List each time the user corrected or redid Claude's work, a gate failed first time, a bug was found by the user, or a rule caused wasted work.
- Per item: where the fix belongs (CLAUDE.md · a topic file · a skill · nothing = one-off) + the exact text to add/remove.
- Token use (set 209 A2): if a usage skill is installed (e.g. `anthropic-skills:explain-usage`; set 218 I1: often not), invoke it once; else name the biggest reads of this chat and put the biggest sink + a cheaper way in the report (it sees this chat only — a hint, not the week's total).

## 2. Workflow audit — scope
- Always: CLAUDE.md, claude/workflow.md, claude/workflow/*.md, claude/ops-rules.md, .claude/skills/*/SKILL.md, claude/handoff.md, claude/instructions.md, claude/reviews.md.
- Deep checks only for the docs changed this week:
  Cloud clones are shallow (set 218 I1: 58 commits) → first `git fetch -q --shallow-since="$(date -d '8 days ago' +%F)" origin main`.
  `B=$(git rev-list -1 --before='7 days ago' origin/main); [ -n "$B" ] || B=$(git rev-list --max-parents=0 origin/main | tail -1); git diff --stat $B origin/main -- CLAUDE.md claude/workflow* claude/ops-rules.md .claude/skills`
  (the fallback is the first commit, for when the history is younger than 7 days). A full deep audit of everything only when the user asks for it.

## 3. Audit checklist (each point found a real problem in sets 152–153)
1. **Same rule in several places** → drift. Grep the key phrases (gate, publish, close-out, 🔒, CI, AMCFG1, merge, measure) across the docs; the full text should live in one place and the others only point to it.
2. **Rule against rule:** a rule whose literal trigger fires on another rule's routine step (e.g. close-out "every merge to main" vs the lock-line push to main at chat start). Check: ask up front vs ~15 turns; merge without asking vs "user OK"; who may publish.
3. **Rule a chat never sees:** a rule written only in a topic file whose "open when" in CLAUDE.md does not cover the moment it applies (e.g. the lock line was only in relay.md).
4. **Rule impossible in some state:** e.g. CI check on a docs-only commit (CI skips claude/**, art/**, *.md — .github/workflows/tests.yml) · check ① with an old results/latest · the 2nd account cannot read the Balance Room db.
5. **Doc vs code:** every script/command named in the docs exists:
   `grep -ohE '(tools|lab|tests)/[a-z0-9_-]+\.(mjs|js|py)' CLAUDE.md claude/workflow.md claude/workflow/*.md claude/ops-rules.md | sort -u | while read f; do [ -e src/$f ] || echo MISSING $f; done`
   · claims like "X uses Y" checked with grep of imports (e.g. which lab tools import runPlayStats) · bootstrap modes and flags (`grep -n "mode ===" src/tools/bootstrap.mjs`) · times and counts in docs (gate, botgen, bot teams) vs code or the last real run.
5b. **Missed ripples (set 186 A1):** this week's fixes that were found AFTER a set closed ("doc said X, game never did", old name in a test, stale version) → which ripple.md map row would have caught it; add/extend that row. Commits on main without a `ripple:` line that changed behaviour/values/names → list them.
6. **Stale text:** tool names that no longer exist (e.g. `get_artifact`) · links to moved sections ("CLAUDE.md 'X'") · paths (archive folders) · numbered handoff items that no longer exist · "Project only" style notes · old decisions overruled by newer ones.
7. **Review hygiene:** every claude/review-*.md has a row in reviews.md · drafts "waiting for the user" are listed in handoff "Open decisions" · decided/applied files are moved to claude/archive/reviews/ · after `git mv`, grep the old name and fix references.
8. **Thai summary:** claude/instructions.md version and content match the current CLAUDE.md (redo it whenever CLAUDE.md changed).
9. **handoff:** Relay = newest 2 sets + open WIP sets (set 211 B1) · no finished lines left in the Relay · Publish line = current only · counts/facts in State still true · set numbers not used twice (a duplicate = parallel chats → tell the user).

## 3b. Rule compliance — were the rules actually followed? (set 158, user request)
The audit above checks the TEXT of the rules; this checks the WORK of the week against them. Sources: this week's Relay entries (handoff + claude/archive/relay/) and `git log`/`git diff` on origin/main — Claude cannot read old chats, so a rule with no trace counts as "not shown" (say so, don't call it proven). Per set of the week:
1. **UI (ui.md / skill ui-work):** `git log --since='7 days ago' --format=%h origin/main -- src/game src/lab/balance 'src/*.template.html' src/lab/*.template.html` → each of those sets' Relay line has `UI: design skill ✓ · shots ✓`; reset/delete buttons were asked up front (no "built twice").
2. **Gate (HARD RULE 3/5):** every code merge names GATE: PASS on that commit; a first-run FAIL or "re-run PASS" has its cause written down (set 149 did not).
3. **New core/game files (HARD RULE 2):** `git log --since='7 days ago' --diff-filter=A --name-only --format= origin/main -- src/core src/game` → each one is in `CORE` in src/build.mjs.
4. **Values (HARD RULE 6):** a set that changed game values has its cfgdiff review file + the "cells to set back" user todo; boss values written only after a shown before/after (bossrun --fit report → user picks; set 170).
5. **Publish:** each publish names its gate commit + CI green (set 153 G1) and updated the existing Links URL.
6. **Relay / lock:** every set number is unique · each chat pushed a 🔒 line and none is left after its close-out · Relay = newest 2 sets + open WIP sets.
7. **Close-out (HARD RULE 1):** each merged code set ended with a close-out that printed the skill check (`สกิลใหม่: …`).
8. **Doc versions:** a Thai rule doc / CLAUDE.md changed → its version line bumped, claude/instructions.md regenerated (user picked: caught here, set 158 B2), and handoff "Doc versions" matches the file headers:
   `for f in combat-rules tribe-rules shop-merge-rules build-plan instructions; do h=$(sed -n 3p claude/$f.md | grep -oE '^V[0-9.]+'); grep -q "$f $h" claude/handoff.md || echo "DIFF $f file=$h"; done`
9. **Measure:** measured only with permission (or a mechanic change), with a measure-log entry.
10. **Review skills (set 209 A2):** UI sets' Relay lines carry `critique ✓`, code merges `review ✓`, each publish names its security-review result; a set that touched src/core or godot/scripts names `Godot tests n/n (golden)` (skill port-parity).
Each miss → a report item: rule · set · evidence · why it was missed (rule not seen at that moment / trigger unclear / step forgotten) · where the fix belongs (skill description or step · merge-code check · hook · CLAUDE.md), with A1/A2 options. A rule missed twice → recommend moving it into a skill step or a merge-code check rather than adding more text.

## 4. Report
- Write claude/review-YYYY-MM-DD-weekly.md: part 1 items, then audit items. Each item = label A, B… · where (file + line) · the problem with evidence · options A1/A2… with a recommendation. Pure wording fixes can be grouped into one item.
- Commit + push to main (docs-only). Explain in Thai chat, then the AskUserQuestion buttons (max 4 per call).

## 5. After the user picks
- Apply with exact-string edits; bump each changed doc's version line (small +0.1); CLAUDE.md changed → regenerate claude/instructions.md.
- Mark the review DECIDED, `git mv` it to claude/archive/reviews/, add/flip its row in reviews.md.
- handoff: add the set to the Relay (move the oldest to claude/archive/relay/), update Doc versions; code fixes found by the audit go to "งานรอรวม", not into this docs set.
- Push to main. Push rejected → `git fetch` + `git merge origin/main` (never rebase), read the incoming commits first (another chat may be working → tell the user).
- Docs-only = no gate, no close-out (HARD RULE 1 B1).

## 6. Cost
- One round per week. After a round, if another round would need reading code tool by tool, say so in 1–2 Thai lines (cost vs benefit) and recommend stopping.
