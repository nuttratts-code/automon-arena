// ---------- ฟอร์มตัวละคร ----------
function numInput(id, value, base, onChange, step = 1) {
  const i = document.createElement('input');
  i.type = 'number'; i.id = id; i.step = step; i.min = 0; i.value = value;
  i.inputMode = Number.isInteger(step) ? 'numeric' : 'decimal'; // ชุด 30.1: มือถือเปิดแป้นตัวเลข (ทศนิยมเฉพาะช่องที่รับทศนิยม)
  i.classList.toggle('changed', value !== base);
  i.title = `ค่าตั้งต้น ${base}`;
  i.addEventListener('change', () => {
    const v = Number(i.value);
    if (!Number.isFinite(v) || v < 0) { i.value = value; return; }
    onChange(v);
    i.classList.toggle('changed', v !== base);
  });
  return i;
}
function cell(text, cls) { const s = document.createElement('span'); s.textContent = text; if (cls) s.className = cls; return s; }
// ตัวเลือกตัวละครแบบมีสีเผ่า (dropdown ของเครื่องแสดงสี/รูปทรงไม่ได้) · จัดกลุ่มตามเผ่าหลัก
// กางลงจากที่เดิม (20 ต.ค.): แผงต่อท้ายแถบเดียวกับปุ่ม เต็มความกว้าง ยาวลงไปจนครบทุกตัว ไม่โดนขอบตัด · ค้นหาชื่อ/ID · กรองเผ่า (รวมเผ่าเพิ่ม)
// แผงต่อเข้าหน้าเฉพาะตอนเปิด และถอดออกตอนปิด · ข้อความใส่ด้วย textContent เท่านั้น
let openPicker = null, cpSeq = 0;
function charPicker(host, initial, onPick, opts = {}) {
  let value = initial, query = '', tribeF = '';
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'cp-btn'; btn.setAttribute('aria-haspopup', 'dialog'); btn.setAttribute('aria-expanded', 'false');
  const label = id => { const c = charOf(id); return c ? `${c.id} ${c.name}` : (opts.none || ''); };
  const paint = () => { btn.replaceChildren(); if (value) btn.append(charBadge(value)); btn.append(label(value), cell('▾', 'cp-caret')); };
  // แผงเลือก: หัว (ชื่อ + ปิด) · ค้นหา + กรองเผ่า · รายชื่อทั้งหมด
  const sheet = el('div', 'cp-sheet'), overlay = sheet;
  sheet.setAttribute('role', 'region');
  const title = el('h2', '', ''); title.id = `cp-title-${++cpSeq}`; sheet.setAttribute('aria-labelledby', title.id);
  const xBtn = el('button', '', 'ปิด ✕'); xBtn.type = 'button';
  const head = el('div', 'cp-head'); head.append(title, xBtn);
  const search = document.createElement('input');
  search.type = 'search'; search.className = 'cp-search'; search.maxLength = 30; search.placeholder = 'ค้นหาชื่อหรือ ID เช่น ไฟ, PL-3'; search.setAttribute('aria-label', 'ค้นหาตัวละคร');
  const tribeBar = el('div', 'cp-tribes'); tribeBar.setAttribute('role', 'group'); tribeBar.setAttribute('aria-label', 'กรองตามเผ่า');
  const tools = el('div', 'cp-tools'); tools.append(search, tribeBar);
  const list = el('div', 'cp-list'); list.setAttribute('role', 'listbox'); list.setAttribute('aria-labelledby', title.id);
  sheet.append(head, tools, list);
  const close = () => {
    if (!overlay.isConnected) return;
    overlay.remove();
    btn.setAttribute('aria-expanded', 'false'); if (openPicker === close) openPicker = null;
  };
  const choose = id => { value = id; paint(); close(); if (btn.isConnected) btn.focus(); onPick(id); };
  const item = (id, text, badge) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'cp-item'; b.setAttribute('role', 'option');
    if (badge) b.append(badge); b.append(text);
    b.addEventListener('click', () => choose(id));
    return b;
  };
  const build = () => {
    tribeBar.replaceChildren(...['', ...TRIBES].map(t => {
      const b = el('button', '', ''); b.type = 'button'; b.setAttribute('aria-pressed', String(t === tribeF));
      if (t) b.append(tribeBadge(t)); b.append(t || 'ทุกเผ่า');
      b.addEventListener('click', () => { tribeF = t; build(); });
      return b;
    }));
    const needle = query.trim().toLowerCase();
    const hit = c => !needle || `${c.id} ${c.name}`.toLowerCase().includes(needle);
    const out = [];
    if (opts.none && !needle && !tribeF) { const n = item('', opts.none); n.classList.add('cp-none'); n.setAttribute('aria-selected', String(!value)); out.push(n); }
    for (const t of tribeF ? [tribeF] : TRIBES) {
      const members = chars.filter(c => (tribeF ? c.tribe === t || c.extraTribes.includes(t) : c.tribe === t) && hit(c));
      if (!members.length) continue;
      const h = cell(`${t} · ${members.length} ตัว`, 'cp-group'); h.prepend(tribeBadge(t)); out.push(h);
      const grid = el('div', 'cp-grid');
      for (const c of members) {
        const it = item(c.id, `${c.id} ${c.name}`, tribeBadge(c.tribe, c.extraTribes));
        const r = rarityTag(c.rarity); r.classList.add('cp-rar'); it.append(r);
        it.setAttribute('aria-selected', String(c.id === value));
        grid.append(it);
      }
      out.push(grid);
    }
    if (!out.some(x => x.classList.contains('cp-grid'))) out.push(el('div', 'cp-empty', needle ? `ไม่พบตัวละครที่ตรงกับ "${query.trim().slice(0, 30)}"` : 'ไม่มีตัวละคร'));
    list.replaceChildren(...out);
  };
  search.addEventListener('input', () => { query = search.value; build(); });
  xBtn.addEventListener('click', close);
  // คลิกในแผงไม่ไปถึงตัวปิดอัตโนมัติของหน้า (คลิกนอกแผง = ปิด)
  overlay.addEventListener('click', e => e.stopPropagation());
  btn.addEventListener('click', () => {
    if (overlay.isConnected) { close(); return; }
    if (openPicker) openPicker();
    query = ''; search.value = ''; tribeF = '';
    title.textContent = (typeof opts.title === 'function' ? opts.title() : opts.title) || 'เลือกตัวละคร';
    build(); (host.parentElement || host).append(overlay); // ต่อท้ายแถบเดิม (แถบเป็น flex-wrap จึงขึ้นบรรทัดใหม่เต็มความกว้าง)
    btn.setAttribute('aria-expanded', 'true'); openPicker = close;
    // จอที่มีเมาส์: พร้อมพิมพ์ค้นหาทันที (ไม่เลื่อนหน้า) · จอสัมผัส: ไม่เด้งแป้นพิมพ์ขึ้นมาบังรายชื่อ
    if (matchMedia('(pointer: fine)').matches) search.focus({ preventScroll: true });
  });
  host.append(btn);
  paint();
  return { set(id) { value = id; paint(); }, value: () => value };
}
document.addEventListener('click', e => { if (openPicker && !e.target.closest('.cp') && !e.target.closest('.cp-sheet')) openPicker(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && openPicker) openPicker(); });

