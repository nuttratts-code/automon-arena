// ตัวช่วยตั้งต้นและตรวจงาน (workflow V1.8) · รัน: node tools/bootstrap.mjs <โหมด> [ตัวเลือก]
//   setup   (ค่าตั้งต้น) สร้าง package.json → แยกโค้ดจากหน้าที่เผยแพร่ (pub/) → build → เทียบกับหน้าที่เผยแพร่ → เทสต์
//   test [คำ ...]  ระดับ 1: เฉพาะเทสต์ที่ชื่อมีคำนั้น (ไม่ใส่คำ = ครบชุด) แสดงเฉพาะที่ผิดปกติ
//   final [แมตช์=24000] [เมล็ด=4242]
//           ระดับ 2: build → รันเทสต์ + ทดสอบหน้าเว็บ (ui_smoke) + วัดบาลานซ์ "พร้อมกัน" แล้วสรุปสั้น (ไม่ต้องรอทีละอย่าง)
//   measure [แมตช์] [เมล็ด]   วัดบาลานซ์อย่างเดียว (ใช้วัดซ้ำ 48000 ตอนใกล้ขอบ) แสดงเฉพาะที่ผิดปกติ
// Git repo version (28 Oct 2026): source lives in the repo (src/), no extraction from published pages. Run from anywhere.
// เกณฑ์ผ่านไม่เปลี่ยน: เทสต์ครบ · ui_smoke FAILS [] ERRORS [] · ไม่มีตัวหลุด (±6 ผสม / ±10 รายเลเวล) · วัดด้วยเมล็ด 4242
// ชุด 17: แมตช์ที่ตัวตัดนิรภัยหยุด (บรรทัด "ผิดปกติ" จาก lab/measure.mjs) = ไม่ผ่าน
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';
import { execFileSync, spawn } from 'child_process';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..'), SHOTS = resolve(tmpdir(), 'automon-shots');
process.chdir(SRC);
const [mode = 'setup', a1, a2] = process.argv.slice(2);
const PW = { PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers' };

const sh = (cmd, args, env = {}) => execFileSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 28, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
const run = (cmd, args, env = {}) => new Promise(res => {
  const t0 = Date.now(), p = spawn(cmd, args, { env: { ...process.env, ...env } });
  let out = ''; p.stdout.on('data', d => out += d); p.stderr.on('data', d => out += d);
  p.on('close', code => res({ code, out, sec: Math.round((Date.now() - t0) / 1000) }));
});
const lines = s => s.split('\n');
const nonEmpty = s => lines(s).filter(l => l.trim() !== '');
const say = (...a) => console.log(...a);
let bad = 0;
const flag = (ok, msg) => { if (!ok) bad++; say((ok ? '✅ ' : '❌ ') + msg); };

function summarizeTests(out) {
  const L = lines(out), total = L.find(l => /\d+\/\d+ ผ่าน/.test(l)) || `(ไม่พบบรรทัดสรุป) ${(L.find(l => l.trim()) || '').slice(0, 120)}`;
  const m = total.match(/(\d+)\/(\d+)/), fails = L.filter(l => l.startsWith('FAIL '));
  return { total: total.trim(), ok: !!m && m[1] === m[2] && fails.length === 0, fails };
}
function summarizeUi(out) {
  const L = lines(out), checks = L.filter(l => /^\d+ check /.test(l)), boards = L.filter(l => /max board/.test(l));
  const okChecks = checks.length === 2 && checks.every(l => { const m = l.match(/(\d+)\s*\/\s*(\d+)/); return m && m[1] === m[2]; });
  const okBoards = boards.length === 2 && boards.every(l => +l.match(/max board (\d+)/)[1] >= 3);
  const fl = L.find(l => l.startsWith('FAILS ')) || 'FAILS (ไม่พบ)', er = L.find(l => l.startsWith('ERRORS ')) || 'ERRORS (ไม่พบ)';
  return { ok: okChecks && okBoards && fl.trim() === 'FAILS []' && er.trim() === 'ERRORS []', detail: [...checks, fl, er].join(' · ') };
}
function summarizeMeasure(out) {
  const L = lines(out), head = L.find(l => l.startsWith('แมตช์ต่อชุด')) || '(ไม่พบบรรทัดหัว)';
  const out1 = L.filter(l => l.startsWith('หลุด ')), near = L.filter(l => l.startsWith('ใกล้ขอบ ')), abn = L.filter(l => l.startsWith('ผิดปกติ '));
  const ti = L.findIndex(l => l.startsWith('เผ่าในทีมที่ชนะ')); // node แตกวัตถุยาวเป็นหลายบรรทัด → รวมจนถึงปีกกาปิด
  let tribe = '';
  if (ti >= 0) { let j = ti; while (j < L.length - 1 && !/}\s*$/.test(L[j])) j++; tribe = L.slice(ti, j + 1).map(s => s.trim()).join(' '); }
  return { ok: !!L.find(l => l.startsWith('แมตช์ต่อชุด')) && out1.length === 0 && abn.length === 0, head, out: out1, near, abn, tribe };
}
function printMeasure(m) {
  say(m.head);
  for (const l of m.abn) say('❌ ' + l);
  for (const l of m.out) say('❌ ' + l);
  for (const l of m.near) say('⚠️ ' + l);
  if (m.tribe) say(m.tribe);
}

