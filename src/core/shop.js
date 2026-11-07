import { makeRng } from './rng.js';
import { teamPower } from './power.js';
import { buildTeam, makeCharMap } from './team.js';
import { RUN_STAGE } from './runboss.js';
import { newRunes, rnFx, rnInterest, rnPermMul, rnSync } from './runrunes.js';
import { DO_INFO, PERM_ABIL, PERM_STAT2, RARITIES, RULES, SHARE_TO, atMatch } from './rules.js';
// ร้านค้าและรวมร่าง (shop-merge-rules) · ใช้ร่วมกันระหว่างผู้เล่น บอท และห้องบาลานซ์
// - สถานะเป็นข้อมูลล้วน (ไม่มีฟังก์ชัน) เซฟเป็น JSON ได้ · เลขสุ่มเก็บในสถานะ ใส่เมล็ดเดิมได้ผลเดิม
// - ทุกคำสั่งตรวจก่อนทำ ผิดกฎ → คืน { ok: false, msg } และไม่แตะสถานะ
// - ตัวเลขทั้งหมดมาจาก RULES.shop และข้อมูลตัวละคร ไม่ฝังในโค้ด


export const SLOT_ORDER = [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1]];
export const PERM_KEYS = ['hp', 'atk', 'armor', 'burn', 'shock', 'multi', 'cdPct', ...PERM_STAT2, ...PERM_ABIL]; // ความสามารถถาวร (22 ต.ค.) มาจากสกิลระหว่างสู้ที่ตั้งถาวรเท่านั้น
export const fail = msg => ({ ok: false, msg });
export const done = (msgs = []) => ({ ok: true, msgs });

// ---------- สร้างและสุ่ม ----------
export function newRun(chars, seed, rules = RULES) {
  const S = rules.shop;
  const st = {
    v: 10, seed: seed >>> 0, n: 0, round: 0, gold: 0, wins: 0, hearts: S.hearts, lastWon: false, over: false, // set 128: v10 = + fp (team power at shop start → the locked enemy) + rn.ft (flag tribes) · set 119: v9 = + sc (second chance used) · hearts 5 · set 107: v8 = + ws · set 100: v7 = + ls, rn.ro · set 99: v6 = + bw/bk/extra · set 95: v5 = no rune shop (st.rn.shop gone) · set 89: v3 = shop level comes from the round (no upgrade / streak fields)
    shop: Array.from({ length: S.slots }, () => ({ id: null, locked: false })),
    bench: Array(S.bench).fill(null),
    board: [[null, null], [null, null], [null, null]],
    uid: 1,
    charges: [], // ประจุรอใช้ (SF-7): { id, uid, si } · ให้ค่าถาวรกับเพื่อนเผ่าเดียวกันตัวถัดไปที่ซื้อ
    rn: newRunes(), // set 94 (2b): runes of this run (core/runrunes.js) · v4
    // set 99 (user 6 Nov): bw = normal-match wins since the last boss fight (boss after bossEvery of them, core/runboss.js)
    // bk = bosses beaten (next boss = bk + 1; a lost boss comes back later) · extra = playing extra matches after the run was cleared
    bw: 0, bk: 0, extra: false, ls: 0, ws: 0, sc: 0, fp: 0, // set 128 (user X9 A, lock for everyone): fp = board power when the shop round starts → pickFoe · set 107: ws = wins in a row (normal or boss) → enemy power (pickFoe)
  };
  return st;
}

export function draw(st) { // เลขสุ่ม 0–1 จากเมล็ดในสถานะ
  const r = makeRng((st.seed ^ Math.imul(++st.n, 0x9E3779B1)) >>> 0).next();
  return r;
}

