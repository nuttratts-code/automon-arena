// Run-log report → page nodes (set 112, user): shared by the run-log viewer page (runlog.html) and the game page's owner-only
// Log screen. Takes the reports made by lab/runlogread.js (rvReadCode / rvAnalyze) and builds DOM nodes. Every text goes in with
// textContent (never HTML: player names and codes come from other people). All names start with lv (the build bundles every
// file into one script). CSS classes used: status ok/bad · kv · tbl · round · steps · t · note · good · bad · mute · gold · row.
export function lvMk(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = String(text); return e; }
export const lvWhen = ms => { try { return new Date(ms).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }); } catch (e) { return String(ms); } };
export function lvTr(cells, tag = 'td') { const tr = lvMk('tr'); cells.forEach((c, i) => tr.append(lvMk(tag, i && tag === 'td' ? 'n' : '', c))); return tr; }
function lvStatus(alerts, okText) {
  const st = lvMk('div', 'status ' + (alerts.length ? 'bad' : 'ok'), alerts.length ? `ผิดปกติ ${alerts.length} จุด` : okText);
  if (alerts.length) { const ul = lvMk('ul'); alerts.slice(0, 30).forEach(a => ul.append(lvMk('li', '', a))); if (alerts.length > 30) ul.append(lvMk('li', '', `… อีก ${alerts.length - 30} จุด`)); st.append(ul); }
  return st;
}

// whole run-code report (rvReadCode) → nodes · pick = which journal is shown · onPick(i) = switch journal
export function lvCodeNodes(r, CM, pick, onPick) {
  const out = [];
  const alerts = [...r.alerts, ...r.logs.flatMap((L, i) => L.alerts.map(a => (r.logs.length > 1 ? `${i ? 'run ก่อนหน้า' : 'run ล่าสุด'}: ` : '') + a))];
  const head = lvMk('section');
  head.append(lvMk('h2', '', `ผู้เล่น: ${r.nm || '(ไม่ได้ตั้งชื่อ)'}`), lvMk('p', 'mute', `คัดลอกโค้ดเมื่อ ${lvWhen(r.at)} · ค่าเกมในเครื่องผู้เล่น ${r.page}`));
  const st = lvStatus(alerts, 'ไม่พบความผิดปกติ: ทุกขั้นและทุกแมตช์ตรงกับเกมจริง'); st.id = 'lvStatus'; head.append(st);
  if (!r.logs.length) head.append(lvMk('p', 'mute', 'โค้ดนี้ไม่มี log การเล่น (เกมเวอร์ชันก่อน set 109 หรือยังไม่ได้ทำอะไร) · ดูได้เฉพาะแมตช์ด้านล่าง'));
  out.push(head);
  if (r.logs.length > 1) {
    const sw = lvMk('div', 'row');
    r.logs.forEach((L, i) => { const b = lvMk('button', '', i ? 'run ก่อนหน้า' : 'run ล่าสุด'); b.type = 'button'; b.setAttribute('aria-pressed', String(i === pick)); b.addEventListener('click', () => onPick(i)); sw.append(b); });
    out.push(sw);
  }
  if (r.logs.length) out.push(...lvRunNodes(r.logs[Math.min(pick, r.logs.length - 1)], CM));
  if (r.runs.length) out.push(lvMatchesNode(r));
  if (r.hist.length) {
    const s = lvMk('section'); s.append(lvMk('h2', '', 'ประวัติ run ในเครื่องผู้เล่น'));
    const ol = lvMk('ol');
    r.hist.forEach(h => ol.append(lvMk('li', '', `${lvWhen(h.at)} · ${h.won ? 'ผ่าน' : 'จบ'} · ชนะ ${h.wins} · หัวใจ ${h.hearts} · ${h.rounds} รอบ · ตัวเด่น ${h.top}`)));
    s.append(ol); out.push(s);
  }
  return out;
}

// one journal report (rvAnalyze) on its own (db run) → nodes with the alert box first
export function lvLogNodes(L, CM) {
  const st = lvStatus(L.alerts, 'ไม่พบความผิดปกติ: ทุกขั้นตรงกับเกมจริง'); st.id = 'lvStatus';
  const s = lvMk('section'); s.append(st);
  if (L.matches.some(m => m.status === 'none')) s.append(lvMk('p', 'mute', 'log ที่ส่งเข้าระบบไม่มีรีเพลย์แมตช์ จึงตรวจได้แค่เงินทุกขั้น (ตรวจผลแมตช์ได้เมื่อวางโค้ดผลการเล่น)'));
  return [s, ...lvRunNodes(L, CM)];
}

