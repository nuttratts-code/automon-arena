// ---------- Set 86: ดูผล "รันจริง (บอท)" ----------
// The human-like bot (core/bot.js) plays whole runs: shop rounds, boss rounds from the "รูน / บอส" tab being edited, hearts, 10 wins.
// Uses the values being edited (chars / rules / stage). Kept apart from the normal measure (lastRun / results/latest untouched).
let anaPlayRun = null;
function anaRunHint() {
  const fit = botTeamsFit(chars, rulesNow());
  return 'บอทเล่นทั้งรันเหมือนคนจริง (ซื้อ/ขาย/สุ่มร้านเอง · แต่ละรันเอนไปเผ่าหนึ่งวนครบ 6 เผ่า · เจอบอสตามตั้งค่าด่าน · ศัตรูเลือกตามพลังทีมเหมือนในเกม · ทั้งสองฝั่งใส่รูน · หัวใจหมด = จบ · ชนะครบ 10 แล้วเล่นต่อถึงรอบสุดท้าย) · วิธีเดียวกับการวัด runerun ของ Claude: ค่าเดิม = ตัวเลขตรงกัน · ใช้ค่าตัวละคร/กฎ/บอสที่กำลังแก้ · ผลนี้เก็บแยก ไม่ทับผลวัดปกติ'
    + (fit ? '' : ' · ⚠ ค่าที่แก้ต่างจากค่าที่สร้างทีมบอทในเกม → "ทีมบอทในเกม" จะใช้บอทเล่นสดแทน');
}
$('anaRunOpp').addEventListener('change', renderAnaMode);

