// ---------- ชุด 37: แท็บรายตัว 4 แท็บ (ดาเมจที่ทำ · ดาเมจที่โดน · อื่นๆ · สเตตัส) ----------
// ข้อมูลทั้งหมดมาจากบันทึกเหตุการณ์ + ค่าก่อน/หลังของแต่ละตัว (ini/fin) ของแมตช์ที่จำลองแบบ detail · ข้อความใส่ด้วย textContent เท่านั้น
let mxCtx = null, mxTabSel = 0, mxPaint = null, mxMe = null; // mxCtx = ข้อมูลของแมตช์ที่แสดงอยู่ · mxTabSel = แท็บที่เลือก (ใช้ร่วมทุกตัว) · mxPaint = วาดรายการใหม่เมื่อเปลี่ยนการเรียง/ตัวกรอง
// ปุ่มลิงก์ไปบรรทัดในบันทึก: แสดงเวลา 4 อันแรก ที่เหลือกด "+N" เพื่อกางทั้งหมด
function mxLinks(evs) {
  const box = el('div', 'mx-links'); if (!evs || !evs.length) return box;
  const ev = mxCtx.r.events, mk = ei => { const b = el('button', 'mx-lk', secT(ev[ei].t)); b.type = 'button'; b.title = 'ไปบรรทัดนี้ในบันทึกการต่อสู้'; b.addEventListener('click', () => mxJump({ ev: ei })); return b; };
  box.append(el('span', 'mx-note', 'ดูในบันทึก:'));
  for (const ei of evs.slice(0, 4)) box.append(mk(ei));
  if (evs.length > 4) {
    const rest = evs.length - 4;
    let open = false;
    const more = el('button', 'mx-lk', `+${rest}`); more.type = 'button'; more.title = 'แสดงลิงก์ที่เหลือ';
    more.addEventListener('click', () => {
      open = !open;
      if (open) {
        for (const ei of evs.slice(4)) { const b = mk(ei); b.classList.add('mx-rest'); more.before(b); }
        more.textContent = '− ย่อ'; more.title = 'ย่อลิงก์กลับ'; more.setAttribute('aria-expanded', 'true');
      } else {
        for (const b of [...box.querySelectorAll('.mx-rest')]) b.remove();
        more.textContent = `+${rest}`; more.title = 'แสดงลิงก์ที่เหลือ'; more.setAttribute('aria-expanded', 'false');
      }
    });
    more.setAttribute('aria-expanded', 'false');
    box.append(more);
  }
  return box;
}
// ปุ่มเวลาเดียว ไปบรรทัดนั้นในบันทึก (ใช้ในบรรทัดสรุป)
function mxTimeBtn(ei) {
  const b = el('button', 'mx-lk', secT(mxCtx.r.events[ei].t)); b.type = 'button';
  b.title = 'ไปบรรทัดนี้ในบันทึกการต่อสู้'; b.addEventListener('click', () => mxJump({ ev: ei })); return b;
}
// ตารางแถวมาตรฐาน: heads = ['ชื่อ', 'ครั้ง', ...] · rows = [{ label, cells, evs, extra }] · evs = เลขเหตุการณ์ → ปุ่มเวลา
function mxTable(heads, rows) {
  const box = el('div', 'mx-rows'); box.style.setProperty('--n', String(heads.length - 1));
  const h = el('div', 'mx-row h'); heads.forEach((t, i) => h.append(el('span', i ? '' : 'l', t))); box.append(h);
  for (const r of rows) {
    const rw = el('div', 'mx-rw'), row = el('div', 'mx-row'), l = el('span', 'l');
    l.append(...(Array.isArray(r.label) ? r.label : [r.label])); row.append(l);
    for (const c of r.cells) row.append(el('span', '', c));
    rw.append(row);
    const kids = r.kids && r.kids.length;
    if (!kids) { // แถวธรรมดา: มีลิงก์เวลาของตัวเอง
      const lk = mxLinks(r.evs || []); if (r.extra) lk.append(r.extra);
      if (lk.childNodes.length) rw.append(lk);
    }
    box.append(rw);
    if (kids) { // แถวซ้อน: พับไว้ก่อน กดปุ่มเพื่อกาง (แถวแม่ไม่มีลิงก์เวลา)
      const sub = el('div', 'mx-subrows'); sub.hidden = true;
      for (const kk of r.kids) {
        const sr = el('div', 'mx-row'), sl = el('span', 'l');
        sl.append(...(Array.isArray(kk.label) ? kk.label : [kk.label])); sr.append(sl);
        for (const c of kk.cells) sr.append(el('span', '', c));
        const w = el('div', 'mx-rw sub'); w.append(sr);
        const srl = mxLinks(kk.evs || []); if (srl.childNodes.length) w.append(srl);
        sub.append(w);
      }
      const tgl = el('button', 'mx-lk', `▸ ${r.kids.length} เป้าหมาย`); tgl.type = 'button'; tgl.title = 'แสดง/ซ่อนการแยกตามเป้าหมาย';
      tgl.addEventListener('click', () => { sub.hidden = !sub.hidden; tgl.textContent = `${sub.hidden ? '▸' : '▾'} ${r.kids.length} เป้าหมาย`; });
      const lk = el('div', 'mx-links'); lk.append(tgl); rw.append(lk);
      box.append(sub);
    }
  }
  return box;
}
const mxFoldOpen = (k, title, build) => { // กล่องกางได้ (สร้างเนื้อหาตอนกาง)
  const det = document.createElement('details'); det.className = 'mxs'; det.open = mxOpen.has(k);
  const sum = document.createElement('summary'); sum.append(el('span', '', title), el('span', 'cnt', ''), el('span', 'n', '')); det.append(sum);
  const fill = () => { if (!det.querySelector('.mx-fold')) { const c = el('div', 'mx-fold'); c.append(build()); det.append(c); } };
  det.addEventListener('toggle', () => { if (det.open) { mxOpen.add(k); fill(); } else mxOpen.delete(k); });
  if (det.open) fill();
  return det;
};

