// ---------- เริ่มหน้า ----------
// ปุ่มแท็บรายตัว (อยู่นอกแถวตัวละครทุกแถว) — สร้างครั้งเดียวตอนเริ่มหน้า
MX_TABS.forEach((nm, i) => { const b = el('button', '', nm); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(i === mxTabSel)); b.addEventListener('click', () => mxSetTab(i)); $('mxTabs').append(b); });
presets = presetLocal(); renderPresets(); // ทีมที่เซฟในเครื่อง (ฐานข้อมูลพร้อมแล้วจะแทนด้วยของฐานข้อมูล)
try { const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); if (d) applyDiffs(d); } catch (e) {}
try { const t = localStorage.getItem('automon-balance-tab'); showTab(t === 'save' || Object.hasOwn(STEP_OF, t || '') ? t : 'grid'); } catch (e) { showTab('grid'); }
renderCharForm(); renderTribeForm(); refreshDirty();
(async () => {
  db = await window.claude?.use?.('db') ?? null;
  if (!db) return;
  db.doc('results/latest').get().then(r => { savedRes = cleanSavedRes(r.exists ? r.data() : null); if (savedRes && !lastRun && !$('tgrid').hidden && !$('view-pick').hidden) renderGrid(); }, () => {}); // batch 31
  db.collection('ideas').orderBy('at', 'desc').onSnapshot(snap => { renderIdeas(snap.docs); renderStageIdeas(); }, () => {});
  db.collection('simTeams').onSnapshot(snap => { presets = snap.docs.map(d => cleanPreset(d.id, d.data())).filter(Boolean).sort((a, b) => (a.at < b.at ? -1 : 1)).slice(0, PRESET_MAX); renderPresets(); }, () => {});
  db.collection('skillPicks').onSnapshot(snap => {
    const ids = new Set(CATALOG.map(x => x.id)); picks = {};
    for (const d of snap.docs) { const x = d.data() || {}; if (ids.has(d.id)) picks[d.id] = { want: x.want === true, note: typeof x.note === 'string' ? x.note.slice(0, 300) : '' }; }
    renderCatalog();
  }, () => {});
  // ชุด 35: ค่าที่แก้ (config/main) + สถานะหน้า (ui/main) · โหลดเมื่อที่บันทึกใหม่กว่าที่เครื่องนี้บันทึก/โหลดล่าสุด
  // และเครื่องนี้ไม่มีค่าที่แก้ค้างโดยยังไม่บันทึก (กันทับงานในเครื่อง) · ค่าทุกช่องตรวจก่อนใช้ (applyDiffs / applyUi)
  try {
    const [cs, us] = await Promise.all([db.doc('config/main').get(), db.doc('ui/main').get()]);
    const cfg = cs.exists ? cs.data() : null, ui = us.exists ? us.data() : null;
    const at = [ui && ui.at, cfg && cfg.savedAt].filter(x => typeof x === 'string').sort().pop();
    const sync = readSynced(), draft = JSON.stringify(diffs());
    const clean = draft === '{"chars":{},"tribes":{}}' || (sync && sync.draft === draft) && (!stageEdited() || same(stageCfg, cleanStage(cfg && cfg.stage))); // stage mode: unsaved rune/boss edits also block the load
    const sAt = cfg && typeof cfg.savedAt === 'string' ? cfg.savedAt : '', sRev = cleanRev(cfg && cfg.rev);
    if (sync) { cfgRev = sync.rev || (sAt && sAt <= sync.at ? sRev : 0); showCfgVer(cfgRev, sync.at); }
    if (at && (!sync || at > sync.at)) {
      if (clean) {
        cfgRev = sRev; showCfgVer(sRev, sAt);
        if (cfg) { applyDiffs(cfg); renderCharForm(); renderTribeForm(); if (!$('pane-rules').hidden) renderRulesForm(); refreshDirty(); stageCfg = cleanStage(cfg.stage); if (!$('pane-stage').hidden) renderStage(); else stageChanged(); }
        if (ui) applyUi(ui);
        markSynced(at); saveMsg('โหลดสิ่งที่บันทึกไว้แล้ว');
      } else { if (sAt) showCfgVer(sync && sync.rev, sync && sync.at, { rev: sRev, at: sAt }); saveMsg('เครื่องนี้มีค่าที่แก้แต่ยังไม่บันทึก จึงใช้ของในเครื่อง · กด 💾 เพื่อบันทึกทับ'); }
    }
  } catch (e) {}
})();
