// ---------- ชุด 36: แท็บวิเคราะห์แมตช์ ----------
// ใช้ผลจำลองล่าสุด (simLast) ที่จำลองแบบจดส่วนประกอบดาเมจ (detail) · ตัวละ 1 แถว → แตะ = แยกตามที่มา → แตะที่มา = ส่วนประกอบ + ใส่ใคร/โดนจากใคร
// + ตารางใครตีใคร + กราฟ HP ตามเวลา · ข้อความทั้งหมดใส่ด้วย textContent / createElementNS เท่านั้น
// MX_SRC mxWhy mxAgg mxAdd mxLoss mxRecords mxModel: lab/matchcalc.js (set 42, tested in tests/t-skill-calc.js)
const MX_COLOR = { hit: 'var(--n-hit)', counter: 'var(--n-cnt)', reflect: 'var(--n-reflect)', shock: 'var(--n-shock)', burn: 'var(--n-burn)', storm: 'var(--n-storm)', skill: 'var(--n-skill)', downSkill: 'var(--n-down)', armorBreak: 'var(--n-abrk)', execute: 'var(--n-exec)' };
const MX_NAME = { hit: 'ฮิต', counter: 'สวนกลับ', shock: 'ช็อต', burn: 'ไฟ', skill: 'สกิล', downSkill: 'สกิลตอน down', armorBreak: 'เกราะแตก', reflect: 'สะท้อน', execute: 'down ทันที', storm: 'พายุทราย' };
const nf = v => Math.round(v).toLocaleString('en-US');
const pctTxt = v => `${v > 0 ? '+' : ''}${v}%`;
let mxKey = null, mxOpen = new Set(), mxCellSel = null, mxHi = null;
// A4: counts of share-split burn are fractional (1 tick with k sources = k records of 1/k) · integer when whole, else 1 decimal
const nfc = v => (Math.abs(v - Math.round(v)) < 0.05 ? nf(v) : (Math.round(v * 10) / 10).toLocaleString('en-US'));

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
    n.title = `เกราะกัน ${nf(a.abs)} · HP หายจริง ${nf(mxLoss(a))}${a.over >= 0.5 ? ` · เกิน HP ${nf(a.over)}` : ''}`;
    li.append(l, n); ul.append(li);
  }
  return ul;
}
