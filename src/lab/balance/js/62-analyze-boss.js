// ---------- ชุด 80: ดูผล VS บอส + รูน ----------
// คู่ต่อสู้ VS Bot = วัดแบบเดิม (ทีมสุ่ม vs ทีมสุ่ม) · VS บอส = ทีมสุ่มสู้บอสจากแท็บ "รูน / บอส" (ค่าที่กำลังแก้)
// ผล VS บอสเก็บแยก (anaBossRun) ไม่ทับผลวัดปกติ (lastRun / results/latest ที่ใช้นำค่าตัวละครเข้าเกม)
let anaFoe = 'bot', anaRune = 'none', anaPickIds = [], anaBossRun = null, anaRuneRun = null;
const ANA_BOSS_N = { 12000: [500, 150], 24000: [2000, 300] }; // [แมตช์ต่อบอส, แมตช์ต่อรูน] ตามตัวเลือกจำนวนแมตช์
const anaRunePool = () => battleRunes(stageCfg);
const anaLevelVal = () => ($('anaLevel').value === 'mix' ? 'mix' : +$('anaLevel').value);
const anaBossKVal = () => Math.max(1, Math.min(30, Math.round(+$('anaBossK').value) || 1));
const anaBossIds = () => ($('anaBossPick').value ? [$('anaBossPick').value] : stageCfg.bosses.filter(b => b.on).map(b => b.id));

function renderAnaMode() {
  const boss = anaFoe === 'boss', run = anaFoe === 'run';
  $('anaFoeBot').setAttribute('aria-pressed', String(anaFoe === 'bot')); $('anaFoeBoss').setAttribute('aria-pressed', String(boss)); $('anaFoeRun').setAttribute('aria-pressed', String(run));
  $('anaRunTools').hidden = !run; $('anaRuneRow').hidden = run; $('mN').hidden = run; $('mNLab').hidden = run;
  $('anaBossTools').hidden = !boss;
  for (const [id, v] of [['anaRuneNone', 'none'], ['anaRuneRand', 'random'], ['anaRunePick', 'pick']]) $(id).setAttribute('aria-pressed', String(anaRune === v));
  $('anaRuneRandBox').hidden = anaRune !== 'random';
  $('anaRunePickBox').hidden = run || anaRune !== 'pick';
  // บอสที่เปิดใช้
  const sel = $('anaBossPick'), keep = sel.value, list = stageCfg.bosses.filter(b => b.on);
  sel.replaceChildren(new Option('ทุกตัว', ''), ...list.map(b => new Option(`${b.id} ${b.name}`, b.id)));
  sel.value = list.some(b => b.id === keep) ? keep : '';
  // รูนให้เลือกเอง
  const pool = anaRunePool();
  anaPickIds = anaPickIds.filter(id => pool.some(r => r.id === id));
  $('anaRunePickBox').replaceChildren(...(pool.length ? pool.map(r => {
    const lab = el('label', 'status'), cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = anaPickIds.includes(r.id);
    cb.addEventListener('change', () => { anaPickIds = cb.checked ? [...anaPickIds, r.id] : anaPickIds.filter(x => x !== r.id); });
    lab.append(cb, ` ${r.id} ${r.name}`); lab.title = runeKind(r.eff) === 'skill' ? skillLine(r) : runeText(r);
    return lab;
  }) : [cell('ยังไม่มีรูนที่ใช้ในการต่อสู้ได้ · เปิดในแท็บ "รูน / บอส"', 'was')]));
  // จำนวนแมตช์
  const o = $('mN').options;
  o[0].textContent = boss ? `${ANA_BOSS_N[12000][0].toLocaleString()} ต่อบอส (เร็ว)` : '12,000 ต่อเลเวล (ระหว่างปรับ)';
  o[1].textContent = boss ? `${ANA_BOSS_N[24000][0].toLocaleString()} ต่อบอส (ละเอียด)` : '24,000 ต่อเลเวล (ยืนยันก่อนส่ง)';
  $('anaBoss').hidden = !boss || !anaBossRun; $('anaBot').hidden = anaFoe !== 'bot'; $('anaRun').hidden = !run || !anaPlayRun;
  $('anaRuneRes').hidden = run || !anaRuneRun || anaRuneRun.foe !== (boss ? 'boss' : 'team');
  $('anaModeHint').textContent = run ? anaRunHint() : boss
    ? 'ทีมสุ่ม 6 ตัว (เลเวลที่เลือก) สู้บอสที่เปิดใช้ · ใช้ค่าบอส/รูนที่กำลังแก้ในแท็บ "รูน / บอส" · รูนใส่ฝั่งผู้เล่นเท่านั้น · สุ่มรูนตามน้ำหนักความหายากในแท็บ "รูน / บอส" · ผลนี้เก็บแยก ไม่ทับผลวัดปกติ'
    : 'วัดแบบเดิม (ทีมสุ่มสู้ทีมสุ่ม) · เลือกรูน "สุ่ม" หรือ "เลือกเอง" = วัดเพิ่มว่ารูนแต่ละอันเพิ่มอัตราชนะเท่าไร (ผลวัดตัวละครไม่ใส่รูน เหมือนเดิม)';
}
$('anaFoeBot').addEventListener('click', () => { anaFoe = 'bot'; renderAnaMode(); });
$('anaFoeBoss').addEventListener('click', () => { anaFoe = 'boss'; renderAnaMode(); });
$('anaFoeRun').addEventListener('click', () => { anaFoe = 'run'; renderAnaMode(); });
$('anaRuneNone').addEventListener('click', () => { anaRune = 'none'; renderAnaMode(); });
$('anaRuneRand').addEventListener('click', () => { anaRune = 'random'; renderAnaMode(); });
$('anaRunePick').addEventListener('click', () => { anaRune = 'pick'; renderAnaMode(); });
$('step-result').addEventListener('click', renderAnaMode);

