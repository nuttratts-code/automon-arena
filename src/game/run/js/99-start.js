// ---------- เปิดเกม: เซฟเดิม (ชุด 22) ----------
function boot() {
  if (!playerName) { askName(boot); return; }
  const r = readSave(store.get(SAVE_KEY), CM, RULES, DATA_HASH);
  if (r.status === 'ok') {
    const o = r.save;
    $('resumeInfo').textContent = `รอบ ${o.P.round + 1} · ชนะ ${o.P.wins}/${S.winsToFinish} · หัวใจ ${o.P.hearts} · เงิน ${o.P.gold} (ก่อนรับเงินรอบใหม่) · ร้าน Lv ${lvForRound(o.P.round + 1)}`;
    $('resumeGo').onclick = () => {
      P = o.P; B = o.B; stats = o.stats; startedAt = o.startedAt; msgs = []; showNotice('');
      const rp = readReplays(store.get(REPLAY_KEY), CM, RULES, DATA_HASH, P.seed); // ชุด 25: รีเพลย์ของ run นี้เท่านั้น
      replays = rp.list; replayMode = null;
      if (rp.status === 'data') showNotice('เกมอัปเดตแล้ว รีเพลย์ของ run นี้จึงถูกซ่อน');
      if (rp.status === 'bad') showNotice('ข้อมูลรีเพลย์เสียหายหรือผิดรูปแบบ จึงถูกล้าง (เล่นต่อได้ตามปกติ)');
      if (rp.status !== 'ok') saveReplays();
      RL = resumeLog();
      if (RL && playerName && RL.nm !== playerName) { RL.nm = playerName; saveLog(true); } // set 110: renamed on the resume screen
      showScreen('prep'); beginRound();
    };
    $('resumeNew').onclick = () => { showNotice(''); startNewRun(); };
    showScreen('resume');
    return;
  }
  if (r.status !== 'none') store.del(SAVE_KEY);
  startNewRun();
  if (r.status === 'data') showNotice('เกมอัปเดตค่าตัวละครหรือกฎแล้ว เซฟ run เดิมจึงถูกล้าง · เริ่ม run ใหม่ให้แล้ว');
  if (r.status === 'bad') showNotice('เซฟ run เดิมเสียหายหรือผิดรูปแบบ จึงถูกล้าง · เริ่ม run ใหม่ให้แล้ว');
}
$('endCode').addEventListener('click', copyRunCode); $('resumeCode').addEventListener('click', copyRunCode);
$('skip').addEventListener('click', () => { setStop(false); if (view.result && !view.ended) view.skip(); });
// set 120 (user): stop / go on during a match (display only · the result is already decided)
function setStop(on) { $('stop').setAttribute('aria-pressed', String(!!on)); $('stop').textContent = on ? '▶ เล่นต่อ' : '⏸ หยุด'; }
$('stop').addEventListener('click', () => {
  if (!view.result || view.ended) return;
  if (view.playing) { view.pause(); setStop(true); } else { setStop(false); view.play(); }
});
const PREF_KEY = 'automon-play-prefs-v1';
function setSpeed(v, save) {
  if (![1, 2, 4, 8, 16].includes(v)) return;
  speed = v; view.speed = speed;
  document.querySelectorAll('[data-speed]').forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.speed === v)));
  if (save) savePrefs();
}
function setAutoSkip(on, save) { autoSkip = !!on; $('autoSkip').checked = autoSkip; if (save) savePrefs(); }
function savePrefs() { store.set(PREF_KEY, JSON.stringify({ speed, autoSkip })); }
try { const pf = JSON.parse(store.get(PREF_KEY) || '{}'); if (pf && typeof pf === 'object') { setSpeed(+pf.speed); setAutoSkip(pf.autoSkip === true); } } catch (e) { /* bad prefs = defaults */ }
document.querySelectorAll('[data-speed]').forEach(b => b.addEventListener('click', () => setSpeed(+b.dataset.speed, true)));
$('autoSkip').addEventListener('change', () => { setAutoSkip($('autoSkip').checked, true); if (autoSkip && view.result && !view.ended && !replayMode) view.skip(); });

boot();