// แท็บ 1: ดาเมจที่ทำ
function mxOutPane(uid, k) {
  const { m, U, per, act } = mxCtx, P = per.get(uid), a = act.get(uid), box = el('div', 'mx-pane');
  const to = P.out.reduce((s0, rr) => s0 + rr.amt, 0), t = el('div', 'mx-tot');
  const bits = [];
  if (a.hits > 0) bits.push(`ฮิต ${nf(a.hits)} ครั้ง${a.subs > 0 ? ` (+ ${nf(a.subs)} ฮิตย่อยจากตีแบ่ง · ตารางนับรวม ${nf(a.hits + a.subs)})` : ''}`);
  if (a.burnN > 0) bits.push(`ติดไฟศัตรู ${nf(a.burnN)} ครั้ง (รวม ${nf(a.burnU)} หน่วย)`);
  if (a.shockN > 0) bits.push(`ติดช็อตศัตรู ${nf(a.shockN)} ครั้ง (รวม ${nf(a.shockU)} หน่วย)`);
  t.append(bits.length ? `${bits.join(' · ')} · ดาเมจรวม ` : 'ไม่ได้ฮิตหรือติดสถานะศัตรู · ดาเมจรวม ', el('b', '', nf(to)));
  box.append(t);
  // ตารางตามที่มา (ชั้นเดียว) — รูปแบบเดียวกับแท็บ "โดนทำดาเมจ" และ "อื่นๆ"
  const srcRows = list => MX_SRC.filter(w => list.some(r => mxWhy(r.why) === w)).map(w => {
    const rs = list.filter(r => mxWhy(r.why) === w), g = mxAgg(); rs.forEach(r => mxAdd(g, r));
    const dot = el('span', 'mx-dot'); dot.style.setProperty('--c', MX_COLOR[w]);
    const byTo = new Map();
    for (const r of rs) { let q = byTo.get(r.to); if (!q) byTo.set(r.to, q = { a: mxAgg(), evs: [] }); mxAdd(q.a, r); q.evs.push(r.ei); }
    const kids = [...byTo].sort((x, y) => y[1].a.amt - x[1].a.amt).map(([to, q]) => { const d2 = el('span', 'mx-dot'); d2.style.setProperty('--c', MX_COLOR[w]); return { label: [d2, mxWho(to, U, m)], cells: [nfc(q.a.n), nf(q.a.amt), nf(q.a.abs), nf(mxLoss(q.a))], evs: q.evs }; });
    return { label: [dot, MX_NAME[w]], cells: [nfc(g.n), nf(g.amt), nf(g.abs), nf(mxLoss(g))], evs: rs.map(r => r.ei), kids, dots: [MX_COLOR[w]] };
  });
  const HEADS = ['ที่มา', 'ครั้ง', 'รวม', 'เกราะกัน', 'HP หายจริง'];
  box.append(mxTable(HEADS, srcRows(P.out)));
  if (P.ally.length) box.append(el('h5', '', 'ดาเมจที่ใส่พวกเดียวกัน'), mxTable(HEADS, srcRows(P.ally)));
  return box;
}

