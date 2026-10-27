// ---------- ชุด 29: 4 ขั้น เลือกตัว → แก้ → ดูผล → บันทึก ----------
const STEP_OF = { grid: 'pick', list: 'pick', chars: 'edit', tribes: 'edit', sim: 'edit', match: 'edit', analysis: 'result' }; // ชุด 36: แท็บวิเคราะห์แมตช์ // ชุด 30: บันทึกย้ายมาท้ายขั้นแก้ (3 ขั้น)
var curTab = 'grid', lastPick = 'grid', lastEdit = 'chars', tribeSel = TRIBES[0]; // var: ฟอร์มเผ่าอ่านได้ตั้งแต่เริ่มหน้า
function showTab(which) {
  if (which === 'save') which = 'chars'; // ค่าเก่าที่จำไว้ (ก่อนชุด 30)
  if (!STEP_OF[which]) which = 'grid';
  const step = STEP_OF[which], stepChanged = STEP_OF[curTab] !== step;
  curTab = which;
  if (step === 'pick') lastPick = which;
  if (step === 'edit') lastEdit = which;
  for (const st of ['pick', 'edit', 'result']) $('step-' + st).setAttribute('aria-current', st === step ? 'step' : 'false');
  $('view-pick').hidden = step !== 'pick'; $('editor').hidden = step !== 'edit';
  $('view-result').hidden = step !== 'result';
  $('tab-grid').setAttribute('aria-pressed', String(which === 'grid')); $('tab-list').setAttribute('aria-pressed', String(which === 'list'));
  $('tgrid').hidden = which !== 'grid'; $('gridHint').hidden = which !== 'grid';
  $('tab-chars').setAttribute('aria-selected', String(which === 'chars'));
  $('tab-tribes').setAttribute('aria-selected', String(which === 'tribes')); $('tab-tribes').hidden = which !== 'tribes';
  $('tab-sim').setAttribute('aria-selected', String(which === 'sim'));
  $('tab-match').setAttribute('aria-selected', String(which === 'match'));
  // โหมดทำไปลองไป: แก้ตัวละคร/ลองสู้ แสดงทั้งสองส่วนพร้อมกัน (จอกว้างอยู่ข้างกัน จอแคบอยู่ต่อกัน)
  const both = comboOn && (which === 'chars' || which === 'sim');
  $('editor').classList.toggle('combo', both);
  document.querySelector('.wrap').classList.toggle('wide', both);
  $('pane-chars').hidden = !(which === 'chars' || both);
  $('pane-tribes').hidden = which !== 'tribes';
  $('pane-list').hidden = which !== 'list';
  $('pane-sim').hidden = !(which === 'sim' || both);
  $('pane-analysis').hidden = which !== 'analysis';
  $('pane-match').hidden = which !== 'match'; if (which === 'match') renderMatch();
  $('saveBox').hidden = $('pane-chars').hidden && $('pane-tribes').hidden; // ส่วนบันทึกอยู่ใต้ส่วนแก้ตัวละคร/โบนัสเผ่า
  if (which === 'grid') renderGrid();
  if (which === 'list') renderList();
  if (which === 'tribes') renderTribePick();
  if (!$('pane-sim').hidden) { renderSimTeams(); if (typeof renderDock === 'function') renderDock(); }
  else if (simView && simView.playing) { simView.pause(); $('simPlay').textContent = 'เล่น'; }
  if (stepChanged) window.scrollTo({ top: 0 });
  try { localStorage.setItem('automon-balance-tab', which); } catch (e) {}
}
$('step-pick').addEventListener('click', () => showTab(lastPick));
$('step-edit').addEventListener('click', () => showTab(lastEdit));
$('step-result').addEventListener('click', () => showTab('analysis'));
$('tab-grid').addEventListener('click', () => showTab('grid'));
$('tab-list').addEventListener('click', () => showTab('list'));
$('tab-chars').addEventListener('click', () => showTab('chars'));
$('tab-tribes').addEventListener('click', () => showTab('tribes'));
$('tab-sim').addEventListener('click', () => showTab('sim'));
$('tab-match').addEventListener('click', () => showTab('match'));
function editedIds(d) { return Object.keys(d.chars).filter(id => Object.keys(d.chars[id]).length); }
// ตารางเผ่า × ความหายาก: ตัวอยู่ในแถวเผ่าหลัก · แตะตัว = แก้ · แตะชื่อเผ่า = แก้โบนัสเผ่านั้น
function renderGrid() {
  const edited = new Set(editedIds(diffs()));
  const out = [el('div', 'tg-corner', '')];
  for (const r of RARITIES) { const h = el('div', 'tg-rh', ''); h.append(rarityTag(r), el('small', '', `ราคา ${RULES.shop.prices[r]}`)); out.push(h); }
  for (const t of TRIBES) {
    const row = el('div', 'tg-row');
    const members = chars.filter(c => c.tribe === t), extra = chars.filter(c => c.extraTribes.includes(t)).length;
    const th = el('button', 'tg-tribe', ''); th.type = 'button'; th.title = `แก้โบนัสเผ่า${t}`;
    th.append(tribeBadge(t), el('span', '', t), el('small', '', `${members.length} ตัว${extra ? ` +${extra} เผ่าเพิ่ม` : ''} · โบนัสเผ่า ›`));
    th.addEventListener('click', () => { tribeSel = t; showTab('tribes'); });
    row.append(th);
    for (const r of RARITIES) {
      const box = el('div', 'tg-cell'); const rl = rarityTag(r); rl.classList.add('tg-rl'); box.append(rl);
      const list = members.filter(c => c.rarity === r).sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
      if (!list.length) box.append(el('span', 'tg-empty', '–'));
      for (const c of list) {
        const b = el('button', 'tg-chip', ''); b.type = 'button'; b.dataset.id = c.id;
        if (c.extraTribes.length) b.append(tribeBadge(c.tribe, c.extraTribes));
        b.append(el('b', '', c.id), el('span', 'tg-name', c.name));
        b.classList.toggle('edited', edited.has(c.id));
        if (c.id === current) b.setAttribute('aria-current', 'true');
        b.title = `${c.id} ${c.name} · ${describe(c)}${edited.has(c.id) ? ' · แก้แล้ว' : ''}`;
        b.addEventListener('click', () => { setCurrent(c.id); showTab('chars'); });
        box.append(b);
      }
      row.append(box);
    }
    out.push(row);
  }
  $('tgrid').replaceChildren(...out);
}
function renderTribePick() {
  if (!TRIBES.includes(tribeSel)) tribeSel = TRIBES[0];
  $('tribePick').replaceChildren(...TRIBES.map(t => {
    const b = el('button', '', ''); b.type = 'button'; b.setAttribute('aria-pressed', String(t === tribeSel));
    b.append(tribeBadge(t), t); b.addEventListener('click', () => { tribeSel = t; renderTribePick(); });
    return b;
  }));
  for (const g of $('tform').children) g.hidden = g.dataset.tribe !== tribeSel;
  $('tab-tribes').textContent = `โบนัสเผ่า${tribeSel}`;
}
// ป้ายบนแถบขั้น (ขั้น 2 = ID ตัวที่แก้ · ปุ่มบันทึก = จำนวนจุดที่แก้) + รายการที่แก้ท้ายขั้นแก้ (แตะ = เปิดแก้)
function refreshSteps(d, ok) {
  const n = countEdits(d);
  $('sbEdit').textContent = current || '';
  $('sbSave').hidden = !n && ok; $('sbSave').textContent = ok ? String(n) : '!'; $('sbSave').classList.toggle('err', !ok);
  $('sbSave').title = ok ? `แก้แล้ว ${n} จุด` : 'มีค่าผิด ดูรายการสีแดง';
  const items = editedIds(d).map(id => { const b = el('button', '', ''); b.type = 'button'; b.append(charBadge(id), id); b.addEventListener('click', () => { setCurrent(id); showTab('chars'); }); return b; });
  for (const t of Object.keys(d.tribes)) { const b = el('button', 'tribe', ''); b.type = 'button'; b.append(tribeBadge(t), `โบนัสเผ่า${t}`); b.addEventListener('click', () => { tribeSel = t; showTab('tribes'); }); items.push(b); }
  $('saveList').replaceChildren(...items);
}

