// ---------- ชุด 36: แท็บวิเคราะห์แมตช์ ----------
// ใช้ผลจำลองล่าสุด (simLast) ที่จำลองแบบจดส่วนประกอบดาเมจ (detail) · ตัวละ 1 แถว → แตะ = แยกตามที่มา → แตะที่มา = ส่วนประกอบ + ใส่ใคร/โดนจากใคร
// + ตารางใครตีใคร + กราฟ HP ตามเวลา · ข้อความทั้งหมดใส่ด้วย textContent / createElementNS เท่านั้น
const MX_SRC = ['hit', 'counter', 'shock', 'burn', 'skill', 'downSkill', 'armorBreak', 'reflect', 'execute', 'storm'];
const MX_COLOR = { hit: 'var(--n-hit)', counter: 'var(--n-cnt)', reflect: 'var(--n-reflect)', shock: 'var(--n-shock)', burn: 'var(--n-burn)', storm: 'var(--n-storm)', skill: 'var(--n-skill)', downSkill: 'var(--n-down)', armorBreak: 'var(--n-abrk)', execute: 'var(--n-exec)' };
const MX_NAME = { hit: 'ฮิต', counter: 'สวนกลับ', shock: 'ช็อต', burn: 'ไฟ', skill: 'สกิล', downSkill: 'สกิลตอน down', armorBreak: 'เกราะแตก', reflect: 'สะท้อน', execute: 'down ทันที', storm: 'พายุทราย' };
const mxWhy = w => (MX_SRC.includes(w) ? w : 'skill');
const nf = v => Math.round(v).toLocaleString('en-US');
const pctTxt = v => `${v > 0 ? '+' : ''}${v}%`;
let mxKey = null, mxOpen = new Set(), mxCellSel = null, mxHi = null;
const mxAgg = () => ({ n: 0, amt: 0, abs: 0, over: 0 });
const mxAdd = (a, r) => { a.n += r.f; a.amt += r.amt; a.abs += r.abs; a.over += r.over; };

