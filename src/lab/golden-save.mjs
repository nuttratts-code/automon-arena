// Godot plan step 6f (set 195): golden save.jsonl = answers of core/save.js + core/runlog.js for the Godot port.
// Lines (inputs go through a JSON round trip first; numbers written with exactNums by the caller):
//   {kind:'hash', cases:[{chars, rules, h}]}                 dataHash on the real data + variants (emoji / control char in a name, tribe rows)
//   {kind:'mrun', i, seed, matches:[...], replays, reads, hist, P}   a bot run (detail log on): per match replayEntry + addMatchStats + playRecord
//   {kind:'state', i, st, bot, res}                          validateRunState on mid-run states + random broken copies
//   {kind:'save', i, text, hash, res} / {kind:'mksave', ...} readSave on makeSave texts + broken copies / makeSave output
//   {kind:'check', what, x, res}                             validateStats / readHistory / checkReplay / isBossFoe / checkPlayRecord / rlCheck cases
//   {kind:'rl', i, log, check, steps, firstBad, st, before?} a scripted player run journal (every action via rlApply) → rlReplay
//   {kind:'rlmisc', ...}                                     rlName / rlRef / rlUnref / rlGains / rlPush cases
//   {kind:'code', i, args, code, parsed} / {kind:'badcode', text, err}   makeRunCode → parseRunCode, and broken codes → the error text
// Random parts use the game's own rng (seeded) → byte-identical every run. Cases where JS itself throws on a broken input are left out
// (counted in the 'rlmisc' line as jsThrows) because Godot has no exceptions to compare.
// The other direction (set 195 plan 6f): `node lab/golden-save.mjs check <file>` reads an ARUN1 code that Godot wrote
// (tests/test_save.gd → godot/tests/golden/godot-arun1.txt) with the Balance Room's own reader and fails on any problem.
import { readFileSync } from 'fs';
import { RULES, TRIBES } from '../core/rules.js';
import { makeRng } from '../core/rng.js';
import { makeCharMap } from '../core/team.js';
import { buildCharacterList } from '../core/characters.js';
import * as SH from '../core/shop.js';
import * as SV from '../core/save.js';
import * as RL from '../core/runlog.js';
import { simRun, botRounds, tribeList } from '../core/botteams.js';

const copy = v => JSON.parse(JSON.stringify(v));
const POOL = [null, -1, 0, 1, 2, 1.5, 1e9 + 1, 4294967296, 'x', '', 'PL-2', true, false, [], {}, [1], { a: 1 }, 100001];
let jsThrows = 0;

// random broken copy: delete / replace / add one key somewhere inside (root included)
export function mutate(o, rng) {
  const x = copy(o), nodes = [];
  (function walk(v) { if (v && typeof v === 'object') { nodes.push(v); for (const k of Object.keys(v)) walk(v[k]); } })(x);
  const n = rng.pick(nodes), keys = Object.keys(n), op = rng.int(4);
  if (op === 0 && keys.length) { const k = rng.pick(keys); if (Array.isArray(n)) n.splice(+k, 1); else delete n[k]; }
  else if (op === 3 || !keys.length) { if (Array.isArray(n)) n.push(rng.pick(POOL)); else n[rng.pick(['zz', 'v', 'id', 'x'])] = rng.pick(POOL); }
  else n[rng.pick(keys)] = copy(rng.pick(POOL));
  return x;
}
const tryJs = f => { try { return { v: f() }; } catch (e) { jsThrows++; return null; } };

function hashLine(chars) {
  const c1 = copy(chars); c1[0].name += '😀\u0001"\\\n';
  const r1 = copy(RULES); const t0 = Object.keys(r1.tribeBonus)[0]; r1.tribeBonus[t0].zz = [0, 0, 0]; // zero row = not counted
  const r2 = copy(RULES); r2.tribeBonus[t0].zz = [0, 1, 0]; r2.shop.slots = 9;
  const cases = [[chars, RULES], [c1, RULES], [chars, r1], [chars, r2], [chars.slice(0, 5), r2]];
  return { kind: 'hash', cases: cases.map(([c, r]) => ({ chars: c, rules: { shop: r.shop, permCaps: r.permCaps, tribeBonus: r.tribeBonus }, h: SV.dataHash(c, r) })) };
}

