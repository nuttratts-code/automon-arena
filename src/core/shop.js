import { makeRng } from './rng.js';
import { DO_INFO, PERM_ABIL, PERM_STAT2, RULES, SHARE_TO, atMatch } from './rules.js';
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
    v: 1, seed: seed >>> 0, n: 0, round: 0, gold: 0, wins: 0, hearts: S.hearts, lastWon: false, over: false,
    shop: Array.from({ length: S.slots }, () => ({ id: null, locked: false })),
    bench: Array(S.bench).fill(null),
    board: [[null, null], [null, null], [null, null]],
    uid: 1,
    charges: [], // ประจุรอใช้ (SF-7): { id, uid, si } · ให้ค่าถาวรกับเพื่อนเผ่าเดียวกันตัวถัดไปที่ซื้อ
  };
  return st;
}

export function draw(st) { // เลขสุ่ม 0–1 จากเมล็ดในสถานะ
  const r = makeRng((st.seed ^ Math.imul(++st.n, 0x9E3779B1)) >>> 0).next();
  return r;
}

export function unlockedRarities(wins, rules = RULES) {
  return Object.entries(rules.shop.unlockWins).filter(([, w]) => wins >= w).map(([r]) => r);
}

export function rollChar(st, chars, rules, wins) {
  const S = rules.shop;
  // ใช้เฉพาะความหายากที่ปลดล็อกแล้ว มีตัวละครจริง และโอกาส > 0 (กันช่องร้านว่าง/พัง)
  const rars = unlockedRarities(wins, rules).filter(r => (S.weights[r] || 0) > 0 && chars.some(c => c.rarity === r));
  if (!rars.length) return null;
  const total = rars.reduce((a, r) => a + S.weights[r], 0);
  let x = draw(st) * total, rar = rars[0];
  for (const r of rars) { x -= S.weights[r] || 0; if (x < 0) { rar = r; break; } }
  const pool = chars.filter(c => c.rarity === rar);
  return pool[Math.floor(draw(st) * pool.length)].id;
}

export function refill(st, chars, rules, wins) {
  for (const s of st.shop) if (!s.locked || !s.id) { s.id = rollChar(st, chars, rules, wins); s.locked = false; }
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
    for (const t of tgs) if (addPerm(t, give, v, rules) > 0) got++;
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
export function startRound(st, chars, rules = RULES, opts = {}) {
  if (st.over) return fail('run จบแล้ว');
  const S = rules.shop;
  st.round++;
  st.gold += st.round === 1 ? S.startGold : S.goldPerRound + (st.lastWon ? S.winBonus : 0);
  const wins = opts.unlockWins ?? st.wins;
  refill(st, chars, rules, wins);
  const msgs = [];
  for (const { u, ref } of boardUnits(st)) fireShopSkill(st, u, ref, 'shopStart', chars, rules, msgs);
  return done(msgs);
}

// ---------- ซื้อ / ขาย / รีโรล / ล็อก ----------
export function buy(st, slot, dest, chars, rules = RULES) {
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
  if (!okRef(st, ref) || ref.at === 'shop') return fail('ตำแหน่งไม่ถูกต้อง');
  const u = get(st, ref);
  if (!u) return fail('ช่องนี้ว่าง');
  put(st, ref, null);
  st.gold += u.paid; // เอกสาร: คืนเต็มราคาที่จ่ายไปทั้งหมด
  const msgs = [`ขาย ${u.id} ได้คืน ${u.paid}`];
  fireShopSkill(st, u, ref, 'sell', chars, rules, msgs);
  dropDeadCharges(st);
  return done(msgs);
}

export function reroll(st, chars, rules = RULES, opts = {}) {
  const cost = rules.shop.rerollCost;
  if (st.gold < cost) return fail(`เงินไม่พอ (รีโรลใช้ ${cost})`);
  st.gold -= cost;
  refill(st, chars, rules, opts.unlockWins ?? st.wins);
  return done();
}

export function toggleLock(st, slot) {
  if (!Number.isInteger(slot) || slot < 0 || slot >= st.shop.length || !st.shop[slot].id) return fail('ล็อกช่องว่างไม่ได้');
  st.shop[slot].locked = !st.shop[slot].locked;
  return done();
}

// ---------- ย้าย / สลับ / รวมร่าง ----------
// ลากตัวไปทับตัวชนิดเดียวกัน เลเวลเท่ากัน + มีตัวที่ 3 อยู่ที่ไหนก็ได้ → รวมร่างที่ช่องปลายทาง
export function move(st, from, to, chars, rules = RULES) {
  if (!okRef(st, from) || !okRef(st, to) || from.at === 'shop' || to.at === 'shop') return fail('ตำแหน่งไม่ถูกต้อง');
  const a = get(st, from), b = get(st, to);
  if (!a) return fail('ไม่มีตัวละครที่ช่องต้นทาง');
  if (a === b) return done();
  if (b && b.id === a.id && b.level === a.level && a.level < rules.maxLevel) {
    const third = allUnits(st).find(x => x.u !== a && x.u !== b && x.u.id === a.id && x.u.level === a.level);
    if (!third) return fail(`รวมร่างต้องมี ${a.id} เลเวล ${a.level} ครบ ${rules.shop.mergeCount} ตัว`);
    return merge(st, [from, third.ref], to, chars, rules);
  }
  put(st, to, a); put(st, from, b || null);
  return done();
}

export function merge(st, srcRefs, destRef, chars, rules) {
  const dest = get(st, destRef), srcs = srcRefs.map(r => get(st, r));
  const res = { uid: dest.uid, id: dest.id, level: dest.level + 1, perm: {}, paid: dest.paid };
  for (const k of PERM_KEYS) addPerm(res, k, dest.perm[k] || 0, rules);
  for (const s of srcs) { res.paid += s.paid; for (const k of PERM_KEYS) addPerm(res, k, s.perm[k] || 0, rules); }
  for (const r of srcRefs) put(st, r, null);
  put(st, destRef, res);
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

// won: true = ชนะหรือเสมอ (เสมอนับเป็นชนะของผู้เล่น)
// gains = ค่าถาวรจากสกิลระหว่างสู้ (ผล simulate().perm ของฝั่งนี้) · ได้ทั้งแพ้และชนะ (22 ต.ค.) · ตรวจทุกช่องก่อนใช้
export function endMatch(st, won, chars, rules = RULES, gains = []) {
  const S = rules.shop, msgs = [];
  applyBattlePerm(st, gains, chars, rules, msgs);
  for (const { u, ref } of boardUnits(st)) fireShopSkill(st, u, ref, 'matchEnd', chars, rules, msgs);
  if (won) for (const { u, ref } of boardUnits(st)) fireShopSkill(st, u, ref, 'matchWin', chars, rules, msgs);
  st.lastWon = !!won;
  if (won) st.wins++; else st.hearts--;
  if (st.wins >= S.winsToFinish || st.hearts <= 0) st.over = true;
  return done(msgs);
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
    const got = addPerm(u, g.key, Math.floor(g.amount), rules);
    if (got > 0) { const k = `${u.id}|${g.key}`; sum.set(k, (sum.get(k) || 0) + got); }
  }
  for (const [k, v] of sum) { const [id, key] = k.split('|'), c = chars.find(x => x.id === id); msgs.push(`${id}${c ? ' ' + c.name : ''}: ได้${SHOP_GIVE_TH[key] || key} +${v} ถาวร (จากสกิลระหว่างสู้)`); }
}
