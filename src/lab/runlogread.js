// Run-log reader (set 110, user): one place that turns a run code (ARUN1) into a report — used by the "ดู log การเล่น" page
// (runlog.html) and by lab/runlog.mjs. Rebuilds every step of each run journal from its seed (core/runlog.js rlReplay) and
// re-simulates every stored match, then checks that what the player's page recorded is what the game would really do:
//   - page data hash = this page's (else: other game version, or character / shop values edited on the player's device)
//   - every step's gold before → after (an edited gold / price / income shows up here)
//   - each match: the team in the replay = the team rebuilt from the journal · win/lose and boss flag = the replay ·
//     re-simulated winner + time = recorded · permanent stats gained in the fight = the re-simulated fight's
//   - journal clock never goes backwards
// Anything that does not match → an alert (shown in red on the page). Pure data: no page code, no DOM. All names start with rv
// (the build bundles every file into one script).
import { simulate } from '../core/battle.js';
import { foeSide } from '../core/botteams.js';
import { RUN_STAGE, runBossById, runBossOpts, runBossTeam } from '../core/runboss.js';
import { equipRunes } from '../core/runes.js';
import { rnFromCompact, rnRec } from '../core/runrunes.js';
import { RL_TH, rlCheck, rlGains, rlReplay, rlUnref } from '../core/runlog.js';
import { REPLAY_VERSION, SAVE_MAX_CHARS, checkReplay, makeRunCode, parseRunCode, replayPct } from '../core/save.js';
import { get, teamEntries } from '../core/shop.js';
import { buildTeam } from '../core/team.js';

const rvNm = (CM, id) => `${id}(${(CM[id] || {}).name || '?'})`;
const rvRn = id => `${id}(${(rnRec(id) || {}).name || '?'})`;
const rvRefTh = s => { const r = rlUnref(s); return !r ? '-' : r.at === 'bench' ? `ม้านั่ง${r.i + 1}` : `บอร์ด แถว${r.row + 1} ช่อง${r.lane + 1}`; };
export const rvMmss = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

// re-simulate one stored match (save.js replay entry) → { winner, timeMs, gains } or null (cannot build)
export function rvSimMatch(x, CM, rules) {
  try {
    const e = equipRunes(buildTeam(x.a, CM), rnFromCompact(x.n || []), { winStreak: x.g | 0 });
    let fo;
    if (Array.isArray(x.b)) fo = foeSide({ team: x.b, pct: replayPct(x.d), rn: x.fn || [], s: x.fs | 0 }, CM, rules, RUN_STAGE, x.r);
    else { const rec = runBossById(x.b.boss); if (!rec) return null; fo = { units: runBossTeam(rec, x.b.k, RUN_STAGE, x.b.x === 1), opts: runBossOpts(rec) }; }
    const r = simulate(e.units, fo.units, { ...(e.tribeExtra.length ? { tribeExtra: e.tribeExtra } : {}), ...fo.opts });
    return { winner: r.winner, timeMs: Math.floor(r.timeMs), gains: rlGains((r.perm || []).filter(g => g.side === 0)) };
  } catch (err) { return null; }
}