const STATS_EV = { start: ['units'], summon: ['unit'], burn: ['to', 'from', 'total', 'amount'], cleanse: ['to', 'what'], down: ['who'], dmg: ['from', 'to', 'amount', 'why'] };
const slim = evs => evs.filter(e => e.k in STATS_EV).map(e => {
  const o = { k: e.k }; for (const f of STATS_EV[e.k]) if (f in e) o[f] = f === 'units' ? e.units.map(u => ({ uid: u.uid, id: u.id, side: u.side })) : f === 'unit' ? { uid: e.unit.uid, id: e.unit.id, side: e.unit.side } : e[f];
  return o;
});

function* mrunLines(n, chars, hash, states) {
  const cm = makeCharMap(chars), tribes = tribeList(chars), r = makeRng(1961);
  for (let i = 0; i < n; i++) {
    const seed = r.int(4294967295), matches = [], entries = [], stats = SV.newStats();
    const P = simRun(chars, RULES, seed, null, m => {
      const teamB = m.boss ? { boss: m.boss, k: m.k, ...(m.extra && r.int(2) ? { x: 1 } : {}) } : m.foe;
      const res = { winner: m.winner, timeMs: m.timeMs, aborted: m.aborted, events: slim(m.res.events) };
      const d = m.boss ? null : r.pick([null, 100, 90, 125, 'ยาก']), fs = r.int(3);
      const args = copy({ round: m.round, teamA: m.team, teamB, res, runes: m.rn, streak: m.ws, d, foeRunes: m.foeRn, foeStreak: fs });
      const entry = SV.replayEntry(args.round, args.teamA, args.teamB, args.res, args.runes, args.streak, args.d, args.foeRunes, args.foeStreak);
      entries.push(entry);
      SV.addMatchStats(stats, args.res);
      const pin = { at: 1.7e12 + m.round * 1000.5, hash, runSeed: seed, round: m.round, winsBefore: m.stage, heartsBefore: m.hearts, result: { winner: m.winner, timeMs: m.timeMs, aborted: m.aborted },
        teamA: m.team, teamB: m.boss ? [] : m.foe, foe: m.boss || r.int(2) ? null : { stage: r.int(20), span: r.int(5) }, boss: m.boss ? teamB : null, runes: m.rn, diff: r.pick([null, 100, 113, 'ยาก']) };
      const play = SV.playRecord(copy(pin));
      matches.push({ args, entry, stats: copy(stats), top: SV.topDamage(stats), statsOk: SV.validateStats(stats, cm), pin: copy(pin), play, playOk: SV.checkPlayRecord(play, cm) });
      if (states.length < 400 && r.int(3) === 0) states.push(copy(m.team));
    }, undefined, { runes: true, detail: true, extra: botRounds(RULES), focus: tribes[i % 6] });
    const rp = SV.makeReplays(seed, hash, entries);
    const reads = [[rp, hash, seed], [rp, hash, seed + 1], [rp, '00000000', seed], ['', hash, seed], ['{"rv":1', hash, seed], [null, hash, seed]]
      .map(([t, h, s]) => ({ t, h, s, res: SV.readReplays(t, cm, RULES, h, s) }));
    const hist = SV.historyEntry(P, stats, 1.7e12 + i);
    yield { kind: 'mrun', i, seed, matches, replays: rp, entries, reads, hist, P, statsOk: SV.validateStats(stats, cm) };
  }
}