// ---------- set 89: shop level follows the round (every round played counts, win or lose) ----------
export const shopLevels = (rules = RULES) => rules.shop.levelOdds.length;
// shop level for a given round: roundLevels[round − 1] (rounds past the table use its last entry), clamped to 1…levels
export function lvForRound(round, rules = RULES) {
  const T = rules.shop.roundLevels, r = Math.max(1, round | 0);
  const v = Array.isArray(T) && T.length ? T[Math.min(r, T.length) - 1] : r;
  return Math.max(1, Math.min(shopLevels(rules), v | 0 || 1));
}
export const shopLvOf = (st, rules = RULES) => lvForRound(st.round, rules);
export const oddsAt = (lv, rules = RULES) => rules.shop.levelOdds[Math.max(1, Math.min(shopLevels(rules), lv | 0)) - 1];
// base income for round `round` (1-based): round 1 = startGold · set 96: then +goldStep per round, capped at goldPerRound (goldStep 0 = flat goldPerRound)
export function baseIncomeAt(round, rules = RULES) {
  const S = rules.shop, r = Math.max(1, round | 0);
  if (r === 1) return S.startGold;
  return S.goldStep ? Math.max(0, Math.min(S.goldPerRound, S.startGold + S.goldStep * (r - 1))) : S.goldPerRound;
}
// income the next startRound pays (round 2+): base + win bonus (no interest, no streaks · set 89)
export function incomeOf(st, rules = RULES) {
  const S = rules.shop, bonus = st.lastWon ? S.winBonus : 0, base = baseIncomeAt(st.round + 1, rules);
  return { base, bonus, total: base + bonus };
}

export function rollChar(st, chars, rules) {
  // โอกาสตามระดับร้าน · ใช้เฉพาะความหายากที่มีตัวละครจริงและโอกาส > 0 (กันช่องร้านว่าง/พัง)
  const odds = oddsAt(shopLvOf(st, rules), rules), has = r => chars.some(c => c.rarity === r);
  let rars = RARITIES.filter(r => (odds[r] || 0) > 0 && has(r)), w = r => odds[r];
  if (!rars.length) { rars = RARITIES.filter(has); w = () => 1; } // ระดับนี้ไม่มีตัวละครที่สุ่มได้ → ทุกความหายากที่มีตัว เท่ากัน
  if (!rars.length) return null;
  const total = rars.reduce((a, r) => a + w(r), 0);
  let x = draw(st) * total, rar = rars[0];
  for (const r of rars) { x -= w(r); if (x < 0) { rar = r; break; } }
  const pool = chars.filter(c => c.rarity === rar), lure = rnFx(st).lure; // set 94: rune ดึงดูดตัว = that character weighs ×mult inside its rarity
  if (Object.keys(lure).length) {
    const wt = c => lure[c.id] || 1, tot = pool.reduce((a, c) => a + wt(c), 0);
    let y = draw(st) * tot;
    for (const c of pool) { y -= wt(c); if (y < 0) return c.id; }
    return pool[pool.length - 1].id;
  }
  return pool[Math.floor(draw(st) * pool.length)].id;
}

export function refill(st, chars, rules) {
  for (const s of st.shop) if (!s.locked || !s.id) { s.id = rollChar(st, chars, rules); s.locked = false; }
}

// ---------- ตำแหน่ง ----------
// ref: { at: 'bench', i } | { at: 'board', row, lane } | { at: 'shop', i }
export function okRef(st, ref) {
  if (!ref || typeof ref !== 'object') return false;
  if (ref.at === 'bench') return Number.isInteger(ref.i) && ref.i >= 0 && ref.i < st.bench.length;
  if (ref.at === 'board') return Number.isInteger(ref.row) && ref.row >= 0 && ref.row < 3 && Number.isInteger(ref.lane) && ref.lane >= 0 && ref.lane < 2;
  if (ref.at === 'shop') return Number.isInteger(ref.i) && ref.i >= 0 && ref.i < st.shop.length;
  return false;
}
export const get = (st, ref) => (ref.at === 'bench' ? st.bench[ref.i] : ref.at === 'board' ? st.board[ref.row][ref.lane] : null);
export function put(st, ref, u) { if (ref.at === 'bench') st.bench[ref.i] = u; else st.board[ref.row][ref.lane] = u; }
export function allUnits(st) {
  const out = [];
  st.board.forEach((r, row) => r.forEach((u, lane) => { if (u) out.push({ u, ref: { at: 'board', row, lane } }); }));
  st.bench.forEach((u, i) => { if (u) out.push({ u, ref: { at: 'bench', i } }); });
  return out;
}
export const boardUnits = st => allUnits(st).filter(x => x.ref.at === 'board');
export const firstEmptyBench = st => { const i = st.bench.indexOf(null); return i < 0 ? null : { at: 'bench', i }; };

