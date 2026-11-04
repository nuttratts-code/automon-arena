// ---------- Set 86: ดูผล "รันจริง (บอท)" ----------
// The human-like bot (core/bot.js) plays whole runs: shop rounds, boss rounds from the "รูน / บอส" tab being edited, hearts, 10 wins.
// Uses the values being edited (chars / rules / stage). Kept apart from the normal measure (lastRun / results/latest untouched).
let anaPlayRun = null;
function anaRunHint() {
  const fit = botTeamsFit(chars, rulesNow());
  return 'บอทเล่นทั้งรันเหมือนคนจริง (ซื้อ/ขาย/สุ่มร้านเอง · เจอบอสตามตั้งค่าด่าน · หัวใจหมด = จบ) · ใช้ค่าตัวละคร/กฎ/บอสที่กำลังแก้ · ยังไม่มีรูนในเกมจึงไม่ใส่รูน · ผลนี้เก็บแยก ไม่ทับผลวัดปกติ'
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
    anaPlayRun = await runPlayStats(clone(chars), rulesNow(), stageCfg, { n, opp, onProgress: x => { $('prog').style.width = `${x * 100}%`; $('msg').textContent = `กำลังจำลอง ${Math.round(x * n).toLocaleString()} / ${n.toLocaleString()} รัน…`; } });
    renderPlayRun(); renderAnaMode();
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
  $('runInfo').textContent = `${R.n.toLocaleString()} รัน · คู่แข่ง: ${R.opp === 'teams' ? 'ทีมบอทในเกม 90 ทีม (เลือกตามจำนวนชนะ/แพ้ เหมือนในเกม)' : 'บอทเล่นสด ทีมใหม่ทุกแมตช์'}`
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
  $('runCombos').replaceChildren(...(R.combos.length ? R.combos.map((x, i) => {
    const tr = document.createElement('tr'), tc = td(x.ids.join(' '), 'mxt-team');
    tc.title = x.ids.map(id => `${id} ${(chars.find(q => q.id === id) || {}).name || ''}`).join('\n');
    tr.append(td(String(i + 1)), tc, td(String(x.count), 'n'), td(fmt(x.share) + '%', 'n'), td(fmt(x.lv), 'n'));
    return tr;
  }) : [runEmptyRow(5)]));
}