// one journal (+ the stored matches of the same run, may be null) → report
export function rvAnalyze(log, ctx, replayRun = null) {
  const { chars, CM, rules, hash } = ctx;
  const R = rlReplay(log, chars, rules, true);
  const alerts = [], IN = {}, OUT = {}, buyBy = {}, rounds = [], add = (m, k, v) => { if (v) m[k] = (m[k] || 0) + v; };
  const nm = id => rvNm(CM, id), unitTh = u => (u ? `${nm(u.id)} Lv${u.level}` : 'ว่าง');
  const reps = {};
  if (replayRun && replayRun.run === log.seed) for (const x of replayRun.list) reps[x.r] = x;
  if (log.data !== hash) alerts.push(`ค่าเกมของ run นี้ (${log.data}) ไม่ตรงกับหน้านี้ (${hash}) · เล่นบนเกมคนละเวอร์ชัน หรือค่าตัวละคร/ร้านในเครื่องผู้เล่นถูกแก้`);
  if (log.cut) alerts.push('log เต็ม ถูกตัดท้าย (เกินจำนวนที่เก็บได้) · ส่วนท้ายของ run ไม่มีใน log');
  let rs = null, lastSec = 0, badGold = 0;
  const matches = [];
  const after = (i, k) => { const nx = R.steps[i + 1]; return nx ? nx.before[k] : R.st[k]; };
  R.steps.forEach((s, i) => {
    const [t, sec, g0, g1] = s.e, a = s.e.slice(4), b = s.before, d = g1 - g0;
    if (t === 'st' || !rs) { rs = { r: t === 'st' ? b.round + 1 : b.round, in: 0, out: 0, lost: 0, steps: [] }; rounds.push(rs); }
    let what = RL_TH[t];
    const notes = [];
    if (t === 'st') {
      if (g0 > 0) { add(OUT, 'เงินเหลือถูกทิ้งตอนขึ้นรอบใหม่', g0); rs.lost += g0; }
      add(IN, b.round === 0 ? 'เงินเริ่มต้น' : 'รายได้ต้นรอบ (รอบละ + ชนะ + รูนทอง + ดอกเบี้ยรูน)', g1); rs.in += g1;
      const nx = R.steps[i + 1];
      if (s.res && s.res.ok && nx) what += ` → ร้าน: ${nx.before.shop.map(x => (x.id ? nm(x.id) + (x.locked ? '🔒' : '') : '-')).join(' | ')}`;
    } else if (t === 'by' || t === 'bm') {
      const id = b.shop[a[0]] && b.shop[a[0]].id;
      const to = s.res && s.res.ok && s.res.ref ? s.res.ref : rlUnref(a[1]);
      what += ` ${id ? nm(id) : '?'} ${id && CM[id] ? `ราคา ${CM[id].price} ` : ''}จากช่องร้าน ${a[0] + 1} → ${to ? rvRefTh(to.at === 'bench' ? 'B' + to.i : 'F' + to.row + to.lane) : 'ม้านั่งช่องว่างแรก'}`;
      if (s.res && s.res.ok) { add(OUT, 'ซื้อตัวละคร', -d); buyBy[id] = (buyBy[id] || 0) + 1; rs.out += -d; }
    } else if (t === 'sl') {
      what += ` ${unitTh(get(b, rlUnref(a[0])))} ที่ ${rvRefTh(a[0])}`;
      if (s.res && s.res.ok) { add(IN, 'ขายคืน', d); rs.in += d; }
    } else if (t === 'mv') what += ` ${unitTh(get(b, rlUnref(a[0])))} ${rvRefTh(a[0])} → ${rvRefTh(a[1])}${get(b, rlUnref(a[1])) ? ' (ทับ ' + unitTh(get(b, rlUnref(a[1]))) + ')' : ''}`;
    else if (t === 'rr') { add(OUT, 'สุ่มร้าน', -d); rs.out += -d; if (!d) what += ' (ฟรี)'; }
    else if (t === 'or') { add(OUT, 'สุ่มการ์ดรูน', -d); rs.out += -d; }
    else if (t === 'ht') { add(IN, 'แลกหัวใจเป็นเงิน', d); rs.in += d; }
    else if (t === 'lk') what += ` ช่องร้าน ${a[0] + 1}`;
    else if (t === 'en') {
      what += ` ${a[1] ? 'บอส ' : ''}${a[0] ? 'ชนะ' : 'แพ้'}${a[2].length ? ` · ค่าถาวรจากสู้ ${a[2].length} รายการ` : ''} → ชนะ ${after(i, 'wins')} หัวใจ ${after(i, 'hearts')}`;
      const m = { round: b.round, won: a[0] === 1, boss: a[1] === 1, status: 'none', notes: [] };
      const x = reps[b.round];
      if (!x) m.notes.push('ไม่มีรีเพลย์ของแมตช์นี้ (เกมเก็บแค่ 40 แมตช์ล่าสุด) จึงตรวจผลแมตช์นี้ไม่ได้');
      else {
        x.seen = 1;
        const bad = [];
        if (JSON.stringify(teamEntries(b)) !== JSON.stringify(x.a)) bad.push('ทีมในรีเพลย์ไม่ตรงกับทีมที่สร้างจาก log');
        if ((x.w !== 1) !== (a[0] === 1)) bad.push(`log บอกว่า${a[0] ? 'ชนะ' : 'แพ้'} แต่รีเพลย์บอกว่า${x.w !== 1 ? 'ชนะ' : 'แพ้'}`);
        if (Array.isArray(x.b) === (a[1] === 1)) bad.push('log กับรีเพลย์ไม่ตรงกันว่าเป็นรอบบอสไหม');
        const r = rvSimMatch(x, CM, rules);
        if (!r) bad.push('จำลองแมตช์นี้ใหม่ไม่ได้');
        else {
          if (r.winner !== x.w || r.timeMs !== x.t) bad.push(`จำลองแมตช์ใหม่ได้ผล${r.winner === 1 ? 'แพ้' : 'ชนะ'} ${(r.timeMs / 1000).toFixed(1)} วิ แต่ที่บันทึกไว้คือ${x.w === 1 ? 'แพ้' : 'ชนะ'} ${(x.t / 1000).toFixed(1)} วิ`);
          if (JSON.stringify(r.gains) !== JSON.stringify(a[2])) bad.push('ค่าถาวรที่ได้จากการสู้ไม่ตรงกับการจำลองใหม่');
        }
        m.status = bad.length ? 'bad' : 'ok'; m.notes.push(...bad);
        for (const n of bad) alerts.push(`รอบ ${b.round}: ${n}`);
      }
      matches.push(m); notes.push(...m.notes.map(n => ({ text: n, bad: m.status === 'bad' })));
      if (m.status === 'ok') notes.push({ text: 'ตรวจกับรีเพลย์แล้ว ✓ (ทีม ผล เวลา ค่าถาวร ตรงหมด)', bad: false });
    } else if (t === 'of') what += ` (${a[0] === 'boss' ? 'ชนะบอส' : 'ชนะ'}) ${s.res && s.res.offer ? s.res.offer.ids.map(rvRn).join(', ') : 'ไม่มี'}`;
    else if (t === 'tk') what += ` ใบที่ ${a[0] + 1}${b.rn && b.rn.offer ? ' = ' + rvRn(b.rn.offer.ids[a[0]]) : ''}`;
    else if (t === 'pl') what += ` ${rvRn(a[0])} → ${a[1] === '-' ? 'ถอดออก' : rvRefTh(a[1])}${a[2] ? ' (คู่)' : ''}`;
    if (!['st', 'by', 'bm', 'sl', 'rr', 'or', 'ht'].includes(t) && d) { add(d > 0 ? IN : OUT, `อื่น ๆ (${RL_TH[t]} / สกิลร้าน)`, Math.abs(d)); if (d > 0) rs.in += d; else rs.out -= d; }
    if (sec < lastSec) { notes.push({ text: `เวลาย้อนกลับ (${rvMmss(lastSec)} → ${rvMmss(sec)})`, bad: true }); alerts.push(`ขั้นที่ ${i + 1}: เวลาใน log ย้อนกลับ`); }
    lastSec = sec;
    const refused = s.res && s.res.ok === false;
    let status = 'ok', badText = '';
    if (!s.goldOk) { status = 'bad'; badText = `เกมควรได้ ${b.gold} → ${s.gold}`; if (!badGold++) alerts.push(`ขั้นที่ ${i + 1} (รอบ ${rs.r} ${RL_TH[t]}): เงินใน log ${g0} → ${g1} แต่คำนวณใหม่ได้ ${b.gold} → ${s.gold} · ตั้งแต่ขั้นนี้เป็นต้นไปไม่ตรงกับเกมจริง`); }
    else if (refused) status = 'refused';
    const msgs = s.res && (s.res.msgs || (s.res.msg ? [s.res.msg] : [])) || [];
    const money = t === 'st' ? `เงินเหลือ ${g0} ถูกทิ้ง · ได้ ${g1}` : `เงิน ${g0} → ${g1}${d ? ` (${d > 0 ? '+' : ''}${d})` : ''}`;
    rs.steps.push({ i, sec, t, what, money, status, badText, msgs, notes });
  });
  if (badGold > 1) alerts.push(`เงินไม่ตรงทั้งหมด ${badGold} ขั้น`);
  const unseen = replayRun && replayRun.run === log.seed ? replayRun.list.filter(x => !x.seen) : [];
  for (const x of unseen) alerts.push(`รีเพลย์รอบ ${x.r} ไม่มีใน log (log หยุดบันทึกกลางทาง หรือแมตช์นี้ไม่ได้มาจากการเล่นตามปกติ)`);
  const tot = m => Object.values(m).reduce((x, y) => x + y, 0);
  return {
    nm: log.nm || '', seed: log.seed, at: log.at, n: log.ev.length, cut: log.cut, data: log.data, hashOk: log.data === hash,
    rounds, IN, OUT, inTotal: tot(IN), outTotal: tot(OUT), buyBy,
    final: { round: R.st.round, wins: R.st.wins, hearts: R.st.hearts, gold: R.st.gold, over: !!R.st.over },
    firstBad: R.firstBad, matches, alerts,
  };
}

