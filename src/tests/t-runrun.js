// set 94 (phase 2b): runes inside the normal run — offers after a win, rune shop, run-only rune effects, save, bot tier pick
import { buildCharacterList } from '../core/characters.js';
import { RULES } from '../core/rules.js';
import { simulate } from '../core/battle.js';
import { buildTeam, makeCharMap } from '../core/team.js';
import { newRun, startRound, reroll, sell, move, applyBattlePerm } from '../core/shop.js';
import { dataHash, makeSave, newStats, readSave, validateRunState, replayEntry, checkReplay } from '../core/save.js';
import { equipRunes } from '../core/runes.js';
import { BOT_TEAMS } from '../core/botdata.js';
import { pickBotTeamAt } from '../core/botteams.js';
import { RUN_STAGE } from '../core/runboss.js';
import { rnMakeOffer, rnTakeOffer, rnRec, rnBuy, rnReroll, rnLock, rnRefill, rnFx, rnHeartTrade, rnPlace, rnEquips, rnCompact, rnFromCompact, rnInterest } from '../core/runrunes.js';
import { eq, ok } from './helpers.js';

const chars = buildCharacterList(), cm = makeCharMap(chars);
const fresh = seed => { const P = newRun(chars, seed); startRound(P, chars); return P; };
const rarOf = ids => ids.map(id => rnRec(id).rarity);
const give = (P, id, n = 1) => { P.rn.bag[id] = n; };
const unit = (P, id, level = 1) => ({ uid: P.uid++, id, level, perm: {}, paid: cm[id].price });
const commonId = chars.find(c => c.rarity === chars[0].rarity).id;

export const TESTS_RUNRUN = [
  ['set 94: win offers follow the user mix (ง่าย 3 ธรรมดา · กลาง 1+2 หายาก · ยาก 2 หายาก+1 ตำนาน · บอส = ยาก) · distinct · pick adds to bag', () => {
    const P = fresh(11);
    const mix = k => { const o = rnMakeOffer(P, k); ok(o && new Set(o.ids).size === o.ids.length, `${k} distinct`); return rarOf(o.ids).sort().join(','); };
    eq(mix('ง่าย'), 'common,common,common', 'easy');
    eq(mix('กลาง'), 'common,rare,rare', 'normal');
    eq(mix('ยาก'), 'legend,rare,rare', 'hard');
    eq(mix('boss'), 'legend,legend', 'boss = pick 1 of 2 legend (user 5 Nov set 95)');
    const id = P.rn.offer.ids[0], r = rnTakeOffer(P, 0);
    ok(r.ok && P.rn.bag[id] === 1 && P.rn.offer === null, 'take → bag, offer cleared');
    ok(!rnTakeOffer(P, 0).ok, 'no offer → fail');
  }],
  ['set 94: copies per run cap offers + shop (maxed rune never shows) · pool empty → filled from other rarities / no offer', () => {
    const P = fresh(12);
    give(P, 'X9', 1); // legend max 1
    for (let i = 0; i < 40; i++) { rnMakeOffer(P, 'ยาก'); ok(!P.rn.offer.ids.includes('X9'), 'maxed X9 never offered'); rnRefill(P); ok(!P.rn.shop.some(s => s.id === 'X9'), 'maxed X9 never in shop'); }
    const Q = fresh(13);
    for (const [id, r] of Object.entries(RUN_STAGE.runes)) if (rnRec(id) && r.rarity === 'legend') give(Q, id, r.max);
    for (const c of RUN_STAGE.custom) if (rnRec(c.id) && c.rarity === 'legend') give(Q, c.id, c.max);
    const o = rnMakeOffer(Q, 'ยาก');
    eq(o.ids.length, 3, 'legend pool empty → still 3 cards'); ok(!rarOf(o.ids).includes('legend'), 'no legend left');
  }],
  ['set 94: rune shop — 3 cards · price 3/9/27 · buy takes gold · lock survives refill/new round · reroll costs 2', () => {
    const P = fresh(14);
    eq(P.rn.shop.length, 3, '3 cards'); ok(P.rn.shop.every(s => s.id), 'filled');
    const S = RUN_STAGE.settings; eq([S.rsCommon, S.rsRare, S.rsLegend, S.rsReroll], [3, 9, 27, 2], 'prices');
    P.gold = 100;
    const i = 0, r = rnRec(P.rn.shop[i].id), price = { common: 3, rare: 9, legend: 27 }[r.rarity];
    ok(rnBuy(P, i).ok && P.gold === 100 - price && P.rn.bag[r.id] === 1 && P.rn.shop[i].id === null, 'buy');
    ok(!rnBuy(P, i).ok, 'empty slot');
    rnRefill(P); ok(rnLock(P, 1).ok, 'lock'); const kept = P.rn.shop[1].id;
    for (let k = 0; k < 5; k++) { ok(rnReroll(P).ok, 'reroll'); eq(P.rn.shop[1].id, kept, 'locked card kept'); }
    eq(P.gold, 100 - price - 10, 'reroll 2 each');
    startRound(P, chars); eq(P.rn.shop[1].id, kept, 'locked card kept next round');
    P.gold = 1; ok(!rnReroll(P).ok, 'no gold'); P.gold = 2; P.rn.shop[2] = { id: 'T4', locked: false }; ok(!rnBuy(P, 2).ok && P.gold === 2, 'buy without gold fails');
  }],
  ['set 94: rune rolls use their own random stream (unit shop rolls unchanged)', () => {
    const A = fresh(15), B = fresh(15);
    B.gold = 999; for (let k = 0; k < 6; k++) rnReroll(B);
    startRound(A, chars); startRound(B, chars);
    eq(JSON.stringify(B.shop), JSON.stringify(A.shop), 'unit shop same');
  }],
  ['set 94: run-only runes — gold · interest (rune only) · shop slots · free reroll · heart trade', () => {
    const P = fresh(16);
    P.gold = 17; startRound(P, chars); const base = P.gold; // no runes: no interest
    eq(base, 17 + RULES.shop.goldPerRound + (P.lastWon ? RULES.shop.winBonus : 0), 'no interest without rune');
    give(P, 'T1', 2); give(P, 'T2', 1); give(P, 'T3', 1); give(P, 'T4', 1); give(P, 'X8', 1);
    const fx = rnFx(P); eq([fx.gold, fx.slots, fx.free], [4, 1, 1], 'gold ×copies / slots / free');
    eq(rnInterest(17, fx), 3, 'interest floor(17/5)×1'); eq(rnInterest(500, fx), 20, 'interest cap');
    P.gold = 17; startRound(P, chars);
    eq(P.gold, 17 + RULES.shop.goldPerRound + 4 + 3, 'income + gold rune + interest');
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
    eq(bad(X => { X.rn.shop.push({ id: null, locked: false }); }), 'bad', 'rune shop size');
    eq(bad(X => { X.rn.evil = 1; }), 'bad', 'extra field');
    eq(bad(X => { X.v = 3; delete X.rn; }), 'data', 'old v3 save → game updated');
  }],
  ['set 94: difficulty pick = bot team of that tier from the same cell · same seed → same team', () => {
    for (const tier of ['ง่าย', 'กลาง', 'ยาก']) {
      const a = pickBotTeamAt(BOT_TEAMS, 2, 777, 4, tier), b = pickBotTeamAt(BOT_TEAMS, 2, 777, 4, tier);
      eq(a.tier, tier, 'tier'); eq(JSON.stringify(a.team), JSON.stringify(b.team), 'deterministic');
    }
  }],
];
