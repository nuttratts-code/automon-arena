// รันเทสต์: node tests/run.js            = ครบชุด (+ สถิติความยาวแมตช์ 3 เลเวล)
//          node tests/run.js คำ1 คำ2   = เฉพาะเทสต์ที่ชื่อมีคำใดคำหนึ่ง (ใช้ระหว่างแก้ · workflow V1.11) · ไม่รันสถิติ
import { TESTS, runTests, matchStats } from './mechanics.js';
const words = process.argv.slice(2);
const pick = words.length ? TESTS.filter(([name]) => words.some(w => name.includes(w))) : null;
if (pick && !pick.length) { console.log(`ไม่พบเทสต์ที่ชื่อมี: ${words.join(' / ')}`); process.exit(1); }
const res = pick
  ? pick.map(([name, fn]) => { try { fn(); return { name, ok: true }; } catch (e) { return { name, ok: false, msg: e.message }; } })
  : runTests();
for (const r of res) console.log((r.ok ? 'PASS ' : 'FAIL ') + r.name + (r.ok ? '' : '\n      ' + r.msg));
console.log(`\n${res.filter(r => r.ok).length}/${res.length} ผ่าน${pick ? ` (เฉพาะที่เลือก จากทั้งหมด ${TESTS.length})` : ''}`);
if (!pick) for (const lv of [1, 2, 3]) console.log(JSON.stringify(matchStats(1000, 1, lv)));
