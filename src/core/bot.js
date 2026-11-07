import { RULES, TRIBES, pickHintRow, rowsOfHint } from './rules.js';
import { SLOT_ORDER, allUnits, buy, buyMerge, move, reroll, sell } from './shop.js';
import { basePower } from './power.js';
import { RUNE_RUN_ONLY } from './runes.js';
import { RN_RARS, rnMakeOffer, rnNeedsPartner, rnNeedsSlot, rnPlace, rnRec, rnRerollCost, rnRerollOffer, rnTakeOffer } from './runrunes.js';
// บอทซื้อของด้วยร้านและกฎเดียวกับผู้เล่น (ใช้คำสั่งใน shop.js เท่านั้น จึงทำผิดกฎไม่ได้)
// ไม่มีการสุ่มนอกจากเลขสุ่มในสถานะร้าน → เมล็ดเดิมได้ทีมเดิม (ใช้สร้างทีมบอทชุดตามจำนวนชนะภายหลังได้)
// Set 85 (user 4 Nov: "play like a real person"): the bot thinks like a player who only sees what the shop really offers —
// every buy/sell/reroll is judged by how much it raises an estimated team strength:
//   strength = the best 6 different characters (each counted once, like tribe counting) by value + tribe bonus share
//   value of a character = half what it is now (highest level owned) + half where its copies lead (3 copies = Lv2, 9 = Lv3)
//   → 2nd/3rd copies of a character that plays are worth buying, copies of one that sits on the bench are not
//   + carry: the character furthest on its way to Lv3 gets that path valued extra (a player commits to one carry)
// It spends its gold every round (gold carries over but earns nothing), rerolls to hunt copies (Lv3 reachable),
// sells the unit that matters least when bench + board are full (selling refunds the full price), then plays the best 6.
// Value = base stat power (core/power.js, skills not counted) — what a player can read off the character cards.

export const BOT_HINT = { 'หน้า': 0, 'กลาง': 1, 'ที่ไหนก็ได้': 1, 'หลัง': 2 };
export const BOT_AI = { tribeW: [0.1, 0.2, 0.3], potW: 0.3, maxRerolls: 40, minGain: 0.5, carryW: 0.5, focusW: 0.6, carryFrom: 4, mergeFirst: true };
// set 107 (user D2 "merge like a person"): mergeFirst = a shop copy that completes a merge is always bought (buy + merge works on a full bench)
// · from round carryFrom the carry (most copies on its way to Lv3, cheaper first) is always bought, never sold, and rerolls hunt for it
// set 89: shop level follows the round (no upgrade decision) · no interest → the bot spends all gold (rerolls up to maxRerolls)
export const value = (u, cm) => cm[u.id].price * Math.pow(3, u.level - 1);

export function mainTribes(st, cm) {
  const n = {};
  for (const { u } of allUnits(st)) for (const t of [cm[u.id].tribe, ...cm[u.id].extraTribes]) n[t] = (n[t] || 0) + 1;
  return n;
}

export function tryMerges(st, chars, rules) {
  for (let guard = 0; guard < 20; guard++) {
    const groups = {};
    for (const x of allUnits(st)) if (x.u.level < rules.maxLevel) (groups[`${x.u.id}:${x.u.level}`] = groups[`${x.u.id}:${x.u.level}`] || []).push(x);
    const g = Object.values(groups).find(l => l.length >= rules.shop.mergeCount);
    if (!g) return;
    const dest = g.find(x => x.ref.at === 'board') || g[0];
    const src = g.find(x => x !== dest);
    move(st, src.ref, dest.ref, chars, rules);
  }
}

