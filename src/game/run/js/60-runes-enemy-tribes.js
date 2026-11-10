// ---------- set 94: runes in the run (core/runrunes.js) · every text through textContent ----------
const RN_RAR_TH = Object.fromEntries(RUNE_RARITY), RN_RAR_CLS = { common: 'r0', rare: 'r2', legend: 'r4' };
const RN_ROW_TH = ['หน้า', 'กลาง', 'หลัง'], RN_LANE_TH = ['บน', 'ล่าง'];
const rnSlotTh = s => `${RN_ROW_TH[s[0]]}${RN_LANE_TH[s[1]]}`;
const rnDesc = r => runeText(r) || `${runeWho(r)}: ได้สกิล "${skillLine({ when: r.when, do: r.do, to: r.to, v: [r.v, r.v, r.v] }, 1)}"`; // set 145: skill runes show the real skill line
// set 109: runes are worn by a unit (uid), not a board slot · partner runes show as "คู่"
function runesOn(u) { return Object.keys(P.rn.bag).flatMap(id => [[rnUnitOf(P, id), ''], [rnUnitOf(P, id, true), ' (คู่)']].filter(([w]) => w === u).map(([, t]) => (rnRec(id) || { name: id }).name + t)); }
const RN_WEAR_TH = { none: '⚠ ยังไม่ได้สวมให้ตัวไหน (ไม่ทำงาน)', bench: '⚠ ตัวที่สวมอยู่ม้านั่ง (ไม่ทำงานตอนสู้)' };
function runeCard(r, extra) {
  const c = el('div', 'rcard'); const t = el('span', 'rar ' + RN_RAR_CLS[r.rarity], RN_RAR_TH[r.rarity]);
  const head = el('div', 'row'); head.append(el('span', 'rname grow', r.name), t);
  const ic = GAME_ART.rune[runeArtKey(r.id)]; // set 172: rune icon (tribe runes share one icon, framed in the tribe colour)
  if (ic) { const im = document.createElement('img'); im.className = 'rico'; im.src = ic; im.alt = ''; if (TRIBE_STYLE[r.tribe]) im.style.setProperty('--tc', TRIBE_STYLE[r.tribe].color); head.prepend(im); }
  c.append(head, el('span', 'rtext', rnDesc(r)));
  const held = rnHeld(P, r.id); if (held) c.append(el('span', 'hint', `มีแล้ว ${held}/${r.max || 1}`));
  if (held && r.eff === 'flag') c.append(el('span', 'hint flagtr', `เผ่าที่เลือก: ${rnFlagTribes(r, held, rnFlagPicks(P, r.id)).join(', ')}`)); // set 128 T8
  if (held > 1 && r.eff === 'growth') c.append(el('span', 'hint', `มี ${held} อัน = +${r.stepPct * held}% ต่อด่าน สูงสุด ${r.maxPct * held}%`)); // set 128 T11
  if (extra) c.append(extra);
  return c;
}
const rnBtn = (text, fn, dis) => { const b = el('button', '', text); b.type = 'button'; b.disabled = !!dis; b.addEventListener('click', fn); return b; };
const BAG_SVG = [['M8 8V6a4 4 0 0 1 8 0v2'], ['M4.5 8h15l-1.2 12.2a1 1 0 0 1-1 .8H6.7a1 1 0 0 1-1-.8z'], ['M9 13h6']];
function bagIcon() { // built with createElementNS (no innerHTML)
  const s = document.createElementNS(SVGNS, 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '1.8'); s.setAttribute('aria-hidden', 'true');
  for (const [d] of BAG_SVG) { const p = document.createElementNS(SVGNS, 'path'); p.setAttribute('d', d); s.append(p); }
  return s;
}
const rnBag = () => Object.entries(P.rn.bag).filter(([, n]) => n > 0);
// win → pick 1 free rune: blocking popup (can't fight until picked or skipped)
// set 128 (user T8 A): taking ธงเผ่า asks which tribe this copy counts (tribes on the board) · flagPick = offer card index while asking
let flagPick = null;
function flagPicker(i, r) {
  const box = el('div', 'flagpick'); box.id = 'flagPick';
  const counts = countTribes(teamEntries(P), CM), have = rnFlagPicks(P, r.id);
  box.append(el('p', 'hint', `${r.name}: เลือกเผ่าที่จะนับเพิ่ม ${r.count} ตัว (เลือกแล้วเปลี่ยนไม่ได้)${have.length ? ` · ที่มีอยู่: ${have.join(', ')}` : ''}`));
  const grid = el('div', 'flaggrid');
  for (const t of rnFlagChoices(P, CM)) {
    const b = el('button', 'pitem'); b.type = 'button'; b.dataset.tribe = t; b.style.setProperty('--tc', TRIBE_STYLE[t].color);
    const nm = el('span', ''); nm.append(t, el('small', '', counts[t] ? `บนบอร์ด ${counts[t]} ตัว` : 'ยังไม่มีบนบอร์ด'));
    b.append(tribeIco(t), nm);
    b.addEventListener('click', () => { flagPick = null; pushMsgs(J('tk', [i, t], () => takeRune(P, i, chars, RULES, t))); saveRun(); render(); });
    grid.append(b);
  }
  box.append(grid, rnBtn('← กลับไปเลือกรูน', () => { flagPick = null; render(); }));
  return box;
}
function renderRunes() {
  const o = P.rn.offer, dlgO = $('offerDlg');
  if (!o) flagPick = null;
  if (o && !P.over && !$('app').hidden && !$('app').classList.contains('fighting')) {
    $('offerTitle').textContent = o.kind === 'sc' ? 'โอกาสสุดท้าย! เลือกรูนตำนานฟรี 1 อัน' : o.kind === 'boss' ? 'ชนะบอส! เลือกรูนฟรี 1 อัน' : 'ชนะ! เลือกรูนฟรี 1 อัน';
    const fr = flagPick != null && rnRec(o.ids[flagPick]);
    if (fr && fr.eff === 'flag') $('offer').replaceChildren(flagPicker(flagPick, fr));
    else $('offer').replaceChildren(...o.ids.map((id, i) => { const r = rnRec(id); return r ? runeCard(r, rnBtn(r.eff === 'flag' ? 'เลือกรูนนี้ แล้วเลือกเผ่า' : 'เลือกรูนนี้', () => {
      if (r.eff === 'flag') { flagPick = i; render(); return; }
      pushMsgs(J('tk', [i], () => takeRune(P, i, chars, RULES))); saveRun(); render();
      if (rnWear(P, id) !== 'ok') openPop('rune', id); // set 109: a rune that must be worn → open it right away to pick the unit
    })) : el('div', 'rcard empty', id); }));
    const cost = rnRerollCost(P), rr = $('offerReroll'); // set 100: reroll the cards (free first, then paid)
    rr.textContent = cost ? `สุ่มใหม่ (${cost} เงิน · มี ${P.gold})` : 'สุ่มใหม่ (ฟรี)'; rr.disabled = P.gold < cost; rr.hidden = o.kind === 'sc' || flagPick != null; // set 119: second chance = no reroll
    if (!dlgO.open) { closePop(); dlgO.showModal(); }
  } else if (dlgO.open) dlgO.close();
  const unworn = rnUnworn(P).length; // set 109: warn when a held rune does nothing (not worn / wearer on the bench)
  $('runeCnt').textContent = String(rnBag().length);
  $('runeWarn').hidden = !unworn; $('runeWarn').textContent = `ยังไม่สวม ${unworn}`; $('runeBtn').classList.toggle('warn', !!unworn);
  $('runeBtn').setAttribute('aria-label', unworn ? `รูนของฉัน · ${unworn} อันยังไม่ได้สวม (ไม่ทำงาน)` : 'รูนของฉัน');
  renderDiff(rnFx(P));
}
$('offerDlg').addEventListener('cancel', e => e.preventDefault()); // Esc does not dismiss the offer
POPS.runes = () => {
  const bag = rnBag(), list = el('div', 'plist'); list.id = 'rBag';
  if (!bag.length) list.append(el('p', 'hint', 'ยังไม่มีรูน · ชนะรอบเพื่อเลือกรูนฟรี'));
  for (const [id, n] of bag) {
    const r = rnRec(id); if (!r) { list.append(el('div', 'rcard empty', id)); continue; }
    const b = el('button', 'pitem rune'); b.type = 'button'; b.dataset.rune = id;
    const nm = el('span', ''); nm.append(`${r.name}${n > 1 ? ` ×${n}` : ''} `, el('span', 'rar ' + RN_RAR_CLS[r.rarity], RN_RAR_TH[r.rarity]));
    const wear = rnWear(P, id), on = rnUnitOf(P, id);
    nm.append(el('small', wear === 'ok' ? '' : 'warn', wear !== 'ok' ? RN_WEAR_TH[wear] : on ? `สวมให้ ${CM[on.id].name}` : runeScopeLabel(r)));
    b.append(bagIcon(), nm, el('span', 'hint', '›')); b.addEventListener('click', () => openPop('rune', id)); list.append(b);
  }
  const fx = rnFx(P), extra = [];
  if (fx.heart) { const t = pbtn(fx.heart.left ? `แลกหัวใจ 1 ดวง → ${fx.heart.gold} ทอง (เหลือ ${fx.heart.left} ครั้ง)` : 'แลกหัวใจ: ใช้ไปแล้ว', () => { pushMsgs(J('ht', [], () => rnHeartTrade(P))); saveRun(); render(); }, '', P.over || P.rn.traded || !fx.heart.left || P.hearts < fx.heart.min); t.id = 'rTrade'; extra.push(t); }
  return [phead(`รูนของฉัน (${bag.length})`, 'ทุกรูนที่มีทำงานทั้งหมด · รูน "ตัวเดียว" ต้องสวมให้ตัวบนบอร์ด 1 ตัว (ติดตัวนั้นไปเมื่อย้ายช่อง/รวมร่าง · ขายตัวนั้น = รูนกลับมาให้สวมใหม่) · แตะรูนเพื่อเลือกตัว'), list, pacts(...extra)];
};
POPS.rune = id => {
  const r = rnRec(id), n = P.rn.bag[id] | 0; if (!r || !n) return POPS.runes();
  const card = runeCard(r), ctl = el('div', 'row');
  if (rnNeedsSlot(r)) ctl.append(slotPick(id, false, 'สวมให้'));
  if (rnNeedsPartner(r)) ctl.append(slotPick(id, true, 'คู่'));
  if (r.eff === 'scout') return [phead(`รูน ${r.name}`, 'ทีมศัตรูรอบนี้ (ล็อกตั้งแต่เริ่มรอบร้าน · เปลี่ยนทีมคุณแล้วศัตรูไม่เปลี่ยน)'), foeMini(), card, pacts(back(() => openPop('runes')))]; // set 128 X9
  return [phead(`รูน ${r.name}${n > 1 ? ` ×${n}` : ''}`, runeScopeLabel(r)), card, ...(ctl.childNodes.length ? [ctl] : []), pacts(back(() => openPop('runes')))];
};
$('runeBtn').addEventListener('click', () => openPop('runes'));
// set 128 (user X9 A): enemy team as a mini board (enemy front column on the left, facing your team) + its rune names
function foeMini() {
  const wrap = el('div', 'foemini'); wrap.id = 'foeMini';
  const rb = runBossAt(P);
  if (rb) { wrap.append(el('p', 'hint', `รอบบอส: ${rb.boss.name}`)); return wrap; }
  const foe = nextFoe();
  if (!foe) { wrap.append(el('p', 'hint', 'ศัตรูเป็นบอทซื้อสด (ดูล่วงหน้าไม่ได้)')); return wrap; }
  const rn = (foe.rn || []).map(x => ({ x, r: rnRec(x.id) })).filter(o => o.r && !RUNE_RUN_ONLY.includes(o.r.eff) && (!rnNeedsSlot(o.r) || o.x.s)); // only runes that work in this fight
  const at = (row, lane) => rn.filter(o => (o.x.s && o.x.s[0] === row && o.x.s[1] === lane) || (o.x.p && o.x.p[0] === row && o.x.p[1] === lane));
  const grid = el('div', 'fmgrid');
  for (let lane = 0; lane < 2; lane++) for (const row of [0, 1, 2]) {
    const e = foe.team.find(t => t.row === row && t.lane === lane), cell = el('div', 'fmcell' + (e ? '' : ' empty'));
    if (e && CM[e.id]) {
      cell.append(shapeOf(e.id, e.level), el('span', 'uname', CM[e.id].name), el('span', 'fmlv', `Lv${e.level}${e.perm && Object.keys(e.perm).length ? ' · +ถาวร' : ''}`));
      for (const o of at(row, lane)) cell.append(el('span', 'rune-dot', '◆ ' + o.r.name + (o.x.p && o.x.p[0] === row && o.x.p[1] === lane && !(o.x.s && o.x.s[0] === row && o.x.s[1] === lane) ? ' (คู่)' : '')));
      cell.setAttribute('aria-label', `${rnSlotTh([row, lane])} ${CM[e.id].name} เลเวล ${e.level}`);
    } else cell.setAttribute('aria-label', `${rnSlotTh([row, lane])} ว่าง`);
    grid.append(cell);
  }
  const head = el('div', 'fmhead'); head.append(el('span', '', 'หน้า'), el('span', '', 'กลาง'), el('span', '', 'หลัง'));
  wrap.append(head, grid);
  const team = rn.filter(o => !o.x.s);
  const list = el('div', 'fmrunes');
  list.append(el('span', 'hint', rn.length ? `รูนศัตรูที่ทำงาน ${rn.length} แบบ:` : 'ศัตรูไม่มีรูนที่ทำงานตอนสู้'));
  for (const o of team) list.append(el('span', 'fmrune', `${o.r.name}${o.x.n > 1 ? ` ×${o.x.n}` : ''}${o.r.eff === 'flag' ? ` (${rnFlagTribes(o.r, o.x.n, o.x.t).join(', ')})` : ''}`));
  for (const o of rn.filter(o => o.x.s)) list.append(el('span', 'fmrune one', `◆ ${o.r.name} → ${CM[(foe.team.find(t => t.row === o.x.s[0] && t.lane === o.x.s[1]) || {}).id]?.name || rnSlotTh(o.x.s)}`));
  wrap.append(list);
  return wrap;
}
function slotPick(id, partner, label) {
  const lab = el('label', 'hint', label + ' '), sel2 = document.createElement('select');
  const cur = rnUnitOf(P, id, partner), curSlot = rnSlotOf(P, id, partner); // set 109: worn by a unit (follows it), list = units on the board
  sel2.append(new Option('ยังไม่สวม', ''));
  if (cur && !curSlot) { const o = new Option(`${CM[cur.id].name} (อยู่ม้านั่ง · ไม่ทำงาน)`, 'bench'); o.selected = true; o.disabled = true; sel2.append(o); }
  for (let row = 0; row < 3; row++) for (let lane = 0; lane < 2; lane++) {
    const u = P.board[row][lane]; if (!u) continue;
    const o = new Option(`${CM[u.id].name} Lv${u.level} · ${rnSlotTh([row, lane])}`, `${row},${lane}`);
    if (u === cur) o.selected = true;
    sel2.append(o);
  }
  if (sel2.options.length === 1) sel2.options[0].text = 'ยังไม่มีตัวบนบอร์ด';
  sel2.addEventListener('change', () => { const v = sel2.value; { const sl = v ? v.split(',').map(Number) : null; pushMsgs(J('pl', [id, sl ? rlRef({ at: 'board', row: sl[0], lane: sl[1] }) : '-', partner ? 1 : 0], () => rnPlace(P, id, sl, RULES, partner))); } confirmRunes = false; saveRun(); render(); });
  lab.append(sel2); return lab;
}
// set 97: tribes popup (HUD button) → tribe detail · bonus table rows = RULES.tribeBonus (labels as the Balance Room)
const TRIBE_LBL = {
  armorPct: 'เกราะเริ่ม % ของ HP', restore: 'เกราะแตกได้คืน (ครั้ง)', burn: 'ไฟ +N ที่ฮิตแรก', every: 'ทุกกี่ชุด', shock: 'ช็อต +N ที่ฮิตแรก',
  extraHit: 'ฮิตเพิ่ม', cdPct: 'คูลดาวน์ −%', instantFirst: 'ชุดแรกปล่อยทันที (1=ใช่)', blastPct: 'ระเบิดตอนล้ม % พลังโจมตี', revives: 'ฟื้นได้กี่ตัว', revivePct: 'ฟื้นด้วย HP %',
  hpPct: 'HP สูงสุด +%', startBurn: 'เริ่มแมตช์ ศัตรูทุกตัวติดไฟ +N', burnDmgPct: 'ดาเมจไฟ +%', startShock: 'เริ่มแมตช์ ศัตรูทุกตัวติดช็อต +N', shockDmgPct: 'ดาเมจช็อต +%',
  dmgPct: 'ดาเมจตีปกติ +%', startSets: 'เริ่มแมตช์ ทั้งทีมปล่อยทันที (ชุด)',
};
const tribeIco = t => { const i = el('i', 'tico s-' + TRIBE_STYLE[t].shape); i.style.setProperty('--tc', TRIBE_STYLE[t].color); return i; };
const tribeNow = () => { const counts = countTribes(teamEntries(P), CM); return { counts, steps: tribeSteps(counts) }; };
POPS.tribes = () => {
  const { counts, steps } = tribeNow(), list = el('div', 'plist'); list.id = 'tribeList';
  const have = Object.keys(counts).filter(t => counts[t] > 0).sort((a, b) => counts[b] - counts[a]);
  if (!have.length) list.append(el('p', 'hint', 'บอร์ดยังว่าง'));
  const top = RULES.tribeSteps[RULES.tribeSteps.length - 1];
  for (const t of have) {
    const n = counts[t], st = steps[t] || 0, nx = RULES.tribeSteps.find(s => s > n);
    const b = el('button', 'pitem' + (st ? '' : ' off')); b.type = 'button'; b.dataset.tribe = t; b.style.setProperty('--tc', TRIBE_STYLE[t].color);
    const nm = el('span', ''); nm.append(`${t} ${n} ตัว`, el('small', '', `${st ? `ทำงานขั้น ${st}` : 'ยังไม่ทำงาน'}${nx ? ` · อีก ${nx - n} ตัวถึงขั้น ${nx}` : ''}`));
    const pips = el('span', 'pips'); for (let k = 1; k <= top; k++) { const p = el('i'); if (k <= n) p.className = 'on'; pips.append(p); }
    b.append(tribeIco(t), nm, pips); b.addEventListener('click', () => openPop('tribe', t)); list.append(b);
  }
  return [phead('เผ่าในทีม', `นับเฉพาะตัวบนบอร์ด (ชนิดไม่ซ้ำ) · ครบ ${RULES.tribeSteps.join(' / ')} ตัว = โบนัสขั้นนั้น · แตะเผ่าเพื่อดูโบนัส`), list, pacts()];
};
POPS.tribe = t => {
  const { counts, steps } = tribeNow(), b = RULES.tribeBonus[t] || {}, st = steps[t] || 0;
  const tbl = el('table', 'btbl'), hr = el('tr'); hr.append(el('th', '', 'โบนัส'), ...RULES.tribeSteps.map(s => el('th', s === st ? 'now' : '', `${s} ตัว`))); tbl.append(hr);
  for (const [k, v] of Object.entries(b)) {
    if (!Array.isArray(v) || !v.some(x => x)) continue;
    if (k === 'every' && !['burn', 'shock', 'extraHit'].some(x => (b[x] || []).some(y => y))) continue; // "every" only matters with its partner
    const tr = el('tr'); tr.append(el('td', '', TRIBE_LBL[k] || k), ...v.map((x, i) => el('td', RULES.tribeSteps[i] === st ? 'now' : '', String(x)))); tbl.append(tr);
  }
  return [phead(`เผ่า${t}`, `บนบอร์ด ${counts[t] | 0} ตัว · ${st ? `ทำงานขั้น ${st}` : 'ยังไม่ทำงาน'}`, tribeIco(t)), tbl, pacts(back(() => openPop('tribes')), pbtn('ไฮไลต์บนบอร์ด', () => { closePop(); setHiTribe(t); }))];
};
$('tribeBtn').addEventListener('click', () => openPop('tribes'));
// set 171 (E1): light up one tribe's units on board + bench · tap the strip to turn it off · cleared when a fight starts
function setHiTribe(t) {
  hiTribe = t && TRIBE_STYLE[t] ? t : null; const b = $('hiBar');
  b.hidden = !hiTribe;
  if (hiTribe) { b.style.setProperty('--tc', TRIBE_STYLE[hiTribe].color); b.replaceChildren(tribeIco(hiTribe), el('span', 'hit', hiTribe), el('b', '', '✕')); b.title = `กำลังไฮไลต์เผ่า${hiTribe} · แตะเพื่อปิด`; b.setAttribute('aria-label', `กำลังไฮไลต์เผ่า${hiTribe} แตะเพื่อปิด`); }
  if (P) render();
}
$('hiBar').addEventListener('click', () => setHiTribe(null));
// set 169: what the shapes mean · examples come from real characters (unitShape) so the legend can never drift from the cards
POPS.legend = () => {
  const grid = (cls, items) => { const g = el('div', 'lgrid ' + cls); for (const [pic, txt] of items) { const c = el('div', 'lgi'); c.append(pic, el('span', '', txt)); g.append(c); } return g; };
  const sample = r => chars.find(c => c.rarity === r) || chars[0];
  const tribes = Object.keys(TRIBE_STYLE).map(t => [tribeIco(t), t]);
  const rars = Object.keys(RARITY_CLASS).map(r => { const w = el('span', 'lgpic'); w.append(unitShape(sample(r), 1)); return [w, r]; });
  return [phead('สัญลักษณ์ในเกม'),
    el('p', 'hint lgh', 'รูปทรง (มุมซ้ายบนของรูป) = เผ่า'), grid('t', tribes),
    el('p', 'hint lgh', 'ขอบรอบรูป = ความหายาก'), grid('r', rars),
    el('p', 'hint lgh', 'ดาวใต้รูป = เลเวล (★ เลเวล 1 · ★★ เลเวล 2 · ★★★ เลเวล 3)'),
    el('p', 'hint lgh', `ซื้อตัวชนิดเดียวกัน ${S.mergeCount} ตัว = รวมร่างเป็นเลเวลถัดไปอัตโนมัติ`), pacts(),
    el('p', 'hint artcredit', 'ภาพชั่วคราว: Dungeon Crawl Stone Soup tiles (CC0)'),
    el('p', 'hint artcredit', '© 2026 Automon Arena · สงวนลิขสิทธิ์ (All rights reserved)')]; // set 190 S-B1 owner line (HARD RULE 9)
};
$('legendBtn').addEventListener('click', () => openPop('legend'));
// enemy + reward line + scout preview (R5: no rune ทำนาย = enemy hidden) · set 107: no modes, the HUD shows the enemy power %
const RN_OFF_TH = k => { const st = RUN_STAGE.settings, RK = { common: 'C', rare: 'R', legend: 'L' }, boss = k === 'boss',
    ro = RULES.runeOdds[Math.max(1, Math.min(RULES.runeOddsRounds, P.round | 0)) - 1] || {}, tot = RUNE_RARITY.reduce((s, [r]) => s + (+ro[r] || 0), 0) || 1; // set 171: odds of this round (RULES.runeOdds)
  return RUNE_RARITY.map(([r, th]) => [boss ? st[`offBoss${RK[r]}`] | 0 : Math.round((+ro[r] || 0) * 100 / tot), th]).filter(([n]) => n > 0).map(([n, th]) => boss ? `${th} ${n}` : `${th} ${n}%`).join(' · '); };