// scripted player run with a journal (like the game page: every action through rlApply, gold before → after)
function playJournal(chars, seed, rng, hash, name, snaps) {
  const st = SH.newRun(chars, seed, RULES), log = RL.newRunLog(seed, hash, 1.7e12 + seed % 1000, name);
  let now = log.at;
  const act = (t, a) => {
    const e = [t, 0, st.gold, 0, ...a];
    let res; try { res = RL.rlApply(st, e, chars, RULES); } catch (err) { res = { ok: false }; }
    now += 500 + rng.int(4000);
    if (res.ok || rng.int(8) === 0) RL.rlPush(log, t, a, e[2], st.gold, now);
    return res;
  };
  const refs = ['B0', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'F00', 'F01', 'F10', 'F11', 'F20', 'F21'];
  for (let g = 0; g < 40 && !st.over; g++) {
    act('st', []);
    for (let k = rng.int(9); k-- > 0;) {
      const t = rng.pick(['by', 'by', 'by', 'bm', 'sl', 'mv', 'mv', 'rr', 'lk', 'pl', 'ht']);
      if (t === 'by' || t === 'bm') act(t, [rng.int(6), rng.pick([...refs, '-'])]);
      else if (t === 'sl') act(t, [rng.pick(refs)]);
      else if (t === 'mv') act(t, [rng.pick(refs), rng.pick(refs)]);
      else if (t === 'lk') act(t, [rng.int(5)]);
      else if (t === 'pl') { const ids = Object.keys(st.rn.bag); if (ids.length) act(t, [rng.pick(ids), rng.pick(['F00', 'F11', 'F21', '-']), rng.int(2)]); }
      else act(t, []);
    }
    if (snaps && rng.int(3) === 0) snaps.push(copy(st));
    const won = rng.int(5) < 3, boss = rng.int(6) === 0 ? 1 : 0, bu = SH.allUnits(st).filter(x => x.ref.at === 'board');
    const gains = bu.length && rng.int(3) === 0 ? [[bu[0].u.id, rng.pick(['hp', 'atk', 'armor', 'cdPct']), bu[0].ref.row, bu[0].ref.lane, rng.pick([1, 2, 0.5, 3.25])]] : [];
    act('en', [won ? 1 : 0, boss, gains]);
    if (won && !st.over) {
      act('of', [rng.pick(['win', 'boss'])]);
      const c = rng.int(5);
      if (c === 0) act('or', []);
      if (c === 1) act('sk', []);
      else act('tk', rng.int(4) === 0 ? [rng.int(3), rng.pick(TRIBES)] : [rng.int(3)]);
    }
    if (st.over && !st.extra && st.hearts > 0 && rng.int(2)) act('ex', []);
  }
  return log;
}

function* rlLines(n, chars, hash, snaps) {
  const r = makeRng(1962);
  for (let i = 0; i < n; i++) {
    const seed = r.int(4294967295), log = copy(playJournal(chars, seed, r, hash, r.int(2) ? 'ผู้เล่น ' + i : '', snaps));
    const R = RL.rlReplay(copy(log), chars, RULES, i < 2);
    const line = { kind: 'rl', i, log, check: RL.rlCheck(log), steps: R.steps.map(s => [s.gold, s.res, s.goldOk]), firstBad: R.firstBad, st: R.st };
    if (i < 2) line.before = R.steps.map(s => s.before);
    if (log.ev.length) { const bad = copy(log), k = r.int(bad.ev.length); bad.ev[k][3] += 1; line.bad = { log: bad, firstBad: RL.rlReplay(bad, chars, RULES, false).firstBad }; }
    yield line;
  }
}

function rlMisc() {
  const names = ['', ' ', 'abc', '  a   b  ', 'ผู้เล่น\u200b หนึ่ง', '\u0000x\u001fy\u007f', '😀'.repeat(25), 'a'.repeat(30), '\u00a0x\u3000', '\ufeffname\u202e', 'e\u0301ab', 5, null, 'a\tb\nc', '\u2028z'];
  const refs = [null, { at: 'bench', i: 3 }, { at: 'board', row: 2, lane: 1 }, { at: 'shop', i: 1 }, { at: 'board', row: 0, lane: 0 }];
  const unrefs = ['-', 'B0', 'B12', 'B123', 'F00', 'F21', 'F30', 'F02', 'B', 'X1', 'B1\n', 'F10\n', ' B1', ''];
  const gains = [null, [], [{ id: 'PL-2', key: 'hp', row: 0, lane: 1, amount: 2.5, side: 0 }], 'x'];
  const L = RL.newRunLog(4294967297, 'abcdef01', 1234.9, ' n ');
  const push = [['st', [], 0, 5, 1300], ['by', [1, 'B0'], 5, 2, 9999], ['nope', [], 1, 1, 1], ['toString', [], 1, 1, 1], ['en', [1, 0, []], 2, 2, 400]].map(([t, a, g0, g1, now]) => RL.rlPush(L, t, a, g0, g1, now));
  return { kind: 'rlmisc', names: names.map(s => [s, RL.rlName(s)]), refs: refs.map(x => [x, RL.rlRef(x)]), unrefs: unrefs.map(s => [s, RL.rlUnref(s) === undefined ? 'undefined' : RL.rlUnref(s)]),
    gains: gains.map(g => [g, RL.rlGains(g)]), push, log: L, jsThrows };
}

