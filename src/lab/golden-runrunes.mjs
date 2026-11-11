// Godot plan step 6c (set 195): golden runrunes.jsonl = answers of core/runrunes.js for the Godot port.
// Lines (inputs go through a JSON round trip first; numbers written with exactNums by the caller):
//   {kind:'stages', list}                              the stage variants used below (default first)
//   {kind:'seq', i, sv, st0, steps:[{a, res, st, q}]}   a scripted action list on a run state; after every action: the result, the
//        changed state (rn, gold, hearts, sc, board/bench uids) and queries (reroll cost, rnFx, interest, wear, unworn, compact,
//        equips, perm multipliers, flag choices). sv = stage variant index (STAGE_VARIANTS).
//        Board actions (move / sell / merge) are test-script edits the Godot test repeats (they stand in for shop.js, ported in 6d).
//   {kind:'foe', i, units, pct, round, res}            rnFoeScale
//   {kind:'compact', i, list, ok, from}                rnCompactOk + rnFromCompact on legal and broken lists
//   {kind:'validate', i, rn, errors}                   rnValidate on legal and broken rune states
//   {kind:'all', all, all2, recs, recs2, spec, needs}  rnAll + rnRec (default + variant 2) + rnSpecNum + rnNeedsSlot/Partner
// Random parts use the game's own rng (seeded) → byte-identical every run.
import { RULES, TRIBES } from '../core/rules.js';
import { makeRng } from '../core/rng.js';
import { makeCharMap, buildTeam } from '../core/team.js';
import { SLOT_ORDER } from '../core/shop.js';
import { RUN_STAGE } from '../core/runboss.js';
import * as RR from '../core/runrunes.js';

const copy = v => JSON.parse(JSON.stringify(v));

// stage variants: default · more cards + boss mix · one rare rune only + everything else off (pool runs dry fast)
export function stageVariants() {
  const d = RUN_STAGE;
  const v1 = copy(d); Object.assign(v1.settings, { offCards: 5, offBossC: 1, offBossR: 2, offBossL: 1, offScL: 4, rrFree: 0, rrCost: 2, rrStep: 5 });
  Object.assign(v1.runes.T3, { slots: 2 }); Object.assign(v1.runes.T2, { del: false }); Object.assign(v1.runes.X8, { minHearts: 1, gold: 7 }); // reach the shopSlots cap 3 · interest on · heart trade down to 1 heart (second chance)
  const v2 = copy(d); for (const id of Object.keys(v2.runes)) v2.runes[id].on = id === 'T5' || id === 'T9' || id === 'X1';
  v2.custom = [{ ...copy(d.runes.T8), id: 'K1', on: true, del: false, max: 2 }, { ...copy(d.runes.S8), id: 'K2', on: true, del: true }];
  return [d, v1, v2];
}

const uids = st => ({ board: st.board.map(r => r.map(u => (u ? u.uid : null))), bench: st.bench.map(u => (u ? u.uid : null)) });
function snap(st) { return { rn: copy(st.rn), gold: st.gold, hearts: st.hearts, sc: st.sc, ...uids(st) }; }
function queries(st, stage, cm) {
  const fx = RR.rnFx(st, stage), ids = Object.keys(st.rn.bag);
  const perm = [];
  for (const row of st.board) for (const u of row) if (u) perm.push(RR.rnPermMul(st, u, stage));
  return { cost: RR.rnRerollCost(st, stage), fx, intr: [RR.rnInterest(st.gold, fx), RR.rnInterest(0, fx), RR.rnInterest(-5, fx), RR.rnInterest(97, fx)],
    wear: ids.map(id => RR.rnWear(st, id, stage)), unworn: RR.rnUnworn(st, stage), compact: RR.rnCompact(st), equips: RR.rnEquips(st, stage),
    perm, flag: RR.rnFlagChoices(st, cm), slots: ids.map(id => [RR.rnSlotOf(st, id), RR.rnSlotOf(st, id, true)]), held: ids.map(id => RR.rnHeld(st, id)) };
}

