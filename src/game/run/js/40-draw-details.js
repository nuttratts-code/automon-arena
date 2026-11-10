// ---------- วาดหน้าจอ ----------
// el(tag, cls, text) มาจาก game/view.js
const shapeOf = (id, level) => unitShape(CM[id], level); // ชุด 25: รูปรายตัว (game/view.js)
const refKey = r => r.at === 'board' ? `b:${r.row}:${r.lane}` : r.at === 'bench' ? `n:${r.i}` : `s:${r.i}`;
const sameRef = (a, b) => a && b && refKey(a) === refKey(b);
// set 183 (B1): marks instead of text that got cut — tribe shapes in the shop, "◆2" rune count on a unit (names in title + aria-label)
function tribeLine(ts) { const s = el('span', 'sub tr'); s.title = ts.join(' + '); s.setAttribute('aria-label', 'เผ่า ' + ts.join(' + ')); s.append(...ts.map(t => tribeIco(t))); return s; }
function runeMark(names, cls) { const m = el('span', 'rune-dot' + (cls || ''), '◆' + names.length); m.title = 'รูน: ' + names.join(', '); m.setAttribute('aria-label', 'รูน ' + names.join(', ')); return m; }
function unitAt(ref) { return ref.at === 'board' ? P.board[ref.row][ref.lane] : ref.at === 'bench' ? P.bench[ref.i] : null; }
// set 128 (X3 bug): copies needed to merge = rune รวมร่างเร็ว on a unit of this kind (core rnFx().fast, same as shop.js) else S.mergeCount
const mergeNeed = id => rnFx(P).fast[id] || S.mergeCount;
function shopMergeTargets(id) { // set 106: Lv1 copies a shop card can be dropped on (buy + merge)
  const lv1 = allUnits(P).filter(x => x.u.id === id && x.u.level === 1);
  return lv1.length >= Math.max(1, mergeNeed(id) - 1) ? lv1.map(x => x.ref) : [];
}
function mergeTargets(u) { // ตัวชนิดเดียวกัน เลเวลเท่ากัน ที่มีครบ (3 · รูนรวมร่างเร็ว 2)
  if (!u || u.level >= RULES.maxLevel) return [];
  const same = allUnits(P).filter(x => x.u.id === u.id && x.u.level === u.level);
  return same.length >= mergeNeed(u.id) ? same.map(x => x.ref) : [];
}

