// set 94 (phase 2b): runes inside the normal run — offers after a win, rune shop, run-only rune effects, save, bot tier pick
import { buildCharacterList } from '../core/characters.js';
import { RULES } from '../core/rules.js';
import { simulate } from '../core/battle.js';
import { buildTeam, makeCharMap } from '../core/team.js';
import { incomeOf, newRun, startRound, reroll, sell, move, applyBattlePerm, endMatch } from '../core/shop.js';
import { dataHash, makeSave, newStats, readSave, validateRunState, replayEntry, checkReplay } from '../core/save.js';
import { equipRunes } from '../core/runes.js';
import { BOT_TEAMS } from '../core/botdata.js';
import { pickBotTeam } from '../core/botteams.js';
import { RUN_STAGE } from '../core/runboss.js';
import { rnMakeOffer, rnRerollOffer, rnRerollCost, rnFoeTier, rnTakeOffer, rnRec, rnDiffPct, rnFoeScale, rnFx, rnHeartTrade, rnPlace, rnEquips, rnCompact, rnFromCompact, rnInterest } from '../core/runrunes.js';
import { eq, ok } from './helpers.js';

const chars = buildCharacterList(), cm = makeCharMap(chars);
const fresh = seed => { const P = newRun(chars, seed); startRound(P, chars); return P; };
const rarOf = ids => ids.map(id => rnRec(id).rarity);
const give = (P, id, n = 1) => { P.rn.bag[id] = n; };
const unit = (P, id, level = 1) => ({ uid: P.uid++, id, level, perm: {}, paid: cm[id].price });
const commonId = chars.find(c => c.rarity === chars[0].rarity).id;