function describe(c) {
  return [`${c.tribe}${c.extraTribes.length ? ' + ' + c.extraTribes.join(', ') : ''}`, `ราคา ${c.price}`, `แถวแนะนำ ${rowHintTh(c.rowHint)}`, ].join(' · ');
}
function selectInput(id, options, value, onChange) {
  const sel = document.createElement('select');
  sel.id = id;
  for (const [v, label] of options) sel.append(new Option(label, v));
  sel.value = value;
  sel.addEventListener('change', () => onChange(sel.value));
  return sel;
}
// ตัวเลือกแบบจัดกลุ่ม: options = [[ค่า, ชื่อ, กลุ่ม]] เรียงกลุ่มตามที่พบครั้งแรก
function groupSelect(id, options, value, onChange) {
  const sel = document.createElement('select'); sel.id = id;
  const groups = new Map();
  for (const [v, label, g] of options) { if (!groups.has(g)) groups.set(g, []); groups.get(g).push(new Option(label, v)); }
  for (const [g, opts] of groups) { if (groups.size === 1) { sel.append(...opts); break; } const og = document.createElement('optgroup'); og.label = g; og.append(...opts); sel.append(og); }
  sel.value = value;
  sel.addEventListener('change', () => onChange(sel.value));
  return sel;
}
const TO_GROUP = t => (['self', 'target', 'attacker'].includes(t) ? 'ตัวเอง / เป้า / ผู้ตี' : /^(enemy|lowestHp|allEnemies)/.test(t) ? 'ศัตรู' : 'ฝ่ายเรา');
function renderCharForm() {
  const i = chars.findIndex(c => c.id === current), c = chars[i], b = BASE_CHARS[i];
  pickA.set(current);
  $('cdesc').textContent = `${c.id} ${c.name} · ${describe(c)}`;
  $('cdesc').prepend(charBadge(c.id), rarityTag(c.rarity), ' ');
  $('skRar').replaceChildren(rarityTag(c.rarity));
  const f = $('cform'); f.replaceChildren();
  // ความหายาก: ราคาเปลี่ยนตามความหายากอัตโนมัติ (ราคาผูกกับความหายาก ตาม shop-merge-rules)
  const rs = selectInput('f-rarity', RARITIES.map(r => [r, `${r} · ราคา ${RULES.shop.prices[r]}`]), c.rarity, v => {
    if (!RARITIES.includes(v)) return;
    c.rarity = v; c.price = RULES.shop.prices[v]; afterEdit();
  });
  rs.classList.toggle('changed', c.rarity !== b.rarity); rs.title = `ค่าตั้งต้น ${b.rarity}`;
  // ชื่อ: ตัดอักขระต้องห้าม ยาวไม่เกิน NAME_MAX · แก้แล้วไม่วาดฟอร์มใหม่ (ช่องที่กำลังพิมพ์ไม่หาย)
  const nm = document.createElement('input'); nm.type = 'text'; nm.id = 'f-name'; nm.maxLength = NAME_MAX; nm.value = c.name; nm.title = `ค่าตั้งต้น ${b.name}`;
  nm.classList.toggle('changed', c.name !== b.name);
  nm.addEventListener('change', () => { const n = cleanName(nm.value); if (!n) { nm.value = c.name; return; } c.name = nm.value = n; nm.classList.toggle('changed', n !== b.name); pickA.set(current); softEdit(); });
  const tr = selectInput('f-tribe', TRIBES.map(t => [t, t]), c.tribe, v => { if (!TRIBES.includes(v)) return; c.tribe = v; c.extraTribes = c.extraTribes.filter(x => x !== v); afterEdit(); });
  tr.classList.toggle('changed', c.tribe !== b.tribe);
  const ex = selectInput('f-extra', [['', 'ไม่มี'], ...TRIBES.filter(t => t !== c.tribe).map(t => [t, t])], c.extraTribes[0] || '', v => { if (v && (!TRIBES.includes(v) || v === c.tribe)) return; c.extraTribes = v ? [v] : []; afterEdit(); });
  ex.classList.toggle('changed', !same(c.extraTribes, b.extraTribes));
  // แถวแนะนำ (ชุด 11): ติ๊กได้หลายแถว ต้องเหลืออย่างน้อย 1 · ครบ 3 = ที่ไหนก็ได้
  const rh = el('div', 'row lvbox'), ROWN = ['หน้า', 'กลาง', 'หลัง'], cur = rowsOfHint(c.rowHint);
  for (let i = 0; i < 3; i++) {
    const lab = el('label', ''), cb = document.createElement('input'); cb.type = 'checkbox'; cb.id = `f-row-${i}`; cb.checked = cur.includes(i);
    cb.addEventListener('change', () => {
      const n = [0, 1, 2].filter(x => x === i ? cb.checked : cur.includes(x));
      if (!n.length) { cb.checked = true; return; }
      const h = n.length === 3 ? 'ที่ไหนก็ได้' : n.map(x => ROWN[x]).join('+');
      if (!ROW_HINTS.includes(h)) return;
      c.rowHint = h; afterEdit();
    });
    lab.append(cb, ` ${ROWN[i]}`); rh.append(lab);
  }
  rh.append(el('span', 'was', cur.length === 3 ? '(ที่ไหนก็ได้)' : cur.length === 2 ? '(บอทสุ่มวางในแถวที่เลือก)' : ''));
  rh.classList.toggle('changed', c.rowHint !== b.rowHint); rh.title = `ค่าตั้งต้น ${rowHintTh(b.rowHint)}`;
  f.append(cell('ชื่อ'), span3(nm), cell('เผ่าหลัก'), span3(tr), cell('เผ่าเพิ่ม'), span3(ex), cell('แถวแนะนำ'), span3(rh));
  f.append(cell('ความหายาก'), span3(rs));
  f.append(cell(''), cell('Lv1', 'h'), cell('Lv2', 'h'), cell('Lv3', 'h'));
  for (const [k, label, scale] of LV_FIELDS) {
    f.append(cell(label));
    for (let L = 0; L < 3; L++) f.append(scale
      ? numInput(`f-${k}-${L}`, c[k][L] / scale, b[k][L] / scale, v => { c[k][L] = Math.round(v * scale); softEdit(); }, 0.1)
      : numInput(`f-${k}-${L}`, c[k][L], b[k][L], v => { c[k][L] = v; softEdit(); }));
    if (k === 'hp' || k === 'atk') { // ชุด 20: แถวค่ากลาง (tribe-rules V1.15 · ค่าเสนอ) ตามเผ่าหลัก + ความหายาก · ต่ำกว่า 50% ขึ้นสีเตือน
      const lab = cell(`ค่ากลาง ${label}`); lab.classList.add('midlab'); f.append(lab);
      midEls[k] = [0, 1, 2].map(() => { const d = el('div', 'mid'); f.append(d); return d; });
    }
    if (k === 'cdMs') { // ชุด 21: ช่วงคูลดาวน์ของเผ่า (tribe-rules V1.17 · ค่าเสนอ) ตัวจาง ไม่เตือน · เปลี่ยนเผ่าแล้ววาดฟอร์มใหม่อยู่แล้ว
      const rg = [c.tribe, ...(c.extraTribes || [])].filter(t => TRIBE_CD_SEC[t]).map(t => `${t} ${TRIBE_CD_SEC[t][0]}–${TRIBE_CD_SEC[t][1]} วิ`);
      const lab = cell('ช่วงเผ่า'); lab.classList.add('midlab'); f.append(lab);
      const d = span3(el('div', 'mid cdrange', rg.length ? rg.join(' · ') : '–'));
      d.title = 'ช่วงคูลดาวน์ที่เสนอของเผ่า (ค่าเสนอ · tribe-rules V1.17) · ตัวเฉพาะทางออกนอกช่วงได้'; f.append(d);
    }
  }
  for (const [k, label, scale] of ONE_FIELDS) {
    f.append(cell(label));
    f.append(numInput(`f-${k}`, c[k] / scale, b[k] / scale, v => { c[k] = Math.round(v * scale); softEdit(); }, scale === 1000 ? 0.1 : 1));
    f.append(cell(''), cell(''));
  }
  // แต้ม / งบ: อัปเดตทันทีเมื่อพิมพ์ (renderBudget) · งบ Lv2/3 = ×2/×4 ตามตัวคูณเลเวล
  const bl = cell('แต้ม / งบ (ไม่นับสกิล)'); bl.title = 'แต้มพลังพื้นฐาน = √(เลือดรวม × ดาเมจต่อวินาที) ไม่นับสกิล · งบรวมสกิลของความหายาก';
  f.append(bl); budgetEls = [0, 1, 2].map(() => { const d = el('div', 'bud'); f.append(d); return d; });
  budgetNote = el('p', 'hint budnote'); f.append(budgetNote);
  renderBudget(c);
  renderSkillForm(c, b);
}
const SHOP_WHENS = Object.keys(SKILL_SPEC).filter(isShopWhen), BATTLE_WHENS = Object.keys(SKILL_SPEC).filter(w => !isShopWhen(w));
const UNIT_TH = { ms: '(มิลลิวินาที)', '%': '(%)', 'ฮิต': '(ฮิต)', 'ตัว': '(ตัว)', 'รอบ': '(รอบ)', 'ครั้ง/แมตช์': '(ครั้ง/แมตช์)' };
let sentenceEls = [];
// สรุปสกิลเป็นประโยคเดียว อ่านได้ทันทีโดยไม่ต้องไล่ช่อง
// ชุด 8: ประโยคภาษาพูด + ตัวอย่างตัวเลข (คิดจากค่าจริงของตัวนี้ถ้าทำได้)
function sayNodes(c, s) { const out = [skillTags(s), skillSay(s)]; const ex = skillExample(s, c); if (ex) out.push(el('div', 'skex', ex)); return out; }
function renderSkillNow(c) { sentenceEls.forEach((e, k) => { if (c.skills[k]) e.replaceChildren(...sayNodes(c, c.skills[k])); }); }
const moreOpen = new Set(); // การ์ดที่เปิด "ตั้งค่าเพิ่มเติม" ไว้ (จำไว้ตอนวาดฟอร์มใหม่)
function newSkill(shop) {
  const w = shop ? 'matchWin' : 'set';
  const d = shop ? 'permAtk' : 'burn';
  return { when: w, do: d, to: SKILL_SPEC[w][d][0], v: [1, 2, 4] };
}
// ที่แก้สกิล (ชุด 6 · 22 ต.ค.): การ์ดละ 1 สกิล เรียง เมื่อ → ทำ → กับ → ค่า → ระยะเวลา จุดเดียวจบ
// "ทำ" รวมผลระหว่างสู้กับผลหลังสู้/ร้านค้าที่ให้ค่าเดียวกันเป็นตัวเลือกเดียว (เช่น "พลังโจมตี +") · ระยะเวลาเลือกด้วยปุ่ม
// ข้อมูลที่เก็บยังเป็นรูปแบบเดิม { when, do, to, perm? } · เงื่อนไขหลังสู้/ร้านค้า = ถาวรเสมอ (ใช้ผล perm_* / permX)
const ALL_WHENS = [...BATTLE_WHENS, ...SHOP_WHENS];
const famOf = s => (isShopWhen(s.when) ? BATTLE_OF[s.do] || s.do : s.do);
const permOk = d => !!(DO_INFO[d] && DO_INFO[d].perm);
// ผลที่เลือกได้กับเงื่อนไขนี้ (เป็นชื่อผลระหว่างสู้ · เงื่อนไขร้านค้าต้องมีผลคู่ในร้านค้า)
function famsOf(w) {
  if (isShopWhen(w)) return Object.keys(SKILL_SPEC[w]).map(d => BATTLE_OF[d] || d);
  return Object.keys(SKILL_SPEC[w]).filter(d => !isLegacyDo(d)); // ผลเดิมที่ฝังค่าในชื่อ ใช้แบบ % ของ แทน (ชุด 7)
}
const doFor = (w, fam) => (isShopWhen(w) ? (SHOP_OF[fam] && SKILL_SPEC[w][SHOP_OF[fam]] ? SHOP_OF[fam] : (SKILL_SPEC[w][fam] ? fam : null)) : (SKILL_SPEC[w][fam] ? fam : null));
function famSelect(id, fams, value, onChange) {
  const sel = document.createElement('select'); sel.id = id;
  const left = new Set(fams);
  const opt = d => { left.delete(d); const [nm, unit] = DO_TH[d] || [d, '']; return new Option(DO_INFO[d] && DO_INFO[d].of ? nm + ' % ของ…' : unit === '%' && /[+−]$/.test(nm) ? nm + '%' : nm, d); };
  for (const [g, list] of DO_GROUPS) {
    const items = list.filter(d => left.has(d));
    if (!items.length) continue;
    const og = document.createElement('optgroup'); og.label = g;
    for (const d of items) og.append(opt(d));
    sel.append(og);
  }
  if (left.size) { const og = document.createElement('optgroup'); og.label = 'อื่นๆ'; for (const d of [...left]) og.append(opt(d)); sel.append(og); }
  sel.value = value;
  sel.addEventListener('change', () => onChange(sel.value));
  return sel;
}
const DUR_BTN = [['now', 'ทันที'], ['match', 'ระหว่างสู้'], ['perm', 'ถาวร']];
// ชุด 14: ช่องตำแหน่ง/เผ่าเดียวกัน ให้ตรงกับผู้รับเสมอ (เปลี่ยนเงื่อนไข/ผล/ผู้รับแล้วไม่ค้างค่าที่ใช้ไม่ได้)
function fixAt(s) {
  if (s.to === 'allyAt') { if (!s.at || !AT_ROWS.includes(s.at.row) || !AT_LANES.includes(s.at.lane)) s.at = { row: 'back', lane: 'same' }; }
  else delete s.at;
  if (s.sameTribe && !sameTribeOk(s)) delete s.sameTribe;
  if (s.skipSameId && !skipSameIdOk(s)) delete s.skipSameId; // ชุด 17
  if (!s.cd) delete s.cdGrow;
}
function renderSkillForm(c, b) {
  const box = $('skillList'); box.replaceChildren(); sentenceEls = [];
  if (!c.skills.length) box.append(cell('ตัวนี้ยังไม่มีสกิล กดปุ่มด้านล่างเพื่อเพิ่ม', 'skillnow none'));
  c.skills.forEach((s, k) => {
    fixAt(s);
    const bs = (b.skills || [])[k] || {};
    const card = el('div', 'skcard' + (skillDur(s) === 'perm' ? ' shop' : ''));
    const head = el('div', 'row');
    const sent = el('div', 'skillnow grow'); sent.append(...sayNodes(c, s)); sentenceEls[k] = sent;
    const del = el('button', 'danger', 'ลบ'); del.type = 'button'; del.setAttribute('aria-label', `ลบสกิล ${k + 1}`);
    del.addEventListener('click', () => { c.skills.splice(k, 1); afterEdit(); });
    head.append(sent, del);
    const g = el('div', 'grid3');
    const shop = isShopWhen(s.when), fam = famOf(s);
    const fix = () => { const spec = SKILL_SPEC[s.when]; if (!spec[s.do]) s.do = Object.keys(spec)[0]; if (!spec[s.do].includes(s.to)) s.to = spec[s.do][0];
      if (isShopWhen(s.when)) { delete s.cd; delete s.cdGrow; delete s.perm; } else if (s.perm && !permOk(s.do)) delete s.perm;
      if (DO_INFO[s.do] && DO_INFO[s.do].of) { s.of = s.of && OF_STATS.includes(s.of.stat) ? { stat: s.of.stat, who: s.of.who } : { stat: 'atk', who: 'self' }; if (!OF_WHO.includes(s.of.who) || (s.of.who === 'ctx' && !CTX_WHEN[s.when])) s.of.who = 'self'; } else delete s.of;
      if (s.do === 'summon') { if (!chars.some(x => x.id === s.summon && x.id !== c.id && !x.skills.some(y => y.do === 'summon'))) s.summon = (chars.find(x => x.id !== c.id && !x.skills.some(y => y.do === 'summon')) || {}).id; } else delete s.summon; };
    // 1) เมื่อ: ทุกเงื่อนไขในรายการเดียว (ระหว่างสู้ / หลังสู้-ร้านค้า)
    g.append(cell('เมื่อ'), span3(groupSelect(`s${k}-when`, ALL_WHENS.map(w => [w, (WHEN_TH[w] || w).replace(/^(ร้านค้า|หลังสู้): /, ''), WHEN_KIND[w] || 'อื่นๆ']), s.when, w => {
      if (!ALL_WHENS.includes(w)) return;
      const wasPerm = skillDur(s) === 'perm';
      s.when = w; s.do = doFor(w, fam) || Object.keys(SKILL_SPEC[w])[0];
      if (!isShopWhen(w) && wasPerm && permOk(s.do)) s.perm = true;
      fix(); afterEdit();
    })));
    // 2) ทำ: ผลแบบรวม
    g.append(cell('ทำ'), span3(famSelect(`s${k}-do`, famsOf(s.when), fam, f => { const d = doFor(s.when, f); if (!d) return; s.do = d; fix(); afterEdit(); })));
    if (s.do === 'summon') { // ตัวที่จะเรียกมาสู้แทน: ไม่ใช่ตัวเอง และไม่มีสกิลเรียกตัว (กันเรียกต่อกัน)
      const opts = chars.filter(x => x.id !== c.id && !x.skills.some(y => y.do === 'summon')).map(x => [x.id, `${x.id} ${x.name} (${x.tribe} · ${x.rarity})`]);
      const ss = selectInput(`s${k}-summon`, opts, s.summon || '', v => { if (opts.some(o => o[0] === v)) { s.summon = v; softEdit(); } });
      ss.classList.toggle('changed', s.summon !== bs.summon);
      g.append(cell('ตัวที่เรียก'), span3(ss));
    }
    { const h = DO_HELP[fam] || DO_HELP[s.do]; if (h) g.append(cell(''), span3(el('div', 'durhint dohelp', h))); }
    // 3) ใส่ใคร · ผลที่เป็นของตัวเองล้วน (ดูดเลือด ลุก ชุบ ฯลฯ) ล็อกเป็นตัวเอง
    const spec = SKILL_SPEC[s.when], selfOnly = spec[s.do].length === 1 && spec[s.do][0] === 'self' && DO_INFO[s.do] && DO_INFO[s.do].side === 'self';
    const toSel = groupSelect(`s${k}-to`, spec[s.do].map(t => [t, selfOnly ? 'ตัวเอง (ผู้ถือความสามารถนี้)' : TO_TH[t] || t, TO_GROUP(t)]), s.to, t => { const was = s.to; s.to = t; fixAt(s); if ((was === 'allyAt') !== (t === 'allyAt') || sameTribeOk({ ...s, to: was }) !== sameTribeOk(s) || skipSameIdOk({ ...s, to: was }) !== skipSameIdOk(s)) afterEdit(); else softEdit(); });
    toSel.disabled = selfOnly;
    const side = (DO_INFO[s.do] || {}).side;
    g.append(cell(s.do === 'shareArmor' ? 'แบ่งให้ใคร' : side === 'foe' || side === 'pick' || side === 'foeSelf' ? 'ใส่ใคร' : 'ให้ใคร'), span3(toSel));
    // ชุด 14: เพื่อนตามตำแหน่ง (แถว × เลน) · เฉพาะเผ่าเดียวกัน
    if (s.to === 'allyAt' && s.at) {
      const ch = JSON.stringify(s.at) !== JSON.stringify(bs.at || null);
      const ar = selectInput(`s${k}-atrow`, AT_ROWS.map(x => [x, AT_ROW_TH[x]]), s.at.row, v => { if (AT_ROWS.includes(v)) { s.at.row = v; softEdit(); } });
      const al = selectInput(`s${k}-atlane`, AT_LANES.map(x => [x, AT_LANE_TH[x]]), s.at.lane, v => { if (AT_LANES.includes(v)) { s.at.lane = v; softEdit(); } });
      ar.classList.toggle('changed', ch); al.classList.toggle('changed', ch);
      const pos = el('div', 'row'); pos.append(ar, al);
      g.append(cell('ตำแหน่งเพื่อน'), span3(pos), cell(''), span3(el('div', 'durhint', 'แถวนับจากหน้า (หน้า กลาง หลัง) · เลนเทียบกับตัวนี้ · ไม่รวมตัวเอง · ไม่มีใครตรง = ไม่มีผล')));
    }
    if (sameTribeOk(s)) {
      const lab = el('label', 'status'), cb = document.createElement('input'); cb.type = 'checkbox'; cb.id = `s${k}-same`; cb.checked = !!s.sameTribe;
      cb.addEventListener('change', () => { if (cb.checked) s.sameTribe = true; else delete s.sameTribe; softEdit(); });
      lab.append(cb, ' เฉพาะเพื่อนเผ่าเดียวกับตัวนี้ (นับเผ่าเพิ่มด้วย)'); if (!!s.sameTribe !== !!bs.sameTribe) lab.classList.add('changed');
      g.append(cell(''), span3(lab));
    }
    if (skipSameIdOk(s)) { // ชุด 17: กันตัวชนิดเดียวกันส่งผลให้กันเองไปมา (เช่น มัลติฮิต + พอกกันจนเกมค้าง)
      const lab = el('label', 'status'), cb = document.createElement('input'); cb.type = 'checkbox'; cb.id = `s${k}-skipid`; cb.checked = !!s.skipSameId;
      cb.addEventListener('change', () => { if (cb.checked) s.skipSameId = true; else delete s.skipSameId; softEdit(); });
      lab.append(cb, ' ไม่ให้ผลกับตัวอื่นที่ชนิดเดียวกับตัวนี้ (ID เดียวกัน · ตัวเองยังได้ถ้าผู้รับรวมตัวเอง)'); if (!!s.skipSameId !== !!bs.skipSameId) lab.classList.add('changed');
      g.append(cell(''), span3(lab));
    }
    // 4) ค่า
    const unit = (DO_TH[s.do] || [])[1];
    if (unit !== '-') {
      g.append(cell(`ค่า ${UNIT_TH[unit] || ''}`));
      for (let L = 0; L < 3; L++) g.append(numInput(`s${k}-v-${L}`, s.v[L], (bs.v || [])[L], v => { s.v[L] = v; softEdit(); }));
    }
    // 2.5) ผลแบบ % ของ (ชุด 7): คิดจากค่าอะไร ของใคร
    if (DO_INFO[s.do] && DO_INFO[s.do].of && s.of) {
      const so = selectInput(`s${k}-ofstat`, OF_STATS.map(x => [x, STAT_TH[x]]), s.of.stat, v => { if (!OF_STATS.includes(v)) return; s.of.stat = v; softEdit(); });
      so.classList.toggle('changed', JSON.stringify(s.of) !== JSON.stringify(bs.of || null));
      const whos = OF_WHO.filter(w => w !== 'ctx' || CTX_WHEN[s.when]);
      const sw = selectInput(`s${k}-ofwho`, whos.map(w => [w, w === 'ctx' ? whoTh(w, s.when) + ' (ของเงื่อนไขนี้)' : WHO_TH[w]]), s.of.who, v => { if (!whos.includes(v)) return; s.of.who = v; softEdit(); });
      sw.classList.toggle('changed', JSON.stringify(s.of) !== JSON.stringify(bs.of || null));
      g.append(cell('คิดจาก'), span3(so), cell('เป็นค่าของใคร'), span3(sw));
    }
    // 5) ระยะเวลา: ปุ่ม ทันที / ระหว่างสู้ / ถาวร · เปิดเฉพาะแบบที่ผลนี้ใช้ได้
    {
      const dur = skillDur(s), natural = durOf(fam);
      const okOf = d => (shop ? d === 'perm' : d === natural || (d === 'perm' && permOk(s.do)));
      const seg = el('div', 'seg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'ระยะเวลา');
      for (const [d, label] of DUR_BTN) {
        const bt = el('button', '', label); bt.type = 'button'; bt.id = `s${k}-dur-${d}`; bt.setAttribute('aria-pressed', String(dur === d)); bt.disabled = !okOf(d);
        bt.title = okOf(d) ? DUR_HELP[d] : shop ? 'เงื่อนไขหลังสู้/ร้านค้าให้ค่าถาวรเท่านั้น' : d === 'perm' ? 'ผลนี้ตั้งเป็นถาวรไม่ได้ (ผลใส่ศัตรู หรือผลเฉพาะชุด/ตอน down)' : `ผลนี้เป็นแบบ${DUR_TAG[natural]}`;
        bt.addEventListener('click', () => { if (!okOf(d) || shop) return; if (d === 'perm') s.perm = true; else delete s.perm; afterEdit(); });
        seg.append(bt);
      }
      const durBox = el('div', 'row'); durBox.append(seg);
      g.append(cell('ระยะเวลา'), span3(durBox));
      const h = el('div', 'durhint'); h.append(DUR_HELP[dur].replace(/^[^:]+: /, ''));
      if (shop) h.append(el('b', '', 'เงื่อนไขหลังสู้/ร้านค้าทำงานนอกการต่อสู้ จึงให้ค่าถาวรเท่านั้น'));
      else if (s.perm) h.append(el('b', '', `ได้${GIVE_TH[permKeyOf(s)]} ถาวร ทุกครั้งที่ทำงาน ⚠ ไม่มีเพดาน`));
      g.append(cell(''), span3(h));
    }
    // ตั้งค่าเพิ่มเติม (ชุด 8): แท็ก โอกาส คูลดาวน์สกิล เลเวล · เปิดเองถ้ามีค่าที่ไม่ใช่ค่าตั้งต้น
    const mkey = c.id + ':' + k, det = document.createElement('details'); det.className = 'more'; det.id = `s${k}-more`;
    det.open = moreOpen.has(mkey) || !!(s.tags && s.tags.length) || s.chance != null || !!s.cd || !!s.cdGrow || !!s.lv;
    det.addEventListener('toggle', () => { if (det.open) moreOpen.add(mkey); else moreOpen.delete(mkey); });
    const sum = document.createElement('summary'); sum.textContent = 'ตั้งค่าเพิ่มเติม (แท็ก · โอกาส · คูลดาวน์สกิล · เลเวล)';
    const mg = el('div', 'grid3');
    { // แท็กเพิ่ม: พิมพ์คั่นด้วย , · ทำความสะอาดก่อนเก็บ (cleanTags) · แท็กหลักออกอัตโนมัติ ไม่ต้องพิมพ์
      const ti = document.createElement('input'); ti.type = 'text'; ti.id = `s${k}-tags`; ti.maxLength = 60;
      ti.placeholder = 'เช่น คอมโบไฟ, แทงก์'; ti.value = (s.tags || []).join(', ');
      ti.classList.toggle('changed', JSON.stringify(s.tags || []) !== JSON.stringify(bs.tags || []));
      ti.addEventListener('change', () => { const t = cleanTags(ti.value.split(',')); if (t.length) s.tags = t; else delete s.tags; ti.value = t.join(', '); ti.classList.toggle('changed', JSON.stringify(t) !== JSON.stringify(bs.tags || [])); softEdit(); });
      mg.append(cell('แท็กเพิ่ม'), span3(ti));
    }
    mg.append(cell('โอกาส %'), numInput(`s${k}-chance`, s.chance ?? 100, bs.chance ?? 100, v => { if (v >= 1 && v < 100) s.chance = Math.round(v); else delete s.chance; softEdit(); }), cell('100 = ทุกครั้ง', 'was'), cell(''));
    if (!shop) { // คูลดาวน์สกิล: 0 = ไม่มี · นับตั้งแต่เริ่มแมตช์ ใช้แล้วนับใหม่
      mg.append(cell('คูลดาวน์สกิล (วิ)'), numInput(`s${k}-cd`, (s.cd || 0) / 1000, (bs.cd || 0) / 1000, v => {
        const ms = Math.round(v * 10) * 100; if (ms >= 100 && ms <= RULES.skillCdMaxMs) s.cd = ms; else { delete s.cd; delete s.cdGrow; } afterEdit(); }, 0.1), cell('0 = ไม่มี', 'was'), cell(''));
      if (s.cd) mg.append(cell('คูลดาวน์สกิลยาวขึ้นทุกครั้งที่ใช้ (%)'), numInput(`s${k}-cdgrow`, s.cdGrow || 0, bs.cdGrow || 0, v => { // ชุด 17: ทบต้น ถึงจบแมตช์
        if (Number.isInteger(v) && v >= 1 && v <= RULES.cdGrowMax) s.cdGrow = v; else delete s.cdGrow; softEdit(); }), cell(`0 = ไม่เพิ่ม · สูงสุด ${RULES.cdGrowMax}%`, 'was'), cell(''));
    }
    { // ใช้ได้เลเวลไหน: ติ๊กออกได้ (ต้องเหลืออย่างน้อย 1) · ติ๊กครบ 3 = ทุกเลเวล
      const lv = s.lv || [1, 2, 3], boxes = el('div', 'row lvbox');
      for (const L of [1, 2, 3]) {
        const lab = el('label', ''), cb = document.createElement('input'); cb.type = 'checkbox'; cb.id = `s${k}-lv${L}`; cb.checked = lv.includes(L);
        cb.addEventListener('change', () => { let n = [1, 2, 3].filter(x => x === L ? cb.checked : lv.includes(x)); if (!n.length) { cb.checked = true; return; } if (n.length === 3) delete s.lv; else s.lv = n; afterEdit(); });
        lab.append(cb, ` Lv${L}`); boxes.append(lab);
      }
      boxes.classList.toggle('changed', JSON.stringify(s.lv || null) !== JSON.stringify(bs.lv || null));
      mg.append(cell('ใช้ที่เลเวล'), span3(boxes));
    }
    det.append(sum, mg); det.style.gridColumn = '1 / -1'; g.append(det);
    card.append(head, g); box.append(card);
  });
  $('addBattle').disabled = c.skills.length >= 6;
}
function span3(node) { node.style.gridColumn = 'span 3'; return node; }
// el(tag, cls, text) มาจาก game/view.js (ใช้ร่วมกัน)
$('addBattle').addEventListener('click', () => { const c = chars.find(x => x.id === current); c.skills.push(newSkill(false)); afterEdit(); });
let budgetEls = [], budgetNote = null;
const LV_MUL = [1, 2, 4];
// ชุด 20: แถวค่ากลางใต้ HP/พลังโจมตี · อัปเดตพร้อมงบเมื่อแก้ค่า (เปลี่ยนเผ่า/ความหายากแล้ววาดฟอร์มใหม่อยู่แล้ว)
let midEls = {};
function renderMid(c) {
  const m = midStats(c.tribe, c.rarity), ex = (c.extraTribes || []).map(t => [t, midStats(t, c.rarity)]).filter(x => x[1]);
  for (const k of ['hp', 'atk']) (midEls[k] || []).forEach((d, L) => {
    if (!m) { d.textContent = '–'; return; }
    const mid = m[k][L], low = c[k][L] < mid * 0.5;
    d.className = 'mid' + (low ? ' low' : '');
    d.textContent = `${mid}${low ? ' ⚠' : ''}`;
    d.title = `ค่ากลาง${c.tribe} ${c.rarity} = ${mid}${ex.length ? ' · เผ่าเพิ่ม ' + ex.map(([t, x]) => `${t} ${x[k][L]}`).join(' / ') : ''} (ค่าเสนอ · tribe-rules V1.15)`
      + (low ? ` · ต่ำกว่า 50% (${Math.ceil(mid * 0.5)}) ต้องถามผู้ใช้ก่อน ตามกฎข้อยกเว้นสกิลแรง` : ' · สกิลแรงตั้งต่ำกว่าได้ ไม่ต่ำกว่า 50%');
  });
}
function renderBudget(c) {
  renderMid(c);
  if (!budgetNote) return;
  const bud = RULES.power.budget[c.rarity];
  let left = 0;
  budgetEls.forEach((d, L) => {
    const p = basePower(c, L).points, b = bud * LV_MUL[L];
    if (L === 0) left = bud - p;
    d.className = 'bud' + (p > b ? ' over' : '');
    d.replaceChildren(el('b', '', p.toFixed(0)), el('span', '', ` / ${b}`));
    d.title = p > b ? 'เกินงบทั้งที่ยังไม่นับสกิล' : `เหลือให้สกิล ${(b - p).toFixed(0)} แต้ม`;
  });
  budgetNote.textContent = left < 0 ? `⚠ Lv1 เกินงบ ${(-left).toFixed(0)} แต้ม ทั้งที่ยังไม่นับสกิล` : `แต้มนี้ไม่นับสกิล · Lv1 เหลืองบให้สกิล ${left.toFixed(0)} แต้ม (งบ ${c.rarity} = ${bud}) · ความแรงจริงดูที่ผลวิเคราะห์`;
  budgetNote.classList.toggle('over', left < 0);
  const lr = lastRun && lastRun.now.levels.mix[c.id];
  if (lr) {
    const e = Object.fromEntries(MEASURE.levels.map(L => [L, lastRun.now.levels[L][c.id].err])), v = verdict(e);
    const s = el('span', 'lastres', `ผลวิเคราะห์ล่าสุด: ห่างเป้า ผสม ${sgn(e.mix)} · Lv1 ${sgn(e[1])} · Lv2 ${sgn(e[2])} · Lv3 ${sgn(e[3])} → `);
    s.append(pill(...VERDICT_TH[v])); if (lastRun.key !== JSON.stringify(diffs())) s.append(' (วัดก่อนแก้ค่าล่าสุด กดวิเคราะห์ใหม่เพื่ออัปเดต)');
    budgetNote.append(s);
  }
}
function afterEdit() { renderCharForm(); refreshDirty(); }
// แก้ตัวเลข: อัปเดตคำอธิบายและสถานะ ไม่วาดฟอร์มใหม่ (ช่องที่กำลังพิมพ์ไม่หาย)
function softEdit() {
  const c = chars.find(x => x.id === current);
  $('cdesc').textContent = `${c.id} ${c.name} · ${describe(c)}`; $('cdesc').prepend(charBadge(c.id), rarityTag(c.rarity), ' ');
  renderSkillNow(c); renderBudget(c);
  refreshDirty();
}
$('x24').addEventListener('click', () => {
  const c = chars.find(x => x.id === current);
  // ชุด 13 (ผู้ใช้สั่ง): ค่าพลังทุกช่อง ×2/×4 จาก Lv1 · คูลดาวน์และมัลติฮิตใช้ค่า Lv1 · สกิลไม่แตะ
  for (const k of ['hp', 'atk', 'burn', 'shock', 'armorHit', 'healHit']) { c[k][1] = c[k][0] * 2; c[k][2] = c[k][0] * 4; }
  for (const k of ['cdMs', 'multi']) { c[k][1] = c[k][0]; c[k][2] = c[k][0]; }
  afterEdit();
});
$('cundo').addEventListener('click', () => {
  const i = chars.findIndex(c => c.id === current);
  chars[i] = clone(BASE_CHARS[i]); afterEdit();
});
// เปลี่ยนตัวละครที่แก้อยู่: ช่องเลือกด้านบน และช่องตัวละครของไอเดียสกิล ตามกันเสมอ
function setCurrent(id) { if (!chars.some(c => c.id === id)) return; current = id; pickA.set(id); if (ideaPick) ideaPick.set(id); renderCharForm(); $('sbEdit').textContent = id; }
const pickA = charPicker($('pick'), current, id => setCurrent(id), { title: 'เลือกตัวละครที่จะแก้ค่า' });
let ideaPick = null;

