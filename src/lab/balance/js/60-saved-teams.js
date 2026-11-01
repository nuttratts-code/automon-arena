// ---------- ทีมที่เซฟ (ชุด 30.1 · สูงสุด 10 ทีม) ----------
// เก็บในฐานข้อมูลของหน้า simTeams (ใช้ได้ทุกเครื่อง) · เปิดแบบไม่มีฐานข้อมูล = เก็บในเครื่องนี้แทน
// ข้อมูลที่อ่านกลับมาถือว่าไม่น่าเชื่อถือ: รับเฉพาะ ID ที่มีจริง เลเวล 1–3 แถว 0–2 เลน 0–1 ไม่ซ้ำช่อง ชื่อผ่าน cleanName
const PRESET_MAX = 10, PRESET_KEY = 'automon-balance-teams';
let presets = [], presetDel = null;
function cleanPreset(id, x) {
  if (!x || typeof x !== 'object' || !Array.isArray(x.units) || x.units.length > 6) return null;
  const seen = new Set(), units = [];
  for (const u of x.units) {
    if (!u || typeof u !== 'object' || ![0, 1, 2].includes(u.row) || ![0, 1].includes(u.lane) || ![1, 2, 3].includes(u.level)) return null;
    if (typeof u.id !== 'string' || !BASE_CHARS.some(c => c.id === u.id) || seen.has(u.row * 2 + u.lane)) return null;
    seen.add(u.row * 2 + u.lane); units.push({ row: u.row, lane: u.lane, id: u.id, level: u.level });
  }
  if (!units.length) return null;
  const name = typeof x.name === 'string' ? cleanName(x.name) : '';
  return { id: String(id).slice(0, 64), name, units, at: typeof x.at === 'string' ? x.at.slice(0, 40) : '' };
}
function presetLocal() { try { const raw = JSON.parse(localStorage.getItem(PRESET_KEY) || '[]'); return Array.isArray(raw) ? raw.slice(0, PRESET_MAX).map(x => cleanPreset(x && x.id, x)).filter(Boolean) : []; } catch (e) { return []; } }
function presetLocalWrite(list) { try { localStorage.setItem(PRESET_KEY, JSON.stringify(list)); } catch (e) {} }
const presetMsg = t => { $('presetMsg').textContent = t; };
function renderPresets() {
  $('presetCount').textContent = `${presets.length}/${PRESET_MAX}${db ? '' : ' · เก็บในเครื่องนี้'}`;
  $('presetSave').disabled = presets.length >= PRESET_MAX;
  if (presets.length >= PRESET_MAX) presetMsg(`เต็ม ${PRESET_MAX} ทีมแล้ว ลบทีมเก่าก่อน`);
  const items = presets.map((p, i) => {
    const li = el('li', '');
    li.append(el('span', 'pname', p.name || `ทีม ${i + 1}`));
    for (const sd of [0, 1]) {
      const b = el('button', '', `ใส่ทีม${sd ? 'ขวา' : 'ซ้าย'}`); b.type = 'button'; b.dataset.load = String(sd);
      b.addEventListener('click', () => {
        if (sd === 1 && simFoeBoss) { simFoeBoss = false; renderSimBoss(); } // set 68: ใส่ทีมขวา = กลับเป็นโหมดทีม vs ทีม
        simTeam[sd] = [0, 1, 2].map(() => [null, null]);
        for (const u of p.units) simTeam[sd][u.row][u.lane] = { id: u.id, level: u.level };
        simSel = null; saveSim(); renderSimTeams(); simChanged(); presetMsg(`ใส่ "${p.name || `ทีม ${i + 1}`}" ลงทีม${sd ? 'ขวา' : 'ซ้าย'}แล้ว`);
      });
      li.append(b);
    }
    const del = el('button', 'danger', presetDel === p.id ? 'กดอีกครั้งเพื่อลบ' : 'ลบ'); del.type = 'button';
    del.addEventListener('click', async () => {
      if (presetDel !== p.id) { presetDel = p.id; renderPresets(); setTimeout(() => { if (presetDel === p.id) { presetDel = null; renderPresets(); } }, 3000); return; }
      presetDel = null;
      if (db) { try { await db.doc('simTeams/' + p.id).delete(); presetMsg('ลบแล้ว'); } catch (e) { presetMsg('ลบไม่สำเร็จ ลองใหม่อีกครั้ง'); } }
      else { presets = presets.filter(x => x.id !== p.id); presetLocalWrite(presets); renderPresets(); presetMsg('ลบแล้ว'); }
    });
    li.append(del);
    li.append(el('span', 'pmem', [...p.units].sort((a, b) => a.row - b.row || a.lane - b.lane).map(u => `${ROW_TH[u.row]}${u.lane + 1} ${u.id} Lv${u.level}`).join(' · ')));
    return li;
  });
  $('presetList').replaceChildren(...(items.length ? items : [el('li', 'status', 'ยังไม่มีทีมที่เซฟ · จัดทีมแล้วเลือกฝั่ง กด "เซฟทีมฝั่งนี้"')]));
}
$('presetSave').addEventListener('click', async () => {
  const sd = $('presetSide').value === '1' ? 1 : 0;
  if (presets.length >= PRESET_MAX) { presetMsg(`เต็ม ${PRESET_MAX} ทีมแล้ว ลบทีมเก่าก่อน`); return; }
  const units = [];
  for (let r = 0; r < 3; r++) for (let l = 0; l < 2; l++) { const x = simTeam[sd][r][l]; if (x) units.push({ row: r, lane: l, id: x.id, level: x.level }); }
  if (!units.length) { presetMsg(`ทีม${sd ? 'ขวา' : 'ซ้าย'}ยังว่าง`); return; }
  const doc = cleanPreset('new', { name: $('presetName').value, units, at: new Date().toISOString() }); if (!doc) { presetMsg('ทีมนี้เซฟไม่ได้'); return; }
  const data = { name: doc.name, units: doc.units, at: doc.at };
  $('presetSave').disabled = true;
  if (db) { try { await db.collection('simTeams').add(data); presetMsg('เซฟแล้ว'); $('presetName').value = ''; } catch (e) { presetMsg('เซฟไม่สำเร็จ ลองใหม่อีกครั้ง'); } }
  else { presets = [...presets, { ...data, id: 'L' + Date.now().toString(36) }]; presetLocalWrite(presets); presetMsg('เซฟแล้ว (ในเครื่องนี้)'); $('presetName').value = ''; }
  renderPresets();
});
$('presetSide').addEventListener('change', () => presetMsg(''));
// เปิดแถบทีมที่เซฟ: ตั้งฝั่งตามช่องที่เลือกอยู่ (ม้านั่ง/ไม่ได้เลือก = คงเดิม)
$('presetBox').addEventListener('toggle', () => { if ($('presetBox').open && simSel && !isBench(simSel)) $('presetSide').value = String(simSel.side); });

$('simPlay').addEventListener('click', () => {
  if (!simView || simView.ended) return;
  if (simView.playing) { simView.pause(); $('simPlay').textContent = 'เล่น'; } else { simView.play(); $('simPlay').textContent = 'หยุด'; }
});
const simReplay = () => { if (simLast) simPlay(simLast.m, simLast.r); };
$('simReplay').addEventListener('click', simReplay);
$('simOverReplay').addEventListener('click', simReplay);
$('simSkip').addEventListener('click', () => { if (simView && !simView.ended) simView.skip(); });
document.querySelectorAll('[data-sspeed]').forEach(b => b.addEventListener('click', () => {
  simSpeed = +b.dataset.sspeed; if (simView) simView.speed = simSpeed;
  document.querySelectorAll('[data-sspeed]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
}));
$('simOnlyProc').addEventListener('change', simFilterChanged);
$('simNoSet').addEventListener('change', simFilterChanged);

