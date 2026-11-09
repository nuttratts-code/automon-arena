// ---------- จัดทีมจำลอง: บอร์ดแบบสนาม แตะช่องเพื่อเลือก ลากเพื่อย้าย/สลับ (ข้ามฝั่งได้) ----------
let simSel = null; // ช่องที่เลือก { side, row, lane }
// ลำดับคอลัมน์แบบสนาม: ซ้าย หลัง กลาง หน้า | ขวา หน้า กลาง หลัง
const SIM_COLS = side => (side === 0 ? [2, 1, 0] : [0, 1, 2]);
function simUnitChip(id, level) {
  const c = charOf(id);
  const box = el('div', 'tunit');
  const sh = unitShape(c, level, 'tshape'); // ชุด 25: รูปรายตัวชุดเดียวกับหน้าเกม
  box.append(sh, el('div', 'tname', c.name));
  return box;
}
function renderSimTeams() {
  renderLvAll();
  simDefault();
  // สนามเดียวใช้ทั้งจัดทีมและดูการต่อสู้: ทีมเปลี่ยนจากที่จำลองล่าสุด → แสดงทีมใหม่ (โหมดจัดทีม)
  const key = JSON.stringify(simTeam);
  if (!simLast || simLast.teamKey !== key || !simShowingBattle) renderSimPreview();
  renderSimBench();
  markSimSel();
  renderSimSlotBar();
}
let simShowingBattle = false;
function renderSimBench() {
  const host = $('simBench'); host.replaceChildren();
  simBench.forEach((x, i) => {
    const b = el('div', 'bcell'); b.dataset.key = `2:0:${i}`; b.setAttribute('role', 'button'); b.tabIndex = 0;
    b.setAttribute('aria-label', `ม้านั่งช่อง ${i + 1}${x ? ' ' + charOf(x.id).name + ' เลเวล ' + x.level : ' ว่าง'}`);
    b.append(x ? simUnitChip(x.id, x.level) : el('span', 'tplus', '+'));
    host.append(b);
  });
}
function ensureSimView(m) {
  if (!simView) simView = new BattleView($('simArena'), m, {
    onTime: ms => { $('simClock').textContent = `${(ms / 1000).toFixed(1)} วิ`; },
    onEnd: w => { $('simOver').hidden = false; $('simOverTitle').textContent = w === 0 ? 'ทีมซ้ายชนะ' : w === 1 ? 'ทีมขวาชนะ' : 'เสมอ'; $('simPlay').textContent = 'เล่น'; $('simPlay').disabled = true; },
  });
  simView.charMap = m;
}
// โหมดจัดทีม: วาดสนามจากทีมที่จัด (HP เต็ม ไม่มีเกราะ) · ช่องว่างมี + ให้แตะใส่ตัว
function renderSimPreview() {
  const m = makeCharMap(chars); ensureSimView(m);
  if (simView.playing) simView.pause();
  const units = []; let uid = 0;
  for (const side of simFoeBoss ? [0] : [0, 1]) for (let row = 0; row < 3; row++) for (let lane = 0; lane < 2; lane++) {
    const x = simTeam[side][row][lane]; const c = x && m[x.id]; if (!c) continue;
    const hp = c.hp[x.level - 1]; units.push({ uid: uid++, side, row, lane, id: c.id, name: c.name, level: x.level, hp, maxHp: hp, armor: 0 });
  }
  // set 68: โหมดบอส = ฝั่งขวาวาดบอสตัวที่เลือก (ทุกช่องที่ยืน) แทนทีมขวาที่เก็บไว้
  const bs = simFoeBoss ? simBossOf() : null;
  if (bs) { const bu = bossUnit(bs, simBossK, 0, stageCfg.boss2), bc = simBossChar(); m[bs.id] = bc; simView.charMap = m;
    units.push({ uid: uid++, side: 1, row: bu.row, lane: bu.lane, id: bs.id, name: bc.name, level: 1, hp: bu.hp, maxHp: bu.maxHp, armor: bu.startArmor || 0, cells: bu.move ? [bu.slots[0]] : bu.slots.slice() }); }
  simView.onProc = null;
  simView.load({ events: [{ t: 0, k: 'start', units, tribes: [{}, {}] }], timeMs: 0, winner: null, units: [] });
  for (const cellEl of $('simArena').querySelectorAll('.cell')) if (!cellEl.querySelector('.unit, .boss-tag') && !(simFoeBoss && cellEl.dataset.key && cellEl.dataset.key[0] === '1')) cellEl.append(el('span', 'tplus', '+'));
  simShowingBattle = false;
  $('simArena').closest('.stage').classList.add('setup');
  $('simOver').hidden = true; $('simPlay').disabled = true; $('simPlay').textContent = 'เล่น'; $('simClock').textContent = '0.0 วิ';
  simPick = null; renderSimInfo(); // ชุด 30.1: ช่องที่เลือกอยู่ยังแสดงรายละเอียด
  renderSimTribes(true);
}
function markSimSel() {
  document.querySelectorAll('#simArena .cell.sel, #simBench .bcell.sel').forEach(x => x.classList.remove('sel'));
  if (simSel) { const c = document.querySelector(`#simArena [data-key="${simSel.side}:${simSel.row}:${simSel.lane}"], #simBench [data-key="${simSel.side}:${simSel.row}:${simSel.lane}"]`); if (c) c.classList.add('sel'); }
}
// แถบแก้ช่องที่เลือก: เลือกตัวละคร · เลเวล · เอาออก · เปิดแก้ค่า
let slotPick = null;
function renderSimSlotBar() {
  const bar = $('simSlot'); bar.replaceChildren();
  if (!simSel) { bar.append(el('span', 'hint', 'แตะช่องในสนามเพื่อเปลี่ยนตัว / เลเวล / เอาออก')); return; }
  const k = simSel, x = slotGet(k);
  bar.append(el('b', '', slotName(k)));
  const ph = el('div', 'cp'); bar.append(ph);
  slotPick = charPicker(ph, x ? x.id : '', id => {
    slotSet(k, id ? { id, level: x ? x.level : 1 } : null); slotEdited(k);
    if (id && current !== id) setCurrent(id);
  }, { none: '— ว่าง —', title: `เลือกตัวละคร · ${slotName(k)}` });
  if (x) {
    const lv = el('div', 'seg'); lv.setAttribute('role', 'group'); lv.setAttribute('aria-label', 'เลเวล');
    for (const L of [1, 2, 3]) {
      const b = el('button', '', `Lv${L}`); b.type = 'button'; b.setAttribute('aria-pressed', String(x.level === L));
      b.addEventListener('click', () => { x.level = L; slotEdited(k); });
      lv.append(b);
    }
    const rm = el('button', 'danger', 'เอาออก'); rm.type = 'button';
    rm.addEventListener('click', () => { slotSet(k, null); slotEdited(k); });
    const ed = el('button', '', 'แก้ค่าตัวนี้'); ed.type = 'button';
    ed.addEventListener('click', () => { setCurrent(x.id); if (!comboOn) showTab('chars'); $('editor').scrollIntoView({ block: 'start', behavior: 'smooth' }); });
    bar.append(lv, rm, ed);
  }
}
// ชุด 13 (ผู้ใช้ขอ): ตั้ง/เพิ่ม/ลดเลเวลทุกตัวในสนามทีเดียว (ม้านั่งไม่นับ) · เลือกทีมได้
function simLvTargets() { const v = $('simLvSide').value, sides = v === 'both' ? [0, 1] : [Number(v)]; return sides.flatMap(sd => simTeam[sd].flat().filter(Boolean)); }
function renderLvAll() {
  const us = simLvTargets(), same = us.length && us.every(u => u.level === us[0].level) ? us[0].level : 0;
  document.querySelectorAll('#simLvAll [data-lvall]').forEach(b => {
    const k = b.dataset.lvall; b.disabled = !us.length;
    if (k === 'up') b.disabled ||= us.every(u => u.level >= 3); else if (k === 'down') b.disabled ||= us.every(u => u.level <= 1);
    else b.setAttribute('aria-pressed', String(same === Number(k)));
  });
}
document.querySelectorAll('#simLvAll [data-lvall]').forEach(b => b.addEventListener('click', () => {
  const k = b.dataset.lvall, us = simLvTargets(); if (!us.length) return;
  for (const u of us) u.level = k === 'up' ? Math.min(3, u.level + 1) : k === 'down' ? Math.max(1, u.level - 1) : Number(k);
  saveSim(); renderSimTeams(); simChanged();
}));
$('simLvSide').addEventListener('change', renderLvAll);
// ทีมเปลี่ยน → ถ้าเคยจำลองแล้ว จำลองใหม่ให้เลย (ไม่ต้องกดซ้ำ)
function simChanged() { if (!simLast) return; if (!$('simAuto').checked) { markSimStale(); return; } clearTimeout(simTimer); simTimer = setTimeout(() => runSim(true), 250); }
// ปิดจำลองอัตโนมัติ (ค่าเริ่มต้น): แก้ค่า/ทีมแล้วไม่สู้เอง แค่เตือนให้กด "จำลอง" ใหม่
function markSimStale() { const b = $('simRun'); if (b.classList.contains('stale')) return; b.classList.add('stale'); $('simSum').classList.add('stale'); b.textContent = 'จำลองใหม่ ●'; $('simMsg').textContent = 'มีการแก้ค่าหรือทีม · ผลด้านล่างยังเป็นของเดิม กด "จำลองใหม่" เมื่อพร้อม'; if (!$('pane-match').hidden) renderMatch(); }
function clearSimStale() { const b = $('simRun'); b.classList.remove('stale'); b.textContent = 'จำลอง'; }
try { $('simAuto').checked = localStorage.getItem('automon-balance-simauto') === '1'; } catch (e) {}
$('simAuto').addEventListener('change', () => { try { localStorage.setItem('automon-balance-simauto', $('simAuto').checked ? '1' : ''); } catch (e) {} if ($('simAuto').checked && $('simRun').classList.contains('stale')) runSim(true); });
function simSwap(a, b) {
  if (a.side === b.side && a.row === b.row && a.lane === b.lane) return false;
  const t = slotGet(a); slotSet(a, slotGet(b)); slotSet(b, t);
  saveSim(); return true;
}
const keyOf = s => { const [side, row, lane] = s.split(':').map(Number); return { side, row, lane }; };
// ลากด้วยนิ้วหรือเมาส์ (pointer events)
// - เมาส์: ขยับเกิน 6px = ลาก ไม่ถึง = แตะ
// - นิ้ว: ปัดขึ้นลง = เลื่อนหน้าตามปกติ · กดค้าง 0.35 วิ (ไม่ขยับ) แล้วค่อยลาก = ย้าย/สลับช่อง · แตะสั้น = เลือก
function makeDraggable(root, selector, keyAttr, canDrag, onTap, onDrop) {
  let st = null;
  const reset = () => { if (!st) return; clearTimeout(st.timer); st.c.classList.remove('lifted'); st = null; };
  root.addEventListener('pointerdown', e => {
    const c = e.target.closest(selector); if (!c || !root.contains(c) || e.button > 0) return;
    reset();
    st = { c, x: e.clientX, y: e.clientY, id: e.pointerId, ghost: null, over: null, touch: e.pointerType !== 'mouse', armed: e.pointerType === 'mouse', timer: 0 };
    if (st.touch && canDrag(c)) { const s0 = st; s0.timer = setTimeout(() => { if (st === s0) { s0.armed = true; c.classList.add('lifted'); if (navigator.vibrate) try { navigator.vibrate(15); } catch (_) {} } }, 350); }
  });
  // หลังกดค้างแล้ว กันหน้าเลื่อนระหว่างลาก (ต้องเป็น non-passive จึงหยุดการเลื่อนได้)
  root.addEventListener('touchmove', e => { if (st && st.armed && st.touch) e.preventDefault(); }, { passive: false });
  root.addEventListener('contextmenu', e => { if (st && st.touch) e.preventDefault(); });
  root.addEventListener('pointermove', e => {
    if (!st || e.pointerId !== st.id) return;
    const moved = Math.hypot(e.clientX - st.x, e.clientY - st.y);
    if (!st.ghost) {
      if (!st.armed) { if (moved > 8) reset(); return; } // นิ้วปัดก่อนครบเวลา = ผู้ใช้กำลังเลื่อนหน้า
      if (moved < 6 || !canDrag(st.c)) return;
      st.ghost = st.c.cloneNode(true); st.ghost.classList.add('dragghost'); st.ghost.classList.remove('lifted'); st.ghost.removeAttribute('id');
      st.ghost.style.width = st.c.offsetWidth + 'px'; document.body.append(st.ghost);
      st.c.classList.add('dragging'); try { st.c.setPointerCapture(e.pointerId); } catch (_) {}
    }
    e.preventDefault();
    st.ghost.style.left = e.clientX + 'px'; st.ghost.style.top = e.clientY + 'px';
    if (e.clientY < 70) scrollBy(0, -14); else if (e.clientY > innerHeight - 50) scrollBy(0, 14); // ลากใกล้ขอบจอ = เลื่อนหน้า
    const under = document.elementFromPoint(e.clientX, e.clientY), t = under && under.closest(selector);
    if (st.over && st.over !== t) st.over.classList.remove('dropok');
    st.over = t && t !== st.c && root.contains(t) ? t : null; if (st.over) st.over.classList.add('dropok');
  });
  const end = e => {
    if (!st || e.pointerId !== st.id) return;
    const s = st; reset();
    if (s.ghost) { s.ghost.remove(); s.c.classList.remove('dragging'); if (s.over) { s.over.classList.remove('dropok'); onDrop(keyOf(s.c.dataset[keyAttr]), keyOf(s.over.dataset[keyAttr])); } }
    else if (e.type === 'pointerup') onTap(keyOf(s.c.dataset[keyAttr]));
  };
  root.addEventListener('pointerup', end); root.addEventListener('pointercancel', end);
}
// ลากตัวละครจากที่อื่น (แถบชื่อตัวที่แก้ · แผงค้นหาในหน้าลองสู้) ไปวางในช่องสนาม/ม้านั่ง · เมาส์ลากได้เลย มือถือกดค้าง 0.35 วิ
// itemSel = ส่วนที่ลากได้ภายใน src (null = ทั้ง src) · idOf(ส่วนนั้น) = ID ตัวละคร · allowed() = ตอนนี้ลากได้ไหม
// หลังลากเสร็จ กันคลิกที่ตามมา (ปุ่มในแผงค้นหาแตะ = ใส่ลงสนาม ไม่ให้ใส่ซ้ำ)
function dragToSlot(src, itemSel, idOf, allowed) {
  const TGT = '#simArena .cell, #simBench .bcell';
  let st = null;
  const keyIn = c => { const k = keyOf(c.dataset.slot || c.dataset.key || ''); return validKey(k) && !simBossSide(k) ? k : null; };
  const reset = () => { if (!st) return; clearTimeout(st.timer); document.body.classList.remove('nosel'); st.c.classList.remove('lifted'); if (st.over) st.over.classList.remove('dropok'); if (st.ghost) st.ghost.remove(); st = null; };
  src.addEventListener('pointerdown', e => {
    const c = itemSel ? e.target.closest(itemSel) : src;
    if (!c || !src.contains(c) || e.button > 0 || !allowed()) return;
    const id = idOf(c); if (!chars.some(x => x.id === id)) return;
    reset();
    st = { c, cid: id, x: e.clientX, y: e.clientY, id: e.pointerId, touch: e.pointerType !== 'mouse', armed: e.pointerType === 'mouse', ghost: null, over: null, timer: 0 };
    if (st.touch) { const s0 = st; s0.timer = setTimeout(() => { if (st === s0) { s0.armed = true; c.classList.add('lifted'); if (navigator.vibrate) try { navigator.vibrate(15); } catch (_) {} } }, 350); }
  });
  src.addEventListener('touchmove', e => { if (st && st.armed && st.touch) e.preventDefault(); }, { passive: false });
  src.addEventListener('contextmenu', e => { if (st && st.touch) e.preventDefault(); });
  src.addEventListener('pointermove', e => {
    if (!st || e.pointerId !== st.id) return;
    const moved = Math.hypot(e.clientX - st.x, e.clientY - st.y);
    if (!st.ghost) {
      if (!st.armed) { if (moved > 8) reset(); return; } // นิ้วปัด/เลื่อนรายชื่อก่อนครบเวลา = เลื่อนตามปกติ
      if (moved < 6) return;
      st.ghost = el('div', 'dragghost'); st.ghost.style.padding = '6px 10px';
      st.ghost.append(charBadge(st.cid), ' ', `${st.cid} ${charOf(st.cid).name}`); document.body.append(st.ghost);
      document.body.classList.add('nosel'); try { getSelection().removeAllRanges(); } catch (_) {} // เมาส์ลากแล้วไม่คลุมข้อความทั้งหน้า
      try { st.c.setPointerCapture(e.pointerId); } catch (_) {}
    }
    e.preventDefault();
    st.ghost.style.left = e.clientX + 'px'; st.ghost.style.top = e.clientY + 'px';
    if (e.clientY < 70) scrollBy(0, -14); else if (e.clientY > innerHeight - 50) scrollBy(0, 14);
    const under = document.elementFromPoint(e.clientX, e.clientY), t = under && under.closest(TGT);
    if (st.over && st.over !== t) st.over.classList.remove('dropok');
    st.over = t && keyIn(t) ? t : null; if (st.over) st.over.classList.add('dropok');
  });
  const end = e => {
    if (!st || e.pointerId !== st.id) return;
    const dragged = !!st.ghost, id = st.cid, k = st.ghost && st.over ? keyIn(st.over) : null; reset();
    if (dragged) { const stop = ev => { ev.stopPropagation(); ev.preventDefault(); }; window.addEventListener('click', stop, { capture: true, once: true }); setTimeout(() => window.removeEventListener('click', stop, { capture: true }), 0); }
    if (!k || !chars.some(c => c.id === id)) return;
    const old = slotGet(k);
    slotSet(k, { id, level: old ? old.level : 1 });
    simSel = k; slotEdited(k);
  };
  src.addEventListener('pointerup', end); src.addEventListener('pointercancel', end);
}
dragToSlot($('cdesc'), null, () => current, () => comboOn && !$('pane-sim').hidden);
// ชุด 35: แผงค้นหาในหน้าลองสู้ เปิดค้างไว้ได้ · แตะตัว = ลงช่องว่างแรกของฝั่งที่เลือก · ลากไปวางช่องไหนก็ได้
const DOCK_KEY = 'automon-balance-dock';
const cleanQ = v => String(v).replace(/[\u0000-\u001f\u007f<>]/g, '').slice(0, 30); // คำค้น: ใช้เทียบข้อความ/แสดงด้วย textContent เท่านั้น
let dock = { q: '', tribe: '', side: 0, open: true };
const cleanDock = o => (o && typeof o === 'object' ? {
  q: typeof o.q === 'string' ? cleanQ(o.q) : '', tribe: TRIBES.includes(o.tribe) ? o.tribe : '',
  side: o.side === 1 ? 1 : 0, open: o.open !== false,
} : null);
try { dock = cleanDock(JSON.parse(localStorage.getItem(DOCK_KEY) || 'null')) || dock; } catch (e) {}
const saveDock = () => { try { localStorage.setItem(DOCK_KEY, JSON.stringify(dock)); } catch (e) {} };
function renderDock() {
  if ($('dockQ').value !== dock.q) $('dockQ').value = dock.q;
  if ($('simDock').open !== dock.open) $('simDock').open = dock.open;
  document.querySelectorAll('#dockSide [data-dside]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.dside === dock.side)));
  $('dockTribes').replaceChildren(...['', ...TRIBES].map(t => {
    const b = el('button', '', ''); b.type = 'button'; b.setAttribute('aria-pressed', String(t === dock.tribe));
    if (t) b.append(tribeBadge(t)); b.append(t || 'ทุกเผ่า');
    b.addEventListener('click', () => { dock.tribe = t; saveDock(); renderDock(); });
    return b;
  }));
  const needle = dock.q.trim().toLowerCase();
  const list = chars.filter(c => (!dock.tribe || c.tribe === dock.tribe || c.extraTribes.includes(dock.tribe)) && (!needle || `${c.id} ${c.name}`.toLowerCase().includes(needle)));
  $('dockList').replaceChildren(...(list.length ? list.map(c => {
    const b = el('button', 'dk-item', ''); b.type = 'button'; b.dataset.cid = c.id;
    b.title = `แตะ = ลงทีม${dock.side ? 'ขวา' : 'ซ้าย'} · ลากไปวางช่องที่ต้องการ`;
    b.append(tribeBadge(c.tribe, c.extraTribes), el('span', 'dk-name', `${c.id} ${c.name}`), el('b', 'dk-plus', '＋'));
    return b;
  }) : [el('span', 'hint', needle ? `ไม่พบตัวละครที่ตรงกับ "${dock.q.trim()}"` : 'ไม่มีตัวละคร')]));
}
$('dockQ').addEventListener('input', () => { dock.q = cleanQ($('dockQ').value); saveDock(); renderDock(); });
document.querySelectorAll('#dockSide [data-dside]').forEach(b => b.addEventListener('click', () => { dock.side = +b.dataset.dside === 1 ? 1 : 0; saveDock(); renderDock(); }));
$('simDock').addEventListener('toggle', () => { dock.open = $('simDock').open; saveDock(); });
$('dockList').addEventListener('click', e => { const b = e.target.closest('.dk-item'); if (b) addToSide(b.dataset.cid, dock.side); });
dragToSlot($('dockList'), '.dk-item', c => c.dataset.cid, () => true);
renderDock();
// ในสนาม: ลากตัวละครไปช่องอื่นได้เลย (สลับแล้วจำลองใหม่) · แตะ = ดูรายละเอียด
makeDraggable($('simStageBox'), '#simArena .cell, #simBench .bcell', 'key', c => !!c.querySelector('.unit, .tunit'),
  k => {
    if (!validKey(k)) return;
    if (simBossSide(k)) { // set 68: ฝั่งขวาเป็นบอส · ไม่เลือกช่อง/ไม่เปลี่ยนตัวที่แก้ตามทีมขวาที่ซ่อนอยู่
      simSel = null; markSimSel(); renderSimSlotBar();
      const ix = k.row * 2 + k.lane, u = simShowingBattle ? [...simView.units.values()].find(y => y.side === 1 && (y.cells ? y.cells.includes(ix) : y.row === k.row && y.lane === k.lane)) : null;
      simPick = u ? u.uid : null; renderSimInfo();
      if (!simShowingBattle) $('simMsg').textContent = 'ฝั่งขวาเป็นบอส · เปลี่ยนบอส/ด่านที่ปุ่มด้านบน หรือกด "ทีม" เพื่อจัดทีมขวา';
      return;
    }
    simSel = k; markSimSel(); renderSimSlotBar();
    const x = slotGet(k);
    simPick = null;
    if (!isBench(k)) $('presetSide').value = String(k.side); // ชุด 30.2: ทีมที่เซฟเลือกฝั่งตามตัวที่แตะ
    if (!isBench(k) && dock.side !== k.side) { dock.side = k.side; saveDock(); renderDock(); } // ชุด 35: แผงค้นหาลงฝั่งเดียวกับช่องที่แตะ
    if (simShowingBattle && !isBench(k)) { const ix = k.row * 2 + k.lane, u = unitsOf(simLast.r).filter(y => y.side === k.side && y.row === k.row && y.lane === k.lane).pop() || [...simView.units.values()].find(y => y.side === k.side && y.cells && y.cells.includes(ix)); simPick = u ? u.uid : null; }
    if (x && current !== x.id) setCurrent(x.id); // ชุด 30.1: แตะตัวในหน้าลองสู้ → ตัวที่แก้เปลี่ยนตามเสมอ
    renderSimInfo();
  },
  (a, b) => { if (validKey(a) && validKey(b) && !simBossSide(a) && !simBossSide(b) && simSwap(a, b)) { simSel = b; slotEdited(a, b); } });
$('simClear').addEventListener('click', () => { simTeam = emptySim(); simTeam[0][0][0] = { id: current, level: 1 }; saveSim(); renderSimTeams(); $('simRes').hidden = true; $('simSum').hidden = true; });
$('simRand').addEventListener('click', () => {
  const rng = makeRng((Date.now() & 0xffff) + 7);
  simTeam = emptySim();
  for (const side of [0, 1]) {
    const pool = chars.slice();
    for (let k = 0; k < 6; k++) {
      const c = pool.splice(Math.floor(rng.next() * pool.length), 1)[0];
      const rs = rowsOfHint(c.rowHint), r = rs.length === 1 ? rs[0] : rs.length === 2 ? rs[Math.min(1, Math.floor(rng.next() * 2))] : Math.floor(rng.next() * 3);
      const free = [[r, 0], [r, 1], ...[0, 1, 2].flatMap(x => [[x, 0], [x, 1]])].find(([a, b]) => !simTeam[side][a][b]);
      if (free) simTeam[side][free[0]][free[1]] = { id: c.id, level: 1 + Math.floor(rng.next() * 3) };
    }
  }
  saveSim(); renderSimTeams();
});

let simLast = null;
function simEntries(side) {
  const out = [];
  for (let r = 0; r < 3; r++) for (let l = 0; l < 2; l++) { const x = simTeam[side][r][l]; if (x) out.push({ id: x.id, level: x.level, row: r, lane: l }); }
  return out;
}
// secT unitsOf ROW_TH ย้ายไป game/labels.js (ชุด 25)
let simFromTeam = false;
const simSeedLabel = () => (simFromTeam ? 'จากทีม' : $('simSeed').value);
function runSim(auto, fromTeamSeed) {
  simFromTeam = !!fromTeamSeed;
  const v = validateConfig(chars, rulesNow());
  if (!v.ok) { $('simMsg').textContent = 'แก้ค่าที่ผิดก่อน (ดูรายการสีแดงด้านบน)'; return; }
  const m = makeCharMap(chars), A = simEntries(0), B = simFoeBoss ? [] : simEntries(1); // ชุด 66: ฝั่งขวาเป็นบอสได้ (บอสไม่ใช่ทีม ไม่ต้องตรวจกฎทีม)
  for (const [e, name] of simFoeBoss ? [[A, 'ซ้าย']] : [[A, 'ซ้าย'], [B, 'ขวา']]) {
    const t = validateTeam(e, m, RULES);
    if (!t.ok) { $('simMsg').textContent = `ทีม${name}: ${t.errors[0]}`; return; }
  }
  if (!A.length || (!simFoeBoss && !B.length)) { $('simMsg').textContent = simFoeBoss ? 'ใส่ตัวละครในทีมซ้ายอย่างน้อย 1 ตัว' : 'ใส่ตัวละครทั้ง 2 ฝั่งอย่างน้อยฝั่งละ 1 ตัว'; return; }
  if (simFoeBoss && !simBossOf()) { $('simMsg').textContent = 'ยังไม่มีบอสที่เปิดใช้ · เปิดในแท็บ "รูน / บอส"'; return; }
  const seed = Math.max(1, Math.min(999999, Math.round(+$('simSeed').value) || 1));
  // ชุด 66: รูนของทีมซ้าย (ถ้าใส่ไว้) แปลงเป็นสกิล/ค่าติดตัวก่อนสู้ · บอสเป็นนักสู้ตัวเดียวที่ยืนหลายช่อง
  const eq = simRunes.length ? simEquip(buildTeam(A, m)) : null;
  const teamA = eq ? eq.units : buildTeam(A, m);
  const teamB = simFoeBoss ? [bossUnit(simBossOf(), simBossK, 0, stageCfg.boss2)] : buildTeam(B, m);
  if (simFoeBoss) m[simBossId] = simBossChar();
  const r = simulate(teamA, teamB, { rules: rulesNow(), ...(fromTeamSeed ? {} : { seed }), tribesOff: [$('simOffL').checked, $('simOffR').checked], ...(eq ? { tribeExtra: eq.tribeExtra } : {}), detail: true }); // ชุด 36: จดส่วนประกอบดาเมจให้แท็บวิเคราะห์แมตช์
  const prev = simLast && simLast.r;
  simLast = { r, m, teamKey: JSON.stringify(simTeam), bossMode: simFoeBoss,
    code: makeMatchCode({ base: BASE_FP, seed: fromTeamSeed ? 0 : seed, A, B, tribesOff: [$('simOffL').checked, $('simOffR').checked], diff: diffs(), result: r,
      boss: simFoeBoss ? { rec: simBossOf(), k: simBossK } : null, runes: eq ? simEquipList() : [] }) }; // set 39: match code for bug reports · set 72: boss + runes too
  $('simCodeBox').hidden = true;
  const wasStale = $('simRun').classList.contains('stale'); clearSimStale();
  // จำลองใหม่หลังแก้ค่า: บอกผลก่อนแก้เทียบกับตอนนี้ ให้เห็นทันทีว่าแรงขึ้นหรืออ่อนลง
  const wtxt = x => (x.winner === 0 ? 'ซ้ายชนะ' : x.winner === 1 ? 'ขวาชนะ' : 'เสมอ') + ` ${(x.timeMs / 1000).toFixed(1)} วิ`;
  $('simMsg').textContent = (auto || wasStale) && prev ? `จำลองใหม่หลังแก้ค่า · ก่อนแก้: ${wtxt(prev)} → ตอนนี้: ${wtxt(r)}` : '';
  if (r.aborted) $('simMsg').textContent += (($('simMsg').textContent ? ' · ' : '') + '⚠ แมตช์นี้ถูกตัวตัดนิรภัยหยุด (ฮิตหรือผลสกิลมากผิดปกติ) ผลนับเป็นเสมอ — ตรวจสกิลที่พอกกันเอง'); // ชุด 17
  renderSimResult();
  simPlay(m, r);
  if ($('simInstant').checked && comboOn) simView.skip();
}
$('simRun').addEventListener('click', () => runSim(false));
// set 39: copy the code of the last simulated match (user pastes it in chat → Claude replays it with lab/replay.mjs --code)
$('simCode').addEventListener('click', () => {
  if (!simLast || !simLast.code) { $('simMsg').textContent = 'กด "จำลอง" ก่อน แล้วค่อยคัดลอกรหัสแมตช์'; return; }
  const code = simLast.code, box = $('simCodeBox');
  const showBox = () => { box.value = code; box.hidden = false; box.focus(); box.select(); $('simMsg').textContent = 'คัดลอกอัตโนมัติไม่ได้ · กดค้างในกล่องด้านล่างแล้วคัดลอกเอง'; };
  const ok = () => { $('simMsg').textContent = 'คัดลอกรหัสแมตช์แล้ว (แมตช์ที่จำลองล่าสุด) · วางในแชทได้เลย'; };
  try { navigator.clipboard.writeText(code).then(ok, showBox); } catch (e) { showBox(); }
});
// ใส่ตัวลงช่องว่างแรกของฝั่ง (เริ่มจากแถวที่แนะนำ) · คืนช่องที่ใส่ หรือ null ถ้าเต็ม
function addToSide(id, side) {
  const c = charOf(id); if (!c || !chars.some(x => x.id === id)) return null;
  if (simFoeBoss && side === 1) { $('simMsg').textContent = 'ฝั่งขวาเป็นบอสอยู่ · กด "ทีม" ก่อนถ้าจะใส่ตัวฝั่งขวา'; return null; }
  const r0 = rowsOfHint(c.rowHint).length < 3 ? rowsOfHint(c.rowHint)[0] ?? 0 : 0;
  const free = [[r0, 0], [r0, 1], ...[0, 1, 2].flatMap(x => [[x, 0], [x, 1]])].find(([a, b]) => !simTeam[side][a][b]);
  if (!free) { $('simMsg').textContent = `ทีม${side ? 'ขวา' : 'ซ้าย'}เต็มแล้ว`; return null; }
  const k = { side, row: free[0], lane: free[1] };
  slotSet(k, { id, level: 1 }); simSel = k; slotEdited(k);
  return k;
}
$('simAddCur').addEventListener('click', () => addToSide(current, 0)); // ใส่ตัวที่แก้อยู่ลงทีมซ้าย
$('combo').addEventListener('click', () => {
  comboOn = !comboOn;
  try { localStorage.setItem('automon-balance-combo', comboOn ? '1' : ''); } catch (e) {}
  $('combo').setAttribute('aria-pressed', String(comboOn));
  showTab(comboOn && curTab !== 'sim' ? 'chars' : curTab);
});
$('combo').setAttribute('aria-pressed', String(comboOn));
function simUnitName(u) { const c = simLast.m[u.id]; return `${u.side === 0 ? 'ซ้าย' : 'ขวา'} ${ROW_TH[u.row]}${u.lane + 1} · ${c ? c.name : u.id} Lv${u.level}`; }
// Per-unit summary from the event log · burn damage split among appliers by share (core burnShares)
function simSummary(r, start) {
  const side = new Map(unitsOf(r).map(u => [u.uid, u.side])), foe = (a, b) => side.has(a) && side.has(b) && side.get(a) !== side.get(b); // ชุด 33: นับเฉพาะดาเมจใส่ฝั่งตรงข้าม
  const S = new Map(unitsOf(r).map(u => [u.uid, { sets: 0, hits: 0, hitDmg: 0, shockDmg: 0, burnDmg: 0, otherDmg: 0, burnGiven: 0, shockGiven: 0, armorGot: 0, absorbed: 0, taken: 0, burnTaken: 0, healed: 0 }]));
  const bs = burnShares(); // burn credit by share: same core tracker as battle u.dealt and matchcalc (core/battle.js)
  const add = (uid, k, v) => { const x = S.get(uid); if (x) x[k] += v; };
  for (const e of r.events) {
    if (e.k === 'burn' || e.k === 'cleanse' || e.k === 'down') bs.see(e.k, e);
    switch (e.k) {
      case 'set': add(e.who, 'sets', 1); break;
      case 'dmg':
        add(e.to, 'taken', e.amount); add(e.to, 'absorbed', e.absorbed || 0);
        if (e.why === 'burn') {
          add(e.to, 'burnTaken', e.amount);
          for (const [src, part] of bs.split(e.to)) if (foe(src, e.to)) add(src, 'burnDmg', e.amount * part);
        } else if (e.from != null && foe(e.from, e.to)) {
          if (e.why === 'hit') { if (!e.sub) add(e.from, 'hits', 1); add(e.from, 'hitDmg', e.amount); } // ชุด 33: ฮิต = ครั้งที่ออกไปตี (ตีแบ่งหลายตัวนับ 1)
          else if (e.why === 'shock') add(e.from, 'shockDmg', e.amount);
          else add(e.from, 'otherDmg', e.amount);
        }
        break;
      case 'burn': if (e.from != null) add(e.from, 'burnGiven', e.amount); break;
      case 'shock': if (e.from != null) add(e.from, 'shockGiven', e.amount); break;
      case 'armor': add(e.to, 'armorGot', e.amount); break;
      case 'heal': add(e.to, 'healed', e.amount); break;
    }
  }
  return S;
}
function renderSimResult() {
  simPair = null; simPairInc = null; simKeep = null; simHi = null; // ชุด 37: จำลองใหม่ = เลิกตัวกรองจากลิงก์
  const { r, m } = simLast, start = r.events[0], all = unitsOf(r), U = new Map(all.map(u => [u.uid, u]));
  const nm = uid => { const u = U.get(uid); return u ? `${u.side === 0 ? 'ซ้าย' : 'ขวา'} ${u.id}` : '?'; };
  const win = r.winner === 0 ? 'ทีมซ้ายชนะ' : r.winner === 1 ? 'ทีมขวาชนะ' : 'เสมอ';
  const tribeTxt = side => Object.entries(start.tribes[side] || {}).map(([t, n]) => `${t} ${n}`).join(', ') || 'ไม่มี';
  // Set 57: one-line result right under the run controls (no scrolling after จำลอง)
  const sumBox = $('simSum'), go = el('button', '', 'ดูรายละเอียดแมตช์ ›'); go.type = 'button';
  go.addEventListener('click', () => $('toMatch').click());
  sumBox.replaceChildren(el('b', `win w${r.winner === 0 ? 'L' : r.winner === 1 ? 'R' : 'D'}`, win), el('span', 'status', `เวลา ${(r.timeMs / 1000).toFixed(1)} วิ`), el('span', 'grow', ''), go);
  sumBox.classList.remove('stale'); sumBox.hidden = false;
  $('simCards').replaceChildren(...[[tribeTxt(0), 'โบนัสเผ่าซ้าย'], [tribeTxt(1), 'โบนัสเผ่าขวา']].map(([b, sp]) => {
    const d = el('div', 'card'); d.append(el('b', '', b), el('span', '', sp)); return d;
  }));
  // สกิลทำงานกี่ครั้ง: นับจาก proc (si = ลำดับสกิลในตัวละคร)
  const cnt = new Map();
  for (const e of r.events) if (e.k === 'proc') { const key = `${e.who}:${e.si}`; const x = cnt.get(key) || { n: 0, first: e.t }; x.n++; cnt.set(key, x); }
  const rows = [];
  for (const u of all) {
    const c = m[u.id];
    c.skills.forEach((s, si) => {
      const tr = document.createElement('tr'), x = cnt.get(`${u.uid}:${si}`);
      const off = isShopWhen(s.when) ? 'หลังสู้/ร้านค้า (ไม่ทำงานในการต่อสู้)' : s.lv && !s.lv.includes(u.level) ? `ไม่ใช้ที่ Lv${u.level}` : '';
      const sk = td(''); sk.className = 'wrap'; sk.append(skillTags(s), skillLine(s, off ? 0 : u.level));
      if (!x && !off) tr.className = 'never';
      tr.append(td(simUnitName(u)), sk, td(off ? '–' : String(x ? x.n : 0), 'n'), td(off ? off : x ? secT(x.first) : 'ไม่ทำงาน', off ? '' : 'n'));
      tr.classList.add('click'); tr.addEventListener('click', () => { simPick = u.uid; renderSimInfo(); $('simInfo').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
      rows.push(tr);
    });
  }
  if (!rows.length) { const tr = document.createElement('tr'); const t = td('ไม่มีตัวไหนมีสกิล'); t.colSpan = 4; tr.append(t); rows.push(tr); }
  $('simSkills').replaceChildren(...rows);
  const nNever = rows.filter(tr => tr.classList.contains('never')).length; // ชุด 30.4: ส่วนนี้ย่อได้ · หัวข้อบอกจำนวนสกิลที่ไม่ทำงาน
  $('simSkillsNote').textContent = nNever ? `· ${nNever} สกิลไม่ทำงาน` : '';
  const res = new Map(r.units.map(u => [u.uid, u]));
  const sum = simSummary(r, start);
  $('simUnits').replaceChildren(...all.map(u => {
    const x = res.get(u.uid), tr = document.createElement('tr');
    const S = sum.get(u.uid), N = v => td(String(Math.round(v)), 'n');
    const oth = S.shockDmg + S.burnDmg + S.otherDmg; // ชุด 33: ดาเมจอื่นๆ = ช็อตที่ตีแตก + ไฟที่ตัวนี้ติดให้แล้วเผาจนหมด (ตามสัดส่วน) + ดาเมจสกิล · รวมกับดาเมจฮิต = ดาเมจทั้งหมดที่ทำต่อศัตรู
    tr.append(td(simUnitName(u)), td(pill(x.down ? 'down' : 'ยืนอยู่', x.down ? 'p-hi' : 'p-ok')), N(S.hits),
      N(S.hitDmg), N(S.shockGiven), N(S.burnGiven), N(oth), N(S.hitDmg + oth), N(S.armorGot));
    return tr;
  }));
  const sel = $('simWho'), keep = sel.value;
  sel.replaceChildren(el('option', '', 'ทุกตัว'), ...all.map(u => { const o = el('option', '', simUnitName(u)); o.value = String(u.uid); return o; }));
  sel.firstChild.value = '';
  if ([...sel.options].some(o => o.value === keep)) sel.value = keep;
  $('simRes').hidden = false;
  renderSimLog();
  if (!$('pane-match').hidden) renderMatch();
}
// บันทึกการต่อสู้แบบละเอียด: ชื่อจริง + สีเผ่า + สีฝั่ง · ทุกดาเมจบอก ดาเมจทั้งหมด / เกราะกัน / HP ที่หาย / HP และเกราะที่เหลือ
// ข้อความสร้างด้วย DOM (textContent) เท่านั้น
// WHY_SIM simLine battleLogLines อยู่ใน game/labels.js (ชุด 25 · ใช้ร่วมกับหน้าเกม)
// ชื่อในบันทึก: ป้ายสีเผ่า + ชื่อจริง · สีตัวอักษรตามฝั่ง (ซ้ายฟ้า ขวาแดง)
function simNameEl(u) {
  const c = simLast.m[u.id], s = el('span', u.side === 0 ? 'lg-L' : 'lg-R');
  s.append(tribeBadge(c.tribe, c.extraTribes), `${c.name}`, el('span', 'lg-pos', ` ${ROW_TH[u.row]}${u.lane + 1}`));
  s.title = `${u.side === 0 ? 'ซ้าย' : 'ขวา'} ${ROW_TH[u.row]} เลน ${u.lane + 1} · ${c.id} Lv${u.level}`;
  return s;
}
// ชุด 37: ลิงก์จากแท็บรายตัวมาที่นี่ · simPair = กรองเฉพาะคู่ [uid, uid] · simPairInc = เลขเหตุการณ์ที่ผ่านตัวกรองคู่เสมอ · simKeep = บรรทัดที่ต้องแสดงแม้เกินลิมิต 2000 · simHi = บรรทัดที่ไฮไลต์
let simPair = null, simPairInc = null, simKeep = null, simHi = null;
function renderSimLog() {
  if (!simLast) return;
  const who = $('simWho').value === '' ? null : +$('simWho').value;
  let bar = $('simPairBar');
  if (!bar) { bar = el('div', 'row'); bar.id = 'simPairBar'; $('simLog').before(bar); }
  bar.replaceChildren();
  if (simPair) {
    const U = new Map(unitsOf(simLast.r).map(u => [u.uid, u])), nm = uid => { const u = U.get(uid); return u ? mxShort(u) : '?'; };
    const x = el('button', '', 'เอาตัวกรองออก'); x.type = 'button';
    x.addEventListener('click', () => { simPair = null; simPairInc = null; simHi = null; renderSimLog(); });
    bar.append(el('span', 'status', `กรองเฉพาะคู่: ${nm(simPair[0])} × ${nm(simPair[1])}`), el('span', 'grow'), x);
  }
  bar.hidden = !simPair;
  $('simLog').replaceChildren(...battleLogLines(simLast.r, simLast.m, { who, pair: simPair, pairInclude: simPairInc, keep: simKeep, hi: simHi, onlyProc: $('simOnlyProc').checked, hideSet: $('simNoSet').checked, nameEl: simNameEl }));
  mxLogApply();
}
// ชุด UX: ค้นหา/กรองบันทึกตามชนิด (ใช้เลขเหตุการณ์ในแต่ละบรรทัด ไม่ต้องแก้โค้ดเกม)
const MX_LOG_KINDS = [['', 'ทั้งหมด'], ['hit', 'ฮิต'], ['burn', 'ไฟ'], ['shock', 'ช็อต'], ['skill', 'สกิล'], ['armor', 'เกราะ'], ['heal', 'ฟื้น'], ['boss', 'กฎบอส']];
let mxLogKind = '';
function mxLogKindOf(e) {
  if (!e) return 'other';
  if (e.k === 'dmg') return e.why === 'hit' ? 'hit' : e.why === 'burn' ? 'burn' : e.why === 'shock' ? 'shock' : 'skill';
  if (e.k === 'burn' || e.k === 'shock' || e.k === 'heal' || e.k === 'armor') return e.k;
  return 'skill';
}
// set 75: boss-rule lines (phase/bar/rule effects, or a hit a boss rule changed) · its own chip, so the other chips stay as before
const MX_BOSS_KINDS = new Set(['phase', 'bar', 'barRefill', 'bossMove', 'vanish', 'curse', 'ruleBlock']);
const mxIsBoss = e => !!e && (MX_BOSS_KINDS.has(e.k) || !!e.r || !!(e.rr && e.rr.length) || (e.k === 'cleanse' && e.what === 'bar'));
function mxLogApply() {
  if (!simLast) return;
  const q = ($('mxLogQ') ? $('mxLogQ').value : '').trim().toLowerCase(), kinds = $('mxLogKinds');
  if (kinds && !kinds.childElementCount) {
    for (const [k, nm] of MX_LOG_KINDS) {
      const b = el('button', '', nm); b.type = 'button'; b.dataset.k = k; b.setAttribute('aria-pressed', String(k === mxLogKind));
      b.addEventListener('click', () => { mxLogKind = k; [...kinds.children].forEach(x => x.setAttribute('aria-pressed', String(x.dataset.k === k))); mxLogApply(); });
      kinds.append(b);
    }
  }
  let shown = 0;
  for (const li of $('simLog').querySelectorAll('li[data-ev]')) {
    const ev = simLast.r.events[+li.dataset.ev];
    const okQ = !q || li.textContent.toLowerCase().includes(q);
    const okK = !mxLogKind || (mxLogKind === 'boss' ? mxIsBoss(ev) : mxLogKindOf(ev) === mxLogKind);
    li.hidden = !(okQ && okK); if (!li.hidden) shown++;
  }
  const cnt = $('mxLogCount'); if (cnt) cnt.textContent = `${shown} บรรทัด`;
}
function mxLogText() {
  return [...$('simLog').querySelectorAll('li[data-ev]')].filter(li => !li.hidden).map(li => li.textContent.replace(/\s+/g, ' ').trim()).join('\n');
}
// ตัวกรองในหน้าบันทึกถูกแตะเอง = เลิกกรองคู่/ไฮไลต์ของลิงก์
const simFilterChanged = () => { simPair = null; simPairInc = null; simKeep = null; simHi = null; renderSimLog(); };
$('simWho').addEventListener('change', simFilterChanged);
// เปิดบันทึกการต่อสู้ที่บรรทัดเดียว (ev) หรือเฉพาะคู่ (pair + inc) · ล้างตัวกรองเดิมก่อน แล้วเลื่อนไปไฮไลต์
function mxJump({ ev = null, pair = null, inc = null }) {
  if (!simLast) return;
  $('simWho').value = ''; $('simOnlyProc').checked = false; $('simNoSet').checked = false;
  simPair = pair; simPairInc = inc; simKeep = ev != null ? new Set([ev]) : null; simHi = ev;
  $('simLogFold').open = true;
  renderSimLog();
  const li = ev != null ? $('simLog').querySelector(`li[data-ev="${ev}"]`) : null;
  if (li) li.hidden = false; // the line asked for always shows, even if the search/kind chips would hide it
  const target = li || $('simPairBar') || $('simLogFold');
  // set 75 (iPad): smooth scrollIntoView on a line inside the log's own scroll box did not move to it in Safari →
  // scroll the box and the page by hand, instantly, after the opened fold has its layout
  requestAnimationFrame(() => {
    if (li) { const box = $('simLog'), b = box.getBoundingClientRect(), r = li.getBoundingClientRect(); box.scrollTop += r.top - b.top - (box.clientHeight - r.height) / 2; }
    const bar = document.querySelector('.topbar'), barH = bar && getComputedStyle(bar).position === 'sticky' ? bar.offsetHeight : 0;
    const r = target.getBoundingClientRect();
    const y = window.scrollY + r.top - (li ? Math.max(barH + 8, (window.innerHeight - r.height) / 2) : barH + 8);
    window.scrollTo(0, Math.max(0, y));
  });
}