// ---------- ค่าถาวร (เพดานตาม RULES.permCaps) ----------
export function addPerm(u, key, v, rules) {
  if (!PERM_KEYS.includes(key) || !(v > 0)) return 0;
  const cap = rules.permCaps[key];
  const before = u.perm[key] || 0;
  const after = cap == null ? before + v : Math.min(cap, before + v);
  if (after > before) u.perm[key] = after;
  return after - before;
}

// สกิลร้านค้า: ให้ค่าถาวรกับเพื่อนบนบอร์ด (นับเฉพาะบอร์ด เหมือนการนับเผ่า)
// ชุด 14: เพื่อนตามตำแหน่ง + กรองเผ่าเดียวกัน (s = สกิล · ไม่ส่ง = แบบเดิม)
export function shopTargets(st, ref, to, self, chars, s) {
  const tribesOf = u => { const c = chars.find(x => x.id === u.id); return c ? [c.tribe, ...c.extraTribes] : []; };
  let r = to === 'allyAt' ? (s && s.at && ref && ref.at === 'board' ? boardUnits(st).filter(x => x.u !== self && atMatch(s.at, ref.row, ref.lane, x.ref.row, x.ref.lane)).sort((a, b) => a.ref.row - b.ref.row || a.ref.lane - b.ref.lane).map(x => x.u) : []) : shopTargetsBase(st, ref, to, self, chars);
  if (s && s.sameTribe && self) { const mine = tribesOf(self); r = r.filter(u => u === self || tribesOf(u).some(t => mine.includes(t))); }
  if (s && s.skipSameId && self) r = r.filter(u => u === self || u.id !== self.id); // ชุด 17
  return r;
}
export function shopTargetsBase(st, ref, to, self, chars) {
  const B = boardUnits(st);
  const atBoard = ref && ref.at === 'board';
  const others = B.filter(x => x.u !== self);
  const tribesOf = u => { const c = chars.find(x => x.id === u.id); return c ? [c.tribe, ...c.extraTribes] : []; };
  const pick = (list, n) => { const l = list.slice(), out = []; while (l.length && out.length < n) out.push(l.splice(Math.floor(draw(st) * l.length), 1)[0]); return out; };
  switch (to) {
    case 'self': return self ? [self] : [];
    case 'allAllies': return B.map(x => x.u);
    case 'frontAlly': return atBoard ? others.filter(x => x.ref.lane === ref.lane && x.ref.row === ref.row - 1).map(x => x.u) : [];
    case 'backAlly': return atBoard ? others.filter(x => x.ref.lane === ref.lane && x.ref.row === ref.row + 1).map(x => x.u) : [];
    case 'backLaneAlly': return atBoard ? others.filter(x => x.ref.lane === ref.lane && x.ref.row > ref.row).sort((a, b) => a.ref.row - b.ref.row).slice(0, 1).map(x => x.u) : []; // ชุด 12
    case 'frontBackAlly': return atBoard ? others.filter(x => x.ref.lane === ref.lane && Math.abs(x.ref.row - ref.row) === 1).map(x => x.u) : [];
    case 'frontRowAllies': return others.filter(x => x.ref.row === 0).map(x => x.u);
    case 'backRowAllies': return others.filter(x => x.ref.row === 2).map(x => x.u);
    case 'allyRandom': return pick(others, 1).map(x => x.u);
    case 'allyRandom2': return pick(others, 2).map(x => x.u);
    case 'tribeAllies': { const mine = tribesOf(self); return others.filter(x => tribesOf(x.u).some(t => mine.includes(t))).map(x => x.u); }
    default: return [];
  }
}
export const SHOP_GIVE_TH = { hp: 'HP', atk: 'พลังโจมตี', armor: 'เกราะสะสม', burn: 'ไฟ/ฮิต', shock: 'ช็อต/ฮิต', multi: 'มัลติฮิต', cdPct: 'คูลดาวน์ −%',
  cdStart: 'เริ่มแมตช์ลดคูลดาวน์ (มิลลิวินาที)', shareArmor: 'แบ่งเกราะ %', healToAtk: 'ฟื้นเป็นพลัง %', armorAmp: 'เกราะที่ได้รับ +%', cdAmp: 'ผลลดคูลดาวน์ที่ได้รับ +%', shockAmp: 'ดาเมจช็อต +%', burnNoDecay: 'ไฟที่ติดไม่ลด',
  healHit: 'ฟื้น/ฮิต', armorHit: 'เกราะ/ฮิต', cdMs: 'คูลดาวน์ − (มิลลิวินาที)', hpPct: 'HP +%', atkPct: 'พลังโจมตี +%', burnPct: 'ไฟ/ฮิต +%', shockPct: 'ช็อต/ฮิต +%', armorHitPct: 'เกราะ/ฮิต +%',
  healAmp: 'ฟื้น HP ที่ได้รับ +%', hitAmp: 'ดาเมจตี +%', burnAmp: 'ไฟที่ทำให้ติด +%' };
