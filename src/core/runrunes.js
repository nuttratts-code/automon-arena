// Phase 2b — runes inside the normal run (set 94 · user 5 Nov 2026, claude/review-2026-11-05-set94-2b.md)
// - every normal-round WIN offers 1 free rune (set 100: cards roll rarity by mode %, rerollable) · boss win = offBoss* mix
// - set 95 (user 5 Nov): rune shop REMOVED (runes come only from win offers) · difficulty = enemy team hp/atk × diffEasy/diffNorm/diffHard %
// - every held rune is active (Q4 A) · a rune with scope "ตัวเดียว" works on the board slot it is placed on · link/buddy also need a partner slot
// - run-only runes (gold, interest, shop slots, free reroll, heart trade, lure, fast merge, shadow, perm up, scout) are read by core/shop.js + the game page
// - copies per run (rune.max) cap the offers
// State lives in st.rn (pure data, saved with the run) · randomness = the run seed (draw) · every number comes from the stage config.
import { RUN_STAGE } from './runboss.js';
import { RUNE_RARITY, RUNE_SPEC, runeActive, enemyMultAt } from './stage.js';
import { runeRecord } from './runes.js';
import { fail, done } from './shop.js';
import { makeRng } from './rng.js';

// set 107 (user 6 Nov): modes ปกติ / ยาก / นรก REMOVED · normal win offer = 'win' (cards roll rarity by rarC/rarR/rarL %) · boss = 'boss'
// the enemy follows the player's power + win streak instead (core/botteams.js pickFoe)
export const RN_OFFER_KEY = { win: 'Win', boss: 'Boss' }; // key used only to check the kind (rarity settings: rarC/R/L · offBoss*)
export const RN_RARS = RUNE_RARITY.map(r => r[0]); // common, rare, legend
const RN_RAR_KEY = { common: 'C', rare: 'R', legend: 'L' };
export const RN_MAX_HELD = 80; // different runes held (sanity)

