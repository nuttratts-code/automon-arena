// ---------- ค่าที่แก้ (เก็บเป็นส่วนต่างจากค่าตั้งต้น) ----------
function diffs() {
  const out = { chars: {}, tribes: {} };
  chars.forEach((c, i) => {
    const b = BASE_CHARS[i], d = {};
    for (const [k] of LV_FIELDS) if (!same(c[k], b[k])) d[k] = c[k];
    for (const [k] of ONE_FIELDS) if (c[k] !== b[k]) d[k] = c[k];
    for (const k of ['name', 'rarity', 'tribe', 'rowHint']) if (c[k] !== b[k]) d[k] = c[k];
    if (!same(c.extraTribes, b.extraTribes)) d.extraTribes = c.extraTribes;
    if (!same(c.skills, b.skills)) d.skills = c.skills;
    if (Object.keys(d).length) out.chars[c.id] = d;
  });
  for (const t of Object.keys(tribes)) if (!same(tribes[t], BASE_TRIBES[t])) out.tribes[t] = tribes[t];
  if (Object.keys(ruleEdits).length) out.rules = { ...ruleEdits }; // set 76: only when edited (keeps old saves/drafts the same shape)
  return out;
}
// ชื่อจากผู้ใช้/ที่เก็บ: ตัดอักขระควบคุมและ < > ออก ตัดช่องว่างหัวท้าย ยาวไม่เกิน NAME_MAX · ว่าง = ไม่รับ
const cleanName = v => String(v).replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, NAME_MAX);
const num = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
const arr3 = (v, lo, hi) => Array.isArray(v) && v.length === 3 && v.every(x => num(x, lo, hi));
// สกิลจากที่เก็บ: รับเฉพาะเงื่อนไข/ผล/เป้าที่เกมรู้จัก และตัวเลขในช่วงที่สมเหตุสมผล · ไม่ผ่าน = undefined
function cleanSkill(o) {
  if (!o || typeof o !== 'object') return undefined;
  o = upgradeSkill(o); // ร่างเก่า: ผลที่ฝังค่าในชื่อ → แบบ % ของ · แบ่งเกราะ self → ทั้งทีม (ชุด 7)
  const has = (obj, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(obj, k);
  if (!has(SKILL_SPEC, o.when) || !has(SKILL_SPEC[o.when], o.do) || !SKILL_SPEC[o.when][o.do].includes(o.to) || !arr3(o.v, 0, 1e6)) return undefined;
  const s = { when: o.when, do: o.do, to: o.to, v: o.v.slice() };
  if (num(o.cd, 100, RULES.skillCdMaxMs)) s.cd = Math.round(o.cd / 100) * 100;
  if (Array.isArray(o.lv) && o.lv.length && o.lv.length < 3 && o.lv.every(x => [1, 2, 3].includes(x)) && new Set(o.lv).size === o.lv.length) s.lv = o.lv.slice().sort();
  if (num(o.chance, 1, 99)) s.chance = Math.round(o.chance);
  const tg = cleanTags(o.tags); if (tg.length) s.tags = tg;
  if (s.do === 'summon' && typeof o.summon === 'string' && BASE_CHARS.some(c => c.id === o.summon)) s.summon = o.summon;
  if (DO_INFO[s.do].of) { const x = o.of; if (!x || typeof x !== 'object' || !OF_STATS.includes(x.stat) || !OF_WHO.includes(x.who)) return undefined; s.of = { stat: x.stat, who: x.who }; }
  if (o.perm === true && !isShopWhen(s.when) && DO_INFO[s.do].perm) s.perm = true; // ถาวร (22 ต.ค.)
  if (s.to === 'allyAt') { const a = o.at; if (!a || typeof a !== 'object' || !AT_ROWS.includes(a.row) || !AT_LANES.includes(a.lane)) return undefined; s.at = { row: a.row, lane: a.lane }; } // ชุด 14
  if (o.sameTribe === true && sameTribeOk(s)) s.sameTribe = true;
  if (o.skipSameId === true && skipSameIdOk(s)) s.skipSameId = true; // ชุด 17
  if (s.cd && Number.isInteger(o.cdGrow) && o.cdGrow >= 1 && o.cdGrow <= RULES.cdGrowMax) s.cdGrow = o.cdGrow; // ชุด 17
  return s;
}
function cleanSkills(list) {
  if (!Array.isArray(list) || list.length > 6) return undefined;
  const out = list.map(cleanSkill);
  return out.every(Boolean) ? out : undefined;
}
// ข้อมูลจากที่เก็บถือว่าไม่น่าเชื่อถือ: รับเฉพาะช่องที่รู้จักและตัวเลขในช่วงที่สมเหตุสมผล
function applyDiffs(d) {
  chars = clone(BASE_CHARS); tribes = clone(BASE_TRIBES);
  ruleEdits = d && typeof d === 'object' ? cleanRuleEdits(d.rules) : {}; applyRulesLive();
  if (!d || typeof d !== 'object') return;
  for (const [id, o] of Object.entries(d.chars || {})) {
    const c = chars.find(x => x.id === id);
    if (!c || !o || typeof o !== 'object') continue;
    for (const [k] of LV_FIELDS) if (arr3(o[k], 0, 1e6)) c[k] = o[k].slice();
    for (const [k] of ONE_FIELDS) if (num(o[k], 0, 1e6)) c[k] = o[k];
    if (typeof o.rarity === 'string' && RARITIES.includes(o.rarity)) { c.rarity = o.rarity; c.price = RULES.shop.prices[o.rarity]; }
    if (typeof o.name === 'string') { const n = cleanName(o.name); if (n) c.name = n; }
    if (typeof o.tribe === 'string' && TRIBES.includes(o.tribe)) c.tribe = o.tribe;
    if (Array.isArray(o.extraTribes) && o.extraTribes.length <= 1 && o.extraTribes.every(t => TRIBES.includes(t) && t !== c.tribe)) c.extraTribes = o.extraTribes.slice();
    if (typeof o.rowHint === 'string' && ROW_HINTS.includes(o.rowHint)) c.rowHint = o.rowHint;
    if ('skills' in o) { const sk = cleanSkills(o.skills); if (sk !== undefined) c.skills = sk; }
  }
  for (const [t, o] of Object.entries(d.tribes || {})) {
    if (!tribes[t] || !o || typeof o !== 'object') continue;
    for (const k of Object.keys(tribes[t])) if (arr3(o[k], 0, 1000)) tribes[t][k] = o[k].slice();
  }
}
function countEdits(d) { return Object.values(d.chars).reduce((a, o) => a + Object.keys(o).length, 0) + Object.keys(d.tribes).length + Object.keys(d.rules || {}).length; }
function refreshDirty() {
  const d = diffs(), n = countEdits(d);
  const ids = Object.keys(d.chars).filter(id => Object.keys(d.chars[id]).length), tN = Object.keys(d.tribes).length;
  if (!n) $('dirty').textContent = 'ยังไม่ได้แก้ค่า (ค่าที่แสดง = ค่าในเกม)';
  else {
    const parts = [];
    if (ids.length) parts.push(`${ids.length} ตัว (${ids.slice(0, 6).join(' ')}${ids.length > 6 ? ' …' : ''})`);
    if (tN) parts.push(`โบนัสเผ่า ${tN} ค่า`);
    if (d.rules) parts.push(`กฎเกม ${Object.keys(d.rules).length} ค่า`);
    $('dirty').replaceChildren('แก้แล้ว ', el('b', '', parts.join(' · ')), ` · รวม ${n} จุด · ยังไม่ได้ส่งจนกว่าจะกด "บันทึกให้ Claude"`);
  }
  const v = validateConfig(chars, rulesNow());
  $('errs').replaceChildren(...v.errors.map(e => { const li = document.createElement('li'); li.textContent = e; return li; }));
  $('errs').hidden = v.ok; $('analyze').disabled = !v.ok;
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(diffs())); } catch (e) {}
  if (!$('pane-list').hidden && !listEdit) renderList(); // ภาพรวมแสดงค่าที่แก้ล่าสุด (โหมดแก้: แถวอัปเดตตัวเอง ไม่วาดใหม่)
  if (!$('tgrid').hidden && !$('view-pick').hidden) renderGrid();
  refreshSteps(d, v.ok);
  if (!$('pane-sim').hidden && !simShowingBattle) renderSimInfo();
  if (comboOn && simLast && !$('simAuto').checked) markSimStale();
  if (comboOn && simLast && $('simAuto').checked && !$('pane-sim').hidden) { clearTimeout(simTimer); simTimer = setTimeout(() => { if (v.ok) runSim(true); else $('simMsg').textContent = 'ค่าที่แก้ยังผิด (ดูรายการสีแดงด้านบน) จึงยังไม่จำลองใหม่'; }, 450); }
}

