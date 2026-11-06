// Boss fights (phase 2a, set 66) — turns a boss record from the Balance Room into a unit the battle engine can fight,
// plus the phase state machine (which rules are live right now). Pure data: no randomness, no battle logic here.
// Rules R1–R30 + E1–E8 live in BOSS_RULES (core/stage.js); battle.js reads the live rule map this file produces.
import { spotInfo, bossAt, bossMult } from './stage.js';

// A boss is ONE fighter that stands on several slots (user Q1 A): row/lane below = its front-most slot, `slots` = all of them.
// Skills that aim at a row/lane find the boss when any of its slots match, and it is hit once per skill use (one object in F).
export const slotKey = (row, lane) => row * 2 + lane;
export const slotsOf = bits => [...bits].flatMap((b, i) => (b === '1' ? [i] : []));

// boss record + k (1 = first appearance, 2 = second, 3+ = endless) → unit for simulate()
export function bossUnit(b, k = 1, extraPct = 0) { // set 107: extraPct = stage bossExtraPct (3rd+ boss)
  const si = spotInfo(b.spot) || { bits: '111111', move: false };
  const at = bossAt(b, k, extraPct);
  const slots = slotsOf(si.bits);
  const first = slots.length ? slots[0] : 0;
  const bars = Math.max(1, Math.floor(b.bars) || 1);
  return {
    id: b.id, name: b.name, tribe: b.tribe, extraTribes: [], level: 1,
    row: first >> 1, lane: first & 1,
    maxHp: at.hp, hp: at.hp, atk: at.atk, startArmor: at.armor,
    burnHit: b.burn || 0, shockHit: b.shock || 0, armorHit: b.armorHit || 0, healHit: b.healHit || 0, // set 71: เกราะ/ฮิต + ฟื้น/ฮิต of the boss
    multi: Math.max(1, Math.floor(b.multi) || 1), cdMs: Math.max(1, Math.round(b.cdMs)),
    skills: [],
    // boss extras read by battle.js
    boss: true, bars, barHp: Math.max(1, Math.floor(at.hp / bars)),
    slots: slots.length ? slots : [0], move: si.move, moveSec: Math.max(1, Math.floor(b.moveSec) || 8),
    phases: (b.phases || []).map(p => ({ at: p.at, rules: (p.rules || []).map(r => ({ ...r })), fx: (p.fx || []).map(f => ({ ...f })), spot: p.spot || '', stats: phaseUnitStats(p.stats, bossMult(b, k, extraPct)) })),
  };
}

// Set 71: phase stats (boss-record keys) → unit fields · atk grows with the stage like the base atk
const PHASE_FIELD = { atk: 'atk', cdMs: 'cdMs', multi: 'multi', burn: 'burnHit', shock: 'shockHit', armorHit: 'armorHit', healHit: 'healHit' };
function phaseUnitStats(st, m) {
  const o = {};
  for (const [k, f] of Object.entries(PHASE_FIELD)) if (st && typeof st[k] === 'number') o[f] = k === 'atk' ? Math.round(st[k] * m) : k === 'cdMs' ? Math.max(1, Math.round(st[k])) : k === 'multi' ? Math.max(1, Math.floor(st[k])) : st[k];
  return o;
}
// A spot id → the slots the boss stands on right now ({ cells, move }); a moving boss starts on its first slot.
export function spotCells(spot) {
  const si = spotInfo(spot); if (!si) return null;
  const slots = slotsOf(si.bits);
  if (!slots.length) return null;
  return { slots, cells: si.move ? [slots[0]] : slots.slice(), move: si.move };
}

// Which phase is live after `gone` bars have been emptied (phases are sorted by `at`, phase 1 is always at 0)
export function phaseIndexAt(phases, gone) {
  let i = 0;
  for (let j = 0; j < phases.length; j++) if (phases[j].at <= gone) i = j;
  return i;
}
// Live rules of a phase as { id: { v, v2, tribe } } — battle.js looks rules up by id
export function ruleMap(phase) {
  const m = Object.create(null);
  for (const r of (phase && phase.rules) || []) m[r.id] = r;
  return m;
}
// Phase-change effects as { id: v }
export function fxMap(phase) {
  const m = Object.create(null);
  for (const f of (phase && phase.fx) || []) m[f.id] = f.v;
  return m;
}

