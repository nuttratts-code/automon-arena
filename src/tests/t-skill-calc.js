// Set 42 (28 Oct, user ask): every in-match skill of every character, Lv1–3, gives the number the rules say
// (expected values are computed here from combat-rules + the character's live data in core/characters.js, so the
// tests follow the user's stat edits), AND the match analysis tab (lab/matchcalc.js = the numbers the page shows)
// agrees with the battle for that same match. Shop-time skills (HL-4 PL-2 WN-1 SF-7 WY-3) are not match events → t-shop.js.
import { simulate } from '../core/battle.js';
import { buildCharacterList } from '../core/characters.js';
import { RULES } from '../core/rules.js';
import { buildTeam, makeCharMap } from '../core/team.js';
import { mxModel, mxLoss, mxAgg, mxAdd, mxWhy } from '../lab/matchcalc.js';
import { NEVER, mk, L3, eq, ok, randomTeam } from './helpers.js';
import { makeRng } from '../core/rng.js';

const SC_CH = buildCharacterList();
const scC = id => SC_CH.find(c => c.id === id);
// Test dummies (not real characters): bag = never attacks · punch = hits every cd with fixed attack
const scBag = (id, o = {}) => mk(id, { tribe: 'ทดสอบ', atk: L3(0), cdMs: NEVER, hp: L3(100000), ...o });
const scPunch = (id, atk, o = {}) => mk(id, { tribe: 'ทดสอบ', atk: L3(atk), cdMs: 1000, hp: L3(100000), ...o });
const SC_RULES = { ...RULES, tribesOn: false }; // tribe bonuses off: only the skill under test acts
// slots: [char, level, row, lane] · returns the result + uid finder
function scRun(A, B, opts = {}) {
  const chars = [...new Map([...SC_CH, ...A.map(([c]) => c), ...B.map(([c]) => c)].map(c => [c.id, c])).values()], m = makeCharMap(chars);
  const tm = list => buildTeam(list.map(([c, level, row, lane]) => ({ id: c.id, level, row, lane })), m);
  const r = simulate(tm(A), tm(B), { rules: SC_RULES, detail: true, ...opts });
  const units = [...r.events[0].units, ...r.events.filter(e => e.k === 'summon').map(e => e.unit)];
  const uid = (side, row, lane) => r.events[0].units.find(x => x.side === side && x.row === row && x.lane === lane).uid;
  return { r, units, uid, model: mxModel(r, units), res: new Map(r.units.map(x => [x.uid, x])) };
}
const scLv = c => [1, 2, 3].map(L => [L, L - 1]);
const scSk = (r, who, si, k) => r.events.filter(e => e.k === k && e.from === who && e.d && e.d.si === si);
const scProcs = (r, who, si) => r.events.filter(e => e.k === 'proc' && e.who === who && e.si === si);
const scHits = (r, from, f = () => true) => r.events.filter(e => e.k === 'dmg' && e.why === 'hit' && e.from === from && f(e));
const near = (a, b) => Math.abs(a - b) < 1e-6;

// Replays the log to know hp / armor / shock of each unit just before event ei (ledger independent of the battle code)
function scLedger(r) {
  const S = new Map(r.events[0].units.map(x => [x.uid, { hp: x.hp, maxHp: x.maxHp, armor: x.armor || 0, shock: 0 }]));
  let i = 1;
  return ei => {
    if (ei < i) throw new Error('ledger: asked backwards');
    for (; i < ei; i++) {
      const e = r.events[i], s = S.get(e.to ?? e.who);
      if (e.k === 'summon') { S.set(e.unit.uid, { hp: e.unit.hp, maxHp: e.unit.maxHp, armor: e.unit.armor || 0, shock: 0 }); continue; }
      if (!s) continue;
      if (e.k === 'dmg') { s.armor -= e.absorbed; s.hp -= e.amount - e.absorbed; }
      else if (e.k === 'armor') s.armor += e.amount;
      else if (e.k === 'heal') s.hp += e.amount;
      else if (e.k === 'shock' || e.k === 'steal') s.shock = e.total;
      else if (e.k === 'cleanse') s.shock = e.what === 'pct' ? e.shock : 0;
      else if (e.k === 'maxhp') { s.maxHp = e.maxHp; s.hp = e.hp; }
      else if (e.k === 'buff' && e.what === 'hpUp') { s.maxHp += e.amount; s.hp += e.amount; }
      else if (e.k === 'revive') { s.hp = e.hp; s.armor = 0; }
      else if (e.k === 'down') { s.hp = Math.min(s.hp, 0); s.armor = 0; s.shock = 0; }
    }
    return S;
  };
}
const scFirst = (r, t, k = 'dmg') => r.events.findIndex(e => e.t === t && e.k === k);

// ---- Match tab ↔ battle agreement (runs on every scenario below) ----
// What the tab shows must equal what the battle did: dealt/taken per unit, HP really lost, heal/armor given,
// burn/shock applied, hit counts, skill rows (one per skill, all its effects), and every damage counted exactly once.
function scAgree(x, tag) {
  const { r, units, model, res } = x, { per, act, fxTot, fxGiven, tot, sideOf } = model;
  const cover = new Map();
  for (const rec of model.recs) cover.set(rec.ei, (cover.get(rec.ei) || 0) + rec.f);
  r.events.forEach((e, ei) => { if (e.k === 'dmg') ok(near(cover.get(ei) || 0, 1), `${tag}: damage event ${ei} counted ${cover.get(ei) || 0} times in the tab`); });
  const heal = new Map(), downOrRev = new Set(), side0 = [0, 0];
  for (const e of r.events) {
    if (e.k === 'heal' || (e.k === 'buff' && e.what === 'hpUp' && !e.dx)) heal.set(e.to, (heal.get(e.to) || 0) + e.amount); // max HP +% also adds HP
    if (e.k === 'down' || e.k === 'revive') downOrRev.add(e.who);
    if (e.k === 'maxhp') downOrRev.add(e.to);
  }
  for (const u of units) {
    const P = per.get(u.uid), R0 = res.get(u.uid), sum = l => l.reduce((a, q) => a + q.amt, 0);
    ok(near(sum(P.out) + sum(P.ally), R0.dealt), `${tag}: ${u.id}#${u.uid} tab 'ทำ' ${sum(P.out) + sum(P.ally)} ≠ battle dealt ${R0.dealt}`);
    ok(near(sum(P.in), R0.taken), `${tag}: ${u.id}#${u.uid} tab 'รับ' ${sum(P.in)} ≠ battle taken ${R0.taken}`);
    side0[u.side] += sum(P.out);
    const a = mxAgg(); P.in.forEach(q => mxAdd(a, q));
    if (!downOrRev.has(u.uid)) ok(near(u.hp - mxLoss(a) + (heal.get(u.uid) || 0), R0.hp), `${tag}: ${u.id}#${u.uid} HP start ${u.hp} − tab 'HP หายจริง' ${mxLoss(a)} + heals/HP-up ${heal.get(u.uid) || 0} ≠ end HP ${R0.hp}`);
    // tab 'อื่นๆ' card: heal/armor given = battle events whose giver is this unit
    const gH = r.events.filter(e => e.k === 'heal' && (e.from ?? e.to) === u.uid).reduce((s, e) => s + e.amount, 0);
    const gA = r.events.filter(e => e.k === 'armor' && (e.from ?? e.to) === u.uid).reduce((s, e) => s + e.amount, 0);
    const f = fxTot.get(u.uid);
    ok(f.heal === gH && f.armor === gA, `${tag}: ${u.id}#${u.uid} tab 'อื่นๆ' heal ${f.heal}/armor ${f.armor} ≠ battle ${gH}/${gA}`);
    // burn/shock applied + hits (sub-line under the name)
    const foeE = e => e.from === u.uid && e.to != null && sideOf(e.to) !== u.side;
    const bU = r.events.filter(e => e.k === 'burn' && foeE(e)).reduce((s, e) => s + e.amount, 0);
    const sU = r.events.filter(e => e.k === 'shock' && foeE(e)).reduce((s, e) => s + e.amount, 0);
    const hN = r.events.filter(e => e.k === 'dmg' && e.why === 'hit' && foeE(e)).length;
    const A0 = act.get(u.uid);
    ok(A0.burnU === bU && A0.shockU === sU && A0.hits + A0.subs === hN, `${tag}: ${u.id}#${u.uid} tab burn ${A0.burnU}/shock ${A0.shockU}/hits ${A0.hits + A0.subs} ≠ battle ${bU}/${sU}/${hN}`);
    // one tab row per skill, holding every non-damage effect that skill logged
    const c = scC(u.id) || null;
    if (c) c.skills.forEach((s, si) => {
      const evs = r.events.filter(e => e.k !== 'dmg' && e.from === u.uid && e.d && e.d.si === si && !(e.k === 'heal' || e.k === 'armor') || ((e.k === 'heal' || e.k === 'armor') && (e.from ?? e.to) === u.uid && e.d && e.d.si === si && !/Hit$/.test(e.why || '') && e.why !== 'share' && e.why !== 'tribe'));
      const row = (fxGiven.get(u.uid) || new Map()).get('si:' + si), n = row ? row.list.length : 0;
      const refl = r.events.filter(e => e.k === 'reflectDebuff' && e.from === u.uid && e.si === si).length; // F1: PT-8 reflects (event from = the reflecting PT-8, listed under its row)
      ok(n === evs.length + refl, `${tag}: ${u.id} skill ${si + 1} tab row has ${n} effects, battle logged ${evs.length + refl}`);
    });
  }
  ok(near(tot[0], side0[0]) && near(tot[1], side0[1]), `${tag}: header 'ซ้ายทำ/ขวาทำ' ${tot} ≠ ${side0}`);
}
// Damage this skill did, as the tab's 'ทำดาเมจ' pane shows it (rows by source) vs. the skill's damage events
function scSkillDmg(x, who, si, why) {
  const evs = x.r.events.filter(e => e.k === 'dmg' && e.from === who && e.d && e.d.si === si);
  const tab = x.model.per.get(who).out.filter(q => q.d && q.d.si === si && mxWhy(q.why) === mxWhy(why)).reduce((a, q) => a + q.amt, 0);
  return [evs.reduce((a, e) => a + e.amount, 0), tab, evs];
}