export const SHARE_TH = { frontAlly: 'เพื่อนข้างหน้า', backAlly: 'เพื่อนข้างหลัง', frontBackAlly: 'เพื่อนหน้าและหลัง', frontLaneAlly: 'เพื่อนแถวหน้าเลนเดียวกัน', backLaneAlly: 'เพื่อนข้างหลังเลนเดียวกัน', frontRowAllies: 'เพื่อนแถวหน้า', backRowAllies: 'เพื่อนแถวหลัง', allyLowest: 'เพื่อน HP ต่ำสุด', allyRandom: 'เพื่อนสุ่ม 1 ตัว', allyRandom2: 'เพื่อนสุ่ม 2 ตัว', tribeAllies: 'เพื่อนเผ่าเดียวกัน' };
for (const t of SHARE_TO) SHOP_GIVE_TH['share_' + t] = `แบ่งเกราะให้${SHARE_TH[t] || t} %`;
export function fireShopSkill(st, u, ref, when, chars, rules, msgs) {
  const c = chars.find(x => x.id === u.id);
  if (!c) return;
  for (const s of c.skills || []) {
    const give = s.when === when && DO_INFO[s.do] && DO_INFO[s.do].shop;
    if (!give) continue;
    if (s.chance != null && s.chance < 100 && draw(st) * 100 >= s.chance) continue;
    const v = s.v[u.level - 1];
    if (s.to === 'nextTribeBuy') { // ประจุรอใช้: เก็บได้ทีละ 1 อันต่อชนิดตัวละคร (ซื้อซ้ำเพื่อรวมร่างไม่เพิ่ม · ค่าเสนอ)
      if (!Array.isArray(st.charges)) st.charges = [];
      const si = c.skills.indexOf(s);
      if (st.charges.some(x => x.id === c.id && x.si === si)) { msgs.push(`${c.id} ${c.name}: มีประจุรออยู่แล้ว`); continue; }
      st.charges.push({ id: c.id, uid: u.uid, si });
      msgs.push(`${c.id} ${c.name}: ประจุรอ → เพื่อนเผ่า${[c.tribe, ...c.extraTribes].join('/')} ตัวถัดไปที่ซื้อ ได้${SHOP_GIVE_TH[give] || give} ถาวร`);
      continue;
    }
    const tgs = shopTargets(st, ref, s.to, u, chars, s);
    let got = 0;
    for (const t of tgs) if (addPerm(t, give, Math.floor(v * rnPermMul(st, t)), rules) > 0) got++; // set 94: rune คงทน
    msgs.push(tgs.length
      ? `${c.id} ${c.name}: ${got}/${tgs.length} ตัวได้ ${SHOP_GIVE_TH[give] || give} +${v} ถาวร${got < tgs.length ? ' (บางตัวเต็มเพดานแล้ว)' : ''}`
      : `${c.id} ${c.name}: ไม่มีเพื่อนในตำแหน่งที่สกิลให้ผล`);
  }
}

