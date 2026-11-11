// Godot plan step 6d (set 195): golden shop.jsonl = answers of core/shop.js for the Godot port.
// Lines (inputs go through a JSON round trip first; numbers written with exactNums by the caller):
//   {kind:'vars', chars, rules, stages}         the character-list, rules and stage variants used below (index 0 = the real game data)
//   {kind:'misc', ...}                          small helpers on fixed + edge inputs (levels, income, odds, giveAmt, okRef, tables)
//   {kind:'seq', i, cv, rv, sv, steps:[{a, res, st, q}]}   a scripted action list from newRun(seed): after every action the result,
//        the whole run state and queries (incomeOf, shopLvOf, teamEntries, firstEmptyBench). cv/rv/sv = chars/rules/stage variant.
//        'gold' / 'give' / 'place' / 'offer' are test-script edits (stand-ins for the page) the Godot test repeats.
//   {kind:'targets', i, cv, st, ref, self, to, s, res, n}   shopTargets on random boards (res = target uids, n = rng draws used)
// Random parts use the game's own rng (seeded) → byte-identical every run.
import { RULES, PERM_ABIL, PERM_STAT2, SHOP_T, SHOP_WHEN, DO_INFO, TRIBES, AT_ROWS, AT_LANES } from '../core/rules.js';
import { makeRng } from '../core/rng.js';
import { RUN_STAGE } from '../core/runboss.js';
import * as RR from '../core/runrunes.js';
import * as SH from '../core/shop.js';
import { stageVariants } from './golden-runrunes.mjs';

const copy = v => JSON.parse(JSON.stringify(v));
const SHOP_DO = Object.keys(DO_INFO).filter(k => DO_INFO[k].shop);

// chars variants: real list · every character gets 1–2 extra random shop skills (all targets / whens / chance / filters) and the legends are gone
export function charVariants(chars) {
  const rng = makeRng(1950);
  const v1 = copy(chars).filter(c => c.rarity !== 'ตำนาน');
  for (const c of v1) for (let k = 1 + rng.int(2); k-- > 0;) {
    const s = { when: rng.pick(SHOP_WHEN), do: rng.pick(SHOP_DO), to: rng.pick(SHOP_T), v: [1 + rng.int(5), 3 + rng.int(8), 6 + rng.int(20)] };
    if (s.to === 'allyAt') s.at = { row: rng.pick(AT_ROWS), lane: rng.pick(AT_LANES) };
    if (rng.int(4) === 0) s.chance = rng.pick([0, 25, 50, 99, 100]);
    if (rng.int(4) === 0) s.sameTribe = true;
    if (rng.int(5) === 0) s.skipSameId = true;
    c.skills.push(s);
  }
  return [chars, v1];
}
// rules variants: real · flat income + caps + merge 2 + no level table · broken odds (level 1 = legends only → fallback) + max level 2
export function rulesVariants() {
  const r1 = copy(RULES); Object.assign(r1.shop, { goldStep: 0, mergeCount: 2, roundLevels: [], winBonus: 0, slots: 4, bench: 3 });
  r1.permCaps = { hp: 30, atk: 4, armor: 10, cdPct: 20, healHit: 3, hpPct: 15 };
  const r2 = copy(RULES); r2.maxLevel = 2; r2.shop.levelOdds[0] = { 'ตำนาน': 100 }; r2.shop.levelOdds[1] = {}; Object.assign(r2.shop, { roundLevels: [1, 1, 2, 2, 3, 99, -4, 2.6], startGold: 30, rerollCost: 2 });
  r2.permSanityMax = 50;
  return [RULES, r1, r2];
}