function* checkLines(chars, rng, mruns, rlogs, hist) {
  const cm = makeCharMap(chars);
  const out = (what, x, f) => { const v = tryJs(() => f(x)); return v ? { kind: 'check', what, x, res: v.v } : null; };
  for (const m of mruns.slice(0, 6)) for (const mm of m.matches.slice(0, 6)) {
    for (let k = 0; k < 6; k++) { const o = out('stats', mutate(mm.stats, rng), s => SV.validateStats(s, cm)); if (o) yield o; }
    yield out('replay', mm.entry, x => SV.checkReplay(x, cm));
    for (let k = 0; k < 8; k++) { const o = out('replay', mutate(mm.entry, rng), x => SV.checkReplay(x, cm)); if (o) yield o; }
    yield out('play', mm.play, x => SV.checkPlayRecord(x, cm));
    for (let k = 0; k < 8; k++) { const o = out('play', mutate(mm.play, rng), x => SV.checkPlayRecord(x, cm)); if (o) yield o; }
  }
  for (const b of [{ boss: 'B1', k: 2 }, { boss: 'B1', k: 2, x: 1 }, { boss: 'B1', k: 2, x: 2 }, { boss: 'a b', k: 1 }, { boss: 'B', k: 0 }, { boss: 'B', k: 1.5 }, { boss: 'B', k: 1, y: 1 }, [], null, 'B1'])
    yield out('boss', b, x => SV.isBossFoe(x));
  const hl = hist.map(h => copy(h));
  yield out('hist', JSON.stringify(hl), t => SV.readHistory(t));
  for (let k = 0; k < 60; k++) { const o = out('hist', JSON.stringify(mutate(hl, rng)), t => SV.readHistory(t)); if (o) yield o; }
  for (const t of ['', '[', '{}', 'null', JSON.stringify(Array(25).fill(hl[0])), 'x'.repeat(50001), 7]) yield out('hist', t, x => SV.readHistory(x));
  yield { kind: 'check', what: 'push', x: [hl, hl[0]], res: SV.pushHistory(Array(25).fill(hl[0]), hl[1] || hl[0]).length };
  for (const L of rlogs.slice(0, 8)) for (let k = 0; k < 12; k++) {
    const b = copy(L);
    if (b.ev.length && k < 6) b.ev[rng.int(b.ev.length)] = mutate(b.ev[rng.int(b.ev.length)], rng); else Object.assign(b, mutate({ ...b, ev: b.ev.slice(0, 3) }, rng));
    const o = out('rlcheck', b, x => RL.rlCheck(x)); if (o) yield o;
  }
  for (const e of [[['st'], 0, 5, 5], ['toString', 0, 1, 1], ['tk', 0, 1, 1, 2, 'x'], ['tk', 0, 1, 1, 2, TRIBES[0]], ['pl', 0, 1, 1, 'U8', 'B1', 0], ['pl', 0, 1, 1, 'U8', 'F11', 1], ['en', 0, 1, 1, 1, 0, [['PL-2', 'hp', 0, 1, 1.7e308]]], ['by', 1.5, 1, 1, 0, 'B0'], ['sl', 0, 1, 1, '-'], ['of', 0, 1, 1, 'sc'], ['st', 0, -1e6, 1e7], ['st', 0, 1]])
    yield out('rlcheck', { v: 1, seed: 1, data: '0000000a', at: 0, cut: 0, ev: [e] }, x => RL.rlCheck(x));
  for (const t of ['abc', '😀😀', 'a\u200b', '']) yield out('rlcheck', { v: 1, seed: 1, data: '0000000a', at: 0, cut: 1, ev: [], nm: t }, x => RL.rlCheck(x));
}