// ---- strength estimate ----
const PW = new WeakMap(); // chars array → { id: [Lv1, Lv2, Lv3] power points }
function powers(chars, rules) {
  let m = PW.get(chars);
  if (!m) { m = Object.fromEntries(chars.map(c => [c.id, [0, 1, 2].map(L => basePower(c, L, rules).points)])); PW.set(chars, m); }
  return m;
}
// copies (in Lv1 units: Lv2 = 3, Lv3 = 9) per character id
function copiesOf(units) {
  const n = {};
  for (const u of units) n[u.id] = (n[u.id] || 0) + Math.pow(3, u.level - 1);
  return n;
}
function groupValue(pw, id, copies, rules) {
  const top = Math.min(rules.maxLevel, 1 + Math.floor(Math.log(copies + 1e-9) / Math.log(3)));
  const pot = Math.min(rules.maxLevel, 1 + Math.log(copies) / Math.log(3)); // fractional level the copies lead to
  const lo = Math.floor(pot), f = pot - lo, p = pw[id];
  const potV = lo >= rules.maxLevel ? p[rules.maxLevel - 1] : p[lo - 1] * (1 - f) + p[lo] * f;
  return (1 - BOT_AI.potW) * p[top - 1] + BOT_AI.potW * potV;
}
// best 6 different characters (greedy, tribe bonus included) → { score, ids }
// focus (set 87, bot team variety): a tribe this bot "likes" — its characters count focusW more, like a player going for one tribe
export function teamStrength(copies, cm, pw, rules, focus = null) {
  const ids = Object.keys(copies), gv = Object.fromEntries(ids.map(id => [id, groupValue(pw, id, copies[id], rules) * (focus && (cm[id].tribe === focus || cm[id].extraTribes.includes(focus)) ? 1 + BOT_AI.focusW : 1)]));
  // carry: the character with most copies on its way to Lv3 (ties → stronger at Lv3) gets its Lv3 path valued extra — a player commits to one carry
  if (BOT_AI.carryW) {
    let c = null;
    for (const id of ids) if (copies[id] >= 3 && copies[id] < 9 && (!c || copies[id] > copies[c] || (copies[id] === copies[c] && pw[id][2] > pw[c][2]))) c = id;
    if (c) gv[c] += BOT_AI.carryW * (pw[c][2] - pw[c][1]) * (copies[c] - 3) / 6;
  }
  const pick = [], cnt = {}, sum = {};
  const trib = id => [cm[id].tribe, ...cm[id].extraTribes];
  const tribeScore = () => { let s = 0; for (const t in cnt) { const i = rules.tribeSteps.filter(x => cnt[t] >= x).length - 1; if (i >= 0) s += sum[t] * BOT_AI.tribeW[Math.min(i, 2)]; } return s; };
  let base = 0;
  while (pick.length < rules.maxBoard && pick.length < ids.length) {
    let best = null, bestS = -1;
    for (const id of ids) {
      if (pick.includes(id)) continue;
      for (const t of trib(id)) { cnt[t] = (cnt[t] || 0) + 1; sum[t] = (sum[t] || 0) + gv[id]; }
      const s = base + gv[id] + tribeScore();
      for (const t of trib(id)) { cnt[t]--; sum[t] -= gv[id]; }
      if (s > bestS || (s === bestS && id < best)) { bestS = s; best = id; }
    }
    pick.push(best); base += gv[best];
    for (const t of trib(best)) { cnt[t] = (cnt[t] || 0) + 1; sum[t] = (sum[t] || 0) + gv[best]; }
  }
  return { score: base + tribeScore(), ids: pick };
}
const unitsNow = st => allUnits(st).map(x => x.u);
function strengthWith(st, cm, pw, rules, add = null, drop = null, focus = null) {
  const us = unitsNow(st).filter(u => u !== drop);
  if (add) us.push({ id: add, level: 1 });
  return teamStrength(copiesOf(us), cm, pw, rules, focus).score;
}

