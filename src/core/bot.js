import { RULES, pickHintRow } from './rules.js';
import { SLOT_ORDER, allUnits, buy, move, reroll, sell } from './shop.js';
// บอทซื้อของด้วยร้านและกฎเดียวกับผู้เล่น (ใช้คำสั่งใน shop.js เท่านั้น จึงทำผิดกฎไม่ได้)
// ไม่มีการสุ่มนอกจากเลขสุ่มในสถานะร้าน → เมล็ดเดิมได้ทีมเดิม (ใช้สร้างทีมบอทชุดตามจำนวนชนะภายหลังได้)


export const BOT_HINT = { 'หน้า': 0, 'กลาง': 1, 'ที่ไหนก็ได้': 1, 'หลัง': 2 };
export const value = (u, cm) => cm[u.id].price * Math.pow(3, u.level - 1);

export function mainTribes(st, cm) {
  const n = {};
  for (const { u } of allUnits(st)) for (const t of [cm[u.id].tribe, ...cm[u.id].extraTribes]) n[t] = (n[t] || 0) + 1;
  return n;
}

export function score(st, id, cm) {
  const c = cm[id], owned = allUnits(st).filter(x => x.u.id === id && x.u.level < 3).length;
  const tr = mainTribes(st, cm);
  return c.price + owned * 6 + [c.tribe, ...c.extraTribes].reduce((a, t) => a + (tr[t] || 0) * 1.5, 0);
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

// จัดบอร์ด: เลือก 6 ตัวมูลค่าสูงสุด วางตามแถวแนะนำ (หน้าก่อน)
export function arrange(st, cm) {
  const all = allUnits(st).map(x => x.u).sort((a, b) => value(b, cm) - value(a, cm) || a.uid - b.uid);
  // แถวแนะนำหลายแถว: เลือกแถวต่างกันไปทุกรอบ (คิดจาก uid + รอบ ไม่ใช้ตัวสุ่มของ run จะได้ไม่กระทบร้านค้า)
  const key = u => { const h = cm[u.id].rowHint, p = pickHintRow(h, ((u.uid * 7 + st.round) % 2) / 2); return p != null ? p : BOT_HINT[h] ?? 1; };
  const onBoard = all.slice(0, SLOT_ORDER.length).sort((a, b) => key(a) - key(b) || a.uid - b.uid);
  const rest = all.slice(SLOT_ORDER.length);
  st.board = [[null, null], [null, null], [null, null]];
  onBoard.forEach((u, i) => { const [r, l] = SLOT_ORDER[i]; st.board[r][l] = u; });
  st.bench = st.bench.map((_, i) => rest[i] || null);
}

export function botShop(st, chars, rules = RULES, opts = {}) {
  const cm = Object.fromEntries(chars.map(c => [c.id, c]));
  const maxRerolls = opts.maxRerolls ?? 3;
  let rerolls = 0;
  for (let guard = 0; guard < 60; guard++) {
    tryMerges(st, chars, rules);
    const choices = st.shop.map((s, i) => ({ s, i })).filter(x => x.s.id && cm[x.s.id].price <= st.gold)
      .sort((a, b) => score(st, b.s.id, cm) - score(st, a.s.id, cm) || a.i - b.i);
    const roomy = allUnits(st).length < rules.maxBoard + st.bench.length;
    if (choices.length && roomy) {
      let dest = null; // ม้านั่งเต็มแต่บอร์ดว่าง → ซื้อลงบอร์ด
      if (!st.bench.includes(null)) for (const [row, lane] of SLOT_ORDER) if (!st.board[row][lane]) { dest = { at: 'board', row, lane }; break; }
      const r = buy(st, choices[0].i, dest, chars, rules);
      if (r.ok) continue;
    }
    if (choices.length && !roomy) { // ที่เต็ม: ขายตัวมูลค่าต่ำสุดที่ไม่ใช่คู่รวมร่าง ถ้าของใหม่ดีกว่า
      // เก็บไว้เฉพาะตัวที่ขาดอีกตัวเดียวจะรวมร่างได้
      const nearMerge = x => allUnits(st).filter(y => y.u.id === x.u.id && y.u.level === x.u.level).length === rules.shop.mergeCount - 1;
      const cheap = allUnits(st).filter(x => !nearMerge(x)).sort((a, b) => value(a.u, cm) - value(b.u, cm) || a.u.uid - b.u.uid)[0];
      if (cheap && value(cheap.u, cm) < score(st, choices[0].s.id, cm)) { sell(st, cheap.ref, chars, rules); continue; }
    }
    if (rerolls < maxRerolls + Math.floor(st.gold / 10) && st.gold >= rules.shop.rerollCost + 3) { reroll(st, chars, rules, opts); rerolls++; continue; }
    break;
  }
  tryMerges(st, chars, rules);
  arrange(st, cm);
}