// JSON.stringify bytes (save.gd js_json / rules.gd js_num): control chars, quotes, unicode, number layouts (plain / exponent)
function jsonLine() {
  const str = Array.from({ length: 31 }, (_, i) => String.fromCharCode(i + 1)).join('') + '"\\/\u007f ไทย 😀 \u2028\u2029\u00a0';
  const nums = [0.1, 0.30000000000000004, 1e21, 1e-7, 123.456, 1.7976931348623157e308, 2 ** 53 + 2, 1 / 3, 1e-6, 123456789012345680000, 3.25, -0.5, -1e-7, 1.5e300, 2.5e-10, 1e20, 0.000001234, 4294967296.5, -0, 2.2250738585072014e-308, 1e-300, 12345.678e10, 9.2e18, 9.3e18];
  const vals = [str, nums, { a: [1, null, true, false, 'x'], b: {}, c: [], 'k"\n': { d: -2 } }, null, '', 0];
  return { kind: 'json', vals, out: vals.map(v => JSON.stringify(v)) };
}
// addMatchStats on made-up burn-heavy fights (the + 1e-9 before floor, shares after cleanse / down)
function* statsLines(rng) {
  const cases = [];
  for (let i = 0; i < 300; i++) {
    const evs = [{ k: 'start', units: [1, 2, 3, 4, 5, 6].map(u => ({ uid: u, id: ['PL-2', 'SF-7', 'AQ-1'][u % 3], side: u <= 3 ? 0 : 1 })) }];
    for (let k = 0; k < 6 + rng.int(20); k++) {
      const to = 4 + rng.int(3), t = rng.int(10);
      if (t < 4) { const amount = rng.pick([0.1, 0.2, 0.3, 1 / 3, 0.7, 1, 2.5]) * (1 + rng.int(3)); evs.push({ k: 'burn', to, from: rng.int(6) ? 1 + rng.int(6) : null, amount, total: amount + rng.int(4) * 0.1 }); }
      else if (t < 7) evs.push({ k: 'dmg', to, from: 1 + rng.int(6), amount: rng.pick([0.1, 0.3, 0.7, 1.9, 3, 0]) * (1 + rng.int(4)), why: rng.int(3) ? 'burn' : 'hit' });
      else if (t === 7) evs.push({ k: 'cleanse', to, what: rng.pick(['pct', 'all']) });
      else if (t === 8) evs.push({ k: 'down', who: to });
      else evs.push({ k: 'summon', unit: { uid: 10 + k, id: 'PL-2', side: rng.int(2) } });
    }
    const res = { winner: rng.pick([0, 1, null]), timeMs: rng.int(90000) + 0.5, events: evs }, st = SV.newStats();
    cases.push({ res, st: SV.addMatchStats(SV.addMatchStats(st, res), res) });
  }
  // fixed edge cases: a share × an accumulated amount lands just under a whole number (floor needs the + 1e-9)
  const ds = [0.1, 0.2, 0.3, 0.7, 1 / 3, 0.6, 1.1, 2.9];
  let found = 0;
  for (const a1 of ds) for (const a2 of ds) for (let D = 0.1; D < 20 && found < 40; D += 0.1) {
    const v = D * (a1 / (a1 + a2));
    if (Math.floor(v) === Math.floor(v + 1e-9)) continue;
    found++;
    const evs = [{ k: 'start', units: [{ uid: 1, id: 'PL-2', side: 0 }, { uid: 2, id: 'SF-7', side: 0 }, { uid: 9, id: 'AQ-1', side: 1 }] },
      { k: 'burn', to: 9, from: 1, amount: a1, total: a1 }, { k: 'burn', to: 9, from: 2, amount: a2, total: a1 + a2 }, { k: 'dmg', to: 9, amount: D, why: 'burn' }];
    const res = { winner: 0, timeMs: 1000, events: evs };
    cases.push({ res, st: SV.addMatchStats(SV.addMatchStats(SV.newStats(), res), res) });
  }
  yield { kind: 'stats', cases };
}