async function runPlayAnalysis() {
  const btn = $('analyze'); btn.disabled = true;
  try {
    const v = validateConfig(chars, rulesNow()); if (!v.ok) { $('msg').textContent = 'แก้ค่าที่ผิดก่อน (ดูรายการสีแดงในขั้นแก้)'; return; }
    const n = Math.max(1, Math.min(5000, +$('anaRunN').value || 300)), opp = $('anaRunOpp').value === 'live' ? 'live' : 'teams';
    $('msg').textContent = `กำลังจำลอง ${n.toLocaleString()} รัน…`;
    const t0 = Date.now();
    anaPlayRun = await runPlayStats(clone(chars), rulesNow(), stageCfg, { n, opp, combat: true, onProgress: x => { $('prog').style.width = `${x * 100}%`; $('msg').textContent = `กำลังจำลอง ${Math.round(x * n).toLocaleString()} / ${n.toLocaleString()} รัน…`; } });
    renderPlayRun(); runSortAll(); renderAnaMode();
    $('msg').textContent = `จำลองรันเสร็จ · ${n.toLocaleString()} รัน · ${anaPlayRun.matches.toLocaleString()} แมตช์ · ${Math.round((Date.now() - t0) / 1000)} วิ`
      + (anaPlayRun.aborted ? ` · ⚠ ${anaPlayRun.aborted} แมตช์ผิดปกติ ถูกตัวตัดนิรภัยหยุด` : '');
  } catch (e) {
    $('msg').textContent = 'จำลองไม่สำเร็จ: ' + e.message;
  } finally {
    $('prog').style.width = '0'; btn.disabled = false;
  }
}
function runEmptyRow(cols) { const tr = document.createElement('tr'), c = td('ไม่มีข้อมูล', 'status'); c.colSpan = cols; tr.append(c); return tr; }
function renderPlayRun() {
  const R = anaPlayRun; if (!R) return;
  const cards = $('runCards').children;
  cards[0].firstChild.textContent = `${fmt(R.won)}%`;
  cards[1].firstChild.textContent = fmt(R.avgWins);
  cards[2].firstChild.textContent = fmt(R.avgRounds);
  cards[3].firstChild.textContent = fmt(R.lv3Final);
  cards[4].firstChild.textContent = `${fmt(R.avgTime)} วิ`;
  cards[5].firstChild.textContent = `${fmt(R.normalWin)}%`;
  cards[6].firstChild.textContent = `${fmt(R.second)}%`;
  $('runBossK').replaceChildren(...(R.bossK.length ? R.bossK.map(x => {
    const tr = document.createElement('tr');
    tr.append(td(`ครั้งที่ ${x.k}`), td(`${fmt(x.mainReach)}%`, 'n'), td(x.mainWin == null ? '–' : `${fmt(x.mainWin)}%`, 'n'), td(x.games.toLocaleString(), 'n'), td(`${fmt(x.win)}%`, 'n'));
    return tr;
  }) : [runEmptyRow(5)]));
  $('runWs').replaceChildren(...(R.byWs.length ? R.byWs.map(x => {
    const tr = document.createElement('tr');
    tr.append(td(x.ws >= 5 ? '5 ขึ้นไป' : String(x.ws), 'n'), td(x.games.toLocaleString(), 'n'), td(`${fmt(x.win)}%`, 'n'));
    return tr;
  }) : [runEmptyRow(3)]));
  const rOrder = ['ธรรมดา', 'ไม่ธรรมดา', 'หายาก', 'หายากมาก'];
  $('runLv3').replaceChildren(...(R.lv3First.length ? R.lv3First.slice().sort((a, b) => rOrder.indexOf(a.rarity) - rOrder.indexOf(b.rarity)).map(x => {
    const tr = document.createElement('tr'), rt = td(''); rt.append(rarityTag(x.rarity));
    tr.append(rt, td(`${fmt(x.share)}%`, 'n'), td(`รอบ ${x.med}`, 'n'), td(`${x.p25}–${x.p75}`, 'n'));
    return tr;
  }) : [runEmptyRow(4)]));
  $('runMeasureInfo').textContent = `รันหลัก = จนชนะครบ 10 หรือหัวใจหมด · ช่วงเล่นต่อ = แมตช์หลังชนะครบ 10 (${R.extra.games.toLocaleString()} แมตช์ · ชนะ ${fmt(R.extra.win)}%) · ชนะแมตช์ทีมบอทไม่นับบอสและหุ่นซ้อม`
    + (R.foePct ? ` · พลังศัตรูเทียบทีมบอทจริง p10/p50/p90 = ${R.foePct.p10}/${R.foePct.p50}/${R.foePct.p90}%` : '');
  $('runInfo').textContent = `${R.n.toLocaleString()} รัน · คู่แข่ง: ${R.opp === 'teams' ? 'ทีมบอทในเกม 360 ทีม (เลือกตามจำนวนชนะ/แพ้ เหมือนในเกม)' : 'บอทเล่นสด ทีมใหม่ทุกแมตช์'}`
    + (R.askedTeams && R.opp !== 'teams' ? ' (ค่าที่แก้ไม่ตรงกับทีมบอทในเกม จึงใช้บอทเล่นสดแทน)' : '');
  // bosses
  $('runBoss').replaceChildren(...(R.bosses.length ? R.bosses.map(b => {
    const tr = document.createElement('tr');
    const ts = Object.entries(b.tribe).filter(([t, x]) => t !== '-' && x.games >= 5).sort((a, c) => c[1].win - a[1].win);
    const tt = ts.length ? (ts.length > 1 ? `${ts[0][0]} ${fmt(ts[0][1].win, 0)}% / ${ts[ts.length - 1][0]} ${fmt(ts[ts.length - 1][1].win, 0)}%` : `${ts[0][0]} ${fmt(ts[0][1].win, 0)}%`) : '–';
    const tc = td(tt); tc.title = Object.entries(b.tribe).sort((a, c) => c[1].games - a[1].games).map(([t, x]) => `${t === '-' ? 'ไม่มีเผ่าหลัก' : t}: ชนะ ${fmt(x.win)}% (${x.games} แมตช์)`).join('\n');
    tr.append(td(`${b.id} ${b.name}`), td(String(b.k), 'n'), td(String(b.round), 'n'), td(`${b.games} (${fmt(b.reach, 0)}% ของรัน)`, 'n'),
      td(fmt(b.win) + '%', 'n' + (b.win >= 85 ? ' d-up' : b.win <= 30 ? ' d-down' : '')), td(`${fmt(b.bars)} / ${b.maxBars}`, 'n'), td(fmt(b.time) + ' วิ', 'n'), td(fmt(b.lv), 'n'), td(fmt(b.lv3), 'n'), tc);
    return tr;
  }) : [runEmptyRow(10)]));
  // rounds
  $('runRound').replaceChildren(...R.rounds.map(x => {
    const tr = document.createElement('tr');
    tr.append(td(String(x.round), 'n'), td(`${fmt(x.reach, 0)}%`, 'n'), td(fmt(x.win) + '%', 'n'), td(fmt(x.units), 'n'), td(fmt(x.lv), 'n'), td(fmt(x.lv3), 'n'), td(fmt(x.time) + ' วิ', 'n'),
      td(x.boss ? (x.boss === x.games ? 'บอส' : `บอส ${x.boss} แมตช์`) : 'ทีมบอท'));
    return tr;
  }));
  $('runEnds').replaceChildren(...R.ends.map(x => { const tr = document.createElement('tr'); tr.append(td(String(x.wins), 'n'), td(String(x.runs), 'n'), td(fmt(x.pct) + '%', 'n')); return tr; }));
  $('runTribe').replaceChildren(...(R.tribes.length ? R.tribes.map(x => {
    const tr = document.createElement('tr'), tTd = td(x.tribe === '-' ? 'ไม่มีเผ่าที่เปิดโบนัส' : x.tribe); if (x.tribe !== '-') tTd.prepend(tribeBadge(x.tribe));
    tr.append(tTd, td(fmt(x.share) + '%', 'n'), td(fmt(x.won) + '%', 'n'), td(fmt(x.wins), 'n'));
    return tr;
  }) : [runEmptyRow(4)]));
  $('runChars').replaceChildren(...R.chars.slice().sort((a, b) => b.pick - a.pick || b.mGames - a.mGames).map(x => {
    const c = chars.find(q => q.id === x.id) || x, tr = document.createElement('tr'); tr.className = 'click'; tr.tabIndex = 0;
    const nameTd = td(`${x.id} ${c.name}`); nameTd.prepend(charBadge(x.id));
    const rarTd = td(''); rarTd.append(rarityTag(c.rarity));
    tr.append(nameTd, rarTd, td(fmt(x.pick) + '%', 'n'), td(x.runs ? fmt(x.lv) : '–', 'n'), td(x.runs ? fmt(x.won) + '%' : '–', 'n'), td(x.runs ? fmt(x.wins) : '–', 'n'),
      td(x.mGames ? `${fmt(x.mWin)}% (${x.mGames.toLocaleString()})` : '–', 'n'));
    const open = () => { showTab('chars'); setCurrent(x.id); $('editor').scrollIntoView({ block: 'start', behavior: 'smooth' }); };
    tr.addEventListener('click', open); tr.addEventListener('keydown', ev => { if (ev.key === 'Enter') open(); });
    return tr;
  }));
  renderRunRunes(R);
  renderRunCombat();
  $('runCombos').replaceChildren(...(R.combos.length ? R.combos.map((x, i) => {
    const tr = document.createElement('tr'), tc = td(x.ids.join(' '), 'mxt-team');
    tc.title = x.ids.map(id => `${id} ${(chars.find(q => q.id === id) || {}).name || ''}`).join('\n');
    tr.append(td(String(i + 1)), tc, td(String(x.count), 'n'), td(fmt(x.share) + '%', 'n'), td(fmt(x.lv), 'n'));
    return tr;
  }) : [runEmptyRow(5)]));
}
// ---------- Set 138b (user 8 Nov): every รันจริง table sorts by any column · 1st tap = low → high (▲) · 2nd tap = high → low (▼) ----------
// Sorts the rendered rows by the cell text (number = first number in the cell, rarity = rarity order, else text) · kept after a new run.
const runSortState = {}; // tbody id → { col, dir }
function runCellKey(cell) {
  const t = cell.textContent.trim(), ri = RARITIES.indexOf(t);
  if (ri >= 0) return ri;
  if (t === '' || t === '–' || t === '-') return null;
  const m = cell.classList.contains('n') && t.replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return m ? +m[0] : t; // text columns: Thai order with numbers compared as numbers (ครั้งที่ 2 < ครั้งที่ 10)
}
function runSortApply(body) {
  const st = runSortState[body.id], ths = body.closest('table').querySelectorAll('thead th');
  ths.forEach((th, i) => {
    th.textContent = th.dataset.label + (st && st.col === i ? (st.dir > 0 ? ' ▲' : ' ▼') : '');
    th.setAttribute('aria-sort', st && st.col === i ? (st.dir > 0 ? 'ascending' : 'descending') : 'none');
  });
  const rows = [...body.rows]; if (!st || rows.length < 2 || rows[0].cells.length <= st.col) return;
  const key = r => runCellKey(r.cells[st.col]);
  rows.sort((a, b) => { const x = key(a), y = key(b); if (x == null) return 1; if (y == null) return -1;
    const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'th', { numeric: true }); return c * st.dir; });
  body.append(...rows);
}
for (const body of $('anaRun').querySelectorAll('tbody[id]:not([data-nosort])')) {
  body.closest('table').querySelectorAll('thead th').forEach((th, i) => {
    th.dataset.label = th.textContent; th.classList.add('sortable'); th.tabIndex = 0; th.title = 'แตะเพื่อเรียง น้อย → มาก · แตะอีกครั้ง มาก → น้อย';
    const go = () => { const s = runSortState[body.id]; runSortState[body.id] = s && s.col === i ? { col: i, dir: -s.dir } : { col: i, dir: 1 }; runSortApply(body); };
    th.addEventListener('click', go); th.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go(); } });
  });
}
const runSortAll = () => { $('runInfo').textContent += ' · แตะหัวคอลัมน์เพื่อเรียง น้อย → มาก (แตะอีกครั้ง = มาก → น้อย)'; for (const body of $('anaRun').querySelectorAll('tbody[id]:not([data-nosort])')) runSortApply(body); };
// ---------- Set 144 (user 8 Nov): runes in real runs (what-if without each rune) + rune check vs description ----------
const RUNE_FLAG_TH = { strong: ['แรงเกินระดับ', 'bad'], big: ['ส่งผลกับเกมมาก', 'mid'], weak: ['อ่อนกว่าระดับ', 'mid'] };
const rnTag = (text, cls) => { const s = document.createElement('span'); s.className = 'vtag ' + cls; s.textContent = text; return s; };
function renderRunRunes(R) {
  const X = R.runes; if (!X) { $('runRunes').replaceChildren(runEmptyRow(9)); return; }
  $('runRunes').replaceChildren(...(X.rows.length ? X.rows.filter(x => x.games > 0 || x.held > 0).map(x => {
    const tr = document.createElement('tr'), sum = td('');
    for (const f of x.flags || []) sum.append(rnTag(...RUNE_FLAG_TH[f]), ' ');
    if (x.runOnly) sum.append(Object.assign(document.createElement('span'), { className: 'status', textContent: `รูนเงิน/ร้าน · รันที่ได้ชนะเฉลี่ย ${fmt(x.wins)} (ไม่ได้ ${fmt(x.noWins)})` }));
    else if (x.cfN < 30) sum.append(Object.assign(document.createElement('span'), { className: 'status', textContent: 'ข้อมูลน้อย (< 30 แมตช์)' }));
    const up = td(x.uplift == null ? '–' : `${x.uplift >= 0 ? '+' : ''}${fmt(x.uplift)} ±${fmt(x.se)}`, 'n' + (x.flags && x.flags.includes('strong') ? ' d-down' : ''));
    up.title = x.cfN ? `${x.cfN} แมตช์ · ค่ากลางของรูน${runeRarTh(x.rarity)} ${fmt(X.med[x.rarity])} แต้ม` : '';
    tr.append(td(`${x.id} ${x.name}`), td(runeRarTh(x.rarity)), td(`${fmt(x.held)}%`, 'n'), td(x.firstRound == null ? '–' : fmt(x.firstRound), 'n'), td(x.win == null ? '–' : `${fmt(x.win)}% (${x.games})`, 'n'),
      up, td(x.decided == null ? '–' : `${fmt(x.decided)}%`, 'n'), td(x.game == null ? '–' : `${x.game >= 0 ? '+' : ''}${fmt(x.game)}`, 'n' + (x.flags && x.flags.includes('big') ? ' d-down' : '')), sum);
    return tr;
  }) : [runEmptyRow(9)]));
  $('runRunesInfo').textContent = `${X.matches.toLocaleString()} แมตช์ในรันหลัก · ค่ากลางผลของรูน: ` + Object.entries(X.med).map(([k, v]) => `${runeRarTh(k)} ${v == null ? '–' : fmt(v)}`).join(' / ')
    + ` · เกณฑ์ (ค่าเสนอ): แรงเกิน/อ่อนกว่าระดับ = ห่างจากค่ากลางของรูนระดับเดียวกันเกิน ${RUNE_FLAG.gap} แต้ม (และเกินความคลาดเคลื่อน 2 เท่า) · ส่งผลกับเกมมาก = ผลต่อเกมรวม ≥ ${RUNE_FLAG.game} แต้ม · ±ตัวเลข = ความคลาดเคลื่อน (รันมากขึ้น = แคบลง)`;
}
const RC_TAG = { ok: ['ตรงคำอธิบาย', 'good'], warn: ['ตรง แต่ปัดเศษหาย', 'mid'], bad: ['ไม่ตรงคำอธิบาย', 'bad'], info: ['วัดอัตโนมัติไม่ได้', 'mid'] };
function renderRuneCheck(rows) {
  $('runeCheckTbl').replaceChildren(...rows.map(r => {
    const tr = document.createElement('tr'), st = td(''), det = td('');
    st.append(rnTag(...RC_TAG[r.status]));
    const d = document.createElement('details'), sm = document.createElement('summary');
    const lines = r.tests.flatMap(t => t.lines.map(l => ({ ...l, tag: r.max > 1 ? `${t.n} อัน` : '' }))).concat((r.real ? r.real.lines : []).map(l => ({ ...l, tag: 'ค่าจริง' })));
    sm.textContent = r.note || `${lines.filter(l => l.ok).length}/${lines.length} จุดตรง`;
    const ul = document.createElement('ul'); ul.style.margin = '4px 0'; ul.style.paddingLeft = '18px'; ul.style.minWidth = '22em';
    for (const l of lines) { const li = document.createElement('li'); li.textContent = `${l.ok ? '✓' : '✗'} ${l.tag ? `[${l.tag}] ` : ''}${l.what}: คาด ${l.exp} · ได้ ${l.got}`; if (!l.ok) li.className = 'd-down'; ul.append(li); }
    d.append(sm, ul); det.append(d);
    tr.append(td(`${r.id} ${r.name}`), td(r.text), st, det);
    return tr;
  }));
}
$('runeCheckBtn').addEventListener('click', async () => {
  const b = $('runeCheckBtn'); b.disabled = true; $('runeCheckMsg').textContent = 'กำลังตรวจ…';
  await pause();
  try {
    const rows = runeCheckAll(clone(chars), stageCfg), c = k => rows.filter(r => r.status === k).length;
    renderRuneCheck(rows.sort((a, z) => ['bad', 'warn', 'info', 'ok'].indexOf(a.status) - ['bad', 'warn', 'info', 'ok'].indexOf(z.status)));
    $('runeCheckMsg').textContent = `${rows.length} รูน · ตรง ${c('ok')} · ปัดเศษหาย ${c('warn')} · ไม่ตรง ${c('bad')}${c('info') ? ` · วัดไม่ได้ ${c('info')}` : ''}`;
  } catch (e) { $('runeCheckMsg').textContent = 'ตรวจไม่สำเร็จ: ' + e.message; }
  finally { b.disabled = false; }
});