// B3: HUD chips are refreshed when a round starts (render) and again when the result popup shows (not during the fight, so the result is not spoiled)
function renderChips() {
  const rb = runBossAt(P); // set 85: boss rounds
  $('sRound').textContent = rb ? `รอบ ${P.round} · บอส!` : `รอบ ${P.round}`;
  $('sHeartsN').textContent = String(P.hearts); $('sHearts').setAttribute('aria-label', `หัวใจ ${P.hearts}`);
  $('sWins').textContent = P.extra ? `ชนะ ${P.wins} · พิเศษ` : `ชนะ ${P.wins}/${S.winsToFinish}`;
  $('sGoldN').textContent = String(P.gold); $('sGold').setAttribute('aria-label', `เงิน ${P.gold}`);
}
// set 89: shop level follows the round (no upgrade) · set 96: income ramps · set 97: short text on the dock, full text + odds in a popup
function shopLvText() { const lv = shopLvOf(P), nx = lvForRound(P.round + 1); return `ร้าน Lv ${lv}/${shopLevels()}${nx > lv ? ` · รอบหน้า Lv ${nx}` : ''} · รอบหน้าได้เงิน ${baseIncomeAt(P.round + 1)}${S.winBonus ? ` (ชนะ +${S.winBonus})` : ''}`; }
function renderShopLevel() {
  const lv = shopLvOf(P), nx = lvForRound(P.round + 1), b = $('shopLv');
  const t = el('b', ''); t.append(el('span', 'wd', 'ร้าน '), `Lv ${lv}`, el('span', 'wd', `/${shopLevels()}`), nx > lv ? ` → ${nx}` : ''); // set 159: phone = "Lv 1 → 2 · +13" (full text in the shop popup)
  const nx2 = el('span', ''); nx2.append(' · ', el('span', 'wd', 'รอบหน้า '), `+${baseIncomeAt(P.round + 1)}`);
  b.replaceChildren(t, nx2);
}
POPS.shop = () => {
  const odds = oddsAt(shopLvOf(P)), box = el('p', 'hint odds'); box.id = 'shopOdds'; box.append(el('span', '', 'โอกาสเจอ:'));
  for (const r of Object.keys(odds)) if (odds[r] > 0) box.append(el('span', 'rar ' + RARITY_CLASS[r], `${r} ${odds[r]}%`));
  return [phead('ร้านค้า', shopLvText()), box, el('p', 'hint', `รีโรล ${S.rerollCost} เงิน · ระดับร้านขึ้นเองตามรอบ · ลากตัวในร้านไปวางบนบอร์ด/ม้านั่ง = ซื้อ · ลากไปทับตัวชนิดเดียวกัน (มีเลเวล 1 ครบ 2 ตัว) = ซื้อแล้วรวมร่างทันที ม้านั่งเต็มก็ได้ · ลากตัวของคุณมาที่แถบร้าน = ขาย`), pacts()];
};
$('shopLv').addEventListener('click', () => openPop('shop'));
function render() {
  renderChips();
  const freeR = P.rn.free | 0; // set 128 (T4 bug): free rerolls from rune มองหา are used first (core reroll) → show ฟรี + usable with 0 gold
  $('rerollCost').textContent = freeR ? `· ฟรี ${freeR}` : `· ${S.rerollCost}`; $('reroll').setAttribute('aria-label', freeR ? `สุ่มร้านใหม่ฟรี (เหลือ ${freeR} ครั้ง)` : `สุ่มร้านใหม่ ${S.rerollCost} เงิน`);
  $('reroll').classList.toggle('free', !!freeR);
  $('reroll').disabled = (!freeR && P.gold < S.rerollCost) || P.over;
  renderShopLevel();

  const shop = $('shop'); shop.replaceChildren();
  shop.style.setProperty('--n', String(P.shop.length)); shop.classList.toggle('many', P.shop.length > 5); // set 128 (T3 A): rune แผงใหญ่ up to 8 slots stay in one row
  P.shop.forEach((s, i) => {
    const ref = { at: 'shop', i };
    const card = el('div', 'slot'); card.dataset.ref = refKey(ref); card.tabIndex = 0;
    card.setAttribute('role', 'button');
    if (!s.id) { card.classList.add('empty'); card.setAttribute('aria-label', 'ขายแล้ว'); shop.append(card); return; }
    const c = CM[s.id];
    card.setAttribute('aria-label', `${c.id} ${c.name} ${c.rarity} ราคา ${c.price}`);
    if (s.locked) card.classList.add('locked');
    if (c.price > P.gold) card.classList.add('cant');
    const txt = el('span', 'stxt'); txt.append(el('span', 'uname', c.name), tribeLine([c.tribe, ...c.extraTribes])); // set 159: rarity = ring colour, text only in the floating card
    card.append(shapeOf(c.id), txt, el('span', 'price', String(c.price)));
    // ชุด 24: ไฮไลต์ตัวที่มีอยู่แล้วบนบอร์ด/ม้านั่ง · มี Lv1 ครบ (รวมร่าง − 1) ตัว = ซื้อแล้วรวมร่างได้
    const mine = allUnits(P).filter(x => x.u.id === c.id), lv1 = mine.filter(x => x.u.level === 1).length;
    if (mine.length) {
      const ready = lv1 >= mergeNeed(c.id) - 1;
      card.classList.add('owned'); if (ready) card.classList.add('ready');
      card.append(el('span', 'own', ready ? `มีแล้ว ${lv1} · ซื้อ = ★★` : `มีแล้ว ${mine.length}`));
      card.setAttribute('aria-label', `${c.id} ${c.name} ราคา ${c.price} · มีแล้ว ${mine.length} ตัว${ready ? ' ลากไปทับตัวที่มีเพื่อซื้อแล้วรวมร่างทันที' : ''}`);
    }
    shop.append(card);
  });

  const cellFor = ref => {
    const u = unitAt(ref), cell = el('div', 'cell'); cell.dataset.ref = refKey(ref); cell.tabIndex = 0; cell.setAttribute('role', 'button');
    if (u) {
      cell.classList.add('filled');
      const c = CM[u.id];
      const box = el('div', 'unit'); box.append(shapeOf(u.id, u.level), el('span', 'uname', c.name));
      if (Object.keys(u.perm).length) cell.append(el('span', 'perm-dot', '+ถาวร'));
      cell.append(box);
      cell.setAttribute('aria-label', `${c.id} ${c.name} เลเวล ${u.level}`);
      if (hiTribe) { const on = [c.tribe, ...(c.extraTribes || [])].includes(hiTribe); cell.classList.add(on ? 'thi' : 'tdim'); if (on) cell.style.setProperty('--tc', TRIBE_STYLE[hiTribe].color); }
    } else cell.setAttribute('aria-label', 'ช่องว่าง');
    if (u) { const rs = runesOn(u); if (rs.length) cell.append(runeMark(rs, ref.at === 'board' ? '' : ' off')); } // set 109: runes worn by this unit (bench = not working)
    return cell;
  };
  // grid fills row by row: top lane (หลัง กลาง หน้า) then bottom lane · front column faces the enemy (right)
  const cells = []; for (let lane = 0; lane < 2; lane++) for (const row of [2, 1, 0]) cells.push(cellFor({ at: 'board', row, lane }));
  $('board').replaceChildren(...cells);
  $('bench').replaceChildren(...P.bench.map((_, i) => cellFor({ at: 'bench', i })));
  $('benchCnt').textContent = `${P.bench.filter(Boolean).length}/${P.bench.length}`;

  // HUD: tribes on the board (mini shapes of the 3 biggest + active/total) · runes held · replays
  const entries = teamEntries(P), counts = countTribes(entries, CM), steps = tribeSteps(counts);
  const have = Object.keys(counts).filter(t => counts[t] > 0).sort((a, b) => counts[b] - counts[a]);
  $('tribeMini').replaceChildren(...have.slice(0, 3).map(t => { const i = el('i', 's-' + TRIBE_STYLE[t].shape); i.style.setProperty('--tc', TRIBE_STYLE[t].color); return i; }));
  $('tribeCnt').textContent = `${have.filter(t => steps[t]).length}/${have.length}`;
  renderRunes();
  $('replayBtn').hidden = !replays.length; $('replayCnt').textContent = String(replays.length);

  const rb = runBossAt(P);
  $('fight').disabled = P.over;
  $('fightT').textContent = confirmEmpty || confirmRunes ? 'ยืนยันสู้' : rb ? 'สู้บอส' : 'เริ่มสู้';
  // set 169 (brainstorm UI ease): the button says what to do next · board empty = look secondary, with ≥1 unit = primary + ring · same 'ลงสนาม' text kept (ui_smoke)
  const benchHas = P.bench.some(Boolean), cue = entries.length ? '' : benchHas ? ' · ลากตัวขึ้นบอร์ด' : ' · ซื้อตัวจากร้านก่อน';
  $('fightN').textContent = `ลงสนาม ${entries.length}/6 ตัว${cue}`;
  $('fight').classList.toggle('wait', !entries.length && !P.over); $('fight').classList.toggle('ready', entries.length > 0 && !P.over);
  if (popKind) renderPop();
  renderSide();
}

