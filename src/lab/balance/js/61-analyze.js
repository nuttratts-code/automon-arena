// ---------- วิเคราะห์ ----------
function delta(now, was) {
  if (was == null) return cell('–', 'd-zero');
  const d = now - was;
  return cell(Math.abs(d) < 0.05 ? '0' : `${d > 0 ? '▲' : '▼'}${fmt(Math.abs(d))}`, Math.abs(d) < 0.05 ? 'd-zero' : d > 0 ? 'd-up' : 'd-down');
}
function pill(text, cls) { return cell(text, `pill ${cls}`); }
function td(child, cls) { const t = document.createElement('td'); if (cls) t.className = cls; if (typeof child === 'string') t.textContent = child; else t.append(child); return t; }
const sgn = x => `${x > 0 ? '+' : ''}${fmt(x)}`;
const VERDICT_TH = { out: ['หลุด', 'p-hi'], near: ['ใกล้ขอบ', 'p-lo'], ok: ['ผ่าน', 'p-ok'] };
function tribeStatus(s, x, share) {
  if (s === 2) return x.uplift > TARGETS.upliftStep2[1] ? ['แรงไป', 'p-hi'] : x.uplift < TARGETS.upliftStep2[0] ? ['อ่อนไป', 'p-lo'] : ['ในเป้า', 'p-ok'];
  if (s === 6) return x.vsMixed > TARGETS.step6MaxVsMixed ? ['แรงไป', 'p-hi'] : ['ในเป้า', 'p-ok'];
  return ['ไม่มีเป้า', 'p-na'];
}

// ชุด 13: วัดแบบเดียวกับ Claude (measureAll ใน lab/analyze.js) · เผ่าวัดที่เลเวลผสม
async function runAll(cs, rules, n, from, span) {
  const p = (a, w) => x => { $('prog').style.width = `${(from + span * (a + w * x)) * 100}%`; };
  const m = await measureAll(cs, rules, { n, onProgress: p(0, 0.85) });
  const tr = await tribeTests(cs, rules, { level: 1, onProgress: p(0.85, 0.15) }); // เผ่าวัดที่เลเวล 1 ตามแผนเทสต์ tribe-rules (เหมือนเดิม)
  return { ...m, tr };
}

$('analyze').addEventListener('click', async () => {
  if (anaFoe === 'boss') return runBossAnalysis(); // ชุด 80: VS บอส (62-analyze-boss.js)
  const btn = $('analyze'); btn.disabled = true;
  const n = $('mN').value === '24000' ? MEASURE.fullN : MEASURE.quickN;
  try {
    const hasEdits = countEdits(diffs()) > 0;
    if (!baseCache[n]) { $('msg').textContent = `กำลังวัดค่าในเกมตอนนี้ (${n.toLocaleString()} แมตช์ × 4 ชุด)…`; baseCache[n] = await runAll(BASE_CHARS, rulesBase(), n, 0, hasEdits ? 0.5 : 1); }
    let now = baseCache[n];
    if (hasEdits) { $('msg').textContent = 'กำลังวัดค่าที่แก้…'; now = await runAll(clone(chars), rulesNow(), n, 0.5, 0.5); }
    lastRun = { n, now, base: baseCache[n], hasEdits, key: JSON.stringify(diffs()) };
    renderResults(); renderTop();
    $('msg').textContent = `วิเคราะห์เสร็จ (${n.toLocaleString()} แมตช์ต่อชุด) · ${hasEdits ? 'วัดค่าที่แก้ · คอลัมน์ "เทียบเดิม" = อัตราชนะเปลี่ยนจากค่าในเกม' : 'ยังไม่ได้แก้ค่า แสดงผลของค่าในเกมตอนนี้'}`;
    { const ab = Object.values(now.aborted || {}).reduce((a, b) => a + b, 0); // ชุด 17: ตัวตัดนิรภัย
      if (ab) $('msg').textContent += ` · ⚠ ${ab} แมตช์ผิดปกติ ถูกตัวตัดนิรภัยหยุด (ฮิต/ผลสกิลมากเกิน ผลนับเป็นเสมอ) เช่น ทีม ${((now.abortSample || {}).A || []).join(' ')} — ตรวจสกิลที่พอกกันเอง`; }
    saveResults();
    if (anaRune !== 'none') { $('msg').textContent += ' · กำลังวัดผลรูนแต่ละอัน…'; const m0 = $('msg').textContent; await anaRunRunes(0, 1); $('msg').textContent = m0.replace(' · กำลังวัดผลรูนแต่ละอัน…', ' · วัดผลรูนแล้ว (ตารางผลรูน)'); }
    if (!$('pane-chars').hidden || comboOn) renderCharForm();
  } catch (e) {
    $('msg').textContent = 'วิเคราะห์ไม่สำเร็จ: ' + e.message;
  }
  $('prog').style.width = '0';
  btn.disabled = false; refreshDirty();
});