// a run state with random units on the board / bench (only uid + id matter to runrunes.js)
function startState(rng, chars, seed) {
  const st = { seed, gold: rng.int(40), hearts: 1 + rng.int(5), round: rng.int(22), sc: rng.int(4) === 0 ? 1 : 0, over: rng.int(25) === 0,
    board: [[null, null], [null, null], [null, null]], bench: Array(RULES.shop.bench).fill(null), uid: 1, rn: RR.newRunes() };
  const nb = 1 + rng.int(6), slots = SLOT_ORDER.slice();
  for (let k = 0; k < nb; k++) { const [r, l] = slots.splice(rng.int(slots.length), 1)[0]; st.board[r][l] = { uid: st.uid++, id: rng.pick(chars).id, level: 1 + rng.int(3) }; }
  for (let k = rng.int(4); k-- > 0;) st.bench[rng.int(st.bench.length)] = { uid: st.uid++, id: rng.pick(chars).id, level: 1 };
  if (rng.int(3) === 0) { const all = Object.keys(RUN_STAGE.runes).filter(id => RR.rnRec(id)); for (let k = rng.int(5); k-- > 0;) { const id = rng.pick(all); st.rn.bag[id] = 1; } }
  if (rng.int(6) === 0) st.rn.at.S8 = [0, 0]; // old save form (slot array) — read as the unit on that slot
  if (rng.int(8) === 0) { st.rn.bag.S8 = 1; st.rn.ft = undefined; delete st.rn.ft; } // very old save without ft
  return st;
}

function boardUnits(st) { const out = []; for (let r = 0; r < st.board.length; r++) for (let l = 0; l < st.board[r].length; l++) if (st.board[r][l]) out.push([r, l]); return out; }

// one random action → [op, ...args] (all JSON) · applyAction runs it (same code path the Godot test mirrors)
function pickAction(rng, st, stage) {
  const ids = Object.keys(st.rn.bag), bu = boardUnits(st);
  const o = st.rn.offer;
  const k = rng.int(o ? 4 : 14);
  if (o) {
    if (k === 0) return ['reroll'];
    if (k === 1 && rng.int(3) === 0) return ['skip'];
    return ['take', rng.int(8) === 0 ? rng.pick([-1, 9, 1.5]) : rng.int(o.ids.length), rng.int(2) ? rng.pick([...TRIBES, 'น้ำ']) : null];
  }
  switch (k) {
    case 0: case 1: case 2: return ['offer', rng.pick(['win', 'win', 'boss', 'sc', 'bad']), rng.int(4) === 0 ? ids.slice(0, 3) : []];
    case 3: case 4: { if (!ids.length) return ['offer', 'win', []]; const id = rng.pick(ids);
      const slot = rng.int(6) === 0 ? null : rng.int(5) === 0 ? rng.pick([[3, 0], [0, 2], [0.5, 0], [0], 'x']) : rng.int(4) === 0 ? rng.pick(SLOT_ORDER) : bu.length ? rng.pick(bu) : [0, 0];
      return ['place', rng.int(10) === 0 ? 'ZZ' : id, slot, rng.int(4) === 0]; }
    case 5: return ['heart'];
    case 6: return ['gold', rng.int(30)];
    case 7: if (bu.length) { return ['move', rng.pick(bu), rng.pick(SLOT_ORDER)]; } return ['heart'];
    case 8: if (bu.length) return ['sell', rng.pick(bu)]; return ['heart'];
    case 9: if (bu.length >= 2) { const a = rng.pick(bu), b = rng.pick(bu.filter(x => x !== a)); return ['merge', a, b]; } return ['heart'];
    case 10: { const bi = st.bench.findIndex(u => u); if (bi >= 0) return ['toBoard', bi, rng.pick(SLOT_ORDER)]; return ['gold', 3]; }
    case 11: return ['round', rng.int(20)];
    default: return ['offer', 'win', []];
  }
}
// board edits stand in for shop.js (ported in 6d): move = swap two slots · sell = remove + rnSync · merge = b gone, a gets new uid, rnSync(merged) · toBoard = swap bench ↔ slot
export function applyAction(st, a, stage, rules = RULES) {
  const [op, x, y, z] = a;
  switch (op) {
    case 'offer': return { offer: RR.rnMakeOffer(st, x, stage, y) };
    case 'reroll': return RR.rnRerollOffer(st, stage);
    case 'skip': return RR.rnSkipOffer(st);
    case 'take': return RR.rnTakeOffer(st, x, stage, y);
    case 'place': return RR.rnPlace(st, x, y, rules, z);
    case 'heart': return RR.rnHeartTrade(st, stage);
    case 'gold': st.gold = x; return null;
    case 'round': st.round = x; st.rn.ro = 0; st.rn.traded = false; return null;
    case 'move': { const u = st.board[x[0]][x[1]]; st.board[x[0]][x[1]] = st.board[y[0]][y[1]]; st.board[y[0]][y[1]] = u; RR.rnSync(st); return null; }
    case 'sell': st.board[x[0]][x[1]] = null; RR.rnSync(st); return null;
    case 'merge': { const ua = st.board[x[0]][x[1]], ub = st.board[y[0]][y[1]]; st.board[y[0]][y[1]] = null;
      const res = { uid: st.uid++, id: ua.id, level: Math.min(3, ua.level + 1) }; st.board[x[0]][x[1]] = res; RR.rnSync(st, { from: [ua.uid, ub.uid], to: res.uid }); return null; }
    case 'toBoard': { const u = st.bench[x]; st.bench[x] = st.board[y[0]][y[1]]; st.board[y[0]][y[1]] = u; RR.rnSync(st); return null; }
  }
  throw new Error('golden runrunes: unknown action ' + op);
}