// ประจุรอใช้ (SF-7 · 21 ต.ค.): ตัวที่ซื้อใหม่ เผ่าตรงกับเจ้าของประจุ และไม่ใช่ตัวชนิดเดียวกัน → ได้ค่าถาวรตามเลเวลของเจ้าของประจุตอนนี้
// เจ้าของประจุถูกขายหมดแล้ว = ประจุหาย · ถูกรวมร่าง = ใช้ตัวชนิดเดียวกันที่เลเวลสูงสุดแทน
export function chargeOwner(st, x) {
  const all = allUnits(st).map(y => y.u);
  return all.find(y => y.uid === x.uid) || all.filter(y => y.id === x.id).sort((a, b) => b.level - a.level)[0] || null;
}
export function dropDeadCharges(st) { if (Array.isArray(st.charges)) st.charges = st.charges.filter(x => chargeOwner(st, x)); }
export function useCharges(st, u, chars, rules, msgs) {
  if (!Array.isArray(st.charges) || !st.charges.length) return;
  dropDeadCharges(st);
  const c = chars.find(x => x.id === u.id), mine = c ? [c.tribe, ...c.extraTribes] : [];
  st.charges = st.charges.filter(x => {
    if (x.id === u.id) return true;
    const sc = chars.find(y => y.id === x.id), s = sc && sc.skills[x.si], give = s && DO_INFO[s.do] && DO_INFO[s.do].shop;
    if (!sc || !give) return false;
    if (![sc.tribe, ...sc.extraTribes].some(t => mine.includes(t))) return true;
    const owner = chargeOwner(st, x), v = s.v[owner.level - 1];
    const got = addPerm(u, give, v, rules);
    msgs.push(`${sc.id} ${sc.name}: ${c.id} ${c.name} ได้ ${SHOP_GIVE_TH[give] || give} +${got} ถาวร (ใช้ประจุ Lv${owner.level})`);
    return false;
  });
}

// ---------- เริ่มรอบร้านค้า ----------
export function startRound(st, chars, rules = RULES) {
  if (st.over) return fail('run จบแล้ว');
  const S = rules.shop;
  const msgs = [], held = st.gold; // set 94: rune interest is paid on the gold carried over (before this round's income)
  st.gold = 0; // set 107 (user G1): leftover gold is lost at the next round start (rune interest above still counts it · rune card rerolls after a win can still use it)
  if (st.round === 0) st.gold += S.startGold;
  else {
    const inc = incomeOf(st, rules);
    st.gold += inc.total;
    msgs.push(`รายได้ +${inc.total} (รอบละ ${inc.base}${inc.bonus ? ` · ชนะ +${inc.bonus}` : ''})`);
  }
  const fx = rnFx(st); // set 94: run-only runes (gold / interest / shop slots / free reroll / heart trade)
  if (st.round > 0) {
    const it = rnInterest(held, fx);
    if (fx.gold) { st.gold += fx.gold; msgs.push(`รูนทอง +${fx.gold}`); }
    if (it) { st.gold += it; msgs.push(`ดอกเบี้ยจากรูน +${it}`); }
  }
  if (st.rn) {
    st.rn.free = fx.free; st.rn.traded = false; st.rn.ro = 0;
    const want = S.slots + fx.slots;
    while (st.shop.length < want) st.shop.push({ id: null, locked: false });
    if (st.shop.length > want) st.shop.length = want;
  }
  const lvBefore = st.round ? shopLvOf(st, rules) : 0;
  st.round++;
  const lv = shopLvOf(st, rules);
  if (lv > lvBefore && st.round > 1) msgs.push(`ร้านขึ้นเป็นระดับ ${lv} (ขึ้นเองตามรอบ)`);
  refill(st, chars, rules);
  for (const { u, ref } of boardUnits(st)) fireShopSkill(st, u, ref, 'shopStart', chars, rules, msgs);
  try { st.fp = Math.round(teamPower(buildTeam(teamEntries(st), makeCharMap(chars), rules), rules)); } catch (e) { st.fp = 0; } // set 128: the enemy is locked from here (not re-picked at the fight)
  return done(msgs);
}

// ---------- ซื้อ / ขาย / รีโรล / ล็อก ----------
export function buy(st, slot, dest, chars, rules = RULES) {
  if (st.over) return fail('run จบแล้ว');
  if (!Number.isInteger(slot) || slot < 0 || slot >= st.shop.length) return fail('ช่องร้านไม่ถูกต้อง');
  const s = st.shop[slot];
  if (!s.id) return fail('ช่องนี้ว่าง');
  const c = chars.find(x => x.id === s.id);
  if (!c) return fail('ไม่มีตัวละครนี้');
  if (st.gold < c.price) return fail(`เงินไม่พอ (ต้องใช้ ${c.price})`);
  let to = dest && okRef(st, dest) && dest.at !== 'shop' && !get(st, dest) ? dest : null;
  if (!to) to = firstEmptyBench(st);
  if (!to) return fail('ม้านั่งเต็ม ขายก่อนซื้อ');
  st.gold -= c.price;
  const u = { uid: st.uid++, id: c.id, level: 1, perm: {}, paid: c.price };
  put(st, to, u);
  s.id = null; s.locked = false;
  const msgs = [];
  useCharges(st, u, chars, rules, msgs);
  fireShopSkill(st, u, to, 'buy', chars, rules, msgs);
  return { ...done(msgs), ref: to };
}

