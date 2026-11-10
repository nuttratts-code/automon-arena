// ---------- Set 175 (user 10 Nov): ดูผล → "ผู้เล่นจริง" — pooled stats from pasted run codes (ARUN1) ----------
// lab/humanstats.js does the maths (unit-tested): rebuilds purchases / rune cards from each run journal and re-plays every stored match
// (fights are deterministic from the two teams + runes → same numbers every time, as long as the game values are the same).
// Runs made on other game values are NOT mixed in: they are counted as "old patch" and listed in the warnings. Display only — no game value is touched.
let hsRes = null;
const hsView = { sec: 'chars', lv: 0 }, HS_LOW = 30, HS_MAX_CODES = 60; // fewer fielded matches than HS_LOW = row faded (same floor as the bot table)
function hsCtx() { const cs = clone(chars), r = rulesNow(); return { chars: cs, CM: makeCharMap(cs), rules: r, hash: dataHash(cs, r) }; }
function hsSortHead(head, body, cols, first) {
  const hr = document.createElement('tr');
  cols.forEach(([label, cls, tip], i) => {
    const th = document.createElement('th'); if (cls) th.className = cls; th.dataset.label = label; th.textContent = label;
    th.classList.add('sortable'); th.tabIndex = 0; th.title = (tip ? tip + ' · ' : '') + 'แตะเพื่อเรียง น้อย → มาก · แตะอีกครั้ง มาก → น้อย';
    const go = () => { const st = runSortState[body.id]; runSortState[body.id] = st && st.col === i ? { col: i, dir: -st.dir } : { col: i, dir: -1 }; runSortApply(body); };
    th.addEventListener('click', go); th.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go(); } });
    hr.append(th);
  });
  head.replaceChildren(hr);
  if (!runSortState[body.id]) runSortState[body.id] = { col: first, dir: -1 };
}
const hsEmpty = cols => { const tr = document.createElement('tr'), c = td('ยังไม่มีข้อมูล', 'status'); c.colSpan = cols; tr.append(c); return tr; };
const hsPct = (a, b) => (b ? `${fmt(a / b * 100)}%` : '–');

