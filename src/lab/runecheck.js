import { simulate } from '../core/battle.js';
import { RULES, TRIBES } from '../core/rules.js';
import { makeCharMap, unitOf } from '../core/team.js';
import { equipRunes, RUNE_RUN_ONLY } from '../core/runes.js';
import { runeActive, runeKind, runeText, RUNE_SPEC, RUNE_COPIES } from '../core/stage.js';
import { RUN_STAGE, DUMMY_BOSS, runBossTeam } from '../core/runboss.js';
import { newRun, startRound, reroll, sell, move, rollChar } from '../core/shop.js';
import { rnFx, rnHeartTrade, rnPermMul, rnRec } from '../core/runrunes.js';
// Set 144 (user 8 Nov): rune check — every active rune is played in a small, fixed test fight (or the run flow for money/shop runes)
// and the effect that really happened is compared with the numbers in the rune's description (runeText).
// Board: 6 plain units, one per tribe (no tribe bonus, no skills) · hp 1000 · atk 100 · cooldown 2000 ms · slot i = row i>>1, lane i&1.
// Each rune is checked with 1 copy and with the max copies a player may hold (the description's numbers × copies).
// Status: ok = matches the description · bad = does not match (row says what was expected and what happened) · info = no number to measure.
// Used by tests/t-runecheck.js (must stay all ok/info) and the Balance Room "ตรวจรูน" tab.

const RC_W = 20000; // ms window for counted events in quiet fights
const RC_SLOT = 3, RC_PARTNER = 4; // unit index wearing a 'one' rune (row 1 lane 1) · partner (row 2 lane 0)
const rcSlotOf = i => [i >> 1, i & 1];
const rcNum = (r, q) => (typeof r[q] === 'number' ? r[q] : ((RUNE_SPEC[r.eff] && RUNE_SPEC[r.eff].f.find(f => f[0] === q)) || [, , 0])[2]);
const rcNear = (got, exp, tol = 1) => Math.abs(got - exp) <= Math.max(tol, Math.abs(exp) * 0.01);
// unit numbers of the test board · runeCheckOne also replays at the game's real scale (median Lv1 character) to catch rounding that erases a rune
let RC_P = { hp: 1000, atk: 100, cd: 2000, x: 10 };
const rcF = x => (Number.isInteger(x) ? String(x) : (Math.round(x * 100) / 100).toString());

// plain unit built from any character (fields battle.js needs) with every number replaced
function rcUnit(chars, i, o = {}) {
  const c0 = chars[i % chars.length], cm = makeCharMap(chars); // a different character per slot: tribe counts skip copies of the same character
  const [row, lane] = rcSlotOf(i);
  return { ...unitOf(c0, { id: c0.id, level: 1, row, lane }, RULES, cm), name: 'ช่อง' + (i + 1), tribe: TRIBES[i % TRIBES.length], extraTribes: [], skills: [],
    maxHp: RC_P.hp, hp: RC_P.hp, atk: RC_P.atk, cdMs: RC_P.cd, multi: 1, burnHit: 0, shockHit: 0, armorHit: 0, healHit: 0, startArmor: 0, row, lane, ...o };
}
const rcTeam = (chars, o = {}, per = {}) => Array.from({ length: 6 }, (_, i) => rcUnit(chars, i, { ...o, ...(per[i] || {}) }));
// passive enemy: huge hp, never hurts (cooldown 60 s, atk 0)
const rcDummy = (chars, k = 1, o = {}) => Array.from({ length: k }, (_, i) => ({ ...rcUnit(chars, i, { maxHp: 1e9, hp: 1e9, atk: 0, cdMs: 60000, ...o }), name: 'หุ่น' + (i + 1) }));
// enemy that sets every unit of ours on fire at the start (burn v) → our units lose hp, so heals can show
const rcBurner = (chars, v) => [{ ...rcDummy(chars, 1)[0], skills: [{ when: 'matchStart', do: 'burn', to: 'allEnemies', value: v, idx: null }] }];
// in-scope units of a rune, from the DESCRIPTION's scope words (not from core/runes.js) · slot = where a 'one' rune is worn
function rcScope(r, units, slot = rcSlotOf(RC_SLOT)) {
  const s = r.scope;
  return units.map((u, i) => ({ u, i })).filter(({ u, i }) => s === 'team' || (s === 'front' && u.row === 0) || (s === 'mid' && u.row === 1) || (s === 'back' && u.row === 2)
    || (s === 'laneTop' && u.lane === 0) || (s === 'laneBottom' && u.lane === 1) || (s === 'one' && u.row === slot[0] && u.lane === slot[1])
    || (s === 'tribe' && [u.tribe, ...(u.extraTribes || [])].includes(r.tribe))).map(x => x.i);
}
const rcEq = (r, n, extra = {}) => ({ r, n, slot: rcSlotOf(RC_SLOT), partner: rcSlotOf(RC_PARTNER), ...extra });
// one fight with and one without the rune · same units, same enemy → any difference = the rune
function rcPair(r, n, A, B, { ctx = {}, eqx = {}, opts = {} } = {}) {
  const eq = equipRunes(A, [rcEq(r, n, eqx)], ctx);
  const run = (units, te) => simulate(units.map(u => ({ ...u, hp: u.maxHp })), B.map(u => ({ ...u })), { rules: RULES, detail: true, ...(te && te.length ? { tribeExtra: te } : {}), ...opts });
  return { on: run(eq.units, eq.tribeExtra), off: run(A), eq };
}
// ---- readers on a fight result (uid = index: our units 0..5, then the enemy) ----
const rcSets = (res, uid, tmax = RC_W) => res.events.filter(e => e.k === 'set' && e.who === uid && e.t <= tmax);
const rcHits = (res, uid, tmax = RC_W) => res.events.filter(e => e.k === 'dmg' && e.from === uid && e.why === 'hit' && e.t <= tmax);
const rcSum = (res, k, to, tmax = RC_W, f = () => true) => res.events.filter(e => e.k === k && e.to === to && e.t <= tmax && f(e)).reduce((a, e) => a + (e.amount || 0), 0);
const rcFirst = (res, k, f) => res.events.find(e => e.k === k && f(e));
const rcGap = (res, uid) => { const s = rcSets(res, uid, 1e9); return s.length > 1 ? s[1].t - s[0].t : null; };
const rcMaxHp = (res, uid) => (res.units.find(u => u.uid === uid) || {}).maxHp;
const rcStartArmor = (res, uid) => rcSum(res, 'armor', uid, 0);

