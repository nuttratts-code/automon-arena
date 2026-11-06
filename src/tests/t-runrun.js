// set 94 (phase 2b): runes inside the normal run — offers after a win, rune shop, run-only rune effects, save, bot tier pick
import { buildCharacterList } from '../core/characters.js';
import { RULES } from '../core/rules.js';
import { simulate } from '../core/battle.js';
import { buildTeam, makeCharMap } from '../core/team.js';
import { incomeOf, newRun, startRound, reroll, sell, move, applyBattlePerm, endMatch } from '../core/shop.js';
import { dataHash, makeSave, newStats, readSave, validateRunState, replayEntry, checkReplay } from '../core/save.js';
import { equipRunes } from '../core/runes.js';
import { BOT_TEAMS } from '../core/botdata.js';
import { pickFoe, foeWantPct } from '../core/botteams.js';
import { teamPower } from '../core/power.js';
import { RUN_STAGE } from '../core/runboss.js';
import { rnMakeOffer, rnRerollOffer, rnRerollCost, rnTakeOffer, rnRec, rnFoeScale, rnFx, rnHeartTrade, rnPlace, rnEquips, rnCompact, rnFromCompact, rnInterest } from '../core/runrunes.js';
import { eq, ok } from './helpers.js';

const chars = buildCharacterList(), cm = makeCharMap(chars);
const fresh = seed => { const P = newRun(chars, seed); startRound(P, chars); return P; };
const rarOf = ids => ids.map(id => rnRec(id).rarity);
const give = (P, id, n = 1) => { P.rn.bag[id] = n; };
const unit = (P, id, level = 1) => ({ uid: P.uid++, id, level, perm: {}, paid: cm[id].price });
const commonId = chars.find(c => c.rarity === chars[0].rarity).id;

export const TESTS_RUNRUN = [
  ['set 107: win offers = 3 cards, each rolls rarity 60/30/10 (user, no modes) · boss = 2 legend · distinct · pick adds to bag', () => {
    const P = fresh(11), S = RUN_STAGE.settings;
    eq([S.rarC, S.rarR, S.rarL], [60, 30, 10], 'user %');
    const N = 600;
    for (const [m, want] of [['win', [60, 30, 10]]]) {
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
  ['set 107: enemy follows the player power · +5%/win in a row (cap +25%) · loss resets · boss win counts · same seed → same team', () => {
    const P = fresh(31); eq(P.ws, 0, 'start'); eq(foeWantPct(P.ws), 100, 'start 100%');
    endMatch(P, true, chars, RULES); eq(foeWantPct(P.ws), 105, '1 win');
    endMatch(P, true, chars, RULES, [], true); eq(foeWantPct(P.ws), 110, 'boss win counts');
    P.ws = 9; eq(foeWantPct(P.ws), 125, 'cap +25');
    endMatch(P, false, chars, RULES); eq(foeWantPct(P.ws), 100, 'loss resets');
    const me = buildTeam([{ id: commonId, level: 2, row: 0, lane: 0 }, { id: commonId, level: 1, row: 1, lane: 0 }], cm), pw = teamPower(me);
    const a = pickFoe(BOT_TEAMS, me, 4, 777, 0), b = pickFoe(BOT_TEAMS, me, 4, 777, 0), c = pickFoe(BOT_TEAMS, me, 4, 777, 5);
    eq(JSON.stringify(a), JSON.stringify(b), 'deterministic');
    const pow = f => teamPower(rnFoeScale(buildTeam(f.team, cm), f.pct));
    ok(Math.abs(pow(a) / pw - 1) < 0.08, `enemy ≈ my power (${(pow(a) / pw).toFixed(2)})`);
    ok(pow(c) > pow(a) * 1.15, 'streak 5 → stronger enemy');
    ok(Array.isArray(a.rn) && BOT_TEAMS.rounds.some(l => l.some(t => t.rn.length)), 'bot teams carry runes');
  }],
];