function hsRenderChars() {
  const R = hsRes, body = $('hsCharBody'), L = hsView.lv;
  const rows = R ? hsCharRows(R, chars, L) : [];
  hsSortHead($('hsCharHead'), body, [['ตัวละคร'], ['ความหายาก'], ['ซื้อ', 'n', 'จำนวนครั้งที่ซื้อ (นับทุกเลเวล)'], ['ขาย', 'n'], ['ลงสนาม', 'n', 'จำนวนแมตช์ที่ตัวนี้อยู่ในทีม'], ['ชนะ', 'n', 'ชนะกี่ % ของแมตช์ที่ลงสนาม'],
    ['ทีมสุดท้าย', 'n', 'อยู่ในทีมของแมตช์สุดท้ายของรันกี่รัน'], ['ดาเมจ', 'n', 'ดาเมจเฉลี่ยต่อแมตช์ที่ลงสนาม'], ['ทำล้ม', 'n'], ['ดาเมจที่โดน', 'n'], ['ฮีลที่ให้', 'n'], ['เกราะที่ให้', 'n'], ['รอด', 'n', 'รอดจนจบแมตช์กี่ %']], 2);
  if (!rows.length) { body.replaceChildren(hsEmpty(13)); $('hsCount').textContent = ''; return; }
  body.replaceChildren(...rows.map(x => {
    const tr = document.createElement('tr'), c = x.combat; tr.dataset.id = x.id;
    if (x.g < HS_LOW) { tr.classList.add('cb-low'); tr.title = `ลงสนามแค่ ${x.g} ครั้ง ตัวเลขยังแกว่ง`; }
    const nameTd = td(`${x.id} ${x.name}`); nameTd.prepend(charBadge(x.id));
    const rarTd = td(''); rarTd.append(rarityTag(x.rarity));
    const per = k => (c && c.n ? nf(c[k] / c.n) : '–');
    tr.append(nameTd, rarTd, td(String(x.bought), 'n'), td(String(x.sold), 'n'), td(String(x.g), 'n'), td(hsPct(x.w, x.g), 'n'), td(String(x.final), 'n'),
      td(per('out'), 'n'), td(c && c.n ? (c.kills / c.n).toFixed(2) : '–', 'n'), td(per('taken'), 'n'), td(per('heal'), 'n'), td(per('armor'), 'n'), td(c && c.n ? `${fmt(c.alive / c.n * 100)}%` : '–', 'n'));
    return tr;
  }));
  runSortApply(body); hsFilter();
}
function hsFilter() {
  const q = $('hsFind').value.trim().toLowerCase(); let shown = 0, all = 0;
  for (const tr of $('hsCharBody').rows) {
    if (!tr.dataset.id) continue; all++;
    const c = chars.find(x => x.id === tr.dataset.id) || {}, ok = !q || `${c.id} ${c.name}`.toLowerCase().includes(q);
    tr.hidden = !ok; if (ok) shown++;
  }
  $('hsCount').textContent = all ? `แสดง ${shown} / ${all} ตัว` : '';
}
function hsRenderRunes() {
  const R = hsRes, body = $('hsRuneBody');
  hsSortHead($('hsRuneHead'), body, [['รูน'], ['เสนอ', 'n'], ['เลือก', 'n'], ['เลือกกี่ %', 'n', 'เลือก ÷ เสนอ'], ['ใส่', 'n'], ['ถือตอนสู้', 'n', 'จำนวนแมตช์ที่ถือรูนนี้'], ['ชนะ', 'n', 'ชนะกี่ % ของแมตช์ที่ถือรูนนี้']], 2);
  const rows = R ? Object.entries(R.runes) : [];
  if (!rows.length) { body.replaceChildren(hsEmpty(7)); return; }
  body.replaceChildren(...rows.map(([id, x]) => {
    const r = rnRec(id), tr = document.createElement('tr');
    if (x.offered < HS_LOW && x.held < HS_LOW) tr.classList.add('cb-low');
    tr.append(td(`${id} ${r ? r.name : ''}`.trim()), td(String(x.offered), 'n'), td(String(x.taken), 'n'), td(hsPct(x.taken, x.offered), 'n'), td(String(x.placed), 'n'), td(String(x.held), 'n'), td(hsPct(x.heldWon, x.held), 'n'));
    return tr;
  }));
  runSortApply(body);
}
function hsRenderLose() {
  const R = hsRes, body = $('hsLoseBody');
  hsSortHead($('hsLoseHead'), body, [['รอบ', 'n'], ['แพ้กี่แมตช์', 'n'], ['สัดส่วนของที่แพ้ทั้งหมด', 'n']], 0);
  runSortState.hsLoseBody = runSortState.hsLoseBody && runSortState.hsLoseBody.col === 0 ? { col: 0, dir: 1 } : runSortState.hsLoseBody;
  const rows = R ? Object.entries(R.loseRound).map(([r, n]) => [+r, n]) : [], tot = rows.reduce((a, [, n]) => a + n, 0);
  if (!rows.length) { body.replaceChildren(hsEmpty(3)); return; }
  body.replaceChildren(...rows.map(([r, n]) => { const tr = document.createElement('tr'); tr.append(td(String(r), 'n'), td(String(n), 'n'), td(hsPct(n, tot), 'n')); return tr; }));
  runSortApply(body);
}
function hsRenderRuns() {
  const R = hsRes, body = $('hsRunBody');
  hsSortHead($('hsRunHead'), body, [['ผู้เล่น'], ['แมตช์', 'n'], ['ชนะ', 'n'], ['แพ้', 'n'], ['ถึงรอบ', 'n'], ['จบแบบ'], ['ทีมสุดท้าย'], ['log', '', 'มี log การซื้อขายในรหัสนี้ไหม (ไม่มี = ไม่นับซื้อ/รูน)']], 4);
  const rows = R ? R.runs : [];
  if (!rows.length) { body.replaceChildren(hsEmpty(8)); return; }
  const nm = id => { const c = chars.find(x => x.id === id); return c ? c.name : id; };
  body.replaceChildren(...rows.map(x => {
    const tr = document.createElement('tr'), end = x.lost.length ? (x.lastWon ? 'ชนะแมตช์สุดท้าย' : `แพ้รอบ ${x.lost[x.lost.length - 1].round}${x.lost[x.lost.length - 1].boss ? ' (บอส)' : ''}`) : 'ไม่แพ้เลย';
    tr.append(td(x.nm || '(ไม่มีชื่อ)'), td(String(x.matches), 'n'), td(String(x.wins), 'n'), td(String(x.losses), 'n'), td(String(x.rounds), 'n'), td(end),
      td(x.final.map(u => `${nm(u.id)} Lv${u.level}`).join(' · ') || '–'), td(x.journal ? (x.cut ? '✓ ถูกตัด' : '✓') : '✗'));
    return tr;
  }));
  runSortApply(body);
}
function hsRenderAll() {
  const R = hsRes; $('hsOut').hidden = !R; if (!R) return;
  const cards = [[R.runs.length, 'รันที่นับ'], [R.matches, 'แมตช์ที่นับ'], [R.players.length || '–', 'ผู้เล่น (ตามชื่อในรหัส)'], [Object.values(R.old).reduce((a, n) => a + n, 0), 'รันแพตช์เก่า (ไม่นับ)']];
  $('hsCards').replaceChildren(...cards.map(([v, l]) => { const d = document.createElement('div'), b = document.createElement('b'), s = document.createElement('span'); d.className = 'card'; b.textContent = String(v); s.textContent = l; d.append(b, s); return d; }));
  const h = hsCtx().hash, w = [];
  for (const b of R.bad) w.push(`รหัสที่ ${b.i} อ่านไม่ได้: ${b.error}`);
  for (const [k, n] of Object.entries(R.old)) w.push(`${n} รันทำบนค่าเกม ${k} แต่หน้านี้ใช้ค่า ${h} → ไม่นับ (ตัวเลขจะผิดถ้าเอามารวม) · ให้ค่าในหน้านี้ตรงกับตอนเล่น หรือดูรันเหล่านั้นแยกในหน้า runlog`);
  const info = [];
  if (R.dupRuns) info.push(`รหัสซ้ำ ${R.dupRuns} รัน นับครั้งเดียว`);
  if (R.unsim) w.push(`จำลองแมตช์ซ้ำไม่ได้ ${R.unsim} แมตช์ (ตัวเลขดาเมจไม่รวมแมตช์เหล่านี้)`);
  const nj = R.runs.filter(x => !x.journal).length; if (nj) info.push(`${nj} รันไม่มี log การซื้อขาย จึงไม่นับ "ซื้อ/ขาย/รูนที่เสนอ" ของรันเหล่านั้น`);
  if (R.runs.length && R.matches < HS_LOW) info.push(`มีแค่ ${R.matches} แมตช์ น้อยกว่า ${HS_LOW} ตัวเลขยังแกว่งมาก ดูเป็นแนวโน้มเท่านั้น`);
  $('hsInfo').hidden = !info.length; $('hsInfo').textContent = info.join(' · ');
  const ul = $('hsWarn'); ul.hidden = !w.length; ul.replaceChildren(...w.map(t => { const li = document.createElement('li'); li.textContent = t; return li; }));
  hsRenderChars(); hsRenderRunes(); hsRenderLose(); hsRenderRuns(); hsShowSec();
}
function hsShowSec() {
  for (const [k, id] of [['chars', 'hsChars'], ['runes', 'hsRunes'], ['lose', 'hsLose'], ['runs', 'hsRuns']]) $(id).hidden = hsView.sec !== k;
  for (const b of $('hsSec').querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.hs === hsView.sec));
}
$('hsSec').addEventListener('click', ev => { const b = ev.target.closest('button'); if (!b) return; hsView.sec = b.dataset.hs; hsShowSec(); });
$('hsLv').addEventListener('click', ev => {
  const b = ev.target.closest('button'); if (!b) return;
  for (const x of $('hsLv').querySelectorAll('button')) x.setAttribute('aria-pressed', String(x === b));
  hsView.lv = [1, 2, 3].includes(+b.dataset.lv) ? +b.dataset.lv : 0; hsRenderChars();
});
$('hsFind').addEventListener('input', hsFilter);
$('hsRun').addEventListener('click', async () => {
  const btn = $('hsRun'), msg = $('hsMsg'), texts = $('hsText').value.split(/(?=ARUN1 )/).map(s => s.trim()).filter(s => s.startsWith('ARUN1 '));
  if (!texts.length) { msg.textContent = 'ยังไม่มีรหัสรัน · วางรหัสที่ขึ้นต้นด้วย ARUN1'; return; }
  if (texts.length > HS_MAX_CODES) { msg.textContent = `วางได้ไม่เกิน ${HS_MAX_CODES} รหัสต่อครั้ง (ตอนนี้ ${texts.length})`; return; }
  btn.disabled = true; msg.textContent = `กำลังนับ ${texts.length} รหัส…`; const t0 = Date.now();
  try {
    hsRes = await hsAggregate(texts, hsCtx(), (d, n) => { msg.textContent = `กำลังเล่นซ้ำรันที่ ${d} / ${n}…`; });
    hsRenderAll();
    msg.textContent = `นับเสร็จ · ${hsRes.runs.length} รัน · ${hsRes.matches} แมตช์ · ${Math.max(1, Math.round((Date.now() - t0) / 1000))} วินาที`;
  } catch (e) { msg.textContent = 'นับไม่สำเร็จ: ' + e.message; }
  finally { btn.disabled = false; }
});
hsRenderAll();