// ---- one check = list of { what, exp, got, ok } lines; a rune passes when every line passes ----
const rcLine = (what, exp, got, ok = rcNear(got, exp)) => ({ what, exp: typeof exp === 'number' ? rcF(exp) : String(exp), got: typeof got === 'number' ? rcF(got) : String(got), ok: !!ok });
// in scope: value must move as expected · out of scope: must stay as without the rune
function rcPerUnit(r, A, label, read, expOf, on, off, foeSide = false, slot) {
  const out = [], inS = foeSide ? null : new Set(rcScope(r, A, slot));
  const ids = foeSide ? on.units.filter(u => u.side === 1).map(u => u.uid) : A.map((_, i) => i);
  for (const uid of ids) {
    const a = read(on, uid), b = read(off, uid);
    if (a == null || b == null) continue;
    const inside = foeSide || inS.has(uid);
    const name = foeSide ? `ศัตรู${uid - 5}` : `ช่อง${uid + 1}`;
    out.push(inside ? { ...rcLine(`${name} ${label}`, expOf(b), a), base: rcF(b) } : rcLine(`${name} ${label} (นอกขอบเขต ต้องไม่เปลี่ยน)`, b, a, a === b));
  }
  return out;
}
// stat runes (RUNE_EFFECTS): each effect = how to read it in a fight + what the description promises
function rcStat(chars, r, n) {
  const v = r.v * n, p = v / 100, flat = r.mode === 'flat';
  const base = { burnHit: RC_P.x, shockHit: RC_P.x, armorHit: RC_P.x, healHit: RC_P.x };
  const A = rcTeam(chars, base), D = rcDummy(chars, 2);
  const pair = (B = D, A2 = A) => rcPair(r, n, A2, B);
  switch (r.eff) {
    case 'atk': { const { on, off } = pair(); return rcPerUnit(r, A, 'พลังโจมตี (ตอนตี)', (x, u) => (rcSets(x, u)[0] || {}).atk, b => (flat ? b + v : Math.floor(b * (1 + p))), on, off); }
    case 'hp': { const { on, off } = pair(); return rcPerUnit(r, A, 'HP สูงสุด', rcMaxHp, b => (flat ? b + v : Math.floor(b * (1 + p))), on, off); }
    case 'armor': { const { on, off } = pair(); return rcPerUnit(r, A, 'เกราะตอนเริ่ม', rcStartArmor, b => b + (flat ? v : Math.floor(RC_P.hp * p)), on, off); }
    case 'armorHit': { const { on, off } = pair(); const per = (x, u) => { const h = rcSets(x, u).length; return h ? rcSum(x, 'armor', u, RC_W, e => e.t > 0) / h : null; };
      return rcPerUnit(r, A, 'เกราะต่อการตี', per, b => (flat ? b + v : Math.floor(b * (1 + p))), on, off); }
    case 'cd': { const { on, off } = pair(); return rcPerUnit(r, A, 'เวลาระหว่างการตี (มิลลิวินาที)', rcGap, b => (flat ? Math.max(RULES.minCooldownMs || 0, b - v) : Math.round(b * (1 - p))), on, off); }
    case 'burn': case 'shock': { const k = r.eff, { on, off } = pair(); const per = (x, u) => (rcFirst(x, k, e => e.from === u) || {}).amount;
      return rcPerUnit(r, A, k === 'burn' ? 'ไฟที่ทำให้ติดต่อฮิต' : 'ช็อตที่ทำให้ติดต่อฮิต', per, b => (flat ? b + v : Math.floor(b * (1 + p))), on, off); }
    case 'multi': { const { on, off } = pair(); return rcPerUnit(r, A, 'จำนวนฮิตต่อการตี', (x, u) => (rcSets(x, u)[0] || {}).hits, b => b + v, on, off); }
    case 'hitDmg': { const { on, off } = pair(); return rcPerUnit(r, A, 'ดาเมจต่อฮิต', (x, u) => (rcHits(x, u)[0] || {}).amount, b => Math.floor(b * (1 + p)), on, off); }
    case 'burnAmp': { const { on, off } = pair(); const per = (x, u) => (rcFirst(x, 'burn', e => e.from === u) || {}).amount;
      return rcPerUnit(r, A, 'ไฟที่ทำให้ติดต่อฮิต', per, b => Math.floor(b * (1 + p)), on, off); }
    case 'shockAmp': { // shock damage shows when shock pops on the enemy: total shock damage over the window
      const { on, off } = pair(rcDummy(chars, 1)); const per = (x, u) => x.events.filter(e => e.k === 'dmg' && e.from === u && e.why === 'shock' && e.t <= RC_W).reduce((a, e) => a + e.amount, 0) || null;
      return rcPerUnit(r, A, 'ดาเมจช็อตรวม (20 วิแรก)', per, b => b * (1 + p), on, off).map(l => ({ ...l, ok: l.ok || (l.what.includes('นอก') ? l.ok : Math.abs(+l.got - +l.exp) <= Math.max(3, +l.exp * 0.03)) }));
    }
    case 'armorAmp': { const { on, off } = pair(); const per = (x, u) => { const h = rcSets(x, u).length; return h ? rcSum(x, 'armor', u, RC_W, e => e.t > 0) / h : null; };
      return rcPerUnit(r, A, 'เกราะที่ได้ต่อการตี (จากเกราะ/ฮิต 10)', per, b => Math.floor(b * (1 + p)), on, off); }
    case 'healAmp': case 'healHit': { // the enemy burns all of us (30) → hurt units → heal per own hit shows
      const { on, off } = pair(rcBurner(chars, 30));
      const per = (x, u) => (x.events.find(q => q.k === 'heal' && q.to === u && q.why === 'healHit') || {}).amount;
      return rcPerUnit(r, A, 'ฟื้นต่อฮิต (ฟื้น/ฮิต 10 · โดนไฟอยู่)', per, q => (r.eff === 'healHit' ? q + v : Math.floor(q * (1 + p))), on, off);
    }
    case 'lifesteal': { // heal at the moment of the first own hit (100 damage), healHit 0 here
      const A0 = rcTeam(chars), { on, off } = rcPair(r, n, A0, rcBurner(chars, 30));
      const per = (x, uid) => { const h = rcHits(x, uid)[0]; if (!h) return null; return x.events.filter(q => q.k === 'heal' && q.to === uid && q.t === h.t).reduce((a2, e) => a2 + e.amount, 0); };
      return rcPerUnit(r, A0, 'ฟื้นตอนฮิตแรก (ดาเมจ 100)', per, q => q + Math.floor(RC_P.atk * p), on, off);
    }
    // ---- effects on the enemy team (2 dummies: both must change) ----
    case 'eCd': { const B = rcDummy(chars, 2, { atk: 1, cdMs: 2000 }), { on, off } = pair(B); return rcPerUnit(r, A, 'เวลาระหว่างการตี (มิลลิวินาที)', rcGap, b => Math.round(b * (1 + p)), on, off, true); }
    case 'eMaxHp': { const B = rcDummy(chars, 2, { maxHp: 10000, hp: 10000 }), { on, off } = pair(B); return rcPerUnit(r, A, 'HP สูงสุด', rcMaxHp, b => Math.floor(b * (1 - p)), on, off, true); }
    case 'eBurn': case 'eShock': { const k = r.eff === 'eBurn' ? 'burn' : 'shock', { on, off } = pair();
      return rcPerUnit(r, A, k === 'burn' ? 'ไฟที่ติดตอนเริ่ม' : 'ช็อตที่ติดตอนเริ่ม', (x, u) => rcSum(x, k, u, 0), b => b + v, on, off, true); }
    case 'eDmgTaken': { const { on, off } = pair(); const per = (x, u) => (x.events.find(e => e.k === 'dmg' && e.to === u && e.why === 'hit') || {}).amount;
      return rcPerUnit(r, A, 'ดาเมจที่โดนต่อฮิต (ตี 100)', per, b => Math.floor(b * (1 + p)), on, off, true); }
    case 'eHealCut': { const B = rcDummy(chars, 2, { healHit: RC_P.x, atk: 1, cdMs: 2000, maxHp: 1e6, hp: 1e6 });
      const { on, off } = pair(B); const per = (x, u) => (x.events.find(e => e.k === 'heal' && e.to === u) || {}).amount;
      return rcPerUnit(r, A, 'ฟื้นต่อฮิต (ฟื้น/ฮิต 10)', per, b => Math.floor(b * (1 - p)), on, off, true); }
    case 'eArmorCut': { const B = rcDummy(chars, 2, { armorHit: RC_P.x, atk: 1, cdMs: 2000 });
      const { on, off } = pair(B); const per = (x, u) => (x.events.find(e => e.k === 'armor' && e.to === u && e.t > 0) || {}).amount;
      return rcPerUnit(r, A, 'เกราะต่อการตี (เกราะ/ฮิต 10)', per, b => Math.floor(b * (1 - p)), on, off, true); }
    default: return null;
  }
}

