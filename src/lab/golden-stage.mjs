// Godot plan step 6b (set 195): golden stage.jsonl = answers of core/stage.js (run helpers) · boss.js · runboss.js · runes.js for the Godot port.
// Lines (inputs go through a JSON round trip first; numbers written with exactNums by the caller):
//   {kind:'misc', runeKind, runeActive, roundK, enemyMult, flag}                          small helpers on fixed + edge inputs
//   {kind:'boss', i, b, k, extraPct, g2, unit, at, mults, heat}                          bossUnit/bossAt/bossMults/heatRules per boss × k × g2 variant
//   {kind:'runBoss', seed, round, extra, pick:{id,k}|null, team, opts, char}            runBossAt/runBossTeam/runBossOpts/runBossChar per seed × round
//   {kind:'equip', i, units, equips, ctx, res, flags}                                   equipRunes on random teams with random runes (built-in + custom)
//   {kind:'record', ids, got}                                                           runeRecord on the default stage + a custom list
//   {kind:'dummy', res, score}                                                          dummyScore
// Random parts use the game's own rng (seeded) → byte-identical every run.
import { RULES, TRIBES } from '../core/rules.js';
import { makeRng } from '../core/rng.js';
import { makeCharMap, buildTeam } from '../core/team.js';
import { SLOT_ORDER } from '../core/shop.js';
import { runeKind, runeActive, bossRoundK, enemyMultAt, bossAt, bossMults, boss2Default, customDefault, runeWithEff, RUNE_EFFECTS, RUNE_SPECIAL } from '../core/stage.js';
import { bossUnit, heatRules } from '../core/boss.js';
import { RUN_STAGE, runBossAt, runBossTeam, runBossOpts, runBossChar, dummyScore, DUMMY_BOSS } from '../core/runboss.js';
import { equipRunes, rnFlagTribes, runeRecord } from '../core/runes.js';

const copy = v => JSON.parse(JSON.stringify(v));

function miscLine() {
  const effs = ['skill', 'atk', 'eCd', 'flag', 'gold', 'revive', '', 'nope', 'addTribe'];
  const S = RUN_STAGE.settings;
  const sets = [S, { ...S, bossEvery: 3, bossLateFrom: 9, bossEveryLate: 4, lastStage: 40 }, { ...S, bossEvery: 0, bossLateFrom: 0, bossEveryLate: 0 }, { ...S, bossEvery: 7.9, bossLateFrom: 2.5, lastStage: 30.2 }];
  const roundK = sets.map(s => Array.from({ length: 45 }, (_, r) => bossRoundK(r - 1, s)));
  const enemyMult = [];
  for (const st of [S, { growFrom: 3, growPct: 8 }, { growFrom: 2, growPct: 33.3 }]) for (let s = 0; s < 30; s++) enemyMult.push(enemyMultAt(st, s));
  const active = [null, {}, { on: true }, { on: true, del: true }, { on: false }, { on: 1, del: 0 }].map(x => !!runeActive(x)); // callers only test truthiness (filter) → bool
  const flag = [];
  const fr = { tribe: TRIBES[2] };
  for (const [n, picked] of [[1, null], [3, [TRIBES[1]]], [3, [TRIBES[4], 'น้ำ', TRIBES[4]]], [2, 'x'], [0, []]]) flag.push(rnFlagTribes(fr, n, picked));
  flag.push(rnFlagTribes({ tribe: 'น้ำ' }, 2, null));
  // JS ** = V8's fdlibm pow, not the C library's → Godot jsmath.gd ports it; 20,000+ cases incl. the game's own bases
  const pr = makeRng(195), pow = []; // huge whole results (e.g. 6e123) are written as bits by exactNums (|v| > 2^53)
  for (let i = 0; i < 20000; i++) {
    const x = [1 + pr.next() * 0.5, pr.next() * 10, 1 + pr.int(300) / 100, pr.next() * 1e-3, 1e5 * pr.next(), -3 * pr.next(), 1 + pr.int(300) / 100, 2.09 + pr.int(9) / 100][i % 8];
    const y = [pr.int(40), pr.next() * 20 - 10, pr.int(12) - 3, pr.int(30)][i % 4];
    const v = x ** y;
    if (Number.isFinite(v)) pow.push([x, y, v]);
  }
  for (const [x, y] of [[1.08, 3], [2.09, 5], [-2, 3], [-1.5, 4], [-2, 0.5], [0, 3], [1, 1e9], [1.0000001, 3e9], [0.5, 2], [4, 0.5], [3, -1], [1e-310, 2], [2, -1074], [2, 1023.5], [0.9999, -1e5]]) {
    const v = x ** y; if (Number.isFinite(v)) pow.push([x, y, v]);
  }
  return { kind: 'misc', pow, runeKind: effs.map(runeKind), runeActive: active, roundK, enemyMult, flag };
}