function* saveLines(chars, rng, hash, snaps, mruns) {
  const cm = makeCharMap(chars);
  let i = 0;
  for (const st of snaps.slice(0, 200)) {
    const bot = i % 5 === 4;
    yield { kind: 'state', i: i++, st, bot, res: SV.validateRunState(st, cm, RULES, bot ? { bot: true } : {}) };
    for (let k = 0; k < 3; k++) { const x = mutate(st, rng), v = tryJs(() => SV.validateRunState(x, cm, RULES, {})); if (v) yield { kind: 'state', i: i++, st: x, bot: false, res: v.v }; }
  }
  // targeted: wins that are not numbers next to bw / extra (JS compares with ToNumber) · repeated / too many charges
  const base = snaps.find(x => SV.validateRunState(x, cm).ok);
  for (const w of ['5', '', ' 7 ', [3], [], {}, true, null, 'x', [1, 2]]) for (const bw of [0, 1]) for (const extra of [true, false]) {
    const x = copy(base); x.wins = w; x.bw = bw; x.extra = extra;
    yield { kind: 'state', i: i++, st: x, bot: false, res: SV.validateRunState(x, cm) };
  }
  for (const st of snaps.filter(x => SV.validateRunState(x, cm).ok)) {
    const bu = SH.allUnits(st).find(u => cm[u.u.id].skills.length > 1);
    if (!bu) continue;
    const c = { id: bu.u.id, uid: bu.u.uid, si: 0 }, c2 = { id: bu.u.id, uid: bu.u.uid, si: 1 };
    for (const ch of [[c], [c, c], [c, c2], [c2, c, c2], Array.from({ length: 12 }, (_, k) => ({ ...c, si: k }))]) {
      const x = copy(st); x.charges = ch;
      yield { kind: 'state', i: i++, st: x, bot: false, res: SV.validateRunState(x, cm) };
    }
    if (i > 2000) break;
  }
  const stats = mruns[0].matches.at(-1).stats;
  for (let k = 0; k + 1 < Math.min(snaps.length, 120); k += 2) {
    const P = copy(snaps[k]), B = copy(snaps[k + 1]); P.over = false; B.over = false;
    const text = SV.makeSave(P, B, stats, 1.7e12 + k, hash);
    yield { kind: 'mksave', P, B, stats, startedAt: 1.7e12 + k, hash, text };
    const texts = [text, text.slice(0, -3), text.replace('"sv":3', '"sv":2')];
    const o = JSON.parse(text);
    const v9 = copy(o); v9.P.v = 9; delete v9.P.fp; delete v9.P.op; delete v9.P.rn.ft; texts.push(JSON.stringify(v9));
    const v10 = copy(o); v10.P.v = 10; delete v10.P.op; v10.B.v = 10; delete v10.B.op; texts.push(JSON.stringify(v10));
    const v3 = copy(o); v3.P.v = 3; texts.push(JSON.stringify(v3));
    const ov = copy(o); ov.P.over = true; texts.push(JSON.stringify(ov));
    for (let m = 0; m < 4; m++) texts.push(JSON.stringify(mutate(o, rng)));
    for (const t of texts) { const v = tryJs(() => SV.readSave(t, cm, RULES, hash)); if (v) yield { kind: 'save', i: i++, text: t, hash, res: v.v }; }
  }
  for (const t of ['', null, 5, '{', 'x'.repeat(200001), '[]', '{"sv":3}']) yield { kind: 'save', i: i++, text: t, hash, res: SV.readSave(t, cm, RULES, hash) };
  yield { kind: 'save', i: i++, text: SV.makeSave(snaps[0], snaps[1], stats, 1, hash), hash: 'ffffffff', res: SV.readSave(SV.makeSave(snaps[0], snaps[1], stats, 1, hash), cm, RULES, 'ffffffff') };
}

