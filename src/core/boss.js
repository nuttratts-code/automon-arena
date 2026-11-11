// Boss fights (phase 2a, set 66) — turns a boss record from the Balance Room into a unit the battle engine can fight,
// plus the phase state machine (which rules are live right now). Pure data: no randomness, no battle logic here.
// Rules R1–R30 + E1–E8 live in BOSS_RULES (core/stage.js); battle.js reads the live rule map this file produces.
// Godot port (set 195): bossUnit/bossV2Phases/heatRules also in godot/scripts/boss.gd (golden stage.jsonl exact, tests/test_stage.gd) — change both
import { spotInfo, bossAt, bossMults, boss2Default, BOSS_RULES } from './stage.js';

// A boss is ONE fighter that stands on several slots (user Q1 A): row/lane below = its front-most slot, `slots` = all of them.
// Skills that aim at a row/lane find the boss when any of its slots match, and it is hit once per skill use (one object in F).
export const slotKey = (row, lane) => row * 2 + lane;
export const slotsOf = bits => [...bits].flatMap((b, i) => (b === '1' ? [i] : []));

// boss record + k (1 = first appearance, 2 = second, 3+ = endless) → unit for simulate()
// set 168: g2 = stage.boss2 (curve + weak/resist + Heat · default = code base + stage-user) · set 170: every boss (the training dummy keeps no rules)
export function bossUnit(b, k = 1, extraPct = 0, g2 = boss2Default()) { // set 107: extraPct = stage bossExtraPct (3rd+ boss)
  const si = spotInfo(b.spot) || { bits: '111111', move: false };
  const at = bossAt(b, k, extraPct, g2), ma = bossMults(b, k, extraPct, g2).atk;
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
    phases: (b.dummy ? b.phases || [] : bossV2Phases(b, k, g2)).map(p => ({ at: p.at, rules: (p.rules || []).map(r => ({ ...r })), fx: (p.fx || []).map(f => ({ ...f })), spot: p.spot || '', stats: phaseUnitStats(p.stats, ma) })),
  };
}

// ---------- Boss v2 (set 168, C-17.6) ----------
// Phases ADD rules (phase 1 signature → phase 2 + punish → phase 3 + twist; a later phase may retune a rule it repeats)
// + weak/resist from the global default (E1: weak capped) + Heat rules for k ≥ 3 (F1) in every phase.
// The battle engine keeps "live rules = this phase's list", so the stacking is built here.
export function bossV2Phases(b, k = 1, g2 = boss2Default()) {
  const base = [];
  const weak = Math.min(b.weakPct ?? g2.weakPct, g2.weakCap);
  if (b.weak && b.weak !== b.tribe && weak > 0) base.push({ id: 'tribeWeak', v: weak, tribe: b.weak });
  const resist = b.resistPct ?? g2.resistPct;
  if (resist > 0) base.push({ id: 'tribeResist', v: resist, tribe: b.tribe });
  const heat = heatRules(b, k, g2);
  let acc = new Map(base.map(r => [r.id, r]));
  return (b.phases || []).map(p => {
    acc = new Map(acc);
    for (const r of p.rules || []) acc.set(r.id, { ...r });
    const m = new Map(acc); for (const r of heat) m.set(r.id, r);
    return { ...p, rules: [...m.values()] };
  });
}
// Heat rules of boss b at boss number k (k − 2 steps · kit rules skipped · past the list: steps 1–2 again, stronger)
export function heatRules(b, k, g2 = boss2Default()) {
  const n = Math.max(0, (k | 0) - 2), list = g2.heat || [];
  if (!n || !list.length) return [];
  const kit = new Set((b.phases || []).flatMap(p => (p.rules || []).map(r => r.id)));
  const got = [];
  for (const r of list) { if (got.length >= n) break; if (!kit.has(r.id)) got.push({ ...r }); }
  const rep = got.slice(0, 2);
  for (let e = 0; got.length + e < n && rep.length; e++) {
    const r = rep[e % rep.length], q = BOSS_RULES.find(z => z[0] === r.id);
    if (q && q[4]) r.v = Math.min(q[4], +(r.v * (1 + (g2.heatRepeatPct || 0) / 100)).toFixed(2));
  }
  return got;
}

// Set 71: phase stats (boss-record keys) → unit fields · atk grows with the stage like the base atk
const PHASE_FIELD = { atk: 'atk', cdMs: 'cdMs', multi: 'multi', burn: 'burnHit', shock: 'shockHit', armorHit: 'armorHit', healHit: 'healHit' };
function phaseUnitStats(st, m) {
  const o = {};
  for (const [k, f] of Object.entries(PHASE_FIELD)) if (st && typeof st[k] === 'number') o[f] = k === 'atk' ? Math.round(st[k] * m) : k === 'cdMs' ? Math.max(1, Math.round(st[k])) : k === 'multi' ? Math.max(1, Math.floor(st[k])) : st[k];
  return o;
}
// A spot id → the slots the boss stands on right now ({ cells, move }); a moving boss starts on its first slot.
// Godot port (set 194): spotCells/phaseIndexAt/ruleMap/fxMap (+ stage.js spotInfo) also live in godot/scripts/rules.gd — change both
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

