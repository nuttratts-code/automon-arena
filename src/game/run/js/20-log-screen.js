// ---------- set 114 (user): owner-only Log screen ----------
// Button shown only to the owner / Editors (user.isOwner / canEdit) · the db rule on runlogs (read+write admin, set at publish)
// keeps everyone else from reading the logs even outside this screen. List = runlogs heads, live (onSnapshot, subscribed once on
// first open); one run's detail = its parts read once, re-read when that run's head changes. Paste box = same report as runlog.html.
const LG_CTX = { chars, CM, rules: RULES, hash: DATA_HASH };
let lgUnsub = null, lgOpenId = '', lgOpenUpd = 0, lgHeads = new Map(), lgCodeRep = null, lgCodePick = 0, lgBusy = 0;
(async () => {
  let u = null;
  try { u = window.claude && typeof window.claude.use === 'function' ? await window.claude.use('user') : null; } catch (e) { u = null; }
  let ok = false;
  try { ok = !!u && ((await u.isOwner()) || (await u.canEdit())); } catch (e) { ok = false; }
  $('logBtn').hidden = !ok;
})();
function lgOpen() {
  $('logScr').hidden = false;
  if (lgUnsub || !playDb) { if (!playDb) $('logInfo').textContent = 'ฐานข้อมูลของหน้านี้ใช้ไม่ได้ตอนนี้ (เปิดนอก Claude หรือยังโหลดไม่เสร็จ) · ยังวางโค้ดเองได้'; return; }
  try {
    lgUnsub = playDb.collection('runlogs').orderBy('upd', 'desc').limit(200).onSnapshot(snap => {
      lgHeads = new Map(snap.docs.filter(d => d.exists).map(d => [d.id, d.data()]));
      lgList();
      const h = lgOpenId && lgHeads.get(lgOpenId);
      if (h && h.upd !== lgOpenUpd) lgShow(lgOpenId);
    }, () => { $('logInfo').textContent = 'อ่าน log จากฐานข้อมูลไม่ได้ (ไม่มีสิทธิ์อ่าน) · ยังวางโค้ดเองได้'; });
  } catch (e) { $('logInfo').textContent = 'อ่าน log จากฐานข้อมูลไม่ได้ · ยังวางโค้ดเองได้'; }
}
const lgNum = x => (Number.isFinite(x) ? String(x) : '-');
function lgList() {
  const rows = [...lgHeads.entries()];
  $('logInfo').textContent = (rows.length ? `${rows.length} run · เรียงจากเซฟล่าสุด · อัปเดตเอง` : 'ยังไม่มี log ในระบบ') + (rlErr ? ` · ส่ง log ของเครื่องนี้ไม่สำเร็จ (${rlErr}) จะลองใหม่เอง` : '');
  $('logList').replaceChildren(...rows.map(([id, h]) => {
    const tr = lvMk('tr', id === lgOpenId ? 'open' : ''), b = lvMk('button', '', id === lgOpenId ? 'กำลังดู' : 'ดู'); b.type = 'button';
    b.addEventListener('click', () => lgShow(id));
    const td = lvMk('td'); td.append(b);
    tr.append(lvMk('td', '', typeof h.nm === 'string' && h.nm ? rlName(h.nm) || '(ไม่ได้ตั้งชื่อ)' : '(ไม่ได้ตั้งชื่อ)'), lvMk('td', '', Number.isFinite(h.at) ? lvWhen(h.at) : '-'),
      lvMk('td', '', Number.isFinite(h.upd) ? lvWhen(h.upd) : '-'), lvMk('td', 'n', lgNum(h.round)), lvMk('td', 'n', lgNum(h.wins)), lvMk('td', 'n', lgNum(h.hearts)),
      lvMk('td', 'n', lgNum(h.gold)), lvMk('td', '', h.over ? 'จบแล้ว' : 'ยังเล่นอยู่'), td);
    return tr;
  }));
}
async function lgShow(id) {
  const h = lgHeads.get(id); if (!h || !playDb) return;
  lgOpenId = id; lgOpenUpd = h.upd; lgCodeRep = null; lgList();
  const my = ++lgBusy;
  $('logOut').replaceChildren(lvMk('p', 'hint', 'กำลังโหลด log…'));
  let parts = [];
  try { const snap = await playDb.collection('runlogs/' + id + '/parts').get(); parts = snap.docs.filter(d => d.exists).map(d => d.data()); } catch (e) { parts = null; }
  if (my !== lgBusy) return; // another run was opened meanwhile
  if (!parts) { $('logOut').replaceChildren(lvMk('p', 'bad', 'อ่านรายละเอียด run นี้ไม่ได้')); return; }
  const d = rvFromDb(h, parts);
  if (!d.log) { $('logOut').replaceChildren(lvMk('p', 'bad', 'log ของ run นี้อ่านไม่ได้ (ข้อมูลไม่ครบหรือผิดรูปแบบ)')); return; }
  let rep;
  try { rep = rvAnalyze(d.log, LG_CTX, rvDbRun(d.rp, d.log.seed, LG_CTX)); } catch (e) { rep = null; } // set 188: stored replays → match checks too
  if (!rep) { $('logOut').replaceChildren(lvMk('p', 'bad', 'คำนวณ log ของ run นี้ใหม่ไม่ได้')); return; }
  const nodes = lvLogNodes(rep, CM);
  if (d.short) nodes.unshift(lvMk('p', 'hint', `ส่วนท้ายของ log ยังส่งมาไม่ครบ (มี ${d.log.ev.length} จาก ${h.n} ขั้น) · จะอัปเดตเองเมื่อมาครบ`));
  $('logOut').replaceChildren(...nodes);
}
function lgRead() {
  const t = $('logCode').value.trim();
  $('logErr').hidden = true;
  if (!t) { $('logErr').textContent = 'วางโค้ดก่อน'; $('logErr').hidden = false; return; }
  const r = rvReadCode(t, LG_CTX);
  if (!r.ok) { $('logErr').textContent = 'อ่านโค้ดไม่ได้: ' + r.error + ' · โค้ดที่ถูกแก้หรือคัดลอกมาไม่ครบจะอ่านไม่ได้'; $('logErr').hidden = false; return; }
  lgOpenId = ''; lgBusy++; lgList(); lgCodeRep = r; lgCodePick = 0; lgCodeRender();
}
// ---------- set 188 (user A1 · A2 · B1): copy the newest LG_ALL_MAX runs on this page's game values as ARUN1 codes for the Balance Room ----------
// Balance Room "ผู้เล่นจริง" takes at most 60 codes per paste (HS_MAX_CODES) and skips runs on other game values → only DATA_HASH runs.
// Runs saved since set 188 carry their match replays (parts doc 'r') → full stats · older runs = journal only (buys / sells / runes).
const LG_ALL_MAX = 60;
async function lgCopyAll() {
  const btn = $('logAllCopy'), msg = $('logAllMsg'), out = $('logAllOut');
  if (!playDb) { msg.textContent = 'ฐานข้อมูลของหน้านี้ใช้ไม่ได้ตอนนี้'; return; }
  const ids = [...lgHeads.entries()].filter(([, h]) => h && h.data === DATA_HASH && Number.isFinite(h.upd)).sort((a, b) => b[1].upd - a[1].upd).slice(0, LG_ALL_MAX).map(([id]) => id);
  if (!ids.length) { msg.textContent = 'ยังไม่มีรันที่เล่นบนค่าเกมชุดนี้'; return; }
  btn.disabled = true; out.hidden = true;
  const codes = []; let full = 0;
  try {
    for (const id of ids) {
      msg.textContent = `กำลังอ่านรันที่ ${codes.length + 1} / ${ids.length}…`;
      let parts = null;
      try { const snap = await playDb.collection('runlogs/' + id + '/parts').get(); parts = snap.docs.filter(d => d.exists).map(d => d.data()); } catch (e) { parts = null; }
      if (!parts) continue;
      const d = rvFromDb(lgHeads.get(id), parts), code = rvDbCode(d, LG_CTX, Date.now());
      if (!code) continue;
      codes.push(code); if (rvDbRun(d.rp, d.log.seed, LG_CTX)) full++;
    }
    if (!codes.length) { msg.textContent = 'อ่านรันจากฐานข้อมูลไม่ได้เลย'; return; }
    const text = codes.join('\n\n'), note = `${codes.length} รัน` + (full < codes.length ? ` (มีแมตช์ครบ ${full} รัน · ที่เหลือเป็นรันเก่า มีแค่การซื้อขายกับรูน)` : '');
    try { await navigator.clipboard.writeText(text); msg.textContent = `คัดลอกแล้ว ${note} · ไปวางในห้องบาลานซ์ → ดูผล → ผู้เล่นจริง`; }
    catch (e) { out.value = text; out.hidden = false; out.focus(); out.select(); msg.textContent = `คัดลอกเองไม่ได้ · เลือกข้อความในกล่องด้านล่างแล้วคัดลอก (${note})`; }
  } finally { btn.disabled = false; }
}
$('logAllCopy').addEventListener('click', lgCopyAll);
function lgCodeRender() { $('logOut').replaceChildren(...lvCodeNodes(lgCodeRep, CM, lgCodePick, i => { lgCodePick = i; lgCodeRender(); })); }
$('logBtn').addEventListener('click', lgOpen);
$('logClose').addEventListener('click', () => { $('logScr').hidden = true; });
$('logRead').addEventListener('click', lgRead);
$('logClear').addEventListener('click', () => { $('logCode').value = ''; $('logErr').hidden = true; if (lgCodeRep) { lgCodeRep = null; $('logOut').replaceChildren(); } });
function showNotice(t) { $('noticeText').textContent = t; $('notice').hidden = !t; }
$('noticeX').addEventListener('click', () => showNotice(''));

function randSeed() { try { return crypto.getRandomValues(new Uint32Array(1))[0]; } catch (e) { return (Date.now() ^ 0x5bd1e995) >>> 0; } }
function startNewRun() {
  const seed = randSeed();
  dummyDmg = 0; P = newRun(chars, seed); B = newRun(chars, (seed ^ 0xA5A5A5A5) >>> 0);
  msgs = []; stats = newStats(); startedAt = Date.now();
  const oldLog = store.get(RLOG_KEY); if (oldLog && oldLog.includes('"ev":[[')) store.set(RLOG_PREV_KEY, oldLog); // set 109: keep the last run's journal for the run code
  RL = newRunLog(seed, DATA_HASH, startedAt, playerName);
  const old = store.get(REPLAY_KEY); if (old && old.includes('"list":[{')) store.set(PREV_REPLAY_KEY, old); // set 105: keep the finished run's replays for the run code
  replays = []; replayMode = null; saveReplays();
  saveRun(true); // เซฟตอนเริ่ม run (ก่อนเปิดร้านรอบแรก) · ออกแล้วกลับมา = เริ่มรอบร้านใหม่ ร้านเดิม
  showScreen('prep');
  beginRound();
}