function statLine(id, level, perm, all) {
  // ค่าที่ใช้สู้จริง (รวมค่าถาวรทุกชนิด · ชุด 6) คำนวณด้วยตัวจัดทีมเดียวกับการต่อสู้ · all = แสดงทุกค่าแม้เป็น 0 (ชุด 26)
  const c = CM[id], p = perm || {}, u = unitOf(c, { id, level, row: 0, lane: 0, perm: p }, RULES, null);
  return [
    ['HP', u.maxHp], ['พลังโจมตี', u.atk],
    ['คูลดาวน์', `${(Math.max(RULES.minCooldownMs, u.cdMs) / 1000).toFixed(2)} วิ`],
    ['มัลติฮิต', u.multi], ['ไฟ/ฮิต', u.burnHit], ['ช็อต/ฮิต', u.shockHit],
    ...(u.armorHit || all ? [['เกราะ/ฮิต', u.armorHit]] : []),
    ...(u.healHit || all ? [['ฟื้น/ฮิต', u.healHit]] : []),
    ...(u.startArmor ? [['เกราะสะสม (ถาวร)', u.startArmor]] : []),
  ];
}
// set 106 (playtest G3): tap a stat name = one-line meaning · keyword list from GLOSSARY (game/labels.js)
const STAT_HELP = {
  HP: 'พลังชีวิต · ถึง 0 = ล้ม', 'พลังโจมตี': 'ดาเมจต่อ 1 ฮิต (ก่อนหักเกราะ)', 'คูลดาวน์': 'เวลารอระหว่างการโจมตีแต่ละชุด ยิ่งน้อยยิ่งตีถี่',
  'มัลติฮิต': 'จำนวนฮิตใน 1 ชุดการโจมตี · มัลติฮิต 3 = ตีชุดละ 3 ฮิต', 'ไฟ/ฮิต': 'ทุกฮิตที่ตีโดน ใส่ไฟให้เป้าเท่านี้ · ไฟทำดาเมจทุก 1 วิ แล้วลดลง (โดนเกราะกัน)',
  'ช็อต/ฮิต': 'ทุกฮิตที่ตีโดน ใส่ช็อตให้เป้าเท่านี้ · ช็อตทำให้ทุกฮิตที่เป้าโดน แรงขึ้นเท่าจำนวนช็อต เข้า HP ตรง ไม่โดนเกราะ',
  'เกราะ/ฮิต': 'ทุกฮิตที่ตีโดน ตัวเองได้เกราะเท่านี้ · เกราะกันดาเมจก่อน HP', 'ฟื้น/ฮิต': 'ทุกฮิตที่ตีโดน ตัวเองฟื้น HP เท่านี้',
  'เกราะสะสม (ถาวร)': 'ค่าถาวรจากสกิลร้านค้า · ได้เกราะเท่านี้ทุกครั้งที่เริ่มแมตช์',
};
function termEl(k, v, help) {
  const d = el('span', 'term' + (v === 0 ? ' zero' : ''), `${k} `); d.append(el('b', '', String(v))); // set 169: value 0 stays visible but quieter (set 26: all values shown)
  const tip = STAT_HELP[k]; if (!tip) return d;
  d.title = tip; d.tabIndex = 0; d.setAttribute('role', 'button');
  const show = () => { help.textContent = `${k}: ${tip}`; };
  d.addEventListener('click', show); d.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(); } });
  return d;
}
POPS.gloss = () => { const ul = el('ul', 'msgs'); for (const [k, t] of GLOSSARY) { const li = el('li'); li.append(el('b', '', k + ': '), t); ul.append(li); } return [phead('คำศัพท์', 'ไฟ ช็อต มัลติฮิต ฯลฯ'), ul, pacts()]; };
// set 97: unit details (shop card / board / bench) · Lv1/2/3 tabs · buy + lock (shop) or sell (own unit)
// set 120 (user): shown in the pane next to the bench, not a popup · skill text first · the pane follows the picked unit (by uid) or shop card
let sel = null; // { uid } own unit · { at:'shop', i, id } shop card
function selRef() {
  if (!sel || !P) return null;
  if (sel.at === 'shop') return P.shop[sel.i] && P.shop[sel.i].id === sel.id ? { at: 'shop', i: sel.i } : null;
  const x = allUnits(P).find(x => x.u.uid === sel.uid); return x ? x.ref : null;
}
function renderSide() {
  const pane = $('sidePane'), ref = selRef(); if (!ref) sel = null;
  const nodes = ref ? unitInfo(ref) : null;
  document.querySelectorAll('#app [data-ref].picked').forEach(n => n.classList.remove('picked'));
  if (!nodes) { sel = null; pane.hidden = true; pane.replaceChildren(); return; }
  pane.replaceChildren(...nodes); pane.hidden = false;
  const n = document.querySelector(`#app [data-ref="${refKey(ref)}"]`); if (n) n.classList.add('picked');
  placeCard(pane, n, ref.at === 'shop');
}
// px of card content below the card's inner bottom (0 = everything fits, no scrolling)
function cardOver(card) { const k = card.lastElementChild; if (!k || card.hidden) return 0; const r = card.getBoundingClientRect(); return Math.round(k.getBoundingClientRect().bottom - (r.bottom - parseFloat(getComputedStyle(card).paddingBottom))); }
// set 121: put a floating card beside its anchor (left/right where it fits · shop cards prefer above) · arrow points at the anchor
function placeCard(card, a, up) {
  card.classList.remove('toR', 'toL', 'toU', 'noarrow', 'wide');
  if (cardOver(card) > 1) card.classList.add('wide'); // too tall for the screen → a wider card (fewer lines) instead of a scrollbar
  if (!a || !a.isConnected) { card.classList.add('noarrow'); return; }
  const r = a.getBoundingClientRect(), w = card.offsetWidth, h = card.offsetHeight, W = innerWidth, H = innerHeight, g = 10, m = 8;
  const cl = (v, lo, hi) => Math.min(Math.max(lo, v), Math.max(lo, hi));
  const sideFits = W - r.right - g >= w + m || r.left - g >= w + m, upFits = r.top - g >= h + m;
  let x, y, side;
  if (up && upFits || !sideFits && upFits) { side = 'toU'; y = r.top - g - h; x = cl(r.left + r.width / 2 - w / 2, m, W - w - m); }
  else { side = W - r.right >= r.left ? 'toR' : 'toL'; x = cl(side === 'toR' ? r.right + g : r.left - g - w, m, W - w - m); y = cl(r.top + r.height / 2 - h / 2, m, H - h - m); }
  card.style.left = Math.round(x) + 'px'; card.style.top = Math.round(y) + 'px'; card.classList.add(side);
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  if (cx > x && cx < x + w && cy > y && cy < y + h) card.classList.add('noarrow'); // no room: card sits over the unit
  card.style.setProperty('--ay', Math.round(cl(cy - y - 7, 12, h - 26)) + 'px');
  card.style.setProperty('--ax', Math.round(cl(cx - x - 7, 12, w - 26)) + 'px');
}
// tap anywhere else (not the card, not another unit/shop card, not a popup) = close the card · Esc too
const refHas = ref => ref && (ref.at === 'shop' ? !!(P.shop[ref.i] && P.shop[ref.i].id) : !!unitAt(ref));
document.addEventListener('pointerdown', e => {
  if (!P || e.target.closest('.fcard, dialog')) return;
  if ($('app').classList.contains('fighting')) { if (bPick != null && !e.target.closest('#arena .cell, #dock')) bUnpick(); return; }
  if ($('sidePane').hidden) return;
  const t = e.target.closest('#app [data-ref]'); if (t && refHas(parseRef(t.dataset.ref))) return;
  sel = null; renderSide();
}, true);
document.addEventListener('keydown', e => { if (e.key !== 'Escape' || document.querySelector('dialog[open]')) return; if (bPick != null) bUnpick(); else if (sel) { sel = null; renderSide(); } });
addEventListener('resize', () => { if (P && sel) renderSide(); if (bPick != null) renderBInfo(true); });
function unitInfo(ref) {
  let id, level = 1, perm = {}, u = null;
  if (ref.at === 'shop') { id = P.shop[ref.i] && P.shop[ref.i].id; if (!id) return null; }
  else { u = unitAt(ref); if (!u) return null; id = u.id; level = u.level; perm = u.perm; }
  const c = CM[id];
  // ชุด 26 (ผู้ใช้เลือก): ปุ่มสลับดู Lv1/2/3 · ค่าเริ่ม = เลเวลของตัวนี้ · เลือกตัวใหม่ = กลับค่าเริ่ม
  const key = refKey(ref) + ':' + id + ':' + level;
  if (infoLv.key !== key) infoLv = { key, lv: level };
  const vl = infoLv.lv;
  const wrap = el('div', 'info'); wrap.id = 'info'; wrap.append(shapeOf(id, vl));
  const right = el('div'); right.style.display = 'grid'; right.style.gap = '4px'; right.style.minWidth = '0';
  const extra = c.extraTribes.length ? ` + ${c.extraTribes.join(', ')}` : '';
  const head = el('div', 'ihead'); const h2 = el('h2', '', `${c.id} ${c.name} `); h2.append(rarityTag(c.rarity)); // set 159: rarity sits by the name (shop slots show it by ring colour only)
  head.append(h2, el('span', 'hint', `${c.tribe}${extra} · แถว${rowHintTh(c.rowHint)}`));
  right.append(head);
  // สกิลเฉพาะเลเวลอื่น แสดงจาง · ค่าในคำอธิบายขีดเส้นใต้ตามเลเวลที่เลือกดู · set 120: skill text first (the pane is small)
  // set 142: skills with the same trigger share one line (skillGroups) · battle log stays per skill
  for (const g of skillGroups(c.skills)) { const sk = g[0], on = !sk.lv || sk.lv.includes(vl); const line = el('span', on ? 'skill' : 'skill off'); line.append(skillTags(sk), skillGroupEl(g, on ? vl : 0)); right.append(line); }
  if (!c.skills.length) right.append(el('span', 'hint', 'ไม่มีสกิล'));
  const lvBar = el('div', 'lvtabs'); lvBar.setAttribute('role', 'group'); lvBar.setAttribute('aria-label', 'ดูค่าพลังเลเวล');
  for (let L = 1; L <= RULES.maxLevel; L++) {
    const b = el('button', '', `Lv${L}${L === level && ref.at !== 'shop' ? ' (ตอนนี้)' : ''}`); b.type = 'button'; b.dataset.lv = String(L);
    b.setAttribute('aria-pressed', String(L === vl));
    b.addEventListener('click', () => { infoLv.lv = L; renderSide(); });
    lvBar.append(b);
  }
  right.append(lvBar);
  const st = el('div', 'stats2'), help = el('span', 'hint termhelp', 'แตะชื่อค่าเพื่อดูความหมาย');
  for (const [k, v] of statLine(id, vl, {}, true)) st.append(termEl(k, v, help));
  right.append(st);
  // ค่าถาวร: แยกแถว "ตอนนี้ (รวมถาวร)" ของเลเวลปัจจุบัน (ผู้ใช้เลือก)
  if (Object.values(perm).some(v => v)) {
    const now = el('div', 'stats2 now'); now.append(el('span', 'nowlbl', `ตอนนี้ Lv${level} (รวมถาวร)`));
    for (const [k, v] of statLine(id, level, perm, true)) now.append(termEl(k, v, help));
    right.append(now);
  }
  const foot = el('div', 'cfoot'); foot.append(help, pbtn('คำศัพท์', () => openPop('gloss'))); right.append(foot);
  const pk = Object.entries(perm).filter(([, v]) => v);
  if (pk.length) right.append(el('span', 'perm', 'ค่าถาวร: ' + pk.map(([k, v]) => permText(k, v)).join(' · ')));
  wrap.append(right);
  let acts;
  if (ref.at === 'shop') {
    const s = P.shop[ref.i], cant = c.price > P.gold;
    const mt = shopMergeTargets(id);
    acts = sacts(pbtn(s.locked ? 'ปลดล็อก' : 'ล็อก', () => { pushMsgs(J('lk', [ref.i], () => toggleLock(P, ref.i))); render(); }),
      ...(mt.length ? [pbtn(`ซื้อ + รวมร่าง ${c.price} เงิน`, () => { sel = null; pushMsgs(J('bm', [ref.i, rlRef(mt[0])], () => buyMerge(P, ref.i, mt[0], chars))); confirmEmpty = confirmRunes = false; render(); }, 'primary', cant)] : []),
      pbtn(cant ? `ซื้อ ${c.price} เงิน · เงินไม่พอ (มี ${P.gold})` : `ซื้อลงม้านั่ง ${c.price} เงิน`, () => doBuy(ref.i, null), 'primary', cant));
  } else {
    const mt = mergeTargets(u);
    acts = sacts(...(mt.length ? [el('span', 'hint grow', 'รวมร่างได้: ลากไปทับตัวชนิดเดียวกันที่มีกรอบสีทอง')] : []),
      pbtn(`ขาย ได้คืน ${u.paid}`, () => doSell(ref), 'danger'));
  }
  head.append(acts);
  return [wrap];
}
const sacts = (...x) => { const a = el('div', 'acts'); a.append(...x); return a; };

