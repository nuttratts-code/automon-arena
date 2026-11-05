// Phase 2b — runes inside the normal run (set 94 · user 5 Nov 2026, claude/review-2026-11-05-set94-2b.md)
// - every normal-round WIN offers 1 free rune out of a fixed rarity mix per difficulty (ง่าย/กลาง/ยาก) · boss win = offBoss* mix
// - own rune shop (rsSlots cards, fixed rarity odds wCommon/wRare/wLegend, price by rarity, lock, reroll) · same gold as the unit shop
// - every held rune is active (Q4 A) · a rune with scope "ตัวเดียว" works on the board slot it is placed on · link/buddy also need a partner slot
// - run-only runes (gold, interest, shop slots, free reroll, heart trade, lure, fast merge, shadow, perm up, scout) are read by core/shop.js + the game page
// - copies per run (rune.max) cap both offers and the shop
// State lives in st.rn (pure data, saved with the run) · randomness = the run seed (draw) · every number comes from the stage config.
import { RUN_STAGE } from './runboss.js';
import { RUNE_RARITY, RUNE_SPEC, runeActive } from './stage.js';
import { runeRecord } from './runes.js';
import { fail, done } from './shop.js';
import { makeRng } from './rng.js';

export const RN_TIERS = ['ง่าย', 'กลาง', 'ยาก']; // = BOT_TIERS (core/botteams.js)
export const RN_OFFER_KEY = { 'ง่าย': 'Easy', 'กลาง': 'Norm', 'ยาก': 'Hard', boss: 'Boss' };
export const RN_RARS = RUNE_RARITY.map(r => r[0]); // common, rare, legend
const RN_RAR_KEY = { common: 'C', rare: 'R', legend: 'L' };
const RN_PRICE_KEY = { common: 'rsCommon', rare: 'rsRare', legend: 'rsLegend' };
export const RN_MAX_HELD = 80; // different runes held (sanity)

// own random stream (st.rn.n) so rune rolls never shift the unit shop's rolls
function rnDraw(st) { return makeRng((st.seed ^ 0x52554E45 ^ Math.imul(++st.rn.n, 0x85EBCA77)) >>> 0).next(); }
export function newRunes(stage = RUN_STAGE) {
  const n = Math.max(1, stage.settings.rsSlots | 0 || 3);
  return { n: 0, bag: {}, at: {}, pt: {}, shop: Array.from({ length: n }, () => ({ id: null, locked: false })), offer: null, free: 0, traded: false, shadow: 0 };
}
// rune record with its id · null = unknown / switched off / deleted
export function rnRec(id, stage = RUN_STAGE) {
  if (typeof id !== 'string') return null;
  const r = runeRecord(stage, id);
  return r && runeActive(r) ? { ...r, id } : null;
}
export function rnAll(stage = RUN_STAGE) {
  return [...Object.keys(stage.runes || {}), ...(stage.custom || []).map(c => c.id)].map(id => rnRec(id, stage)).filter(Boolean);
}
export const rnHeld = (st, id) => (st.rn && st.rn.bag[id]) | 0;
export const rnPrice = (r, stage = RUN_STAGE) => stage.settings[RN_PRICE_KEY[r.rarity]] | 0;
const rnSpecNum = (r, q) => (typeof r[q] === 'number' ? r[q] : ((RUNE_SPEC[r.eff] && RUNE_SPEC[r.eff].f.find(f => f[0] === q)) || [, , 0])[2]);
export const rnNeedsSlot = r => !!r && r.scope === 'one';
export const rnNeedsPartner = r => !!r && (r.eff === 'link' || r.eff === 'buddy');

// runes that may still be handed out: active, copies left, not in `skip`
function rnPool(st, rarity, stage, skip) {
  return rnAll(stage).filter(r => (!rarity || r.rarity === rarity) && rnHeld(st, r.id) < (r.max || 1) && !skip.has(r.id));
}
function rnPickFrom(st, list) { return list.length ? list[Math.floor(rnDraw(st) * list.length)] : null; }
function rnRollRarity(st, stage) {
  const S = stage.settings, w = { common: S.wCommon | 0, rare: S.wRare | 0, legend: S.wLegend | 0 };
  const sum = w.common + w.rare + w.legend;
  if (sum <= 0) return null;
  let x = rnDraw(st) * sum;
  for (const k of RN_RARS) { x -= w[k]; if (x < 0) return k; }
  return 'legend';
}

