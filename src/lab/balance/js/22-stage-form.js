// ---------- Stage mode (demo) phase 1, 29 Oct: runes / bosses / stage settings (core/stage.js) ----------
// Saved inside config/main as `stage` (full cleaned object) · local draft in its own key · no battle effect yet.
const STAGE_DRAFT_KEY = 'automon-balance-stage-v1';
const STAGE_BASE = stageDefaults();
let stageCfg = cleanStage(null), stagePart = 'runes';
try { const d = JSON.parse(localStorage.getItem(STAGE_DRAFT_KEY) || 'null'); if (d) stageCfg = cleanStage(d); } catch (e) {}
const stageEdited = () => !same(stageCfg, STAGE_BASE);
function stageCount() {
  let n = 0;
  for (const r of STAGE_RUNES) { const x = stageCfg.runes[r.id], b = STAGE_BASE.runes[r.id]; for (const k of new Set([...Object.keys(x), ...Object.keys(b)])) if (x[k] !== b[k]) n++; }
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
function renderStageSay() { for (const [e, f] of stageSayEls) { const r = f(); if (typeof r === 'string') e.textContent = r; else e.replaceChildren(...r); } }
// Rune tab v2 (set 53): sections by rarity, category filter, search, one line per rune, tap ✎ to edit, user-made runes (stat / from a skill).
let runeQuery = '', runeTheme = 'all', runeGroup = 'rarity';
const runeOpen = new Set();
const RUNE_RAR_CLASS = { common: 'r0', rare: 'r2', legend: 'r4' };
const runeRarTh = k => (RUNE_RARITY.find(r => r[0] === k) || [, k])[1];
const runeSkillOf = x => ({ when: x.when, do: x.do, to: x.to, v: [x.v, x.v, x.v] });
function runeLine(def, x) {
  if (x.eff === 'skill') return `${runeScopeLabel(x)}: ได้สกิล "${skillLine(runeSkillOf(x), 1)}"`;
  return runeText(x);
}
// All runes as [def | null, record, isCustom] · deleted built-in runes (set 59) live in their own fold
const runeAll = () => [...STAGE_RUNES.map(r => [r, stageCfg.runes[r.id], false]), ...stageCfg.custom.map(x => [null, x, true])];
const runeList = () => runeAll().filter(([, x]) => !x.del);
// Rune themes (user 30 Oct): what the rune is about (เกราะ, เงิน, ไฟ …) · set 60: follows the rune's current effect
const RUNE_THEME_EFF = { atk: 'dmg', hitDmg: 'dmg', multi: 'dmg', hp: 'heal', healHit: 'heal', healAmp: 'heal', lifesteal: 'heal', armor: 'armor', armorHit: 'armor', armorAmp: 'armor', cd: 'speed', burn: 'burn', burnAmp: 'burn', shock: 'shock', shockAmp: 'shock', eCd: 'debuff', eMaxHp: 'debuff', eBurn: 'burn', eShock: 'shock', eDmgTaken: 'debuff', eHealCut: 'debuff', eArmorCut: 'debuff' };
// Effect a new rune starts with under a หมวด filter (set 61)
const RUNE_THEME_NEW = { dmg: 'atk', armor: 'armor', heal: 'hp', speed: 'cd', burn: 'burn', shock: 'shock', debuff: 'eCd', survive: 'revive', gold: 'gold', tribe: 'addTribe', other: 'atk' };
function runeThemeOf(def, x) {
  if (x.theme) return x.theme; // set 59: picked by the user
  return runeThemeAuto(def, x);
}
function runeThemeAuto(def, x) {
  if (RUNE_SPEC[x.eff]) return RUNE_SPEC[x.eff].theme;
  if (x.eff === 'skill') { const e = RUNE_EFFECTS.find(e => e[2] === x.do || e[3] === x.do); return (e && RUNE_THEME_EFF[e[0]]) || 'other'; }
  return RUNE_THEME_EFF[x.eff] || 'other';
}
const runeThemeTh = k => (RUNE_THEMES.find(t => t[0] === k) || [, k])[1];
// Character skills that can become a rune (copy button)
const runeSkillPicks = () => chars.flatMap(c => c.skills.map((s, k) => [c, s, k])).filter(([, s]) => runeSkillOk(s));
// Set 56 (30 Oct): every stage-tab field = label above + control below, same height, in an aligned grid (.fgrid/.fld).
function fld(label, ctrl, cls = '') { const l = el('label', 'fld' + (cls ? ' ' + cls : ''), ''); l.append(el('span', '', label), ctrl); return l; }
const fgrid = (...kids) => { const g = el('div', 'fgrid', ''); g.append(...kids); return g; };
// On/off switch with a visible word (replaces the unlabeled checkbox)
function stageSwitch(id, on, set) {
  const l = el('label', 'sw', ''), c = document.createElement('input'); c.type = 'checkbox'; c.id = id; c.checked = on;
  c.addEventListener('change', () => { set(c.checked); stageChanged(); renderStageIdeaFor(); });
  l.title = 'ใช้ใน demo'; l.append(c, el('span', '', 'ใช้')); return l;
}
function runeEditor(def, x, custom) {
  const box = el('div', 'rune-edit', ''), base = def ? STAGE_BASE.runes[def.id] : x, rid = x.id || def.id;
  const redraw = () => { stageChanged(); renderStage(); };
  const nm = document.createElement('input'); nm.type = 'text'; nm.id = `stg-${rid}-name`; nm.maxLength = 16; nm.value = x.name; nm.title = 'ชื่อรูน (แก้ได้)';
  nm.classList.toggle('changed', x.name !== base.name);
  nm.addEventListener('change', () => { const v = cleanName(nm.value).slice(0, 16); if (v) x.name = v; redraw(); renderStageIdeaFor(); });
  // Set 61 (user rule): copies follow rarity (ธรรมดา 3 · หายาก 2 · ตำนาน 1) · still typeable, yellow when it differs from the rarity number
  const maxF = fld('มีได้ต่อ run', stageNum(`stg-${rid}-max`, x.max, RUNE_COPIES[x.rarity], 1, RUNE_MAX_HI, v => { x.max = v; }));
  maxF.title = `ตามความหายาก = ${RUNE_COPIES[x.rarity]} ชิ้น (ธรรมดา 3 · หายาก 2 · ตำนาน 1) · เปลี่ยนความหายากแล้วจำนวนเปลี่ยนตาม · พิมพ์เลขอื่นได้ (ช่องเป็นสีเหลือง)`;
  // Set 59 (user 30 Oct): every rune has the same basics — name, rarity, copies, theme, who it works on
  const themeF = fld('หมวด', selectInput(`stg-${rid}-theme`, [['', `อัตโนมัติ (${runeThemeTh(runeThemeAuto(def, x))})`], ...RUNE_THEMES], x.theme, v => { x.theme = v; redraw(); }));
  const g = fgrid(fld('ชื่อรูน', nm, 'wide'), fld('ความหายาก', selectInput(`stg-${rid}-rarity`, RUNE_RARITY, x.rarity, v => { x.rarity = v; x.max = RUNE_COPIES[v]; redraw(); })), maxF, themeF);
  const scopeF = (all = false) => fld('ใช้กับ', selectInput(`stg-${rid}-scope`, all ? RUNE_SCOPES : RUNE_SCOPES.filter(s => s[0] !== 'enemy'), x.scope, v => { x.scope = v; redraw(); }));
  const tribeF = () => fld('เผ่า', selectInput(`stg-${rid}-tribe`, TRIBES.map(t => [t, t]), x.tribe, v => { x.tribe = v; redraw(); }));
  const notes = [];
  // Set 60 (user 30 Oct): every rune picks any effect — stat (flat/% + value), special (own fields) or a battle skill
  const kind = runeKind(x.eff), eb = base.eff === x.eff ? base : {};
  const effOpts = [...RUNE_EFFECTS.map(q => [q[0], q[1], q[4] === 'foe' ? 'ค่าพลัง ใส่ศัตรู' : 'ค่าพลัง ฝ่ายเรา']),
    ...RUNE_SPECIAL.map(s => [s.key, s.label, s.theme === 'gold' ? 'เงิน/ร้าน' : s.theme === 'tribe' ? 'เผ่า' : 'พิเศษ']), ['skill', 'ได้สกิล (เลือกเอง)', 'สกิล']];
  g.append(fld('ผล', groupSelect(`stg-${rid}-eff`, effOpts, x.eff, v => {
    const y = runeWithEff(x, v); for (const k of Object.keys(x)) delete x[k]; Object.assign(x, y); redraw();
  }), 'wide'));
  if (kind === 'special') {
    for (const [k, label, , lo, hi, unit] of RUNE_SPEC[x.eff].f) {
      if (unit === 'tribe') g.append(fld(label, selectInput(`stg-${rid}-${k}`, TRIBES.map(t => [t, t]), x[k], v => { x[k] = v; redraw(); })));
      else g.append(fld(`${label}${unit ? ` (${unit})` : ''}`, stageNum(`stg-${rid}-${k}`, x[k], eb[k], lo, hi, v => { x[k] = v; })));
    }
    g.append(scopeF(true)); if (x.scope === 'tribe') g.append(tribeF());
    if (x.scope !== RUNE_SPEC[x.eff].scope) notes.push(`ผลนี้ปกติใช้กับ "${(RUNE_SCOPES.find(s => s[0] === RUNE_SPEC[x.eff].scope) || [, ''])[1]}"`);
  } else if (kind === 'skill') {
    const picks = runeSkillPicks();
    g.append(fld('ใช้สกิลของ (คัดลอก)', selectInput(`stg-${rid}-copy`, [['', '— เลือกสกิลตัวละคร —'], ...picks.map(([c, s], i) => [String(i), `${c.id} ${c.name}: ${skillLine({ ...s, v: [s.v[0], s.v[0], s.v[0]] }, 1)}`])], '', v => {
      const p = picks[Number(v)]; if (!p) return; const s = p[1]; Object.assign(x, { when: s.when, do: s.do, to: s.to, v: s.v[0] }); redraw();
    }), 'full'));
    g.append(fld('เมื่อ', selectInput(`stg-${rid}-when`, BATTLE_WHEN.map(w => [w, WHEN_TH[w] || w]), x.when, w => {
      x.when = w; if (!runeSkillOk(x)) { const d = Object.keys(DO_INFO).find(q => runeSkillOk({ when: w, do: q, to: skillTargets(w, q).filter(t => t !== 'allyAt')[0] })); if (d) { x.do = d; x.to = skillTargets(w, d).filter(t => t !== 'allyAt')[0]; } } redraw();
    }), 'wide'));
    const dos = Object.keys(DO_INFO).filter(d => skillTargets(x.when, d).some(t => runeSkillOk({ when: x.when, do: d, to: t })));
    g.append(fld('ทำ', selectInput(`stg-${rid}-do`, dos.map(d => [d, (DO_TH[d] || [d])[0] + ((DO_TH[d] || [])[1] === '%' ? ' %' : '')]), x.do, d => { x.do = d; if (!runeSkillOk(x)) x.to = skillTargets(x.when, d).filter(t => t !== 'allyAt')[0]; redraw(); }), 'wide'));
    g.append(fld('ให้/ใส่', selectInput(`stg-${rid}-to`, skillTargets(x.when, x.do).filter(t => t !== 'allyAt').map(t => [t, TO_TH[t] || t]), x.to, t => { x.to = t; redraw(); }), 'wide'));
    g.append(fld(`ค่า${(DO_TH[x.do] || [])[1] ? ` (${(DO_TH[x.do] || [])[1]})` : ''}`, stageNum(`stg-${rid}-v`, x.v, eb.v, 0, 1e5, v => { x.v = v; })), scopeF());
    if (x.scope === 'tribe') g.append(tribeF());
    notes.push('ตัวที่อยู่ในตำแหน่ง "ใช้กับ" ได้สกิลนี้เพิ่ม (ค่าเดียวทุกเลเวล) · ผู้รับ/เป้าของสกิลนับจากตัวที่ได้สกิล');
    if (['tribeAllies', 'allAllies', 'frontRowAllies', 'backRowAllies'].includes(x.to) && !runeSolo(x.scope)) notes.push('⚠️ หลายตัวได้สกิลนี้ และแต่ละตัวแจกให้เพื่อนหลายตัว → ผลซ้อนกันตามจำนวนตัว · ถ้าอยากให้ได้ครั้งเดียว ใช้ผล "ค่าพลัง" แทน');
  } else {
    const e = RUNE_EFF[x.eff];
    const modes = [e[2] && ['flat', e[5] === 'ms' ? 'ตัวเลข (มิลลิวินาที)' : 'ตัวเลข'], e[3] && ['pct', '%']].filter(Boolean);
    const mSel = selectInput(`stg-${rid}-mode`, modes, x.mode, v => { x.mode = v; redraw(); }); mSel.disabled = modes.length < 2;
    g.append(fld('แบบ', mSel), fld('ค่า', stageNum(`stg-${rid}-v`, x.v, eb.v, 0, 1e5, v => { x.v = v; })));
    if (e[4] !== 'foe') { g.append(scopeF()); if (x.scope === 'tribe') g.append(tribeF()); }
  }
  if (def && base.eff !== x.eff) notes.push(`ผลเดิม: ${runeLine(def, base)}`);
  box.append(g, ...notes.map(t => el('p', 'hint', t)));
  // Set 59: built-in runes are deleted softly (fold "รูนที่ลบแล้ว" → เอาคืน) · user-made runes are removed for good
  const del = el('button', 'rune-del', custom ? 'ลบรูนนี้ (ถาวร)' : 'ลบรูนนี้'); del.type = 'button'; del.id = `stg-del-${rid}`;
  del.addEventListener('click', () => { if (custom) stageCfg.custom.splice(stageCfg.custom.indexOf(x), 1); else x.del = true; runeOpen.delete(rid); redraw(); renderStageIdeaFor(); });
  box.append(del);
  return box;
}
function renderStageRunes(box) {
  const all = runeList();
  // One toolbar row: search · theme dropdown · group switch · add menu
  const bar = el('div', 'stg-bar', '');
  const q = document.createElement('input'); q.type = 'search'; q.id = 'stgRuneFind'; q.placeholder = 'ค้นหาชื่อ / ผล'; q.value = runeQuery; q.setAttribute('aria-label', 'ค้นหารูน');
  q.addEventListener('input', () => { runeQuery = q.value; drawList(); });
  const themeOpts = [['all', `ทุกหมวด (${all.length})`], ...RUNE_THEMES.map(([k, t]) => [k, `${t} (${all.filter(([d, x]) => runeThemeOf(d, x) === k).length})`]).filter(([k, t]) => !t.endsWith('(0)') || k === runeTheme)];
  const th = selectInput('stgRuneTheme', themeOpts, runeTheme, v => { runeTheme = v; renderStage(); }); th.setAttribute('aria-label', 'หมวดย่อยรูน');
  const grp = el('div', 'seg', ''); grp.setAttribute('role', 'group'); grp.setAttribute('aria-label', 'จัดกลุ่มรูน');
  for (const [k, t] of [['rarity', 'ตามความหายาก'], ['theme', 'ตามหมวด']]) {
    const b = el('button', '', t); b.type = 'button'; b.id = `stg-group-${k}`; b.setAttribute('aria-pressed', String(k === runeGroup));
    b.addEventListener('click', () => { runeGroup = k; renderStage(); }); grp.append(b);
  }
  const addM = document.createElement('details'); addM.className = 'add-menu';
  const addS = document.createElement('summary'); addS.textContent = '+ เพิ่มรูน'; addM.append(addS);
  // Set 61 (user): a new rune keeps the หมวด filter and starts with that theme's effect (theme '' = auto, still shown under the filter)
  // · if its effect is not of that theme (skill rune, อื่นๆ) the theme is picked, so it stays in view · search is cleared so it is visible
  const newRune = type => {
    let n = 1; while (stageCfg.custom.some(c => c.id === 'C' + n)) n++;
    const f = runeTheme !== 'all' ? runeTheme : '';
    const c = customDefault('C' + n, type === 'skill' ? 'skill' : (f && RUNE_THEME_NEW[f]) || 'atk');
    if (f && runeThemeAuto(null, c) !== f) c.theme = f;
    stageCfg.custom.push(c); runeOpen.add(c.id); runeQuery = ''; stageChanged(); renderStage();
  };
  const a1 = el('button', '', 'รูนใหม่ (เลือกผลทีหลังได้)'), a2 = el('button', '', 'รูนจากสกิลที่มีอยู่');
  a1.type = a2.type = 'button'; a1.id = 'stgAddStat'; a2.id = 'stgAddSkill';
  const full = stageCfg.custom.length >= RUNE_CUSTOM_MAX;
  a1.addEventListener('click', () => newRune('atk')); a2.addEventListener('click', () => newRune('skill'));
  const pop = el('div', 'add-pop', ''); pop.append(a1, a2); if (full) { a1.disabled = a2.disabled = true; pop.append(el('span', 'hint', `ครบ ${RUNE_CUSTOM_MAX} รูนแล้ว ลบรูนเก่าก่อน`)); }
  addM.append(pop);
  bar.append(q, th, grp, addM); box.append(bar);
  const list = el('div', 'rune-list', ''); box.append(list);
  const odds = (boss) => rarityOdds(stageCfg.settings, boss);
  function drawList() {
    list.replaceChildren();
    const qq = runeQuery.trim().toLowerCase();
    const byTheme = runeGroup === 'theme';
    const shown = all.filter(([d, x]) => (runeTheme === 'all' || runeThemeOf(d, x) === runeTheme)
      && (!qq || `${x.id || d.id} ${x.name} ${runeLine(d, x)} ${runeThemeTh(runeThemeOf(d, x))}`.toLowerCase().includes(qq)));
    if (!shown.length) { list.append(el('p', 'hint', 'ไม่มีรูนที่ตรงกับคำค้น / หมวดนี้')); return; }
    for (const [rk, rt] of (byTheme ? RUNE_THEMES : RUNE_RARITY)) {
      const items = shown.filter(([d, x]) => (byTheme ? runeThemeOf(d, x) : x.rarity) === rk);
      if (!items.length) continue;
      const sec = document.createElement('details'); sec.className = 'rune-sec'; sec.open = true;
      const sum = document.createElement('summary');
      sum.append(byTheme ? el('span', 'pill rune-theme', rt) : el('span', `rar ${RUNE_RAR_CLASS[rk]}`, rt), el('span', 'sec-n', `${items.length} รูน · ใช้ ${items.filter(([, x]) => x.on).length}`));
      if (!byTheme) sum.append(el('span', 'sec-odds', `โอกาสได้ ด่านปกติ ${fmt(odds(false)[rk])}% · บอส ${fmt(odds(true)[rk])}%`));
      sec.append(sum);
      for (const [d, x, custom] of items) {
        const id = x.id || d.id, scope = x.scope, open = runeOpen.has(id);
        const row = el('div', 'rune-row', ''); row.classList.toggle('off', !x.on); row.classList.toggle('open', open);
        const toggle = () => { if (runeOpen.has(id)) runeOpen.delete(id); else runeOpen.add(id); drawList(); };
        const ed = el('button', 'chev', open ? '▾' : '▸'); ed.type = 'button'; ed.id = `stg-open-${id}`;
        ed.setAttribute('aria-expanded', String(open)); ed.setAttribute('aria-label', `${open ? 'ปิด' : 'แก้'} ${x.name}`);
        ed.addEventListener('click', e => { e.stopPropagation(); toggle(); });
        const main = el('div', 'rune-main', '');
        const l1 = el('div', 'rune-l1', ''); l1.append(el('b', '', x.name), el('span', 'rune-say', runeLine(d, x)));
        const meta = [id, byTheme ? runeRarTh(x.rarity) : runeThemeTh(runeThemeOf(d, x)), runeSolo(scope) ? 'เฉพาะตัว' : 'ส่วนรวม', ...(x.max > 1 ? [`ซ้อนได้ ${x.max}`] : []), ...(custom ? ['สร้างเอง'] : [])];
        main.append(l1, el('div', 'rune-meta', meta.join(' · ')));
        const head = el('div', 'rune-head', ''); head.append(ed, main, stageSwitch(`stg-on-${id}`, x.on, v => { x.on = v; drawList(); }));
        head.addEventListener('click', e => { if (!e.target.closest('label, input, button')) toggle(); });
        row.append(head);
        if (open) row.append(runeEditor(d, x, custom));
        sec.append(row);
      }
      list.append(sec);
    }
  }
  drawList();
  const gone = runeAll().filter(([, x]) => x.del);
  if (gone.length) {
    const f = document.createElement('details'); f.className = 'rune-sec rune-gone'; f.id = 'stgRuneGone';
    const sum = document.createElement('summary'); sum.append(el('span', 'pill', 'รูนที่ลบแล้ว'), el('span', 'sec-n', `${gone.length} รูน · ไม่ออกในเกม`)); f.append(sum);
    for (const [d, x] of gone) {
      const row = el('div', 'rune-row off', ''), head = el('div', 'rune-head', ''), main = el('div', 'rune-main', '');
      main.append(el('div', 'rune-l1', ''), el('div', 'rune-meta', d.id)); main.firstChild.append(el('b', '', x.name), el('span', 'rune-say', runeLine(d, x)));
      const back = el('button', '', 'เอาคืน'); back.type = 'button'; back.id = `stg-undel-${d.id}`;
      back.addEventListener('click', () => { x.del = false; stageChanged(); renderStage(); renderStageIdeaFor(); });
      head.append(main, back); row.append(head); f.append(row);
    }
    box.append(f);
  }
}
// Median player team (stage baseline, review-2026-10-29-stage-baseline.md) — only stages 5 and 10 are measured.
const STAGE_MEDIAN = { 5: { dps: 7, hp: 756 }, 10: { dps: 14, hp: 1140 } };
let bossOpen = null;
const secs = s => (s >= 600 ? '> 10 นาที' : `${Math.round(s)} วิ`);
function bossVerdict(tKill, tDie) {
  const r = tDie / tKill;
  return r < 0.9 ? ['บอสชนะ', 'bad'] : r <= 1.1 ? ['สูสี', 'mid'] : ['ทีมชนะ', 'good'];
}
function bossBar(bs) {
  const bar = el('div', 'hpbar', ''); bar.title = `${bs.bars} แถบ × ${bossAt(bs, 1).barHp} HP`; bar.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < bs.bars; i++) bar.append(document.createElement('i'));
  return bar;
}
function bossVsTable(bs) {
  const t = document.createElement('table'); t.className = 'bvs';
  const hr = document.createElement('tr'); for (const h of ['ด่าน', 'HP', 'ตี/วิ', 'ทีมล้มบอสใน', 'บอสล้มทีมใน', '']) hr.append(el('th', '', h));
  t.append(hr);
  for (const k of [1, 2, 3, 4]) {
    const stg = k * stageCfg.settings.bossEvery, s = bossAt(bs, k), ref = STAGE_MEDIAN[stg], tr = document.createElement('tr');
    const hpC = el('td', 'n', String(s.hp)); hpC.append(el('span', 'bk', ` (${bs.bars} × ${s.barHp})`));
    const kC = el('td', '', ''); kC.append(el('span', 'bk', `${k} · `), `ด่าน ${stg}`);
    tr.append(kC, hpC, el('td', 'n', fmt(s.dps)));
    if (ref) {
      const tKill = s.hp / ref.dps, tDie = ref.hp / s.dps, [txt, cls] = bossVerdict(tKill, tDie);
      const vt = el('td', ''); vt.append(el('span', `vtag ${cls}`, txt));
      tr.append(el('td', 'n', secs(tKill)), el('td', 'n', secs(tDie)), vt);
    } else tr.append(el('td', 'n mute', '—'), el('td', 'n mute', '—'), el('td', 'mute', 'ยังไม่วัด'));
    t.append(tr);
  }
  return t;
}
// Set 65 (user 31 Oct): boss spot = any slots · mini board (3 rows × 2 lanes) + quick presets + "move" switch
function spotPicker(id, spot, set) {
  const si = spotInfo(spot) || { bits: '111111', move: false }, box = el('div', 'spot-pick', '');
  const put = (bits, move) => { if (!bits.includes('1')) return; set(spotCode(bits, move && bits.split('1').length > 2)); stageChanged(); renderStage(); };
  const board = el('div', 'spot-board', ''); board.setAttribute('role', 'group'); board.setAttribute('aria-label', 'ช่องที่บอสยืน');
  board.append(el('span', '', ''), ...['แถวหน้า', 'แถวกลาง', 'แถวหลัง'].map(t => el('span', 'sb-h', t)));
  for (const lane of [0, 1]) {
    board.append(el('span', 'sb-h', lane ? 'เลนล่าง' : 'เลนบน'));
    for (const row of [0, 1, 2]) {
      const i = row * 2 + lane, on = si.bits[i] === '1', b = el('button', 'sb-cell', on ? (si.move ? '◇' : '◆') : '');
      b.type = 'button'; b.id = `${id}-slot${i}`; b.setAttribute('aria-pressed', String(on));
      b.setAttribute('aria-label', `แถว${['หน้า', 'กลาง', 'หลัง'][row]} เลน${lane ? 'ล่าง' : 'บน'}`);
      b.addEventListener('click', () => put(si.bits.slice(0, i) + (on ? '0' : '1') + si.bits.slice(i + 1), si.move));
      board.append(b);
    }
  }
  const pre = el('div', 'spot-pre', '');
  for (const [pid, label, bits] of BOSS_SPOT_PRESETS.filter(q => q[0] !== 'one')) {
    const b = el('button', '', label); b.type = 'button'; b.id = `${id}-pre-${pid}`; b.setAttribute('aria-pressed', String(bits === si.bits));
    b.addEventListener('click', () => put(bits, si.move)); pre.append(b);
  }
  const mv = document.createElement('input'); mv.type = 'checkbox'; mv.id = `${id}-move`; mv.checked = si.move;
  const n = si.bits.split('1').length - 1; mv.disabled = n < 2;
  mv.addEventListener('change', () => put(si.bits, mv.checked));
  const ml = el('label', 'sw', ''); ml.append(mv, el('span', '', 'ย้ายที่เรื่อยๆ (ยืนทีละ 1 ช่อง สุ่มในช่องที่เลือก)'));
  if (n < 2) ml.title = 'เลือกอย่างน้อย 2 ช่องก่อน';
  box.append(board, el('div', 'spot-side', ''));
  box.lastChild.append(pre, ml, el('p', 'spot-say', 'ตอนนี้: ' + spotLabel(spotCode(si.bits, si.move))));
  return box;
}
// Set 64 boss phases (user 31 Oct): phase 1 at fight start · phase 2–3 start after N bars are gone · new phase rules replace old ones · ≤ 2 rules per phase
function bossPhaseForms(bs, base, grp) {
  const ruleOpts = BOSS_RULES.map(r => [r[0], r[1]]), out = [];
  bs.phases.forEach((p, i) => {
    const bp = (base.phases || [])[i], id = `stg-${bs.id}-p${i}`, kids = [];
    if (i) {
      const lo = bs.phases[i - 1].at + 1, hi = (bs.phases[i + 1] ? bs.phases[i + 1].at : bs.bars) - 1;
      kids.push(fld('เริ่มเมื่อแถบหายไป', stageNum(`${id}-at`, p.at, bp ? bp.at : p.at, lo, hi, v => { p.at = Math.round(v); })));
      const sc = document.createElement('input'); sc.type = 'checkbox'; sc.id = `${id}-spoton`; sc.checked = !!p.spot;
      sc.addEventListener('change', () => { p.spot = sc.checked ? bs.spot : ''; stageChanged(); renderStage(); });
      const sl = el('label', 'sw', ''); sl.append(sc, el('span', '', 'เปลี่ยนที่ยืน'));
      kids.push(fld('ที่ยืน', sl, 'full'));
      if (p.spot) kids.push(spotPicker(`${id}-spot`, p.spot, v => { p.spot = v; }));
    }
    for (let k = 0; k < BOSS_MAX_RULES; k++) {
      const r = p.rules[k], q = r && BOSS_RULES.find(z => z[0] === r.id), br = bp && r && bp.rules.find(z => z.id === r.id);
      kids.push(fld(`กฎ ${k + 1}`, selectInput(`${id}-r${k}`, ruleOpts, r ? r.id : 'none', v => {
        if (v === 'none') p.rules.splice(k, 1); else if (!p.rules.some((z, j) => j !== k && z.id === v)) p.rules[k] = bossRule(v);
        stageChanged(); renderStage();
      }), 'full'));
      if (!q) break;
      if (q[4]) kids.push(fld(`ค่า (${q[5]})`, stageNum(`${id}-r${k}-v`, r.v, br ? br.v : q[2], q[3], q[4], v => { r.v = v; })));
      if (Array.isArray(q[6])) kids.push(fld(`${q[6][0]} (${q[6][4]})`, stageNum(`${id}-r${k}-v2`, r.v2, br ? br.v2 : q[6][1], q[6][2], q[6][3], v => { r.v2 = v; })));
      if (q[6] === 'tribe') kids.push(fld('เผ่า', selectInput(`${id}-r${k}-tribe`, TRIBES.map(t => [t, t]), r.tribe, v => { r.tribe = v; stageChanged(); renderStage(); })));
    }
    if (i) BOSS_PHASE_FX.forEach((f, j) => {
      const on = p.fx.find(z => z.id === f[0]), c = document.createElement('input'); c.type = 'checkbox'; c.id = `${id}-fx-${f[0]}`; c.checked = !!on;
      c.addEventListener('change', () => { if (c.checked) p.fx.push({ id: f[0], v: f[2] }); else p.fx = p.fx.filter(z => z.id !== f[0]); stageChanged(); renderStage(); });
      const l = el('label', 'sw', ''); l.append(c, el('span', '', f[1])); kids.push(fld(j ? '' : 'ตอนเปลี่ยนเฟส', l, 'full'));
      if (on && f[4]) kids.push(fld(`ค่า (${f[5]})`, stageNum(`${id}-fx-${f[0]}-v`, on.v, f[2], f[3], f[4], v => { on.v = v; })));
    });
    for (const w of bossPhaseWarn(bs, p)) kids.push(el('p', 'fld full warn-txt', '⚠️ ' + w));
    if (i) { const d = el('button', 'rune-del', 'ลบเฟสนี้'); d.type = 'button'; d.addEventListener('click', () => { bs.phases.splice(i, 1); stageChanged(); renderStage(); }); kids.push(d); }
    const f = grp(i ? `เฟส ${i + 1} · หลังแถบหาย ${p.at} แถบ` : 'เฟส 1 (เริ่มสู้)', ...kids); f.className = 'phase-card'; out.push(f);
  });
  const last = bs.phases[bs.phases.length - 1];
  if (bs.phases.length < BOSS_MAX_PHASES) {
    const add = el('button', '', '+ เพิ่มเฟส'); add.type = 'button'; add.id = `stg-${bs.id}-addphase`;
    add.disabled = last.at + 1 >= bs.bars; add.title = add.disabled ? 'แถบสีเลือดไม่พอ เพิ่มจำนวนแถบก่อน' : 'เฟสใหม่เริ่มเมื่อแถบหายไปอีก 1 แถบ (แก้ได้)';
    add.addEventListener('click', () => { bs.phases.push(bossPhase(last.at + 1)); stageChanged(); renderStage(); });
    out.push(add);
  }
  const sec = el('section', 'boss-phases', ''); sec.append(el('h4', '', 'เฟสของบอส · แถบสีเลือดหายครบ = เข้าเฟสใหม่ กฎใหม่แทนกฎเดิม'), ...out);
  return sec;
}
function renderStageBosses(box) {
  const help = document.createElement('details'); help.className = 'hint';
  const hs = document.createElement('summary'); hs.textContent = 'วิธีอ่านค่าบอส'; help.append(hs,
    ' แถบสีเลือด: ตีหมด 1 แถบ = นับเป็นศัตรูล้ม 1 ครั้ง (สกิลแบบ "ศัตรูล้ม" ทำงาน) · ค่าบอส = ตอนเจอครั้งแรก (ด่าน 5) · ด่าน 10 = × ตัวคูณ · หลังด่าน 10 บอสแต่ละตัวแรงขึ้นอีก % · ตารางเทียบใช้ทีมค่ากลางของผู้เล่น (ด่าน 5 ตี ~7/วิ HP ~756 · ด่าน 10 ตี ~14/วิ HP ~1140) เป็นค่าประมาณ ยังไม่นับเกราะและกฎพิเศษ · สกิลพิเศษของบอส ส่งเป็นไอเดียด้านล่างก่อน (ขั้นที่ 2 Claude ทำให้ใช้ได้จริง)');
  box.append(help);
  stageCfg.bosses.forEach((bs, idx) => {
    const base = STAGE_BASE.bosses.find(x => x.id === bs.id) || bs, open = bossOpen === bs.id;
    const card = el('div', 'boss-card', ''); card.classList.toggle('off', !bs.on); card.classList.toggle('open', open);
    const head = el('div', 'boss-head', '');
    const ch = el('button', 'chev', open ? '▾' : '▸'); ch.type = 'button'; ch.id = `stg-open-${bs.id}`; ch.setAttribute('aria-expanded', String(open)); ch.setAttribute('aria-label', `${open ? 'ปิด' : 'แก้'} ${bs.name}`);
    const toggle = () => { bossOpen = open ? null : bs.id; renderStage(); };
    ch.addEventListener('click', e => { e.stopPropagation(); toggle(); });
    const title = el('div', 'boss-title', ''); title.append(el('b', '', `${bs.id} ${bs.name}`), el('span', 'rune-meta', [bs.tribe, spotShort(bs.spot), ...bs.phases[0].rules.map(r => (BOSS_RULES.find(q => q[0] === r.id) || [, r.id])[1]), ...(bs.phases.length > 1 ? [`${bs.phases.length} เฟส`] : [])].join(' · ')));
    const barBox = el('div', 'hpwrap', ''), nums = el('span', 'boss-nums', '');
    stageSayEls.push([barBox, () => [bossBar(bs)]], [nums, () => { const s = bossAt(bs, 1); return `HP ${s.hp} · ตี ${fmt(s.dps)}/วิ`; }]);
    head.append(ch, tribeBadge(bs.tribe), title, barBox, nums, stageSwitch(`stg-on-${bs.id}`, bs.on, v => { bs.on = v; renderStage(); }));
    head.addEventListener('click', e => { if (!e.target.closest('label, input, button')) toggle(); });
    card.append(head);
    if (open) {
      const n = (k, label, lo, hi, set, step) => fld(label, stageNum(`stg-${bs.id}-${k}`, bs[k], base[k], lo, hi, set || (v => { bs[k] = v; }), step));
      const nm = document.createElement('input'); nm.type = 'text'; nm.id = `stg-${bs.id}-name`; nm.maxLength = 24; nm.value = bs.name;
      nm.addEventListener('change', () => { const v = cleanName(nm.value).slice(0, 24); if (v) bs.name = v; nm.value = bs.name; stageChanged(); renderStage(); });
      const body = el('div', 'boss-body', '');
      const grp = (name, ...kids) => { const f = document.createElement('fieldset'); f.append(Object.assign(document.createElement('legend'), { textContent: name }), fgrid(...kids)); return f; };
      const cdF = fld('คูลดาวน์ (วิ)', stageNum(`stg-${bs.id}-cdMs`, bs.cdMs / 1000, base.cdMs / 1000, 0.3, 60, v => { bs.cdMs = Math.round(v * 10) * 100; }, 0.1));
      body.append(
        grp('ตัวบอส', fld('ชื่อ', nm, 'wide'), fld('เผ่า', selectInput(`stg-${bs.id}-tribe`, TRIBES.map(t => [t, t]), bs.tribe, v => { bs.tribe = v; stageChanged(); renderStage(); })),
          n('bars', 'แถบสีเลือด', 1, 20, v => { bs.bars = Math.round(v); bs.phases = bs.phases.filter((p, i) => !i || p.at < bs.bars); renderStage(); }), n('hp', 'HP รวม', 1, 1e6), n('armor', 'เกราะเริ่ม', 0, 1e6)),
        grp('การโจมตี', n('atk', 'พลังโจมตี', 0, 1e5), cdF, n('multi', 'มัลติฮิต', 1, 10, v => { bs.multi = Math.round(v); }), n('burn', 'ไฟ/ฮิต', 0, 1e4), n('shock', 'ช็อต/ฮิต', 0, 1e4)),
        grp('ความแรงตามด่าน', n('mult10', 'ด่าน 10 ×', 0.1, 20, null, 0.1), n('endlessPct', 'หลังด่าน 10 +% ต่อตัว', 0, 500)));
      const spotG = grp('ที่ยืน (กดช่องเพื่อเลือก/เอาออก)', spotPicker(`stg-${bs.id}-spot`, bs.spot, v => { bs.spot = v; }),
        ...((spotInfo(bs.spot) || {}).move ? [n('moveSec', 'ย้ายที่ทุก (วิ)', 1, 60, v => { bs.moveSec = Math.round(v); })] : []));
      spotG.classList.add('boss-spot');
      body.append(spotG, bossPhaseForms(bs, base, grp));
      const vs = el('div', 'bvs-wrap', ''); stageSayEls.push([vs, () => [bossVsTable(bs)]]);
      const del = el('button', 'rune-del', 'ลบบอสนี้'); del.type = 'button'; del.disabled = stageCfg.bosses.length <= 1;
      del.addEventListener('click', () => { stageCfg.bosses.splice(idx, 1); bossOpen = null; stageChanged(); renderStage(); });
      card.append(body, vs, del);
    }
    box.append(card);
  });
  const add = el('button', '', '+ เพิ่มบอส'); add.type = 'button'; add.disabled = stageCfg.bosses.length >= 12;
  add.addEventListener('click', () => {
    let n = 1; while (stageCfg.bosses.some(b => b.id === 'B' + n)) n++;
    stageCfg.bosses.push(cleanStage({ bosses: [{ id: 'B' + n }] }).bosses[0]); bossOpen = 'B' + n; stageChanged(); renderStage();
  });
  box.append(add);
}
function renderStageSettings(box) {
  const g = fgrid();
  for (const [k, label, , lo, hi, unit] of STAGE_SETTINGS) g.append(fld(`${label}${unit ? ` (${unit})` : ''}`, stageNum(`stg-set-${k}`, stageCfg.settings[k], STAGE_BASE.settings[k], lo, hi, v => { stageCfg.settings[k] = v; })));
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
  const mine = ideaDocs.map(d => ({ id: d.id, x: d.data() || {} })).filter(o => isStageIdea(o.x));
  if (!mine.length) { list.replaceChildren(el('li', 'status', 'ยังไม่มีไอเดียรูน / บอส')); return; }
  // Set 61: same row as the character ideas (edit → back to "รอ Claude", delete, reply) · 71-ideas-library.js ideaItem
  list.replaceChildren(...mine.map(({ id, x }) => ideaItem(id, x, cell(x.char), t => { $('stgIdeaMsg').textContent = t; })));
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
