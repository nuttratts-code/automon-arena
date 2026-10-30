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
  n += Math.abs(stageCfg.custom.length - STAGE_BASE.custom.length) + stageCfg.custom.filter(c => c.id && STAGE_BASE.custom.some(b => b.id === c.id && !same(b, c))).length;
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
function renderStageSay() { for (const [e, f] of stageSayEls) e.textContent = f(); }
function stageOnBox(id, on, set) {
  const l = el('label', 'status'), c = document.createElement('input'); c.type = 'checkbox'; c.id = id; c.checked = on;
  c.addEventListener('change', () => { set(c.checked); stageChanged(); renderStageIdeaFor(); });
  l.append(c, ' ใช้ใน demo'); return l;
}
// Rune tab v2 (set 53): sections by rarity, category filter, search, one line per rune, tap ✎ to edit, user-made runes (stat / from a skill).
let runeCat = 'all', runeQuery = '', runeTheme = 'all', runeGroup = 'rarity';
const runeOpen = new Set();
const RUNE_RAR_CLASS = { common: 'r0', rare: 'r2', legend: 'r4' };
const runeRarTh = k => (RUNE_RARITY.find(r => r[0] === k) || [, k])[1];
const runeSkillOf = x => ({ when: x.when, do: x.do, to: x.to, v: [x.v, x.v, x.v] });
function runeLine(def, x) {
  if (x.type === 'skill') return `${x.scope === 'tribe' ? 'เผ่า' + x.tribe : (RUNE_SCOPES.find(s => s[0] === x.scope) || [, x.scope])[1]}: ได้สกิล "${skillLine(runeSkillOf(x), 1)}"`;
  return runeText(def, x);
}
// All runes as [def | null, record, isCustom]
const runeList = () => [...STAGE_RUNES.map(r => [r, stageCfg.runes[r.id], false]), ...stageCfg.custom.map(x => [null, x, true])];
const runeCatOf = (def, x) => (def ? def.cat : x.type === 'skill' ? 'skill' : 'stat');
const runeScopeOf = (def, x) => (def && def.f ? def.scope : x.scope);
// Rune themes (user 30 Oct): a finer grouping on top of RUNE_CATS — what the rune is about (เกราะ, เงิน, ไฟ …).
// Builder / custom runes follow their current effect (RUNE_THEME_EFF), fixed runes use RUNE_THEME_FIXED, field runes follow their tribe.
const RUNE_THEMES = [['dmg', 'โจมตี/ดาเมจ'], ['armor', 'เกราะ/ป้องกัน'], ['heal', 'HP/ฟื้นฟู'], ['speed', 'ความเร็ว'], ['burn', 'ไฟ'], ['shock', 'ช็อต'], ['debuff', 'กดศัตรู'], ['survive', 'รอดตาย'], ['gold', 'เงิน/ร้าน'], ['tribe', 'เผ่า'], ['other', 'อื่นๆ']];
const RUNE_THEME_EFF = { atk: 'dmg', hitDmg: 'dmg', multi: 'dmg', hp: 'heal', healHit: 'heal', healAmp: 'heal', lifesteal: 'heal', armor: 'armor', armorHit: 'armor', armorAmp: 'armor', cd: 'speed', burn: 'burn', burnAmp: 'burn', shock: 'shock', shockAmp: 'shock', eCd: 'debuff', eMaxHp: 'debuff', eBurn: 'burn', eShock: 'shock', eDmgTaken: 'debuff', eHealCut: 'debuff', eArmorCut: 'debuff' };
const RUNE_THEME_FIXED = { T1: 'gold', T2: 'gold', T3: 'gold', T4: 'gold', X8: 'gold', X2: 'gold', X3: 'gold', U8: 'gold', T8: 'tribe', T9: 'dmg', T10: 'dmg', T11: 'dmg', T12: 'dmg', X7: 'dmg', X5: 'heal', U4: 'armor', U2: 'survive', X4: 'survive', X6: 'survive', U7: 'other', X9: 'other' };
const RUNE_THEME_FIELD = { 'เหล็กกล้า': 'armor', 'เพลิงเผา': 'burn', 'สายฟ้า': 'shock', 'วายุ': 'dmg', 'ภูติ': 'heal', 'อสูร': 'dmg' };
function runeThemeOf(def, x) {
  if (def && def.f) {
    if (RUNE_THEME_FIXED[def.id]) return RUNE_THEME_FIXED[def.id];
    if (def.cat === 'tribe') return 'tribe';
    if (def.cat === 'field') return RUNE_THEME_FIELD[TRIBES[+def.id.slice(1) - 1]] || 'other';
    if (def.cat === 'eco') return 'gold';
    return 'other';
  }
  if (x.type === 'skill') { const e = RUNE_EFFECTS.find(e => e[2] === x.do || e[3] === x.do); return (e && RUNE_THEME_EFF[e[0]]) || 'other'; }
  return RUNE_THEME_EFF[x.eff] || 'other';
}
const runeThemeTh = k => (RUNE_THEMES.find(t => t[0] === k) || [, k])[1];
// Character skills that can become a rune (copy button)
const runeSkillPicks = () => chars.flatMap(c => c.skills.map((s, k) => [c, s, k])).filter(([, s]) => runeSkillOk(s));
function runeEditor(def, x, custom) {
  const box = el('div', 'rune-edit', ''), base = def ? STAGE_BASE.runes[def.id] : x;
  const redraw = () => { stageChanged(); renderStage(); };
  const top = el('div', 'row', '');
  const nm = document.createElement('input'); nm.type = 'text'; nm.id = `stg-${x.id || def.id}-name`; nm.maxLength = 16; nm.value = x.name; nm.title = 'ชื่อรูน (แก้ได้)';
  nm.classList.toggle('changed', x.name !== base.name);
  nm.addEventListener('change', () => { const v = cleanName(nm.value).slice(0, 16); if (v) x.name = v; redraw(); renderStageIdeaFor(); });
  const rl = el('label', 'status', 'ความหายาก '); rl.append(selectInput(`stg-${x.id || def.id}-rarity`, RUNE_RARITY, x.rarity, v => { x.rarity = v; redraw(); }));
  const mx = el('label', 'status', 'มีได้/run '); mx.title = '1 = รูนเฉพาะ (มีได้ชิ้นเดียวต่อ run) · 2 ขึ้นไป = เก็บซ้ำได้ แต่ละชิ้นเพิ่มค่าซ้อนกันเหมือนเลเวล';
  mx.append(stageNum(`stg-${x.id || def.id}-max`, x.max, base.max, 1, RUNE_MAX_HI, v => { x.max = v; }));
  top.append(nm, rl, mx); box.append(top);
  const row = el('div', 'row', '');
  const scopeSel = (allowEnemy) => { const l = el('label', 'status', 'ใช้กับ '); l.append(selectInput(`stg-${x.id || def.id}-scope`, RUNE_SCOPES.filter(s => allowEnemy || s[0] !== 'enemy'), x.scope, v => { x.scope = v; redraw(); })); return l; };
  const tribeSel = () => { const l = el('label', 'status', 'เผ่า '); l.append(selectInput(`stg-${x.id || def.id}-tribe`, TRIBES.map(t => [t, t]), x.tribe, v => { x.tribe = v; redraw(); })); return l; };
  if (def && def.f) {
    for (const [k, label, , lo, hi, unit] of def.f) { const l = el('label', 'status', `${label}${unit ? ` (${unit})` : ''} `); l.append(stageNum(`stg-${def.id}-${k}`, x[k], base[k], lo, hi, v => { x[k] = v; })); row.append(l); }
    if (def.id === 'T8') row.append(el('span', 'hint', 'เผ่าเลือกตอนได้รูน'));
  } else if (x.type === 'skill') {
    const pick = el('label', 'status rune-copy', 'ใช้สกิลของ ');
    const picks = runeSkillPicks();
    const sel = selectInput(`stg-${x.id}-copy`, [['', '— เลือกสกิลตัวละคร —'], ...picks.map(([c, s], i) => [String(i), `${c.id} ${c.name}: ${skillLine({ ...s, v: [s.v[0], s.v[0], s.v[0]] }, 1)}`])], '', v => {
      const p = picks[Number(v)]; if (!p) return; const s = p[1]; Object.assign(x, { when: s.when, do: s.do, to: s.to, v: s.v[0] }); redraw();
    });
    pick.append(sel); box.append(pick);
    const whenL = el('label', 'status', 'เมื่อ ');
    whenL.append(selectInput(`stg-${x.id}-when`, BATTLE_WHEN.map(w => [w, WHEN_TH[w] || w]), x.when, w => {
      x.when = w; if (!runeSkillOk(x)) { const d = Object.keys(DO_INFO).find(q => runeSkillOk({ when: w, do: q, to: skillTargets(w, q).filter(t => t !== 'allyAt')[0] })); if (d) { x.do = d; x.to = skillTargets(w, d).filter(t => t !== 'allyAt')[0]; } } redraw();
    }));
    const dos = Object.keys(DO_INFO).filter(d => skillTargets(x.when, d).some(t => runeSkillOk({ when: x.when, do: d, to: t })));
    const doL = el('label', 'status', 'ทำ ');
    doL.append(selectInput(`stg-${x.id}-do`, dos.map(d => [d, (DO_TH[d] || [d])[0] + ((DO_TH[d] || [])[1] === '%' ? ' %' : '')]), x.do, d => { x.do = d; if (!runeSkillOk(x)) x.to = skillTargets(x.when, d).filter(t => t !== 'allyAt')[0]; redraw(); }));
    const toL = el('label', 'status', 'ให้/ใส่ ');
    toL.append(selectInput(`stg-${x.id}-to`, skillTargets(x.when, x.do).filter(t => t !== 'allyAt').map(t => [t, TO_TH[t] || t]), x.to, t => { x.to = t; redraw(); }));
    const vL = el('label', 'status', `ค่า${(DO_TH[x.do] || [])[1] ? ` (${(DO_TH[x.do] || [])[1]})` : ''} `); vL.append(stageNum(`stg-${x.id}-v`, x.v, x.v, 0, 1e5, v => { x.v = v; }));
    row.append(whenL, doL, toL, vL, scopeSel(false)); if (x.scope === 'tribe') row.append(tribeSel());
    box.append(el('p', 'hint', 'ตัวที่อยู่ในตำแหน่ง "ใช้กับ" ได้สกิลนี้เพิ่ม (ค่าเดียวทุกเลเวล) · ผู้รับ/เป้าของสกิลนับจากตัวที่ได้สกิล'));
  } else {
    const e = RUNE_EFF[x.eff];
    const effL = el('label', 'status', 'ผล ');
    effL.append(groupSelect(`stg-${x.id || def.id}-eff`, RUNE_EFFECTS.map(q => [q[0], q[1], q[4] === 'foe' ? 'ใส่ศัตรู' : 'ฝ่ายเรา']), x.eff, v => {
      const q = RUNE_EFF[v]; x.eff = v; if (!q[x.mode === 'flat' ? 2 : 3]) x.mode = q[2] ? 'flat' : 'pct';
      if (q[4] === 'foe') x.scope = 'enemy'; else if (x.scope === 'enemy') x.scope = 'team'; redraw();
    }));
    const modes = [e[2] && ['flat', e[5] === 'ms' ? 'ตัวเลข (มิลลิวินาที)' : 'ตัวเลข'], e[3] && ['pct', '%']].filter(Boolean);
    const mL = el('label', 'status', 'แบบ '); const mSel = selectInput(`stg-${x.id || def.id}-mode`, modes, x.mode, v => { x.mode = v; redraw(); }); mSel.disabled = modes.length < 2; mL.append(mSel);
    const vL = el('label', 'status', 'ค่า '); vL.append(stageNum(`stg-${x.id || def.id}-v`, x.v, base.v, 0, 1e5, v => { x.v = v; }));
    row.append(effL, mL, vL);
    if (e[4] !== 'foe') { row.append(scopeSel(false)); if (x.scope === 'tribe') row.append(tribeSel()); }
  }
  box.append(row);
  if (custom) {
    const del = el('button', '', 'ลบรูนนี้'); del.type = 'button';
    del.addEventListener('click', () => { stageCfg.custom.splice(stageCfg.custom.indexOf(x), 1); runeOpen.delete(x.id); redraw(); });
    box.append(del);
  }
  return box;
}
function renderStageRunes(box) {
  const odds = (boss) => RUNE_RARITY.map(([k, t]) => `${t} ${fmt(rarityOdds(stageCfg.settings, boss)[k])}%`).join(' · ');
  box.append(el('p', 'hint', `โอกาสความหายากตอนได้รูน: ${odds(false)} · บอส: ${odds(true)} (แก้น้ำหนักในแท็บ "ค่าโหมด") · เฉพาะตัว = ใส่ให้ 1 ตัว · ส่วนรวม = มีผลกับแถว/ทีม · ยังไม่มีผลในการต่อสู้ (ขั้นที่ 2)`));
  const bar = el('div', 'row', '');
  const seg = el('div', 'seg', ''); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'ประเภทรูน');
  for (const [k, t] of [['all', 'ทั้งหมด'], ...RUNE_CATS]) {
    const b = el('button', '', t); b.type = 'button'; b.id = `stg-cat-${k}`; b.setAttribute('aria-pressed', String(k === runeCat));
    b.addEventListener('click', () => { runeCat = k; renderStage(); }); seg.append(b);
  }
  const q = document.createElement('input'); q.type = 'search'; q.id = 'stgRuneFind'; q.placeholder = 'ค้นหาชื่อ / ผล'; q.value = runeQuery;
  q.addEventListener('input', () => { runeQuery = q.value; drawList(); });
  bar.append(seg, q); box.append(bar);
  // Theme chips (finer groups) + group-by switch
  const all = runeList();
  const chips = el('div', 'rune-chips', ''); chips.setAttribute('role', 'group'); chips.setAttribute('aria-label', 'หมวดย่อยรูน');
  chips.append(el('span', '', 'หมวดย่อย:'));
  for (const [k, t] of [['all', 'ทั้งหมด'], ...RUNE_THEMES]) {
    const n = k === 'all' ? all.length : all.filter(([d, x]) => runeThemeOf(d, x) === k).length;
    if (!n && k !== runeTheme) continue;
    const b = el('button', '', `${t} ${n}`); b.type = 'button'; b.id = `stg-theme-${k}`; b.setAttribute('aria-pressed', String(k === runeTheme));
    b.addEventListener('click', () => { runeTheme = k; renderStage(); }); chips.append(b);
  }
  box.append(chips);
  const grp = el('div', 'rune-chips', ''); grp.setAttribute('role', 'group'); grp.setAttribute('aria-label', 'จัดกลุ่มรูน');
  grp.append(el('span', '', 'จัดกลุ่มตาม:'));
  for (const [k, t] of [['rarity', 'ความหายาก'], ['theme', 'หมวดย่อย']]) {
    const b = el('button', '', t); b.type = 'button'; b.id = `stg-group-${k}`; b.setAttribute('aria-pressed', String(k === runeGroup));
    b.addEventListener('click', () => { runeGroup = k; renderStage(); }); grp.append(b);
  }
  box.append(grp);
  const add = el('div', 'row', '');
  const newRune = type => { let n = 1; while (stageCfg.custom.some(c => c.id === 'C' + n)) n++; const c = customDefault('C' + n, type); stageCfg.custom.push(c); runeOpen.add(c.id); runeCat = 'all'; runeQuery = ''; stageChanged(); renderStage(); };
  const a1 = el('button', '', '+ รูนค่าพลังใหม่'), a2 = el('button', '', '+ รูนจากสกิลที่มีอยู่');
  a1.type = a2.type = 'button'; a1.id = 'stgAddStat'; a2.id = 'stgAddSkill';
  a1.disabled = a2.disabled = stageCfg.custom.length >= RUNE_CUSTOM_MAX;
  a1.addEventListener('click', () => { runeTheme = 'all'; newRune('stat'); }); a2.addEventListener('click', () => { runeTheme = 'all'; newRune('skill'); });
  add.append(a1, a2); box.append(add);
  const list = el('div', '', ''); list.style.display = 'grid'; list.style.gap = '10px'; box.append(list);
  function drawList() {
    list.replaceChildren();
    const qq = runeQuery.trim().toLowerCase();
    const byTheme = runeGroup === 'theme';
    const shown = runeList().filter(([d, x]) => (runeCat === 'all' || runeCatOf(d, x) === runeCat)
      && (runeTheme === 'all' || runeThemeOf(d, x) === runeTheme)
      && (!qq || `${x.id || d.id} ${x.name} ${runeLine(d, x)} ${runeThemeTh(runeThemeOf(d, x))}`.toLowerCase().includes(qq)));
    if (byTheme && !shown.length) list.append(el('p', 'hint', 'ไม่มีรูนตามที่กรอง'));
    for (const [rk, rt] of (byTheme ? RUNE_THEMES : RUNE_RARITY)) {
      const items = shown.filter(([d, x]) => (byTheme ? runeThemeOf(d, x) : x.rarity) === rk);
      if (byTheme && !items.length) continue;
      const sec = document.createElement('details'); sec.className = 'rune-sec'; sec.open = true;
      const sum = document.createElement('summary'); sum.append(byTheme ? el('span', 'pill rune-theme', rt) : el('span', `rar ${RUNE_RAR_CLASS[rk]}`, rt), ` ${items.length} รูน · เปิดใช้ ${items.filter(([, x]) => x.on).length}`);
      sec.append(sum);
      if (!items.length) sec.append(el('p', 'hint', 'ไม่มีรูนตามที่กรอง'));
      for (const [d, x, custom] of items) {
        const id = x.id || d.id, scope = runeScopeOf(d, x);
        const row = el('div', 'rune-row', ''); row.classList.toggle('off', !x.on);
        const head = el('div', 'rune-head', '');
        const ed = el('button', 'rune-edit-btn', runeOpen.has(id) ? 'ปิด' : '✎ แก้'); ed.type = 'button'; ed.id = `stg-open-${id}`;
        ed.setAttribute('aria-expanded', String(runeOpen.has(id)));
        ed.addEventListener('click', () => { if (runeOpen.has(id)) runeOpen.delete(id); else runeOpen.add(id); drawList(); });
        head.append(el('b', '', x.name), el('span', 'hint', id), ...(byTheme ? [el('span', `rar ${RUNE_RAR_CLASS[x.rarity]}`, runeRarTh(x.rarity))] : []),
          el('span', `pill ${runeSolo(scope) ? 'rune-solo' : 'rune-team'}`, runeSolo(scope) ? 'เฉพาะตัว' : 'ส่วนรวม'),
          el('span', 'pill rune-cat', (RUNE_CATS.find(c => c[0] === runeCatOf(d, x)) || [, ''])[1]),
          ...(byTheme ? [] : [el('span', 'pill rune-theme', runeThemeTh(runeThemeOf(d, x)))]), ...(x.max > 1 ? [el('span', 'hint', `ซ้อนได้ ${x.max}`)] : []), el('span', 'grow', ''),
          stageOnBox(`stg-on-${id}`, x.on, v => { x.on = v; drawList(); }), ed);
        row.append(head, el('div', 'rune-say', runeLine(d, x)));
        if (runeOpen.has(id)) row.append(runeEditor(d, x, custom));
        sec.append(row);
      }
      list.append(sec);
    }
  }
  drawList();
}
function renderStageBosses(box) {
  box.append(el('p', 'hint', 'แถบสีเลือด: ตีหมด 1 แถบ = นับเป็นศัตรูล้ม 1 ครั้ง (สกิลแบบ "ศัตรูล้ม" ทำงาน) · ค่าบอส = ตอนเจอครั้งแรก (ด่าน 5) · ด่าน 10 = × ตัวคูณ · หลังด่าน 10 บอสแต่ละตัวแรงขึ้นอีก % · สกิลพิเศษของบอส ส่งเป็นไอเดียด้านล่างก่อน (ขั้นที่ 2 Claude ทำให้ใช้ได้จริง) · เทียบ: ผู้เล่นค่ากลางด่าน 5 ตี ~7/วิ HP ทีม ~756 · ด่าน 10 ตี ~14/วิ HP ~1140'));
  stageCfg.bosses.forEach((bs, idx) => {
    const base = STAGE_BASE.bosses.find(x => x.id === bs.id) || bs;
    const card = el('div', 'subsec', ''); card.style.display = 'grid'; card.style.gap = '6px';
    const head = el('div', 'row', '');
    const nm = document.createElement('input'); nm.type = 'text'; nm.id = `stg-${bs.id}-name`; nm.maxLength = 24; nm.value = bs.name;
    nm.addEventListener('change', () => { const v = cleanName(nm.value).slice(0, 24); if (v) bs.name = v; nm.value = bs.name; stageChanged(); renderStageIdeaFor(); });
    const del = el('button', '', 'ลบ'); del.type = 'button'; del.disabled = stageCfg.bosses.length <= 1;
    del.addEventListener('click', () => { stageCfg.bosses.splice(idx, 1); stageChanged(); renderStage(); });
    head.append(el('b', '', bs.id), nm, tribeBadge(bs.tribe), selectInput(`stg-${bs.id}-tribe`, TRIBES.map(t => [t, t]), bs.tribe, v => { bs.tribe = v; stageChanged(); renderStage(); }), el('span', 'grow', ''), stageOnBox(`stg-on-${bs.id}`, bs.on, v => { bs.on = v; }), del);
    const sp = el('div', 'row', ''); const spl = el('label', 'status', 'ยืนตรงไหน ');
    spl.append(selectInput(`stg-${bs.id}-spot`, BOSS_SPOTS, bs.spot, v => { bs.spot = v; stageChanged(); renderStage(); })); sp.append(spl);
    const row = el('div', 'row', '');
    for (const [k, label, lo, hi] of BOSS_STATS.filter(q => q[0] !== 'moveSec' || bs.spot === 'move')) { const l = el('label', 'status', `${label} `); l.append(stageNum(`stg-${bs.id}-${k}`, bs[k], base[k], lo, hi, v => { bs[k] = k === 'cdMs' ? Math.round(v / 100) * 100 : ['bars', 'moveSec', 'multi'].includes(k) ? Math.round(v) : v; })); row.append(l); }
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
    stageSayEls.push([say, () => [1, 2, 3, 4].map(k => { const s = bossAt(bs, k); return `บอสครั้งที่ ${k} (ด่าน ${k * stageCfg.settings.bossEvery}): HP ${s.hp} (${bs.bars} แถบ × ${s.barHp}) ตี ${fmt(s.dps)}/วิ`; }).join(' · ')]);
    card.append(head, sp, row, rr, gr, say); box.append(card);
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
  for (const [k, label, , lo, hi, unit] of STAGE_SETTINGS) { const l = el('label', 'status', `${label}${unit ? ` (${unit})` : ''} `); l.append(stageNum(`stg-set-${k}`, stageCfg.settings[k], STAGE_BASE.settings[k], lo, hi, v => { stageCfg.settings[k] = v; })); g.append(l); }
  const grow = el('p', 'desc', ''); stageSayEls.push([grow, () => { const st = stageCfg.settings; return 'ศัตรูด่านปกติ (HP + พลังโจมตี) × ' + [20, 25, 30, 40, 50].filter(n => n <= st.lastStage).map(n => `ด่าน ${n}: ${fmt(enemyMultAt(st, n))}`).join(' · '); }]);
  box.append(el('p', 'hint', 'หลังด่าน 10 (เล่นต่อ) ได้รูนจากบอสเท่านั้น · ไม่ได้รูน = ของรางวัลแทน: ง่าย เงิน · กลาง ค่าถาวร · ยาก ตัวหายาก (ผู้ใช้ตัดสิน 29 ต.ค.) · ทีมศัตรูวัดไว้ถึงด่าน 19 · เกินนั้นใช้ทีมด่าน 19 แล้วคูณให้แรงขึ้นแบบทบต้น'), g, grow);
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
  const opts = [['รูน (ใหม่)', 'รูนใหม่'], ['บอส (ใหม่)', 'บอสใหม่'], ...STAGE_RUNES.map(r => [`รูน ${r.id} ${stageCfg.runes[r.id].name}`, `รูน ${r.id} ${stageCfg.runes[r.id].name}`]), ...stageCfg.custom.map(c => [`รูน ${c.id} ${c.name}`, `รูน ${c.id} ${c.name}`]), ...stageCfg.bosses.map(b => [`บอส ${b.id} ${b.name}`, `บอส ${b.id} ${b.name}`])];
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