// g2 variants: default · long heat list with repeats · empty heat · a heat rule that the boss kit already has
function g2Variants() {
  const d = boss2Default();
  return [
    d,
    { ...d, g: 1.7, a: 0.35, weakPct: 120, weakCap: 80, resistPct: 0, heatRepeatPct: 37 },
    { ...d, heat: [] },
    { ...d, heatRepeatPct: 300, heat: [{ id: 'plating', v: 5, v2: 10, v3: 4 }, { id: 'atkUp', v: 33 }, { id: 'reflect', v: 25 }] },
  ];
}

function* bossLines() {
  const bosses = [...RUN_STAGE.bosses, DUMMY_BOSS];
  // a few odd records (no phases, float bars/multi, unknown spot, phase stats with every field)
  const b0 = RUN_STAGE.bosses[0];
  bosses.push({ ...copy(b0), id: 'Z1', bars: 2.7, multi: 2.2, cdMs: 1234.5, spot: 'zzz', moveSec: 0, weak: b0.tribe, weakPct: undefined, resistPct: undefined, phases: [] });
  bosses.push({ ...copy(b0), id: 'Z2', spot: 'move', burn: 3, shock: 2, healHit: 4, weak: TRIBES[3], phases: [
    { at: 0, rules: [{ id: 'atkUp', v: 10 }], fx: [], spot: '', stats: { atk: 50.5, cdMs: 2000.4, multi: 2.9, burn: 1, shock: 2, armorHit: 3, healHit: 4, junk: 9 } },
    { at: 1, rules: [{ id: 'atkUp', v: 15 }, { id: 'fastAtk', v: 20 }], fx: [{ id: 'armorBar', v: 30 }], spot: 'front', stats: {} }] });
  let i = 0;
  const gs = g2Variants();
  for (const b0r of bosses) {
    const b = copy(b0r);
    for (let gi = 0; gi < gs.length; gi++) {
      const g2 = copy(gs[gi]);
      for (const k of [1, 2, 3, 4, 5, 6, 8, 11]) for (const extraPct of gi === 0 ? [0, 20] : [0]) {
        yield { kind: 'boss', i: i++, b, k, extraPct, g2, unit: bossUnit(b, k, extraPct, g2), at: bossAt(b, k, extraPct, g2), mults: bossMults(b, k, extraPct, g2), heat: heatRules(b, k, g2) };
      }
    }
  }
}

function* runBossLines(seed) {
  const rng = makeRng(seed);
  const last = RUN_STAGE.settings.lastStage | 0;
  for (let s = 0; s < 40; s++) {
    const st = { seed: s < 2 ? [0, 4294967295][s] : rng.int(4294967295) };
    for (let round = 0; round <= last + 1; round++) for (const extra of [false, true]) {
      const p = runBossAt({ ...st, round });
      if (!p && extra) continue;
      yield { kind: 'runBoss', seed: st.seed, round, extra, pick: p ? { id: p.boss.id, k: p.k } : null,
        team: p ? runBossTeam(p.boss, p.k, RUN_STAGE, extra) : null, opts: p ? runBossOpts(p.boss) : null, char: p ? runBossChar(p.boss, p.k, RUN_STAGE, extra) : null };
    }
  }
}