let diffText = { hint: '', scout: '' };
const nextFoe = () => (BOT_OK ? pickFoe(BOT_TEAMS, P.fp | 0, P.round, P.seed, P.extra, undefined, undefined, P.ls | 0, P.ws | 0) : null); // set 129: P.ls = losses in a row → lower floor // set 128 (user X9 A): locked at shop start (P.fp), not re-picked at the fight · // set 119: real team, +foeExtraPct only in extra matches
function renderDiff(fx) {
  const rb = runBossAt(P), want = foeWantPct(P.extra);
  $('foeLbl').hidden = !!rb; $('foePct').textContent = `${want}%`;
  $('bossChip').hidden = !rb; $('bossChip').textContent = rb ? `บอส: ${rb.boss.name}` : '';
  diffText.hint = rb && isDummy(rb.boss) ? `รอบสุดท้าย: หุ่นเป้า เลือดไม่มีวันหมด ไม่โจมตี · ตีให้ได้ดาเมจมากที่สุดใน ${RUN_STAGE.settings.dummySec} วิ` : rb ? `รอบบอส · ชนะ = เลือกรูนฟรี 1 อัน (${RN_OFF_TH('boss')})` : `ศัตรู: ทีมบอทจริงพลังใกล้ทีมคุณ · แรง ${want}%${P.extra ? ' (แมตช์พิเศษ)' : ' (ไม่ขยายพลัง)'} · ชนะ = เงินตามปกติ + เลือกรูนฟรี 1 จาก ${RUN_STAGE.settings.offCards} ใบ (${RN_OFF_TH('win')}) · แพ้ = เสียหัวใจ ไม่ได้รูน`;
  if (rb) diffText.scout = `ศัตรู: บอส ${rb.boss.name}`;
  else if (!fx.scout) diffText.scout = 'ไม่เห็นทีมศัตรู (ต้องมีรูนส่องทีม)';
  else {
    const foe = nextFoe();
    diffText.scout = foe ? `ทีมศัตรู${foe.rn.length ? ` (มีรูน ${foe.rn.length} แบบ)` : ''}: ` + foe.team.map(e => `${rnSlotTh([e.row, e.lane])} ${e.id} ${CM[e.id] ? CM[e.id].name : ''} Lv${e.level}`).join(' · ') : 'ศัตรูเป็นบอทซื้อสด (ดูล่วงหน้าไม่ได้)';
  }
}
POPS.diff = () => {
  const rb = runBossAt(P), h = el('p', '', diffText.hint), sc = el('p', 'scout hint', diffText.scout); h.id = 'diffHint'; sc.id = 'scoutBox';
  const S2 = RUN_STAGE.settings;
  const lines = rb ? [] : [el('p', 'hint', (P.extra ? `แมตช์พิเศษ: แรงขึ้น ${S2.foeExtraPct}% · ` : '') + 'พลังเทียบกับทีมบนบอร์ดคุณ (ไม่นับรูน) · บอทเล่นแบบคนจริง (รวมร่าง + มีรูน)')];
  return [phead(rb ? 'รอบบอส' : 'ศัตรูรอบนี้'), h, ...lines, ...(rnFx(P).scout && !rb ? [foeMini()] : [sc]), pacts()]; // set 128: X9 → mini board here too
};
$('diffInfo').addEventListener('click', () => openPop('diff'));
// player team for a fight: runes equipped (rnFromCompact) → { units, opts }
function playerSide(teamA, runes, streak = stats.streak) {
  const e = equipRunes(buildTeam(teamA, CM), rnFromCompact(runes || []), { winStreak: streak });
  return { units: e.units, opts: e.tribeExtra.length ? { tribeExtra: e.tribeExtra } : {} };
}
$('offerReroll').addEventListener('click', () => { pushMsgs(J('or', [], () => rnRerollOffer(P))); saveRun(); render(); });
$('offerSkip').addEventListener('click', () => { pushMsgs(J('sk', [], () => rnSkipOffer(P))); saveRun(); render(); });

