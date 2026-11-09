// set 94 (phase 2b): runes inside the normal run — offers after a win, rune shop, run-only rune effects, save, bot tier pick
import { buildCharacterList } from '../core/characters.js';
import { RULES } from '../core/rules.js';
import { simulate } from '../core/battle.js';
import { buildTeam, makeCharMap } from '../core/team.js';
import { incomeOf, newRun, startRound, reroll, sell, move, merge, applyBattlePerm, endMatch } from '../core/shop.js';
import { dataHash, makeSave, newStats, readSave, validateRunState, replayEntry, checkReplay } from '../core/save.js';
import { equipRunes } from '../core/runes.js';
import { BOT_TEAMS } from '../core/botdata.js';
import { pickFoe, foeWantPct, foeFloorPct, foeWsPct } from '../core/botteams.js';
import { teamPower } from '../core/power.js';
import { RUN_STAGE } from '../core/runboss.js';
import { rnMakeOffer, rnRerollOffer, rnRerollCost, rnTakeOffer, rnRec, rnFoeScale, rnFx, rnHeartTrade, rnPlace, rnEquips, rnCompact, rnFromCompact, rnInterest, rnUnworn, rnWear } from '../core/runrunes.js';
import { runeCheckAll } from '../lab/runecheck.js';
import { eq, ok } from './helpers.js';

const chars = buildCharacterList(), cm = makeCharMap(chars);
const fresh = seed => { const P = newRun(chars, seed); startRound(P, chars); return P; };
const rarOf = ids => ids.map(id => rnRec(id).rarity);
const give = (P, id, n = 1) => { P.rn.bag[id] = n; };
const unit = (P, id, level = 1) => ({ uid: P.uid++, id, level, perm: {}, paid: cm[id].price });
const commonId = chars.find(c => c.rarity === chars[0].rarity).id;