// ---------- reward after a win (offer: pick 1 of N) ----------
// kind = 'ง่าย' | 'กลาง' | 'ยาก' | 'boss' · a rarity with nothing left is filled from any rarity · nothing at all = no offer
export function rnMakeOffer(st, kind, stage = RUN_STAGE) {
  if (!st.rn || !RN_OFFER_KEY[kind]) return null;
  const S = stage.settings, key = RN_OFFER_KEY[kind], ids = [], skip = new Set();
  for (const rar of RN_RARS) for (let i = 0; i < (S[`off${key}${RN_RAR_KEY[rar]}`] | 0); i++) {
    const r = rnPickFrom(st, rnPool(st, rar, stage, skip)) || rnPickFrom(st, rnPool(st, null, stage, skip));
    if (!r) break;
    ids.push(r.id); skip.add(r.id);
  }
  st.rn.offer = ids.length ? { kind, ids } : null;
  return st.rn.offer;
}
export function rnTakeOffer(st, i, stage = RUN_STAGE) {
  const o = st.rn && st.rn.offer;
  if (!o || !Number.isInteger(i) || i < 0 || i >= o.ids.length) return fail('ไม่มีรูนให้เลือก');
  const r = rnRec(o.ids[i], stage);
  st.rn.offer = null;
  if (!r || rnHeld(st, r.id) >= (r.max || 1)) return fail('รูนนี้ใช้ไม่ได้แล้ว');
  rnAdd(st, r);
  return done([`ได้รูน ${r.name}${rnHeld(st, r.id) > 1 ? ` (มี ${rnHeld(st, r.id)} อัน)` : ''}`]);
}
export function rnSkipOffer(st) { if (st.rn) st.rn.offer = null; return done(); }
function rnAdd(st, r) { st.rn.bag[r.id] = rnHeld(st, r.id) + 1; }

// ---------- rune shop ----------
function rnRollShop(st, stage, skip) {
  const rar = rnRollRarity(st, stage);
  const r = (rar && rnPickFrom(st, rnPool(st, rar, stage, skip))) || rnPickFrom(st, rnPool(st, null, stage, skip));
  return r ? r.id : null;
}
export function rnRefill(st, stage = RUN_STAGE) {
  if (!st.rn) return;
  const n = Math.max(1, stage.settings.rsSlots | 0 || 3);
  while (st.rn.shop.length < n) st.rn.shop.push({ id: null, locked: false });
  if (st.rn.shop.length > n) st.rn.shop.length = n;
  const skip = new Set(st.rn.shop.filter(s => s.locked && s.id).map(s => s.id));
  for (const s of st.rn.shop) if (!s.locked || !s.id) { s.id = rnRollShop(st, stage, skip); s.locked = false; if (s.id) skip.add(s.id); }
}
export function rnBuy(st, i, stage = RUN_STAGE) {
  if (st.over || !st.rn) return fail('run จบแล้ว');
  if (!Number.isInteger(i) || i < 0 || i >= st.rn.shop.length) return fail('ช่องร้านรูนไม่ถูกต้อง');
  const s = st.rn.shop[i], r = rnRec(s.id, stage);
  if (!r) return fail('ช่องนี้ว่าง');
  if (rnHeld(st, r.id) >= (r.max || 1)) return fail(`รูน ${r.name} มีครบ ${r.max || 1} อันแล้ว`);
  const price = rnPrice(r, stage);
  if (st.gold < price) return fail(`เงินไม่พอ (ต้องใช้ ${price})`);
  st.gold -= price; rnAdd(st, r); s.id = null; s.locked = false;
  return done([`ซื้อรูน ${r.name} −${price}`]);
}
export function rnReroll(st, stage = RUN_STAGE) {
  if (st.over || !st.rn) return fail('run จบแล้ว');
  const cost = stage.settings.rsReroll | 0;
  if (st.gold < cost) return fail(`เงินไม่พอ (รีโรลร้านรูนใช้ ${cost})`);
  st.gold -= cost; rnRefill(st, stage);
  return done();
}
export function rnLock(st, i) {
  if (!st.rn || !Number.isInteger(i) || i < 0 || i >= st.rn.shop.length || !st.rn.shop[i].id) return fail('ล็อกช่องว่างไม่ได้');
  st.rn.shop[i].locked = !st.rn.shop[i].locked;
  return done();
}