// ผลรูนแต่ละอัน (ทั้งสองโหมด) · รูนที่เลือกเอง = วัดเฉพาะรูนที่ติ๊ก
async function anaRunRunes(from, span) {
  const boss = anaFoe === 'boss', n = (ANA_BOSS_N[$('mN').value] || ANA_BOSS_N[12000])[1];
  const st = anaRune === 'pick' ? { ...stageCfg, runes: {}, custom: anaRunePool().filter(r => anaPickIds.includes(r.id)) } : stageCfg;
  const rows = await runeUplift(clone(chars), rulesNow(), st, { foe: boss ? 'boss' : 'team', bossIds: anaBossIds(), k: anaBossKVal(), level: boss ? anaLevelVal() : 1, n,
    onProgress: x => { $('prog').style.width = `${(from + span * x) * 100}%`; } });
  anaRuneRun = { foe: boss ? 'boss' : 'team', rows, n };
  renderAnaRunes();
}
function renderAnaRunes() {
  if (!anaRuneRun) return;
  const boss = anaRuneRun.foe === 'boss';
  $('anaRuneTitle').textContent = `ผลรูนแต่ละอัน ${boss ? 'VS บอส' : 'VS ทีมสุ่ม (Lv1)'} · ${anaRuneRun.n.toLocaleString()} แมตช์ต่อรูน`;
  const RT = Object.fromEntries(RUNE_RARITY);
  $('anaRuneTbl').replaceChildren(...(anaRuneRun.rows.length ? anaRuneRun.rows.map(x => {
    const tr = document.createElement('tr');
    tr.append(td(`${x.id} ${x.name}`), td(RT[x.rarity] || x.rarity), td(fmt(x.on) + '%', 'n'), td(fmt(x.off) + '%', 'n'), td(sgn(x.uplift), 'n' + (x.uplift >= 15 ? ' e-out' : x.uplift >= 8 ? ' e-near' : '')));
    return tr;
  }) : [(() => { const tr = document.createElement('tr'), c = td('ไม่มีรูนให้วัด', 'status'); c.colSpan = 5; tr.append(c); return tr; })()]));
  $('anaRuneRes').hidden = anaRuneRun.foe !== (anaFoe === 'boss' ? 'boss' : 'team');
}