// custom runes: every effect via customDefault, plus a few skill runes and odd values
function customRunes() {
  const out = [];
  let n = 0;
  for (const e of RUNE_EFFECTS) { out.push(customDefault('K' + n++, e[0])); const y = customDefault('K' + n++, e[0]); if (y.mode === 'flat' && RUNE_EFFECTS.find(z => z[0] === e[0])[3]) y.mode = 'pct'; y.v = 7.5; out.push(y); }
  for (const s of RUNE_SPECIAL) { const y = customDefault('K' + n++, s.key); out.push(y); if (s.f.length) { const z = copy(y); z.id = 'K' + n++; z[s.f[0][0]] = typeof s.f[0][2] === 'number' ? s.f[0][2] * 3 + 0.5 : TRIBES[5]; z.scope = 'team'; out.push(z); } }
  const sk = (when, d, to, v, scope) => ({ ...customDefault('K' + n++, 'skill'), when, do: d, to, v, scope });
  out.push(sk('matchStart', 'atkUp', 'self', 5, 'team'), sk('hit', 'burn', 'target', 3, 'front'), sk('tick', 'healPct', 'allyLowest', 2.5, 'mid'), sk('matchStart', 'armor', 'self', 10, 'tribe'));
  out.push({ ...customDefault('K' + n++, 'flag'), tribe: 'น้ำ', count: 2.6, maxTier: 9 });
  out.push({ ...customDefault('K' + n++, 'addTribe'), gain: 'น้ำ', scope: 'team' });
  out.push(runeWithEff(customDefault('K' + n++, 'atk'), 'eBurn'));
  out.push({ id: 'K' + n++, eff: 'atk', mode: 'flat', v: 3, scope: 'nowhere' });
  out.push({ id: 'K' + n++, eff: 'zzz', scope: 'team', v: 3 });
  return out;
}

function* equipLines(n, seed, chars) {
  const rng = makeRng(seed), cm = makeCharMap(chars);
  const pool = [...Object.entries(RUN_STAGE.runes).map(([id, r]) => ({ ...r, id })), ...customRunes()];
  const slotOf = () => { const s = rng.pick(SLOT_ORDER); return [s[0], s[1]]; };
  for (let i = 0; i < n; i++) {
    const size = 1 + rng.int(6), slots = SLOT_ORDER.slice();
    const entries = Array.from({ length: size }, () => { const [row, lane] = slots.splice(rng.int(slots.length), 1)[0]; return { id: rng.pick(chars).id, level: 1 + rng.int(3), row, lane }; });
    const units = copy(buildTeam(entries, cm, RULES));
    const equips = [];
    const ne = rng.int(i < 20 ? 3 : 7);
    for (let k = 0; k < ne; k++) {
      const e = { r: rng.pick(pool) };
      if (rng.int(4)) e.n = 1 + rng.int(3);
      if (rng.int(5) === 0) e.n = rng.pick([0, 12, 2.5, -1]);
      if (rng.int(3)) e.slot = rng.int(4) ? [units[rng.int(units.length)].row, units[rng.int(units.length)].lane] : slotOf();
      if (rng.int(3)) e.partner = rng.int(3) ? [units[rng.int(units.length)].row, units[rng.int(units.length)].lane] : slotOf();
      if (e.r.eff === 'flag' && rng.int(2)) e.tribes = Array.from({ length: 1 + rng.int(3) }, () => rng.int(6) ? rng.pick(TRIBES) : 'น้ำ');
      equips.push(e);
    }
    if (rng.int(15) === 0) equips.push(null, { r: null }, { r: { id: 'noeff' } });
    const ctx = rng.int(3) ? { winStreak: rng.pick([0, 1, 3, 7, 12, 150, 2.5]) } : rng.int(2) ? {} : undefined;
    const inp = copy({ units, equips, ctx: ctx ?? null });
    const res = equipRunes(inp.units, inp.equips, inp.ctx ?? undefined);
    yield { kind: 'equip', i, units, equips, ctx: ctx ?? null, res };
  }
}

function recordLine() {
  const stage = { runes: copy(RUN_STAGE.runes), custom: customRunes().slice(0, 5) };
  const ids = [...Object.keys(stage.runes).slice(0, 6), 'K0', 'K3', 'ZZ', ''];
  return { kind: 'record', stage, ids, got: [...ids.map(id => runeRecord(stage, id)), runeRecord(null, 'T1'), runeRecord({ custom: stage.custom }, 'K1'), runeRecord({}, 'T1')] };
}

function dummyLine() {
  const res = { units: [{ side: 0, dealt: 10.4 }, { side: 0, dealt: 2.2 }, { side: 1, dealt: 99 }, { side: 0 }, { side: 0, dealt: 0.4 }] };
  return { kind: 'dummy', res, score: [dummyScore(res), dummyScore(null), dummyScore({}), dummyScore({ units: [] })] };
}

export function* stageGolden(cfg, chars) {
  yield miscLine();
  yield* bossLines();
  yield* runBossLines(cfg.seed + 7);
  yield* equipLines(cfg.equips, cfg.seed + 8, chars);
  yield recordLine();
  yield dummyLine();
}