export const TESTS_RUNRUN = [
  ['set 144: rune check — every active game rune does in a test fight / the shop what its description says (1 copy and max copies)', () => {
    const rows = runeCheckAll(chars, RUN_STAGE), bad = rows.filter(r => r.status === 'bad');
    ok(rows.length > 0, 'no active rune');
    ok(!bad.length, bad.map(r => `${r.id} ${r.name}: ` + r.tests.flatMap(t => t.lines.filter(l => !l.ok).map(l => `n${t.n} ${l.what} คาด ${l.exp} ได้ ${l.got}`)).slice(0, 3).join(' · ')).join(' | '));
    ok(rows.every(r => r.status !== 'info' || r.note), 'info rows must say why');
  }],
  ['set 107/171: win offers = 3 cards, each rolls rarity by RULES.runeOdds[round] (start table from the Balance Room, rev 57: r1 90/10/0) · boss = 2 legend · distinct · pick adds to bag', () => {
    const P = fresh(11), S = RUN_STAGE.settings;
    ok(!('rarC' in S) && !('rarR' in S) && !('rarL' in S), 'rarC/R/L moved to RULES.runeOdds');
    P.round = 1;
    const N = 600;
    for (const [m, want] of [['win', [RULES.runeOdds[0].common, RULES.runeOdds[0].rare, RULES.runeOdds[0].legend]]]) {
      const c = { common: 0, rare: 0, legend: 0 };
      for (let i = 0; i < N; i++) { const o = rnMakeOffer(P, m); eq(o.ids.length, 3, '3 cards'); ok(new Set(o.ids).size === 3, `${m} distinct`); for (const r of rarOf(o.ids)) c[r]++; }
      ['common', 'rare', 'legend'].forEach((r, i) => ok(Math.abs(c[r] / (N * 3) * 100 - want[i]) < 5, `${m} ${r} ≈ ${want[i]}% (got ${(c[r] / (N * 3) * 100).toFixed(1)})`));
    }
    eq(rarOf(rnMakeOffer(P, 'boss').ids).join(','), 'legend,legend', 'boss = pick 1 of 2 legend (user 5 Nov set 95)');
    const id = P.rn.offer.ids[0], r = rnTakeOffer(P, 0);
    ok(r.ok && P.rn.bag[id] === 1 && P.rn.offer === null, 'take → bag, offer cleared');
    ok(!rnTakeOffer(P, 0).ok, 'no offer → fail');
  }],
  ['set 171: rune card odds follow the round (RULES.runeOdds) · past the table = last row · edited table is used', () => {
    const P = fresh(21), N = 600, pct = (round, rar) => { P.round = round; let n = 0; for (let i = 0; i < N; i++) n += rarOf(rnMakeOffer(P, 'win').ids).filter(r => r === rar).length; return n / (N * 3) * 100; };
    eq(RULES.runeOdds.length, 15, '15 round rows');
    ok(RULES.runeOdds.every(o => o.common + o.rare + o.legend === 100), 'start table rows sum to 100');
    for (const r of [1, 5, 10, 15, 19]) { const o = RULES.runeOdds[Math.min(r, 15) - 1]; for (const k of ['common', 'rare', 'legend']) { const g = pct(r, k); ok(Math.abs(g - o[k]) < 5, `r${r} ${k} ≈ ${o[k]}% (got ${g.toFixed(1)})`); } }
    ok(pct(1, 'legend') === 0, 'round 1 never offers legend');
    const rr = RULES.runeOddsRounds; RULES.runeOddsRounds = 3; ok(Math.abs(pct(15, 'legend') - RULES.runeOdds[2].legend) < 4 && pct(2, 'legend') < 10, 'runeOddsRounds 3 = round 15 uses row 3'); RULES.runeOddsRounds = rr;
    const keep = RULES.runeOdds[0]; RULES.runeOdds[0] = { common: 0, rare: 0, legend: 100 };
    ok(pct(1, 'legend') === 100, 'edited row 1 = all legend'); RULES.runeOdds[0] = keep;
  }],
  ['set 94: copies per run cap offers (maxed rune never shows) · pool empty → filled from other rarities / no offer', () => {
    const P = fresh(12);
    give(P, 'X9', 1); // legend max 1
    for (let i = 0; i < 40; i++) { rnMakeOffer(P, 'win'); ok(!P.rn.offer.ids.includes('X9'), 'maxed X9 never offered'); }
    const Q = fresh(13);
    for (const [id, r] of Object.entries(RUN_STAGE.runes)) if (rnRec(id) && r.rarity === 'legend') give(Q, id, r.max);
    for (const c of RUN_STAGE.custom) if (rnRec(c.id) && c.rarity === 'legend') give(Q, c.id, c.max);
    const o = rnMakeOffer(Q, 'win');
    eq(o.ids.length, 3, 'legend pool empty → still 3 cards'); ok(!rarOf(o.ids).includes('legend'), 'no legend left');
  }],
  ['set 107: rune shop removed · enemy scale by % (power match) · 100 = untouched · summons too · replay keeps % + foe runes', () => {
    const P = fresh(14);
    ok(!('shop' in P.rn), 'no rune shop state');
    const sumId = chars.find(c => c.skills.some(k => k.do === 'summon'))?.id;
    const ents = [{ id: commonId, level: 2, row: 0, lane: 0 }, ...(sumId ? [{ id: sumId, level: 1, row: 1, lane: 0 }] : [])];
    const base = buildTeam(ents, cm), up = rnFoeScale(base, 120);
    eq(up[0].maxHp, Math.floor(base[0].maxHp * 1.2), 'hp × 120%'); eq(up[0].atk, Math.floor(base[0].atk * 1.2), 'atk × 120%');
    ok(rnFoeScale(base, 100) === base, '100 untouched'); ok(rnFoeScale(base, null) === base, 'null untouched');
    eq(rnFoeScale(base, null, RUN_STAGE, 25)[0].maxHp, Math.floor(base[0].maxHp * (1 + RUN_STAGE.settings.growPct / 100) ** (25 - RUN_STAGE.settings.growFrom + 1)), 'set 99: extra round 25 grows');
    eq(base[0].maxHp, buildTeam(ents, cm)[0].maxHp, 'input not mutated');
    if (sumId) { const k0 = base[1].skills.find(k => k.unit), k1 = up[1].skills.find(k => k.unit); ok(k0 && k1 && k1.unit.maxHp === Math.floor(k0.unit.maxHp * 1.2), 'summon scaled'); }
    const foe = [{ id: commonId, level: 1, row: 0, lane: 0 }];
    const res = simulate(buildTeam(foe, cm), rnFoeScale(buildTeam(foe, cm), 120), {});
    const x = replayEntry(3, foe, foe, res, [], 0, 120, [{ id: 'T4', n: 1 }], 2); eq([x.d, x.fn.length, x.fs], [120, 1, 2], 'replay keeps % + foe runes'); ok(checkReplay(x, cm, RULES), 'replay valid');
    ok(checkReplay({ ...x, d: 'ยาก' }, cm, RULES), 'old mode replay still readable'); ok(!checkReplay({ ...x, d: 'xx' }, cm, RULES), 'bad d rejected'); ok(!checkReplay({ ...x, d: 5 }, cm, RULES), 'd out of range');
    eq(replayEntry(5, foe, { boss: 'B1', k: 1 }, res, [], 0, 120).d, undefined, 'boss replay has no d');
    P.over = false; startRound(P, chars); eq(P.rn.ro, 0, 'reset each match'); eq(rnRerollCost(P), 0, 'free again');
    rnMakeOffer(P, 'boss'); ok(rnRerollOffer(P).ok && rarOf(P.rn.offer.ids).join(',') === 'legend,legend', 'boss reroll = 2 legend');
  }],
  ['set 119: enemy = real bot team closest in power · never scaled in the normal run (no streak) · extra matches +foeExtraPct · same seed → same team', () => {
    eq(foeWantPct(false), 100, 'normal run 100%'); eq(foeWantPct(true), 100 + RUN_STAGE.settings.foeExtraPct, 'extra +20%'); eq(RUN_STAGE.settings.foeExtraPct, 20, 'user: +20');
    for (const r of [4, 11, 15, 19]) eq(pickFoe(BOT_TEAMS, buildTeam(BOT_TEAMS.rounds[r - 1][0].team, cm), r, 777, false).pct, 100, `round ${r} normal = real team`);
    const R = 12, me2 = buildTeam(BOT_TEAMS.rounds[R - 1][0].team, cm), pw2 = teamPower(me2);
    const a = pickFoe(BOT_TEAMS, me2, R, 777, false), b = pickFoe(BOT_TEAMS, me2, R, 777, false), c = pickFoe(BOT_TEAMS, me2, R, 777, true);
    eq(JSON.stringify(a), JSON.stringify(b), 'deterministic');
    const pow = f => teamPower(rnFoeScale(buildTeam(f.team, cm), f.pct)); // round 0: no late growth
    ok(Math.abs(pow(a) / pw2 - 1) < 0.3, `enemy ≈ my power (${(pow(a) / pw2).toFixed(2)})`);
    eq(c.pct, 120, 'extra scaled +20%'); eq(RUN_STAGE.settings.foeBaseExtra, 120, 'set 141 user E2: extra pick ×120');
    const pc = c.round, pa = a.round; ok(BOT_TEAMS.rounds.flat().find(t => JSON.stringify(t.team) === JSON.stringify(c.team)).pw >= BOT_TEAMS.rounds.flat().find(t => JSON.stringify(t.team) === JSON.stringify(a.team)).pw * 0.9 || pc >= pa, 'extra pick not weaker');
    ok(Array.isArray(a.rn) && BOT_TEAMS.rounds.some(l => l.some(t => t.rn.length)), 'bot teams carry runes');
  }],
  ['set 141: win streak (user G1 H2 I3 J1 K2) — wanted power +10% per win from 2 in a row, no cap, real teams only (pct stays 100)', () => {
    eq(foeWsPct(0), 100, '0 wins'); eq(foeWsPct(1), 100, '1 win'); eq(foeWsPct(2), 110, '2 in a row +10'); eq(foeWsPct(3), 120, '3 +20'); eq(foeWsPct(12), 210, 'no cap');
    const R = 9, me = buildTeam(BOT_TEAMS.rounds[R - 1][0].team, cm);
    const pw = f => BOT_TEAMS.rounds.flat().find(t => JSON.stringify(t.team) === JSON.stringify(f.team)).pw;
    const f0 = pickFoe(BOT_TEAMS, me, R, 31, false), f6 = pickFoe(BOT_TEAMS, me, R, 31, false, RUN_STAGE, RULES, 0, 6);
    eq(f6.pct, 100, 'never scaled (real team)'); eq(f6.wsp, 150, 'ws 6 → +50%'); ok(pw(f6) > pw(f0), `streak picks a stronger real team (${pw(f0)} → ${pw(f6)})`);
    ok(BOT_TEAMS.rounds.every(l => l.filter(t => t.tier === 'แรงมาก').length === 4), 'user L3: 4 แรงมาก teams per round');
  }],
  ['set 119: heart trade X8 = 25 gold flat, once per copy (rune stays held) · second chance offer = legend cards, no reroll', () => {
    const P = fresh(51); give(P, 'X8', 2);
    eq(rnFx(P).heart.gold, 25, 'flat 25 (2 copies do not multiply)'); eq(rnFx(P).heart.left, 2, '2 uses');
    const g = P.gold; ok(rnHeartTrade(P).ok && P.gold === g + 25 && P.hearts === RULES.shop.hearts - 1, 'trade');
    ok(!rnHeartTrade(P).ok, 'once per round'); P.rn.traded = false;
    ok(rnHeartTrade(P).ok && rnFx(P).heart.left === 0, 'second copy used'); P.rn.traded = false;
    ok(!rnHeartTrade(P).ok && P.rn.bag.X8 === 2, 'all used → refused · rune still held');
    const Q = fresh(52); Q.hearts = 1; const r = endMatch(Q, false, chars, RULES);
    ok(r.second && !Q.over && Q.hearts === 1 && Q.sc === 1, 'second chance');
    const o = rnMakeOffer(Q, 'sc'); ok(o && o.ids.length === RUN_STAGE.settings.offScL && o.ids.every(id => rnRec(id).rarity === 'legend'), 'legend cards');
    ok(!rnRerollOffer(Q).ok, 'no reroll'); ok(rnTakeOffer(Q, 0).ok, 'take');
    const r2 = endMatch(Q, false, chars, RULES); ok(!r2.second && Q.over && Q.hearts === 0, 'only once per run');
  }],
  ['set 109 bug fix: a "one" rune is worn by the UNIT (not the board slot) · swap / bench / merge / sell · unworn list for the warning', () => {
    const P = fresh(41), other = chars.find(c => c.id !== commonId).id;
    const a = unit(P, commonId), b = unit(P, other);
    P.board = P.board.map(r => r.map(() => null)); P.bench = P.bench.map(() => null);
    P.board[0][0] = a; P.bench[0] = b;
    give(P, 'X3'); give(P, 'C3');
    eq(rnUnworn(P).sort(), ['C3', 'X3'], 'not worn yet → warning list');
    ok(!rnPlace(P, 'X3', [1, 0], RULES).ok, 'empty slot → fail');
    ok(rnPlace(P, 'X3', [0, 0], RULES).ok && rnPlace(P, 'C3', [0, 0], RULES).ok, 'worn by a');
    eq(rnUnworn(P), [], 'all worn');
    eq(rnFx(P).fast[commonId], 2, 'a merges with 2');
    move(P, { at: 'bench', i: 0 }, { at: 'board', row: 0, lane: 0 }, chars); // b swaps into a's slot, a goes to the bench
    eq(P.board[0][0], b, 'b on the slot');
    ok(!rnFx(P).fast[other], 'b does NOT get the rune (the old bug)'); eq(rnFx(P).fast[commonId], 2, 'a keeps the shop effect on the bench');
    eq(rnCompact(P).find(x => x.id === 'C3').s, undefined, 'battle rune: a on the bench → no slot, does nothing');
    eq(rnWear(P, 'C3'), 'bench', 'UI: worn unit on the bench'); eq(rnUnworn(P).sort(), ['C3', 'X3'], 'bench → warning');
    move(P, { at: 'bench', i: 0 }, { at: 'board', row: 2, lane: 1 }, chars);
    eq(rnCompact(P).find(x => x.id === 'C3').s, [2, 1], 'rune follows a to its new slot');
    const a2 = unit(P, commonId); P.bench[1] = a2;
    merge(P, [{ at: 'board', row: 2, lane: 1 }], { at: 'bench', i: 1 }, chars, RULES);
    ok(P.bench[1].level === 2 && rnWear(P, 'C3') === 'bench', 'merged: rune stays on the result (worn copy was the source)');
    sell(P, { at: 'bench', i: 1 }, chars);
    eq([P.rn.at.C3, P.rn.bag.C3], [undefined, 1], 'sold → rune back in the bag, not worn');
    const Q = fresh(42), q = unit(Q, commonId); Q.board[1][1] = q; give(Q, 'C3'); Q.rn.at.C3 = [1, 1]; // old save: slot array
    eq(rnCompact(Q).find(x => x.id === 'C3').s, [1, 1], 'old save slot still read');
  }],
  ['set 128: T11 copies multiply step + cap · T8 each copy counts its picked tribe · enemy locked at shop start (st.fp) · v9 save migrates', () => {
    const team = buildTeam([{ id: commonId, level: 1, row: 0, lane: 0 }], cm), T11 = rnRec('T11'), T8 = rnRec('T8');
    const amp = (n, ws) => equipRunes(team, [{ r: T11, n }], { winStreak: ws }).units[0].hitAmp || 0;
    eq([amp(1, 2), amp(2, 2), amp(1, 99), amp(2, 99)], [T11.stepPct * 2, T11.stepPct * 4, T11.maxPct, T11.maxPct * 2], 'T11 step × copies, cap × copies');
    const fx = equipRunes(team, [{ r: T8, n: 3, tribes: ['ไฟ?', 'สายฟ้า', 'สายฟ้า'] }]).tribeExtra;
    eq(fx.map(x => [x.tribe, x.count]).sort(), [[T8.tribe, T8.count], ['สายฟ้า', T8.count * 2]].sort(), 'T8 per-copy tribes (bad name → record tribe)');
    const P = fresh(77); P.board[0][0] = unit(P, commonId);
    ok(!rnTakeOffer(P, 0, undefined, 'วายุ').ok && !P.rn.ft.T8, 'no offer → fail, nothing stored');
    P.rn.offer = { kind: 'win', ids: ['T8'] }; ok(rnTakeOffer(P, 0, undefined, 'วายุ').ok, 'take flag');
    eq([P.rn.bag.T8, P.rn.ft.T8], [1, ['วายุ']], 'tribe stored');
    eq(rnCompact(P).find(x => x.id === 'T8').t, ['วายุ'], 'compact carries t');
    eq(rnFromCompact(rnCompact(P)).find(e => e.r.id === 'T8').tribes, ['วายุ'], 'fight list carries tribes');
    ok(validateRunState(P, cm, RULES).ok, 'state with ft valid');
    const Q = fresh(78); eq(Q.fp, 0, 'round 1 empty board → fp 0');
    Q.board[0][0] = unit(Q, commonId); Q.gold = 99; startRound(Q, chars);
    eq(Q.fp, Math.round(teamPower(buildTeam([{ id: commonId, level: 1, row: 0, lane: 0 }], cm))), 'fp = board power at shop start');
    const f1 = pickFoe(BOT_TEAMS, Q.fp, Q.round, Q.seed, false); Q.board[1][1] = unit(Q, chars[chars.length - 1].id, 1);
    eq(pickFoe(BOT_TEAMS, Q.fp, Q.round, Q.seed, false).team, f1.team, 'board change → same enemy (locked power)');
    ok(pickFoe(BOT_TEAMS, 0, 1, 5, false).team.length > 0, 'power 0 → median of the round cell');
    // set 127 (R1 C): floor = round median × foeFloor % · weak board meets ≥ median-ish teams · strong board unchanged · 0 = off
    const R7 = 7, med7 = (() => { const w = BOT_TEAMS.rounds[R7 - 1].filter(t => t.tier !== 'แรงมาก').map(t => t.pw).sort((a, b) => a - b); return w[w.length >> 1]; })();
    const st0 = s => ({ ...RUN_STAGE, settings: { ...RUN_STAGE.settings, foeFloor: s } });
    const weakOn = pickFoe(BOT_TEAMS, 1, R7, 9, false, st0(100)), weakOff = pickFoe(BOT_TEAMS, 1, R7, 9, false, st0(0));
    eq(weakOn.floor, Math.round(med7), 'floor = median'); eq(weakOff.floor, 0, 'floor off');
    const pwOf = f => BOT_TEAMS.rounds.flat().find(t => t.round === f.round && JSON.stringify(t.team) === JSON.stringify(f.team)).pw;
    ok(pwOf(weakOn) > pwOf(weakOff), 'weak board + floor → stronger enemy than without floor');
    const big = med7 * 3;
    eq(pickFoe(BOT_TEAMS, big, R7, 9, false, st0(100)).team, pickFoe(BOT_TEAMS, big, R7, 9, false, st0(0)).team, 'board above floor → same enemy');
    // set 129 → 132 (user): floor 100 · from 2 losses in a row (normal or boss) −20 per loss, min 40 · any win → back to 100
    eq([0, 1, 2, 3, 4, 5, 9].map(n => foeFloorPct(n)), [100, 100, 80, 60, 40, 40, 40], 'floor % by losses in a row (set 132: −20 per loss from 2, min 40)');
    eq(pickFoe(BOT_TEAMS, 1, R7, 9, false, undefined, undefined, 2).floor, Math.round(med7 * 0.8), 'ls 2 → floor median × 80%');
    eq(pickFoe(BOT_TEAMS, 1, R7, 9, false, undefined, undefined, 3).floor, Math.round(med7 * 0.6), 'ls 3 → floor median × 60%');
    const L = fresh(79); endMatch(L, false, chars, RULES, [], false); endMatch(L, false, chars, RULES, [], true); eq(L.ls, 2, 'boss loss counts');
    endMatch(L, true, chars, RULES, [], true); eq(L.ls, 0, 'boss win resets');
    const old = structuredClone(Q); old.v = 9; delete old.fp; delete old.rn.ft;
    const h = dataHash(chars, RULES), rs = readSave(makeSave(old, structuredClone(old), newStats(), 1, h), cm, RULES, h);
    eq([rs.status, rs.save && rs.save.P.v, rs.save && rs.save.P.fp > 0], ['ok', 10, true], 'v9 save → v10');
  }],
];
