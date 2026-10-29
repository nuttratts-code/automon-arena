# Stage mode phase 2 — decisions needed before coding (29 Oct 2026)
Context: phase 1 done on branch claude/stage-mode (core/stage.js + Balance Room tab "รูน / บอส"). Board = 3 rows × 2 lanes per side. Boss = one unit; many skills assume a full enemy team. Recommended option = ★.

Blocker (not a decision): this account cannot read the Balance Room database → user must paste the `AMCFG1 …` code ("คัดลอกค่าให้ Claude"); it carries `stage` (runes/bosses/settings). Rune/boss ideas live in the `ideas` collection and are NOT in the code → user pastes them as text if any.

## Q1 Where does the boss stand / which skills can hit it
- A ★ Boss fills every enemy slot: front/mid/back-row and same-lane skills all find the boss (each hit once per skill use, no double hits from "row" targeting).
- B Boss stands at front row, lane 1 only: back/mid-row skills find nothing (back-row builds are punished).
- C Boss + helpers (boss front, a weak bot team behind): most natural for skills, most work and more numbers to tune.

## Q2 Skills that fire on "enemy down" (none fire until the boss dies)
- A ★ Boss counts as "down" at 75 / 50 / 25% HP (3 extra triggers per fight).
- B Leave it: those skills are weak vs bosses (players must plan for it).
- C Comes with Q1-C (helpers die).

## Q3 Sandstorm in boss fights (starts 180 s)
- A ★ Same as now: storm hurts both sides incl. boss (boss sized to fall ~60 s, so storm rarely matters).
- B Boss ignores storm → player must win before 180 s.
- C No storm; reaching 180 s = loss.

## Q4 Endless normal stages past stage 19 (beyond the measured baseline)
- A ★ Reuse the stage-19 team picks, enemy HP/attack +X% per stage (X = ask user, ค่าเสนอ 5%).
- B Keep stage-19 teams unchanged (endless gets easy; only bosses scale).

## Q5 Rune rule conflicts (from review-2026-10-28-runes.md)
- U1 DNA ★ counts for tribe bonus only, not for tribe-targeted skills, ignores T-rule "max 1 extra tribe" (rune is separate). Alt: obeys the max-1 rule (rune useless on units that already have an extra tribe).
- U2 ชุบ ★ on-down skills (HL-5, PT-3) fire only on the first down; อสูร revive and the rune both allowed (rune first). Alt: rune does nothing on อสูร units.
- U4 โล่ "enemies hit it first" vs boss (single attacker): ★ boss also obeys taunt.

## Q6 Phase 2 scope (MVP1 target 28 Nov at risk, step 5.5 economy not started)
- A ★ Split: 2a = battle engine (boss + battle runes T5–T12, U1–U6) + Balance Room "try boss" + measure · 2b = game page run flow (difficulty pick, drops, shop runes T1–T4, U7, U8). Stop after 2a and check the date.
- B Do 2a + 2b in one go (~2–3 task sets).
- C Pause stage mode, do MVP1 step 5.5 first.
