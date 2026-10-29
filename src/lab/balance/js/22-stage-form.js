// ---------- Stage mode (demo) phase 1, 29 Oct: runes / bosses / stage settings (core/stage.js) ----------
// Saved inside config/main as `stage` (full cleaned object) · local draft in its own key · no battle effect yet.
const STAGE_DRAFT_KEY = 'automon-balance-stage-v1';
const STAGE_BASE = stageDefaults();
let stageCfg = cleanStage(null), stagePart = 'runes';
try { const d = JSON.parse(localStorage.getItem(STAGE_DRAFT_KEY) || 'null'); if (d) stageCfg = cleanStage(d); } catch (e) {}
const stageEdited = () => !same(stageCfg, STAGE_BASE);
function stageCount() {
  let n = 0;
  for (const r of STAGE_RUNES) for (const k of Object.keys(stageCfg.runes[r.id])) if (stageCfg.runes[r.id][k] !== STAGE_BASE.runes[r.id][k]) n++;
  for (const k of Object.keys(stageCfg.settings)) if (stageCfg.settings[k] !== STAGE_BASE.settings[k]) n++;
  if (!same(stageCfg.bosses, STAGE_BASE.bosses)) n += Math.max(1, stageCfg.bosses.filter(b => { const o = STAGE_BASE.bosses.find(x => x.id === b.id); return !o || !same(o, b); }).length + Math.max(0, STAGE_BASE.bosses.length - stageCfg.bosses.length));
  return n;
}
function stageChanged() {
  try { localStorage.setItem(STAGE_DRAFT_KEY, JSON.stringify(stageCfg)); } catch (e) {}
  const n = stageCount();
  $('stgDirty').textContent = n ? `แก้แล้ว ${n} จุด · ยังไม่ได้ส่งจนกว่าจะกด 💾 บันทึกให้ Claude` : 'ยังไม่ได้แก้ (ค่าที่แสดง = ค่าเสนอเริ่มต้น)';
}
const stageNum = (id, v, base, lo, hi, set, step = 1) => {
  const i = numInput(id, v, base, x => { const y = Math.min(hi, Math.max(lo, x)); set(y); if (y !== x) i.value = y; stageChanged(); renderStageSay(); }, step);
  i.min = lo; i.max = hi; return i;
};
const stageSayEls = [];
function runeSay(r) { const x = stageCfg.runes[r.id]; return r.text.replace(/\{(\w+)\}/g, (_, k) => String(x[k])); }
function renderStageSay() { for (const [e, f] of stageSayEls) e.textContent = f(); }
function stageOnBox(id, on, set) {
  const l = el('label', 'status'), c = document.createElement('input'); c.type = 'checkbox'; c.id = id; c.checked = on;
  c.addEventListener('change', () => { set(c.checked); stageChanged(); renderStageIdeaFor(); });
  l.append(c, ' ใช้ใน demo'); return l;
}
function renderStageRunes(box) {
  for (const kind of ['team', 'unit']) {
    box.append(el('h3', '', kind === 'team' ? 'รูนทีม (ผลกับทั้งทีม)' : 'รูนตัวละคร (ใส่ให้ 1 ตัว ติดตัวนั้นไป)'));
    for (const r of STAGE_RUNES.filter(q => q.kind === kind)) {
      const x = stageCfg.runes[r.id], b = STAGE_BASE.runes[r.id];
      const card = el('div', 'subsec', ''); card.style.display = 'grid'; card.style.gap = '6px';
      const head = el('div', 'row', ''); head.append(el('b', '', `${r.id} ${r.name}`), el('span', 'grow', ''), stageOnBox(`stg-on-${r.id}`, x.on, v => { x.on = v; }));
      const say = el('div', 'desc', ''); stageSayEls.push([say, () => runeSay(r)]);
      const row = el('div', 'row', '');
      for (const [k, label, , lo, hi, unit] of r.f) { const l = el('label', 'status', `${label}${unit ? ` (${unit})` : ''} `); l.append(stageNum(`stg-${r.id}-${k}`, x[k], b[k], lo, hi, v => { x[k] = v; })); row.append(l); }
      card.append(head, say, row); box.append(card);
    }
  }
}
function renderStageBosses(box) {
  box.append(el('p', 'hint', 'ค่าบอส = ตอนเจอครั้งแรก (ด่าน 5) · ด่าน 10 = × ตัวคูณ · หลังด่าน 10 บอสแต่ละตัวแรงขึ้นอีก % · สกิลพิเศษของบอส ส่งเป็นไอเดียด้านล่างก่อน (ขั้นที่ 2 Claude ทำให้ใช้ได้จริง) · เทียบ: ผู้เล่นค่ากลางด่าน 5 ตี ~7/วิ HP ทีม ~756 · ด่าน 10 ตี ~14/วิ HP ~1140'));
  stageCfg.bosses.forEach((bs, idx) => {
    const base = STAGE_BASE.bosses.find(x => x.id === bs.id) || bs;
    const card = el('div', 'subsec', ''); card.style.display = 'grid'; card.style.gap = '6px';
    const head = el('div', 'row', '');
    const nm = document.createElement('input'); nm.type = 'text'; nm.id = `stg-${bs.id}-name`; nm.maxLength = 24; nm.value = bs.name;
    nm.addEventListener('change', () => { const v = cleanName(nm.value).slice(0, 24); if (v) bs.name = v; nm.value = bs.name; stageChanged(); renderStageIdeaFor(); });
    const del = el('button', '', 'ลบ'); del.type = 'button'; del.disabled = stageCfg.bosses.length <= 1;
    del.addEventListener('click', () => { stageCfg.bosses.splice(idx, 1); stageChanged(); renderStage(); });
    head.append(el('b', '', bs.id), nm, tribeBadge(bs.tribe), selectInput(`stg-${bs.id}-tribe`, TRIBES.map(t => [t, t]), bs.tribe, v => { bs.tribe = v; stageChanged(); renderStage(); }), el('span', 'grow', ''), stageOnBox(`stg-on-${bs.id}`, bs.on, v => { bs.on = v; }), del);
    const row = el('div', 'row', '');
    for (const [k, label, lo, hi] of BOSS_STATS) { const l = el('label', 'status', `${label} `); l.append(stageNum(`stg-${bs.id}-${k}`, bs[k], base[k], lo, hi, v => { bs[k] = k === 'cdMs' ? Math.round(v / 100) * 100 : v; })); row.append(l); }
    const rr = el('div', 'row', ''); const rl = el('label', 'status', 'กฎพิเศษ ');
    rl.append(selectInput(`stg-${bs.id}-rule`, BOSS_RULES.map(r => [r[0], r[1]]), bs.rule, v => { const r = BOSS_RULES.find(q => q[0] === v); bs.rule = v; bs.ruleV = r[2]; stageChanged(); renderStage(); }));
    rr.append(rl);
    const rule = BOSS_RULES.find(r => r[0] === bs.rule);
    if (rule && rule[4]) { const l = el('label', 'status', `ค่า (${rule[5]}) `); l.append(stageNum(`stg-${bs.id}-ruleV`, bs.ruleV, base.rule === bs.rule ? base.ruleV : rule[2], rule[3], rule[4], v => { bs.ruleV = v; })); rr.append(l); }
    const gr = el('div', 'row', '');
    const g1 = el('label', 'status', 'ด่าน 10 ×'); g1.append(stageNum(`stg-${bs.id}-mult10`, bs.mult10, base.mult10, 0.1, 20, v => { bs.mult10 = v; }, 0.1));
    const g2 = el('label', 'status', 'หลังด่าน 10 แรงขึ้น/ตัว (%)'); g2.append(stageNum(`stg-${bs.id}-endlessPct`, bs.endlessPct, base.endlessPct, 0, 500, v => { bs.endlessPct = v; }));
    gr.append(g1, g2);
    const say = el('div', 'desc', '');
    stageSayEls.push([say, () => [1, 2, 3, 4].map(k => { const s = bossAt(bs, k); return `บอสครั้งที่ ${k} (ด่าน ${k * stageCfg.settings.bossEvery}): HP ${s.hp} ตี ${fmt(s.dps)}/วิ`; }).join(' · ')]);
    card.append(head, row, rr, gr, say); box.append(card);
  });
  const add = el('button', '', '+ เพิ่มบอส'); add.type = 'button'; add.disabled = stageCfg.bosses.length >= 12;
  add.addEventListener('click', () => {
    let n = 1; while (stageCfg.bosses.some(b => b.id === 'B' + n)) n++;
    stageCfg.bosses.push(cleanStage({ bosses: [{ id: 'B' + n }] }).bosses[0]); stageChanged(); renderStage();
  });
  box.append(add);
}
function renderStageSettings(box) {
  const g = el('div', 'row', ''); g.style.flexWrap = 'wrap';
  for (const [k, label, , lo, hi, unit] of STAGE_SETTINGS) { const l = el('label', 'status', `${label} (${unit}) `); l.append(stageNum(`stg-set-${k}`, stageCfg.settings[k], STAGE_BASE.settings[k], lo, hi, v => { stageCfg.settings[k] = v; })); g.append(l); }
  box.append(el('p', 'hint', 'หลังด่าน 10 (เล่นต่อ) ได้รูนจากบอสเท่านั้น · ไม่ได้รูน = ของรางวัลแทน: ง่าย เงิน · กลาง ค่าถาวร · ยาก ตัวหายาก (ผู้ใช้ตัดสิน 29 ต.ค.)'), g);
}
function renderStage() {
  stageSayEls.length = 0;
  for (const p of ['runes', 'bosses', 'settings']) $('stg-' + p).setAttribute('aria-pressed', String(p === stagePart));
  const box = $('stgBody'); box.replaceChildren();
  if (stagePart === 'runes') renderStageRunes(box); else if (stagePart === 'bosses') renderStageBosses(box); else renderStageSettings(box);
  renderStageSay(); stageChanged(); renderStageIdeaFor(); renderStageIdeas();
}
for (const p of ['runes', 'bosses', 'settings']) $('stg-' + p).addEventListener('click', () => { stagePart = p; renderStage(); });
// Ideas for runes / bosses go to the same `ideas` collection; `char` = "รูน T5 คม" / "บอส B1 ชื่อ" / "รูน (ใหม่)" / "บอส (ใหม่)".
function renderStageIdeaFor() {
  const sel = $('stgIdeaFor'), keep = sel.value;
  const opts = [['รูน (ใหม่)', 'รูนใหม่'], ['บอส (ใหม่)', 'บอสใหม่'], ...STAGE_RUNES.map(r => [`รูน ${r.id} ${r.name}`, `รูน ${r.id} ${r.name}`]), ...stageCfg.bosses.map(b => [`บอส ${b.id} ${b.name}`, `บอส ${b.id} ${b.name}`])];
  sel.replaceChildren(...opts.map(([v, l]) => new Option(l, v)));
  if (opts.some(o => o[0] === keep)) sel.value = keep;
}
const isStageIdea = x => typeof x.char === 'string' && /^(รูน|บอส)/.test(x.char);
function renderStageIdeas() {
  const list = $('stgIdeas');
  const mine = ideaDocs.map(d => d.data() || {}).filter(isStageIdea);
  if (!mine.length) { list.replaceChildren(el('li', 'status', 'ยังไม่มีไอเดียรูน / บอส')); return; }
  list.replaceChildren(...mine.map(x => {
    const li = el('li', 'idea', ''), meta = el('div', 'meta', '');
    const st = typeof x.status === 'string' ? x.status : 'รอ Claude';
    meta.append(cell(st, `pill ${IDEA_STATUS[st] || 'p-na'}`), cell(x.char), cell(typeof x.at === 'string' ? x.at.slice(0, 16).replace('T', ' ') : ''));
    li.append(meta, el('div', '', typeof x.text === 'string' ? x.text : '')); return li;
  }));
}
$('stgIdeaSend').addEventListener('click', async () => {
  const text = $('stgIdeaText').value.trim(), msg = t => { $('stgIdeaMsg').textContent = t; };
  if (!text) { msg('พิมพ์ไอเดียก่อนกดส่ง'); return; }
  if (!db) { msg('ส่งไม่ได้ในมุมมองนี้ (ต้องเปิดหน้าขณะล็อกอิน)'); return; }
  $('stgIdeaSend').disabled = true;
  try {
    await db.collection('ideas').add({ char: String($('stgIdeaFor').value).slice(0, 60), text: text.slice(0, 1000), status: 'รอ Claude', at: new Date().toISOString() });
    $('stgIdeaText').value = ''; msg('ส่งแล้ว · บอก Claude ในแชทได้เลยว่ามีไอเดียใหม่');
  } catch (e) { msg('ส่งไม่สำเร็จ: ' + (e && e.message ? e.message : 'ลองใหม่อีกครั้ง')); }
  $('stgIdeaSend').disabled = false;
});