const PERM = SH.PERM_KEYS;
// rune เงา (U8): sell the wearer → a Lv1 copy on the bench, as many times per run as U8 copies held (rn.shadow counts them)
function shadowCase(chars, held) {
  const st = SH.newRun(chars, 77), out = [];
  st.gold = 50; st.rn.bag.U8 = held;
  for (let k = 0; k < 4; k++) {
    const id = chars[k].id; st.board[0][0] = { uid: st.uid++, id, level: 1, perm: {}, paid: 3 };
    out.push(RR.rnPlace(st, 'U8', [0, 0], RULES), SH.sell(st, { at: 'board', row: 0, lane: 0 }, chars, RULES));
  }
  return { res: out, st };
}
function misc(rulesV, chars) {
  const rounds = [-3, 0, 1, 2, 3, 2.5, 7, 15, 16, 30, 'x', null];
  const per = rulesV.map(r => ({ levels: SH.shopLevels(r), lv: rounds.map(x => SH.lvForRound(x, r)), inc: rounds.map(x => SH.baseIncomeAt(x, r)),
    odds: [-1, 0, 1, 2, 7.5, 15, 99].map(x => SH.oddsAt(x, r)),
    income: [[0, false], [1, true], [5, false], [30, true]].map(([round, lastWon]) => SH.incomeOf({ round, lastWon }, r)) }));
  const keys = [...PERM, 'cdMs', 'cdStart', 'burnNoDecay', 'nope', 'share_frontAlly'];
  const give = keys.map(k => [1, 5, 250, 1500, 2.5].map(v => SH.giveAmt(k, v)));
  const st = SH.newRun([], 1);
  const refs = [null, 'x', {}, { at: 'bench', i: 0 }, { at: 'bench', i: 5 }, { at: 'bench', i: -1 }, { at: 'bench', i: 1.5 }, { at: 'board', row: 2, lane: 1 },
    { at: 'board', row: 3, lane: 0 }, { at: 'board', row: 0, lane: 2 }, { at: 'board', row: '0', lane: 0 }, { at: 'shop', i: 4 }, { at: 'shop', i: 5 }, { at: 'sky', i: 0 }];
  return { kind: 'misc', per, give, okRef: refs.map(r => SH.okRef(st, r)), th: SH.SHOP_GIVE_TH, permKeys: PERM, slotOrder: SH.SLOT_ORDER, newRun: SH.newRun([], 4294967297), shadow: [1, 2].map(h => shadowCase(chars, h)) };
}

const REFS = st => [...SH.SLOT_ORDER.map(([row, lane]) => ({ at: 'board', row, lane })), ...st.bench.map((_, i) => ({ at: 'bench', i }))];
const odd = rng => rng.pick([null, { at: 'shop', i: 0 }, { at: 'board', row: 3, lane: 0 }, { at: 'bench', i: 99 }, { at: 'board', row: 0.5, lane: 0 }, 'x']);
function owned(st) { return SH.allUnits(st).map(x => x.ref); }