// แท็บ 2: ดาเมจที่โดน · 1 แถวต่อ 1 ศัตรู (ไม่รวมกัน) · ลิงก์เดียวต่อแถว = เปิดบันทึกเฉพาะคู่ (ตัวนี้ × ศัตรูตัวนั้น)
function mxInPane(uid, k) {
  const { U, m, per } = mxCtx, P = per.get(uid), box = el('div', 'mx-pane'), me = U.get(uid);
  if (!P.in.length) { box.append(el('span', 'mx-tot', 'ไม่ได้รับดาเมจ')); return box; }
  const tot = mxAgg(); P.in.forEach(rr => mxAdd(tot, rr));
  const t = el('div', 'mx-tot'); t.append('รวมที่โดน ', el('b', '', nf(tot.amt)), ` = เกราะกัน ${nf(tot.abs)} + HP หายจริง ${nf(mxLoss(tot))}`, tot.over >= 0.5 ? ` + เกิน HP ที่เหลือ ${nf(tot.over)}` : ''); box.append(t);
  // จัดกลุ่มเหมือนแท็บ 1: หัวข้อ = ที่มาของดาเมจ (สี) · แถวย่อย = โดนจากใคร (ชื่อ)
  const bySrc3 = new Map();
  for (const rr of P.in) { const w = mxWhy(rr.why); if (!bySrc3.has(w)) bySrc3.set(w, []); bySrc3.get(w).push(rr); }
  const rows = [...bySrc3].map(([w, list]) => { const a = mxAgg(); list.forEach(rr => mxAdd(a, rr)); return { w, list, a }; }).sort((x, y) => y.a.amt - x.a.amt);
  box.append(mxTable(['ที่มา', 'ครั้ง', 'รวม', 'เกราะกัน', 'HP หายจริง'], rows.map(({ w, list, a }) => {
    const dot = el('span', 'mx-dot'); dot.style.setProperty('--c', MX_COLOR[w]);
    const byFrom = new Map();
    for (const rr of list) { const k = rr.from == null ? 'n' : rr.from; let q = byFrom.get(k); if (!q) byFrom.set(k, q = { a: mxAgg(), evs: [] }); mxAdd(q.a, rr); q.evs.push(rr.ei); }
    const kids = [...byFrom].sort((x, y) => y[1].a.amt - x[1].a.amt).map(([k, q]) => {
      const d2 = el('span', 'mx-dot'); d2.style.setProperty('--c', MX_COLOR[w]);
      const lab = k === 'n' ? [d2, el('span', 'mx-ally', 'ไม่มีเจ้าของ (พายุทราย · ไฟที่ไม่มีผู้ทำ)')] : [d2, mxWho(k, U, m)];
      return { label: lab, cells: [nfc(q.a.n), nf(q.a.amt), nf(q.a.abs), nf(mxLoss(q.a))], evs: q.evs };
    });
    return { label: [dot, MX_NAME[w]], cells: [nfc(a.n), nf(a.amt), nf(a.abs), nf(mxLoss(a))], evs: list.map(rr => rr.ei), kids, dots: [MX_COLOR[w]] };
  })));
  return box;
}

// แท็บ 3: อื่นๆ · ผลตัวเลขของสกิลที่ไม่ใช่ดาเมจ · ที่ได้รับ + ที่ใช้กับตัวอื่น · ทุกแถวมีลิงก์ไปบรรทัดในบันทึก
const MX_FX = ['heal', 'armor', 'cleanse', 'revive', 'steal', 'summon', 'cdCut', 'reflectDebuff'];
// แท็บ 4: สเตตัส · ค่าตอนจบแมตช์ (รวมโบนัสเผ่า/สกิล/บัฟแล้ว) · ไม่มีที่มา/ก่อน-หลัง (A8: ลบโค้ดเก่าที่สัญญาไว้แล้ว)
function mxStatPane(uid, k) {
  const box = el('div', 'mx-pane'), x = mxCtx.res.get(uid), u = mxCtx.U.get(uid);
  if (!x || !x.fin) { box.append(el('p', 'mx-note', 'ไม่มีข้อมูลสเตตัสของแมตช์นี้ · กด "จำลองใหม่" ในแท็บลองสู้')); return box; }
  const f = x.fin;
  box.append(el('p', 'mx-note', 'ค่าสุดท้ายของตัวนี้ ณ ตอนจบแมตช์ (รวมโบนัสเผ่า / สกิล / บัฟทั้งหมดแล้ว)'));
  const rows = [
    ['HP', `${nf(Math.max(0, x.hp))} / ${nf(f.maxHp)}`],
    ['พลังโจมตี', nf(f.atk)],
    ['มัลติฮิต', `×${nf(f.multi)}`],
    ['ไฟ/ฮิต', nf(f.burnHit || 0)],
    ['ช็อต/ฮิต', nf(f.shockHit || 0)],
    ['เกราะ/ฮิต', nf(f.armorHit || 0)],
    ['ฟื้น/ฮิต', nf(f.healHit || 0)],
  ];
  const g = el('div', 'mx-stats');
  for (const [lab, val] of rows) { const tl = el('div', 'mx-stat'); tl.append(el('small', '', lab), el('b', '', val)); tl.title = `${lab} ตอนจบแมตช์`; g.append(tl); }
  box.append(g);
  return box;
}

