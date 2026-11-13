# Weekly review — 13 Nov 2026 (set 218)

Status = DECIDED 13 Nov 2026 (set 218): owner picked A1 B1 C1 D1 E1 F1 G1 H1 I1 — all applied.
Window: commits on origin/main 6–14 Nov (sets 185–217, ~700 commits incl. relay). Claude cannot read old chats — "not shown" ≠ "broken".

## Part 1 — what went wrong this week

### A. Sample branch fast-forwarded onto main (set 217)
- Evidence: `0455397` "undo the accidental fast-forward of the set 217 sample branch (pushed by a broken close-out command)". The session branch held sample Godot code; the close-out pushed the branch head to main.
- Cause: close-out step 2 says "docs-only Relay commit may go straight to main" but not HOW. chat-start step 4 already pushes the 🔒 line from a clean worktree of origin/main (set 211); close-out has no such step (`grep -c worktree .claude/skills/close-out/SKILL.md` = 0, relay.md = 0).
- A1 (rec): close-out step 2 + relay.md: every docs-only push to main goes through a clean worktree of origin/main (same commands as chat-start 4), never `git push origin HEAD:main` from a work branch; if the work branch is not an ancestor-of-main docs branch, refuse.
- A2: one-off, no rule.

### B. The undo also deleted the asset-3d skill from main
- Evidence: `git diff 0455397^ 0455397` removes `.claude/skills/asset-3d/SKILL.md` (78 lines) and its CLAUDE.md topic row (added on main by a4bd37e / cfcd91e). The skill now exists only on sample branch ccr-882ceb4b-0ewtk1 (last 1c6e8c8, with later §8 edits). Chats on main never see it.
- B1 (rec): copy the latest SKILL.md from 1c6e8c8 + the CLAUDE.md row back to main (docs only; its script paths point at sample files → mark those lines "sample branch only" until ทำจริง).
- B2: leave it on the sample branch until ทำจริง.

### C. Sample work lives on real branches, but ui-preview says "scratch copy, never the repo"
- Evidence: ui-preview step 1 = scratch copy; sets 216 (claude/ui-sample-216) and 217 (ccr-882ceb4b-0ewtk1) committed real godot/ files because the owner edits scenes in the Godot editor. Side effects this week: A above · "R6–R14 tone was never saved" (Relay 217) · owner editor saves made `s217_make_r6.gd` stale ("never regenerate") · Relay links `claude/preview-set216/notes.md` and `claude/preview-set217/notes.md` do not exist on main (only on the sample branches).
- C1 (rec): add a "Sample branch mode" section to ui-preview: name `claude/sample-setN` · Relay line says NO MERGE · Relay paths written as `<branch>:path` · after every round `git status --porcelain` on the copy the owner edits = empty before showing (catches unsaved tone etc.) · after an owner editor save, generator scripts are marked stale in notes.md.
- C2: forbid sample branches; owner edits only in a scratch copy (loses the in-editor arranging the owner uses).

### D. Content missing from a pushed commit (twice)
- Evidence: `86a749e` "content missed by b7a5ac5" · `361a01f` "ui-preview skill file (was lost last chat)".
- D1 (rec): one line in close-out step 2 + merge-code: before push, `git status --porcelain` empty and `git show --stat HEAD` lists every file the step meant to change.
- D2: one-offs, no rule.

## Part 2 — rule compliance (3b)
- Gate: every code merge 188–215 has GATE: PASS in its merge message or Relay line ✓. Godot sets name Godot test counts ✓.
- HARD RULE 1 / lock: no lock left open ✓ · one duplicate set number (185 → renumbered 186, parallel chat, handled) ✓.

### E. HARD RULE 8 `ripple:` line — written on almost no code commit
- Evidence: since set 186, 16 code commits on main without a `ripple:` line (e.g. 6cc8476 set 212, 9344d84 set 206, 7221c73 7e) and no merge commit has one. merge-code step 7 records `ripple ✓` in the Relay instead → the rule text and the practice differ. Missed every time → per 3b move it into a check, not more text.
- E1 (rec): HARD RULE 8 wording = "the merge commit (or the single docs commit) carries the `ripple:` line; WIP/sample commits exempt" + merge-code step: merge message must contain `ripple:` (copy the branch summary).
- E2: keep "every commit" and add a commit-msg hook that warns.

## Part 3 — workflow audit
### F. Review hygiene
- No row in reviews.md: review-2026-11-11-godot-mcp.md · review-2026-11-12-prep-ui.md · review-2026-11-14-hd2d-gaps.md.
- Decided but not archived: review-2026-11-12-skills.md (applied set 209); check runerun3000 + brainstorm-ui-ease (rows say shipped).
- F1 (rec): add rows, archive the decided ones, fix references.

### G. Doc versions + Thai summary out of date
- handoff "Doc versions" vs file headers: balance-import V1.36→**V1.38** · relay V1.4→**V1.5** · security V1.3→**V1.4** · ui V1.7→**V1.9** · missing: gdscript V1.0, replies V1.0, art-style V0.3.
- claude/instructions.md V5.9 (set 190) lists none of the 9 skills added since (art-look, ui-preview, ui-patterns, godot-play, port-parity, godot-release, sim-play, asset-3d, ci-check) nor the new CLAUDE.md topic rows.
- G1 (rec): fix the versions line + regenerate instructions.md V6.0.

### H. handoff.md far above "≤ 1 screen"
- Evidence: 12 KB; the set 217 Relay entry alone ≈ 3,000 chars (every round R1–R20 + P0–P1t inline). Every chat pays these tokens at start (SessionStart hook prints it).
- H1 (rec): Relay entry cap ≈ 600 chars = status · branch/last sha · gate/publish · next step; round-by-round detail goes to the set's notes.md / plan file (close-out step 1 text).
- H2: keep as is.

### I. Small wording fixes (one pick)
- weekly-review §1 calls `anthropic-skills:explain-usage` — not installed here → "if available".
- weekly-review §2 base commit: cloud clones are shallow (58 commits) → add `git fetch --shallow-since=<7 days ago> origin main` first.
- archive/relay/relay-2026-11-08-sets117-137.md now holds sets 117–206 → name in handoff already says so; rename skipped (many links).
- I1 (rec): apply the two weekly-review fixes.

## Token note
- Biggest sink this chat: reading git history (~700 commits) to find the week's problems; the Relay block (12 KB) is read at every chat start (see H).
