# Boss phases + rule pool — options for the user (31 Oct 2026)

User request 31 Oct: "add boss skill phases, e.g. when 5 HP bars are gone the rules change; find lots of rules, I will pick".
Now (src/core/stage.js): each boss = 1 rule (`BOSS_RULES`, 8 rules) + `bars` (HP colour bars, default 5; each emptied bar = "enemy down" for skills). Bosses are data only — **the boss battle engine (phase 2a) is not built yet**, so no rule runs in a real fight today.
★ = recommended. All numbers = ค่าเสนอ (user tunes them in the Balance Room).

## Questions
- **Q1 Phase trigger:** A ★ by bars lost (each phase: "starts after N bars are gone") · B by time (every X s) · C either one, set per phase.
- **Q2 Phases per boss:** A ★ up to 3 (start + 2 changes) · B up to 4.
- **Q3 On phase change:** A ★ new phase's rules replace the old ones · B old rules stay and new ones add on · C a switch per phase.
- **Q4 Rules per phase:** A 1 · B ★ up to 2.
- **Q5 Transition effect (optional, per phase, pick any):** X1 boss gains armor = X% of one bar · X2 boss clears its burn/shock · X3 boss untargetable X s · X4 player units stunned X s · X5 boss changes spot (e.g. all 6 slots → 1 moving slot).
- **Q6 Rules to add:** pick from the pool below (any number).
- **Q7 Scope / timing (MVP1 28 Nov at risk, economy 5.5 not started):** A ★ now: phase data + Balance Room editor only (~1 set), rules start working when the boss battle engine (2a) is built · B also build the boss battle engine now (~2–3 sets, economy slips) · C park until economy is done.

## Rule pool (existing E1–E8 stay)
Existing: E1 none · E2 backSilence · E3 healCut · E4 armorCut · E5 tribeOff · E6 enrage · E7 reflect · E8 cdSlow.

### Boss gets stronger
- R1 atkUp: boss attack +X% this phase
- R2 fastAtk: boss cooldown −X%
- R3 multiUp: boss multi-hit +N
- R4 aoe: boss hits every player unit at X% damage
- R5 hunter: boss targets the lowest-HP unit
- R6 backStrike: boss targets the back row first
- R7 execute: a hit that leaves a unit below X% HP downs it
- R8 lifesteal: boss heals X% of damage dealt (only up to the top of its current bar)
- R9 regen: boss heals X% of a bar per second (current bar only)
- R10 armorGrow: boss gains X armor every 10 s
- R11 burnAura: every 5 s all player units get X burn
- R12 shockAura: every 5 s one random player unit gets X shock
- R13 desperate: boss attack ×2 but takes +X% damage (good for the last phase)
- R14 feedOnDown: each player unit down → boss heals X% of a bar

### Player gets weaker
- R15 randomSilence: every X s one random player unit cannot use skills for Y s
- R16 freezeRow: every X s one player row is frozen (cooldown +Y s)
- R17 noArmor: player units cannot gain armor this phase
- R18 frontBreak: player front row takes +X% damage
- R19 rowSwap: on phase start the player's front and back rows swap
- R20 noRevive: revive effects (runes/skills) do not work this phase
- R21 earlyStorm: sandstorm starts when this phase starts

### Boss defends
- R22 hitCap: one hit deals at most X% of a bar (anti burst)
- R23 minHit: hits below X damage deal 0 (anti multi-hit spam)
- R24 statusImmune: boss immune to burn and shock this phase
- R25 tribeWeak/tribeResist: boss takes +X% from tribe A, −Y% from tribe B
- R26 rowOnly: only player front row (or back row) can damage the boss this phase
- R27 vanish: every X s boss untargetable for Y s

### Puzzle / pressure
- R28 dpsCheck: if a bar is not emptied within X s, that bar refills
- R29 curse: every X s a random player unit is marked; it is downed after Y s unless the boss takes Z damage first
- R30 weakSpot: after each move (spot 'move') boss takes +X% damage for Y s
- R31 summon: on phase start boss calls N weak helpers (needs helper units — biggest work, ★ later)

## Warnings (loopholes)
- R8/R9/R14/R28 heal the boss: if healing could refill an emptied bar, "enemy down" skills would trigger again each time (infinite trigger loop). ★ Heal never goes past the current bar; R28's refill does NOT re-trigger "enemy down".
- R7 execute + R4 aoe in the same phase can wipe a team in one hit — warn in the editor when both are picked.
- R22 hitCap + R23 minHit together punish almost every build — allow, but warn.
- R26 rowOnly vs boss spot 'one'/'move': some teams cannot hit at all → combine with spot 'all' only.
