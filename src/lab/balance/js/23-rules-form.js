// ---------- set 76: แท็บ "กฎเกม" · ค่ากฎทั้งเกม (RULE_SPEC ใน core/rules.js) ----------
// Editable values change RULES live (applyRulesLive) · locked ones are shown with the reason · saved with 💾 as config.rules
// set 90 (UI): group chips + search, edited-count badges, "เดิม X" under changed inputs, per-group reset,
// shop odds as a level × rarity table with row totals, round→shop level as a compact strip, locked rules folded.
const ruleShow = (v, op) => (op.bool ? (v ? 1 : 0) : op.scale ? +(v / op.scale).toFixed(3) : v);
const ruleShowTxt = v => (Array.isArray(v) ? v.join(' / ') : String(v));
const RULE_CHIP = { storm: 'ช่วงต่อเวลา', burn: 'ไฟ', fight: 'การสู้', boss: 'จังหวะบอส', shop: 'ร้าน / run', shopLv: 'ระดับร้านตามรอบ', shopOdds: 'โอกาสเจอ', power: 'งบพลัง', lock: '🔒 ล็อก' };
const RULE_HINT = {
  storm: 'ช่วงต่อเวลา (แทนพายุทราย ชุด 98): เริ่มเมื่อแมตช์ยาวถึงเวลาที่ตั้ง แล้วเพิ่ม 1 สแตกทุกช่วง · ทุกสแตก ดาเมจทุกแบบ + และตีเร็วขึ้น + · ฟื้น HP และเกราะที่ได้ใหม่ − (หยุดที่ 100%) · % ต่อสแตก: ช่วงแรก → ช่วงสอง → หลังจากนั้น (ไม่มีเพดาน) · เกราะที่มีอยู่แล้วไม่ลด',
  boss: 'จังหวะเวลาของกฎบอสที่เดิมฝังไว้ (ความแรงของแต่ละกฎปรับในแท็บ รูน / บอส) · ชื่อกฎในแท็บบอสแสดงเวลาใหม่หลังนำค่าเข้าเกม',
  shop: 'ราคาเปลี่ยน = ราคาตัวละครทุกตัวในระดับนั้นเปลี่ยนตาม',
  shopLv: 'ช่องละ 1 รอบ · ใส่ระดับร้านของรอบนั้น · ช่องสุดท้ายใช้กับทุกรอบหลังจากนั้น',
  shopOdds: 'แถวละ 1 ระดับร้าน · ตัวเลขเทียบกันเองในแถว (รวมไม่ถึง 100 ก็ได้) · ถ้ารวมไม่เท่า 100 ช่อง "รวม" จะบอกโอกาสจริงหลังคิดสัดส่วนให้',
  power: 'ใช้คิด "แต้มพลัง" ที่แสดงในฟอร์มตัวละครเท่านั้น ไม่มีผลกับการต่อสู้',
  lock: 'ค่าโครงสร้างของเกมและตัวกันพัง ล็อกไว้ก่อน · ถ้าอยากเปลี่ยนข้อไหนบอก Claude ในแชท',
};
let ruleView = 'all', ruleQuery = '';
const ruleGroupOf = path => (RULE_SPEC.find(x => x[0] === path) || [])[5];
const ruleEditCount = g => Object.keys(ruleEdits).filter(p => ruleGroupOf(p) === g).length;
function ruleInput(path, lo, hi, op, label) {
  const i = document.createElement('input');
  i.type = 'number'; i.id = 'rule-' + path.replace(/\./g, '-'); i.min = lo; i.max = hi; i.dataset.path = path;
  i.step = op.bool || op.int ? 1 : op.step || 1; i.inputMode = op.bool || op.int ? 'numeric' : 'decimal';
  if (label) i.setAttribute('aria-label', label);
  const base = ruleShow(ruleGet(RULES_BASE, path), op), was = el('small', 'rwas', `เดิม ${base}`);
  const mark = () => { const ch = Number(i.value) !== base; i.classList.toggle('changed', ch); was.hidden = !ch; };
  i.value = ruleShow(ruleGet(RULES, path), op); i.title = `ค่าในเกมตอนนี้ ${base} · ปรับได้ ${lo}–${hi}`; mark();
  i.addEventListener('change', () => {
    let v = Number(i.value);
    if (!Number.isFinite(v) || v < lo || v > hi || ((op.int || op.bool) && !Number.isInteger(v))) { i.value = ruleShow(ruleGet(RULES, path), op); $('ruleMsg').textContent = `ค่าต้องอยู่ระหว่าง ${lo}–${hi}${op.int || op.bool ? ' (จำนวนเต็ม)' : ''}`; return; }
    if (op.scale) v = Math.round(v * op.scale);
    if (v === (op.bool ? (ruleGet(RULES_BASE, path) ? 1 : 0) : ruleGet(RULES_BASE, path))) delete ruleEdits[path]; else ruleEdits[path] = v;
    $('ruleMsg').textContent = '';
    applyRulesLive(); mark(); renderCharForm(); refreshDirty(); ruleSummary();
  });
  return { i, was };
}
function ruleField(path, label, lo, hi, unit, op) {
  const txt = `${label}${unit ? ` (${unit})` : ''}`;
  if (op.lock) {
    const f = el('div', 'fld rlock', ''); f.title = op.lock; f.dataset.find = txt;
    f.append(el('span', '', txt), el('b', 'mono', '🔒 ' + ruleShowTxt(ruleGet(RULES, path))), el('small', '', op.lock));
    return f;
  }
  const { i, was } = ruleInput(path, lo, hi, op), f = fld(txt, i); f.append(was); f.dataset.find = txt;
  return f;
}
// shop.roundLevels: one small cell per round
function ruleLvStrip(items) {
  const g = el('div', 'rlv', '');
  items.forEach(([path, label, lo, hi, , , op], k) => {
    const last = k === items.length - 1, { i, was } = ruleInput(path, lo, hi, op, label);
    const c = el('label', 'fld rlvc', ''); c.dataset.find = label + ' ' + `รอบ ${k + 1}`;
    c.append(el('span', '', `รอบ ${k + 1}${last ? '+' : ''}`), i, was); g.append(c);
  });
  return g;
}
// shop.levelOdds.<lv>.<rarity>: table, one row per shop level + real % after normalising
function ruleOddsTable(items) {
  const wrap = el('div', 'rtwrap', ''), t = el('table', 'rodds', ''), hr = el('tr', '', '');
  hr.append(el('th', '', 'ร้าน'), ...RARITIES.map(r => el('th', '', r.replace(/^ไม่/, 'ไม่\u200b').replace(/(.)มาก$/, '$1\u200bมาก'))), el('th', '', 'รวม'));
  const head = el('thead', '', ''); head.append(hr); const body = el('tbody', '', ''); t.append(head, body);
  const rows = new Map();
  for (const it of items) { const lv = Number(it[0].split('.')[2]); if (!rows.has(lv)) rows.set(lv, []); rows.get(lv).push(it); }
  for (const [lv, its] of rows) {
    const tr = el('tr', '', ''); tr.dataset.find = `ร้าน Lv${lv + 1} โอกาสเจอ ` + RARITIES.join(' ');
    tr.append(el('th', '', `Lv${lv + 1}`));
    for (const [path, label, lo, hi, , , op] of its) { const td = el('td', '', ''), { i, was } = ruleInput(path, lo, hi, op, label); td.append(i, was); tr.append(td); }
    const sum = el('td', 'rsum mono', ''); sum.dataset.lv = lv; tr.append(sum); body.append(tr);
  }
  wrap.append(t); return wrap;
}
function ruleOddsSums() {
  for (const td of document.querySelectorAll('#rform .rsum')) {
    const o = RULES.shop.levelOdds[Number(td.dataset.lv)] || {}, tot = RARITIES.reduce((s, r) => s + (o[r] || 0), 0);
    td.textContent = !tot ? 'รวม 0 = ไม่มีตัวเลย' : tot === 100 ? '100' : `${tot}\nจริง ${RARITIES.map(r => (o[r] ? Math.round(o[r] * 100 / tot) : '·')).join(' / ')}`;
    td.classList.toggle('bad', !tot);
  }
}
function ruleSummary() {
  const n = Object.keys(ruleEdits).length;
  $('ruleDirty').textContent = n ? `แก้แล้ว ${n} ค่า · ยังไม่เข้าเกมจนกว่าจะกด 💾 แล้วบอก Claude` : 'ยังไม่ได้แก้ (ค่าที่แสดง = ค่าในเกม)';
  $('ruleReset').disabled = !n;
  for (const b of document.querySelectorAll('#ruleChips button')) {
    const g = b.dataset.g, c = g === 'all' ? n : ruleEditCount(g), s = b.querySelector('.sb');
    s.textContent = c || ''; s.hidden = !c;
  }
  for (const sec of document.querySelectorAll('#rform .rsec')) {
    const c = ruleEditCount(sec.dataset.g);
    sec.querySelector('.rbadge').textContent = c ? `แก้ ${c}` : ''; sec.querySelector('.rbadge').hidden = !c;
    const r = sec.querySelector('.rreset'); if (r) r.hidden = !c;
  }
  ruleOddsSums();
}
// show/hide by chip + search text
function ruleFilter() {
  const q = ruleQuery.trim().toLowerCase(); let shown = 0;
  for (const sec of document.querySelectorAll('#rform .rsec')) {
    let hit = 0;
    for (const f of sec.querySelectorAll('[data-find]')) { const ok = !q || f.dataset.find.toLowerCase().includes(q); f.hidden = !ok; if (ok) hit++; }
    const titleHit = q && sec.dataset.title.toLowerCase().includes(q);
    if (titleHit) for (const f of sec.querySelectorAll('[data-find]')) { f.hidden = false; hit++; }
    const on = q ? hit > 0 : (ruleView === 'all' || ruleView === sec.dataset.g);
    sec.hidden = !on; if (on) shown++;
    const d = sec.querySelector('details'); if (d && (q || ruleView === 'lock')) d.open = true;
  }
  $('ruleNone').hidden = shown > 0;
  for (const b of document.querySelectorAll('#ruleChips button')) b.setAttribute('aria-pressed', String(!q && b.dataset.g === ruleView));
}
function renderRuleTools() {
  const chips = $('ruleChips'); chips.replaceChildren();
  for (const [g, label] of [['all', 'ทั้งหมด'], ...RULE_GROUPS.filter(([g]) => RULE_SPEC.some(x => x[5] === g)).map(([g]) => [g, RULE_CHIP[g] || g])]) {
    const b = el('button', '', ''); b.type = 'button'; b.dataset.g = g; b.id = 'rchip-' + g;
    b.append(document.createTextNode(label), el('b', 'sb', ''));
    b.addEventListener('click', () => { ruleView = g; ruleQuery = ''; $('ruleFind').value = ''; ruleFilter(); });
    chips.append(b);
  }
}
function renderRulesForm() {
  if (!$('ruleChips').childElementCount) renderRuleTools();
  const box = $('rform'); box.replaceChildren();
  for (const [g, title] of RULE_GROUPS) {
    const items = RULE_SPEC.filter(x => x[5] === g); if (!items.length) continue;
    const sec = el('div', 'subsec rsec', ''); sec.dataset.g = g; sec.dataset.title = title; sec.id = 'rsec-' + g;
    const head = el('div', 'rhead', ''), rs = el('button', 'rreset', 'คืนค่าหมวดนี้'); rs.type = 'button';
    rs.addEventListener('click', () => { for (const p of Object.keys(ruleEdits)) if (ruleGroupOf(p) === g) delete ruleEdits[p]; applyRulesLive(); renderRulesForm(); renderCharForm(); refreshDirty(); });
    head.append(el('h3', '', (g === 'lock' ? '🔒 ' : '') + title), el('span', 'rbadge', ''));
    if (g !== 'lock') head.append(rs);
    let body;
    if (g === 'shopLv') body = ruleLvStrip(items);
    else if (g === 'shopOdds') body = ruleOddsTable(items);
    else { body = el('div', 'fgrid rgrid', ''); for (const [path, label, lo, hi, unit, , op] of items) body.append(ruleField(path, label, lo, hi, unit, op)); }
    if (g === 'lock') {
      const d = document.createElement('details'), s = document.createElement('summary');
      s.textContent = `ดูค่าที่ล็อกไว้ (${items.length} ข้อ)`; d.append(s, el('p', 'hint', RULE_HINT.lock), body);
      sec.append(head, d);
    } else {
      sec.append(head); if (RULE_HINT[g]) sec.append(el('p', 'hint', RULE_HINT[g])); sec.append(body);
    }
    box.append(sec);
  }
  ruleSummary(); ruleFilter();
}
$('ruleReset').addEventListener('click', () => { ruleEdits = {}; applyRulesLive(); renderRulesForm(); renderCharForm(); refreshDirty(); });
$('ruleFind').addEventListener('input', e => { ruleQuery = e.target.value; ruleFilter(); });