export function sell(st, ref, chars, rules = RULES) {
  if (st.over) return fail('run จบแล้ว');
  if (!okRef(st, ref) || ref.at === 'shop') return fail('ตำแหน่งไม่ถูกต้อง');
  const u = get(st, ref);
  if (!u) return fail('ช่องนี้ว่าง');
  put(st, ref, null);
  st.gold += u.paid; // set 127 (S-2): paid = sell value (merge already took 1 copy off per merge)
  const msgs = [`ขาย ${u.id} ได้คืน ${u.paid}`];
  if (st.rn) { // set 94: rune เงา worn by this unit → a Lv1 copy comes back to the bench (times per run, paid 0) · set 109: worn by the unit, not the slot
    put(st, ref, u); const sh = rnFx(st).shadow.filter(x => x.uid === u.uid), times = sh.reduce((a, x) => a + x.times, 0); put(st, ref, null);
    const to = sh.length ? firstEmptyBench(st) : null;
    if (to && st.rn.shadow < times) { put(st, to, { uid: st.uid++, id: u.id, level: 1, perm: {}, paid: 0 }); st.rn.shadow++; msgs.push(`รูนเงา: ได้ ${u.id} เลเวล 1 คืนที่ม้านั่ง`); }
    rnSync(st); // set 109 (user): every rune the sold unit wore goes back to the bag (not worn) — เงา too
  }
  fireShopSkill(st, u, ref, 'sell', chars, rules, msgs);
  dropDeadCharges(st);
  return done(msgs);
}

export function reroll(st, chars, rules = RULES) {
  if (st.over) return fail('run จบแล้ว');
  const cost = rules.shop.rerollCost;
  if (st.rn && st.rn.free > 0) { st.rn.free--; refill(st, chars, rules); return done([`สุ่มร้านฟรี (เหลือ ${st.rn.free})`]); } // set 94: rune สุ่มฟรี
  if (st.gold < cost) return fail(`เงินไม่พอ (รีโรลใช้ ${cost})`);
  st.gold -= cost;
  refill(st, chars, rules);
  return done();
}

export function toggleLock(st, slot) {
  if (!Number.isInteger(slot) || slot < 0 || slot >= st.shop.length || !st.shop[slot].id) return fail('ล็อกช่องว่างไม่ได้');
  st.shop[slot].locked = !st.shop[slot].locked;
  return done();
}

// set 106 (user 6 Nov, playtest P2): drag a shop card onto an owned Lv1 copy = buy + merge at once (no free slot needed)
// needs the target (Lv1, same id) + one more Lv1 copy anywhere (or rune รวมร่างเร็ว) · buy skills/charges fire as if bought onto the target's slot
export function buyMerge(st, slot, to, chars, rules = RULES) {
  if (st.over) return fail('run จบแล้ว');
  if (!Number.isInteger(slot) || slot < 0 || slot >= st.shop.length) return fail('ช่องร้านไม่ถูกต้อง');
  const s = st.shop[slot];
  if (!s.id) return fail('ช่องนี้ว่าง');
  const c = chars.find(x => x.id === s.id);
  if (!c) return fail('ไม่มีตัวละครนี้');
  if (!okRef(st, to) || to.at === 'shop') return fail('ตำแหน่งไม่ถูกต้อง');
  const b = get(st, to);
  if (!b || b.id !== c.id || b.level !== 1 || rules.maxLevel < 2) return fail('ซื้อแล้วรวมร่างได้เฉพาะเมื่อลากไปทับตัวชนิดเดียวกันเลเวล 1');
  const fast = (rnFx(st).fast[c.id] || rules.shop.mergeCount) <= 2;
  const third = fast ? null : allUnits(st).find(x => x.u !== b && x.u.id === c.id && x.u.level === 1);
  if (!fast && !third) return fail(`รวมร่างต้องมี ${c.id} เลเวล 1 ครบ ${rules.shop.mergeCount} ตัว (มีอยู่ 1 ตัว ซื้อลงช่องว่างก่อน)`);
  if (st.gold < c.price) return fail(`เงินไม่พอ (ต้องใช้ ${c.price})`);
  st.gold -= c.price;
  const u = { uid: st.uid++, id: c.id, level: 1, perm: {}, paid: c.price };
  s.id = null; s.locked = false;
  const msgs = [];
  useCharges(st, u, chars, rules, msgs);
  fireShopSkill(st, u, to, 'buy', chars, rules, msgs);
  const r = merge(st, third ? [third.ref] : [], to, chars, rules, [u]);
  return { ...r, msgs: [...msgs, ...r.msgs], ref: to };
}

