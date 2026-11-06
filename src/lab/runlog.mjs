// Read a run journal (set 109, core/runlog.js) and rebuild the run step by step from its seed: where every coin came from and
// went, what was in the shop, what was bought / sold / merged, rune picks, match results. Each step's gold is checked against
// what the game recorded (✓ / ✗), and (set 110) each match against its stored replay. Same reader as the "ดู log การเล่น" page
// (lab/runlogread.js) — anything in "ผิดปกติ" there is shown in red on the page.
// Input file = one of:
//   - a run code (ARUN1 …, "คัดลอกโค้ดผลการเล่น" in the game) → its journals (latest first; --run 2 = the one before)
//   - a journal JSON { v, seed, data, at, cut, ev }
//   - a db export JSON { head: {...runlogs/<id>}, parts: [{ k, ev }, …] } (ArtifactData get runlogs/<id> + list runlogs/<id>/parts)
// Usage: node lab/runlog.mjs <file> [--run 2] [--brief]   (--brief = round summaries + money totals only) · changes nothing
import fs from 'fs';
import { buildCharacterList } from '../core/characters.js';
import { RULES } from '../core/rules.js';
import { dataHash } from '../core/save.js';
import { rlCheck } from '../core/runlog.js';
import { makeCharMap } from '../core/team.js';
import { rvAnalyze, rvFromDb, rvMmss, rvReadCode } from './runlogread.js';

const args = process.argv.slice(2);
if (!args[0]) { console.log('usage: node lab/runlog.mjs <file> [--run 2] [--brief]'); process.exit(1); }
const brief = args.includes('--brief'), ri = args.indexOf('--run'), runNo = ri >= 0 ? Math.max(1, +args[ri + 1] | 0) : 1;
const chars = buildCharacterList(), CM = makeCharMap(chars), HASH = dataHash(chars), ctx = { chars, CM, rules: RULES, hash: HASH };
const txt = fs.readFileSync(args[0], 'utf8').trim();
let rep, extra = [];
if (txt.startsWith('ARUN1 ')) {
  const rc = rvReadCode(txt, ctx);
  if (!rc.ok) { console.log('run code rejected: ' + rc.error); process.exit(1); }
  console.log(`player ${rc.nm || '(no name)'} · copied ${new Date(rc.at).toISOString().slice(0, 16)}Z`);
  extra = rc.alerts;
  if (!rc.logs.length) { console.log('this run code has no journal (made before set 109, or no action yet)'); for (const a of extra) console.log('ผิดปกติ: ' + a); process.exit(0); }
  rep = rc.logs[runNo - 1];
  if (!rep) { console.log(`no journal #${runNo} (code has ${rc.logs.length})`); process.exit(1); }
} else {
  const o = JSON.parse(txt);
  let log = o;
  if (o && o.head && Array.isArray(o.parts)) {
    const d = rvFromDb(o.head, o.parts);
    if (!d.log) { console.log('journal rejected: bad db head/parts'); process.exit(1); }
    log = d.log;
    if (d.short) console.log(`⚠ head says ${o.head.n} entries, parts hold ${log.ev.length} (a part not saved yet?)`);
  }
  const c = rlCheck(log);
  if (c !== true) { console.log('journal rejected: ' + c); process.exit(1); }
  rep = rvAnalyze(log, ctx, null);
}
console.log(`run seed ${rep.seed} · player ${rep.nm || '(no name)'} · started ${new Date(rep.at).toISOString().replace('T', ' ').slice(0, 16)}Z · ${rep.n} actions${rep.cut ? ' · ⚠ journal full, cut' : ''}`);
console.log(`made on data ${rep.data} · this repo ${HASH}${rep.hashOk ? '' : ' ⚠ other values — steps may not rebuild (✗)'}`);
for (const r of rep.rounds) {
  console.log(`\n=== รอบ ${r.r} · เงินเข้า ${r.in} · ใช้ ${r.out} · ทิ้งตอนขึ้นรอบใหม่ ${r.lost}`);
  if (brief) continue;
  for (const s of r.steps) {
    console.log(`  ${rvMmss(s.sec)} ${s.what} · ${s.money} ${s.status === 'ok' ? '✓' : s.status === 'refused' ? '· (ถูกปฏิเสธ เหมือนในเกม)' : '✗ ' + s.badText}`);
    for (const m of s.msgs) console.log(`        ${m}`);
    for (const n of s.notes) console.log(`        ${n.bad ? '✗ ' : ''}${n.text}`);
  }
}
console.log('\n=== สรุปเงินทั้ง run');
console.log('เงินเข้า:'); for (const [k, v] of Object.entries(rep.IN)) console.log(`  ${k}: ${v}`);
console.log(`  รวม ${rep.inTotal}`);
console.log('เงินออก:'); for (const [k, v] of Object.entries(rep.OUT)) console.log(`  ${k}: ${v}`);
console.log(`  รวม ${rep.outTotal}`);
console.log(`เงินคงเหลือตอนนี้ ${rep.final.gold} (เข้า − ออก = ${rep.inTotal - rep.outTotal})`);
console.log('ซื้อตัวไหนกี่ครั้ง: ' + Object.entries(rep.buyBy).sort((x, y) => y[1] - x[1]).map(([id, n]) => `${id}(${(CM[id] || {}).name || '?'})×${n}`).join(' · '));
console.log(`สถานะสุดท้าย: รอบ ${rep.final.round} · ชนะ ${rep.final.wins} · หัวใจ ${rep.final.hearts}${rep.final.over ? ' · จบ run' : ''}`);
console.log(rep.firstBad < 0 ? `ตรวจย้อน: ✓ ทุกขั้นตรงกับในเกม (${rep.n} ขั้น)` : `ตรวจย้อน: ✗ ไม่ตรงตั้งแต่ขั้นที่ ${rep.firstBad + 1} (${rep.hashOk ? 'ต้องหาสาเหตุ' : 'ค่าเกมต่างจาก repo นี้'})`);
const all = [...extra, ...rep.alerts];
console.log(all.length ? `ผิดปกติ ${all.length} จุด:\n` + all.map(a => '  ✗ ' + a).join('\n') : 'ผิดปกติ: ไม่พบ');
