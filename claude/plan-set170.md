# Plan set 170 — boss v2 follow-up cleanup (user A1 B1 C1, 9 Nov)
Goal: every boss = the set 168 system (C-17.6); remove the old path (v2 switch, mult10/endlessPct, phase-replace mode, old tuning tools) and stale text. Game play must not change (all 6 bosses already v2).

1. [x] core: stage.js (no v2 switch · no mult10/endlessPct · bossMults always g/a · drop bossMult) · boss.js (always bossV2Phases) · runboss.js dummy · check: unit tests
2. [x] lab: analyze.js neutralOf · bossrun.mjs (drop old tuning, --fit only) · runerun.mjs (drop boss --write) · delete bossmult.mjs · check: `node lab/bossrun.mjs --help`-style dry run
3. [x] Balance Room 22-stage-form.js: drop v2 checkbox + old growth group + old phase note · ui_smoke line 721 · check: setup
4. [x] tests: t-validate 57–58 · t-boss2 old-boss cases · t-boss fixture · check: setup PASS
5. [x] B1 (rev 56 MATCH): AMCFG1 from Balance Room (user 💾) → cfgdiff → user picks → stage-user.js drop v2/mult10/endlessPct fields (values unchanged)
6. [x] docs: combat-rules C-17.3/C-17.6 (V7.2) · shop-merge-rules S-10 (+0.1) · workflow/balance-import.md + skills balance-import/measure-balance (old bossrun steps)
7. [ ] gate → merge → CI → publish game + Balance Room (C1) → Relay → close-out
