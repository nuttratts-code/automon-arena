// Read a run journal (set 109, core/runlog.js) and rebuild the run step by step from its seed: where every coin came from and
// went, what was in the shop, what was bought / sold / merged, rune picks, match results. Each step's gold is checked against
// what the game recorded (✓ / ✗ = this repo's values differ from the page that made it, or the journal is wrong).
// Input file = one of:
//   - a run code (ARUN1 …, "คัดลอกโค้ดผลการเล่น" in the game) → its journals (latest first; --run 2 = the one before)
//   - a journal JSON { v, seed, data, at, cut, ev }
//   - a db export JSON { head: {...runlogs/<id>}, parts: [{ k, ev }, …] } (ArtifactData get runlogs/<id> + list runlogs/<id>/parts)
// Usage: node lab/runlog.mjs <file> [--run 2] [--brief]   (--brief = round summaries + money totals only) · changes nothing
import fs from 'fs';
import { buildCharacterList } from '../core/characters.js';
import { RULES } from '../core/rules.js';
import { dataHash, parseRunCode } from '../core/save.js';
import { RL_TH, rlCheck, rlReplay, rlUnref } from '../core/runlog.js';
import { get } from '../core/shop.js';
import { rnRec } from '../core/runrunes.js';
import { makeCharMap } from '../core/team.js';

const args = process.argv.slice(2);
if (!args[0]) { console.log('usage: node lab/runlog.mjs <file> [--run 2] [--brief]'); process.exit(1); }
const brief = args.includes('--brief'), ri = args.indexOf('--run'), runNo = ri >= 0 ? Math.max(1, +args[ri + 1] | 0) : 1;
const chars = buildCharacterList(), CM = makeCharMap(chars), HASH = dataHash(chars);
const txt = fs.readFileSync(args[0], 'utf8').trim();
let log;
if (txt.startsWith('ARUN1 ')) {
  const rc = parseRunCode(txt, CM, RULES);
  if (!rc.logs.length) { console.log('this run code has no journal (made before set 109, or no action yet)'); process.exit(0); }
  log = rc.logs[runNo - 1];
  if (!log) { console.log(`no journal #${runNo} (code has ${rc.logs.length})`); process.exit(1); }
} else {
  const o = JSON.parse(txt);
  if (o && o.head && Array.isArray(o.parts)) {
    const h = o.head, ev = o.parts.slice().sort((a, b) => a.k - b.k).flatMap(p => p.ev);
    log = { v: h.v, seed: h.seed, data: h.data, at: h.at, cut: h.cut, ev };
    if (ev.length !== h.n) console.log(`⚠ head says ${h.n} entries, parts hold ${ev.length} (a part not saved yet?)`);
  } else log = o;
}
const c = rlCheck(log);
if (c !== true) { console.log('journal rejected: ' + c); process.exit(1); }

const nm = id => `${id}(${(CM[id] || {}).name || '?'})`;
const mmss = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const refTh = s => { const r = rlUnref(s); return !r ? '-' : r.at === 'bench' ? `ม้านั่ง${r.i + 1}` : `บอร์ด แถว${r.row + 1} ช่อง${r.lane + 1}`; };
const rn = id => `${id}(${(rnRec(id) || {}).name || '?'})`;
const unitTh = u => (u ? `${nm(u.id)} Lv${u.level}` : 'ว่าง');
const R = rlReplay(log, chars, RULES, true);