// stored matches of one run (no journal needed) → [{ x, status, text }] · re-simulated each
export function rvMatches(run, CM, rules) {
  return run.list.map(x => {
    const r = rvSimMatch(x, CM, rules), ok = r && r.winner === x.w && r.timeMs === x.t;
    return { x, ok: !!ok, sim: r };
  });
}

// whole run code text → { ok, error } | { ok: true, nm, at, page, hashOk, hist, logs: [report], runs: [{ run, data, matches }], alerts }
export function rvReadCode(text, ctx) {
  let rc;
  try { rc = parseRunCode(text, ctx.CM, ctx.rules); } catch (e) { return { ok: false, error: e.message }; }
  const alerts = [];
  if (rc.page !== ctx.hash) alerts.push(`หน้าเกมที่คัดลอกโค้ดนี้ใช้ค่าเกม ${rc.page} ไม่ตรงกับหน้านี้ ${ctx.hash} · เล่นบนเกมคนละเวอร์ชัน หรือค่าในเครื่องผู้เล่นถูกแก้`);
  const runs = rc.runs.map(run => {
    const ms = rvMatches(run, ctx.CM, ctx.rules), bad = ms.filter(m => !m.ok).length;
    if (run.data !== ctx.hash) alerts.push(`รีเพลย์ของ run ${run.run} ทำบนค่าเกม ${run.data} (หน้านี้ ${ctx.hash})`);
    if (bad) alerts.push(`run ${run.run}: จำลองแมตช์ใหม่ได้ผลไม่ตรง ${bad} แมตช์`);
    return { run: run.run, data: run.data, matches: ms };
  });
  const logs = rc.logs.map(log => {
    if (rlCheck(log) !== true) return null; // parseRunCode already refused bad ones
    const run = rc.runs.find(r => r.run === log.seed) || null;
    return rvAnalyze(log, ctx, run ? { run: run.run, list: run.list.map(x => ({ ...x })) } : null);
  }).filter(Boolean);
  return { ok: true, nm: rc.nm || (logs[0] && logs[0].nm) || '', at: rc.at, page: rc.page, hashOk: rc.page === ctx.hash, hist: rc.hist, logs, runs, alerts };
}