// แยกดาเมจทุกครั้งเป็นรายการ { t, to, from, why, amt, abs, over, d, f } · ไฟแบ่งตามสัดส่วนคนที่ทำให้ติด (วิธีเดียวกับสรุปรายตัว)
function mxRecords(r) {
  const bs = burnShares(), recs = []; // A7: same tracker as the battle's u.dealt (core/battle.js)
  for (let ei = 0; ei < r.events.length; ei++) {
    const e = r.events[ei]; // ชุด 37: ei = เลขเหตุการณ์ (ใช้เป็นลิงก์ไปบรรทัดในบันทึก)
    if (e.k === 'burn' || e.k === 'cleanse' || e.k === 'down') bs.see(e.k, e);
    else if (e.k === 'dmg') {
      const d = e.d && typeof e.d === 'object' ? e.d : {}, over = d.over || 0;
      const push = (from, f) => recs.push({ t: e.t, ei, to: e.to, from, why: e.why, d, f, amt: e.amount * f, abs: e.absorbed * f, over: over * f, sub: !!e.sub, raw: e });
      if (e.why === 'burn') for (const [src, f] of bs.split(e.to)) push(src >= 0 ? src : null, f);
      else push(e.from, 1);
    }
  }
  return recs;
}
// ข้อความที่มาของดาเมจ 1 ครั้ง · ใช้เป็นกลุ่ม (ครั้งที่ข้อความเหมือนกันรวมเป็นบรรทัดเดียว)
function mxCompose(rec, U, m) {
  const d = rec.d, P = [];
  switch (rec.why) {
    case 'hit': {
      P.push(`พลังโจมตี ${d.atk ?? '?'}`); if (d.bonus) P.push(`${d.bonus > 0 ? '+' : '−'} บัฟระหว่างสู้ ${Math.abs(d.bonus)}`);
      if (d.n > 1) P.push(`÷ ${d.n} เป้า (ตีแบ่ง)`);
      if (d.amp) P.push(`× ดาเมจตี ${pctTxt(d.amp)}${d.tribeAmp ? ` (โบนัสเผ่า ${pctTxt(d.tribeAmp)})` : ''}`);
      if (d.takenAmp) P.push(`× เป้าโดนแรงขึ้น ${pctTxt(d.takenAmp)}`);
      if (d.carried) P.push('· ฮิตที่เพื่อนพาไปตี');
      break;
    }
    case 'counter': P.push(`พลังโจมตี ${d.atk ?? '?'}`); if (d.bonus) P.push(`+ บัฟ ${d.bonus}`); break;
    case 'shock': P.push(`ช็อตบนเป้า ${d.shock ?? '?'}`); if (d.amp) P.push(`× ดาเมจช็อต ${pctTxt(d.amp)}${d.tribeAmp ? ` (โบนัสเผ่า ${pctTxt(d.tribeAmp)})` : ''}`); if (d.takenAmp) P.push(`× เป้าโดนช็อตแรงขึ้น ${pctTxt(d.takenAmp)}`); P.push('· ทะลุเกราะ'); break;
    case 'burn': P.push(`ไฟบนตัว ${d.burn ?? '?'}`); if (d.takenAmp) P.push(`× โดนไฟแรงขึ้น ${pctTxt(d.takenAmp)}`); if (d.tribeAmp) P.push(`× โบนัสเพลิงเผาของอีกฝั่ง ${pctTxt(d.tribeAmp)}`); if (rec.f < 0.999) P.push(`· ส่วนของผู้ทำ ${Math.round(rec.f * 100)}%`); break;
    case 'storm': P.push(`พายุทรายครั้งที่ ${d.k ?? '?'}`); P.push(d.pierce ? '· ทะลุเกราะ' : '· เกราะกันได้'); break;
    default: {
      if (d.src === 'blast') { P.push('ระเบิดตอน down (โบนัสเผ่าอสูร)'); break; }
      if (d.src === 'tribe') { P.push('โบนัสเผ่า'); break; }
      const owner = U.get(rec.from != null ? rec.from : rec.to), c = owner && m[owner.id], s = c && d.si != null ? c.skills[d.si] : null;
      if (s) P.push(`สกิล ${d.si + 1}: ${skillLine(s, owner.level)}`);
      else P.push(WHY_SIM[rec.why] || rec.why);
      if (rec.why === 'execute') P.push('· เข้า HP ตรง');
    }
  }
  return P.join(' ');
}
const mxShort = u => `${u.side === 0 ? 'ซ้าย' : 'ขวา'} ${ROW_TH[u.row]}${u.lane + 1} ${u.name || u.id}`;
function mxWho(uid, U, m) {
  if (uid != null && uid === mxMe) return el('span', 'mx-ally', 'ตัวเอง');
  if (uid == null) return el('span', 'mx-ally', 'ไม่มีเจ้าของ');
  const u = U.get(uid); if (!u) return el('span', '', '?');
  const c = m[u.id], s = el('span', u.side === 0 ? 'lg-L' : 'lg-R');
  if (c) s.append(tribeBadge(c.tribe, c.extraTribes));
  s.append(`${c ? c.name : u.id} ${ROW_TH[u.row]}${u.lane + 1}`);
  return s;
}
function mxBar(bySrc, total, max) {
  const bar = el('div', 'mx-bar'); bar.style.width = `${max > 0 ? Math.max(4, total / max * 100) : 4}%`;
  for (const w of MX_SRC) { const a = bySrc[w]; if (!a || a.amt <= 0) continue; const i = document.createElement('i'); i.style.setProperty('--c', MX_COLOR[w]); i.style.width = `${a.amt / total * 100}%`; i.title = `${MX_NAME[w]} ${nf(a.amt)}`; bar.append(i); }
  return bar;
}
// รายการบรรทัด [ข้อความ/โหนด, ตัวเลข] เรียงมากไปน้อย
function mxLines(rows) {
  const ul = el('ul', 'mx-lines');
  for (const [label, a] of rows) {
    const li = el('li', ''); const l = el('span', ''); l.append(...(Array.isArray(label) ? label : [label]));
    const n = el('span', 'n', `${nf(a.amt)}${a.n > 1.001 ? `  (${nf(a.n)} ครั้ง)` : ''}`);
    n.title = `เกราะกัน ${nf(a.abs)} · HP หาย ${nf(a.amt - a.abs)}${a.over >= 0.5 ? ` · เกิน HP ${nf(a.over)}` : ''}`;
    li.append(l, n); ul.append(li);
  }
  return ul;
}
// แผง "ทำ" หรือ "รับ" ของตัวเดียว: รวม → ที่มา (กางได้) → ตารางส่วนประกอบ + คู่กรณี (ทุกบรรทัดมีลิงก์เวลา)
const MX_DMG_HEADS = ['ที่มา', 'ครั้ง', 'รวม', 'เกราะกัน', 'HP หาย'];
function mxPanel(title, list, mode, U, m, key) {
  const box = el('div', 'mx-panel'); box.append(el('h5', '', title));
  const tot = mxAgg(); list.forEach(r => mxAdd(tot, r));
  if (!list.length) { box.append(el('span', 'mx-tot', 'ไม่มี')); return box; }
  const t = el('div', 'mx-tot');
  t.append('รวม ', el('b', '', nf(tot.amt)), ` = เกราะกัน ${nf(tot.abs)} + HP หาย ${nf(tot.amt - tot.abs)}`, tot.over >= 0.5 ? ` (ในนั้นเกิน HP ที่เหลือ ${nf(tot.over)})` : '', ' · ครั้งแรก ');
  t.append(mxTimeBtn(list[0].ei), ' · ครั้งสุดท้าย ', mxTimeBtn(list[list.length - 1].ei));
  box.append(t);
  const bySrc = {}; for (const r of list) (bySrc[mxWhy(r.why)] ||= []).push(r);
  for (const w of MX_SRC) {
    const rs = bySrc[w]; if (!rs) continue;
    const a = mxAgg(); rs.forEach(r => mxAdd(a, r));
    const k = `${key}:${mode}:${w}`, det = document.createElement('details'); det.className = 'mxs'; det.open = mxOpen.has(k);
    det.addEventListener('toggle', () => { if (det.open) mxOpen.add(k); else mxOpen.delete(k); });
    const sum = document.createElement('summary'), nm = el('span', '');
    const dot = el('span', 'mx-dot'); dot.style.setProperty('--c', MX_COLOR[w]); nm.append(dot, MX_NAME[w]);
    sum.append(nm, el('span', 'cnt', `${nf(a.n)} ครั้ง`), el('span', 'n', `${nf(a.amt)} · ${Math.round(a.amt / tot.amt * 100)}%`));
    det.append(sum);
    const deep = el('div', 'mx-deep');
    // มาจากอะไร: ที่มาเหมือนกันรวมเป็นบรรทัดเดียว + จำนวนครั้ง/เกราะกัน/HP หาย + ลิงก์เวลา
    const comp = new Map();
    for (const r of rs) { const c = mxCompose(r, U, m); let g = comp.get(c); if (!g) comp.set(c, g = { a: mxAgg(), evs: [] }); mxAdd(g.a, r); g.evs.push(r.ei); }
    deep.append(el('h6', '', 'มาจากอะไร (ครั้งที่ที่มาเหมือนกันรวมเป็นบรรทัดเดียว)'),
      mxTable(MX_DMG_HEADS, [...comp].sort((x, y) => y[1].a.amt - x[1].a.amt).map(([c, g]) => ({ label: c, cells: [nf(g.a.n), nf(g.a.amt), nf(g.a.abs), nf(g.a.amt - g.a.abs)], evs: g.evs }))));
    // ใส่ใคร / โดนจากใคร
    const peers = new Map();
    for (const r of rs) { const p = mode === 'out' ? r.to : r.from; let g = peers.get(p); if (!g) peers.set(p, g = { a: mxAgg(), evs: [] }); mxAdd(g.a, r); g.evs.push(r.ei); }
    deep.append(el('h6', '', mode === 'out' ? 'ใส่ใคร' : 'โดนจากใคร'),
      mxTable(MX_DMG_HEADS, [...peers].sort((x, y) => y[1].a.amt - x[1].a.amt).map(([p, g]) => ({ label: [mxWho(p, U, m)], cells: [nf(g.a.n), nf(g.a.amt), nf(g.a.abs), nf(g.a.amt - g.a.abs)], evs: g.evs }))));
    const bp = rs.reduce((s0, r) => s0 + r.abs, 0), sm = el('div', 'mx-tot');
    sm.append(`เกราะกัน ${nf(bp)} · HP หาย ${nf(a.amt - bp)}${a.over >= 0.5 ? ` · เกิน HP ${nf(a.over)}` : ''} · ครั้งแรก `, mxTimeBtn(rs[0].ei), ' · ครั้งสุดท้าย ', mxTimeBtn(rs[rs.length - 1].ei));
    deep.append(sm);
    det.append(deep); box.append(det);
  }
  return box;
}