export function lvRunNodes(L, CM) {
  const nm = id => `${id} ${(CM[id] || {}).name || '?'}`;
  const s1 = lvMk('section');
  s1.append(lvMk('h2', '', `run เริ่ม ${lvWhen(L.at)}${L.nm ? ' · ' + L.nm : ''}`));
  const lost = L.OUT['เงินเหลือถูกทิ้งตอนขึ้นรอบใหม่'] || 0, buy = L.OUT['ซื้อตัวละคร'] || 0, rr = L.OUT['สุ่มร้าน'] || 0;
  const kv = lvMk('div', 'kv');
  [[`รอบ ${L.final.round}`, L.final.over ? 'จบ run แล้ว' : 'ยังเล่นอยู่'], [L.final.wins, 'ชนะ'], [L.final.hearts, 'หัวใจเหลือ'], [L.inTotal, 'เงินเข้าทั้งหมด'],
    [buy, 'ใช้ซื้อตัวละคร'], [rr, 'ใช้สุ่มร้าน'], [lost, 'เงินเหลือถูกทิ้ง'], [L.n, 'การกระทำทั้งหมด']]
    .forEach(([v, k]) => { const d = lvMk('div'); d.append(lvMk('b', '', v), lvMk('span', '', k)); kv.append(d); });
  s1.append(kv);
  s1.append(lvMk('p', L.firstBad < 0 ? 'good' : 'bad', L.firstBad < 0 ? `ตรวจย้อน: ทุกขั้นเงินตรงกับเกมจริง (${L.n} ขั้น)` : `ตรวจย้อน: เงินไม่ตรงตั้งแต่ขั้นที่ ${L.firstBad + 1}`));
  const t = lvMk('table'), tb = lvMk('tbody');
  t.append(lvTr(['', 'เงิน'], 'th'));
  for (const [k, v] of Object.entries(L.IN)) tb.append(lvTr([`เข้า · ${k}`, `+${v}`]));
  for (const [k, v] of Object.entries(L.OUT)) tb.append(lvTr([`ออก · ${k}`, `−${v}`]));
  tb.append(lvTr(['คงเหลือ', L.final.gold]));
  t.append(tb); const tw = lvMk('div', 'tbl'); tw.append(t);
  s1.append(lvMk('h3', '', 'เงินมาจากไหน ไปไหน'), tw);
  const bb = Object.entries(L.buyBy).sort((x, y) => y[1] - x[1]);
  s1.append(lvMk('h3', '', 'ซื้อตัวไหนกี่ครั้ง'), lvMk('p', '', bb.length ? bb.map(([id, n]) => `${nm(id)} ×${n}`).join(' · ') : 'ไม่ได้ซื้อ'));
  const s2 = lvMk('section');
  s2.append(lvMk('h2', '', 'รายรอบ (กดเพื่อดูทุกขั้น)'));
  for (const rd of L.rounds) {
    const d = lvMk('details', 'round'), sm = lvMk('summary');
    const bad = rd.steps.some(x => x.status === 'bad' || x.notes.some(n => n.bad));
    const m = rd.steps.find(x => x.t === 'en');
    sm.append(lvMk('b', bad ? 'bad' : '', `รอบ ${rd.r}`), lvMk('span', 'gold', `เข้า ${rd.in}`), lvMk('span', '', `ใช้ ${rd.out}`), lvMk('span', rd.lost ? 'gold' : 'mute', `ทิ้ง ${rd.lost}`));
    if (m) sm.append(lvMk('span', '', m.what.replace(/^จบแมตช์ /, '')));
    if (bad) sm.append(lvMk('span', 'bad', 'มีจุดผิดปกติ'));
    d.append(sm);
    const ol = lvMk('ol', 'steps');
    for (const x of rd.steps) {
      const li = lvMk('li'), body = lvMk('span', x.status === 'bad' ? 'bad' : x.status === 'refused' ? 'mute' : '');
      body.append(lvMk('span', '', `${x.what} · ${x.money}`));
      if (x.status === 'bad') body.append(lvMk('span', 'note bad', '✗ ไม่ตรงกับเกมจริง: ' + x.badText));
      if (x.status === 'refused') body.append(lvMk('span', 'note', '(เกมปฏิเสธ)'));
      for (const msg of x.msgs) body.append(lvMk('span', 'note mute', msg));
      for (const n of x.notes) body.append(lvMk('span', 'note ' + (n.bad ? 'bad' : 'mute'), (n.bad ? '✗ ' : '') + n.text));
      li.append(lvMk('span', 't', rvMmss(x.sec)), body);
      ol.append(li);
    }
    d.append(ol); s2.append(d);
  }
  return [s1, s2];
}

export function lvMatchesNode(r) {
  const s = lvMk('section'); s.append(lvMk('h2', '', 'แมตช์ที่เก็บไว้ (จำลองใหม่ทุกแมตช์)'));
  r.runs.forEach((run, k) => {
    s.append(lvMk('h3', '', `${k ? 'run ก่อนหน้า' : 'run ล่าสุด'} · ${run.matches.length} แมตช์`));
    const t = lvMk('table'), tb = lvMk('tbody');
    t.append(lvTr(['รอบ', 'ผล', 'เวลา', 'ทีมผู้เล่น', 'ศัตรู', 'ตรวจ'], 'th'));
    for (const m of run.matches) {
      const x = m.x, tr = lvMk('tr');
      tr.append(lvMk('td', '', x.r), lvMk('td', '', x.w === 1 ? 'แพ้' : x.w === 0 ? 'ชนะ' : 'เสมอ'), lvMk('td', '', `${(x.t / 1000).toFixed(1)} วิ`),
        lvMk('td', '', x.a.map(u => `${u.id} Lv${u.level}`).join(', ')), lvMk('td', '', Array.isArray(x.b) ? x.b.map(u => `${u.id} Lv${u.level}`).join(', ') : `บอส ${x.b.boss}`),
        lvMk('td', m.ok ? 'good' : 'bad', m.ok ? '✓' : '✗ จำลองใหม่ได้ผลไม่ตรง'));
      tb.append(tr);
    }
    t.append(tb); const tw = lvMk('div', 'tbl'); tw.append(t); s.append(tw);
  });
  return s;
}
