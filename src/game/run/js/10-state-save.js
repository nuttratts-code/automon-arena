const chars = buildCharacterList(), CM = makeCharMap(chars);
// set 172: placeholder pixel art (game page only) — sprites for units/bosses, tiled floors for shop / arena / run end
setUnitArt(GAME_ART.unit);
for (const [k, v] of Object.entries(GAME_ART.scene)) document.documentElement.style.setProperty('--art-' + k, `url("${v}")`);
$('field').classList.add('art-bg'); $('runEnd').classList.add('art-bg');
const S = RULES.shop;
let infoLv = { key: '', lv: 1 }; // ชุด 26: เลเวลที่ดูในแผงรายละเอียด
let P = null, B = null, msgs = [], speed = 4, confirmEmpty = false, confirmRunes = false, autoSkip = false; // set 106: default 4× · speed + auto-skip remembered (localStorage)
// set 107 (user): modes removed · the enemy follows the player's power (pickFoe) · stronger after each win in a row (P.ws)
// ชุด 22: เซฟกลางทาง 1 ช่อง + สถิติ + ประวัติ (core/save.js) · ที่เก็บพังหรือถูกปิด = เล่นได้ปกติ แค่ไม่เซฟ
const SAVE_KEY = 'automon-run-save-v1', HIST_KEY = 'automon-run-history-v1', DATA_HASH = dataHash(chars);
let stats = newStats(), startedAt = Date.now(), pendingEnd = null, clearAt = 0; // set 99: clearAt = history time of the clear (replaced if the player continues)
// ชุด 23: ทีมบอทเตรียมไว้ล่วงหน้า 360 ทีม (set 87) ตามขั้นชนะ × ช่วงรอบ (core/botdata.js) · ตรวจตอนเปิดเกม · ผิด/ค่าเกมไม่ตรง = กลับไปใช้บอทซื้อสด
const BOT_OK = validateBotTeams(BOT_TEAMS, CM, RULES, DATA_HASH).ok;
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* ไม่มีที่เก็บ */ } },
};
function saveRun(now = false) { if (!P.over) store.set(SAVE_KEY, makeSave(P, B, stats, startedAt, DATA_HASH)); saveLog(now); }
// set 109 (user): run journal (core/runlog.js) · every action on P with gold before → after · saved with the run (same moments,
// so a resumed run and its journal always match) · sent to the db (runlogs/<id> + parts) and added to the run code
const RLOG_KEY = 'automon-run-log-v1', RLOG_PREV_KEY = 'automon-run-log-prev-v1';
let RL = null;
function J(t, args, fn) {
  const g0 = P.gold, snap = RL ? JSON.stringify(P) : '', r = fn();
  if (RL && (t === 'of' || (r && r.ok) || JSON.stringify(P) !== snap)) rlPush(RL, t, args, g0, P.gold, Date.now()); // a refused action that changed nothing is not kept
  return r;
}
// resumed run: the saved journal must rebuild exactly the saved state, else this run goes on unlogged (never a wrong log)
function resumeLog() {
  try {
    const t = store.get(RLOG_KEY), o = t && t.length <= RUN_CODE_MAX ? JSON.parse(t) : null;
    if (!o || rlCheck(o) !== true || o.seed !== P.seed || o.data !== DATA_HASH) return null;
    const k = x => JSON.stringify([x.gold, x.round, x.n, x.uid, x.hearts, x.wins, x.shop, x.bench, x.board, x.rn]), r = rlReplay(o, chars, RULES, false);
    return r.firstBad < 0 && k(r.st) === k(P) ? o : null;
  } catch (e) { return null; }
}
function saveLog(now = false) { if (!RL) return; store.set(RLOG_KEY, JSON.stringify(RL)); if (now) sendLog(); }
// set 136 (log fix): the db asks for ONE write at a time per document, only on real change (db contract). Before, every shop
// action fired head + part writes at once without waiting and ignored errors → most writes were dropped and, mid-run, all
// journal writes stopped while plays.add still landed (run 5c1dac96: 11 matches in plays, journal frozen after match 8).
// Now: a snapshot is queued only at run start, match end, rename and when the page is hidden; one writer sends it (parts,
// then head, each awaited); a failed send stays queued and is retried with backoff; sent counts move only after success.
const rlDone = new Map(), rlKey = new Map(), rlPend = new Map(); // id → entries already stored in the db · id → newest unsent snapshot
let rlBusy = false, rlWait = 0, rlFail = 0, rlErr = '';
function sendLog() {
  if (!RL) return;
  const id = `${RL.seed.toString(16)}-${RL.at}`, n = RL.ev.length, key = JSON.stringify([n, RL.cut, RL.nm || '', P.round, P.wins, P.hearts, P.gold, P.over ? 1 : 0]);
  if (rlKey.get(id) === key && !rlPend.has(id)) return; // nothing changed since the last stored copy
  rlPend.set(id, { id, n, key, ev: RL.ev.slice(), head: { v: RL.v, seed: RL.seed, data: RL.data, at: RL.at, cut: RL.cut, n, parts: Math.ceil(n / RLOG_PART), upd: Date.now(),
    round: P.round, wins: P.wins, hearts: P.hearts, gold: P.gold, over: P.over ? 1 : 0, ...(RL.nm ? { nm: RL.nm } : {}) } });
  pumpLog();
}
async function pumpLog() { // no db / no write right = the queue just waits (the run code still has the journal)
  if (rlBusy || rlWait || !playDb || playWait) return;
  rlBusy = true;
  while (rlPend.size) {
    const s = rlPend.values().next().value; rlPend.delete(s.id);
    try {
      const run = playDb.doc('runlogs/' + s.id), done = Math.min(rlDone.get(s.id) || 0, s.n);
      for (let k = Math.floor(done / RLOG_PART); k * RLOG_PART < s.n; k++) await run.collection('parts').doc('p' + k).set({ k, ev: s.ev.slice(k * RLOG_PART, (k + 1) * RLOG_PART) });
      await run.set(s.head);
      rlDone.set(s.id, s.n); rlKey.set(s.id, s.key); rlFail = 0; rlErr = '';
    } catch (e) {
      if (!rlPend.has(s.id)) rlPend.set(s.id, s); // a newer snapshot of the same run replaces this one
      rlFail++; rlErr = String((e && (e.code || e.message)) || e).slice(0, 80);
      break;
    }
  }
  rlBusy = false;
  if (rlPend.size) rlWait = setTimeout(() => { rlWait = 0; pumpLog(); }, rlFail ? Math.min(120000, 5000 * 2 ** (rlFail - 1)) : 0);
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') sendLog(); }); // app switched / tab closed: send what the shop phase added
window.addEventListener('pagehide', () => sendLog());
// ชุด 25 (7A): รีเพลย์ทุกแมตช์ใน run นี้ · เก็บทีม 2 ฝั่ง + ผล แยกจากเซฟ (core/save.js readReplays ตรวจทุกช่องตอนโหลด)
const REPLAY_KEY = 'automon-run-replays-v1', PREV_REPLAY_KEY = 'automon-run-replays-prev-v1'; // set 105: previous run's replays kept for the run code
let replays = [], replayMode = null;
function saveReplays() { store.set(REPLAY_KEY, makeReplays(P.seed, DATA_HASH, replays)); }
// ชุด 25 (8A): สรุปรายแมตช์ลงฐานข้อมูลของหน้านี้ · ไม่มีฐานข้อมูล (เปิดนอก Claude / ไม่ได้สิทธิ์เขียน) = ข้ามเงียบๆ เกมเล่นได้ปกติ
let playDb, playWait = [];
(async () => {
  try { playDb = window.claude && typeof window.claude.use === 'function' ? await window.claude.use('db') : null; } catch (e) { playDb = null; }
  const q = playWait; playWait = null; for (const r of q) logPlay(r);
  pumpLog();
})();
function logPlay(rec) {
  if (!checkPlayRecord(rec, CM, RULES)) return; // ตรวจทุกช่องก่อนเขียน
  if (playWait) { if (playWait.length < 20) playWait.push(rec); return; } // ฐานข้อมูลยังไม่พร้อม (เพิ่งเปิดหน้า)
  if (!playDb) return;
  try { Promise.resolve(playDb.collection('plays').add(rec)).catch(() => {}); } catch (e) { /* เขียนไม่ได้ = ข้าม */ }
}