// จัดบอร์ด (set 85): the best 6 different characters at their highest level, extra copies fill empty slots,
// rows by the character's suggested row (front first)
export function arrange(st, cm, chars = null, rules = RULES, focus = null) {
  const all = unitsNow(st).sort((a, b) => b.level - a.level || value(b, cm) - value(a, cm) || a.uid - b.uid);
  let chosen;
  if (chars) {
    const pw = powers(chars, rules), plan = teamStrength(copiesOf(all), cm, pw, rules, focus).ids;
    chosen = plan.map(id => all.find(u => u.id === id));
    for (const u of all) if (chosen.length < SLOT_ORDER.length && !chosen.includes(u)) chosen.push(u);
  } else chosen = all.slice(0, SLOT_ORDER.length);
  // แถวแนะนำหลายแถว: เลือกแถวต่างกันไปทุกรอบ (คิดจาก uid + รอบ ไม่ใช้ตัวสุ่มของ run จะได้ไม่กระทบร้านค้า)
  // set 101 fix: each unit goes INTO its suggested row (was: sorted then packed 2 per row front-first, so a
  // 3-unit team put back-row units in front). Order of claim: single-row hints first, then 2-row, then anywhere;
  // inside a group the stronger unit (chosen order) first. Row full → the hint's other row → nearest row (front on tie).
  const key = u => { const h = cm[u.id].rowHint, p = pickHintRow(h, ((u.uid * 7 + st.round) % 2) / 2); return p != null ? p : BOT_HINT[h] ?? 1; };
  const nRows = h => { const n = rowsOfHint(h).length; return n === 0 ? 1 : n; };
  const onBoard = chosen.map((u, i) => ({ u, i })).sort((a, b) => nRows(cm[a.u.id].rowHint) - nRows(cm[b.u.id].rowHint) || a.i - b.i).map(x => x.u);
  const rest = all.filter(u => !onBoard.includes(u));
  st.board = [[null, null], [null, null], [null, null]];
  const free = r => st.board[r].findIndex(x => !x);
  for (const u of onBoard) {
    const want = key(u), ok = rowsOfHint(cm[u.id].rowHint);
    const order = [0, 1, 2].sort((a, b) => (a === want ? -1 : 0) - (b === want ? -1 : 0) || ok.includes(b) - ok.includes(a) || Math.abs(a - want) - Math.abs(b - want) || a - b);
    const r = order.find(x => free(x) >= 0);
    st.board[r][free(r)] = u;
  }
  st.bench = st.bench.map((_, i) => rest[i] || null);
}

// carry = the character with most copies (Lv1 units) on its way to Lv3 · ties → cheaper, then stronger at Lv3
function carryOf(st, cm, rules) {
  const n = copiesOf(unitsNow(st)), need = Math.pow(rules.shop.mergeCount, rules.maxLevel - 1);
  let c = null;
  for (const id of Object.keys(n)) if (n[id] >= rules.shop.mergeCount && n[id] < need && (!c || n[id] > n[c] || (n[id] === n[c] && cm[id].price < cm[c].price))) c = id;
  return c;
}
function freeDest(st) {
  if (st.bench.includes(null)) return null;
  for (const [row, lane] of SLOT_ORDER) if (!st.board[row][lane]) return { at: 'board', row, lane };
  return null;
}
// the unit whose loss hurts the estimated strength least (never the carry)
function weakest(st, cm, pw, rules, F, keep) {
  const now = strengthWith(st, cm, pw, rules, null, null, F);
  let w = null;
  for (const { u, ref } of allUnits(st)) {
    if (u.id === keep) continue;
    const loss = now - strengthWith(st, cm, pw, rules, null, u, F);
    if (!w || loss < w.loss || (loss === w.loss && u.uid < w.u.uid)) w = { u, ref, loss };
  }
  return w;
}
export function botShop(st, chars, rules = RULES, opts = {}) {
  const cm = Object.fromEntries(chars.map(c => [c.id, c])), pw = powers(chars, rules);
  const maxRerolls = opts.maxRerolls ?? BOT_AI.maxRerolls, F = opts.focus || null, cap = rules.maxBoard + st.bench.length;
  let rerolls = 0;
  for (let guard = 0; guard < 200; guard++) {
    tryMerges(st, chars, rules);
    const carry = BOT_AI.mergeFirst && st.round >= BOT_AI.carryFrom ? carryOf(st, cm, rules) : null;
    if (BOT_AI.mergeFirst) {
      const own1 = id => allUnits(st).filter(x => x.u.id === id && x.u.level === 1);
      const i = st.shop.findIndex(s => s.id && cm[s.id].price <= st.gold && own1(s.id).length >= rules.shop.mergeCount - 1);
      if (i >= 0 && buyMerge(st, i, own1(st.shop[i].id)[0].ref, chars, rules).ok) continue;
      const ci = carry ? st.shop.findIndex(s => s.id === carry && cm[carry].price <= st.gold) : -1;
      if (ci >= 0) {
        if (allUnits(st).length < cap) { if (buy(st, ci, freeDest(st), chars, rules).ok) continue; }
        else { const w = weakest(st, cm, pw, rules, F, carry); if (w) { sell(st, w.ref, chars, rules); continue; } }
      }
    }
    const now = strengthWith(st, cm, pw, rules, null, null, F);
    // best affordable buy by strength gain
    let best = null;
    st.shop.forEach((s, i) => {
      if (!s.id || cm[s.id].price > st.gold) return;
      const g = strengthWith(st, cm, pw, rules, s.id, null, F) - now;
      if (g > BOT_AI.minGain && (!best || g > best.g)) best = { i, g, id: s.id };
    });
    if (best) {
      if (allUnits(st).length < cap) {
        let dest = null; // ม้านั่งเต็มแต่บอร์ดว่าง → ซื้อลงบอร์ด
        if (!st.bench.includes(null)) for (const [row, lane] of SLOT_ORDER) if (!st.board[row][lane]) { dest = { at: 'board', row, lane }; break; }
        if (buy(st, best.i, dest, chars, rules).ok) continue;
      } else {
        // full: sell the unit whose loss hurts least, if the new one is worth more (full refund → only the swap matters)
        let worst = null;
        for (const { u, ref } of allUnits(st)) {
          if (u.id === carry) continue;
          const net = best.g - (now - strengthWith(st, cm, pw, rules, null, u, F));
          if (!worst || net > worst.net || (net === worst.net && u.uid < worst.u.uid)) worst = { u, ref, net };
        }
        if (worst && worst.net > BOT_AI.minGain) { sell(st, worst.ref, chars, rules); continue; }
      }
    }
    if (rerolls < maxRerolls && st.gold >= rules.shop.rerollCost) { reroll(st, chars, rules); rerolls++; continue; }
    break;
  }
  tryMerges(st, chars, rules);
  arrange(st, cm, chars, rules, F);
}