// ชุด 38: ตารางแมตช์ต้องสงสัย + ปุ่มส่งไปลองสู้ (replay ด้วยเมล็ดสุ่มจากทีม = ผลตรงกับตอนวัด)
function replayMatch(t) {
  simTeam = emptySim();
  for (const [side, team] of [[0, t.teamA], [1, t.teamB]]) for (const e of team) {
    const rr = Math.max(0, Math.min(2, e.row)), ll = Math.max(0, Math.min(1, e.lane));
    if (!simTeam[side][rr][ll]) simTeam[side][rr][ll] = { id: e.id, level: e.level };
  }
  $('simOffL').checked = false; $('simOffR').checked = false; // ตอนวัดเปิดโบนัสเผ่าทั้งสองฝั่ง
  try { saveSim(); } catch (e) {}
  showTab('sim'); renderSimTeams();
  runSim(false, true);
  // A9: the replay uses the CURRENT values — if they were edited after the analysis, the result may differ from the measured one
  const edited = !!(lastRun && lastRun.key !== JSON.stringify(diffs()));
  $('simMsg').textContent = edited
    ? 'โหลดแมตช์จากท็อป 10 · ⚠ มีการแก้ค่าหลังวัด ผลอาจไม่ตรงกับตอนวัด (ใช้ค่าปัจจุบัน) · กด "วิเคราะห์" ใหม่ถ้าต้องการให้ตรง'
    : 'โหลดแมตช์จากท็อป 10 · ใช้เมล็ดสุ่มจากทีม (ผลตรงกับตอนวัด)';
}
function renderTop() {
  const box = $('mxTop'), sum = $('mxTopSum'); if (!box) return;
  const list = (lastRun && lastRun.now && lastRun.now.top) || [];
  const empty = (txt) => { const tr = document.createElement('tr'), c = document.createElement('td'); c.className = 'status'; c.colSpan = 10; c.textContent = txt; tr.append(c); return tr; };
  box.replaceChildren(...(list.length ? list.map((t, ix) => {
    const tr = document.createElement('tr');
    tr.append(td(String(ix + 1)), td(t.level === 'mix' ? 'ผสม' : 'Lv' + t.level));
    tr.append(td(fmt(t.dmgTotal), 'n'), td(fmt(t.hpTotal), 'n'));
    tr.append(td(fmt(t.dmgPerHp) + '×', 'n' + (t.dmgPerHp >= 3 ? ' e-out' : t.dmgPerHp >= 2 ? ' e-near' : '')));
    tr.append(td((t.timeMs / 1000).toFixed(1) + ' วิ', 'n'), td(t.winner === 0 ? 'ซ้ายชนะ' : t.winner === 1 ? 'ขวาชนะ' : 'เสมอ'));
    const teamCell = team => { const c = td(team.map(e => e.id).join(' '), 'mxt-team'); c.title = team.map(e => e.id + ' Lv' + e.level + ' · แถว ' + (e.row + 1) + ' เลน ' + (e.lane + 1)).join('\n'); return c; };
    tr.append(teamCell(t.teamA), teamCell(t.teamB));
    const btn = document.createElement('button'); btn.type = 'button'; btn.textContent = 'ส่งไปลองสู้';
    btn.title = 'เปิดแมตช์นี้ในแท็บลองสู้ (เมล็ดสุ่มจากทีม)';
    btn.addEventListener('click', () => replayMatch(t));
    const tc = document.createElement('td'); tc.className = 'mxt-act'; tc.append(btn); tr.append(tc);
    return tr;
  }) : [empty('ไม่มีข้อมูล · กด "วิเคราะห์" ก่อน')]));
  if (!sum) return;
  if (!list.length) { sum.replaceChildren(); return; }
  const culprit = {}, comp = {};
  for (const t of list) {
    for (const sd of [0, 1]) {
      const tot = sd === 0 ? t.dmgA : t.dmgB; if (!tot) continue;
      for (const u of t.perUnit) if (u.side === sd && u.dealt >= 0.4 * tot) culprit[u.id] = (culprit[u.id] || 0) + 1;
    }
    const sig = [...t.teamA, ...t.teamB].map(e => e.id).sort().join(' ');
    comp[sig] = (comp[sig] || 0) + 1;
  }
  const topC = Object.entries(culprit).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const topComp = Object.entries(comp).sort((a, b) => b[1] - a[1])[0];
  const w = list[0];
  sum.replaceChildren(
    el('span', 'status', 'ตัวต้นเหตุประจำ: ' + (topC.length ? topC.map(([id, n]) => id + ' (' + n + '/' + list.length + ')').join(' · ') : '—')),
    el('span', 'status', 'คอมโปต้องสงสัย: ' + (topComp && topComp[1] > 1 ? topComp[0] + ' (' + topComp[1] + ' ครั้ง)' : 'ไม่มีคอมโปซ้ำ')),
    el('span', 'status', 'สัญญาณผิดปกติ: ' + (w ? 'ดาเมจ ' + fmt(w.dmgPerHp) + '× HP รวมสองฝั่ง · ' + (w.timeMs / 1000).toFixed(0) + ' วิ · ฝั่งเดียว ' + Math.round(w.sideRatio * 100) + '%' : '—')));
}
function renderResults() {
  if (!lastRun) return;
  const { now, base, hasEdits } = lastRun, L = now.levels;
  const head = document.createElement('tr');
  for (const [t, c] of [['ตัวละคร'], ['ความหายาก'], ['ชนะ % (ผสม)', 'n'], ...(hasEdits ? [['เทียบเดิม', 'n']] : []), ['ห่างเป้า ผสม', 'n'], ['Lv1', 'n'], ['Lv2', 'n'], ['Lv3', 'n'], ['ผล']]) { const th = document.createElement('th'); th.textContent = t; if (c) th.className = c; head.append(th); }
  $('rankHead').replaceChildren(head);
  const ORDER = { out: 0, near: 1, ok: 2 }, byId = Object.fromEntries(chars.map(c => [c.id, c]));
  const rows = chars.map(c => { const e = Object.fromEntries(MEASURE.levels.map(lv => [lv, L[lv][c.id].err])); return { c, e, v: verdict(e), win: L.mix[c.id].win }; })
    .sort((a, b) => ORDER[a.v] - ORDER[b.v] || Math.abs(b.e.mix) - Math.abs(a.e.mix));
  let out = 0, near = 0, off = 0;
  $('rank').replaceChildren(...rows.map(({ c, e, v, win }) => {
    if (v === 'out') out++; if (v === 'near') near++;
    const tr = document.createElement('tr'); tr.className = 'click'; tr.tabIndex = 0;
    const nameTd = td(`${c.id} ${c.name}`); nameTd.prepend(charBadge(c.id));
    const rarTd = td(''); rarTd.append(rarityTag(c.rarity));
    const errTd = (x, lim, nearLim) => td(sgn(x), 'err' + (Math.abs(x) > lim ? ' e-out' : Math.abs(x) >= nearLim ? ' e-near' : ''));
    tr.append(nameTd, rarTd, td(fmt(win), 'n'));
    if (hasEdits) tr.append(td(delta(win, base.levels.mix[c.id].win), 'n'));
    tr.append(errTd(e.mix, MEASURE.band, MEASURE.near), ...[1, 2, 3].map(lv => errTd(e[lv], MEASURE.lvBand, MEASURE.lvBand - 1)), td(pill(...VERDICT_TH[v])));
    const open = () => { showTab('chars'); setCurrent(c.id); $('editor').scrollIntoView({ block: 'start', behavior: 'smooth' }); };
    tr.addEventListener('click', open); tr.addEventListener('keydown', ev => { if (ev.key === 'Enter') open(); });
    return tr;
  }));
  const trs = [];
  for (const t of TRIBES) for (const s of RULES.tribeSteps) {
    const x = now.tr[t][s], share = now.tribeWin[t].inWinners;
    const [st, cls] = tribeStatus(s, x, share); if (cls === 'p-hi' || cls === 'p-lo') off++;
    const row = document.createElement('tr');
    const tTd = td(s === 2 ? t : ''); if (s === 2) tTd.prepend(tribeBadge(t));
    row.append(tTd, td(String(s)), td(`+${fmt(x.uplift)}%`, 'n'), td(`${fmt(x.vsMixed)}%`, 'n'), td(pill(st, cls)));
    row.append(s === 2 ? td(pill(`${fmt(share, 0)}%`, share > TARGETS.maxShareOfWinners ? 'p-hi' : 'p-ok'), 'n') : td(''));
    trs.push(row);
  }
  $('tribeRes').replaceChildren(...trs);
  const cards = $('cards').children, [lo, hi] = MEASURE.matchSec, t1 = now.avgTime[1], tm = now.avgTime.mix;
  cards[0].firstChild.textContent = out; cards[1].firstChild.textContent = near; cards[2].firstChild.textContent = off;
  cards[3].firstChild.textContent = `${fmt(t1)} / ${fmt(tm)} วิ`;
  cards[0].classList.toggle('warnc', out > 0);
  cards[3].classList.toggle('warnc', [t1, tm].some(x => x < lo || x > hi));
}