// ---- Base kit of all 48 characters: attack per hit, hits per set, cooldown, burn/shock/armor/heal per hit ----
const SC_BASE = SC_CH.map(c => [`ค่าพลัง+แท็บวิเคราะห์: ${c.id} ${c.name} Lv1–3 ตีเป้า = ค่าในตาราง`, () => {
  for (const [L, i] of scLv(c)) {
    const tag = `${c.id} Lv${L}`;
    // stripped copy: same stats, no skills (skills have their own tests) · vs. one bag, nobody hits back
    const h = { ...c, skills: [] }, x = scRun([[h, L, 0, 0]], [[scBag('ZB-1'), 1, 0, 0]]), me = x.uid(0, 0, 0), tg = x.uid(1, 0, 0);
    const sets = x.r.events.filter(e => e.k === 'set' && e.who === me);
    ok(sets.length >= 2, `${tag}: fewer than 2 attack sets`);
    eq([sets[0].t, sets[1].t - sets[0].t], [c.cdMs[i], c.cdMs[i]], `${tag}: first set time / gap (cooldown)`);
    const hit1 = scHits(x.r, me, e => e.t === sets[0].t);
    eq(hit1.length, c.atk[i] > 0 ? c.multi[i] : 0, `${tag}: hits in set 1 (multi-hit · attack 0 = no damage event)`);
    if (c.atk[i] > 0) eq(hit1[0].amount, c.atk[i], `${tag}: damage of hit 1`);
    const at = (k, f = () => true) => x.r.events.filter(e => e.k === k && e.t === sets[0].t && f(e)).map(e => e.amount);
    eq(at('burn', e => e.to === tg), c.burn[i] > 0 ? Array(c.multi[i]).fill(c.burn[i]) : [], `${tag}: burn per hit`);
    eq(at('shock', e => e.to === tg), c.shock[i] > 0 ? Array(c.multi[i]).fill(c.shock[i]) : [], `${tag}: shock per hit`);
    eq(at('armor', e => e.to === me && e.why === 'armorHit'), c.armorHit[i] > 0 ? Array(c.multi[i]).fill(c.armorHit[i]) : [], `${tag}: armor per hit`);
    scAgree(x, tag);
    // tab 'ทำดาเมจ' total for the first 2 sets = hits + shock bursts the battle logged
    const outT = x.model.per.get(me).out.filter(q => q.t <= sets[1].t && q.why !== 'burn').reduce((a, q) => a + q.amt, 0);
    const evT = x.r.events.filter(e => e.k === 'dmg' && e.from === me && e.t <= sets[1].t && e.why !== 'burn').reduce((a, e) => a + e.amount, 0);
    eq(outT, evT, `${tag}: tab hit+shock damage of 2 sets`);
  }
}]);