// set 114: one run as the game page's db keeps it (head = runlogs/<id>, parts = runlogs/<id>/parts docs) → { log, short }
// log = journal for rvAnalyze (null if the head is not a journal head) · short = parts hold fewer entries than the head says
// set 188: rp = the run's match replays text (save.js makeReplays) from parts doc 'r' = { rp } · '' when the run has none (runs before set 188)
export function rvFromDb(head, parts) {
  if (!head || typeof head !== 'object') return { log: null, short: false, rp: '' };
  const all = Array.isArray(parts) ? parts : [];
  const ps = all.filter(p => p && Number.isInteger(p.k) && Array.isArray(p.ev)).sort((a, b) => a.k - b.k);
  const ev = ps.flatMap(p => p.ev);
  const log = { v: head.v, seed: head.seed, data: head.data, at: head.at, cut: head.cut, ev, ...(head.nm ? { nm: head.nm } : {}) };
  const r = all.find(p => p && typeof p.rp === 'string' && p.rp.length <= SAVE_MAX_CHARS), rp = r ? r.rp : '';
  return rlCheck(log) === true ? { log, short: ev.length !== head.n, rp } : { log: null, short: false, rp: '' };
}
// set 188: replays text → { run, list } for rvAnalyze, or null (unreadable, other run, or any match that fails checkReplay)
export function rvDbRun(rp, seed, ctx) {
  let o; try { o = typeof rp === 'string' && rp && rp.length <= SAVE_MAX_CHARS ? JSON.parse(rp) : null; } catch (e) { o = null; }
  if (!o || typeof o !== 'object' || o.rv !== REPLAY_VERSION || o.run !== seed || !Array.isArray(o.list) || !o.list.length) return null;
  return o.list.every(x => checkReplay(x, ctx.CM, ctx.rules)) ? { run: o.run, list: o.list } : null;
}
// set 188 (user A1/A2): one db run (rvFromDb result) → an ARUN1 run code for the Balance Room "ผู้เล่นจริง" tab · null if no journal
// replays go in only when they belong to this run and pass checkReplay (else the code carries the journal alone)
export function rvDbCode(d, ctx, at) {
  if (!d || !d.log) return null;
  const run = rvDbRun(d.rp, d.log.seed, ctx);
  return makeRunCode(run ? [d.rp] : [], '', ctx.hash, at, ctx.rules, [JSON.stringify(d.log)], d.log.nm || '');
}
