# Boss kit draft v1 — set 168 (C-17.6 · user picks A3 B2 C2 D1 E1 F1 G1 H1) — WAITING FOR USER APPROVAL

Every number here is a proposal (ค่าเสนอ); final values come from the calibrator + HARD RULE 6 per-cell picks. Kit = signature (new mechanic) → phase 2 adds punish → phase 3 adds twist (rules stack, C-17.6). Max 1 stun/silence/freeze per boss. Weak/resist multipliers = global default + per-boss override + cap (E1); they are not counted as kit rules.

Tribe roles (T-2/T-3): เหล็กกล้า armor/tank · เพลิงเผา burn · สายฟ้า shock · วายุ multi-hit, small hits · ภูติ support/heal · อสูร big hits.
Design rule: the weak tribe's own playstyle switches the signature off; the resisted tribe (= boss's own tribe) can't.

| boss | weak / resist | signature (new) | phase 2 punish (library) | phase 3 twist (library) | removed from today's kit |
|---|---|---|---|---|---|
| B1 โกเลม เหล็กกล้า | สายฟ้า / เหล็กกล้า | **Plating**: starts with N plates (proposal 5); each plate −Y % (proposal 10 %) to normal-hit damage taken; **every shock that lands strips 1 plate**; 1 plate regrows every Z s (proposal 4 s) | reflect | armorBar fx at phase start + noArmor | armorCut, enrage, shellBreak |
| B2 จอมเวทย์ดำ ภูติ | เพลิงเผา / ภูติ | **Mend Pulse**: every X s (proposal 5 s) heals Y % of one bar (proposal 25 %, never past the current bar); **heal is cancelled while the boss is burning** | healCut | randomSilence (its 1 control) | cdSlow (dominant rule, set 167), enrage, hunter, resistWear |
| B3 อสุรกายคลั่ง อสูร | ภูติ / อสูร | **Rage**: every player hit ≥ T % of one bar (proposal 8 %) gives +R % atk (proposal 10 %, cap 10 stacks); **every heal a player unit receives removes 1 Rage stack** | lifesteal | downAtk | healCut (it would block the weak tribe's answer), noRevive, feedOnDown |
| B4 กระจกสะท้อน สายฟ้า | เหล็กกล้า / สายฟ้า | **Static Chain**: every Nth hit it takes (proposal 3rd) shocks the attacker S (proposal 3 shock); **armor on the attacker absorbs this shock first** | shockImmune 50 % | stunPulse (its 1 control) | shockAura, shockOverload, fastAtk |
| B5 จ้าวพายุ วายุ | อสูร / วายุ | **Gale Guard**: hits smaller than T % of one bar (proposal 4 %) deal −D % (proposal 60 %); **big single hits pass untouched** | cdPulse | vanish | fastAtk, multiUp |
| B6 ปีศาจเพลิง เพลิงเผา | วายุ / เพลิงเผา | **Flame Shell**: N shell layers (proposal 6); each layer −Y % damage taken (proposal 8 %); **every hit (count, not damage) removes 1 layer** — burn ticks don't count; full refill every Z s (proposal 6 s) | burnAura + burnImmune 50 % | aoe | burnOverload, cleansePulse, enrage |

Why each answer is readable:
- B1: thunder teams peel the golem's plates; steel teams hit low and never peel.
- B2: fire keeps the mage burning so it can't heal; spirit teams have low damage and get their own heals cut.
- B3: big beast hits feed its rage; spirit heals calm it.
- B4: steel armor eats the chain shock; thunder teams are shock-resisted and get chained.
- B5: the wind lord shrugs off small fast hits (wind's style); beasts' big hits go through.
- B6: wind's many small hits strip the shell fastest; fire teams' burn does not strip it and is half-resisted.

## Heat ladder (F1, same order for every boss; boss k ≥ 3 gets the first k − 2 entries; a rule the boss already has is skipped → next entry)
| step | rule | proposal value |
|---|---|---|
| 1 | atkUp (R1) | +20 % |
| 2 | fastAtk (R2) | +15 % |
| 3 | healCut | 30 % |
| 4 | armorCut | 30 % |
| 5 | regen (R9) | 2 % of a bar / s |
| 6 | aoe (R4) | 30 % |
| 7+ | repeat steps 1–2 stronger (+20 % each time) | — |

## Shared numbers the user will own (Balance Room, all proposals)
- curve: g (HP growth per boss, C2) · a (atk step per boss) — replaces mult10 + endlessPct ×6
- weak default % + weak cap % · resist default % (per-boss override allowed)
- signature numbers above (2–3 each) · Heat ladder values
- per boss: base HP, base atk (calibrator proposes one "power" factor scaling both)
- Count: ~6 global + ~5 per boss ≈ 36 knobs (today ≈ 300).
