import { RULES, TRIBES } from './rules.js';
import { buy, buyMerge, continueExtra, endMatch, move, newRun, reroll, sell, startRound, takeRune, toggleLock, PERM_KEYS } from './shop.js';
import { rnHeartTrade, rnMakeOffer, rnPlace, rnRerollOffer, rnSkipOffer } from './runrunes.js';
// Godot port (set 195 step 6f): godot/scripts/runlog.gd — a change here must be made there too (golden save.jsonl, lab/golden-save.mjs).
// Run journal (set 109, user 6 Nov): every action that changes the player's run state, in order, with gold before → after.
// A run is deterministic from its seed (shop + rune draws use st.seed and the counter st.n), so replaying the journal on
// newRun(seed) rebuilds every step: lab/runlog.mjs prints where each coin came from and went, and checks each step's gold.
// Kept in the browser with the run save, written to the game page's db (runlogs/…) and added to the run code (ARUN1).
// Entry = [type, sec, goldBefore, goldAfter, ...args] (compact: a long run with many moves must stay far under 256 KiB)
//   sec = seconds since the run started · slot refs as text: "B3" bench 3 · "F10" board row 1 lane 0 · "-" none
//   'st' startRound · 'by' slot,dest buy · 'sl' ref sell · 'rr' shop reroll · 'lk' slot lock · 'bm' slot,dest buy+merge
//   'mv' from,to move/merge · 'en' won(0/1),boss(0/1),gains match end (gains = [id,key,row,lane,amount] perm from the fight)
//   'of' kind rune offer after a win · 'tk' i [tribe] take rune card (tribe = flag rune T8, set 128) · 'or' rune card reroll · 'sk' skip rune · 'ht' heart → gold
//   'pl' runeId,slot("F10"/"-"),partner(0/1) place rune · 'ex' continue extra matches
export const RLOG_VERSION = 1;
export const RLOG_MAX = 20000; // entries per run; past this the journal stops (flag cut) · normal runs ≈ 300–1500 (ค่าเสนอ)
export const RLOG_PART = 2500; // entries per db document (≈ 25 bytes each → ≈ 60–90 KB, under the 256 KiB doc cap)
const RL_TYPES = { st: 0, by: 2, sl: 1, rr: 0, lk: 1, bm: 2, mv: 2, en: 3, of: 1, tk: 1, or: 0, sk: 0, ht: 0, pl: 3, ex: 0 };
export const RL_TH = { st: 'เริ่มรอบ', by: 'ซื้อ', sl: 'ขาย', rr: 'สุ่มร้าน', lk: 'ล็อก/ปลดล็อก', bm: 'ซื้อ+รวมร่าง', mv: 'ย้าย/รวมร่าง', en: 'จบแมตช์', of: 'ได้การ์ดรูน', tk: 'เลือกรูน', or: 'สุ่มการ์ดรูน', sk: 'ไม่รับรูน', ht: 'แลกหัวใจ', pl: 'วางรูน', ex: 'เล่นต่อแมตช์พิเศษ' };

export const rlRef = r => (!r ? '-' : r.at === 'bench' ? 'B' + r.i : r.at === 'board' ? 'F' + r.row + r.lane : '-');
export function rlUnref(s) {
  if (s === '-') return null;
  let m = /^B(\d{1,2})$/.exec(s); if (m) return { at: 'bench', i: +m[1] };
  m = /^F([0-2])([0-1])$/.exec(s); if (m) return { at: 'board', row: +m[1], lane: +m[2] };
  return undefined;
}
// set 110 (user): player name typed before playing · cleaned text only (no control / invisible / bidi marks), spaces squeezed,
// at most RL_NAME_MAX characters · '' = no name · always shown with textContent (never as HTML)
export const RL_NAME_MAX = 20;
export function rlName(s) {
  if (typeof s !== 'string') return '';
  const t = s.replace(/[\u0000-\u001f\u007f-\u009f\u00ad\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff\ufff0-\uffff]/g, '').replace(/\s+/g, ' ').trim();
  return Array.from(t).slice(0, RL_NAME_MAX).join('').trim();
}
// nm = player name (optional · journals before set 110 have none)
export function newRunLog(seed, hash, at, name = '') {
  const L = { v: RLOG_VERSION, seed: seed >>> 0, data: hash, at: Math.floor(at), cut: 0, ev: [] }, nm = rlName(name);
  if (nm) L.nm = nm;
  return L;
}
// add one entry · now = ms clock · returns false when the journal is full (cut set)
export function rlPush(log, type, args, g0, g1, now) {
  if (!log || !(type in RL_TYPES)) return false;
  if (log.ev.length >= RLOG_MAX) { log.cut = 1; return false; }
  log.ev.push([type, Math.max(0, Math.floor((now - log.at) / 1000)), g0, g1, ...args]);
  return true;
}
export const rlGains = gains => (Array.isArray(gains) ? gains : []).slice(0, 200).map(g => [g.id, g.key, g.row, g.lane, g.amount]);

