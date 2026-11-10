// ---------- ชุด 29: 4 ขั้น เลือกตัว → แก้ → ดูผล → บันทึก ----------
const STEP_OF = { grid: 'pick', list: 'pick', chars: 'edit', tribes: 'edit', sim: 'edit', match: 'edit', stage: 'edit', rules: 'edit', analysis: 'result', human: 'result' }; // ชุด 36: แท็บวิเคราะห์แมตช์ // ชุด 30: บันทึกย้ายมาท้ายขั้นแก้ (3 ขั้น)
var resultScrollY = 0, lastResult = 'analysis', curTab = 'grid', lastPick = 'grid', lastEdit = 'chars', tribeSel = TRIBES[0]; // var: ฟอร์มเผ่าอ่านได้ตั้งแต่เริ่มหน้า
function showTab(which) {
  if (which === 'save') which = 'chars'; // ค่าเก่าที่จำไว้ (ก่อนชุด 30)
  if (!STEP_OF[which]) which = 'grid';
  const step = STEP_OF[which], stepChanged = STEP_OF[curTab] !== step;
  if (stepChanged && STEP_OF[curTab] === 'result') resultScrollY = window.scrollY;
  curTab = which;
  if (step === 'pick') lastPick = which;
  if (step === 'edit') lastEdit = which;
  if (step === 'result') lastResult = which;
  for (const st of ['pick', 'edit', 'result']) $('step-' + st).setAttribute('aria-current', st === step ? 'step' : 'false');
  document.querySelector('.tabs.main').classList.toggle('off', step !== 'edit'); // B5: the edit sub-tabs only belong to step 2 (steps 1 and 3 already have their own nav)
  $('view-pick').hidden = step !== 'pick'; $('editor').hidden = step !== 'edit';
  $('view-result').hidden = step !== 'result';
  $('tab-grid').setAttribute('aria-pressed', String(which === 'grid')); $('tab-list').setAttribute('aria-pressed', String(which === 'list'));
  $('tgrid').hidden = which !== 'grid'; $('gridHint').hidden = which !== 'grid';
  $('tab-chars').setAttribute('aria-selected', String(which === 'chars'));
  $('tab-tribes').setAttribute('aria-selected', String(which === 'tribes')); $('tab-tribes').hidden = which !== 'tribes';
  $('tab-sim').setAttribute('aria-selected', String(which === 'sim'));
  $('tab-match').setAttribute('aria-selected', String(which === 'match'));
  $('tab-stage').setAttribute('aria-selected', String(which === 'stage'));
  $('tab-rules').setAttribute('aria-selected', String(which === 'rules'));
  // โหมดทำไปลองไป: แก้ตัวละคร/ลองสู้ แสดงทั้งสองส่วนพร้อมกัน (จอกว้างอยู่ข้างกัน จอแคบอยู่ต่อกัน)
  const both = comboOn && (which === 'chars' || which === 'sim') && !matchMedia('(max-width: 700px)').matches; // set 161: phone = no combo (button hidden; the two panes would just stack into one very long page)
  $('editor').classList.toggle('combo', both);
  document.querySelector('.wrap').classList.toggle('wide', both);
  $('pane-chars').hidden = !(which === 'chars' || both);
  $('pane-tribes').hidden = which !== 'tribes';
  $('pane-list').hidden = which !== 'list';
  $('pane-sim').hidden = !(which === 'sim' || both);
  $('pane-analysis').hidden = which !== 'analysis'; $('pane-human').hidden = which !== 'human';
  $('resBot').setAttribute('aria-pressed', String(which !== 'human')); $('resHuman').setAttribute('aria-pressed', String(which === 'human'));
  $('pane-stage').hidden = which !== 'stage'; if (which === 'stage') renderStage();
  $('pane-rules').hidden = which !== 'rules'; if (which === 'rules') renderRulesForm();
  document.querySelector('#editor > details.gloss').hidden = !(which === 'chars' || which === 'sim' || which === 'tribes'); // set 56: skill glossary is not about runes/bosses · set 161: nor game rules / match details (only where skills are edited or tried)
  $('pane-match').hidden = which !== 'match'; if (which === 'match') renderMatch();
  $('saveBox').hidden = $('pane-chars').hidden && $('pane-tribes').hidden && $('pane-stage').hidden && $('pane-rules').hidden; $('ideaBox').hidden = which === 'stage' || which === 'rules'; $('catalog').hidden = which === 'stage' || which === 'rules'; // set 161: skill ideas + skill library belong to characters, not to runes or game rules // stage tab has its own idea box // ส่วนบันทึกอยู่ใต้ส่วนแก้ตัวละคร/โบนัสเผ่า
  if (which === 'grid') renderGrid();
  if (which === 'list') renderList();
  if (which === 'tribes') renderTribePick();
  if (!$('pane-sim').hidden) { renderSimTeams(); if (typeof renderDock === 'function') renderDock(); }
  else if (simView && simView.playing) { simView.pause(); $('simPlay').textContent = 'เล่น'; }
  if (stepChanged) window.scrollTo({ top: step === 'result' ? resultScrollY : 0 }); // set 125: back to ดูผล = same place as before (e.g. after tapping a character to edit)
  { const t = $('tab-' + which); const bar = t && t.parentElement; if (bar && bar.scrollWidth > bar.clientWidth) bar.scrollLeft += t.getBoundingClientRect().left - bar.getBoundingClientRect().left - (bar.clientWidth - t.offsetWidth) / 2; } // set 161: phone tab bar scrolls → keep the chosen tab visible
  try { localStorage.setItem('automon-balance-tab', which); } catch (e) {}
}
$('step-pick').addEventListener('click', () => showTab(lastPick));
$('step-edit').addEventListener('click', () => showTab(lastEdit));
$('step-result').addEventListener('click', () => showTab(lastResult));
$('resBot').addEventListener('click', () => showTab('analysis'));
$('resHuman').addEventListener('click', () => showTab('human'));
$('tab-grid').addEventListener('click', () => showTab('grid'));
$('tab-list').addEventListener('click', () => showTab('list'));
$('tab-chars').addEventListener('click', () => showTab('chars'));
$('tab-tribes').addEventListener('click', () => showTab('tribes'));
$('tab-sim').addEventListener('click', () => showTab('sim'));
$('tab-match').addEventListener('click', () => showTab('match'));
$('tab-stage').addEventListener('click', () => showTab('stage'));
$('tab-rules').addEventListener('click', () => showTab('rules'));
function editedIds(d) { return Object.keys(d.chars).filter(id => Object.keys(d.chars[id]).length); }
// Batch 31: measured result per character/tribe for the step-1 grid · source = this page's last "วิเคราะห์" (lastRun) or the saved results/latest (savedRes, validated on load)
let savedRes = null;
const stableKey = x => JSON.stringify(x, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(q => [q, v[q]])) : v));
const finiteNum = x => typeof x === 'number' && Number.isFinite(x);
function cleanSavedRes(r) {
  if (!r || typeof r !== 'object' || !r.chars || typeof r.chars !== 'object') return null;
  const out = { chars: {}, tribes: {}, edits: r.edits && typeof r.edits === 'object' ? r.edits : { chars: {}, tribes: {} }, at: typeof r.at === 'string' ? r.at.slice(0, 40) : '' };
  for (const c of chars) {
    const e = r.chars[c.id] && r.chars[c.id].err;
    if (e && ['mix', 1, 2, 3].every(L => finiteNum(e[L]))) out.chars[c.id] = { mix: e.mix, 1: e[1], 2: e[2], 3: e[3] };
  }
  for (const t of TRIBES) {
    const x = r.tribes && r.tribes[t]; if (!x || typeof x !== 'object') continue;
    const o = {}; for (const st of RULES.tribeSteps) if (x[st] && finiteNum(x[st].uplift)) o[st] = x[st].uplift;
    out.tribes[t] = o;
  }
  return Object.keys(out.chars).length ? out : null;
}
function gridResults() {
  if (lastRun && lastRun.now) {
    const now = lastRun.now, res = { chars: {}, tribes: {}, edits: JSON.parse(lastRun.key), src: 'page' };
    for (const c of chars) if (now.levels.mix[c.id]) res.chars[c.id] = Object.fromEntries(MEASURE.levels.map(L => [L, now.levels[L][c.id].err]));
    for (const t of TRIBES) if (now.tr && now.tr[t]) res.tribes[t] = Object.fromEntries(RULES.tribeSteps.filter(st => now.tr[t][st]).map(st => [st, now.tr[t][st].uplift]));
    return res;
  }
  return savedRes ? { ...savedRes, src: 'saved' } : null;
}
// values a result was measured with = defaults + its saved edits (applyDiffs on a swap, globals restored)
let measuredCache = { k: null, v: null };
function measuredValues(edits) {
  const k = stableKey(edits); if (measuredCache.k === k) return measuredCache.v;
  const keepC = chars, keepT = tribes;
  try { applyDiffs(edits); measuredCache = { k, v: { chars: Object.fromEntries(chars.map(c => [c.id, stableKey(c)])), tribes: Object.fromEntries(TRIBES.map(t => [t, stableKey(tribes[t])])) } }; }
  finally { chars = keepC; tribes = keepT; }
  return measuredCache.v;
}
// ตารางเผ่า × ความหายาก: ตัวอยู่ในแถวเผ่าหลัก · แตะตัว = แก้ · แตะชื่อเผ่า = แก้โบนัสเผ่านั้น
function renderGrid() {
  const d = diffs(), edited = new Set(editedIds(d)), res = gridResults();
  // stale = the values measured differ from the values now (compare real values, not edit lists: an import turns edits into defaults)
  const was = res && measuredValues(res.edits);
  const charStale = id => !was || was.chars[id] !== stableKey(chars.find(c => c.id === id));
  const tribeStale = t => !was || was.tribes[t] !== stableKey(tribes[t]);
  const anyStale = res && (chars.some(c => charStale(c.id)) || TRIBES.some(tribeStale));
  $('gridLegend').replaceChildren(...(res ? [' · สีตามผลวัด', res.src === 'saved' ? ' (ผลที่บันทึกไว้)' : ' (วิเคราะห์ล่าสุด)', ': ', pill(...VERDICT_TH.ok), ' ', pill(...VERDICT_TH.near), ' ', pill(...VERDICT_TH.out), ' ', pill('แก้หลังวัด / ยังไม่วัด', 'p-na'), ' · ตัวเลข = ห่างเป้า (ผสม)', anyStale ? ' · มีค่าที่แก้หลังวัด กดวิเคราะห์ใหม่เพื่ออัปเดต' : ''] : [' · ยังไม่มีผลวัด: กดวิเคราะห์ในขั้น 3 แล้วตารางจะเป็นสีตามผล']));
  const out = [el('div', 'tg-corner', '')];
  for (const r of RARITIES) { const h = el('div', 'tg-rh', ''); h.append(rarityTag(r), el('small', '', `ราคา ${RULES.shop.prices[r]}`)); out.push(h); }
  for (const t of TRIBES) {
    const row = el('div', 'tg-row');
    const members = chars.filter(c => c.tribe === t), extra = chars.filter(c => c.extraTribes.includes(t)).length;
    const th = el('button', 'tg-tribe', ''); th.type = 'button'; th.title = `แก้โบนัสเผ่า${t}`;
    th.append(tribeBadge(t), el('span', '', t), el('small', '', `${members.length} ตัว${extra ? ` +${extra} เผ่าเพิ่ม` : ''} · โบนัสเผ่า ›`));
    const up = res && res.tribes[t];
    if (up && Object.keys(up).length) { const u = el('small', 'tg-up' + (tribeStale(t) ? ' stale' : ''), ''); Object.entries(up).forEach(([st, v], i) => u.append(...(i ? [' · '] : []), el('span', '', `ขั้น ${st} ${sgn(v)}`))); u.title = 'ผลวัดโบนัสเผ่า: อัตราชนะที่เพิ่มขึ้นเมื่อเปิดแต่ละขั้น'; th.append(u); }
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
        const e = res && res.chars[c.id], stale = !e || charStale(c.id), v = e && verdict(e);
        if (res) { b.classList.add(stale ? 'r-na' : 'r-' + v); if (e) b.append(el('span', 'tg-res', sgn(e.mix))); }
        b.title = `${c.id} ${c.name} · ${describe(c)}${edited.has(c.id) ? ' · แก้แล้ว' : ''}${e ? ` · ผลวัด ห่างเป้า ผสม ${sgn(e.mix)} · Lv1 ${sgn(e[1])} · Lv2 ${sgn(e[2])} · Lv3 ${sgn(e[3])} → ${stale ? 'แก้หลังวัด' : VERDICT_TH[v][0]}` : ''}`;
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