function* seqLines(n, seed, chars) {
  const rng = makeRng(seed), cm = makeCharMap(chars), stages = stageVariants();
  for (let i = 0; i < n; i++) {
    const sv = i % 3, stage = stages[sv];
    const st = copy(startState(rng, chars, rng.int(4294967295)));
    if (sv === 1 && i % 2) { st.rn.bag.T3 = 2; st.rn.bag.X8 = 1 + (i % 3); st.hearts = 1 + (i % 2) * rng.int(3); } // variant 1: reach the slot cap · heart trade → second chance
    const st0 = copy(st), steps = [];
    for (let s = 0, len = 10 + rng.int(40); s < len; s++) {
      const a = copy(pickAction(rng, st, stage));
      const res = applyAction(st, a, stage);
      steps.push({ a, res: res === null ? null : copy(res), st: snap(st), q: copy(queries(st, stage, cm)) });
    }
    yield { kind: 'seq', i, sv, st0, steps };
  }
}

function* foeLines(n, seed, chars) {
  const rng = makeRng(seed), cm = makeCharMap(chars);
  const withSummon = chars.filter(c => c.skills.some(s => s.do === 'summon')).map(c => c.id);
  for (let i = 0; i < n; i++) {
    const size = 1 + rng.int(6), slots = SLOT_ORDER.slice();
    const entries = Array.from({ length: size }, (_, k) => { const [row, lane] = slots.splice(rng.int(slots.length), 1)[0]; return { id: k === 0 && withSummon.length && rng.int(2) ? rng.pick(withSummon) : rng.pick(chars).id, level: 1 + rng.int(3), row, lane }; });
    const units = copy(buildTeam(entries, cm, RULES));
    const pct = rng.pick([100, 100, 120, 85.5, 0, -5, 'x', 250, 133.3]), round = rng.pick([0, 5, 19, 20, 21, 25, 40, 2.7]);
    const stage = rng.int(3) ? RUN_STAGE : { ...RUN_STAGE, settings: { ...RUN_STAGE.settings, growFrom: 3, growPct: 12.5 } };
    yield { kind: 'foe', i, units, pct, round, grow: stage === RUN_STAGE ? null : stage.settings, res: RR.rnFoeScale(units, pct, stage, round) };
  }
}

function* compactLines(n, seed) {
  const rng = makeRng(seed), ids = [...Object.keys(RUN_STAGE.runes), 'K1', 'ZZ9', 'abc', 'S8'];
  for (let i = 0; i < n; i++) {
    const list = Array.from({ length: rng.int(6) }, () => {
      const x = { id: rng.pick(ids), n: 1 + rng.int(3) };
      if (rng.int(2)) x.s = rng.pick(SLOT_ORDER);
      if (rng.int(3) === 0) x.p = rng.pick(SLOT_ORDER);
      if (rng.int(4) === 0) x.t = Array.from({ length: 1 + rng.int(2) }, () => rng.pick(TRIBES));
      switch (rng.int(14)) {
        case 0: x.n = rng.pick([0, 10, 1.5, '2']); break;
        case 1: x.s = rng.pick([[3, 0], [0], [0.5, 1], 'a']); break;
        case 2: x.junk = 1; break;
        case 3: x.t = rng.pick([[], ['น้ำ'], 'x', [TRIBES[0], TRIBES[1], TRIBES[2], TRIBES[3]]]); break;
        case 4: x.id = rng.pick([5, 'A1234', 'a1', '']); break;
        default: break;
      }
      return x;
    });
    const odd = rng.int(20) === 0 ? rng.pick([null, {}, 'x', [null], [[1]]]) : list;
    yield { kind: 'compact', i, list: odd, ok: RR.rnCompactOk(odd, RULES), from: RR.rnFromCompact(odd) };
  }
}

