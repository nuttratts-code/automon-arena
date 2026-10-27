// ---------- ภาพการต่อสู้ของการจำลอง (BattleView จาก game/view.js) ----------
function simPlay(m, r) {
  ensureSimView(m);
  // สกิลทำงาน → ชื่อสกิลลอยเหนือตัวนั้น (ข้ามแบบติดตัว เพราะเกิดก่อนเริ่ม)
  simView.onProc = e => {
    if (e.when === 'passive') return;
    const v = simView.units.get(e.who); if (!v) return;
    const nm = ((DO_TH[e.what] || [e.what])[0]).replace(/[:(].*$/, '').trim();
    simView.float(v, '★ ' + (nm.length > 12 ? nm.slice(0, 11) + '…' : nm), 'n-skill');
  };
  $('simOver').hidden = true; $('simPlay').disabled = false; $('simPlay').textContent = 'หยุด';
  simView.speed = simSpeed; simView.load(r); simView.play();
  simShowingBattle = true; $('simArena').closest('.stage').classList.remove('setup'); markSimSel();
  renderSimTribes();
  const first = unitsOf(r).find(u => u.uid === simPick) || r.events[0].units[0];
  simPick = first ? first.uid : null; renderSimInfo();
}
// เผ่าที่เปิดของแต่ละฝั่ง (เหมือนแถบเผ่าในหน้าเกม) · ปิดโบนัสฝั่งไหนแสดงว่าปิด
function renderSimTribes(preview) {
  const cm = preview || !simLast ? makeCharMap(chars) : simLast.m;
  [['simTribesL', 0, 'simOffL'], ['simTribesR', 1, 'simOffR']].forEach(([id, side, off]) => {
    const entries = simEntries(side), counts = countTribes(entries, cm), steps = tribeSteps(counts, rulesNow());
    const items = Object.entries(counts).filter(([, n]) => n > 0).map(([t, n]) => {
      const sp = el('span', steps[t] && !$(off).checked ? 'on' : ''); sp.append(tribeBadge(t), `${t} ${n}${steps[t] ? ` · ขั้น ${steps[t]}` : ''}`); return sp;
    });
    if ($(off).checked) items.push(el('span', '', '(ปิดโบนัสเผ่า)'));
    $(id).replaceChildren(...items);
  });
}
// แผงรายละเอียดตัวที่แตะ (ชุด 30.1 แบบหน้าเกม): ปุ่มสลับ Lv1/2/3 · ค่าพลังครบทุกช่อง · สกิลทุกอัน ค่าครบ 3 เลเวล ขีดเส้นใต้เลเวลที่ดู
// ก่อนสู้/ม้านั่ง = ใช้ค่าที่แก้อยู่ · หลังจำลอง = ค่าตอนจำลอง + ผลแมตช์ + จำนวนครั้งที่สกิลทำงาน
let simPick = null, simInfoLv = { key: '', lv: 1 };
function simInfoTarget() {
  if (simShowingBattle && simLast && simPick != null) {
    const u = unitsOf(simLast.r).find(x => x.uid === simPick);
    if (u) return { id: u.id, level: u.level, m: simLast.m, where: `${u.side === 0 ? 'ซ้าย' : 'ขวา'} ${ROW_TH[u.row]}${u.lane + 1}`, u, cellKey: `${u.side}:${u.row}:${u.lane}` };
  }
  if (simSel && validKey(simSel)) {
    const x = slotGet(simSel); if (!x) return null;
    return { id: x.id, level: x.level, m: makeCharMap(chars), where: slotName(simSel), u: null, cellKey: null };
  }
  return null;
}
function renderSimInfo() {
  const box = $('simInfo');
  document.querySelectorAll('#simArena .cell.picked').forEach(x => x.classList.remove('picked'));
  const t = simInfoTarget(); if (!t) { box.replaceChildren(); return; }
  const c = t.m[t.id]; if (!c) { box.replaceChildren(); return; }
  if (t.cellKey) { const cellEl = document.querySelector(`#simArena [data-key="${t.cellKey}"]`); if (cellEl) cellEl.classList.add('picked'); }
  const key = `${t.where}:${t.id}:${t.level}:${t.u ? 'b' : 's'}`;
  if (simInfoLv.key !== key) simInfoLv = { key, lv: t.level };
  const vl = simInfoLv.lv, L = vl - 1;
  const body = el('div', 'body');
  body.append(el('h3', '', `${t.where} · ${c.id} ${c.name} · เลเวล ${t.level}`));
  const meta = el('span', 'hint', ''); meta.append(tribeBadge(c.tribe, c.extraTribes), `${c.tribe}${c.extraTribes.length ? ' + ' + c.extraTribes.join(', ') : ''} · `, rarityTag(c.rarity), ` · แถวแนะนำ ${rowHintTh(c.rowHint)}`);
  body.append(meta);
  const bar = el('div', 'lvtabs'); bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'ดูค่าพลังเลเวล');
  for (let v = 1; v <= 3; v++) {
    const b = el('button', '', `Lv${v}${v === t.level ? ' (ในทีม)' : ''}`); b.type = 'button'; b.dataset.lv = String(v); b.setAttribute('aria-pressed', String(v === vl));
    b.addEventListener('click', () => { simInfoLv.lv = v; renderSimInfo(); });
    bar.append(b);
  }
  body.append(bar);
  const stats = el('div', 'stats2');
  for (const [k, v] of [['HP', c.hp[L]], ['พลังโจมตี', c.atk[L]], ['คูลดาวน์', `${(c.cdMs[L] / 1000).toFixed(1)} วิ`], ['มัลติฮิต', c.multi[L]], ['ไฟ/ฮิต', c.burn[L]], ['ช็อต/ฮิต', c.shock[L]], ['เกราะ/ฮิต', c.armorHit[L]], ['ฟื้น/ฮิต', c.healHit[L]]]) { const d = el('span', '', `${k} `); d.append(el('b', '', String(v))); stats.append(d); }
  body.append(stats);
  const res = t.u ? simLast.r.units.find(x => x.uid === t.u.uid) : null;
  if (res) body.append(el('div', 'resrow', `ผลแมตช์ (Lv${t.level}): ทำดาเมจ ${nf(res.dealt)} · โดนดาเมจ ${res.taken} · ${res.down ? 'down' : `จบด้วย HP ${res.hp}`}`));
  const cnt = new Map();
  if (t.u) for (const e of simLast.r.events) if (e.k === 'proc' && e.who === t.u.uid) cnt.set(e.si, (cnt.get(e.si) || 0) + 1);
  if (!c.skills.length) body.append(el('span', 'hint', 'ไม่มีสกิล'));
  c.skills.forEach((sk, si) => {
    const shop = isShopWhen(sk.when), lvOff = sk.lv && !sk.lv.includes(vl);
    const line = el('div', 'skline' + (lvOff ? ' off' : ''));
    line.append(skillTags(sk), skillLineEl(sk, lvOff ? 0 : vl));
    if (t.u) { const n = cnt.get(si) || 0, inLv = !sk.lv || sk.lv.includes(t.level); line.append(el('span', 'cnt' + (!shop && inLv && !n ? ' zero' : ''), shop ? 'หลังสู้/ร้านค้า' : !inLv ? `ไม่ใช้ที่ Lv${t.level}` : `ทำงาน ${n} ครั้ง`)); }
    else if (shop) line.append(el('span', 'cnt', 'หลังสู้/ร้านค้า'));
    body.append(line);
  });
  box.replaceChildren(unitShape(c, vl), body);
}