// ---- runes (set 107, user D2: bot teams carry runes like a real player) ----
// offer → highest rarity, battle runes before run-only ones · free reroll when no legend is offered (paid rerolls never)
// "one" runes sit on the strongest board unit (level, then rarity), partner on the 2nd strongest
const BOT_RAR = ['ธรรมดา', 'ไม่ธรรมดา', 'หายาก', 'หายากมาก', 'ตำนาน'];
const rRank = r => RN_RARS.indexOf(r.rarity) * 2 + (RUNE_RUN_ONLY.includes(r.eff) ? 0 : 1);
// cm (set 126): flag runes (T8) count the bot's main board tribe (most units, extra tribes count · tie = first in TRIBES order)
export function botFlagTribe(st, cm) {
  if (!cm) return null;
  const n = {};
  for (const row of st.board) for (const u of row) if (u && cm[u.id]) for (const t of [cm[u.id].tribe, ...(cm[u.id].extraTribes || [])]) n[t] = (n[t] || 0) + 1;
  let best = null; for (const t of TRIBES) if (n[t] && (!best || n[t] > n[best])) best = t;
  return best;
}
export function botTakeRune(st, kind, cm = null) {
  let o = rnMakeOffer(st, kind);
  if (o && kind !== 'boss' && !o.ids.some(id => rnRec(id).rarity === 'legend') && rnRerollCost(st) === 0) { rnRerollOffer(st); o = st.rn.offer; }
  if (!o) return;
  let bi = 0; o.ids.forEach((id, i) => { if (rRank(rnRec(id)) > rRank(rnRec(o.ids[bi]))) bi = i; });
  rnTakeOffer(st, bi, undefined, botFlagTribe(st, cm));
}
export function botPlaceRunes(st, cm, rules = RULES) {
  const units = [], strength = u => u.level * 10 + BOT_RAR.indexOf(cm[u.id].rarity);
  st.board.forEach((row, ri) => row.forEach((u, li) => { if (u) units.push({ u, s: [ri, li] }); }));
  units.sort((a, b) => strength(b.u) - strength(a.u));
  for (const id of Object.keys(st.rn.bag)) {
    const r = rnRec(id); if (!r) continue;
    if (rnNeedsSlot(r)) rnPlace(st, id, units[0] ? units[0].s : null, rules);
    if (rnNeedsPartner(r)) rnPlace(st, id, units[1] ? units[1].s : null, rules, true);
  }
}