if (mode === 'setup') { // repo: build + tests only (code is already in src/)
  try { sh('node', ['build.mjs']); flag(true, 'build ok (3 pages)'); }
  catch (e) { say('❌ build failed:', String(e.stderr || e.message).split('\n').slice(0, 6).join('\n')); process.exit(1); }
  const t = summarizeTests(sh('node', ['tests/run.js']));
  flag(t.ok, `tests ${t.total}${t.fails.length ? ' · ' + t.fails.join(' | ') : ''}`);
  say(bad ? 'Summary: problems, see above' : 'Summary: ready to edit code (build ok, all tests pass)');
  process.exit(bad ? 1 : 0);
} else if (mode === 'test') { // V1.11: node tools/bootstrap.mjs test [คำในชื่อเทสต์ ...] = เฉพาะเทสต์ที่เกี่ยวข้อง (ระหว่างแก้) · ไม่ใส่คำ = ครบชุด
  const words = process.argv.slice(3);
  let out; try { out = sh('node', ['tests/run.js', ...words]); } catch (e) { out = (e.stdout || '') + (e.stderr || ''); }
  const t = summarizeTests(out);
  flag(t.ok, `เทสต์ ${t.total}${t.fails.length ? '\n   ' + t.fails.join('\n   ') : ''}`);
  process.exit(bad ? 1 : 0);
} else if (mode === 'final') {
  const N = a1 || '24000', SEED = a2 || '4242';
  try { sh('node', ['build.mjs']); } catch (e) { say('❌ build ไม่สำเร็จ:', String(e.stderr || e.message).split('\n').slice(0, 6).join('\n')); process.exit(1); }
  mkdirSync(SHOTS, { recursive: true });
  say(`รันพร้อมกัน: เทสต์ · ui_smoke · วัดบาลานซ์ ${N} แมตช์ เมล็ด ${SEED} ...`);
  const [t, u, m] = await Promise.all([
    run('node', ['tests/run.js']),
    run('python3', ['-I', 'tests/ui_smoke.py', SRC, SHOTS], PW),
    run('node', ['lab/measure.mjs', N, SEED]),
  ]);
  const ts = summarizeTests(t.out), us = summarizeUi(u.out), ms = summarizeMeasure(m.out);
  flag(ts.ok, `เทสต์ ${ts.total} (${t.sec} วิ)${ts.fails.length ? '\n   ' + ts.fails.join('\n   ') : ''}`);
  flag(us.ok, `ui_smoke ${us.detail} (${u.sec} วิ)`);
  if (!us.ok) say(lines(u.out).slice(-12).join('\n'));
  flag(ms.ok, `วัดบาลานซ์ ${N} แมตช์ เมล็ด ${SEED} (${m.sec} วิ) · ตัวหลุด ${ms.out.length} · ใกล้ขอบ ${ms.near.length} · แมตช์ผิดปกติ ${ms.abn.length ? 'มี' : '0'}`);
  printMeasure(ms);
  if (!ms.head.startsWith('แมตช์ต่อชุด')) say(lines(m.out).slice(-8).join('\n'));
  if (ms.near.length) say('⚠️ มีตัวใกล้ขอบ → วัดซ้ำ: node tools/bootstrap.mjs measure 48000');
  say(bad ? 'สรุป: ไม่ผ่าน ห้ามเผยแพร่ แจ้งผู้ใช้ทันที' : 'สรุป: ผ่านครบ (เผยแพร่ได้ถ้าไม่มีข้อ ⚠️ ค้าง)');
  process.exit(bad ? 1 : 0);
} else if (mode === 'measure') {
  const m = await run('node', ['lab/measure.mjs', a1 || '12000', a2 || '4242']);
  const ms = summarizeMeasure(m.out);
  flag(ms.ok, `วัดบาลานซ์ ${a1 || '12000'} แมตช์ (${m.sec} วิ) · ตัวหลุด ${ms.out.length} · ใกล้ขอบ ${ms.near.length} · แมตช์ผิดปกติ ${ms.abn.length ? 'มี' : '0'}`);
  printMeasure(ms);
  process.exit(bad ? 1 : 0);
} else {
  say('โหมดไม่รู้จัก: setup | test | final | measure');
  process.exit(2);
}