// ---------- ย้าย / สลับ / รวมร่าง ----------
// ลากตัวไปทับตัวชนิดเดียวกัน เลเวลเท่ากัน + มีตัวที่ 3 อยู่ที่ไหนก็ได้ → รวมร่างที่ช่องปลายทาง
export function move(st, from, to, chars, rules = RULES) {
  if (!okRef(st, from) || !okRef(st, to) || from.at === 'shop' || to.at === 'shop') return fail('ตำแหน่งไม่ถูกต้อง');
  const a = get(st, from), b = get(st, to);
  if (!a) return fail('ไม่มีตัวละครที่ช่องต้นทาง');
  if (a === b) return done();
  if (b && b.id === a.id && b.level === a.level && a.level < rules.maxLevel) {
    if ((rnFx(st).fast[a.id] || rules.shop.mergeCount) <= 2) return merge(st, [from], to, chars, rules); // set 94: rune รวมร่างเร็ว
    const third = allUnits(st).find(x => x.u !== a && x.u !== b && x.u.id === a.id && x.u.level === a.level);
    if (!third) return fail(`รวมร่างต้องมี ${a.id} เลเวล ${a.level} ครบ ${rules.shop.mergeCount} ตัว`);
    return merge(st, [from, third.ref], to, chars, rules);
  }
  put(st, to, a); put(st, from, b || null);
  return done();
}

export function merge(st, srcRefs, destRef, chars, rules, extra = []) {
  const dest = get(st, destRef), srcs = srcRefs.map(r => get(st, r)).concat(extra);
  const res = { uid: dest.uid, id: dest.id, level: dest.level + 1, perm: {}, paid: dest.paid };
  for (const k of PERM_KEYS) addPerm(res, k, dest.perm[k] || 0, rules);
  for (const s of srcs) { res.paid += s.paid; for (const k of PERM_KEYS) addPerm(res, k, s.perm[k] || 0, rules); }
  // set 127 (user R2 = A): every merge loses 1 copy of the sell value (paid = what selling refunds) · 3-gold unit Lv1 3 · Lv2 6 · Lv3 15 · floor 0
  const cp = (chars.find(x => x.id === res.id) || {}).price | 0; res.paid = Math.max(0, res.paid - cp);
  for (const r of srcRefs) put(st, r, null);
  put(st, destRef, res);
  rnSync(st, { from: srcs.map(x => x.uid), to: res.uid }); // set 109: runes worn by a merged copy stay on the result
  const c = chars.find(x => x.id === res.id);
  const msgs = [`รวมร่าง ${c.id} ${c.name} → เลเวล ${res.level}`];
  fireShopSkill(st, res, destRef, 'merge', chars, rules, msgs);
  return { ...done(msgs), merged: res.level };
}

// ---------- ทีมสำหรับสู้ + จบแมตช์ ----------
export function teamEntries(st) {
  return boardUnits(st).map(({ u, ref }) => {
    const perm = {};
    for (const k of PERM_KEYS) if (u.perm[k]) perm[k] = u.perm[k];
    return Object.keys(perm).length ? { id: u.id, level: u.level, row: ref.row, lane: ref.lane, perm } : { id: u.id, level: u.level, row: ref.row, lane: ref.lane };
  });
}