// ---------- place a "one" rune on a board slot / pick the partner ----------
const rnSlotOk = (s, rules) => Array.isArray(s) && s.length === 2 && Number.isInteger(s[0]) && Number.isInteger(s[1]) && s[0] >= 0 && s[0] < rules.rows && s[1] >= 0 && s[1] < rules.lanes;
export function rnPlace(st, id, slot, rules, partner = false) {
  if (!st.rn || !rnHeld(st, id)) return fail('ไม่มีรูนนี้');
  const box = partner ? st.rn.pt : st.rn.at;
  if (slot === null) { delete box[id]; return done(); }
  if (!rnSlotOk(slot, rules)) return fail('ช่องไม่ถูกต้อง');
  box[id] = [slot[0], slot[1]];
  return done();
}

// ---------- effects ----------
// Run-only effects the shop reads (copies multiply the amount) · unit-bound ones resolve through the board slot the rune sits on
export function rnFx(st, stage = RUN_STAGE) {
  const fx = { gold: 0, intr: null, slots: 0, free: 0, heart: null, lure: {}, fast: {}, shadow: [], permUp: [], scout: false };
  if (!st || !st.rn) return fx;
  const unitAt = s => (s && st.board[s[0]] ? st.board[s[0]][s[1]] : null);
  for (const [id, n] of Object.entries(st.rn.bag)) {
    const r = rnRec(id, stage); if (!r || n < 1) continue;
    const slot = st.rn.at[id] || null, u = rnNeedsSlot(r) ? unitAt(slot) : null;
    switch (r.eff) {
      case 'gold': fx.gold += rnSpecNum(r, 'gold') * n; break;
      case 'interest': fx.intr = { per: Math.max(1, rnSpecNum(r, 'per')), gold: rnSpecNum(r, 'gold') * n, cap: rnSpecNum(r, 'cap') * n }; break;
      case 'shopSlots': fx.slots = Math.min(3, fx.slots + rnSpecNum(r, 'slots') * n); break;
      case 'freeRoll': fx.free += rnSpecNum(r, 'free') * n; break;
      case 'heartTrade': fx.heart = { gold: rnSpecNum(r, 'gold') * n, min: Math.max(2, rnSpecNum(r, 'minHearts')) }; break;
      case 'lure': if (u) fx.lure[u.id] = Math.max(fx.lure[u.id] || 1, rnSpecNum(r, 'mult')); break;
      case 'fastMerge': if (u) fx.fast[u.id] = Math.min(fx.fast[u.id] || 3, Math.max(2, rnSpecNum(r, 'need'))); break;
      case 'shadow': if (slot) fx.shadow.push({ slot, times: rnSpecNum(r, 'times') * n }); break;
      case 'permUp': if (slot) fx.permUp.push({ slot, pct: rnSpecNum(r, 'permPct') * n }); break;
      case 'scout': fx.scout = true; break;
      default: break;
    }
  }
  return fx;
}
// interest paid at round start on the gold held (only through rune T2 · user Q6)
export function rnInterest(gold, fx) { return fx.intr ? Math.min(fx.intr.cap, Math.floor(Math.max(0, gold) / fx.intr.per) * fx.intr.gold) : 0; }
// permanent value multiplier for a unit (rune คงทน on its board slot)
export function rnPermMul(st, u, stage = RUN_STAGE) {
  if (!st || !st.rn || !u) return 1;
  let pct = 0;
  for (const p of rnFx(st, stage).permUp) if (st.board[p.slot[0]] && st.board[p.slot[0]][p.slot[1]] === u) pct += p.pct;
  return 1 + pct / 100;
}
export function rnHeartTrade(st, stage = RUN_STAGE) {
  if (st.over || !st.rn) return fail('run จบแล้ว');
  const h = rnFx(st, stage).heart;
  if (!h) return fail('ไม่มีรูนแลกหัวใจ');
  if (st.rn.traded) return fail('รอบนี้แลกไปแล้ว');
  if (st.hearts < h.min) return fail(`หัวใจต้องเหลืออย่างน้อย ${h.min} ดวง`);
  st.hearts--; st.gold += h.gold; st.rn.traded = true;
  return done([`แลกหัวใจ 1 ดวง ได้เงิน ${h.gold}`]);
}

