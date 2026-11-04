# Boss tuning harness (set 78, 4 Nov) — scratch tools, not part of the build
Setup: copy src/{core,tools,lab,game} to <scratch>/sim, `node tools/apply-config.mjs ../cfg.json` there (applies the Balance Room char edits saved 08:29Z), put teams.json next to sim/. Paths inside the scripts point to the scratchpad — edit `R` before use.
- lv.mjs: team size/level at rounds 4–11 from simRun (real shop bot)
- pw.mjs: team power vs a passive-ish boss (dmg in 30 s, survival)
- bt.mjs <bosses.json>: each boss vs the 6 user teams (Lv1 @k=1, Lv2 @k=2)
- kits.mjs / ev.mjs / search.mjs <id> '<json grid>': boss kits B1–B6 + grid search on bars/atk/cd/phase mult/enrage