function* codeLines(chars, rng, hash, mruns, rlogs) {
  const cm = makeCharMap(chars);
  const histText = JSON.stringify(mruns.map(m => m.hist));
  for (let i = 0; i < Math.min(mruns.length, rlogs.length); i++) {
    const a = mruns[i], b = mruns[(i + 1) % mruns.length];
    const args = { replayTexts: [a.replays, i % 3 ? b.replays : '{bad', 'x'], historyText: i % 4 ? histText : '', pageHash: hash, at: 1.7e12 + i + 0.7,
      logTexts: [JSON.stringify(rlogs[i]), i % 2 ? JSON.stringify(rlogs[(i + 1) % rlogs.length]) : '[]'], name: rng.pick(['', ' Nut ', 'ผู้ทดสอบ\u200b']) };
    const code = SV.makeRunCode(args.replayTexts, args.historyText, args.pageHash, args.at, RULES, args.logTexts, args.name);
    const parsed = code ? SV.parseRunCode(code, cm) : null;
    yield { kind: 'code', i, args, code, parsed };
    if (code && i < 12) {
      const o = JSON.parse(code.slice(6));
      const bads = ['', 'ARUN1', 'ARUN2 {}', 'ARUN1 {', '  ' + code + '\n\ufeff', code.replace('"v":2', '"v":3')];
      for (let k = 0; k < 10; k++) bads.push('ARUN1 ' + JSON.stringify(mutate(o, rng)));
      for (const t of bads) { let err = null, p = null; try { p = SV.parseRunCode(t, cm); } catch (e) { err = e.message; } if (err === null || err) yield { kind: 'badcode', text: t, err, parsed: err ? null : p }; }
    }
  }
  yield { kind: 'code', i: -1, args: { replayTexts: [], historyText: '', pageHash: hash, at: 0, logTexts: [], name: '' }, code: SV.makeRunCode([], '', hash, 0, RULES, [], ''), parsed: null };
}

export function* saveGolden(cfg, chars) {
  jsThrows = 0;
  const hash = SV.dataHash(chars), rng = makeRng(1963), n = Math.max(3, Math.round(cfg.shopSeqs / 15)), snaps = [], states = [];
  yield hashLine(chars);
  const mruns = [];
  for (const l of mrunLines(n, chars, hash, states)) { mruns.push(l); yield l; }
  const rlogs = [];
  for (const l of rlLines(n * 2, chars, hash, snaps)) { rlogs.push(l.log); yield l; }
  yield* checkLines(chars, rng, mruns, rlogs, mruns.map(m => m.hist));
  yield* saveLines(chars, rng, hash, snaps, mruns);
  yield jsonLine();
  yield* statsLines(rng);
  yield* codeLines(chars, rng, hash, mruns, rlogs);
  yield rlMisc();
}

// ---- check an ARUN1 code that Godot wrote, with the Balance Room's reader (lab/humanstats.js) + parseRunCode + rlReplay ----
async function checkGodotCode(file) {
  const { hsRunSync } = await import('./humanstats.js');
  const chars = buildCharacterList(), cm = makeCharMap(chars), hash = SV.dataHash(chars), text = readFileSync(file, 'utf8');
  const rc = SV.parseRunCode(text, cm, RULES); // throws on a bad code
  const bad = [];
  if (rc.page !== hash) bad.push(`page hash ${rc.page} ≠ ${hash}`);
  if (!rc.runs.length || !rc.logs.length || !rc.hist.length) bad.push(`empty part: runs ${rc.runs.length} logs ${rc.logs.length} hist ${rc.hist.length}`);
  for (const L of rc.logs) { const R = RL.rlReplay(L, chars, RULES, false); if (R.firstBad >= 0) bad.push(`journal gold differs at step ${R.firstBad + 1}`); }
  const H = hsRunSync([text], { chars, CM: cm, rules: RULES, hash });
  if (H.bad.length || H.codes !== 1 || !H.matches || H.unsim) bad.push('humanstats: ' + JSON.stringify({ bad: H.bad, codes: H.codes, matches: H.matches, unsim: H.unsim, old: H.old }));
  console.log(`godot ARUN1: ${rc.runs.length} replay runs (${rc.runs.reduce((s, r) => s + r.list.length, 0)} matches) · ${rc.logs.length} journals (${rc.logs.reduce((s, l) => s + l.ev.length, 0)} steps) · ${rc.hist.length} history · ${bad.length ? 'FAIL ' + bad.join(' · ') : 'OK'}`);
  if (bad.length) process.exit(1);
}
if (process.argv[2] === 'check' && import.meta.url.endsWith(process.argv[1].split('/').pop())) checkGodotCode(process.argv[3]).catch(e => { console.error('godot ARUN1: FAIL', e.message); process.exit(1); });
