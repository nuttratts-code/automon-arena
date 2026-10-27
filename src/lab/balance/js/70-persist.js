// ---------- บันทึกให้ Claude อ่าน (ฐานข้อมูลของหน้า) ----------
let db = null;
async function saveResults() {
  if (!db || !lastRun) return;
  const { now, n } = lastRun;
  const summary = {
    method: 'measureAll', n, seed: MEASURE.seed, at: new Date().toISOString(), edits: diffs(),
    chars: Object.fromEntries(chars.map(c => { const e = Object.fromEntries(MEASURE.levels.map(L => [L, now.levels[L][c.id].err])); return [c.id, { win: now.levels.mix[c.id].win, err: e, verdict: verdict(e) }]; })),
    tribes: Object.fromEntries(TRIBES.map(t => [t, Object.fromEntries(RULES.tribeSteps.map(s => [s, { uplift: +fmt(now.tr[t][s].uplift), vsMixed: +fmt(now.tr[t][s].vsMixed) }]))])),
    avgTime: now.avgTime,
    aborted: now.aborted || {}, // ชุด 17: แมตช์ที่ตัวตัดนิรภัยหยุด
    // ชุด 38: แมตช์ต้องสงสัย 10 อันดับ (ดาเมจรวม ÷ HP รวมสองฝั่ง) ให้ Claude ตรวจต่อได้
    suspicious: (now.top || []).map(t => ({ level: t.level, i: t.i, winner: t.winner, timeMs: t.timeMs, dmgTotal: t.dmgTotal,
      dmgA: t.dmgA, dmgB: t.dmgB, hpTotal: t.hpTotal, dmgPerHp: t.dmgPerHp, sideRatio: t.sideRatio, survivors: t.survivors,
      teamA: t.teamA, teamB: t.teamB, perUnit: t.perUnit, aborted: t.aborted || null })),
  };
  try { await db.doc('results/latest').set(summary); } catch (e) {}
}
let saveMsgT = 0;
const saveMsg = t => { $('saveMsg').textContent = t; $('saveMsg').hidden = !t; clearTimeout(saveMsgT); if (t) saveMsgT = setTimeout(() => { $('saveMsg').hidden = true; }, 8000); };
$('save').addEventListener('click', async () => {
  if (!validateConfig(chars, rulesNow()).ok) { saveMsg('ยังบันทึกไม่ได้: มีค่าผิด (ดูรายการสีแดง) แก้ก่อนแล้วกดบันทึกอีกครั้ง'); return; } // ชุด 30.1: ไม่ส่งค่าผิดให้ Claude
  if (!db) { saveMsg('บันทึกไม่ได้ในมุมมองนี้ (ต้องเปิดหน้าขณะล็อกอิน) · ค่าที่แก้ยังเก็บเป็นร่างในเครื่องนี้'); return; }
  $('save').disabled = true;
  try {
    const at = new Date().toISOString();
    await db.doc('config/main').set({ ...diffs(), savedAt: at });
    await db.doc('ui/main').set(uiState(at)); // ชุด 35: สิ่งที่เลือก/เปิดค้างไว้ทั้งหมด (เปิดใหม่หรือเปลี่ยนเครื่องก็กลับมาครบ)
    markSynced(at);
    saveMsg('บันทึกแล้ว (ค่าที่แก้ + ทีมในสนาม + สิ่งที่เลือกไว้) · บอก Claude ในแชทได้เลยว่าให้นำค่าไปใช้');
  } catch (e) {
    saveMsg('บันทึกไม่สำเร็จ: ' + (e && e.message ? e.message : 'ลองใหม่อีกครั้ง'));
  }
  $('save').disabled = false;
});
// ---------- ชุด 35: สถานะหน้า (สิ่งที่เลือก/กดค้างไว้) เก็บพร้อม 💾 ใน ui/main ----------
// ช่องฟอร์มที่จำ: [id, ชนิด] · ค่าจากที่เก็บตรวจก่อนใช้ทุกช่อง (ตัวเลือกต้องมีอยู่จริง ตัวเลขอยู่ในช่วง ข้อความตัดอักขระควบคุม)
const UI_CTRLS = ['simLvSide', 'presetSide', 'presetName', 'simOffL', 'simOffR', 'simSeed', 'simAuto', 'simInstant', 'simOnlyProc', 'simNoSet', 'ideaGeneral', 'ideaText', 'ideaShowDone', 'mN'];
const SYNC_KEY = 'automon-balance-synced'; // { at, draft } = เวลาที่เครื่องนี้บันทึก/โหลดล่าสุด + ร่างตอนนั้น
const SPEEDS = [0.5, 1, 2, 4, 8, 16];
function uiState(at) {
  const ctrls = {};
  for (const id of UI_CTRLS) { const e = $(id); ctrls[id] = e.type === 'checkbox' ? e.checked : e.value; }
  return { v: 1, at, tab: curTab, current, tribeSel, simTeam, simBench, simSel, comboOn, simSpeed, listEdit, listFilter, catFilter, dock, presetOpen: $('presetBox').open, ctrls };
}
function markSynced(at) { try { localStorage.setItem(SYNC_KEY, JSON.stringify({ at, draft: JSON.stringify(diffs()) })); } catch (e) {} }
function readSynced() { try { const o = JSON.parse(localStorage.getItem(SYNC_KEY) || 'null'); return o && typeof o.at === 'string' && typeof o.draft === 'string' ? o : null; } catch (e) { return null; } }
function applyUi(o) {
  if (!o || typeof o !== 'object' || o.v !== 1) return;
  const t = cleanSimTeam(o.simTeam), b = cleanBench(o.simBench);
  if (t) simTeam = t; if (b) simBench = b; saveSim();
  simSel = validKey(o.simSel) ? { side: o.simSel.side, row: o.simSel.row, lane: o.simSel.lane } : null;
  if (TRIBES.includes(o.tribeSel)) tribeSel = o.tribeSel;
  if (typeof o.comboOn === 'boolean') { comboOn = o.comboOn; try { localStorage.setItem('automon-balance-combo', comboOn ? '1' : ''); } catch (e) {} $('combo').setAttribute('aria-pressed', String(comboOn)); }
  if (SPEEDS.includes(o.simSpeed)) { simSpeed = o.simSpeed; if (simView) simView.speed = simSpeed; document.querySelectorAll('[data-sspeed]').forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.sspeed === simSpeed))); }
  if (typeof o.listEdit === 'boolean') { listEdit = o.listEdit; try { localStorage.setItem('automon-balance-listedit', listEdit ? '1' : ''); } catch (e) {} }
  if (o.listFilter === 'ทั้งหมด' || TRIBES.includes(o.listFilter)) listFilter = o.listFilter;
  if (o.catFilter === 'ทั้งหมด' || CATALOG.some(x => x.cat === o.catFilter)) catFilter = o.catFilter;
  const d = cleanDock(o.dock); if (d) { dock = d; saveDock(); }
  if (typeof o.presetOpen === 'boolean') $('presetBox').open = o.presetOpen;
  const c = o.ctrls && typeof o.ctrls === 'object' ? o.ctrls : {};
  for (const id of UI_CTRLS) {
    if (!Object.hasOwn(c, id)) continue;
    const e = $(id), v = c[id];
    if (e.type === 'checkbox') { if (typeof v === 'boolean') e.checked = v; }
    else if (e.tagName === 'SELECT') { if (typeof v === 'string' && [...e.options].some(x => x.value === v)) e.value = v; }
    else if (e.type === 'number') { const n = Number(v); if (Number.isFinite(n) && n >= +e.min && n <= +e.max) e.value = String(Math.round(n)); }
    else if (typeof v === 'string') e.value = v.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').slice(0, e.maxLength > 0 ? e.maxLength : 1000);
  }
  try { localStorage.setItem('automon-balance-simauto', $('simAuto').checked ? '1' : ''); localStorage.setItem('automon-balance-ideadone', $('ideaShowDone').checked ? '1' : ''); } catch (e) {}
  if (typeof o.current === 'string' && chars.some(x => x.id === o.current)) setCurrent(o.current);
  ideaPick.set(); renderIdeas(); renderCatalog(); renderDock();
  showTab(STEP_OF[o.tab] ? o.tab : curTab);
}
$('reset').addEventListener('click', () => {
  if ($('reset').dataset.confirm !== '1') { $('reset').dataset.confirm = '1'; $('reset').textContent = 'กดอีกครั้งเพื่อยืนยัน'; setTimeout(() => { $('reset').dataset.confirm = ''; $('reset').textContent = 'กลับค่าตั้งต้น'; }, 3000); return; }
  $('reset').dataset.confirm = ''; $('reset').textContent = 'กลับค่าตั้งต้น';
  applyDiffs(null); renderCharForm(); renderTribeForm(); refreshDirty();
});

