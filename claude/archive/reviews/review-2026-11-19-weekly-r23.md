# Weekly review 12–19 Nov — rounds 2 + 3 (set 250)
n**DECIDED (owner, set 250):** G1 · H1 · I2 (keep full ui-work for local tools) · K1 · L1 — applied set 250. Note: plan-set236 kept (its step 4 = the r38 port steps, linked from plan-set238).

Round 1 = archive/reviews/review-2026-11-19-weekly.md (set 249). Evidence = git + Relay only ("not shown ≠ unused"). CI #941 on 5044915 = green (checked this chat).

## Round 2 — skill + doc usage

### Usage table (born · edits · commit mentions 7 d · relay/handoff mentions · SKILL.md size)
| Group | Skills |
|---|---|
| Heavy this week | char-idle (21 · 30 · 9 · 25 KB) · art-look (19 · 25 · 19 · 24 KB) · close-out (11 · 31) · asset-3d (9 · 14) · ui-patterns / ui-preview (10 / 9 mentions) |
| Used | weekly-review · ci-check · merge-code · rule-change · scratch-cleanup · ui-work (3) |
| Dormant (parked on purpose) | measure-balance (set 167) · sim-play + publish-pages game page (set 189 web frozen) · balance-import (no value change) |
| Never run live | godot-play (draft since set 209) · godot-release (no build ordered) · port-parity (0 mentions this week; no core edit) |
No skill to delete. Descriptions total 7.8 KB (round 1 D covered length).

### G. Relay holds 9 sets — rule is newest 2 + open WIP (set 211 B1)
- handoff.md:10–12 + set 240 line. Sets 236 (r36) and 237 (r37) are superseded by set 238 (r38 = arena, art-style V2.4); set 240 is merged and finished. The hook prints the whole Relay (8.3 KB) at every chat start.
- plan-set236.md (5 open steps) and plan-set237.md (step 6 open) describe ports of r36/r37 that will never happen → stale. prompts-set229-boar-themes.md: 0 references.
- **G1 (rec):** move the 236 / 237 / 240 lines to `claude/archive/relay/relay-2026-11-19-sets236-240.md`; `git mv` plan-set236, plan-set237, prompts-set229 to claude/archive/ (grep + fix links: art-style.md names plan-set236). **G2:** leave.

### H. Review files hygiene
- `claude/review-2026-11-08-cfgdiff.md` = 38-byte stub; reviews.md already points to archive/reviews/…-rev39.md.
- Decided reviews still in claude/: brainstorm-gamelog (decided, parked items), brainstorm-runstats (decided, phase 2 parked), review-2026-11-12-skills (decided), brainstorm-skill (its skill was deleted set 220).
- **H1 (rec):** delete the stub; `git mv` those 4 to claude/archive/reviews/ (only if no code file links them — "kept: linked" files stay); fix rows in reviews.md. **H2:** leave.

### I. ui-work step skipped every time on the asset hub (local tool)
- Sets 240 / 248 (tools/asset-hub, owner-only page on the PC) never carry `UI: design skill ✓ · shots ✓ · critique ✓`. A step skipped every time = the step does not fit that work (set 219 B1).
- **I1 (rec):** add to ui-work: "local owner-only tools (tools/*, never shipped): desktop shot + owner check only — no design skill, phone shot or critique; the Relay line says `UI: local tool`". **I2:** keep full ui-work for tools too (more tokens per round).

### Checked, nothing found
Overlaps (art-look · char-idle · asset-3d · asset hub README) — each set used the matching one. No UNVERIFIED licence rows (main + asset-hub branch). Only undo on main this week = 0455397 (handled set 218 B1). Code commits without `ripple:` = set 240 follow-ups (round 1 C) + old sample commits.

## Round 3 — token cost vs result (estimates from bytes)

| Where | Size / count | Result | Verdict |
|---|---|---|---|
| CLAUDE.md (every chat) | 19.5 KB | rules | keep (owner answer C, set 220) |
| Relay via hook (every chat) | 8.3 KB, 9 sets | 3 sets finished/superseded | → item G (−~1.7 KB) + item L |
| Skill descriptions (every chat) | 7.8 KB | — | OK |
| char-idle body (loaded ~30× this week) | 25 KB; old pixel route B = 13.7 KB, route A 1.5 KB — not default since set 227 | — | → item K |
| art-look body | 24 KB; §8e–8h = finished round logs ~9.6 KB | — | → item K |
| weekly-review body | 13.9 KB | 1×/week | leave |
| Look loops (sets 236–239, 241–247) | many rounds | r38 plan + art-style V2.4/2.5 | leave (owner answer B, set 220) |

### K. Big skill bodies (> 8 KB rule, set 220 E1)
- **K1 (rec):** move char-idle Route B + Route A + shared pixel steps → `claude/workflow/char-idle-ref.md`, and art-look §8e–8h round logs → `claude/workflow/art-look-ref.md`; each heading + a one-line pointer stays so section numbers still work. Text is moved, not changed (no art-direction change). Saves ~15 KB (char-idle) + ~9 KB (art-look) per load. **K2:** leave.

### L. Relay lines are long (set 249 line = 1 026 chars)
- **L1 (rec):** from now on one Relay line ≤ 400 chars (details → notes/archive file it names); add the cap to relay.md W-rules. **L2:** only item G.