// ---------- Set 160 (user 9 Nov): per-character combat table (damage by source, taken, armor, heal/armor given, kills, survive) ----------
// Numbers come from lab/matchcalc.js mxCombatAdd (same records as the match tab). Filters/unit/source toggles only redraw this table.
const cbView = { u: 'm', src: false };
const CB_LOW = 30; // fewer appearances than this = numbers still swing (row faded)
for (const r of RARITIES) $('cbRar').append(new Option(r, r));
for (const t of TRIBES) $('cbTribe').append(new Option(t, t));
const cbSeg = (id, key, set) => $(id).addEventListener('click', ev => {
  const b = ev.target.closest('button'); if (!b) return;
  for (const x of $(id).querySelectorAll('button')) x.setAttribute('aria-pressed', String(x === b));
  set(b.dataset[key]); renderRunCombat();
});
cbSeg('cbUnit', 'u', v => { cbView.u = v === 's' ? 's' : 'm'; });
cbSeg('cbSrc', 's', v => { cbView.src = !!v; delete runSortState.runCombat; });
$('cbRar').addEventListener('change', cbFilter); $('cbTribe').addEventListener('change', cbFilter); $('cbFind').addEventListener('input', cbFilter);
function cbFilter() {
  const rar = $('cbRar').value, tri = $('cbTribe').value, q = $('cbFind').value.trim().toLowerCase();
  let shown = 0, all = 0;
  for (const tr of $('runCombat').rows) {
    if (!tr.dataset.id) continue; all++;
    const c = chars.find(x => x.id === tr.dataset.id) || {};
    const ok = (!rar || c.rarity === rar) && (!tri || c.tribe === tri || (c.extraTribes || []).includes(tri)) && (!q || `${c.id} ${c.name}`.toLowerCase().includes(q));
    tr.hidden = !ok; if (ok) shown++;
  }
  $('cbCount').textContent = all ? `แสดง ${shown} / ${all} ตัว` : '';
}
function renderRunCombat() {
  const R = anaPlayRun, body = $('runCombat'), head = $('cbHead');
  const L = (R && R.combat) || [], per = cbView.u === 's';
  const srcs = MX_SRC.filter(w => L.some(x => x.src[w] > 0));
  const cols = [['ตัวละคร'], ['ความหายาก'], ['ลงสนาม', 'n', 'จำนวนครั้งที่ตัวนี้อยู่ในทีมตอนสู้'], ['ดาเมจที่ทำ', 'n', 'ดาเมจที่ใส่ศัตรู (แท่งสี = แยกที่มา)'],
    ...(cbView.src ? srcs.map(w => [MX_NAME[w], 'n cb-src', `ดาเมจจาก${MX_NAME[w]}`]) : []),
    ['ทำล้ม', 'n', 'จำนวนศัตรูที่ตัวนี้ตีครั้งสุดท้ายก่อนล้ม'], ['ดาเมจที่โดน', 'n'], ['เกราะกันได้', 'n', 'ส่วนของดาเมจที่โดนที่เกราะรับไว้'], ['HP หายจริง', 'n'],
    ['ฮิลที่ให้', 'n', 'ฮิลที่ให้ตัวเองและเพื่อน'], ['เกราะที่ให้', 'n', 'เกราะที่ให้ตัวเองและเพื่อน'], ['รอดจบแมตช์', 'n', '% ของแมตช์ที่ยังไม่ล้มตอนจบ']];
  const hr = document.createElement('tr');
  cols.forEach(([label, cls, tip], i) => {
    const th = document.createElement('th'); if (cls) th.className = cls; th.dataset.label = label; th.textContent = label;
    th.classList.add('sortable'); th.tabIndex = 0; th.title = (tip ? tip + ' · ' : '') + 'แตะเพื่อเรียง น้อย → มาก · แตะอีกครั้ง มาก → น้อย';
    const go = () => { const st = runSortState.runCombat; runSortState.runCombat = st && st.col === i ? { col: i, dir: -st.dir } : { col: i, dir: -1 }; runSortApply(body); };
    th.addEventListener('click', go); th.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go(); } });
    hr.append(th);
  });
  head.replaceChildren(hr);
  $('cbLegend').replaceChildren(...srcs.map(w => { const s = el('span', '', ''), d = el('i', 'mx-dot', ''); d.style.setProperty('--c', MX_COLOR[w]); s.append(d, MX_NAME[w]); return s; }));
  if (!L.length) { body.replaceChildren(runEmptyRow(cols.length)); cbFilter(); return; }
  const v = (x, k) => (per ? (x.ms > 0 ? x[k] / (x.ms / 1000) : 0) : x[k] / x.n);
  const num = (x, k) => (per ? fmt(v(x, k), 1) : nf(v(x, k)));
  const maxOut = Math.max(1, ...L.map(x => v(x, 'out')));
  body.replaceChildren(...L.map(x => {
    const c = chars.find(q => q.id === x.id) || x, tr = document.createElement('tr'); tr.dataset.id = x.id;
    if (x.n < CB_LOW) { tr.classList.add('cb-low'); tr.title = `ลงสนามแค่ ${x.n} ครั้ง ตัวเลขยังแกว่ง`; }
    const nameTd = td(`${x.id} ${c.name}`); nameTd.prepend(charBadge(x.id));
    const rarTd = td(''); rarTd.append(rarityTag(c.rarity));
    const outTd = td(num(x, 'out'), 'n cb-out'), sv = w => (per ? fmt(x.src[w] / (x.ms / 1000), 1) : nf(x.src[w] / x.n));
    outTd.title = srcs.filter(w => x.src[w] > 0).map(w => `${MX_NAME[w]} ${sv(w)}`).join('\n');
    outTd.append(mxBarSegs(v(x, 'out') / maxOut * 100, srcs.map(w => [x.src[w] || 0, MX_COLOR[w], `${MX_NAME[w]} ${sv(w)}`, x.out])));
    tr.append(nameTd, rarTd, td(x.n.toLocaleString(), 'n'), outTd,
      ...(cbView.src ? srcs.map(w => td(x.src[w] > 0 ? sv(w) : '–', 'n cb-src')) : []),
      td(v(x, 'kills').toFixed(2), 'n'), td(num(x, 'taken'), 'n'), td(num(x, 'abs'), 'n'), td(num(x, 'loss'), 'n'),
      td(num(x, 'heal'), 'n'), td(num(x, 'armor'), 'n'), td(`${fmt(x.alive / x.n * 100)}%`, 'n'));
    return tr;
  }));
  if (!runSortState.runCombat) runSortState.runCombat = { col: 3, dir: -1 };
  runSortApply(body); cbFilter();
}
renderRunCombat();