// one action → [op, ...args] (all JSON)
function pickAction(rng, st, chars, rules) {
  const refs = REFS(st), own = owned(st), o = st.rn.offer;
  if (o) return rng.int(6) === 0 ? ['skip'] : ['take', rng.int(10) === 0 ? rng.pick([-1, 9]) : rng.int(o.ids.length), rng.int(3) ? null : rng.pick(TRIBES)];
  if (!st.op && !st.over) return rng.int(5) === 0 ? ['offer', rng.pick(['win', 'win', 'boss', 'sc'])] : ['start'];
  if (st.over) return rng.int(3) ? ['extra'] : rng.pick([['start'], ['buy', 0, null], ['end', true, [], false], ['reroll'], ['sell', own[0] || refs[0]]]);
  const k = rng.int(40);
  if (k < 10) { // buy: random slot · free / taken / odd destination
    const slot = rng.int(12) === 0 ? rng.pick([-1, 9, 1.5, 'a']) : rng.int(st.shop.length);
    return ['buy', slot, rng.int(3) === 0 ? null : rng.int(8) === 0 ? odd(rng) : rng.pick(refs)];
  }
  if (k < 13) { // buyMerge onto an owned copy when one is in the shop, else random
    const ids = st.shop.map((s, i) => [s.id, i]).filter(([id]) => id && own.some(r => SH.get(st, r).id === id));
    if (ids.length && rng.int(4)) { const [id, i] = rng.pick(ids); return ['buyMerge', i, rng.pick(own.filter(r => SH.get(st, r).id === id))]; }
    return ['buyMerge', rng.int(st.shop.length), rng.int(5) === 0 ? odd(rng) : rng.pick(refs)];
  }
  if (k < 16) { // sell: often a unit wearing a rune (shadow copy · runes back to the bag)
    const worn = own.filter(r => Object.values(st.rn.at).includes(SH.get(st, r).uid));
    if (worn.length && rng.int(2)) return ['sell', rng.pick(worn)];
    return ['sell', own.length && rng.int(6) ? rng.pick(own) : rng.int(3) ? rng.pick(refs) : odd(rng)];
  }
  if (k < 23) { // move: same-id pairs first (merges), else anywhere
    const pairs = [];
    for (const a of own) for (const b of own) if (a !== b && SH.get(st, a).id === SH.get(st, b).id && SH.get(st, a).level === SH.get(st, b).level) pairs.push([a, b]);
    if (pairs.length && rng.int(5)) return ['move', ...rng.pick(pairs)];
    return ['move', own.length && rng.int(5) ? rng.pick(own) : rng.int(4) ? rng.pick(refs) : odd(rng), rng.int(10) ? rng.pick(refs) : odd(rng)];
  }
  if (k < 26) return ['reroll'];
  if (k < 27) return ['lock', rng.int(10) === 0 ? rng.pick([-1, 1.5, 99]) : rng.int(st.shop.length)];
  if (k < 28) return ['gold', rng.int(40)];
  if (k < 30) { // place a held rune on a board unit (lure / fastMerge / shadow / permUp work only when worn)
    const ids = Object.keys(st.rn.bag), bu = own.filter(r => r.at === 'board');
    return ids.length ? ['place', rng.pick(ids), bu.length && rng.int(5) ? [rng.pick(bu).row, rng.pick(bu).lane] : null] : ['give', rng.pick(['X2', 'X3', 'U7', 'U8', 'T1', 'T2', 'T3', 'T4'])];
  }
  if (k < 31) return ['give', rng.pick(['X2', 'X3', 'U7', 'U8', 'T1', 'T2', 'T3', 'T4', 'X8'])];
  if (k < 32) return ['heart'];
  if (k < 35) return ['offer', rng.pick(['win', 'boss', 'sc'])]; // card while the shop round is open (game page) → round-start runes pay now
  // end match: won / boss + battle gains (legal ones on board units + broken ones)
  const gains = [];
  for (let n = rng.int(5); n-- > 0;) {
    const bu = own.filter(r => r.at === 'board'), r = bu.length ? rng.pick(bu) : { row: rng.int(3), lane: rng.int(2) }, u = st.board[r.row][r.lane];
    const g = { key: rng.pick(PERM), row: r.row, lane: r.lane, id: u ? u.id : 'XX', amount: 1 + rng.int(30) };
    switch (rng.int(10)) {
      case 0: g.amount = rng.pick([0, -3, 1e9, 2.5, '5', null, rules.permSanityMax, rules.permSanityMax + 1]); break;
      case 1: g.key = 'nope'; break;
      case 2: g.row = rng.pick([3, -1, 0.5]); break;
      case 3: g.id = 'ZZ'; break;
      default: break;
    }
    gains.push(rng.int(30) === 0 ? rng.pick([null, 'x', 5]) : g);
  }
  return ['end', rng.int(3) > 0, rng.int(20) === 0 ? rng.pick([null, 'x', {}]) : gains, rng.int(5) === 0];
}

// runs one action (the Godot test mirrors this switch)
export function applyAction(st, a, chars, rules, stage) {
  const [op, x, y, z] = a;
  switch (op) {
    case 'start': return SH.startRound(st, chars, rules);
    case 'offer': return { offer: RR.rnMakeOffer(st, x, stage) };
    case 'take': return SH.takeRune(st, x, chars, rules, y, stage);
    case 'skip': return RR.rnSkipOffer(st);
    case 'buy': return SH.buy(st, x, y, chars, rules);
    case 'buyMerge': return SH.buyMerge(st, x, y, chars, rules);
    case 'sell': return SH.sell(st, x, chars, rules);
    case 'move': return SH.move(st, x, y, chars, rules);
    case 'reroll': return SH.reroll(st, chars, rules);
    case 'lock': return SH.toggleLock(st, x);
    case 'end': return SH.endMatch(st, x, chars, rules, y, z, stage);
    case 'extra': return SH.continueExtra(st, rules);
    case 'heart': return RR.rnHeartTrade(st, stage);
    case 'gold': st.gold = x; return null;
    case 'give': st.rn.bag[x] = (st.rn.bag[x] || 0) + 1; return null;
    case 'place': return RR.rnPlace(st, x, y, rules);
  }
  throw new Error('golden shop: unknown action ' + op);
}
const queries = (st, rules) => ({ inc: SH.incomeOf(st, rules), lv: SH.shopLvOf(st, rules), team: SH.teamEntries(st), fe: SH.firstEmptyBench(st) });