// max HP +v% on hit taken: each gain = v% of max HP at that moment (rounded down), HP rises the same
function scHpUp(x, me, si, v) {
  const at = scLedger(x.r), got = scSk(x.r, me, si, 'buff').filter(e => e.what === 'hpUp' && e.t <= 20000);
  ok(got.length >= 5, `max HP +% fired (${got.length})`);
  for (const e of got) eq(e.amount, Math.floor(at(x.r.events.indexOf(e)).get(me).maxHp * v / 100), `t ${e.t}: max HP +`);
  const all = scSk(x.r, me, si, 'buff').filter(e => e.what === 'hpUp').reduce((a, e) => a + e.amount, 0);
  eq(x.res.get(me).fin.maxHp, scC(x.units.find(u => u.uid === me).id).hp[x.units.find(u => u.uid === me).level - 1] + all, 'max HP at end (stat tab)');
}
// ---- One test per in-match skill ----
// each: build a match where the skill fires, expected value from the rule text, then scAgree for the tab
const sk = (id, si = 0) => scC(id).skills[si];
const SC_SKILL = [
  // set 49 (import 28 Oct): new kits for HL-2 / PT-6 / PT-8 (old kits kept below as retired-skill tests)
  // set 84: HL-2 gives only to a front ally of its own tribe (old kit 'HL-2@2' = any front ally, kept below)
  ['HL-2', 'ตีโดน → เพื่อนข้างหน้า (เผ่าเดียวกัน) เกราะ/ฮิต +v · ต่างเผ่าไม่ได้', (c, L, i) => {
    const other = scRun([[c, L, 1, 0], [mk('ZA-2', { tribe: 'ทดสอบ', atk: L3(1), cdMs: NEVER, hp: L3(100000) }), 1, 0, 0]], [[scBag('ZB-1'), 1, 0, 0]]);
    eq(scSk(other.r, other.uid(0, 1, 0), 0, 'buff').filter(e => e.what === 'armorHitUp').length, 0, 'front ally of another tribe gets nothing');
    const fr = mk('ZA-1', { tribe: 'เหล็กกล้า', atk: L3(1), cdMs: NEVER, hp: L3(100000) });
    const x = scRun([[c, L, 1, 0], [fr, 1, 0, 0]], [[scBag('ZB-1'), 1, 0, 0], [scBag('ZB-2'), 1, 0, 1]]), me = x.uid(0, 1, 0), front = x.uid(0, 0, 0), v = sk('HL-2').v[i];
    const hits = scHits(x.r, me).length, got = scSk(x.r, me, 0, 'buff').filter(e => e.what === 'armorHitUp');
    ok(hits >= 3, `HL-2 hit ${hits} times`);
    eq(got.map(e => [e.to, e.amount]), Array(hits).fill([front, v]), 'armor/hit +v to the front ally on every hit');
    eq(x.res.get(front).fin.armorHit, v * hits, "front ally's armor/hit at end (stat tab)");
    eq(x.res.get(me).fin.armorHit, c.armorHit[i], 'HL-2 itself unchanged');
    return x;
  }],
  // set 82 (import 4 Nov, config rev 293): new PT-6 kit (old kit kept below as retired test 'PT-6@2')
  // set 91 (import 5 Nov, config rev 4): atk 20% → 15% + 3rd skill: hit → 1 random ally of its own tribe heal/hit +v
  ['PT-6', 'ตีโดน → ฟื้น/ฮิต ตัวเอง +v · ตีโดน → พลังโจมตี +v% ของ ฟื้น/ฮิต ตัวเอง (หลังเพิ่มของฮิตนั้น) · ตีโดน → ภูติสุ่ม 1 ตัว ฟื้น/ฮิต +v', (c, L, i) => {
    const x = scRun([[c, L, 0, 0], [scC('PT-1'), 1, 1, 0], [scC('HL-1'), 1, 0, 1]], [[scBag('ZB-1'), 1, 0, 0], [scBag('ZB-2'), 1, 0, 1]]), me = x.uid(0, 0, 0), spirit = x.uid(0, 1, 0);
    const v2 = sk('PT-6', 2).v[i], g2 = scSk(x.r, me, 2, 'buff').filter(e => e.what === 'healHitUp');
    eq(g2.map(e => [e.to, e.amount]), Array(scHits(x.r, me).filter(h => h.t < Math.min(...x.r.events.filter(e => e.k === 'down' && e.who === spirit).map(e => e.t), Infinity)).length).fill([spirit, v2]), 'heal/hit +v to the spirit ally only (not the steel ally) on every hit while it stands');
    const v0 = sk('PT-6').v[i], v1 = sk('PT-6', 1).v[i], hits = scHits(x.r, me).length;
    ok(hits >= 3, `PT-6 hit ${hits} times`);
    const g = scSk(x.r, me, 0, 'buff').filter(e => e.what === 'healHitUp');
    eq(g.map(e => [e.to, e.amount]), Array(hits).fill([me, v0]), 'heal/hit +v to itself on every hit');
    eq(x.res.get(me).fin.healHit, c.healHit[i] + v0 * hits, 'own heal/hit at end (stat tab) = base + v per hit');
    const a = scSk(x.r, me, 1, 'atkUp');
    eq(a.map(e => e.amount), Array.from({ length: hits }, (_, k) => Math.floor((c.healHit[i] + v0 * (k + 1)) * v1 / 100)), 'attack +v% of own heal/hit per hit (heal/hit already raised by that hit, rounded down)');
    return x;
  }],
  ['PT-8', 'โดนตี → ภูติทั้งทีม (ไม่ใช่ PT-8) คูลดาวน์ −v% · ตีโดน → ภูติแถวหลังทั้ง 2 เลน ฟื้น/ฮิต +v', (c, L, i) => {
    const sp = id => mk(id, { tribe: 'ภูติ', atk: L3(1), cdMs: 10000, hp: L3(100000) }), st = mk('ZT-2', { tribe: 'ทดสอบ', atk: L3(1), cdMs: 10000, hp: L3(100000) });
    const x = scRun([[c, L, 0, 0], [sp('ZT-1'), 1, 1, 1], [sp('ZT-3'), 1, 2, 0], [st, 1, 2, 1]], [[scPunch('ZP-1', 1), 1, 0, 0]]), me = x.uid(0, 0, 0);
    const v0 = sk('PT-8').v[i], v1 = sk('PT-8', 1).v[i], back = x.uid(0, 2, 0), mid = x.uid(0, 1, 1);
    const cd = scSk(x.r, me, 0, 'cdPct').filter(e => e.t <= 10000), pr = scProcs(x.r, me, 0).filter(e => e.t <= 10000);
    ok(pr.length >= 5, `cooldown skill fired ${pr.length} times in 10 s`);
    eq(cd.length, 2 * pr.length, '2 receivers per hit taken');
    ok(cd.every(e => (e.to === back || e.to === mid) && e.pct === v0), 'cooldown −v% to both spirit allies only (never steel, never PT-8)');
    const hu = scSk(x.r, me, 1, 'buff').filter(e => e.what === 'healHitUp'), hits = scHits(x.r, me).length;
    ok(hits >= 3, `PT-8 hit ${hits} times`);
    eq(hu.map(e => [e.to, e.amount]), Array(hits).fill([back, v1]), 'heal/hit +v to the back-row spirit ally only (mid-row spirit and back-row steel get nothing)');
    eq(x.res.get(back).fin.healHit, v1 * hits, 'back ally heal/hit at end (stat tab)');
    return x;
  }],
  // set 137: HL-3 now on hit taken · HL-5 burns the attacker · PL-3 burns 60% of the target's shock (old kits 'ID@1' kept below)
  ['HL-3', 'โดนตี → เกราะ/ฮิต +v', (c, L, i) => {
    const x = scRun([[c, L, 0, 0]], [[scPunch('ZP-1', 3), 1, 0, 0]]), me = x.uid(0, 0, 0), v = sk('HL-3').v[i];
    const pr = scProcs(x.r, me, 0).filter(e => e.t <= 60000), got = scSk(x.r, me, 0, 'buff'), early = got.filter(e => e.t <= 60000);
    ok(pr.length > 3, `skill fired ${pr.length} times`);
    eq([early.length, got.every(e => e.amount === v)], [pr.length, true], 'armor/hit +v per hit taken (first 60 s)');
    eq(x.res.get(me).fin.armorHit, c.armorHit[i] + v * got.length, 'armor/hit at end (stat tab) = base + all gains');
    return x;
  }],
  ['HL-5', 'โดนตี → ติดไฟ v ใส่ผู้ตี', (c, L, i) => {
    const x = scRun([[c, L, 0, 0]], [[scPunch('ZP-1', 3), 1, 0, 0]]), me = x.uid(0, 0, 0), foe = x.uid(1, 0, 0), v = sk('HL-5').v[i];
    const pr = scProcs(x.r, me, 0).filter(e => e.t <= 20000), got = x.r.events.filter(e => e.k === 'burn' && e.from === me && e.t <= 20000);
    ok(pr.length > 3, `skill fired ${pr.length} times`);
    eq(got.map(e => [e.to, e.amount]), Array(pr.length).fill([foe, v]), 'burn v to the attacker per hit taken');
    return x;
  }],
  ['PL-3', 'ตีโดน → ติดไฟเป้า = v% ของช็อตบนเป้า (หลังช็อตของ tick นั้น)', (c, L, i) => {
    const zs = mk('ZS-1', { tribe: 'ทดสอบ', atk: L3(1), cdMs: 1000, hp: L3(100000), shock: L3(5) });
    const x = scRun([[c, L, 0, 0], [zs, 1, 0, 1]], [[scBag('ZB-1'), 1, 0, 0]]), me = x.uid(0, 0, 0), foe = x.uid(1, 0, 0), v = sk('PL-3').v[i], at = scLedger(x.r);
    let n = 0;
    x.r.events.forEach((e, ei) => {
      if (e.k !== 'burn' || e.from !== me || e.t > 30000) return;
      const want = Math.floor(at(ei).get(foe).shock * v / 100);
      eq([e.to, e.amount], [foe, want], `t ${e.t}: burn = ${v}% of the target's shock`); n++;
    });
    ok(n > 3, `burned ${n} times`);
    return x;
  }],
  ['HL-7', 'โดนตี → พลังโจมตี +30% ของเกราะตัวเอง (เกราะก่อนฮิตของ tick)', (c, L, i) => {
    const x = scRun([[c, L, 0, 0]], [[scPunch('ZP-1', 3), 1, 0, 0]]), me = x.uid(0, 0, 0), v = sk('HL-7').v[i], at = scLedger(x.r);
    const got = scSk(x.r, me, 0, 'atkUp'); let n = 0, sum = 0;
    for (const p of scProcs(x.r, me, 0).filter(e => e.t <= 60000)) {
      const want = Math.floor(at(scFirst(x.r, p.t)).get(me).armor * v / 100);
      const g = got.filter(e => e.t === p.t);
      if (want > 0) { ok(g.length >= 1 && g[0].amount === want, `t ${p.t}: atk + ${g[0] && g[0].amount} want ${want}`); n++; }
    }
    ok(n > 3, 'skill gave attack at least 4 times');
    for (const e of got) sum += e.amount;
    eq(x.res.get(me).fin.atk, c.atk[i] + sum, 'attack at end (stat tab) = base + all gains');
    return x;
  }],
  // set 82: HL-8 now shares only to allies of its own tribe (old kit 'HL-8@1' = whole team, kept below)
  ['HL-8', 'แบ่งเกราะ 30% ให้เพื่อนเผ่าเดียวกันทุกครั้งที่ได้เกราะ', (c, L, i) => {
    const x = scRun([[c, L, 0, 0], [scC('HL-1'), 1, 1, 0], [scC('PT-1'), 1, 0, 1]], [[scBag('ZB-1'), 1, 0, 0]]), me = x.uid(0, 0, 0), steel = x.uid(0, 1, 0), v = sk('HL-8').v[i];
    // set 91: only armor gains while both allies still stand (storm 1.5× lets the match run on after they fall)
    const firstDown = Math.min(...x.r.events.filter(e => e.k === 'down' && e.to !== me && e.who !== me).map(e => e.t), Infinity);
    const own = x.r.events.filter(e => e.k === 'armor' && e.to === me && e.why !== 'share' && e.t < firstDown);
    ok(own.length > 2, 'HL-8 got armor');
    for (const e of own) {
      const sh = x.r.events.filter(s => s.k === 'armor' && s.why === 'share' && s.t === e.t && s.to !== me);
      const want = Math.floor(e.amount * v / 100);
      eq(sh.map(s => [s.to, s.amount]), want > 0 ? [[steel, want]] : [], `t ${e.t}: share of ${e.amount} to the steel ally only (not the fire ally)`);
    }
    const row = x.model.fxGiven.get(me).get('share'), tab = row ? row.list.reduce((a, q) => a + q.e.amount, 0) : 0;
    eq(tab, x.r.events.filter(s => s.k === 'armor' && s.why === 'share').reduce((a, s) => a + s.amount, 0), "tab 'แบ่งเกราะ' row total");
    return x;
  }],
  ['HL-6', 'โดนตี → สะท้อน 30% ของเกราะตัวเองใส่ผู้ตี', (c, L, i) => {
    const x = scRun([[c, L, 0, 0]], [[scPunch('ZP-1', 3), 1, 0, 0]]), me = x.uid(0, 0, 0), foe = x.uid(1, 0, 0), v = sk('HL-6').v[i], at = scLedger(x.r);
    const [evSum, tabSum, evs] = scSkillDmg(x, me, 0, 'reflect'); let n = 0;
    for (const p of scProcs(x.r, me, 0).filter(e => e.t <= 60000)) {
      const want = Math.floor(at(scFirst(x.r, p.t)).get(me).armor * v / 100), g = evs.filter(e => e.t === p.t);
      if (want > 0) { ok(g.length >= 1 && g[0].to === foe && g[0].amount === want, `t ${p.t}: reflect ${g[0] && g[0].amount} want ${want}`); n++; }
    }
    ok(n > 3, 'reflected at least 4 times');
    eq(tabSum, evSum, "tab 'ทำดาเมจ' → สะท้อน = skill damage");
    return x;
  }],
  ['PL-7', 'ตีโดน → ติดไฟ v ศัตรูแถวหลังเลนเดียวกัน', (c, L, i) => {
    const x = scRun([[c, L, 0, 0]], [[scBag('ZB-1'), 1, 0, 0], [scBag('ZB-2'), 1, 2, 0], [scBag('ZB-3'), 1, 2, 1]]), me = x.uid(0, 0, 0), v = sk('PL-7').v[i];
    const hits = scHits(x.r, me).filter(e => e.t <= 30000).length, got = x.r.events.filter(e => e.k === 'burn' && e.from === me && e.t <= 30000);
    eq(got.map(e => [e.to, e.amount]), Array(hits).fill([x.uid(1, 2, 0), v]), 'burn per hit to the back enemy in my lane');
    return x;
  }],
  ['PL-4', 'ตีโดน → พลังโจมตี +30% ของไฟบนศัตรูเลนเดียวกัน', (c, L, i) => {
    const x = scRun([[c, L, 0, 0]], [[scBag('ZB-1'), 1, 0, 0]]), me = x.uid(0, 0, 0), foe = x.uid(1, 0, 0), v = sk('PL-4').v[i];
    const got = scSk(x.r, me, 0, 'atkUp'); let n = 0;
    for (const p of scProcs(x.r, me, 0).filter(e => e.t <= 60000)) {
      const b = x.r.events.filter(e => e.k === 'burn' && e.to === foe && e.t === p.t).pop(); // own burn/hit lands first (statuses on enemies before self effects)
      const want = Math.floor((b ? b.total : 0) * v / 100), g = got.filter(e => e.t === p.t);
      if (want > 0) { eq(g.map(e => e.amount), [want], `t ${p.t}: atk + (burn ${b.total})`); n++; }
    }
    ok(n > 3, 'gained attack at least 4 times');
    eq(x.res.get(me).fin.atk, c.atk[i] + got.reduce((a, e) => a + e.amount, 0), 'attack at end (stat tab)');
    return x;
  }],
  ['PL-5', 'ตัวเอง down → เรียก PL-7 เลเวลเท่ากัน ช่องเดิม HP เต็ม', (c, L, i) => {
    const x = scRun([[c, L, 0, 0]], [[scPunch('ZP-1', 2000, { cdMs: [8000, 8000, 8000] }), 1, 0, 0]]), me = x.uid(0, 0, 0);
    const s = x.r.events.find(e => e.k === 'summon' && e.from === me), p7 = scC('PL-7');
    ok(s, 'summoned');
    eq([s.unit.id, s.unit.level, s.unit.row, s.unit.lane, s.unit.hp, s.unit.maxHp, s.unit.armor], ['PL-7', L, 0, 0, p7.hp[i], p7.hp[i], 0], 'summoned unit');
    ok(x.model.per.has(s.unit.uid), 'summoned unit has its own row in the tab');
    const fx = [...(x.model.fxGiven.get(me) || new Map()).values()].flatMap(r => r.list.map(q => q.e));
    ok(fx.includes(s), 'G3: summon listed in PL-5 tab อื่นๆ');
    return x;
  }],
  ['PL-8', 'ตีโดน → ติดไฟ v ศัตรูทั้งเลน', (c, L, i) => {
    const x = scRun([[c, L, 0, 0]], [[scBag('ZB-1'), 1, 0, 0], [scBag('ZB-2'), 1, 1, 0], [scBag('ZB-3'), 1, 0, 1]]), me = x.uid(0, 0, 0), v = sk('PL-8').v[i];
    const h1 = scHits(x.r, me)[0], got = x.r.events.filter(e => e.k === 'burn' && e.from === me && e.t === h1.t);
    eq(got.map(e => [e.to, e.amount]).sort(), [[x.uid(1, 0, 0), v], [x.uid(1, 1, 0), v]].sort(), 'burn to my lane only');
    return x;
  }],
  ['PL-6', 'ตีโดน → ไฟ/ฮิต +v', (c, L, i) => {
    const x = scRun([[c, L, 0, 0]], [[scBag('ZB-1'), 1, 0, 0]]), me = x.uid(0, 0, 0), v = sk('PL-6').v[i];
    const hits = scHits(x.r, me).length;
    eq(x.res.get(me).fin.burnHit, c.burn[i] + v * hits, 'burn/hit at end (stat tab)');
    const b = x.r.events.filter(e => e.k === 'burn' && e.from === me).slice(0, 3).map(e => e.amount);
    eq(b, [1, 2, 3].map(k => c.burn[i] + v * k).filter(a => a > 0).slice(0, b.length), 'burn applied grows by v each hit');
    return x;
  }],
  ['SF-2', 'โดนตี → ได้เกราะ 70% ของช็อตบนผู้ตี', (c, L, i) => {
    const shocker = mk('ZS-1', { tribe: 'ทดสอบ', atk: L3(0), cdMs: NEVER, hp: L3(100000), skills: [{ when: 'matchStart', do: 'shock', to: 'enemyFront', v: L3(25) }] });
    const x = scRun([[c, L, 0, 0], [shocker, 1, 1, 0]], [[scPunch('ZP-1', 1), 1, 0, 0]]), me = x.uid(0, 0, 0), v = sk('SF-2').v[i], at = scLedger(x.r);
    const got = scSk(x.r, me, 0, 'armor').filter(e => e.t <= 20000);
    ok(got.length >= 10, 'armor from skill each hit taken');
    for (const g of got) eq(g.amount, Math.floor(at(x.r.events.indexOf(g)).get(x.uid(1, 0, 0)).shock * v / 100), `t ${g.t}: armor`);
    return x;
  }],
  ['SF-4', 'เพื่อน down → ช็อต/ฮิต +v', (c, L, i) => {
    const glass = mk('ZG-1', { tribe: 'ทดสอบ', atk: L3(0), cdMs: NEVER, hp: L3(1) });
    const x = scRun([[c, L, 2, 0], [glass, 1, 0, 0], [glass, 1, 0, 1]], [[scPunch('ZP-1', 5), 1, 0, 0], [scPunch('ZP-2', 5), 1, 0, 1]]), me = x.uid(0, 2, 0), v = sk('SF-4').v[i];
    const downs = x.r.events.filter(e => e.k === 'down' && e.who !== me && x.units.find(u => u.uid === e.who).side === 0 && e.t < 7000).length;
    ok(downs === 2, 'two allies down before SF-4 attacks');
    const s1 = x.r.events.filter(e => e.k === 'shock' && e.from === me);
    ok(s1.length && s1[0].amount === c.shock[i] + 2 * v, `first shock/hit ${s1[0] && s1[0].amount} = base + 2v`);
    return x;
  }],
  ['SF-5', 'เริ่มแมตช์ down ตัวเอง → ติดช็อต v ศัตรูทุกตัว', (c, L, i) => {
    const x = scRun([[c, L, 0, 0], [scC('PT-1'), 1, 1, 0]], [[scBag('ZB-1'), 1, 0, 0], [scBag('ZB-2'), 1, 1, 1]]), me = x.uid(0, 0, 0), v = sk('SF-5', 1).v[i];
    ok(x.r.events.some(e => e.k === 'down' && e.who === me && e.t === 0), 'down at 0 s');
    eq(x.r.events.filter(e => e.k === 'shock' && e.from === me).map(e => [e.to, e.amount]).sort(), [[x.uid(1, 0, 0), v], [x.uid(1, 1, 1), v]].sort(), 'shock to every enemy');
    eq(x.model.act.get(me).shockU, 2 * v, "tab sub-line 'ติดช็อต'");
    ok(x.model.per.get(me).in.some(r => r.why === 'execute' && r.from == null), "G1: self-KO = ownerless 'execute' row in SF-5 tab โดนทำดาเมจ (label 'ตัวเอง down (สกิล)')");
    return x;
  }],
  ['SF-8', 'ทุกชุด → ตีแบ่งทุกตัว (หารพลังโจมตี/ช็อตเท่ากัน ปัดลง ต่ำสุด 1)', (c, L, i) => {
    const x = scRun([[c, L, 0, 0]], [[scBag('ZB-1'), 1, 0, 0], [scBag('ZB-2'), 1, 1, 0], [scBag('ZB-3'), 1, 0, 1]]), me = x.uid(0, 0, 0);
    const t1 = x.r.events.find(e => e.k === 'set' && e.who === me).t;
    eq(scHits(x.r, me, e => e.t === t1).map(e => e.amount), Array(3).fill(Math.max(1, Math.floor(c.atk[i] / 3))), 'hit split 3 ways');
    eq(x.r.events.filter(e => e.k === 'shock' && e.from === me && e.t === t1).map(e => e.amount), Array(3).fill(Math.floor(c.shock[i] / 3)).filter(a => a > 0), 'shock/hit split 3 ways');
    const a = x.model.act.get(me), sets = x.r.events.filter(e => e.k === 'set' && e.who === me).length;
    eq([a.hits, a.subs], [sets, sets * 2], "tab: 1 hit + 2 sub-hits per set");
    return x;
  }],
  ['SF-6', 'ตีโดน → ดูดช็อต 30% จากเป้า (ปัดลง) เป็นช็อต/ฮิตตัวเอง', (c, L, i) => {
    const x = scRun([[c, L, 0, 0]], [[scBag('ZB-1'), 1, 0, 0]]), me = x.uid(0, 0, 0), foe = x.uid(1, 0, 0), v = sk('SF-6').v[i], at = scLedger(x.r);
    const st = scSk(x.r, me, 0, 'steal').filter(e => e.t <= 50000);
    ok(st.length > 4, 'stole shock');
    for (const e of st) eq(e.amount, Math.floor(at(x.r.events.indexOf(e)).get(foe).shock * v / 100), `t ${e.t}: steal`);
    const all = scSk(x.r, me, 0, 'steal');
    eq(x.res.get(me).fin.shockHit, c.shock[i] + all.reduce((a, e) => a + e.amount, 0), 'shock/hit at end (stat tab) = base + all stolen');
    // shock burst on each hit = shock sitting on the target at that moment (ledger)
    const at2 = scLedger(x.r);
    for (const e of x.r.events.filter(q => q.k === 'dmg' && q.why === 'shock' && q.from === me && q.t <= 50000)) eq(e.amount, at2(x.r.events.indexOf(e)).get(foe).shock, `t ${e.t}: shock burst`);
    return x;
  }],
  // set 92 (import 5 Nov, config rev 7): SF-3 shocks the attacker instead of damaging it (old kit 'SF-3@1' kept below)
  ['SF-3', 'โดนตี → ติดช็อต v ผู้ตี', (c, L, i) => {
    const x = scRun([[c, L, 0, 0]], [[scPunch('ZP-1', 1), 1, 0, 0]]), me = x.uid(0, 0, 0), v = sk('SF-3').v[i];
    const n = scProcs(x.r, me, 0).length;
    ok(n > 0, `procs = ${n}`);
    eq(x.r.events.filter(e => e.k === 'shock' && e.from === me && e.why !== 'hit').slice(0, n).map(e => [e.to, e.amount]), Array(n).fill([x.uid(1, 0, 0), v]), 'shock per hit taken');
    return x;
  }],
  ['WY-2', 'โดนตี → ดาเมจ v ศัตรูแถวกลางเลนเดียวกัน', (c, L, i) => {
    const x = scRun([[c, L, 0, 0]], [[scPunch('ZP-1', 1), 1, 0, 0], [scBag('ZB-1'), 1, 1, 0], [scBag('ZB-2'), 1, 1, 1]]), me = x.uid(0, 0, 0), v = sk('WY-2').v[i];
    const [evSum, tabSum, evs] = scSkillDmg(x, me, 0, 'skill');
    eq(evs.filter(e => e.t <= 10000).map(e => [e.to, e.amount]), Array(scProcs(x.r, me, 0).filter(e => e.t <= 10000).length).fill([x.uid(1, 1, 0), v]), 'damage to the middle enemy of my lane');
    eq(tabSum, evSum, "tab 'ทำดาเมจ' → สกิล");
    return x;
  }],
  ['WY-7', 'ตีโดน → ดาเมจ v ศัตรูแถวหลังเลนเดียวกัน', (c, L, i) => {
    const x = scRun([[c, L, 0, 0]], [[scBag('ZB-1'), 1, 0, 0], [scBag('ZB-2'), 1, 2, 0], [scBag('ZB-3'), 1, 2, 1]]), me = x.uid(0, 0, 0), v = sk('WY-7').v[i];
    const [evSum, tabSum, evs] = scSkillDmg(x, me, 0, 'skill');
    eq(evs.filter(e => e.t <= 30000).map(e => [e.to, e.amount]), Array(scHits(x.r, me).filter(e => e.t <= 30000).length).fill([x.uid(1, 2, 0), v]), 'damage per hit to my back enemy');
    eq(tabSum, evSum, "tab 'ทำดาเมจ' → สกิล");
    return x;
  }],
  ['WY-4', 'ตีโดน → พลังโจมตี +v', (c, L, i) => {
    const x = scRun([[c, L, 0, 0]], [[scBag('ZB-1'), 1, 0, 0]]), me = x.uid(0, 0, 0), v = sk('WY-4').v[i];
    const h = scHits(x.r, me).slice(0, 3 * c.multi[i]).map(e => e.amount); // gains land after the set's hits (status stage)
    eq(h, h.map((_, k) => c.atk[i] + v * c.multi[i] * Math.floor(k / c.multi[i])), 'each set hits v × (hits of last set) harder');
    eq(x.res.get(me).fin.atk, c.atk[i] + v * scHits(x.r, me).length, 'attack at end (stat tab)');
    return x;
  }],
  ['WY-5', 'ตีโดน → เกราะ/ฮิต +v', (c, L, i) => {
    const x = scRun([[c, L, 0, 0]], [[scBag('ZB-1'), 1, 0, 0]]), me = x.uid(0, 0, 0), v = sk('WY-5').v[i];
    eq(x.res.get(me).fin.armorHit, c.armorHit[i] + v * scHits(x.r, me).length, 'armor/hit at end (stat tab)');
    return x;
  }],
  ['WY-8', 'ตีโดน → เพื่อนวายุหน้า/หลัง มัลติฮิต +v · ตัวเองคูลดาวน์ช้าลง 50% ต่อฮิต', (c, L, i) => {
    const x = scRun([[c, L, 1, 0], [scC('WY-1'), 1, 0, 0], [scC('WY-1'), 1, 2, 0], [scC('PT-1'), 1, 0, 1]], [[scBag('ZB-1'), 1, 0, 0], [scBag('ZB-2'), 1, 0, 1]]), me = x.uid(0, 1, 0), v = sk('WY-8').v[i];
    const hits = scHits(x.r, me).length, w1 = scC('WY-1');
    eq([x.uid(0, 0, 0), x.uid(0, 2, 0), x.uid(0, 0, 1)].map(u => x.res.get(u).fin.multi), [w1.multi[0] + v * hits, w1.multi[0] + v * hits, scC('PT-1').multi[0]], 'multi-hit at end: front + back wind allies only');
    const sets = x.r.events.filter(e => e.k === 'set' && e.who === me).map(e => e.t);
    let cd = c.cdMs[i] / (1 + sk('WY-8', 1).v[i] / 100); // gap 1 = base: a slow-down counts from the next cooldown
    for (let k = 1; k < Math.min(sets.length, 4); k++) { cd = cd * (1 + sk('WY-8', 1).v[i] / 100); ok(Math.abs(sets[k] - sets[k - 1] - cd) <= 100, `gap ${k}: ${sets[k] - sets[k - 1]} ms, want ~${Math.round(cd)} (×1.5 per hit, compounding)`); }
    return x;
  }],
  ['WY-6', 'ทำศัตรู down → มัลติฮิต +1', (c, L, i) => {
    const glass = mk('ZG-1', { tribe: 'ทดสอบ', atk: L3(0), cdMs: NEVER, hp: L3(1) });
    const x = scRun([[c, L, 0, 0]], [[glass, 1, 0, 0], [glass, 1, 1, 0], [scBag('ZB-1', { hp: L3(1e9) }), 1, 2, 0]]), me = x.uid(0, 0, 0), v = sk('WY-6').v[i];
    const kills = scProcs(x.r, me, 0).length;
    ok(kills === 2, `kills ${kills}`);
    eq(x.res.get(me).fin.multi, c.multi[i] + v * kills, 'multi-hit at end (stat tab)');
    return x;
  }],
  ['PT-2', 'โดนตี → ฟื้น HP v', (c, L, i) => {
    const x = scRun([[c, L, 0, 0]], [[scPunch('ZP-1', 30), 1, 0, 0]]), me = x.uid(0, 0, 0), v = sk('PT-2').v[i];
    const got = scSk(x.r, me, 0, 'heal');
    ok(got.length >= 2, 'healed');
    eq(got.slice(0, 2).map(e => e.amount), [v, v], 'heal per hit taken (missing HP ≥ v)');
    return x;
  }],
  ['PT-3', 'ตัวเอง down → เพื่อนเผ่าเดียวกัน คูลดาวน์ −v% (ถาวร)', (c, L, i) => {
    const sp = mk('ZT-1', { tribe: 'ภูติ', atk: L3(1), cdMs: 10000, hp: L3(100000) }), st = mk('ZT-2', { tribe: 'ทดสอบ', atk: L3(1), cdMs: 10000, hp: L3(100000) });
    const x = scRun([[c, L, 0, 0], [sp, 1, 0, 1], [st, 1, 1, 1]], [[scPunch('ZP-1', 2000), 1, 0, 0]]), me = x.uid(0, 0, 0), v = sk('PT-3').v[i];
    eq(scSk(x.r, me, 0, 'cdPct').map(e => [e.to, e.pct]), [[x.uid(0, 0, 1), v]], 'cooldown cut to the spirit ally only');
    const t0 = x.r.events.find(e => e.k === 'down' && e.who === me).t;
    const gaps = id => { const p = x.r.events.filter(e => e.k === 'set' && e.who === id && e.t > t0).map(e => e.t); return p.slice(1, 4).map((t, k) => t - p[k]); };
    const want = Math.ceil(10000 * (1 - v / 100) / RULES.tickMs) * RULES.tickMs; // acts on the first 0.1 s tick after the cooldown
    ok(gaps(x.uid(0, 0, 1)).length === 3 && gaps(x.uid(0, 0, 1)).every(g => g === want), `spirit ally gaps ${gaps(x.uid(0, 0, 1))} want ${want}`);
    ok(gaps(x.uid(0, 1, 1)).every(g => g === 10000), 'other ally unchanged');
    eq(x.r.perm.filter(g => g.id === 'ZT-1').map(g => g.amount), [v], 'kept as permanent');
    return x;
  }],
  ['PT-7', 'ตีโดน → เพื่อนหน้า/หลัง ฟื้น 20% ของ HP สูงสุดของตัวที่ได้', (c, L, i) => {
    const x = scRun([[c, L, 1, 0], [scC('HL-3'), 3, 0, 0], [scC('PT-1'), 1, 2, 0]], [[scPunch('ZP-1', 60), 1, 0, 0]]), me = x.uid(0, 1, 0), v = sk('PT-7').v[i], at = scLedger(x.r);
    const got = scSk(x.r, me, 0, 'heal').filter(e => e.t <= 40000);
    ok(got.some(e => e.to === x.uid(0, 0, 0)), 'front ally healed');
    for (const e of got) { const s = at(x.r.events.indexOf(e)).get(e.to); eq(e.amount, Math.min(Math.floor(s.maxHp * v / 100), s.maxHp - s.hp), `t ${e.t}: heal`); }
    return x;
  }],
  ['PT-4', 'ตีโดน → ล้างไฟ/ช็อต 30% ของที่มี (ปัดลง) ให้ทั้งทีม', (c, L, i) => {
    const sh = mk('ZS-1', { tribe: 'ทดสอบ', atk: L3(0), cdMs: NEVER, hp: L3(100000), skills: [{ when: 'matchStart', do: 'shock', to: 'allEnemies', v: L3(50) }] });
    const x = scRun([[c, L, 0, 0], [scC('PT-1'), 1, 1, 0]], [[sh, 1, 0, 0]]), me = x.uid(0, 0, 0), v = sk('PT-4').v[i], at = scLedger(x.r);
    const got = scSk(x.r, me, 0, 'cleanse').filter(e => e.t <= 30000);
    ok(got.length >= 4, 'cleansed');
    for (const e of got) eq(e.cut[1], Math.floor(at(x.r.events.indexOf(e)).get(e.to).shock * v / 100), `t ${e.t}: shock removed`);
    return x;
  }],
  ['WN-2', 'ตัวเอง down แล้วลุก (โควตาอสูร) → พลังโจมตี +v ถาวร', (c, L, i) => {
    // tribes on: demon quota lets WN-2 get back up once (in-match +v) · every down counts for the permanent gain, including the real one later (F2)
    const x = scRun([[c, L, 0, 0], [scC('WN-3'), 1, 1, 0], [scC('WN-7'), 1, 2, 0], [scC('PT-1'), 1, 2, 1]], [[scPunch('ZP-1', 2000), 1, 0, 0]], { rules: RULES }), me = x.uid(0, 0, 0), v = sk('WN-2').v[i];
    ok(x.r.events.some(e => e.k === 'revive' && e.who === me), 'got back up');
    eq(scSk(x.r, me, 0, 'atkUp').map(e => e.amount), [v], 'attack +v when back up');
    eq(x.r.perm.filter(g => g.id === 'WN-2').map(g => g.amount), [v * scProcs(x.r, me, 0).length], 'permanent gain on every down (F2): the real down later in the match counts too');
    return x;
  }],
  ['WN-3', 'โดนตี → HP สูงสุด +2% (HP เพิ่มเท่ากัน)', (c, L, i) => {
    const x = scRun([[c, L, 0, 0]], [[scPunch('ZP-1', 10), 1, 0, 0]]), me = x.uid(0, 0, 0);
    scHpUp(x, me, 0, sk('WN-3').v[i]);
    return x;
  }],
  ['WN-7', 'เพื่อน down → พลังโจมตี +5', (c, L, i) => {
    const glass = mk('ZG-1', { tribe: 'ทดสอบ', atk: L3(0), cdMs: NEVER, hp: L3(1) });
    const x = scRun([[c, L, 2, 0], [glass, 1, 0, 0], [glass, 1, 0, 1]], [[scPunch('ZP-1', 5), 1, 0, 0], [scPunch('ZP-2', 5), 1, 0, 1]]), me = x.uid(0, 2, 0), v = sk('WN-7').v[i];
    eq(x.res.get(me).fin.atk, c.atk[i] + v * scProcs(x.r, me, 0).length, 'attack at end (stat tab)');
    ok(scProcs(x.r, me, 0).length >= 2, 'fired for both allies');
    return x;
  }],
  ['WN-5', 'ตัวเอง down → เพื่อนอสูรฟื้น 50% ของ HP สูงสุดตัวเอง', (c, L, i) => {
    const dm = mk('ZD-1', { tribe: 'อสูร', atk: L3(0), cdMs: NEVER, hp: L3(1000) }), sp = mk('ZT-1', { tribe: 'ภูติ', atk: L3(0), cdMs: NEVER, hp: L3(1000) });
    const x = scRun([[c, L, 0, 0], [dm, 1, 0, 1], [sp, 1, 1, 1]], [[scPunch('ZP-1', 2000, { cdMs: [3000, 3000, 3000] }), 1, 0, 0], [scPunch('ZP-2', 60), 1, 0, 1]]), me = x.uid(0, 0, 0), v = sk('WN-5').v[i], at = scLedger(x.r);
    const got = scSk(x.r, me, 0, 'heal');
    eq(got.map(e => e.to), [x.uid(0, 0, 1)], 'only the demon ally healed');
    const s = at(x.r.events.indexOf(got[0])).get(got[0].to);
    eq(got[0].amount, Math.min(Math.floor(s.maxHp * v / 100), s.maxHp - s.hp), 'heal amount');
    return x;
  }],
  ['WN-8', 'เริ่มแมตช์ → ศัตรูแถวหน้า HP สูงสุด −50%', (c, L, i) => {
    const x = scRun([[c, L, 0, 0]], [[scBag('ZB-1', { hp: L3(1001) }), 1, 0, 0], [scBag('ZB-2', { hp: L3(500) }), 1, 0, 1], [scBag('ZB-3', { hp: L3(800) }), 1, 1, 0]]), v = sk('WN-8').v[i];
    const got = x.r.events.filter(e => e.k === 'maxhp' && e.t === 0).map(e => [e.to, e.maxHp]);
    eq(got.sort(), [[x.uid(1, 0, 0), 1001 - Math.floor(1001 * v / 100)], [x.uid(1, 0, 1), 500 - Math.floor(500 * v / 100)]].sort(), 'front row max HP cut (cut rounded down)');
    return x;
  }],
  ['WN-6', 'เพื่อน down → พลังโจมตี +v% · ตีโดน → ดูดเลือด 50% ของดาเมจที่ฮิตนั้นทำ (รวมช็อตที่แตก)', (c, L, i) => {
    const glass = mk('ZG-1', { tribe: 'ทดสอบ', atk: L3(0), cdMs: NEVER, hp: L3(1) });
    const x = scRun([[c, L, 2, 0], [glass, 1, 0, 0]], [[scPunch('ZP-1', 5), 1, 0, 0], [scPunch('ZP-2', 300, { cdMs: [4000, 4000, 4000], skills: [{ when: 'matchStart', do: 'shock', to: 'enemyFront', v: L3(0) }] }), 1, 1, 0]]), me = x.uid(0, 2, 0);
    const v0 = sk('WN-6').v[i], v1 = sk('WN-6', 1).v[i];
    const up = scSk(x.r, me, 0, 'atkUp');
    eq(up.map(e => e.amount), [Math.floor(c.atk[i] * v0 / 100)], 'attack +v% after 1 ally down');
    const at = scLedger(x.r);
    for (const h of scSk(x.r, me, 1, 'heal').filter(e => e.t <= 40000)) {
      const hit = x.r.events.filter(e => e.k === 'dmg' && (e.why === 'hit' || e.why === 'shock') && e.from === me && e.t === h.t).reduce((a, e) => a + e.amount, 0), s = at(x.r.events.indexOf(h)).get(me);
      eq(h.amount, Math.min(Math.floor(hit * v1 / 100), s.maxHp - s.hp), `t ${h.t}: lifesteal of hit + shock burst ${hit}`);
    }
    return x;
  }],
  // F4 (28 Oct, user B): the rule is kept as the code does it — lifesteal counts the hit AND the shock that bursts on that target (hit 20 + shock 30 → heals 50% of 50)
  ['WN-6', 'ดูดเลือดรวมช็อตที่แตกบนเป้า (ฮิต 20 + ช็อต 30 → ดูด 50% ของ 50)', (c, L, i) => {
    const sh = mk('ZS-1', { tribe: 'ทดสอบ', atk: L3(0), cdMs: NEVER, hp: L3(100000), skills: [{ when: 'matchStart', do: 'shock', to: 'enemyFront', v: L3(30) }] });
    const x = scRun([[c, L, 0, 0], [sh, 1, 1, 0]], [[scPunch('ZP-1', 20), 1, 0, 0]]), me = x.uid(0, 0, 0), v1 = sk('WN-6', 1).v[i], at = scLedger(x.r);
    const h = scSk(x.r, me, 1, 'heal')[0];
    ok(h, 'lifesteal fired');
    const hit = x.r.events.filter(e => e.k === 'dmg' && e.why === 'hit' && e.from === me && e.t === h.t).reduce((a, e) => a + e.amount, 0);
    const burst = x.r.events.filter(e => e.k === 'dmg' && e.why === 'shock' && e.from === me && e.t === h.t).reduce((a, e) => a + e.amount, 0), s = at(x.r.events.indexOf(h)).get(me);
    ok(burst > 0, 'shock burst happened in the same set');
    eq(h.amount, Math.min(Math.floor((hit + burst) * v1 / 100), s.maxHp - s.hp), `lifesteal of hit ${hit} + shock ${burst}`);
    return x;
  }],
  // F2 (28 Oct, user A): WN-2 gains the permanent attack on EVERY down, including a real down (no demon quota, no revive)
  ['WN-2', 'down จริง (ไม่ได้ลุก) → ได้พลังโจมตี +v ถาวรด้วย (ผลในแมตช์ไม่มี)', (c, L, i) => {
    const x = scRun([[c, L, 0, 0], [scC('PT-1'), 1, 1, 0]], [[scPunch('ZP-1', 2000), 1, 0, 0]]), me = x.uid(0, 0, 0), v = sk('WN-2').v[i];
    ok(x.r.events.some(e => e.k === 'down' && e.who === me) && !x.r.events.some(e => e.k === 'revive' && e.who === me), 'WN-2 went down for good');
    eq(scProcs(x.r, me, 0).length, 1, 'skill fired once');
    eq(x.r.perm.filter(g => g.id === 'WN-2').map(g => g.amount), [v], 'permanent attack gained after a real down');
    ok(!x.r.events.some(e => e.k === 'atkUp' && e.to === me), 'no in-match attack change on a unit that is down');
    return x;
  }],
  ['PT-5', 'ตีโดน → เพื่อนภูติสุ่ม (ไม่ใช่ PT-5) ตีเป้าเดียวกันทันที', (c, L, i) => {
    const x = scRun([[c, L, 2, 0], [scC('PT-1'), 1, 0, 0], [scC('PT-1'), 1, 0, 1], [scC('HL-1'), 1, 1, 1]], [[scBag('ZB-1'), 1, 0, 0], [scBag('ZB-2'), 1, 0, 1]]), me = x.uid(0, 2, 0);
    const n = L === 3 ? 2 : 1, si = L === 3 ? 1 : 0, h1 = scHits(x.r, me)[0];
    const carried = x.r.events.filter(e => e.k === 'dmg' && e.why === 'hit' && e.t === h1.t && e.d && e.d.carried && e.to === h1.to);
    eq(carried.length, n, `carried hits after PT-5 hit 1 (skill ${si + 1})`);
    ok(carried.every(e => scC(x.units.find(u => u.uid === e.from).id).tribe === 'ภูติ' && e.amount === scC('PT-1').atk[0]), 'spirit ally hits with its own attack');
    // tab: carried hits are the ally's damage, not PT-5's
    const pt1 = carried[0].from;
    ok(x.model.per.get(pt1).out.some(q => q.ei === x.r.events.indexOf(carried[0])), "tab 'ทำดาเมจ' of the ally holds the carried hit");
    return x;
  }],
  ['WN-4', 'ตีโดน → ชุบเพื่อนที่ down v ตัว ด้วย HP 20%', (c, L, i) => {
    const glass = mk('ZG-1', { tribe: c.tribe, // set 129 import: WN-4 sameTribe → downed allies share its tribe
      atk: L3(0), cdMs: NEVER, hp: L3(50) }), wall = scBag('ZW-1', { tribe: 'ทดสอบ' });
    const x = scRun([[c, L, 2, 0], [glass, 1, 0, 0], [glass, 1, 0, 1], [wall, 1, 1, 0], [wall, 1, 1, 1]], [[scPunch('ZP-1', 100, { cdMs: [2000, 2000, 2000] }), 1, 0, 0], [scPunch('ZP-2', 100, { cdMs: [2000, 2000, 2000] }), 1, 0, 1]]), me = x.uid(0, 2, 0);
    const h1 = scHits(x.r, me)[0], rev = x.r.events.filter(e => e.k === 'revive' && e.t === h1.t);
    eq(rev.length, sk('WN-4', L === 3 ? 1 : 0).v[i], 'allies revived on first hit');
    for (const e of rev) eq(e.hp, Math.floor(50 * (RULES.reviveAllyHpPct ?? 20) / 100), 'revive HP 20%');
    const fx = [...(x.model.fxGiven.get(me) || new Map()).values()].flatMap(r => r.list.map(q => q.e));
    for (const e of rev) { eq(e.from, me, 'G2: revive giver = WN-4'); ok(fx.includes(e), 'G2: revive listed in WN-4 tab อื่นๆ'); }
    return x;
  }],
];
const SC_TESTS = SC_SKILL.map(([id, what, fn]) => [`สกิล+แท็บวิเคราะห์: ${id} ${scC(id).name} Lv1–3 ${what}`, () => {
  const c = scC(id);
  for (const [L, i] of scLv(c)) {
    let x;
    try { x = fn(c, L, i); } catch (e) { throw new Error(`Lv${L}: ${e.message}`); }
    scAgree(x, `${id} Lv${L}`);
  }
}]);
// ---- Retired skills (no character uses these kits since the 28 Oct import) · mechanics still exist, so their tests stay on a frozen copy of the old kit ----
const SC_OLD = { 'HL-2': [{ when: 'hitTaken', do: 'armor', to: 'self', v: [2, 4, 8] }], 'PT-8': [{ when: 'passive', do: 'reflectDebuff', to: 'allAllies', v: [40, 40, 40] }], 'PT-6': [{ when: 'hit', do: 'healOf', of: { stat: 'hpLost', who: 'self' }, sameTribe: true, skipSameId: true, to: 'allAllies', v: [15, 30, 60] },
           { when: 'hitTaken', do: 'hpPct', to: 'self', v: [2, 2, 2] }],
  // set 82 (import 4 Nov): kits replaced that day · key 'ID@n' = n-th old kit of that character
  'PT-6@2': [{ when: 'hit', do: 'healHitUp', sameTribe: true, skipSameId: true, to: 'allyRandom2', v: [30, 30, 30] },
             { when: 'hit', do: 'atkOf', of: { stat: 'healHit', who: 'self' }, to: 'self', v: [10, 10, 10] }],
  'HL-8@1': [{ when: 'passive', do: 'shareArmor', to: 'allAllies', v: [30, 30, 30] }],
  // set 84: HL-2 before the own-tribe filter
  'HL-2@2': [{ when: 'hit', do: 'armorHitUp', to: 'frontAlly', v: [3, 6, 12] }],
  // set 92: SF-3 before the shock kit
  'SF-3@1': [{ when: 'hitTaken', do: 'dmg', to: 'attacker', v: [2, 4, 8] }],
  // set 137 (AMCFG1 rev 32): kits replaced
  'HL-3@1': [{ when: 'hit', do: 'armorHitUp', to: 'self', v: [2, 4, 8] }],
  'HL-5@1': [{ when: 'selfDown', do: 'armor', perm: true, sameTribe: true, to: 'backLaneAlly', v: [7, 14, 28] }],
  'PL-3@1': [{ when: 'selfDown', do: 'burn', to: 'enemyFrontRow', v: [10, 20, 40] }] };