// Battle runes → equipRunes() list · 'one' runes without a slot do nothing · run-only runes are skipped by equipRunes itself
export function rnEquips(st, stage = RUN_STAGE) {
  if (!st || !st.rn) return [];
  return rnFromCompact(rnCompact(st), stage);
}
// compact form for replays / play records: [{ id, n, s?, p? }]
export function rnCompact(st) {
  if (!st || !st.rn) return [];
  return Object.entries(st.rn.bag).filter(([, n]) => n > 0).map(([id, n]) => {
    const o = { id, n };
    if (st.rn.at[id]) o.s = st.rn.at[id].slice();
    if (st.rn.pt[id]) o.p = st.rn.pt[id].slice();
    return o;
  });
}
export function rnFromCompact(list, stage = RUN_STAGE) {
  const out = [];
  for (const x of Array.isArray(list) ? list : []) {
    const r = rnRec(x && x.id, stage); if (!r) continue;
    if (rnNeedsSlot(r) && !x.s) continue;
    out.push({ r, n: x.n, slot: x.s || null, partner: x.p || null });
  }
  return out;
}
export function rnCompactOk(list, rules) {
  return Array.isArray(list) && list.length <= RN_MAX_HELD && list.every(x => x && typeof x === 'object' && !Array.isArray(x)
    && Object.keys(x).every(k => ['id', 'n', 's', 'p'].includes(k)) && typeof x.id === 'string' && /^[A-Z]{1,2}\d{1,3}$/.test(x.id)
    && Number.isInteger(x.n) && x.n >= 1 && x.n <= 9 && (x.s === undefined || rnSlotOk(x.s, rules)) && (x.p === undefined || rnSlotOk(x.p, rules)));
}

// ---------- save check (st.rn) ----------
export function rnValidate(rn, rules, stage = RUN_STAGE) {
  const errors = [], isObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const KEYS = ['n', 'bag', 'at', 'pt', 'shop', 'offer', 'free', 'traded', 'shadow'];
  if (!isObj(rn) || !Object.keys(rn).every(k => KEYS.includes(k)) || !KEYS.every(k => k in rn)) return ['รูน: ผิดรูปแบบ'];
  if (!isObj(rn.bag) || Object.keys(rn.bag).length > RN_MAX_HELD) errors.push('รูน: กระเป๋าผิด');
  else for (const [id, n] of Object.entries(rn.bag)) { const r = rnRec(id, stage); if (!r || !Number.isInteger(n) || n < 1 || n > (r.max || 1)) errors.push(`รูน ${id}: ผิด`); }
  for (const k of ['at', 'pt']) {
    if (!isObj(rn[k])) { errors.push('รูน: ช่องวางผิด'); continue; }
    for (const [id, s] of Object.entries(rn[k])) if (!isObj(rn.bag) || !rn.bag[id] || !rnSlotOk(s, rules)) errors.push(`รูน ${id}: ช่องวางผิด`);
  }
  const n = Math.max(1, stage.settings.rsSlots | 0 || 3);
  if (!Array.isArray(rn.shop) || rn.shop.length !== n || !rn.shop.every(s => isObj(s) && Object.keys(s).every(k => k === 'id' || k === 'locked') && typeof s.locked === 'boolean' && (s.id === null || !!rnRec(s.id, stage)))) errors.push('ร้านรูนผิด');
  if (rn.offer !== null && !(isObj(rn.offer) && Object.keys(rn.offer).every(k => k === 'kind' || k === 'ids') && RN_OFFER_KEY[rn.offer.kind]
    && Array.isArray(rn.offer.ids) && rn.offer.ids.length >= 1 && rn.offer.ids.length <= 15 && rn.offer.ids.every(id => !!rnRec(id, stage)))) errors.push('รูนรางวัลผิด');
  if (!Number.isInteger(rn.n) || rn.n < 0 || rn.n > 1e9) errors.push('รูน: ตัวนับสุ่มผิด');
  if (!Number.isInteger(rn.free) || rn.free < 0 || rn.free > 99) errors.push('รูน: สุ่มฟรีผิด');
  if (typeof rn.traded !== 'boolean') errors.push('รูน: แลกหัวใจผิด');
  if (!Number.isInteger(rn.shadow) || rn.shadow < 0 || rn.shadow > 99) errors.push('รูน: เงาผิด');
  return errors;
}