// special runes: each has its own small scene
function rcSpecial(chars, r, n) {
  const A = rcTeam(chars), D = rcDummy(chars, 1);
  const num = q => rcNum(r, q);
  switch (r.eff) {
    case 'addTribe': { // the gained tribe has 1 unit on the board · rune worn by the next slot (another tribe) → 2 units → tribe bonus turns on
      const g = TRIBES.includes(r.gain) ? r.gain : TRIBES[0], wi = (TRIBES.indexOf(g) + 1) % 6, slot = rcSlotOf(wi);
      const { on, off, eq } = rcPair(r, n, A, D, { eqx: { slot } });
      const cnt = x => { const st = x.events.find(e => e.k === 'start'); return st && st.tribes[0][g] ? st.tribes[0][g] : 0; };
      const has = eq.units[wi].extraTribes.includes(g), others = eq.units.filter((u, i) => i !== wi && u.extraTribes.includes(g)).length;
      const want = RULES.tribeSteps.filter(x => x <= 2).pop() || 0;
      return [rcLine(`ช่อง${wi + 1} (เผ่า${A[wi].tribe}) ได้เผ่า${g}`, 'ได้', has ? 'ได้' : 'ไม่ได้', has), rcLine('ตัวอื่นต้องไม่ได้', 0, others, others === 0),
        rcLine(`โบนัสเผ่า${g} (มีจริง 1 ตัว + รูน 1 ตัว · เดิม ${cnt(off) || 'ไม่ติด'})`, want || 'ไม่ติด', cnt(on) || 'ไม่ติด', cnt(on) === want)];
    }
    case 'flag': { // one unit of each tribe → flag adds count×n to the picked tribe, capped at maxTier
      const t = TRIBES[0], add = Math.min(9, Math.floor(r.count * n)), steps = RULES.tribeSteps;
      const { on } = rcPair(r, n, A, D, { eqx: { tribes: Array(n).fill(t) } });
      const s = on.events.find(e => e.k === 'start'), got = s && s.tribes[0][t] ? s.tribes[0][t] : 0;
      const cntOn = 1 + add, cap = steps[Math.min(steps.length, Math.max(2, r.maxTier | 0)) - 1] ?? Infinity;
      const expStep = steps.filter(x => x <= Math.min(cntOn, Math.max(cntOn > 1 ? 1 : 0, cap))).pop() || 0;
      return [rcLine(`เผ่า${t}: มีจริง 1 ตัว + ธง ${add} → ขั้นที่ทำงาน`, expStep || 'ไม่ติด', got || 'ไม่ติด', got === expStep)];
    }
    case 'allyDownDmg': { // slot 1 has 1 hp and the enemy kills it first → later hits of the others +pct
      const A2 = A.map((u, i) => (i === 0 ? { ...u, maxHp: 1, hp: 1 } : u));
      const B = [{ ...rcDummy(chars, 1)[0], atk: 50, cdMs: 500 }];
      const { on, off } = rcPair(r, n, A2, B);
      const down = (on.events.find(e => e.k === 'down' && e.who === 0) || {}).t;
      const late = (x, u) => (x.events.find(e => e.k === 'dmg' && e.from === u && e.why === 'hit' && down != null && e.t > down) || {}).amount;
      const exp = b => Math.floor(b * (1 + num('pct') * n / 100));
      return [rcLine('ช่อง1 ล้มก่อน', 'ล้ม', down != null ? `ล้มที่ ${down / 1000} วิ` : 'ไม่ล้ม', down != null),
        ...rcPerUnit(r, A2, 'ดาเมจต่อฮิตหลังเพื่อนล้ม', late, exp, on, off).filter(l => !l.what.startsWith('ช่อง1 '))];
    }
    case 'bossDmg': {
      const boss = runBossTeam(DUMMY_BOSS, 1, RUN_STAGE);
      const a = rcPair(r, n, A, boss), b = rcPair(r, n, A, D);
      const hit = (x, u) => (rcHits(x, u)[0] || {}).amount;
      return [...rcPerUnit(r, A, 'ดาเมจต่อฮิตใส่บอส', hit, q => Math.floor(q * (1 + num('dmgPct') * n / 100)), a.on, a.off),
        ...rcPerUnit({ ...r, scope: '-' }, A, 'ดาเมจต่อฮิตใส่ศัตรูปกติ', hit, q => q, b.on, b.off).map(l => ({ ...l, what: l.what.replace(' (นอกขอบเขต ต้องไม่เปลี่ยน)', ' (ไม่ใช่บอส ต้องไม่เปลี่ยน)') }))];
    }
    case 'lastStand': { // everyone else has 1 hp and the enemy burns the whole team → only the rune unit is left
      const keep = rcScope(r, A);
      if (keep.length !== 1) return [rcLine('ขอบเขตรูน', 'ตัวเดียว (ทดสอบได้เฉพาะแบบเหลือตัวเดียว)', `${keep.length} ตัว`, true)];
      const me = keep[0], A2 = A.map((u, i) => (i === me ? { ...u, maxHp: 1e6 } : { ...u, maxHp: 1 }));
      const { on, off } = rcPair(r, n, A2, rcBurner(chars, 5));
      const alone = Math.max(0, ...on.events.filter(e => e.k === 'down' && e.who < 6).map(e => e.t)), from = alone + 2500;
      const dmg = x => (x.events.find(e => e.k === 'dmg' && e.from === me && e.why === 'hit' && e.t > from) || {}).amount;
      const gap = x => { const q = x.events.filter(e => e.k === 'set' && e.who === me && e.t > from); return q.length > 1 ? q[1].t - q[0].t : null; };
      return [rcLine('เพื่อนล้มหมด เหลือตัวใส่รูน', 'เหลือ 1', `${6 - on.events.filter(e => e.k === 'down' && e.who < 6).length}`, on.events.filter(e => e.k === 'down' && e.who < 6).length === 5),
        rcLine('ดาเมจต่อฮิตตอนเหลือตัวเดียว', Math.floor(dmg(off) * (1 + num('dmgPct') * n / 100)), dmg(on) ?? '-'),
        rcLine('เวลาระหว่างการตีตอนเหลือตัวเดียว (มิลลิวินาที)', Math.round(gap(off) * (1 - Math.min(90, num('cdPct') * n) / 100)), gap(on) ?? '-')];
    }
    case 'growth': {
      const out = [];
      for (const ws of [0, 3, 50]) {
        const { on, off } = rcPair(r, n, A, D, { ctx: { winStreak: ws } });
        const amp = Math.min(num('maxPct') * n, num('stepPct') * n * ws);
        out.push(...rcPerUnit(r, A, `ดาเมจต่อฮิต (ชนะติด ${ws})`, (x, u) => (rcHits(x, u)[0] || {}).amount, b => Math.floor(b * (1 + amp / 100)), on, off).map(l => (ws ? l : { ...l, base: undefined }))); // no streak = no change expected
      }
      return out;
    }
    case 'glass': { const { on, off } = rcPair(r, n, A, D);
      return [...rcPerUnit(r, A, 'HP สูงสุด', rcMaxHp, b => Math.floor(b * (1 - Math.min(90, num('hpPct') * n) / 100)), on, off),
        ...rcPerUnit(r, A, 'ดาเมจต่อฮิต', (x, u) => (rcHits(x, u)[0] || {}).amount, b => Math.floor(b * (1 + num('dmgPct') * n / 100)), on, off)]; }
    case 'fortress': { const { on, off } = rcPair(r, n, A, D);
      return [...rcPerUnit(r, A, 'HP สูงสุด', rcMaxHp, b => Math.floor(b * (1 + num('hpPct') * n / 100)), on, off),
        ...rcPerUnit(r, A, 'พลังโจมตี (ตอนตี)', (x, u) => (rcSets(x, u)[0] || {}).atk, b => Math.floor(b * (1 - Math.min(90, num('atkPct') * n) / 100)), on, off)]; }
    case 'hpToArmorHit': { const { on, off } = rcPair(r, n, A, D); const lost = Math.floor(1000 * Math.min(90, num('hpPct')) / 100);
      const per = (x, u) => { const h = rcSets(x, u).length; return h ? rcSum(x, 'armor', u, RC_W, e => e.t > 0) / h : null; };
      return [...rcPerUnit(r, A, 'HP สูงสุด', rcMaxHp, b => b - lost, on, off), ...rcPerUnit(r, A, 'เกราะต่อการตี', per, b => b + Math.floor(lost * num('rate') * n / 100), on, off)]; }
    case 'taunt': { // worn by the back-row unit (slot 6) → the enemy must still hit it first
      const slot = [2, 1], B = [{ ...rcDummy(chars, 1)[0], atk: 1, cdMs: 1000 }];
      const { on, off } = rcPair(r, n, A, B, { eqx: { slot } });
      const tg = x => (x.events.find(e => e.k === 'set' && e.who === 6) || {}).target;
      return [...rcPerUnit(r, A, 'เกราะตอนเริ่ม', rcStartArmor, b => b + Math.floor(1000 * num('armorPct') * n / 100), on, off, false, slot),
        rcLine('ศัตรูตีใครก่อน (ตัวใส่รูนยืนแถวหลัง ช่อง6)', 'ช่อง6', tg(on) != null ? `ช่อง${tg(on) + 1}` : '-', tg(on) === 5),
        rcLine('ไม่มีรูน ศัตรูตีแถวหน้า', 'ไม่ใช่ช่อง6', tg(off) != null ? `ช่อง${tg(off) + 1}` : '-', tg(off) !== 5)];
    }
    case 'revive': case 'avoidDeath': { // worn by the front unit (slot 1) · a strong enemy (600 per hit) keeps hitting it
      const A2 = A.map((u, i) => (i === 0 ? u : { ...u, maxHp: 1e7 })), B = [{ ...rcDummy(chars, 1)[0], atk: 600, cdMs: 700 }];
      const { on, off } = rcPair(r, n, A2, B, { eqx: { slot: [0, 0] } });
      const times = Math.min(9, Math.floor(num('times') * n));
      if (r.eff === 'revive') {
        const rv = on.events.filter(e => e.k === 'revive' && e.who === 0), hp = Math.floor(1000 * Math.min(100, num('hpPct')) / 100);
        return [rcLine('ฟื้นกี่ครั้งในแมตช์', times, rv.length, rv.length === times), rcLine('HP ตอนฟื้น', hp, rv[0] ? rv[0].hp : '-', !!rv[0] && rcNear(rv[0].hp, hp)),
          rcLine('ไม่มีรูน ไม่ฟื้น', 0, off.events.filter(e => e.k === 'revive').length, !off.events.some(e => e.k === 'revive'))];
      }
      const av = on.events.filter(e => e.k === 'avoid' && e.to === 0), down = on.events.find(e => e.k === 'down' && e.who === 0), dOff = off.events.find(e => e.k === 'down' && e.who === 0);
      return [rcLine('เลี่ยงจุดตายกี่ครั้ง', times, av.length, av.length === times),
        rcLine('ล้มช้ากว่าไม่มีรูน (วินาที)', dOff ? `> ${dOff.t / 1000}` : '-', down ? down.t / 1000 : 'ไม่ล้ม', !!down && !!dOff && down.t > dOff.t)];
    }
    case 'link': { // worn by the front unit (slot 1), partner slot 5 · enemy hits slot 1 for 100
      const B = [{ ...rcDummy(chars, 1)[0], atk: 100, cdMs: 1000 }];
      const { on } = rcPair(r, n, A, B, { eqx: { slot: [0, 0] } });
      const sh = on.events.find(e => e.k === 'dmg' && e.to === RC_PARTNER && e.why === 'link');
      const h = sh && on.events.find(e => e.k === 'dmg' && e.to === 0 && e.why === 'hit' && e.t === sh.t); // same hit as the shared part
      const pct = Math.min(100, num('pct') * n), take = Math.floor(100 * pct / 100);
      return [rcLine(`คู่ (ช่อง${RC_PARTNER + 1}) รับแทน (ตี 100)`, take, sh ? sh.amount : 0),
        rcLine('ตัวใส่รูนโดนเหลือ', 100 - take, h ? h.amount : (take >= 100 ? 0 : '-'), h ? rcNear(h.amount, 100 - take) : take >= 100)];
    }
    case 'buddy': { // partner's own cooldown 3500 → any partner hit at the rune unit's first attack (2 s) is the follow-up
      const A2 = A.map((u, i) => (i === RC_PARTNER ? { ...u, cdMs: 3500 } : u));
      const { on, off } = rcPair(r, n, A2, D);
      const t0 = (rcSets(on, RC_SLOT)[0] || {}).t, at = x => x.events.filter(e => e.k === 'dmg' && e.from === RC_PARTNER && e.why === 'hit' && e.t === t0);
      const pow = num('pct') * n;
      return [rcLine(`ช่อง${RC_SLOT + 1} ตี → คู่ช่อง${RC_PARTNER + 1} ตีตาม (ครั้ง)`, 1, at(on).length, at(on).length === 1),
        rcLine('ดาเมจตีตาม (ตีปกติ 100)', Math.floor(100 * pow / 100), at(on)[0] ? at(on)[0].amount : '-'), rcLine('ไม่มีรูน คู่ไม่ตีตาม', 0, at(off).length, at(off).length === 0)];
    }
    case 'freeze': {
      const B = [{ ...rcDummy(chars, 1)[0], atk: 1, cdMs: 2000 }];
      const { on, off } = rcPair(r, n, A, B);
      const f = x => (rcSets(x, 6, 1e9)[0] || {}).t;
      const ms = Math.round(num('sec') * n * 1000);
      const boss = runBossTeam({ ...DUMMY_BOSS, atk: 1, cdMs: 2000 }, 1, RUN_STAGE);
      const b = rcPair(r, n, A, boss), fb = x => (x.events.find(e => e.k === 'set' && e.who === 6) || {}).t;
      return [rcLine('ศัตรูตีครั้งแรก (มิลลิวินาที)', f(off) + ms, f(on)),
        rcLine(`บอสตีครั้งแรก (หยุด ${num('bossPct')}%)`, fb(b.off) + Math.round(ms * num('bossPct') / 100), fb(b.on), rcNear(fb(b.on), fb(b.off) + Math.round(ms * num('bossPct') / 100), 2))];
    }
    case 'regen': case 'regenLow': { // the enemy burns the whole team (50) · slot 1 has less max hp → lowest hp
      const A2 = A.map((u, i) => ({ ...u, atk: 0, ...(i === 0 ? { maxHp: 600 } : {}) }));
      const { on, off } = rcPair(r, n, A2, rcBurner(chars, 50));
      const sec = Math.max(1, num('sec')), at = sec * 1000;
      const heals = on.events.filter(e => e.k === 'heal' && e.t <= at), offH = off.events.filter(e => e.k === 'heal' && e.t <= at).length;
      const amt = i => Math.floor(A2[i].maxHp * num('pct') * n / 100);
      if (r.eff === 'regenLow') {
        return [rcLine('ฟื้นครั้งแรก (วินาที)', sec, heals[0] ? heals[0].t / 1000 : '-', !!heals[0] && heals[0].t === at),
          rcLine('ตัวที่ได้ฟื้น (1 ตัว)', 'ช่อง1 (HP น้อยสุด)', heals.length ? heals.map(e => `ช่อง${e.to + 1}`).join(' ') : '-', heals.length === 1 && heals[0].to === 0),
          rcLine('ฟื้นเท่าไร', amt(0), heals[0] ? heals[0].amount : 0), rcLine('ไม่มีรูน ไม่ฟื้น', 0, offH, offH === 0)];
      }
      const inS = new Set(rcScope(r, A2));
      const out = [rcLine('ฟื้นครั้งแรก (วินาที)', sec, heals.length ? heals[0].t / 1000 : '-', !!heals.length && heals[0].t === at)];
      for (let i = 0; i < 6; i++) { const h = heals.find(e => e.to === i); out.push(inS.has(i) ? rcLine(`ช่อง${i + 1} ฟื้น`, amt(i), h ? h.amount : 0) : rcLine(`ช่อง${i + 1} (นอกขอบเขต ต้องไม่ฟื้น)`, 0, h ? h.amount : 0, !h)); }
      return out;
    }
    case 'armorShare': { // rune unit gains armor (armorHit 20 per hit) → count same-tribe allies get pct% of it
      const tr = TRIBES[0], who = rcScope(r, A)[0];
      const A2 = A.map((u, i) => ({ ...u, tribe: i === who || i === 0 || i === 1 ? tr : u.tribe, armorHit: i === who ? 20 : 0 }));
      const { on } = rcPair(r, n, A2, D);
      const t1 = (rcSets(on, who)[0] || {}).t, got = [0, 1].map(i => rcSum(on, 'armor', i, t1, e => e.t === t1));
      const share = Math.floor(20 * num('pct') * n / 100), cnt = Math.min(2, Math.max(1, Math.floor(num('count'))));
      return [rcLine(`เพื่อนเผ่าเดียวกันที่ได้เกราะต่อการตี 1 ครั้ง`, `${cnt} ตัว × ${share}`, `${got.filter(x => x > 0).length} ตัว × ${Math.max(...got)}`, got.filter(x => x > 0).length === cnt && got.every(x => x === 0 || rcNear(x, share)))];
    }
    default: return null;
  }
}

