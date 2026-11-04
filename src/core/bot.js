import { RULES, pickHintRow } from './rules.js';
import { SLOT_ORDER, allUnits, buy, move, reroll, sell } from './shop.js';
import { basePower } from './power.js';
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
export const BOT_AI = { tribeW: [0.1, 0.2, 0.3], potW: 0.3, maxRerolls: 40, minGain: 0.5, carryW: 0.5 }; // set 85 sweep vs the old bot: this mix won 81% head to head // ค่าเสนอ (internal bot tuning)
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
export function teamStrength(copies, cm, pw, rules) {
  const ids = Object.keys(copies), gv = Object.fromEntries(ids.map(id => [id, groupValue(pw, id, copies[id], rules)]));
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
function strengthWith(st, cm, pw, rules, add = null, drop = null) {
  const us = unitsNow(st).filter(u => u !== drop);
  if (add) us.push({ id: add, level: 1 });
  return teamStrength(copiesOf(us), cm, pw, rules).score;
}

// จัดบอร์ด (set 85): the best 6 different characters at their highest level, extra copies fill empty slots,
// rows by the character's suggested row (front first)
export function arrange(st, cm, chars = null, rules = RULES) {
  const all = unitsNow(st).sort((a, b) => b.level - a.level || value(b, cm) - value(a, cm) || a.uid - b.uid);
  let chosen;
  if (chars) {
    const pw = powers(chars, rules), plan = teamStrength(copiesOf(all), cm, pw, rules).ids;
    chosen = plan.map(id => all.find(u => u.id === id));
    for (const u of all) if (chosen.length < SLOT_ORDER.length && !chosen.includes(u)) chosen.push(u);
  } else chosen = all.slice(0, SLOT_ORDER.length);
  // แถวแนะนำหลายแถว: เลือกแถวต่างกันไปทุกรอบ (คิดจาก uid + รอบ ไม่ใช้ตัวสุ่มของ run จะได้ไม่กระทบร้านค้า)
  const key = u => { const h = cm[u.id].rowHint, p = pickHintRow(h, ((u.uid * 7 + st.round) % 2) / 2); return p != null ? p : BOT_HINT[h] ?? 1; };
  const onBoard = chosen.sort((a, b) => key(a) - key(b) || a.uid - b.uid);
  const rest = all.filter(u => !onBoard.includes(u));
  st.board = [[null, null], [null, null], [null, null]];
  onBoard.forEach((u, i) => { const [r, l] = SLOT_ORDER[i]; st.board[r][l] = u; });
  st.bench = st.bench.map((_, i) => rest[i] || null);
}

export function botShop(st, chars, rules = RULES, opts = {}) {
  const cm = Object.fromEntries(chars.map(c => [c.id, c])), pw = powers(chars, rules);
  const maxRerolls = opts.maxRerolls ?? BOT_AI.maxRerolls, cap = rules.maxBoard + st.bench.length;
  let rerolls = 0;
  for (let guard = 0; guard < 200; guard++) {
    tryMerges(st, chars, rules);
    const now = strengthWith(st, cm, pw, rules);
    // best affordable buy by strength gain
    let best = null;
    st.shop.forEach((s, i) => {
      if (!s.id || cm[s.id].price > st.gold) return;
      const g = strengthWith(st, cm, pw, rules, s.id) - now;
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
          const loss = now - strengthWith(st, cm, pw, rules, best.id, u) + best.g; // strength lost by removing u (with the buy done)
          const net = best.g - (now - strengthWith(st, cm, pw, rules, null, u));
          if (!worst || net > worst.net || (net === worst.net && u.uid < worst.u.uid)) worst = { u, ref, net, loss };
        }
        if (worst && worst.net > BOT_AI.minGain) { sell(st, worst.ref, chars, rules); continue; }
      }
    }
    if (rerolls < maxRerolls && st.gold >= rules.shop.rerollCost) { reroll(st, chars, rules, opts); rerolls++; continue; }
    break;
  }
  tryMerges(st, chars, rules);
  arrange(st, cm, chars, rules);
}