const SC_RETIRED = [
  ['PL-3@1', 'ตัวเอง down → ติดไฟ v ศัตรูแถวหน้าทั้ง 2 เลน · ดาเมจไฟนับให้ PL-3', (c, L, i) => {
    const x = scRun([[c, L, 0, 0], [scBag('ZW-1'), 1, 0, 1]], [[scPunch('ZP-1', 2000), 1, 0, 0], [scBag('ZB-1'), 1, 0, 1], [scBag('ZB-2'), 1, 1, 0]]), me = x.uid(0, 0, 0), v = c.skills[0].v[i];
    const got = x.r.events.filter(e => e.k === 'burn' && e.from === me);
    eq(got.map(e => [e.to, e.amount]).sort(), [[x.uid(1, 0, 0), v], [x.uid(1, 0, 1), v]].sort(), 'burn to both front-row enemies');
    // burn deals v, v−2, v−4 … each second (combat-rules) → all of it is PL-3's
    let want = 0; for (let b = v; b > 0; b -= RULES.burnDecay ?? 2) want += b;
    const tab = x.model.per.get(me).out.filter(q => q.why === 'burn').reduce((a, q) => a + q.amt, 0);
    eq(tab, want * 2, "tab 'ทำดาเมจ' → ไฟ");
    return x;
  }],
  ['HL-5@1', 'ตัวเอง down → เพื่อนเผ่าเดียวกันข้างหลังเลนเดียวกัน ได้เกราะ v (ถาวร)', (c, L, i) => {
    const x = scRun([[c, L, 0, 0], [scC('HL-1'), 1, 1, 0], [scC('PT-1'), 1, 1, 1]], [[scPunch('ZP-1', 2000), 1, 0, 0]]), me = x.uid(0, 0, 0), v = c.skills[0].v[i];
    const got = scSk(x.r, me, 0, 'armor');
    eq(got.map(e => [e.to, e.amount]), [[x.uid(0, 1, 0), v]], 'armor to the steel ally behind only');
    eq(x.r.perm.filter(g => g.key && g.id === 'HL-1').map(g => g.amount), [v], 'kept as permanent');
    return x;
  }],
  ['HL-3@1', 'ตีโดน → เกราะ/ฮิต +v', (c, L, i) => {
    const x = scRun([[c, L, 0, 0]], [[scBag('ZB-1'), 1, 0, 0]]), me = x.uid(0, 0, 0), v = c.skills[0].v[i];
    const hits = scHits(x.r, me).length, fin = x.res.get(me).fin;
    eq(fin.armorHit, c.armorHit[i] + v * hits, 'armor/hit at end (stat tab)');
    eq(scSk(x.r, me, 0, 'buff').map(e => e.amount), Array(hits).fill(v), 'armor/hit +v per hit');
    return x;
  }],
  ['HL-2', 'โดนตี → ได้เกราะ v', (c, L, i) => {
    const x = scRun([[c, L, 0, 0]], [[scPunch('ZP-1', 1), 1, 0, 0]]), me = x.uid(0, 0, 0), v = c.skills[0].v[i];
    const pr = scProcs(x.r, me, 0).filter(e => e.t <= 5000), got = scSk(x.r, me, 0, 'armor').filter(e => e.t <= 5000);
    ok(pr.length === 5, `procs in 5 s = ${pr.length} (1 hit/s)`);
    eq(got.map(e => e.amount), Array(5).fill(v), 'armor per hit taken');
    return x;
  }],
  ['PT-8', 'ติดตัว → เพื่อนโดนใส่ไฟ/ช็อต ผู้ใส่โดนกลับ 40% (ปัดลง)', (c, L, i) => {
    const sh = mk('ZS-1', { tribe: 'ทดสอบ', atk: L3(1), cdMs: 1000, hp: L3(100000), shock: L3(10), burn: L3(10) });
    const x = scRun([[c, L, 1, 0], [scC('HL-3'), 3, 0, 0]], [[sh, 1, 0, 0]]), foe = x.uid(1, 0, 0), v = c.skills[0].v[i];
    const back = x.r.events.filter(e => (e.k === 'burn' || e.k === 'shock') && e.to === foe && e.t <= 5000).map(e => [e.k, e.amount]);
    eq(back, [1, 2, 3, 4, 5].flatMap(() => [['burn', Math.floor(10 * v / 100)], ['shock', Math.floor(10 * v / 100)]]), 'burn + shock reflected each second');
    return x;
  }],
  ['PT-6', 'ตีโดน → ฟื้นเพื่อนเผ่าเดียวกัน (ไม่ใช่ PT-6) + ตัวเอง v% ของ HP ที่ตัวเองเสีย · โดนตี → HP สูงสุด +2%', (c, L, i) => {
    const x = scRun([[c, L, 0, 0], [scC('PT-1'), 1, 0, 1], [scC('HL-1'), 1, 1, 1]], [[scPunch('ZP-1', 15), 1, 0, 0], [scPunch('ZP-2', 5), 1, 0, 1]]), me = x.uid(0, 0, 0);
    const v0 = c.skills[0].v[i], v1 = c.skills[1].v[i];
    scHpUp(x, me, 1, v1);
    const h0 = scSk(x.r, me, 0, 'heal').filter(e => e.t <= 20000);
    ok(h0.some(e => e.to === x.uid(0, 0, 1)) && h0.every(e => e.to !== x.uid(0, 1, 1)), 'heals the spirit ally, never the steel ally');
    const at = scLedger(x.r);
    for (const p of scProcs(x.r, me, 0).filter(e => e.t <= 20000)) {
      const hs = h0.filter(q => q.t === p.t); if (!hs.length) continue;
      const S = at(x.r.events.indexOf(hs[0])), lost = S.get(me).maxHp - Math.max(0, S.get(me).hp);
      // F3 (28 Oct, user A): PT-6's lost HP is read once when the skill fires → every receiver gets the same % (capped by its own missing HP)
      hs.forEach((e, k) => { const r0 = S.get(e.to), want = Math.min(Math.floor(lost * v0 / 100), r0.maxHp - r0.hp); eq(e.amount, want, `t ${p.t}: heal #${k + 1} (${v0}% of PT-6 lost HP ${lost})`); });
    }
    return x;
  }],
  // F1 (28 Oct, user A): PT-8 reflected burn/shock → credited to PT-8 itself · its 'อื่นๆ' row lists every reflect: who got it back (to) and which ally it protected (ally)
  ['PT-8', 'ไฟ/ช็อตที่สะท้อน นับเป็นของ PT-8 เอง · แท็บ "อื่นๆ" ลงทุกครั้งที่สะท้อน + เป้าที่โดนกลับ + เพื่อนที่ปกป้อง', (c, L, i) => {
    const sh = mk('ZS-1', { tribe: 'ทดสอบ', atk: L3(1), cdMs: 1000, hp: L3(100000), shock: L3(10), burn: L3(10) });
    const x = scRun([[c, L, 1, 0], [scC('HL-3'), 3, 0, 0]], [[sh, 1, 0, 0]]), me = x.uid(0, 1, 0), ally = x.uid(0, 0, 0), foe = x.uid(1, 0, 0);
    const refl = x.r.events.filter(e => e.k === 'reflectDebuff');
    ok(refl.length > 0, 'reflected at least once');
    ok(refl.every(e => e.from === me && e.to === foe && e.si === 0), 'reflect: from = PT-8, to = the enemy, si = skill 1');
    ok(refl[0].ally === ally && refl.every(e => x.model.sideOf(e.ally) === 0), 'ally = the protected unit (first one is the front ally)');
    const row = (x.model.fxGiven.get(me) || new Map()).get('si:0');
    ok(row && refl.every(e => row.list.some(q => q.e === e)), "every reflect is in PT-8's 'อื่นๆ' row");
    const back = x.r.events.filter(e => (e.k === 'burn' || e.k === 'shock') && e.why === 'reflect');
    ok(back.length > 0 && back.every(e => e.from === me), 'reflected burn/shock credited to PT-8');
    ok(x.model.per.get(me).out.some(q => q.why === 'burn'), "reflected burn damage shows under PT-8's 'ทำดาเมจ'");
    ok(!x.model.per.get(ally).out.some(q => q.why === 'burn'), 'the protected ally is not credited');
    return x;
  }],
  ['PT-6@2', 'ตีโดน → ภูติสุ่ม 2 ตัว (ไม่ใช่ PT-6) ฟื้น/ฮิต +v · ตีโดน → พลังโจมตี +v% ของ ฟื้น/ฮิต ตัวเอง', (c, L, i) => {
    const sp = id => mk(id, { tribe: 'ภูติ', atk: L3(1), cdMs: NEVER, hp: L3(100000) }), st = mk('ZT-2', { tribe: 'ทดสอบ', atk: L3(1), cdMs: NEVER, hp: L3(100000) });
    const x = scRun([[c, L, 0, 0], [sp('ZT-1'), 1, 0, 1], [sp('ZT-3'), 1, 1, 0], [st, 1, 1, 1], [c, 1, 2, 0]], [[scBag('ZB-1'), 1, 0, 0], [scBag('ZB-2'), 1, 0, 1]]), me = x.uid(0, 0, 0);
    const v0 = c.skills[0].v[i], v1 = c.skills[1].v[i], hits = scHits(x.r, me).length, want = [x.uid(0, 0, 1), x.uid(0, 1, 0)].sort();
    ok(hits >= 3, `PT-6 hit ${hits} times`);
    const g = scSk(x.r, me, 0, 'buff').filter(e => e.what === 'healHitUp');
    eq(g.length, 2 * hits, '2 receivers per hit');
    for (const p of [...new Set(g.map(e => e.t))]) eq(g.filter(e => e.t === p).map(e => e.to).sort(), want, `t ${p}: the 2 spirit allies (never steel, never the other PT-6)`);
    ok(g.every(e => e.amount === v0), 'heal/hit +v each');
    const allUp = x.r.events.filter(e => e.k === 'buff' && e.what === 'healHitUp' && want.includes(e.to)).reduce((a, e) => a + e.amount, 0); // both PT-6 feed them
    eq(x.res.get(want[0]).fin.healHit + x.res.get(want[1]).fin.healHit, allUp, 'receivers heal/hit at end (stat tab) = every +v they got');
    eq(x.res.get(me).fin.healHit, c.healHit[i], 'PT-6 own heal/hit unchanged (skipSameId: the other PT-6 does not feed it)');
    const a = scSk(x.r, me, 1, 'atkUp');
    eq(a.map(e => e.amount), Array(hits).fill(Math.floor(c.healHit[i] * v1 / 100)).filter(n => n > 0), 'attack +v% of own heal/hit per hit (rounded down · a +0 is not logged)');
    eq(x.res.get(me).fin.atk, c.atk[i] + a.reduce((s, e) => s + e.amount, 0), 'attack at end (stat tab)');
    return x;
  }],
  ['HL-8@1', 'แบ่งเกราะ 30% ให้ทั้งทีมทุกครั้งที่ได้เกราะ', (c, L, i) => {
    const x = scRun([[c, L, 0, 0], [scC('PT-1'), 1, 1, 0], [scC('PT-1'), 1, 0, 1]], [[scBag('ZB-1'), 1, 0, 0]]), me = x.uid(0, 0, 0), v = c.skills[0].v[i];
        const firstDown = Math.min(...x.r.events.filter(e => e.k === 'down' && e.to !== me && e.who !== me).map(e => e.t), Infinity);
    const own = x.r.events.filter(e => e.k === 'armor' && e.to === me && e.why !== 'share' && e.t < firstDown);
    ok(own.length > 2, 'HL-8 got armor');
    for (const e of own) {
      const sh = x.r.events.filter(s => s.k === 'armor' && s.why === 'share' && s.t === e.t && s.to !== me);
      eq(sh.map(s => s.amount), Array(2).fill(Math.floor(e.amount * v / 100)).flatMap(a => a > 0 ? [a] : []), `t ${e.t}: share of ${e.amount}`);
    }
    const row = x.model.fxGiven.get(me).get('share'), tab = row ? row.list.reduce((a, q) => a + q.e.amount, 0) : 0;
    eq(tab, x.r.events.filter(s => s.k === 'armor' && s.why === 'share').reduce((a, s) => a + s.amount, 0), "tab 'แบ่งเกราะ' row total");
    return x;
  }],
  ['SF-3@1', 'โดนตี → ดาเมจ v ใส่ผู้ตี', (c, L, i) => {
    const x = scRun([[c, L, 0, 0]], [[scPunch('ZP-1', 1), 1, 0, 0]]), me = x.uid(0, 0, 0), v = c.skills[0].v[i];
    const [evSum, tabSum, evs] = scSkillDmg(x, me, 0, 'skill');
    const pre = e => e.t <= RULES.stormStartMs, n = scProcs(x.r, me, 0).filter(pre).length; // set 98: overtime amplifies damage after stormStartMs
    eq(evs.filter(pre).map(e => [e.to, e.amount]), Array(n).fill([x.uid(1, 0, 0), v]), 'damage per hit taken');
    eq(tabSum, evSum, "tab 'ทำดาเมจ' → สกิล");
    return x;
  }],  ['HL-2@2', 'ตีโดน → เพื่อนข้างหน้า (ทุกเผ่า) เกราะ/ฮิต +v', (c, L, i) => {
    const fr = mk('ZA-1', { tribe: 'ทดสอบ', atk: L3(1), cdMs: NEVER, hp: L3(100000) });
    const x = scRun([[c, L, 1, 0], [fr, 1, 0, 0]], [[scBag('ZB-1'), 1, 0, 0]]), me = x.uid(0, 1, 0), front = x.uid(0, 0, 0), v = c.skills[0].v[i];
    const hits = scHits(x.r, me).length, got = scSk(x.r, me, 0, 'buff').filter(e => e.what === 'armorHitUp');
    ok(hits >= 3, `HL-2 hit ${hits} times`);
    eq(got.map(e => [e.to, e.amount]), Array(hits).fill([front, v]), 'armor/hit +v to the front ally on every hit');
    return x;
  }],
];
const SC_RETIRED_TESTS = SC_RETIRED.map(([id, what, fn]) => [`สกิลเลิกใช้ (กลไกยังอยู่)+แท็บวิเคราะห์: ${id} ชุดเดิม Lv1–3 ${what}`, () => {
  const c = { ...scC(id.split('@')[0]), skills: SC_OLD[id] };
  for (const [L, i] of scLv(c)) {
    let x;
    try { x = fn(c, L, i); } catch (e) { throw new Error(`Lv${L}: ${e.message}`); }
    scAgree(x, `${id} (old kit) Lv${L}`);
  }
}]);
// every in-match skill has a test (new characters / skills must add one here)
const SC_SHOP = new Set(['HL-4', 'PL-2', 'WN-1', 'SF-7', 'WY-3']);
const SC_COVER = ['สกิล+แท็บวิเคราะห์: ทุกตัวที่มีสกิลระหว่างสู้มีเทสต์ในไฟล์นี้', () => {
  const have = new Set(SC_SKILL.map(([id]) => id));
  const miss = SC_CH.filter(c => c.skills.length && !SC_SHOP.has(c.id) && !have.has(c.id)).map(c => c.id);
  eq(miss, [], 'characters with in-match skills but no test');
}];
// Findings F1-F4 (review 28 Oct): all four decided by the user the same day and fixed → now real tests above. The list stays so tests/run.js keeps its "รอผู้ใช้ตัดสิน" output for future findings.
export const FINDINGS_SKILL_CALC = [];
// ---- Random full matches (all 48 characters, Lv1–3 mixed, tribe bonuses ON): tab = battle in every match ----
const SC_FUZZ = ['แท็บวิเคราะห์ = ผลต่อสู้: 300 แมตช์สุ่ม ทุกตัว ทุกเลเวล เปิดโบนัสเผ่า', () => {
  const rng = makeRng(4242), m = makeCharMap(SC_CH);
  for (let k = 0; k < 300; k++) {
    const A = randomTeam(rng, SC_CH, 6, 'mix'), B = randomTeam(rng, SC_CH, 6, 'mix');
    const r = simulate(buildTeam(A, m), buildTeam(B, m), { detail: true });
    const units = [...r.events[0].units, ...r.events.filter(e => e.k === 'summon').map(e => e.unit)];
    scAgree({ r, units, model: mxModel(r, units), res: new Map(r.units.map(x => [x.uid, x])) }, `match ${k} (${A.map(u => u.id + 'L' + u.level).join(' ')} vs ${B.map(u => u.id + 'L' + u.level).join(' ')})`);
  }
}];
export const TESTS_SKILL_CALC = [...SC_BASE, ...SC_TESTS, ...SC_RETIRED_TESTS, SC_COVER, SC_FUZZ];
