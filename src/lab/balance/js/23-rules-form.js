// ---------- set 76: แท็บ "กฎเกม" · ค่ากฎทั้งเกม (RULE_SPEC ใน core/rules.js) ----------
// Editable values change RULES live (applyRulesLive) · locked ones are shown with the reason · saved with 💾 as config.rules
const ruleShow = (v, op) => (op.bool ? (v ? 1 : 0) : op.scale ? +(v / op.scale).toFixed(3) : v);
const ruleShowTxt = v => (Array.isArray(v) ? v.join(' / ') : String(v));
function ruleInput(path, lo, hi, op) {
  const i = document.createElement('input');
  i.type = 'number'; i.id = 'rule-' + path.replace(/\./g, '-'); i.min = lo; i.max = hi;
  i.step = op.bool || op.int ? 1 : op.step || 1; i.inputMode = op.bool || op.int ? 'numeric' : 'decimal';
  const base = ruleShow(ruleGet(RULES_BASE, path), op), mark = () => i.classList.toggle('changed', Number(i.value) !== base);
  i.value = ruleShow(ruleGet(RULES, path), op); i.title = `ค่าในเกมตอนนี้ ${base} · ปรับได้ ${lo}–${hi}`; mark();
  i.addEventListener('change', () => {
    let v = Number(i.value);
    if (!Number.isFinite(v) || v < lo || v > hi || ((op.int || op.bool) && !Number.isInteger(v))) { i.value = ruleShow(ruleGet(RULES, path), op); $('ruleMsg').textContent = `ค่าต้องอยู่ระหว่าง ${lo}–${hi}${op.int || op.bool ? ' (จำนวนเต็ม)' : ''}`; return; }
    if (op.scale) v = Math.round(v * op.scale);
    if (v === (op.bool ? (ruleGet(RULES_BASE, path) ? 1 : 0) : ruleGet(RULES_BASE, path))) delete ruleEdits[path]; else ruleEdits[path] = v;
    $('ruleMsg').textContent = '';
    applyRulesLive(); mark(); renderCharForm(); refreshDirty(); ruleSummary();
  });
  return i;
}
function ruleSummary() {
  const n = Object.keys(ruleEdits).length;
  $('ruleDirty').textContent = n ? `แก้แล้ว ${n} ค่า · ยังไม่เข้าเกมจนกว่าจะกด 💾 แล้วบอก Claude` : 'ยังไม่ได้แก้ (ค่าที่แสดง = ค่าในเกม)';
  $('ruleReset').disabled = !n;
}
function renderRulesForm() {
  const box = $('rform'); box.replaceChildren();
  for (const [g, title] of RULE_GROUPS) {
    const items = RULE_SPEC.filter(x => x[5] === g); if (!items.length) continue;
    const sec = el('div', 'subsec', ''); sec.style.cssText = 'display:grid;gap:8px';
    sec.append(el('h3', '', (g === 'lock' ? '🔒 ' : '') + title));
    if (g === 'storm') sec.append(el('p', 'hint', 'พายุทรายเริ่มเมื่อแมตช์ยาวถึงเวลาที่ตั้ง แล้วตีทุกตัวที่ยังสู้ได้ตามรอบ · ดาเมจครั้งที่ N = ดาเมจครั้งแรก × ตัวคูณ^(N−1) · ตัวคูณ 1 = ดาเมจเท่าเดิมทุกครั้ง'));
    if (g === 'boss') sec.append(el('p', 'hint', 'จังหวะเวลาของกฎบอสที่เดิมฝังไว้ (ความแรงของแต่ละกฎปรับในแท็บ รูน / บอส) · ชื่อกฎในแท็บบอสแสดงเวลาใหม่หลังนำค่าเข้าเกม'));
    if (g === 'shop') sec.append(el('p', 'hint', 'ราคาเปลี่ยน = ราคาตัวละครทุกตัวในระดับนั้นเปลี่ยนตาม · โอกาสสุ่มเจอเป็นน้ำหนัก (เทียบกันเอง ไม่ต้องรวมได้ 100)'));
    if (g === 'power') sec.append(el('p', 'hint', 'ใช้คิด "แต้มพลัง" ที่แสดงในฟอร์มตัวละครเท่านั้น ไม่มีผลกับการต่อสู้'));
    if (g === 'lock') sec.append(el('p', 'hint', 'ค่าโครงสร้างของเกมและตัวกันพัง ล็อกไว้ก่อน · ถ้าอยากเปลี่ยนข้อไหนบอก Claude ในแชท'));
    const grid = el('div', 'fgrid rgrid', '');
    for (const [path, label, lo, hi, unit, , op] of items) {
      if (op.lock) {
        const f = el('div', 'fld rlock', ''); f.title = op.lock;
        f.append(el('span', '', `${label}${unit ? ` (${unit})` : ''}`), el('b', 'mono', '🔒 ' + ruleShowTxt(ruleGet(RULES, path))), el('small', '', op.lock));
        grid.append(f);
      } else grid.append(fld(`${label}${unit ? ` (${unit})` : ''}`, ruleInput(path, lo, hi, op)));
    }
    sec.append(grid); box.append(sec);
  }
  ruleSummary();
}
$('ruleReset').addEventListener('click', () => { ruleEdits = {}; applyRulesLive(); renderRulesForm(); renderCharForm(); refreshDirty(); });