// ---------- check (external data: from localStorage, the db or a pasted code) ----------
const rlInt = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
const rlGold = x => rlInt(x, -1e6, 1e7);
function rlArgsOk(e) {
  const t = e[0], a = e.slice(4), slot = x => rlInt(x, 0, 20), ref = x => typeof x === 'string' && rlUnref(x) !== undefined;
  if (a.length !== RL_TYPES[t] && !(t === 'tk' && a.length === 2 && TRIBES.includes(a[1]))) return false; // set 128: tk may carry the flag tribe
  switch (t) {
    case 'by': case 'bm': return slot(a[0]) && ref(a[1]);
    case 'sl': return ref(a[0]) && a[0] !== '-';
    case 'mv': return ref(a[0]) && ref(a[1]) && a[0] !== '-' && a[1] !== '-';
    case 'lk': case 'tk': return slot(a[0]);
    case 'of': return a[0] === 'win' || a[0] === 'boss' || a[0] === 'sc'; // set 119: sc = second chance legend pick
    case 'en': return (a[0] === 0 || a[0] === 1) && (a[1] === 0 || a[1] === 1) && Array.isArray(a[2]) && a[2].length <= 200
      && a[2].every(g => Array.isArray(g) && g.length === 5 && typeof g[0] === 'string' && /^[A-Za-z0-9_-]{1,16}$/.test(g[0])
        && PERM_KEYS.includes(g[1]) && rlInt(g[2], 0, 2) && rlInt(g[3], 0, 1) && typeof g[4] === 'number' && Number.isFinite(g[4]));
    case 'pl': return typeof a[0] === 'string' && /^[A-Za-z0-9_-]{1,24}$/.test(a[0]) && ref(a[1]) && (a[1] === '-' || a[1][0] === 'F') && (a[2] === 0 || a[2] === 1);
    default: return true;
  }
}
// true / reason text
export function rlCheck(log) {
  if (!log || typeof log !== 'object' || Array.isArray(log)) return 'not an object';
  const keys = ['v', 'seed', 'data', 'at', 'cut', 'ev', 'nm'];
  if (!Object.keys(log).every(k => keys.includes(k)) || log.v !== RLOG_VERSION) return 'bad header';
  if ('nm' in log && (typeof log.nm !== 'string' || !log.nm || rlName(log.nm) !== log.nm)) return 'bad name';
  if (!rlInt(log.seed, 0, 0xFFFFFFFF) || typeof log.data !== 'string' || !/^[0-9a-f]{8}$/.test(log.data) || !rlInt(log.at, 0, 1e15) || (log.cut !== 0 && log.cut !== 1)) return 'bad header';
  if (!Array.isArray(log.ev) || log.ev.length > RLOG_MAX) return 'bad entries';
  for (let i = 0; i < log.ev.length; i++) {
    const e = log.ev[i];
    if (!Array.isArray(e) || !(e[0] in RL_TYPES) || !rlInt(e[1], 0, 1e9) || !rlGold(e[2]) || !rlGold(e[3]) || !rlArgsOk(e)) return `bad entry #${i + 1}`;
  }
  return true;
}

// ---------- replay ----------
// apply one entry to st → the action's result ({ ok, msgs | msg } · 'of' → { ok, offer })
export function rlApply(st, e, chars, rules = RULES) {
  const a = e.slice(4);
  switch (e[0]) {
    case 'st': return startRound(st, chars, rules);
    case 'by': return buy(st, a[0], rlUnref(a[1]), chars, rules);
    case 'sl': return sell(st, rlUnref(a[0]), chars, rules);
    case 'rr': return reroll(st, chars, rules);
    case 'lk': return toggleLock(st, a[0]);
    case 'bm': return buyMerge(st, a[0], rlUnref(a[1]), chars, rules);
    case 'mv': return move(st, rlUnref(a[0]), rlUnref(a[1]), chars, rules);
    case 'en': return endMatch(st, a[0] === 1, chars, rules, a[2].map(g => ({ id: g[0], key: g[1], row: g[2], lane: g[3], amount: g[4], side: 0 })), a[1] === 1);
    case 'of': { const o = rnMakeOffer(st, a[0]); return { ok: true, msgs: [], offer: o }; }
    case 'tk': return takeRune(st, a[0], chars, rules, typeof a[1] === 'string' ? a[1] : null); // set 128: a[1] = flag tribe · set 184: round-start runes pay out now when the shop is open
    case 'or': return rnRerollOffer(st);
    case 'sk': return rnSkipOffer(st);
    case 'ht': return rnHeartTrade(st);
    case 'pl': { const r = rlUnref(a[1]); return rnPlace(st, a[0], r ? [r.row, r.lane] : null, rules, a[2] === 1); }
    case 'ex': return continueExtra(st, rules);
    default: return { ok: false, msg: 'unknown' };
  }
}
// replay a whole journal → { st, steps: [{ e, before (state copy), after gold, res, goldOk }], firstBad (index or -1) }
// keep = false skips the per-step state copies (fast check)
export function rlReplay(log, chars, rules = RULES, keep = true) {
  const st = newRun(chars, log.seed, rules), steps = [];
  let firstBad = -1;
  log.ev.forEach((e, i) => {
    const before = keep ? structuredClone(st) : null, g0 = st.gold;
    let res; try { res = rlApply(st, e, chars, rules); } catch (err) { res = { ok: false, msg: 'error: ' + err.message }; }
    const goldOk = g0 === e[2] && st.gold === e[3];
    if (!goldOk && firstBad < 0) firstBad = i;
    steps.push({ e, before, gold: st.gold, res, goldOk });
  });
  return { st, steps, firstBad };
}