// own random stream (st.rn.n) so rune rolls never shift the unit shop's rolls
function rnDraw(st) { return makeRng((st.seed ^ 0x52554E45 ^ Math.imul(++st.rn.n, 0x85EBCA77)) >>> 0).next(); }
export function newRunes() {
  return { n: 0, bag: {}, at: {}, pt: {}, offer: null, free: 0, traded: false, shadow: 0, ro: 0 }; // ro = rune card rerolls used this match (set 100)
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
const rnSpecNum = (r, q) => (typeof r[q] === 'number' ? r[q] : ((RUNE_SPEC[r.eff] && RUNE_SPEC[r.eff].f.find(f => f[0] === q)) || [, , 0])[2]);
export const rnNeedsSlot = r => !!r && r.scope === 'one';
export const rnNeedsPartner = r => !!r && (r.eff === 'link' || r.eff === 'buddy');

// runes that may still be handed out: active, copies left, not in `skip`
function rnPool(st, rarity, stage, skip) {
  return rnAll(stage).filter(r => (!rarity || r.rarity === rarity) && rnHeld(st, r.id) < (r.max || 1) && !skip.has(r.id));
}
function rnPickFrom(st, list) { return list.length ? list[Math.floor(rnDraw(st) * list.length)] : null; }

// ---------- reward after a win (offer: pick 1 of N) ----------
// kind 'win' → offCards cards, each rolls its rarity by rarC/rarR/rarL % · 'boss' = fixed counts offBoss*
// a rarity with nothing left is filled from any rarity · nothing at all = no offer · skip = ids to avoid if possible (reroll)
function rnRollRar(st, key, S) {
  const w = RN_RARS.map(r => Math.max(0, S[`rar${RN_RAR_KEY[r]}`] | 0)), tot = w.reduce((a, b) => a + b, 0);
  if (!tot) return RN_RARS[0];
  let x = rnDraw(st) * tot;
  for (let i = 0; i < w.length; i++) { if (x < w[i]) return RN_RARS[i]; x -= w[i]; }
  return RN_RARS[RN_RARS.length - 1];
}
export function rnMakeOffer(st, kind, stage = RUN_STAGE, avoid = []) {
  if (!st.rn || !RN_OFFER_KEY[kind]) return null;
  const S = stage.settings, key = RN_OFFER_KEY[kind], ids = [], skip = new Set(avoid);
  const rars = kind === 'boss' ? RN_RARS.flatMap(rar => Array(S[`offBoss${RN_RAR_KEY[rar]}`] | 0).fill(rar))
    : Array.from({ length: Math.max(1, S.offCards | 0) }, () => rnRollRar(st, key, S));
  for (const rar of rars) {
    const r = rnPickFrom(st, rnPool(st, rar, stage, skip)) || rnPickFrom(st, rnPool(st, null, stage, skip))
      || rnPickFrom(st, rnPool(st, null, stage, new Set(ids))); // reroll: the old cards may come back only when nothing else is left
    if (!r) break;
    ids.push(r.id); skip.add(r.id);
  }
  st.rn.offer = ids.length ? { kind, ids } : null;
  return st.rn.offer;
}
// reroll the offer cards (set 100, user): rrFree free per match, then rrCost + rrStep × (paid rerolls so far) gold · counter reset in startRound
export function rnRerollCost(st, stage = RUN_STAGE) {
  const S = stage.settings, used = (st.rn && st.rn.ro) | 0, free = Math.max(0, S.rrFree | 0);
  return used < free ? 0 : Math.max(0, S.rrCost | 0) + Math.max(0, S.rrStep | 0) * (used - free);
}
export function rnRerollOffer(st, stage = RUN_STAGE) {
  const o = st.rn && st.rn.offer;
  if (!o) return fail('ไม่มีการ์ดรูนให้สุ่มใหม่');
  const cost = rnRerollCost(st, stage);
  if (st.gold < cost) return fail(`เงินไม่พอ (ต้องใช้ ${cost})`);
  st.gold -= cost; st.rn.ro++;
  if (!rnMakeOffer(st, o.kind, stage, o.ids)) st.rn.offer = o; // nothing at all left → keep the old cards
  return done([cost ? `สุ่มการ์ดรูนใหม่ -${cost} เงิน` : 'สุ่มการ์ดรูนใหม่ (ฟรี)']);
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

// ---------- enemy scale (set 107: modes removed) ----------
// enemy units (buildTeam output) with max hp and atk × pct/100 (rounded down, hp ≥ 1) · summons scale the same way
// pct = the power-match scale picked by pickFoe (100 = as the bot team is) · set 99: round = the match round → extra matches past
// growFrom also × enemyMultAt (stage settings growFrom/growPct, compounding)
export function rnFoeScale(units, pct = 100, stage = RUN_STAGE, round = 0) {
  const p = (typeof pct === 'number' && pct > 0 ? pct : 100) * enemyMultAt(stage.settings, round | 0);
  if (p === 100) return units;
  const sc = u => ({ ...u, maxHp: Math.max(1, Math.floor(u.maxHp * p / 100)), atk: Math.floor(u.atk * p / 100), skills: (u.skills || []).map(k => (k && k.unit ? { ...k, unit: sc(k.unit) } : k)) });
  return units.map(sc);
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
  const KEYS = ['n', 'bag', 'at', 'pt', 'offer', 'free', 'traded', 'shadow', 'ro'];
  if (!isObj(rn) || !Object.keys(rn).every(k => KEYS.includes(k)) || !KEYS.every(k => k in rn)) return ['รูน: ผิดรูปแบบ'];
  if (!isObj(rn.bag) || Object.keys(rn.bag).length > RN_MAX_HELD) errors.push('รูน: กระเป๋าผิด');
  else for (const [id, n] of Object.entries(rn.bag)) { const r = rnRec(id, stage); if (!r || !Number.isInteger(n) || n < 1 || n > (r.max || 1)) errors.push(`รูน ${id}: ผิด`); }
  for (const k of ['at', 'pt']) {
    if (!isObj(rn[k])) { errors.push('รูน: ช่องวางผิด'); continue; }
    for (const [id, s] of Object.entries(rn[k])) if (!isObj(rn.bag) || !rn.bag[id] || !rnSlotOk(s, rules)) errors.push(`รูน ${id}: ช่องวางผิด`);
  }
  if (rn.offer !== null && !(isObj(rn.offer) && Object.keys(rn.offer).every(k => k === 'kind' || k === 'ids') && RN_OFFER_KEY[rn.offer.kind]
    && Array.isArray(rn.offer.ids) && rn.offer.ids.length >= 1 && rn.offer.ids.length <= 15 && rn.offer.ids.every(id => !!rnRec(id, stage)))) errors.push('รูนรางวัลผิด');
  if (!Number.isInteger(rn.n) || rn.n < 0 || rn.n > 1e9) errors.push('รูน: ตัวนับสุ่มผิด');
  if (!Number.isInteger(rn.free) || rn.free < 0 || rn.free > 99) errors.push('รูน: สุ่มฟรีผิด');
  if (!Number.isInteger(rn.ro) || rn.ro < 0 || rn.ro > 999) errors.push('รูน: สุ่มการ์ดใหม่ผิด');
  if (typeof rn.traded !== 'boolean') errors.push('รูน: แลกหัวใจผิด');
  if (!Number.isInteger(rn.shadow) || rn.shadow < 0 || rn.shadow > 99) errors.push('รูน: เงาผิด');
  return errors;
}