// money buckets (Thai labels = what the user reads)
const IN = {}, OUT = {}, add = (m, k, v) => { if (v) m[k] = (m[k] || 0) + v; };
const buyBy = {};
console.log(`run seed ${log.seed} · started ${new Date(log.at).toISOString().replace('T', ' ').slice(0, 16)}Z · ${log.ev.length} actions${log.cut ? ' · ⚠ journal full, cut' : ''}`);
console.log(`made on data ${log.data} · this repo ${HASH}${log.data !== HASH ? ' ⚠ other values — steps may not rebuild (✗)' : ''}`);
let roundLines = [], rStat = null;
const flush = () => { if (!rStat) return; console.log(`\n=== รอบ ${rStat.r} · เงินเข้า ${rStat.in} · ใช้ ${rStat.out} · ทิ้งตอนขึ้นรอบใหม่ ${rStat.lost}`); if (!brief) roundLines.forEach(l => console.log(l)); roundLines = []; };
R.steps.forEach((s, i) => {
  const [t, sec, g0, g1] = s.e, a = s.e.slice(4), b = s.before, d = g1 - g0;
  if (t === 'st') { flush(); rStat = { r: b.round + 1, in: 0, out: 0, lost: 0 }; }
  let what = RL_TH[t];
  if (t === 'st') {
    if (g0 > 0) { add(OUT, 'เงินเหลือถูกทิ้งตอนขึ้นรอบใหม่', g0); rStat.lost += g0; }
    add(IN, b.round === 0 ? 'เงินเริ่มต้น' : 'รายได้ต้นรอบ (รอบละ + ชนะ + รูนทอง + ดอกเบี้ยรูน)', g1); rStat.in += g1;
    what += ` → ร้าน: ${s.res.ok ? R.steps[i + 1] && R.steps[i + 1].before ? R.steps[i + 1].before.shop.map(x => (x.id ? nm(x.id) + (x.locked ? '🔒' : '') : '-')).join(' | ') : '' : ''}`;
  } else if (t === 'by' || t === 'bm') {
    const id = b.shop[a[0]] && b.shop[a[0]].id;
    const to = s.res.ok && s.res.ref ? { at: s.res.ref.at, i: s.res.ref.i, row: s.res.ref.row, lane: s.res.ref.lane } : rlUnref(a[1]);
    what += ` ${id ? nm(id) : '?'} ${id && CM[id] ? `ราคา ${CM[id].price} ` : ''}จากช่องร้าน ${a[0] + 1} → ${to ? refTh(to.at === 'bench' ? 'B' + to.i : 'F' + to.row + to.lane) : 'ม้านั่งช่องว่างแรก'}`;
    if (s.res.ok) { add(OUT, 'ซื้อตัวละคร', -d); buyBy[id] = (buyBy[id] || 0) + 1; rStat.out += -d; }
  } else if (t === 'sl') {
    what += ` ${unitTh(get(b, rlUnref(a[0])))} ที่ ${refTh(a[0])}`;
    if (s.res.ok) { add(IN, 'ขายคืน', d); rStat.in += d; }
  } else if (t === 'mv') what += ` ${unitTh(get(b, rlUnref(a[0])))} ${refTh(a[0])} → ${refTh(a[1])}${get(b, rlUnref(a[1])) ? ' (ทับ ' + unitTh(get(b, rlUnref(a[1]))) + ')' : ''}`;
  else if (t === 'rr') { add(OUT, 'สุ่มร้าน', -d); rStat.out += -d; if (!d) what += ' (ฟรี)'; }
  else if (t === 'or') { add(OUT, 'สุ่มการ์ดรูน', -d); rStat.out += -d; }
  else if (t === 'ht') { add(IN, 'แลกหัวใจเป็นเงิน', d); rStat.in += d; }
  else if (t === 'lk') what += ` ช่องร้าน ${a[0] + 1}`;
  else if (t === 'en') what += ` ${a[1] ? 'บอส ' : ''}${a[0] ? 'ชนะ' : 'แพ้'}${a[2].length ? ` · ค่าถาวรจากสู้ ${a[2].length} รายการ` : ''} → ชนะ ${rebuiltAfter(i, 'wins')} หัวใจ ${rebuiltAfter(i, 'hearts')}`;
  else if (t === 'of') what += ` (${a[0] === 'boss' ? 'ชนะบอส' : 'ชนะ'}) ${s.res.offer ? s.res.offer.ids.map(rn).join(', ') : 'ไม่มี'}`;
  else if (t === 'tk') what += ` ใบที่ ${a[0] + 1}${b.rn && b.rn.offer ? ' = ' + rn(b.rn.offer.ids[a[0]]) : ''}`;
  else if (t === 'pl') what += ` ${rn(a[0])} → ${a[1] === '-' ? 'ถอดออก' : refTh(a[1])}${a[2] ? ' (คู่)' : ''}`;
  if (!['st', 'by', 'bm', 'sl', 'rr', 'or', 'ht'].includes(t) && d) { add(d > 0 ? IN : OUT, `อื่น ๆ (${RL_TH[t]} / สกิลร้าน)`, Math.abs(d)); if (d > 0) rStat.in += d; else rStat.out -= d; }
  const msgs = s.res && (s.res.msgs || (s.res.msg ? [s.res.msg] : [])) || [];
  const money = t === 'st' ? `เงินเหลือ ${g0} ถูกทิ้ง · ได้ ${g1}` : `เงิน ${g0} → ${g1}${d ? ` (${d > 0 ? '+' : ''}${d})` : ''}`;
  roundLines.push(`  ${mmss(sec)} ${what} · ${money} ${s.goldOk && (s.res.ok !== false) ? '✓' : s.goldOk ? '· (ถูกปฏิเสธ เหมือนในเกม)' : `✗ คำนวณได้ ${R.steps[i].before.gold} → ${s.gold}`}`);
  for (const m of msgs) roundLines.push(`        ${m}`);
});
function rebuiltAfter(i, k) { const nx = R.steps[i + 1]; return nx ? nx.before[k] : R.st[k]; }
flush();
const tot = m => Object.values(m).reduce((x, y) => x + y, 0);
console.log('\n=== สรุปเงินทั้ง run');
console.log('เงินเข้า:'); for (const [k, v] of Object.entries(IN)) console.log(`  ${k}: ${v}`);
console.log(`  รวม ${tot(IN)}`);
console.log('เงินออก:'); for (const [k, v] of Object.entries(OUT)) console.log(`  ${k}: ${v}`);
console.log(`  รวม ${tot(OUT)}`);
console.log(`เงินคงเหลือตอนนี้ ${R.st.gold} (เข้า − ออก = ${tot(IN) - tot(OUT)})`);
console.log('ซื้อตัวไหนกี่ครั้ง: ' + Object.entries(buyBy).sort((x, y) => y[1] - x[1]).map(([id, n]) => `${nm(id)}×${n}`).join(' · '));
console.log(`สถานะสุดท้าย: รอบ ${R.st.round} · ชนะ ${R.st.wins} · หัวใจ ${R.st.hearts}${R.st.over ? ' · จบ run' : ''}`);
console.log(R.firstBad < 0 ? `ตรวจย้อน: ✓ ทุกขั้นตรงกับในเกม (${log.ev.length} ขั้น)` : `ตรวจย้อน: ✗ ไม่ตรงตั้งแต่ขั้นที่ ${R.firstBad + 1} (${log.data !== HASH ? 'ค่าเกมต่างจาก repo นี้' : 'ต้องหาสาเหตุ'})`);