function* validateLines(n, seed) {
  const rng = makeRng(seed), ids = Object.keys(RUN_STAGE.runes).filter(id => RR.rnRec(id));
  for (let i = 0; i < n; i++) {
    const rn = RR.newRunes();
    for (let k = rng.int(5); k-- > 0;) rn.bag[rng.pick(ids)] = 1;
    const bag = Object.keys(rn.bag);
    if (bag.length && rng.int(2)) rn.at[bag[0]] = rng.int(2) ? 1 + rng.int(50) : rng.pick(SLOT_ORDER);
    if (bag.length && rng.int(3) === 0) rn.pt[rng.pick(bag)] = 7;
    if (rng.int(3) === 0) rn.offer = { kind: rng.pick(['win', 'boss', 'sc']), ids: ids.slice(0, 1 + rng.int(3)) };
    if (bag.includes('T8')) rn.ft.T8 = [TRIBES[1]];
    const B = [
      () => { rn.bag.ZZ1 = 1; }, () => { if (bag[0]) rn.bag[bag[0]] = 99; else rn.bag.T1 = 0; }, () => { rn.bag.T1 = 1.5; },
      () => { rn.at.T1 = [3, 0]; }, () => { rn.at.T1 = 0; }, () => { rn.pt = []; }, () => { rn.ft = null; }, () => { rn.ft.T8 = ['น้ำ']; },
      () => { rn.ft.T1 = [TRIBES[0], TRIBES[1]]; rn.bag.T1 = 1; }, () => { rn.offer = { kind: 'bad', ids: ['T1'] }; }, () => { rn.offer = { kind: 'win', ids: [] }; },
      () => { rn.offer = { kind: 'win', ids: ['ZZ'] }; }, () => { rn.offer = { kind: 'win', ids: ['T1'], x: 1 }; }, () => { rn.n = -1; }, () => { rn.n = 2.5; },
      () => { rn.free = 100; }, () => { rn.ro = 1000; }, () => { rn.traded = 1; }, () => { rn.htu = 10; }, () => { rn.shadow = -1; }, () => { delete rn.ro; },
      () => { rn.extra = 1; }, () => { rn.bag = []; }, () => { rn.at = null; },
    ];
    if (i % 3) B[rng.int(B.length)]();
    const inp = copy(i % 97 === 5 ? null : i % 89 === 7 ? [rn] : rn);
    yield { kind: 'validate', i, rn: inp, errors: RR.rnValidate(inp, RULES) };
  }
}

function allLine() {
  const st = stageVariants()[2];
  const ids = [...Object.keys(RUN_STAGE.runes), 'K1', 'K2', 'ZZ', '', 5];
  const qs = ['gold', 'per', 'cap', 'mult', 'pct', 'nope'];
  return { kind: 'all', all: RR.rnAll().map(r => r.id), all2: RR.rnAll(st).map(r => r.id),
    recs: ids.map(id => RR.rnRec(id)), recs2: ids.map(id => RR.rnRec(id, st)),
    spec: RR.rnAll().map(r => qs.map(q => RR.rnSpecNum(r, q))), needs: RR.rnAll().map(r => [RR.rnNeedsSlot(r), RR.rnNeedsPartner(r)]) };
}

export function* runrunesGolden(cfg, chars) {
  yield { kind: 'stages', list: stageVariants() }; // the Godot test reads the variants from here (no second copy of the edits)
  yield allLine();
  yield* seqLines(cfg.rnSeqs, cfg.seed + 9, chars);
  yield* foeLines(cfg.rnSeqs, cfg.seed + 10, chars);
  yield* compactLines(cfg.rnSeqs * 2, cfg.seed + 11);
  yield* validateLines(cfg.rnSeqs * 2, cfg.seed + 12);
}