async function runBossAnalysis() {
  const btn = $('analyze'); btn.disabled = true;
  const ids = anaBossIds();
  try {
    if (!ids.length) { $('msg').textContent = 'ยังไม่มีบอสที่เปิดใช้ (เปิดในแท็บ "รูน / บอส")'; return; }
    if (anaRune === 'pick' && !anaPickIds.length) { $('msg').textContent = 'ติ๊กเลือกรูนก่อน อย่างน้อย 1 อัน'; return; }
    const v = validateConfig(chars, rulesNow()); if (!v.ok) { $('msg').textContent = 'แก้ค่าที่ผิดก่อน (ดูรายการสีแดงในขั้นแก้)'; return; }
    const n = (ANA_BOSS_N[$('mN').value] || ANA_BOSS_N[12000])[0], k = anaBossKVal(), level = anaLevelVal();
    const withRunes = anaRune !== 'none', span = withRunes ? 0.6 : 1;
    $('msg').textContent = `กำลังวัด VS บอส (${n.toLocaleString()} แมตช์ × ${ids.length} บอส)…`;
    const r = await bossRanking(clone(chars), rulesNow(), stageCfg, { bossIds: ids, k, level, n, runeMode: anaRune, runeCount: Math.max(1, Math.min(12, Math.round(+$('anaRuneN').value) || 1)), pickIds: anaPickIds,
      onProgress: x => { $('prog').style.width = `${span * x * 100}%`; } });
    anaBossRun = r;
    if (withRunes) { $('msg').textContent = 'กำลังวัดผลรูนแต่ละอัน…'; await anaRunRunes(span, 1 - span); }
    renderBossResults(); renderAnaMode();
    $('msg').textContent = `วิเคราะห์ VS บอสเสร็จ · บอสครั้งที่ ${k} · ทีม ${level === 'mix' ? 'เลเวลผสม' : 'Lv' + level} · รูน ${anaRune === 'none' ? 'ไม่มี' : anaRune === 'random' ? 'สุ่ม ' + r.runeCount + ' อัน' : 'เลือกเอง ' + anaPickIds.length + ' อัน'}`
      + (r.aborted ? ` · ⚠ ${r.aborted} แมตช์ผิดปกติ ถูกตัวตัดนิรภัยหยุด` : '');
  } catch (e) {
    $('msg').textContent = 'วิเคราะห์ไม่สำเร็จ: ' + e.message;
  } finally {
    $('prog').style.width = '0'; btn.disabled = false;
  }
}
function renderBossResults() {
  const R = anaBossRun; if (!R) return;
  const cards = $('bossCards').children, bs = R.bossRows;
  const avg = f => (bs.length ? bs.reduce((a, x) => a + f(x), 0) / bs.length : 0);
  cards[0].firstChild.textContent = `${fmt(R.winAll)}%`;
  cards[1].firstChild.textContent = fmt(avg(x => x.bars));
  cards[2].firstChild.textContent = `${fmt(avg(x => x.time))} วิ`;
  $('bossPer').replaceChildren(...bs.map(b => { const tr = document.createElement('tr'); const bar = (stageCfg.bosses.find(x => x.id === b.id) || {}).bars || 0;
    tr.append(td(`${b.id} ${b.name}`), td(fmt(b.win) + '%', 'n'), td(`${fmt(b.bars)} / ${bar}`, 'n'), td(fmt(b.time) + ' วิ', 'n')); return tr; }));
  const mean = R.rows.filter(x => x.games).reduce((a, x) => a + x.win, 0) / Math.max(1, R.rows.filter(x => x.games).length);
  $('bossRank').replaceChildren(...R.rows.filter(x => x.games).sort((a, b) => b.win - a.win).map(x => {
    const c = chars.find(q => q.id === x.id) || x, tr = document.createElement('tr'); tr.className = 'click'; tr.tabIndex = 0;
    const nameTd = td(`${x.id} ${c.name}`); nameTd.prepend(charBadge(x.id));
    const rarTd = td(''); rarTd.append(rarityTag(c.rarity));
    tr.append(nameTd, rarTd, td(fmt(x.win), 'n'), td(sgn(x.win - mean), 'n'), td(fmt(x.dealt, 0), 'n'));
    const open = () => { showTab('chars'); setCurrent(x.id); $('editor').scrollIntoView({ block: 'start', behavior: 'smooth' }); };
    tr.addEventListener('click', open); tr.addEventListener('keydown', ev => { if (ev.key === 'Enter') open(); });
    return tr;
  }));
  const head = document.createElement('tr');
  for (const t of ['เผ่า', ...bs.map(b => b.id)]) { const th = document.createElement('th'); th.textContent = t; if (t !== 'เผ่า') th.className = 'n'; head.append(th); }
  $('bossTribeHead').replaceChildren(head);
  $('bossTribe').replaceChildren(...TRIBES.map(t => {
    const tr = document.createElement('tr'), tTd = td(t); tTd.prepend(tribeBadge(t)); tr.append(tTd);
    for (const b of bs) { const x = b.tribeWin[t]; const d = x.win == null ? null : x.win - b.win;
      const c = td(x.win == null ? '–' : `${fmt(x.win)}% (${sgn(d)})`, 'n' + (d == null ? '' : d >= 10 ? ' d-up' : d <= -10 ? ' d-down' : '')); c.title = `${x.teams} ทีม · วงเล็บ = ต่างจากค่าเฉลี่ยของบอสนี้`; tr.append(c); }
    return tr;
  }));
  const RT = Object.fromEntries(Object.entries(stageCfg.runes).map(([id, r]) => [id, r.name]).concat(stageCfg.custom.map(r => [r.id, r.name])));
  $('bossTop').replaceChildren(...(R.top.length ? R.top.map((t, ix) => {
    const tr = document.createElement('tr');
    tr.append(td(String(ix + 1)), td(t.level === 'mix' ? 'ผสม' : 'Lv' + t.level), td(`${t.boss.id} ครั้งที่ ${t.boss.k}`), td(fmt(t.dmgPerHp) + '×', 'n'), td(String(t.bars), 'n'), td((t.timeMs / 1000).toFixed(1) + ' วิ', 'n'),
      td(t.winner === 0 ? 'ทีมชนะ' : t.winner === 1 ? 'บอสชนะ' : 'หมดเวลา'));
    const tc = td(t.teamA.map(e => e.id).join(' '), 'mxt-team'); tc.title = t.teamA.map(e => e.id + ' Lv' + e.level + ' · แถว ' + (e.row + 1) + ' เลน ' + (e.lane + 1)).join('\n'); tr.append(tc);
    tr.append(td(t.runes.length ? t.runes.map(x => `${x.id}${x.n > 1 ? '×' + x.n : ''}`).join(' ') : '–'));
    tr.lastChild.title = t.runes.map(x => `${x.id} ${RT[x.id] || ''}`).join('\n');
    const btn = document.createElement('button'); btn.type = 'button'; btn.textContent = 'ส่งไปลองสู้'; btn.title = 'เปิดแมตช์นี้ในแท็บลองสู้ พร้อมบอสและรูนชุดเดียวกัน';
    btn.addEventListener('click', () => replayBossMatch(t));
    const ac = document.createElement('td'); ac.className = 'mxt-act'; ac.append(btn); tr.append(ac);
    return tr;
  }) : [(() => { const tr = document.createElement('tr'), c = td('ไม่มีข้อมูล', 'status'); c.colSpan = 10; tr.append(c); return tr; })()]));
}
// เปิดแมตช์ VS บอสในแท็บลองสู้: ทีมซ้าย + บอส + รูนชุดเดิม (เมล็ดสุ่มจากทีม = ผลตรงกับตอนวัด ถ้าไม่ได้แก้ค่าหลังวัด)
function replayBossMatch(t) {
  simTeam = emptySim();
  for (const e of t.teamA) { const rr = Math.max(0, Math.min(2, e.row)), ll = Math.max(0, Math.min(1, e.lane)); if (!simTeam[0][rr][ll]) simTeam[0][rr][ll] = { id: e.id, level: e.level }; }
  simFoeBoss = true; simBossId = t.boss.id; simBossK = t.boss.k; $('simBossK').value = String(t.boss.k);
  simRunes = t.runes.map(x => ({ id: x.id, n: x.n, slot: x.slot ? x.slot.slice() : null, partner: x.partner ? x.partner.slice() : null }));
  $('simOffL').checked = false; $('simOffR').checked = false;
  try { saveSim(); } catch (e) {}
  showTab('sim'); renderSimBoss(); renderSimRunes(); renderSimTeams();
  runSim(false, true);
  $('simMsg').textContent = 'โหลดแมตช์ VS บอสจากดูผล · ใช้เมล็ดสุ่มจากทีม · ถ้าแก้ค่าหลังวัด ผลอาจไม่ตรงกับตอนวัด';
}
renderAnaMode();