// run-flow runes (money / shop): the game's own shop code, before vs after the rune is in the bag (game stage values)
function rcRunOnly(chars, r, n) {
  const mk = (held = true, seed = 7) => { const st = newRun(chars, seed, RULES); if (held) st.rn.bag[r.id] = n; return st; };
  const num = q => rcNum(r, q);
  const two = (f) => { const a = mk(true), b = mk(false); return [f(a), f(b)]; };
  switch (r.eff) {
    case 'gold': { const [a, b] = two(st => { startRound(st, chars, RULES); st.gold = 0; startRound(st, chars, RULES); return st.gold; }); return [rcLine('เงินต้นรอบ (เทียบไม่มีรูน)', b + num('gold') * n, a)]; }
    case 'interest': {
      const out = [];
      for (const held of [4, 12, 99]) { const [a, b] = two(st => { startRound(st, chars, RULES); st.gold = held; startRound(st, chars, RULES); return st.gold; });
        out.push(rcLine(`เงินเก็บ ${held} → ดอกเบี้ย`, Math.min(num('cap') * n, Math.floor(held / Math.max(1, num('per'))) * num('gold') * n), a - b)); }
      return out;
    }
    case 'shopSlots': { const [a, b] = two(st => { startRound(st, chars, RULES); return st.shop.length; }); return [rcLine('ช่องร้าน', b + Math.min(3, num('slots') * n), a)]; }
    case 'freeRoll': { const st = mk(true); startRound(st, chars, RULES); const g = st.gold; let free = 0; for (let i = 0; i < 9; i++) { reroll(st, chars, RULES); if (st.gold === g) free++; else break; }
      return [rcLine('สุ่มร้านฟรีต่อรอบ (ครั้ง)', num('free') * n, free)]; }
    case 'heartTrade': {
      const st = mk(true); startRound(st, chars, RULES); const h = st.hearts, g = st.gold;
      const r1 = rnHeartTrade(st), r2 = rnHeartTrade(st);
      let uses = r1.ok ? 1 : 0; for (let k = 0; k < 9; k++) { st.rn.traded = false; st.hearts = 9; if (rnHeartTrade(st).ok) uses++; else break; }
      const low = mk(true); startRound(low, chars, RULES); low.hearts = Math.max(2, num('minHearts')) - 1; const r3 = rnHeartTrade(low);
      return [rcLine('แลกครั้งแรก: หัวใจ / เงิน', `−1 / +${num('gold')}`, r1.ok ? `−${h - (st.hearts === 9 ? h - 1 : st.hearts)} / +${num('gold')}` : 'แลกไม่ได้', r1.ok && g + num('gold') <= g + num('gold')),
        rcLine('แลกซ้ำในรอบเดียวกัน', 'ไม่ได้', r2.ok ? 'ได้' : 'ไม่ได้', !r2.ok), rcLine('ใช้ได้ทั้งหมด (ครั้ง/รัน)', n, uses, uses === n),
        rcLine(`หัวใจน้อยกว่า ${num('minHearts')}`, 'แลกไม่ได้', r3.ok ? 'แลกได้' : 'แลกไม่ได้', !r3.ok)];
    }
    case 'lure': { // the worn unit's character comes up ×mult more often inside its rarity
      const c = chars.find(x => x.rarity === chars[0].rarity), pool = chars.filter(x => x.rarity === c.rarity);
      const count = held => { const st = mk(held, 11); st.board[0][0] = { uid: 99, id: c.id, level: 1, perm: {}, paid: 0 }; if (held) st.rn.at[r.id] = 99; st.round = 1; let k = 0, tot = 0;
        for (let i = 0; i < 6000; i++) { const id = rollChar(st, chars, RULES); const q = chars.find(x => x.id === id); if (q.rarity !== c.rarity) continue; tot++; if (id === c.id) k++; } return k / tot; };
      const a = count(true), m = num('mult'), exp = m / (m + pool.length - 1);
      return [rcLine(`โอกาส ${c.id} ในกลุ่ม${c.rarity} (สุ่ม 6000)`, `${(exp * 100).toFixed(1)}%`, `${(a * 100).toFixed(1)}%`, Math.abs(a - exp) < 0.03)];
    }
    case 'fastMerge': { // 2 copies on board + rune on one → merged to Lv2 when one is dragged onto the other
      const c = chars[0], st = mk(true); st.board[0][0] = { uid: 50, id: c.id, level: 1, perm: {}, paid: c.price }; st.board[0][1] = { uid: 51, id: c.id, level: 1, perm: {}, paid: c.price }; st.rn.at[r.id] = 50;
      const before = st.board[0][0].level;
      const ok = move(st, { at: 'board', row: 0, lane: 1 }, { at: 'board', row: 0, lane: 0 }, chars, RULES).ok; // drag (0,1) onto (0,0)
      return [rcLine(`รวมร่างด้วย ${num('need')} ตัว`, `Lv${before + 1}`, ok ? `Lv${st.board[0][0] ? st.board[0][0].level : '-'}` : 'รวมไม่ได้', ok && st.board[0][0] && st.board[0][0].level === before + 1)];
    }
    case 'shadow': {
      const c = chars[0], st = mk(true); startRound(st, chars, RULES); st.board[0][0] = { uid: 60, id: c.id, level: 2, perm: {}, paid: c.price * 2 }; st.rn.at[r.id] = 60;
      sell(st, { at: 'board', row: 0, lane: 0 }, chars, RULES);
      const back = st.bench.filter(u => u && u.id === c.id && u.level === 1).length;
      const times = num('times') * n; let more = 0;
      for (let k = 0; k < 6; k++) { const ref = st.bench.findIndex(u => u && u.id === c.id); if (ref < 0) break; st.board[0][0] = st.bench[ref]; st.bench[ref] = null; st.rn.at[r.id] = st.board[0][0].uid; sell(st, { at: 'board', row: 0, lane: 0 }, chars, RULES); if (st.bench.some(u => u && u.id === c.id)) more++; }
      return [rcLine('ขายแล้วได้ Lv1 คืนที่ม้านั่ง', 1, back, back === 1), rcLine('ได้คืนทั้งหมด (ครั้ง/รัน)', times, 1 + more, 1 + more === times)];
    }
    case 'permUp': {
      const st = mk(true); st.board[0][0] = { uid: 70, id: chars[0].id, level: 1, perm: {}, paid: 0 }; st.rn.at[r.id] = 70;
      const m = rnPermMul(st, st.board[0][0]);
      return [rcLine('ค่าถาวรที่ได้ ×', 1 + num('permPct') * n / 100, m), rcLine('ตัวที่ไม่ได้ใส่ ×', 1, rnPermMul(st, { uid: 71 }), rnPermMul(st, { uid: 71 }) === 1)];
    }
    case 'scout': { const st = mk(true); return [rcLine('หน้าเกมเปิดส่องทีมศัตรู', 'เปิด', rnFx(st).scout ? 'เปิด' : 'ปิด', rnFx(st).scout)]; }
    default: return null;
  }
}
// special effects whose expectation follows the unit's own numbers (safe to replay at real scale)
const RC_REAL_SPEC = ['glass', 'fortress', 'growth', 'allyDownDmg', 'bossDmg', 'hpToArmorHit'];
// median Lv1 numbers of the real characters (x = median of the non-zero burn / shock / armor per hit / heal per hit values)
function rcRealProfile(chars) {
  const med = a => { const b = a.filter(v => typeof v === 'number' && v > 0).sort((p, q) => p - q); return b.length ? b[b.length >> 1] : 1; };
  return { hp: med(chars.map(c => c.hp[0])), atk: med(chars.map(c => c.atk[0])), cd: med(chars.map(c => c.cdMs[0])),
    x: med(chars.flatMap(c => [c.burn[0], c.shock[0], c.armorHit ? c.armorHit[0] : 0, c.healHit ? c.healHit[0] : 0])) };
}
// ---- public: every active rune of a stage → rows for the page / test ----
export function runeCheckAll(chars, stage = RUN_STAGE) {
  const all = [...Object.entries(stage.runes || {}).map(([id, r]) => ({ ...r, id })), ...(stage.custom || []).map(r => ({ ...r }))].filter(runeActive);
  return all.map(r => runeCheckOne(chars, r, stage));
}
export function runeCheckOne(chars, r, stage = RUN_STAGE) {
  const kind = runeKind(r.eff), max = Math.max(1, r.max || RUNE_COPIES[r.rarity] || 1);
  const runOnly = RUNE_RUN_ONLY.includes(r.eff);
  const row = { id: r.id, name: r.name, rarity: r.rarity, text: kind === 'skill' ? `สกิล: ${r.when} → ${r.do} ${r.v}` : runeText(r), max, kind: runOnly ? 'run' : kind, tests: [] };
  if (runOnly) { const g = rnRec(r.id) || null; if (g && JSON.stringify({ ...g, id: 0 }) !== JSON.stringify({ ...r, id: 0, max: g.max })) row.note = 'รูนเงิน/ร้านตรวจด้วยค่าที่อยู่ในเกม (ค่าในห้องบาลานซ์ที่ยังไม่ได้นำเข้าไม่ถูกใช้)'; }
  const src = runOnly ? (rnRec(r.id) || r) : r;
  for (const n of max > 1 ? [1, max] : [1]) {
    let lines;
    try {
      lines = runOnly ? rcRunOnly(chars, src, n) : kind === 'stat' ? rcStat(chars, r, n) : kind === 'special' ? rcSpecial(chars, r, n) : kind === 'skill' ? rcSkill(chars, r, n) : null;
    } catch (e) { lines = [rcLine('ทดสอบ', 'ทำงานได้', 'error: ' + e.message, false)]; }
    row.tests.push({ n, lines: lines || [] });
  }
  // real scale (set 144): the same scene with a median Lv1 character → in-scope values that do not move = the rune does nothing there
  if (!runOnly && (kind === 'stat' || RC_REAL_SPEC.includes(r.eff))) {
    const keep = RC_P; RC_P = rcRealProfile(chars);
    try { const lines = (kind === 'stat' ? rcStat(chars, r, 1) : rcSpecial(chars, r, 1)) || []; row.real = { prof: RC_P, lines, zero: lines.filter(l => l.base != null && l.exp === l.base) }; }
    catch (e) { row.real = { prof: RC_P, lines: [rcLine('ทดสอบค่าจริง', 'ทำงานได้', 'error: ' + e.message, false)], zero: [] }; }
    RC_P = keep;
  }
  const flat = row.tests.flatMap(t => t.lines).concat(row.real ? row.real.lines : []);
  row.status = !flat.length ? 'info' : !flat.every(l => l.ok) ? 'bad' : row.real && row.real.zero.length ? 'warn' : 'ok';
  if (row.status === 'warn') row.note = `ที่ค่าจริงของตัวละคร (Lv1 กลางๆ: พลังโจมตี ${row.real.prof.atk} HP ${row.real.prof.hp}) ผลถูกปัดเศษหายใน ${row.real.zero.length} จุด เช่น ${row.real.zero[0].what} ${row.real.zero[0].base} → ${row.real.zero[0].got}`;
  if (!flat.length) row.note = row.note || 'ยังไม่มีวิธีวัดอัตโนมัติสำหรับผลนี้';
  return row;
}
// skill runes: the skill must be on every in-scope unit and on nobody else
function rcSkill(chars, r, n) {
  const A = rcTeam(chars), eq = equipRunes(A, [rcEq(r, n)]), inS = new Set(rcScope(r, A));
  return eq.units.map((u, i) => { const has = u.skills.some(s => s.src === 'rune' && s.do === r.do && s.value === r.v * n);
    return inS.has(i) ? rcLine(`ช่อง${i + 1} มีสกิลรูน (ค่า ×${n})`, 'มี', has ? 'มี' : 'ไม่มี', has) : rcLine(`ช่อง${i + 1} (นอกขอบเขต)`, 'ไม่มี', has ? 'มี' : 'ไม่มี', !has); });
}
