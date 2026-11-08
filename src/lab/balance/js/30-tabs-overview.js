// ---------- แท็บ ----------
// ---------- ภาพรวม: ตัวละ 1 แถว จัดกลุ่มตามเผ่า (ใช้ค่าที่แก้อยู่) ----------
let listFilter = 'ทั้งหมด', listEdit = false;
try { listEdit = localStorage.getItem('automon-balance-listedit') === '1'; } catch (e) {}
$('listEditBtn').addEventListener('click', () => { listEdit = !listEdit; try { localStorage.setItem('automon-balance-listedit', listEdit ? '1' : ''); } catch (e) {} renderList(); });
// โหมดแก้ในรายการ: แก้ค่าแล้วอัปเดตเฉพาะแถวนั้น (ไม่วาดตารางใหม่ ช่องถัดไปที่กำลังจะพิมพ์ไม่หาย)
function listEdited(c, mark, pts) {
  const b = BASE_CHARS.find(x => x.id === c.id);
  mark.hidden = same(c, b);
  paintPts(c, pts);
  if (c.id === current) renderCharForm(); // ฟอร์มขั้น 2 ของตัวนี้ตามค่าล่าสุด
  refreshDirty();
}
function paintPts(c, ptTd) {
  const bp = basePower(c).points, bud = RULES.power.budget[c.rarity];
  const pts = el('div', 'lv3'); pts.append(el('span', bp > bud ? 'over' : '', bp.toFixed(0)), el('span', 'was', `/ ${bud}`)); ptTd.replaceChildren(pts);
  ptTd.title = bp > bud ? 'แต้มพื้นฐานเกินงบทั้งที่ยังไม่นับสกิล' : 'ยังเหลืองบให้สกิล ' + (bud - bp).toFixed(0) + ' แต้ม';
}
// แถวโหมดแก้: ชื่อ ความหายาก แถว ค่าพลัง 3 เลเวล · ตรวจค่าเหมือนฟอร์มขั้น 2 (ตัวเลข ≥ 0 · ชื่อตัดอักขระต้องห้าม · ตัวเลือกต้องอยู่ในรายการ)
function listEditRow(c, b, lvTd, ptTd, sk, open) {
  const tr = document.createElement('tr');
  const mark = cell(' ●', 'edited'); mark.hidden = same(c, b);
  const done = () => listEdited(c, mark, ptTd);
  const nameTd = td(''), nmRow = el('div', 'row'); nmRow.style.gap = '4px'; nmRow.style.flexWrap = 'nowrap';
  const nm = document.createElement('input'); nm.type = 'text'; nm.maxLength = NAME_MAX; nm.value = c.name; nm.title = `ค่าตั้งต้น ${b.name}`; nm.setAttribute('aria-label', `ชื่อ ${c.id}`);
  nm.classList.toggle('changed', c.name !== b.name);
  nm.addEventListener('change', () => { const n = cleanName(nm.value); if (!n) { nm.value = c.name; return; } c.name = nm.value = n; nm.classList.toggle('changed', n !== b.name); if (c.id === current) pickA.set(current); done(); });
  nmRow.append(charBadge(c.id), cell(c.id), mark); nameTd.append(nmRow, nm);
  if (c.extraTribes.length) nameTd.append(cell(`+${c.extraTribes.join(', ')}`, 'was'));
  const rs = selectInput(`l-${c.id}-rarity`, RARITIES.map(r => [r, r]), c.rarity, v => { if (!RARITIES.includes(v)) return; c.rarity = v; c.price = RULES.shop.prices[v]; rs.classList.toggle('changed', v !== b.rarity); done(); });
  rs.classList.toggle('changed', c.rarity !== b.rarity); rs.title = `ค่าตั้งต้น ${b.rarity} · ราคาเปลี่ยนตามความหายาก`;
  const rh = selectInput(`l-${c.id}-row`, ROW_HINTS.map(h => [h, rowHintTh(h)]), c.rowHint, v => { if (!ROW_HINTS.includes(v)) return; c.rowHint = v; rh.classList.toggle('changed', v !== b.rowHint); done(); });
  rh.classList.toggle('changed', c.rowHint !== b.rowHint); rh.title = `ค่าตั้งต้น ${rowHintTh(b.rowHint)}`;
  const lvIn = (k, scale) => {
    const d = el('div', 'lv3');
    for (let L = 0; L < 3; L++) d.append(scale
      ? numInput(`l-${c.id}-${k}-${L}`, c[k][L] / scale, b[k][L] / scale, v => { c[k][L] = Math.round(v * scale); done(); }, 0.1)
      : numInput(`l-${c.id}-${k}-${L}`, c[k][L], b[k][L], v => { c[k][L] = v; done(); }));
    const t = td(''); t.className = 'n'; t.append(d); return t;
  };
  const oth = el('div', 'oth');
  oth.append(cell(''), cell('Lv1'), cell('Lv2'), cell('Lv3'));
  for (const [k, label, full] of OTHER_FIELDS) {
    const lb = cell(label); lb.title = `${full} (ต่อฮิต)`; oth.append(lb);
    for (let L = 0; L < 3; L++) oth.append(numInput(`l-${c.id}-${k}-${L}`, c[k][L], b[k][L], v => { c[k][L] = v; done(); }));
  }
  const skb = el('button', 'lskbtn', 'แก้สกิล ›'); skb.type = 'button'; skb.addEventListener('click', open); sk.append(skb);
  tr.append(nameTd, td(rs), td(rh), lvTd, lvIn('hp'), lvIn('atk'), lvIn('cdMs', 1000), td(oth), ptTd, sk);
  return tr;
}
const OTHER_FIELDS = [['multi', 'มัลติ', 'มัลติฮิต'], ['burn', 'ไฟ', 'ไฟ/ฮิต'], ['shock', 'ช็อต', 'ช็อต/ฮิต'], ['armorHit', 'เกราะ', 'เกราะ/ฮิต'], ['healHit', 'ฟื้น', 'ฟื้น/ฮิต']]; // [ช่อง, ชื่อสั้นในตาราง, ชื่อเต็ม]
function renderList() {
  $('listEditBtn').setAttribute('aria-pressed', String(listEdit));
  $('listEditNote').textContent = listEdit ? 'แก้ในตารางได้เลย · สกิลกด "แก้สกิล ›" · ค่าเหลือง = ต่างจากค่าในเกม' : '';
  document.querySelector('table.list').classList.toggle('editing', listEdit);
  $('listFilter').replaceChildren(...['ทั้งหมด', ...TRIBES].map(t => {
    const b = el('button', '', ''); b.type = 'button'; b.setAttribute('aria-pressed', String(t === listFilter));
    if (t !== 'ทั้งหมด') b.append(tribeBadge(t)); b.append(t);
    b.addEventListener('click', () => { listFilter = t; renderList(); });
    return b;
  }));
  const rIdx = r => RARITIES.indexOf(r);
  const groups = listFilter === 'ทั้งหมด' ? TRIBES : [listFilter];
  const rows = [];
  for (const t of groups) {
    const members = chars.filter(c => listFilter === 'ทั้งหมด' ? c.tribe === t : (c.tribe === t || c.extraTribes.includes(t)))
      .sort((a, b) => (a.tribe !== t) - (b.tribe !== t) || rIdx(a.rarity) - rIdx(b.rarity) || a.id.localeCompare(b.id)); // เผ่าหลักก่อน แล้วตัวเชื่อมเผ่า
    const h = document.createElement('tr'); h.className = 'grp';
    const th = document.createElement('th'); th.colSpan = 10; th.append(tribeBadge(t), `${t} · ${members.length} ตัว`); h.append(th); rows.push(h);
    for (const c of members) {
      const b = BASE_CHARS.find(x => x.id === c.id), edited = !same(c, b);
      const tr = document.createElement('tr'); tr.className = 'click'; tr.tabIndex = 0;
      const nameTd = td(''); nameTd.append(charBadge(c.id), `${c.id} ${c.name}`);
      if (c.extraTribes.length) nameTd.append(cell(` +${c.extraTribes.join(', ')}`, 'was'));
      if (edited) nameTd.append(cell(' ●', 'edited'));
      const rarTd = td(''); rarTd.append(rarityTag(c.rarity));
      // ค่าพลังครบ 3 เลเวล: เซลล์ละ 3 บรรทัด (Lv1/Lv2/Lv3) · ค่าที่ต่างจากค่าตั้งต้นเป็นสีเหลือง
      const lv3 = (k, fmt = String) => { const d = el('div', 'lv3'); for (let L = 0; L < 3; L++) d.append(el('span', c[k][L] !== b[k][L] ? 'chg' : '', fmt(c[k][L]))); const t = td(''); t.className = 'n'; t.append(d); return t; };
      const otherL = L => [c.multi[L] > 1 ? `×${c.multi[L]} ฮิต` : '', c.burn[L] ? `ไฟ ${c.burn[L]}` : '', c.shock[L] ? `ช็อต ${c.shock[L]}` : '', c.armorHit[L] ? `เกราะ ${c.armorHit[L]}` : '', c.healHit[L] ? `ฟื้น ${c.healHit[L]}` : ''].filter(Boolean).join(' · ');
      const otherTd = td('');
      if ([0, 1, 2].every(L => !otherL(L))) otherTd.append(cell('–', 'was'));
      else { const d = el('div', 'lv3 left'); for (let L = 0; L < 3; L++) d.append(el('span', '', otherL(L) || '–')); otherTd.append(d); }
      const lvTd = td(''); lvTd.className = 'n'; const lvs = el('div', 'lv3 lvlab'); for (const x of ['1', '2', '3']) lvs.append(el('span', '', x)); lvTd.append(lvs);
      const sk = td(''); sk.className = 'skcell';
      if (!c.skills.length) sk.append(cell('ไม่มีสกิล', 'was'));
      for (const g of skillGroups(c.skills)) { const line = el('div', 'skline'); line.append(skillTags(g[0]), skillGroupLine(g)); sk.append(line); } // ชุด 142: เมื่อเดียวกันรวมบรรทัด
      const bp = basePower(c).points, bud = RULES.power.budget[c.rarity];
      const ptTd = td(''); ptTd.className = 'n'; const pts = el('div', 'lv3'); pts.append(el('span', bp > bud ? 'over' : '', bp.toFixed(0)), el('span', 'was', `/ ${bud}`)); ptTd.append(pts);
      ptTd.title = bp > bud ? 'แต้มพื้นฐานเกินงบทั้งที่ยังไม่นับสกิล' : 'ยังเหลืองบให้สกิล ' + (bud - bp).toFixed(0) + ' แต้ม';
      const open = () => { showTab('chars'); setCurrent(c.id); $('editor').scrollIntoView({ block: 'start', behavior: 'smooth' }); };
      if (listEdit) { rows.push(listEditRow(c, b, lvTd, ptTd, sk, open)); continue; }
      tr.append(nameTd, rarTd, td(rowHintTh(c.rowHint)), lvTd, lv3('hp'), lv3('atk'), lv3('cdMs', x => `${(x / 1000).toFixed(1)} วิ`), otherTd, ptTd, sk);
      tr.addEventListener('click', open); tr.addEventListener('keydown', e => { if (e.key === 'Enter') open(); });
      rows.push(tr);
    }
  }
  $('listBody').replaceChildren(...rows);
}
