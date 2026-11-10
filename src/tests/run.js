// รันเทสต์: node tests/run.js            = ครบชุด (+ สถิติความยาวแมตช์ 3 เลเวล)
//          node tests/run.js คำ1 คำ2   = เฉพาะเทสต์ที่ชื่อมีคำใดคำหนึ่ง (ใช้ระหว่างแก้ · workflow V1.11) · ไม่รันสถิติ
import { TESTS, runTests, matchStats } from './mechanics.js';
import { FINDINGS_SKILL_CALC } from './t-skill-calc.js'; // set 42: rule-vs-battle findings waiting for the user (not failures)
import { checkBuildList } from './t-build.js';
import { checkGameData } from '../tools/exportdata.mjs'; // set 190: Godot plan P0 step 1
const words = process.argv.slice(2);
const pick = words.length ? TESTS.filter(([name]) => words.some(w => name.includes(w))) : null;
if (pick && !pick.length) { console.log(`ไม่พบเทสต์ที่ชื่อมี: ${words.join(' / ')}`); process.exit(1); }
const res = pick
  ? pick.map(([name, fn]) => { try { fn(); return { name, ok: true }; } catch (e) { return { name, ok: false, msg: e.message }; } })
  : runTests();
if (!pick) { const bp = checkBuildList(); res.push({ name: 'build: ทุกไฟล์ใน core/ อยู่ใน CORE ของ build.mjs (ชุด 62)', ok: !bp.length, msg: bp.join(' · ') });
  const gd = await checkGameData(); res.push({ name: 'godot: godot/data/game.json ตรงค่าเกมปัจจุบัน (ชุด 190 · node tools/exportdata.mjs)', ok: !gd.length, msg: gd.join(' · ') }); }
for (const r of res) console.log((r.ok ? 'PASS ' : 'FAIL ') + r.name + (r.ok ? '' : '\n      ' + r.msg));
console.log(`\n${res.filter(r => r.ok).length}/${res.length} ผ่าน${pick ? ` (เฉพาะที่เลือก จากทั้งหมด ${TESTS.length})` : ''}`);
const wait = FINDINGS_SKILL_CALC.filter(([name]) => !words.length || words.some(w => name.includes(w))).map(([name, fn]) => { try { fn(); return [name, null]; } catch (e) { return [name, e.message]; } });
for (const [name, msg] of wait) console.log((msg ? 'WAIT ' : 'OK?  ') + name + (msg ? '\n      ' + msg : '  (now passes: move it into TESTS)'));
if (wait.length) console.log(`รอผู้ใช้ตัดสิน ${wait.filter(w => w[1]).length} ข้อ (ไม่นับเป็นเทสต์ตก)`);
if (!pick) for (const lv of [1, 2, 3]) console.log(JSON.stringify(matchStats(1000, 1, lv)));