// แท็บอยู่ข้างหัวข้อ "รายตัว" (ไม่ใช่ในแต่ละแถว) · เลือกแท็บเดียวแล้วทุกตัวเปลี่ยนตาม
const MX_TABS = ['ทำดาเมจ', 'โดนทำดาเมจ', 'อื่นๆ', 'สเตตัส'];
function mxUnitPane(uid, k) {
  mxMe = uid;
  const build = [() => mxOutPane(uid, k), () => mxInPane(uid, k), () => mxFxPane2(uid), () => mxStatPane(uid, k)];
  return build[mxTabSel]();
}
function mxUnitBody(uid, k) {
  const b = el('div', 'mx-body'); b.append(mxUnitPane(uid, k)); return b;
}
// แท่งเดี่ยว/หลายส่วน: widths = สัดส่วนในแท่ง (%), w = ความกว้างแท่งเทียบตัวที่มากสุด
function mxBarSegs(w, parts) {
  const bar = el('div', 'mx-bar'); bar.style.width = `${Math.max(4, Math.min(100, w))}%`;
  for (const [amt, color, title, total] of parts) {
    if (!(amt > 0)) continue;
    const i = document.createElement('i'); i.style.setProperty('--c', color); i.style.width = `${total > 0 ? amt / total * 100 : 100}%`; i.title = title;
    bar.append(i);
  }
  return bar;
}
// แผนภูมิในแถว: บรรทัดเดียว "ทำ 141 | 47 ฮิต · ไฟ 0 · ช็อต 0" + แท่งของแท็บที่เลือก
function mxMetric(uid) {
  const { per, act, res, fxTot, scale, U } = mxCtx, P = per.get(uid), a = act.get(uid), x = res.get(uid) || {};
  const sc = scale;
  const box = el('div', 'mx-num'), line = el('div', 'mx-line');
  const put = (lab, val, note, bar) => {
    line.append(el('small', '', lab), el('span', 'mx-val', val));
    if (note) line.append(el('span', 'mx-sep', '|'), el('span', 'mx-sub', note));
    box.append(line, bar); return box;
  };
  if (mxTabSel === 0) {
    const by = {}; let to = 0;
    for (const rr of P.out) { to += rr.amt; const w = mxWhy(rr.why); (by[w] ||= mxAgg()); mxAdd(by[w], rr); }
    // บรรทัดย่อย: จำนวนฮิต + สถานะที่ตัวนี้ไปติดให้ศัตรู (ไม่ใช่ดาเมจที่เกิดจากสถานะ) · ไม่มีค่าไหน = ไม่แสดง
    const parts = [];
    if (a.hits > 0) parts.push(`${nf(a.hits)} ฮิต`);
    if (a.shockU > 0) parts.push(`ติดช็อต ${nf(a.shockU)}`);
    if (a.burnU > 0) parts.push(`ติดไฟ ${nf(a.burnU)}`);
    return put('ทำ', nf(to), parts.join(' · '), mxBar(by, to, sc.out));
  }
  if (mxTabSel === 1) {
    const by = {}; let ti = 0;
    for (const rr of P.in) { ti += rr.amt; const w = mxWhy(rr.why); (by[w] ||= mxAgg()); mxAdd(by[w], rr); }
    const who = new Set(P.in.map(rr => rr.from ?? 'n')).size;
    return put('รับ', nf(ti), P.in.length ? `จาก ${nf(who)} ตัว · ${nfc(P.in.reduce((s0, rr) => s0 + rr.f, 0))} ครั้ง` : 'ไม่ได้รับดาเมจ', mxBar(by, ti, sc.in));
  }
  if (mxTabSel === 2) { // อื่นๆ: ผลที่ไม่ใช่ดาเมจ — "ทำ X | ให้เกราะ … · ให้ฮิล …"
    const f = fxTot.get(uid) || { heal: 0, armor: 0, heals: 0, armors: 0, skills: 0 };
    const tot = f.heal + f.armor;                              // armor + heal given (units)
    const parts = [];
    if (f.heals > 0) parts.push(`ให้ฮิล ${nf(f.heals)}`);
    if (f.armors > 0) parts.push(`ให้เกราะ ${nf(f.armors)}`);
    if (f.skills > 0) parts.push(`ใช้สกิล ${nf(f.skills)}`);
    return put('ทำ', nf(tot), parts.join(' · '),
      mxBarSegs(tot / sc.fx * 100, [[f.heal, 'var(--n-heal)', `ฮิล ${nf(f.heal)}`, tot], [f.armor, 'var(--n-armor)', `เกราะ ${nf(f.armor)}`, tot]]));
  }
  const max = Math.max(1, (x.fin && x.fin.maxHp) || x.hp || 1), hp = Math.max(0, x.hp || 0);
  return put('HP ตอนจบ', `${nf(hp)}/${nf(max)}`, x.down ? 'down' : 'รอด',
    mxBarSegs(hp / max * 100, [[hp, 'var(--hp)', `HP ${nf(hp)} / ${nf(max)}`, max]]));
}
const MX_FX_LEG = [['heal', 'ฮิล', 'var(--n-heal)'], ['armor', 'เกราะ', 'var(--n-armor)'], ['skill', 'สกิล', 'var(--n-skill)']];
function mxLegendPaint() { // legend เปลี่ยนตามแท็บ · สีที่ไม่มีในแมตช์นี้แสดงจาง ๆ
  const box = $('mxLegend'); if (!box || !mxCtx) return;
  const L = mxCtx.legend || { dmg: new Set(), fx: new Set() };
  const mk = (name, color, on) => { const s = el('span', on ? '' : 'off'); if (!on) s.title = 'ไม่มีในแมตช์นี้'; const d = el('span', 'mx-dot'); d.style.setProperty('--c', color); s.append(d, name); return s; };
  if (mxTabSel === 2) box.replaceChildren(...MX_FX_LEG.map(([k, nm, c]) => mk(nm, c, L.fx.has(k))));
  else if (mxTabSel === 3) box.replaceChildren(); // แท็บสเตตัส = ค่าสุดท้าย ไม่มีสีให้ดู
  else box.replaceChildren(...MX_SRC.map(w => mk(MX_NAME[w], MX_COLOR[w], L.dmg.has(w))));
}
// แท็บ 3: ผลที่ไม่ใช่ดาเมจ — "ตัวนี้ไปทำกับใคร" พร้อมลิงก์บันทึก
function mxFxPane2(uid) {
  const { U, m, fxGiven } = mxCtx, box = el('div', 'mx-pane'), me = U.get(uid), c = me ? m[me.id] : null;
  const HEADS = ['ผล', 'ครั้ง', 'รวม'];
  const rows = [...(fxGiven.get(uid) || new Map()).values()].sort((a, b) => (a.si != null) - (b.si != null) || b.list.length - a.list.length).map(row => {
    const s = row.si != null && c && c.skills ? c.skills[row.si] : null;
    const nm = row.si == null ? row.name : s ? skillLine(s, me ? me.level : 1) : `สกิล ${row.si + 1}`;
    const dot = el('span', 'mx-dot'); dot.style.setProperty('--c', row.color);
    const byT = new Map();
    for (const x of row.list) { const to = x.e.to ?? x.e.who ?? 'x'; let q = byT.get(to); if (!q) byT.set(to, q = { n: 0, amt: 0, evs: [] }); q.n++; q.amt += mxFxAmt(x.e); q.evs.push(x.ei); }
    const amt = row.list.reduce((a, x) => a + mxFxAmt(x.e), 0);
    const kids = [...byT].sort((a, b) => b[1].amt - a[1].amt || b[1].n - a[1].n).map(([to, q]) => ({ label: [to === 'x' ? el('span', 'mx-ally', 'ไม่มีเป้าหมาย') : mxWho(to, U, m)], cells: [nf(q.n), q.amt > 0 ? nf(q.amt) : '—'], evs: q.evs }));
    return { label: [dot, nm], cells: [nf(row.list.length), amt > 0 ? nf(amt) : '—'], kids };
  });
  if (!rows.length) box.append(el('span', 'mx-tot', 'ไม่มีผลอื่นๆ ในแมตช์นี้'));
  else box.append(mxTable(HEADS, rows));
  return box;
}
function mxSetTab(i) {
  mxTabSel = i;
  mxLegendPaint();
  [...$('mxTabs').children].forEach((b, j) => b.setAttribute('aria-selected', String(j === i)));
  mxRepaint();
}
function mxRepaint() { // เปลี่ยนเฉพาะแผนภูมิในแถว + เนื้อหาของแถวที่กางอยู่ (ไม่สร้างแถวใหม่)
  if (!mxCtx || !$('mxBody') || $('mxBody').hidden) return;
  for (const det of $('mxUnits').querySelectorAll('details.mxu')) {
    const uid = +det.dataset.uid, num = det.querySelector('summary .mx-num');
    if (num) { const fresh = mxMetric(uid), nb = fresh.querySelector(".mx-bar"), ob = det.querySelector("summary > .mx-bar"); if (nb && ob) ob.replaceWith(nb); num.replaceWith(fresh); }
    const body = det.querySelector('.mx-body');
    if (body) body.replaceChildren(mxUnitPane(uid, `u${uid}`));
  }
}
function renderMatch() {
  const has = !!(simLast && simLast.r);
  $('mxEmpty').hidden = has; $('mxBody').hidden = !has;
  if (!has) return;
  const { r, m } = simLast;
  const stale = $('simRun').classList.contains('stale');
  $('mxStale').hidden = !stale; $('mxStale').textContent = stale ? 'มีการแก้ค่าหรือทีมหลังจำลอง · ตัวเลขด้านล่างยังเป็นของแมตช์เดิม (กด "จำลองใหม่" ในแท็บลองสู้)' : '';
  const key = r; if (mxKey === key && $('mxUnits').childElementCount) return; mxKey = key;
  const all = unitsOf(r), res = new Map(r.units.map(u => [u.uid, u]));
  const model = mxModel(r, all), { U, recs, sideOf, foe, tot, per, act, fxTot, fxGiven } = model; // set 42: numbers from lab/matchcalc.js
  // หัว
  const win = r.winner === 0 ? 'ทีมซ้ายชนะ' : r.winner === 1 ? 'ทีมขวาชนะ' : 'เสมอ';
  // สรุปแมตช์: ผล · เวลา · ดาเมจสองฝั่ง · ตัวรอด · พายุ · seed
  const alive = [0, 1].map(sd => all.filter(u => u.side === sd && !(res.get(u.uid) || {}).down).length);
  const chip = (lab, val, title) => { const s = el('span', 'mx-sumchip'); s.append(el('small', '', lab), el('b', '', val)); if (title) s.title = title; return s; };
  $('mxHead').replaceChildren(el('b', 'win', win),
    chip('เวลา', `${(r.timeMs / 1000).toFixed(1)} วิ`),
    chip('ซ้ายทำ', nf(tot[0]), 'รวมส่วนที่เกราะกันด้วย · อาจเกิน HP รวมของอีกฝั่ง'),
    chip('ขวาทำ', nf(tot[1]), 'รวมส่วนที่เกราะกันด้วย · อาจเกิน HP รวมของอีกฝั่ง'),
    chip('รอด', `${alive[0]} / ${alive[1]}`, 'จำนวนตัวที่ยังไม่ down (ซ้าย / ขวา)'),
    chip('พายุเริ่ม', `${((RULES.stormStartMs || 0) / 1000).toFixed(1)} วิ`),
    chip('เลขสุ่ม', simSeedLabel()));

  mxCtx = { r, m, U, recs, per, act, res, fxTot, fxGiven, maxOut: 1, maxIn: 1, maxFx: 1 };
  const sum = mxBySrc;
  // สเกลแยกตามฝั่ง (ซ้ายเทียบซ้าย) เพื่อไม่ให้ตัวที่ทำน้อยกลายเป็นจุดเมื่ออีกฝั่งทำดาเมจสูงมาก
  // สเกลเดียวทั้งกระดาน: ตัวที่มากที่สุด = 100% ที่เหลือลดหลั่นตามสัดส่วน
  const scale = {
    out: Math.max(1, ...all.map(u => sum(per.get(u.uid).out)[1])),
    in: Math.max(1, ...all.map(u => sum(per.get(u.uid).in)[1])),
    fx: Math.max(1, ...all.map(u => { const f = fxTot.get(u.uid); return f.heal + f.armor; })),
  };
  Object.assign(mxCtx, { scale, legend: { dmg: new Set(MX_SRC.filter(w => recs.some(x => mxWhy(x.why) === w))), fx: new Set([...r.events.map(e => e.k).filter(k => MX_FX.includes(k)), ...([...fxGiven.values()].some(rows => [...rows.values()].some(x => x.si != null)) ? ['skill'] : [])]) } });
  mxLegendPaint();
  const paint = () => {
  const sortKey = ($('mxSort') || {}).value || 'base', hideDown = !!($('mxHideDown') || {}).checked;
  const sides = [0, 1].map(sd => {
    const box = el('div', `mx-side ${sd ? 'sR' : 'sL'}`); box.append(el('h4', '', sd ? 'ทีมขวา' : 'ทีมซ้าย'));
    let list = all.filter(x => x.side === sd);
    if (hideDown) list = list.filter(u => !(res.get(u.uid) || {}).down);
    if (sortKey === 'out') list = [...list].sort((a, b) => sum(per.get(b.uid).out)[1] - sum(per.get(a.uid).out)[1]);
    if (sortKey === 'in') list = [...list].sort((a, b) => sum(per.get(b.uid).in)[1] - sum(per.get(a.uid).in)[1]);
    if (!list.length) box.append(el('p', 'mx-note', 'ไม่มีตัวที่ตรงเงื่อนไข'));
    for (const u of list) {
      const P = per.get(u.uid), c = m[u.id], x = res.get(u.uid);
      const k = `u${u.uid}`, det = document.createElement('details'); det.className = 'mxu'; det.dataset.uid = String(u.uid);
      det.style.setProperty('--sc', sd ? 'var(--sideR)' : 'var(--sideL)'); det.open = mxOpen.has(k);
      det.addEventListener('toggle', () => { if (det.open) { mxOpen.add(k); if (!det.querySelector('.mx-body')) det.append(body()); } else mxOpen.delete(k); });
      const s = document.createElement('summary'), nm = el('div', 'mx-name');
      if (c) nm.append(tribeBadge(c.tribe, c.extraTribes));
      nm.append(el('span', 'nm', `${c ? c.name : u.id} Lv${u.level} · ${ROW_TH[u.row]}${u.lane + 1}`), pill(x && x.down ? 'down' : 'ยืน', x && x.down ? 'mx-down' : 'p-ok'));
      nm.title = `${u.id} ${c ? c.name : ''} · ${mxShort(u)}`;
      const mn = mxMetric(u.uid), bar = mn.querySelector(".mx-bar"); s.append(nm, mn); if (bar) s.append(bar); det.append(s);
      const body = () => mxUnitBody(u.uid, k);
      if (det.open) det.append(body());
      box.append(det);
    }
    return box;
  });
  $('mxUnits').replaceChildren(...sides);
  };
  mxPaint = paint; paint();
  renderMatrix(all, U, m, recs, foe);
  renderChart(all, r, m);
}
// ใครตีใคร: 2 ตาราง (ซ้าย → ขวา · ขวา → ซ้าย) · แตะช่อง = แยกตามที่มา
function renderMatrix(all, U, m, recs, foe) {
  const pair = new Map(); for (const x of recs) { if (x.from != null && !foe(x)) continue; const k = `${x.from ?? 'n'}>${x.to}`; (pair.get(k) || pair.set(k, []).get(k)).push(x); }
  const total = list => list ? list.reduce((a, x) => a + x.amt, 0) : 0;
  const cellBox = el('div', 'mx-cell');
  const showCell = (k, title) => {
    mxCellSel = k; document.querySelectorAll('#mxMat td button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === k)));
    const list = pair.get(k) || [], g = {}; for (const x of list) { const w = mxWhy(x.why); (g[w] ||= mxAgg()); mxAdd(g[w], x); }
    cellBox.replaceChildren(el('b', '', title), mxLines(MX_SRC.filter(w => g[w]).map(w => { const d = el('span', 'mx-dot'); d.style.setProperty('--c', MX_COLOR[w]); return [[d, MX_NAME[w]], g[w]]; })));
  };
  const tables = [0, 1].map(sd => {
    const atk = all.filter(u => u.side === sd), tgt = all.filter(u => u.side !== sd);
    const rows = [...atk.map(u => u.uid), 'n'], max = Math.max(1, ...rows.flatMap(a => tgt.map(t => total(pair.get(`${a}>${t.uid}`)))));
    const tb = el('table', ''), head = el('tr', ''); head.append(el('th', sd ? 'colR' : 'colL', sd ? 'ขวาทำ ↓ / ซ้ายโดน →' : 'ซ้ายทำ ↓ / ขวาโดน →'));
    for (const t of tgt) { const th = el('th', sd ? 'colL' : 'colR', `${ROW_TH[t.row]}${t.lane + 1}`); th.title = mxShort(t); th.append(el('div', 'tname', (m[t.id] || {}).name || t.id)); head.append(th); }
    head.append(el('th', '', 'รวม')); tb.append(el('thead', '')); tb.firstChild.append(head);
    const body = el('tbody', '');
    for (const a of rows) {
      const tr = el('tr', ''), name = el('td', ''); name.append(a === 'n' ? el('span', 'mx-ally', 'ไม่มีเจ้าของ') : mxWho(a, U, m)); tr.append(name);
      let rowT = 0;
      for (const t of tgt) {
        const k = `${a}>${t.uid}`, v = total(pair.get(k)); rowT += v;
        const b = el('button', '', v ? nf(v) : '–'); b.type = 'button'; b.dataset.k = k; b.disabled = !v; b.setAttribute('aria-pressed', String(k === mxCellSel));
        b.style.setProperty('--hc', sd ? 'var(--sideR)' : 'var(--sideL)'); b.style.setProperty('--a', String(Math.round(v / max * 55)));
        const title = `${a === 'n' ? 'ไม่มีเจ้าของ' : mxShort(U.get(a))} → ${mxShort(t)}`; b.title = title;
        b.addEventListener('click', () => showCell(k, title));
        const c = el('td', ''); c.append(b); tr.append(c);
      }
      tr.append(el('td', 'n', nf(rowT)));
      if (a !== 'n' || rowT > 0) body.append(tr);
    }
    tb.append(body);
    const wrap = el('div', 'tbl'); wrap.append(tb); return wrap;
  });
  $('mxMat').replaceChildren(...tables, cellBox);
  if (mxCellSel && pair.has(mxCellSel)) { const b = document.querySelector(`#mxMat button[data-k="${mxCellSel}"]`); if (b) showCell(mxCellSel, b.title); } else mxCellSel = null;
}
// กราฟ HP % ตามเวลา: 2 แผง (ซ้ายบน ขวาล่าง) · จุด = ดาเมจครั้งเดียว > 20% ของ HP สูงสุด
const SVGN = 'http://www.w3.org/2000/svg';
const sv = (tag, attrs, text) => { const e = document.createElementNS(SVGN, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v)); if (text != null) e.textContent = text; return e; };
const MX_DASH = ['', '6 3', '2 3', '9 3 2 3', '1 3', '12 4'];
function renderChart(all, r, m) {
  const S = new Map(all.map(u => [u.uid, { hp: u.hp, maxHp: u.maxHp, pts: [] }])), dots = [];
  for (const u of r.events[0].units) S.get(u.uid).pts.push([0, u.hp / u.maxHp]);
  const mark = (uid, t) => { const x = S.get(uid); if (!x) return; const p = Math.max(0, Math.min(1, x.hp / Math.max(1, x.maxHp))), L = x.pts; if (L.length && L[L.length - 1][0] === t) L[L.length - 1][1] = p; else { if (L.length) L.push([t, L[L.length - 1][1]]); L.push([t, p]); } };
  for (const e of r.events) {
    const x = S.get(e.to ?? e.who); if (!x) continue;
    switch (e.k) {
      case 'summon': { const u = e.unit, y = S.get(u.uid); if (y) { y.hp = u.hp; y.maxHp = u.maxHp; y.pts = [[e.t, u.hp / u.maxHp]]; } continue; }
      case 'dmg': x.hp -= e.amount - e.absorbed; if (e.amount >= 0.2 * x.maxHp) dots.push({ uid: e.to, t: e.t, why: e.why, amt: e.amount, p: Math.max(0, x.hp / Math.max(1, x.maxHp)) }); break;
      case 'heal': x.hp += e.amount; break;
      case 'maxhp': x.maxHp = e.maxHp; x.hp = Math.min(x.hp, e.hp); break;
      case 'buff': if (e.what !== 'hpUp') continue; x.maxHp += e.amount; x.hp += e.amount; break;
      case 'down': x.hp = 0; break;
      case 'revive': x.hp = e.hp; break;
      default: continue;
    }
    mark(e.to ?? e.who, e.t);
  }
  const T = Math.max(1000, r.timeMs);
  for (const x of S.values()) if (x.pts.length) x.pts.push([T, x.pts[x.pts.length - 1][1]]);
  const W = 640, PH = 130, L = 36, Rm = 10, TOP = 18, GAP = 34, H = TOP + PH * 2 + GAP + 22;
  const X = t => L + (W - L - Rm) * t / T, Y = (sd, p) => TOP + sd * (PH + GAP) + (1 - p) * PH;
  const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'กราฟ HP ตามเวลา' });
  const stepS = [1, 2, 5, 10, 15, 20, 30, 60, 120].find(s => T / 1000 / s <= 8) || 300;
  for (const sd of [0, 1]) {
    svg.append(sv('text', { x: L, y: Y(sd, 1) - 7, class: 'ax', fill: sd ? 'var(--sideR)' : 'var(--sideL)' }, sd ? 'ทีมขวา' : 'ทีมซ้าย'));
    for (const p of [0, 0.5, 1]) { svg.append(sv('line', { x1: L, x2: W - Rm, y1: Y(sd, p), y2: Y(sd, p), class: 'grid' })); svg.append(sv('text', { x: L - 4, y: Y(sd, p) + 3, 'text-anchor': 'end', class: 'ax' }, `${p * 100}%`)); }
  }
  for (let s = 0; s * 1000 <= T; s += stepS) { const x = X(s * 1000); svg.append(sv('line', { x1: x, x2: x, y1: TOP, y2: Y(1, 0), class: 'grid', 'stroke-dasharray': '2 4' })); svg.append(sv('text', { x, y: H - 6, 'text-anchor': 'middle', class: 'ax' }, `${s} วิ`)); }
  const idx = [0, 0];
  const chips = el('div', 'mx-chips');
  for (const u of all) {
    const x = S.get(u.uid); if (!x || !x.pts.length) continue;
    const i = idx[u.side]++, col = u.side ? 'var(--sideR)' : 'var(--sideL)', dash = MX_DASH[i % MX_DASH.length];
    const pl = sv('polyline', { class: 'ln', points: x.pts.map(([t, p]) => `${X(t).toFixed(1)},${Y(u.side, p).toFixed(1)}`).join(' '), stroke: col, fill: 'none', ...(dash ? { 'stroke-dasharray': dash } : {}) });
    pl.dataset.uid = String(u.uid); pl.append(sv('title', {}, mxShort({ ...u, name: (m[u.id] || {}).name })));
    svg.append(pl);
    const b = el('button', '', ''); b.type = 'button'; b.dataset.uid = String(u.uid); b.setAttribute('aria-pressed', String(mxHi === u.uid));
    const sw = sv('svg', { viewBox: '0 0 22 8' }); sw.append(sv('line', { x1: 1, x2: 21, y1: 4, y2: 4, stroke: col, 'stroke-width': 2, ...(dash ? { 'stroke-dasharray': dash } : {}) }));
    b.append(sw, `${(m[u.id] || {}).name || u.id} ${ROW_TH[u.row]}${u.lane + 1}`);
    b.addEventListener('click', () => { mxHi = mxHi === u.uid ? null : u.uid; paintHi(); });
    chips.append(b);
  }
  const stormMs = RULES.stormStartMs || 0;
  if (stormMs > 0 && stormMs < T) {
    const sx = X(stormMs);
    svg.append(sv('line', { x1: sx, x2: sx, y1: TOP, y2: Y(1, 0), stroke: 'var(--n-storm)', 'stroke-width': 1, 'stroke-dasharray': '5 3' }));
    svg.append(sv('text', { x: sx + 3, y: TOP - 5, class: 'ax', fill: 'var(--n-storm)' }, `พายุ ${(stormMs / 1000).toFixed(0)} วิ`));
  }
  for (const e of r.events) {
    if (e.k !== 'down') continue;
    const u = all.find(x => x.uid === (e.who ?? e.to)); if (!u) continue;
    const c = sv('circle', { class: 'pt', cx: X(e.t).toFixed(1), cy: Y(u.side, 0).toFixed(1), r: 2.6, fill: 'var(--hi)', stroke: 'var(--panel)', 'stroke-width': 1 });
    c.append(sv('title', {}, `${secT(e.t)} · ${(m[u.id] || {}).name || u.id} down`));
    svg.append(c);
  }
  for (const d of dots) {
    const u = all.find(x => x.uid === d.uid); if (!u || d.p == null) continue;
    const c = sv('circle', { class: 'pt', cx: X(d.t).toFixed(1), cy: Y(u.side, d.p).toFixed(1), r: 3.5, fill: MX_COLOR[mxWhy(d.why)], stroke: 'var(--panel)', 'stroke-width': 1 });
    c.dataset.uid = String(u.uid); c.append(sv('title', {}, `${secT(d.t)} · ${(m[u.id] || {}).name || u.id} โดน${MX_NAME[mxWhy(d.why)]} ${nf(d.amt)}`));
    svg.append(c);
  }
  const box = $('mxChart'); box.replaceChildren(svg, chips);
  function paintHi() {
    box.classList.toggle('hi', mxHi != null);
    box.querySelectorAll('[data-uid]').forEach(e => { const onn = +e.dataset.uid === mxHi; if (e.tagName === 'BUTTON') e.setAttribute('aria-pressed', String(onn)); else e.classList.toggle('on', onn); });
  }
  paintHi();
}
// ปุ่มเครื่องมือในส่วนวิเคราะห์แมตช์
$('mxLogQ').addEventListener('input', () => mxLogApply());
$('mxLogCopy').addEventListener('click', async () => {
  const txt = mxLogText(), msg = $('mxLogCount');
  try { await navigator.clipboard.writeText(txt); if (msg) msg.textContent = `คัดลอก ${txt.split('\n').length} บรรทัดแล้ว`; }
  catch (e) { if (msg) msg.textContent = 'คัดลอกไม่ได้ในหน้านี้ — เลือกข้อความเองได้'; }
});
// ย้ายตารางสรุปรายตัวมาเป็น "มุมมองตาราง" ของส่วนรายตัว (ไม่ซ้ำซ้อนกับ folded section อีก)
(() => { const fold = $('simSumFold'); if (fold) { const tbl = fold.querySelector('.tbl'); if (tbl) $('mxTableBox').append(tbl); fold.remove(); } })();
$('mxGoSim').addEventListener('click', () => showTab('sim'));
$('toMatch').addEventListener('click', () => { showTab('match'); $('editor').scrollIntoView({ block: 'start', behavior: 'smooth' }); });