function* seqLines(n, seed, charsV, rulesV, stages) {
  const rng = makeRng(seed);
  for (let i = 0; i < n; i++) {
    const cv = i % 2, rv = i % 3, sv = (i >> 1) % 2, chars = charsV[cv], rules = rulesV[rv], stage = stages[sv];
    const s0 = rng.int(4294967295), st = SH.newRun(chars, s0, rules), steps = [];
    const a0 = ['new', s0];
    steps.push({ a: a0, res: null, st: copy(st), q: copy(queries(st, rules)) });
    for (let s = 0, len = 40 + rng.int(80); s < len; s++) {
      const a = copy(pickAction(rng, st, chars, rules));
      const res = applyAction(st, a, chars, rules, stage);
      steps.push({ a, res: res === null ? null : copy(res), st: copy(st), q: copy(queries(st, rules)) });
    }
    yield { kind: 'seq', i, cv, rv, sv, steps };
  }
}

// shopTargets directly: random boards, every target kind, random filters
function* targetLines(n, seed, charsV) {
  const rng = makeRng(seed);
  for (let i = 0; i < n; i++) {
    const cv = i % 2, chars = charsV[cv], st = SH.newRun(chars, rng.int(4294967295));
    for (const [r, l] of SH.SLOT_ORDER) if (rng.int(3)) st.board[r][l] = { uid: st.uid++, id: rng.pick(chars).id, level: 1 + rng.int(3), perm: {}, paid: 3 };
    for (let k = rng.int(3); k-- > 0;) st.bench[rng.int(st.bench.length)] = { uid: st.uid++, id: rng.pick(chars).id, level: 1, perm: {}, paid: 3 };
    if (rng.int(3) === 0) { const all = owned(st); if (all.length) { const u = SH.get(st, rng.pick(all)); st.board[rng.int(3)][rng.int(2)] = { ...u, uid: st.uid++ }; } } // same id twice
    const own = owned(st), ref = own.length && rng.int(6) ? rng.pick(own) : rng.pick([null, { at: 'bench', i: 0 }, { at: 'board', row: 1, lane: 0 }]);
    const self = ref && ref.at !== 'shop' && SH.get(st, ref) ? ref : null;
    let to = rng.pick([...SHOP_T, 'nope']);
    if (!self && to === 'tribeAllies') to = 'allAllies'; // the game always passes a unit with tribeAllies (JS would throw)
    const s = rng.int(4) === 0 ? null : { at: rng.int(2) ? { row: rng.pick(AT_ROWS), lane: rng.pick(AT_LANES) } : undefined, sameTribe: rng.int(3) === 0, skipSameId: rng.int(3) === 0 };
    const inp = copy({ st, ref, self, to, s });
    const n0 = inp.st.n, selfU = inp.self ? SH.get(inp.st, inp.self) : null;
    const res = SH.shopTargets(inp.st, inp.ref, inp.to, selfU, chars, inp.s).map(u => u.uid);
    yield { kind: 'targets', i, cv, ...copy({ st, ref, self, to, s }), res, n: inp.st.n - n0 };
  }
}

export function* shopGolden(cfg, chars) {
  const charsV = charVariants(chars), rulesV = rulesVariants(), stages = stageVariants();
  yield { kind: 'vars', chars: charsV, rules: rulesV, stages: stages.slice(0, 2) };
  yield copy(misc(rulesV, chars));
  yield* seqLines(cfg.shopSeqs, cfg.seed + 13, charsV, rulesV, stages);
  yield* targetLines(cfg.shopSeqs * 2, cfg.seed + 14, charsV);
}