export const TESTS_RUNRUN = [
  ['set 100: win offers = 3 cards, each rolls rarity by the mode % (ปกติ 80/15/5 · ยาก 10/75/15 · นรก 5/25/70) · boss = 2 legend · distinct · pick adds to bag', () => {
    const P = fresh(11), S = RUN_STAGE.settings;
    eq([S.rarNormalC, S.rarNormalR, S.rarNormalL, S.rarHardC, S.rarHardR, S.rarHardL, S.rarHellC, S.rarHellR, S.rarHellL], [80, 15, 5, 10, 75, 15, 5, 25, 70], 'user %');
    const N = 600;
    for (const [m, want] of [['ปกติ', [80, 15, 5]], ['ยาก', [10, 75, 15]], ['นรก', [5, 25, 70]]]) {
      const c = { common: 0, rare: 0, legend: 0 };
      for (let i = 0; i < N; i++) { const o = rnMakeOffer(P, m); eq(o.ids.length, 3, '3 cards'); ok(new Set(o.ids).size === 3, `${m} distinct`); for (const r of rarOf(o.ids)) c[r]++; }
      ['common', 'rare', 'legend'].forEach((r, i) => ok(Math.abs(c[r] / (N * 3) * 100 - want[i]) < 5, `${m} ${r} ≈ ${want[i]}% (got ${(c[r] / (N * 3) * 100).toFixed(1)})`));
    }
    eq(rarOf(rnMakeOffer(P, 'boss').ids).join(','), 'legend,legend', 'boss = pick 1 of 2 legend (user 5 Nov set 95)');
    const id = P.rn.offer.ids[0], r = rnTakeOffer(P, 0);
    ok(r.ok && P.rn.bag[id] === 1 && P.rn.offer === null, 'take → bag, offer cleared');
    ok(!rnTakeOffer(P, 0).ok, 'no offer → fail');
  }],
  ['set 94: copies per run cap offers (maxed rune never shows) · pool empty → filled from other rarities / no offer', () => {
    const P = fresh(12);
    give(P, 'X9', 1); // legend max 1
    for (let i = 0; i < 40; i++) { rnMakeOffer(P, 'ยาก'); ok(!P.rn.offer.ids.includes('X9'), 'maxed X9 never offered'); }
    const Q = fresh(13);
    for (const [id, r] of Object.entries(RUN_STAGE.runes)) if (rnRec(id) && r.rarity === 'legend') give(Q, id, r.max);
    for (const c of RUN_STAGE.custom) if (rnRec(c.id) && c.rarity === 'legend') give(Q, c.id, c.max);
    const o = rnMakeOffer(Q, 'ยาก');
    eq(o.ids.length, 3, 'legend pool empty → still 3 cards'); ok(!rarOf(o.ids).includes('legend'), 'no legend left');
  }],
  ['set 95/100: rune shop removed · mode scales enemy hp/atk (ปกติ 100 %) · boss unchanged · summons too', () => {
    const P = fresh(14);
    ok(!('shop' in P.rn), 'no rune shop state');
    const S = RUN_STAGE.settings, HP = S.modeHard, XP = S.modeHell; eq(S.modeNormal, 100, 'ปกติ = real teams (user)'); ok(HP > 100 && XP > HP, 'ยาก < นรก');
    eq([rnDiffPct('ปกติ'), rnDiffPct('ยาก'), rnDiffPct('นรก'), rnDiffPct(null), rnDiffPct('ง่าย')], [100, HP, XP, 100, 100], 'pct by mode');
    const sumId = chars.find(c => c.skills.some(k => k.do === 'summon'))?.id;
    const ents = [{ id: commonId, level: 2, row: 0, lane: 0 }, ...(sumId ? [{ id: sumId, level: 1, row: 1, lane: 0 }] : [])];
    const base = buildTeam(ents, cm), hard = rnFoeScale(base, 'ยาก'), hell = rnFoeScale(base, 'นรก');
    eq(hard[0].maxHp, Math.floor(base[0].maxHp * HP / 100), 'hard hp'); eq(hard[0].atk, Math.floor(base[0].atk * HP / 100), 'hard atk');
    eq(hell[0].maxHp, Math.floor(base[0].maxHp * XP / 100), 'hell hp');
    ok(rnFoeScale(base, 'ปกติ') === base, 'ปกติ untouched');
    ok(rnFoeScale(base, null) === base, 'boss untouched');
    eq(rnFoeScale(base, null, RUN_STAGE, 25)[0].maxHp, Math.floor(base[0].maxHp * (1 + RUN_STAGE.settings.growPct / 100) ** (25 - RUN_STAGE.settings.growFrom + 1)), 'set 99: extra round 25 grows');
    eq(base[0].maxHp, buildTeam(ents, cm)[0].maxHp, 'input not mutated');
    if (sumId) { const k0 = base[1].skills.find(k => k.unit), k1 = hard[1].skills.find(k => k.unit); ok(k0 && k1 && k1.unit.maxHp === Math.floor(k0.unit.maxHp * HP / 100), 'summon scaled'); }
    const foe = [{ id: commonId, level: 1, row: 0, lane: 0 }];
    const res = simulate(buildTeam(foe, cm), rnFoeScale(buildTeam(foe, cm), 'ยาก'), {});
    const x = replayEntry(3, foe, foe, res, [], 0, 'ยาก'); eq(x.d, 'ยาก', 'replay keeps difficulty'); ok(checkReplay(x, cm, RULES), 'replay with d valid');
    ok(!checkReplay({ ...x, d: 'xx' }, cm, RULES), 'bad d rejected');
    eq(replayEntry(5, foe, { boss: 'B1', k: 1 }, res, [], 0, 'ยาก').d, undefined, 'boss replay has no d');
  }],
  ['set 94: rune rolls use their own random stream (unit shop rolls unchanged)', () => {
    const A = fresh(15), B = fresh(15);
    for (let k = 0; k < 6; k++) rnMakeOffer(B, 'ยาก');
    startRound(A, chars); startRound(B, chars);
    eq(JSON.stringify(B.shop), JSON.stringify(A.shop), 'unit shop same');
  }],
  ['set 94: run-only runes — gold · interest (rune only) · shop slots · free reroll · heart trade', () => {
    const P = fresh(16);
    P.gold = 17; const inc1 = incomeOf(P).total; startRound(P, chars); const base = P.gold; // no runes: no interest
    eq(base, 17 + inc1, 'no interest without rune');
    give(P, 'T1', 2); give(P, 'T2', 1); give(P, 'T3', 1); give(P, 'T4', 1); give(P, 'X8', 1);
    const fx = rnFx(P); eq([fx.gold, fx.slots, fx.free], [4, 1, 1], 'gold ×copies / slots / free');
    eq(rnInterest(17, fx), 3, 'interest floor(17/5)×1'); eq(rnInterest(500, fx), 20, 'interest cap');
    P.gold = 17; const inc2 = incomeOf(P).total; startRound(P, chars);
    eq(P.gold, 17 + inc2 + 4 + 3, 'income + gold rune + interest');
    eq(P.shop.length, RULES.shop.slots + 1, 'shop +1 slot'); ok(P.shop.every(s => s.id), 'new slot filled');
    const g = P.gold; ok(reroll(P, chars).ok && P.gold === g && P.rn.free === 0, 'free reroll');
    ok(reroll(P, chars).ok && P.gold === g - RULES.shop.rerollCost, 'then paid');
    const h = P.hearts; ok(rnHeartTrade(P).ok && P.hearts === h - 1 && P.gold === g - RULES.shop.rerollCost + 10, 'heart → gold');
    ok(!rnHeartTrade(P).ok, 'once per round');
    P.hearts = 1; startRound(P, chars); ok(!rnHeartTrade(P).ok, 'not below min hearts');
  }],
  ['set 94: unit runes on a board slot — fast merge (2 copies) · shadow · perm up · lure', () => {
    const P = fresh(17);
    P.board[0][0] = unit(P, commonId); P.bench[0] = unit(P, commonId);
    ok(!move(P, { at: 'bench', i: 0 }, { at: 'board', row: 0, lane: 0 }, chars, RULES).ok, 'no rune: needs 3');
    give(P, 'X3'); rnPlace(P, 'X3', [0, 0], RULES);
    const r = move(P, { at: 'bench', i: 0 }, { at: 'board', row: 0, lane: 0 }, chars, RULES);
    ok(r.ok && P.board[0][0].level === 2 && !P.bench[0], 'merge with 2');
    give(P, 'U8'); rnPlace(P, 'U8', [0, 0], RULES);
    sell(P, { at: 'board', row: 0, lane: 0 }, chars, RULES);
    ok(P.bench.some(u => u && u.id === commonId && u.level === 1 && u.paid === 0), 'shadow copy back'); eq(P.rn.shadow, 1, 'used');
    P.board[0][0] = unit(P, commonId); const n0 = P.bench.filter(Boolean).length;
    sell(P, { at: 'board', row: 0, lane: 0 }, chars, RULES); eq(P.bench.filter(Boolean).length, n0, 'shadow 1 per run');
    P.board[1][0] = unit(P, commonId); give(P, 'U7'); rnPlace(P, 'U7', [1, 0], RULES);
    applyBattlePerm(P, [{ key: 'hp', amount: 10, row: 1, lane: 0, id: commonId }], chars, RULES, []);
    eq(P.board[1][0].perm.hp, 12, 'perm +20%');
    const Q = fresh(18), L = fresh(18), lid = chars.find(c => c.rarity === chars[0].rarity && c.id !== commonId).id;
    L.board[0][0] = unit(L, lid); give(L, 'X2'); rnPlace(L, 'X2', [0, 0], RULES);
    let a = 0, b = 0; for (let k = 0; k < 150; k++) { Q.gold = L.gold = 99; reroll(Q, chars); reroll(L, chars); a += Q.shop.filter(s => s.id === lid).length; b += L.shop.filter(s => s.id === lid).length; }
    ok(b > a * 1.5, `lure shows more (${a} → ${b})`);
  }],
  ['set 94: battle runes reach the fight · "one" rune needs a slot · compact form round-trips (replay)', () => {
    const P = fresh(19);
    P.board[0][0] = unit(P, commonId);
    give(P, 'S2', 1);
    eq(rnEquips(P).length, 0, 'unplaced one-rune does nothing');
    rnPlace(P, 'S2', [0, 0], RULES);
    const eqs = rnEquips(P); eq(eqs.length, 1, 'placed');
    const team = buildTeam([{ id: commonId, level: 1, row: 0, lane: 0 }], cm), e = equipRunes(team, eqs);
    eq(e.units[0].skills.length, team[0].skills.length + 1, 'rune skill added');
    const c = rnCompact(P); eq(rnFromCompact(c).length, 1, 'compact → equips');
    const res = simulate(e.units, buildTeam([{ id: commonId, level: 1, row: 0, lane: 0 }], cm), { tribeExtra: e.tribeExtra });
    ok(checkReplay(replayEntry(1, [{ id: commonId, level: 1, row: 0, lane: 0 }], [{ id: commonId, level: 1, row: 0, lane: 0 }], res, c), cm, RULES), 'replay entry with runes valid');
  }],
  ['set 94: save with runes passes · tampered runes rejected · pre-rune save (v3) = game updated', () => {
    const H = dataHash(chars), P = fresh(20), B = newRun(chars, 21); startRound(B, chars);
    give(P, 'T1', 2); give(P, 'S2', 1); rnPlace(P, 'S2', [1, 1], RULES); rnMakeOffer(P, 'กลาง');
    eq(validateRunState(P, cm).errors, [], 'state ok');
    eq(readSave(makeSave(P, B, newStats(), 1, H), cm, RULES, H).status, 'ok', 'save ok');
    const bad = f => { const X = structuredClone(P); f(X); return readSave(makeSave(X, B, newStats(), 1, H), cm, RULES, H).status; };
    eq(bad(X => { X.rn.bag.T1 = 9; }), 'bad', 'over max copies');
    eq(bad(X => { X.rn.bag.ZZ9 = 1; }), 'bad', 'unknown rune');
    eq(bad(X => { X.rn.at.T4 = [0, 0]; }), 'bad', 'slot for a rune not held');
    eq(bad(X => { X.rn.shop = []; }), 'bad', 'old rune shop field');
    eq(bad(X => { X.rn.evil = 1; }), 'bad', 'extra field');
    eq(bad(X => { X.v = 4; }), 'data', 'old v4 save → game updated');
  }],
  ['set 100: reroll = 1 free per match, then 3, 6, 9… gold · new cards · reset at round start · boss too · no gold → fail', () => {
    const P = fresh(30), S = RUN_STAGE.settings; eq([S.rrFree, S.rrCost, S.rrStep], [1, 3, 3], 'user numbers');
    ok(!rnRerollOffer(P).ok, 'no offer → fail');
    rnMakeOffer(P, 'ยาก'); P.gold = 100;
    const costs = [];
    for (let i = 0; i < 4; i++) { const before = P.gold, old = P.rn.offer.ids.slice(); costs.push(rnRerollCost(P)); ok(rnRerollOffer(P).ok, 'reroll ok'); eq(before - P.gold, costs[i], 'paid');
      eq(P.rn.offer.ids.length, 3, '3 cards'); ok(P.rn.offer.ids.every(id => !old.includes(id)), 'all new cards'); eq(P.rn.offer.kind, 'ยาก', 'same mode'); }
    eq(costs, [0, 3, 6, 9], 'cost steps');
    P.gold = 11; ok(!rnRerollOffer(P).ok && P.gold === 11, 'not enough gold → nothing happens');
    P.over = false; startRound(P, chars); eq(P.rn.ro, 0, 'reset each match'); eq(rnRerollCost(P), 0, 'free again');
    rnMakeOffer(P, 'boss'); ok(rnRerollOffer(P).ok && rarOf(P.rn.offer.ids).join(',') === 'legend,legend', 'boss reroll = 2 legend');
  }],
  ['set 100: enemy tier = any of the 12 teams at start / after a normal win · 1 normal loss = กลาง · 2+ = ง่าย (อ่อน) · boss match does not count', () => {
    const P = fresh(31); eq(P.ls, 0, 'start'); eq(rnFoeTier(P), null, 'start = all');
    endMatch(P, false, chars, RULES); eq(rnFoeTier(P), 'กลาง', '1 loss');
    endMatch(P, false, chars, RULES, [], true); eq(rnFoeTier(P), 'กลาง', 'boss loss ignored');
    endMatch(P, false, chars, RULES); eq(rnFoeTier(P), 'ง่าย', '2 losses');
    endMatch(P, true, chars, RULES, [], true); eq(rnFoeTier(P), 'ง่าย', 'boss win ignored');
    endMatch(P, true, chars, RULES); eq(rnFoeTier(P), null, 'normal win → all again');
    const tiers = new Set(); for (let seed = 1; seed <= 80; seed++) tiers.add(pickBotTeam(BOT_TEAMS, 4, seed, null).tier);
    eq(tiers.size, 3, 'all = every tier can come');
  }],
  ['set 94: difficulty pick = bot team of that tier from the same cell · same seed → same team', () => {
    for (const tier of ['ง่าย', 'กลาง', 'ยาก']) {
      const a = pickBotTeam(BOT_TEAMS, 4, 777, tier), b = pickBotTeam(BOT_TEAMS, 4, 777, tier);
      eq(a.tier, tier, 'tier'); eq(JSON.stringify(a.team), JSON.stringify(b.team), 'deterministic');
    }
  }],
];