// won: true = win or draw (a draw counts as the player's win)
// gains = perm values from skills during the fight (simulate().perm of this side) · on win and loss (22 Oct) · every field checked
// boss (set 99) = this match was a boss fight: resets bw (win or lose), a win adds bk · normal win adds bw
// over: hearts gone, or wins reach winsToFinish outside extra matches (the player may then continueExtra), or the last round (stage lastStage) was played
export function endMatch(st, won, chars, rules = RULES, gains = [], boss = false, stage = RUN_STAGE) {
  const S = rules.shop, msgs = [];
  applyBattlePerm(st, gains, chars, rules, msgs);
  for (const { u, ref } of boardUnits(st)) fireShopSkill(st, u, ref, 'matchEnd', chars, rules, msgs);
  if (won) for (const { u, ref } of boardUnits(st)) fireShopSkill(st, u, ref, 'matchWin', chars, rules, msgs);
  st.lastWon = !!won;
  if (won) st.wins++; else st.hearts--;
  const second = loseGuard(st, msgs); // set 119: second chance (hearts would hit 0 → +1 heart once per run + legend rune pick)
  if (boss) { st.bw = 0; if (won) st.bk++; } else if (won) { st.bw++; st.ls = 0; } else st.ls++; // set 100: ls = normal losses in a row
  st.ws = won ? (st.ws | 0) + 1 : 0; // set 107: wins in a row (boss too) → stronger enemy
  if (st.hearts <= 0 || (!st.extra && st.wins >= S.winsToFinish) || st.round >= (stage.settings.lastStage | 0)) st.over = true; // set 108: max rounds
  const out = done(msgs);
  if (second) out.second = true; // the caller then offers the legend rune pick (rnMakeOffer 'sc')
  return out;
}
// set 119 (user 7 Nov, G1 ก): when hearts would hit 0 (any cause) the first time in a run → +1 heart (run goes on) · st.sc = 1 (used)
export function loseGuard(st, msgs = []) {
  if (st.hearts > 0 || st.sc) return false;
  st.hearts = 1; st.sc = 1;
  msgs.push('โอกาสสุดท้าย! ได้หัวใจคืน 1 ดวง + เลือกรูนตำนานฟรี 1 อัน (ครั้งเดียวต่อ run)');
  return true;
}
// set 99 (user 6 Nov): after the run is cleared (wins = winsToFinish) the player may keep playing extra matches with the hearts left
export function continueExtra(st, rules = RULES) {
  if (!st.over || st.extra || st.hearts <= 0 || st.wins < rules.shop.winsToFinish || st.round >= (RUN_STAGE.settings.lastStage | 0)) return fail('เล่นต่อไม่ได้');
  st.extra = true; st.over = false;
  return done(['แมตช์พิเศษ: เล่นต่อด้วยหัวใจที่เหลือ']);
}

// ค่าถาวรจากการต่อสู้: ให้ตัวบนบอร์ดที่ช่องเดิมและชนิดเดิม · เกินเพดานถูกตัด (combat-rules เพดานค่าถาวร)
export function applyBattlePerm(st, gains, chars, rules, msgs) {
  if (!Array.isArray(gains)) return;
  const sum = new Map();
  for (const g of gains.slice(0, 200)) {
    if (!g || typeof g !== 'object' || !PERM_KEYS.includes(g.key) || !Number.isInteger(g.row) || !Number.isInteger(g.lane) || g.row < 0 || g.row > 2 || g.lane < 0 || g.lane > 1) continue;
    if (!(typeof g.amount === 'number' && Number.isFinite(g.amount) && g.amount > 0 && g.amount <= rules.permSanityMax)) continue;
    const u = st.board[g.row][g.lane];
    if (!u || u.id !== g.id) continue;
    const got = addPerm(u, g.key, Math.floor(g.amount * rnPermMul(st, u)), rules); // set 94: rune คงทน
    if (got > 0) { const k = `${u.id}|${g.key}`; sum.set(k, (sum.get(k) || 0) + got); }
  }
  for (const [k, v] of sum) { const [id, key] = k.split('|'), c = chars.find(x => x.id === id); msgs.push(`${id}${c ? ' ' + c.name : ''}: ได้${SHOP_GIVE_TH[key] || key} +${v} ถาวร (จากสกิลระหว่างสู้)`); }
}
