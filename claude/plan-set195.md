# Plan set 195+ — Godot P3 step 6 split into sub-steps (user pick A1, 10 Nov)
Parent: claude/plan-godot-migration.md step 6. Branch: ccr-6e9137a5-ajfbvp (later chats: the WIP branch named in the Relay).
Rule for every sub-step: JS core file stays the source; each .gd = a line-by-line port (port traps: godot/README) · checked against golden fixtures made by `src/lab/golden.mjs` (never committed) · a deliberately broken copy must fail the test · setup passes before push · security line ③: any input from outside (save, pasted code, team) is validated before use, never `load()` a player file.
Tick a step only when done + pushed.

Dependency order (JS imports): team/power/validate/characters → stage/boss/runboss/runes → runrunes → shop → bot → botteams (simRun, pickFoe) → save/runlog.

- [x] **6a** (set 195, done: Godot tests 17/17 · teams.jsonl 1,063 lines exact · broken copy fails 797) · godot/scripts/{team,power,validate,characters}.gd + rules.gd helpers (cleanTags, sameTribeOk, skipSameIdOk) · golden (d) `teams.jsonl` (new in golden.mjs: random + broken teams → validateTeam result, buildTeam units, teamPower, countTribes/tribeSteps, basePower per char × level, validateConfig on the real list + broken copies) · tests/test_team.gd = all exact · characters.gd buildCharacterList == game.json derived.characters. Security ③: validateTeam/validateConfig ported with every check (same error strings).
- [ ] **6b** · stage.gd (rune helpers used by runs: runeKind, runeActive, runeWithEff…) · boss.gd rest (bossUnit, heatRules…) · runboss.gd (runBossAt, runBossTeam, dummy) · runes.gd (equipRunes, rnFlagTribes, runeRecord) · golden (d) adds runBoss teams per round/seed + equipRunes cases → exact.
- [ ] **6c** · runrunes.gd (offers, take/reroll/place/sync, compact codes + rnValidate) · golden: scripted rune sequences per seed → exact state.
- [ ] **6d** · shop.gd (newRun, refill, buy/sell/merge/move, startRound, endMatch, charges, shop skills) · golden: scripted shop action lists per seed → exact state after each action.
- [ ] **6e** · bot.gd + botteams.gd (botShop, arrange, simRun, pickFoe, foeSide) · tests/test_runs.gd = golden (c) runs.jsonl 200/200 exact (every match + final state). = parent step 6 main check.
- [ ] **6f** · save.gd + runlog.gd (save/history/replays/play record, ARUN1 run code, runlog) · user:// read = JSON.parse_string + validateRunState (never load()) · check: Godot-made ARUN1 code decodes in the JS Balance Room reader (node test reads a code file Godot wrote) · pasted codes validated.
- [ ] **6g** · close parent step 6: tick plan-godot-migration step 6, godot/README ported list, CI time check, merge (merge-code skill).
