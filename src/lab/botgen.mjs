// สร้างทีมบอท 360 ทีม (ชุด 23 · set 87: 10 ขั้น × 3 ช่วงรอบ × ง่าย/กลาง/ยาก × 4 ทีม เผ่าหลากหลาย) · รัน: node lab/botgen.mjs [run จำลอง=1000] [จำนวนโปรเซส=2]
// → เขียน core/botdata.js (BOT_TEAMS + แฮชค่าเกม) · ค่าตัวละคร/กฎเปลี่ยน = เทสต์ "ชุด 23" แจ้งให้รันใหม่
// แบ่งขั้นให้หลายโปรเซสคำนวณพร้อมกัน (ทุกโปรเซสเก็บทีมจาก run จำลองชุดเดียวกัน ผลเหมือนรันโปรเซสเดียว)
import { writeFileSync } from 'fs';
import { spawn } from 'child_process';
import { RULES } from '../core/rules.js';
import { buildCharacterList } from '../core/characters.js';
import { makeCharMap } from '../core/team.js';
import { dataHash } from '../core/save.js';
import { BOT_GEN, BOT_PER, BOT_SPAN_TH, BOT_SPANS, genBotTeams, teamTribe, validateBotTeams } from '../core/botteams.js';

const chars = buildCharacterList(), n = RULES.shop.winsToFinish;
if (process.argv[2] === '--part') { // โปรเซสลูก: คำนวณเฉพาะขั้นที่ได้รับ แล้วพิมพ์ JSON
  const runs = +process.argv[3], stages = process.argv[4].split(',').map(Number);
  process.stdout.write(JSON.stringify(genBotTeams(chars, RULES, { runs, stages })));
} else {
  const runs = +(process.argv[2] || BOT_GEN.runs), procs = Math.max(1, Math.min(n, +(process.argv[3] || 2))), t0 = Date.now();
  // ขั้นต้นๆ มีทีมตัวอย่างมากกว่า → สลับแจกให้งานเท่าๆ กัน
  const parts = Array.from({ length: procs }, (_, p) => Array.from({ length: n }, (_, k) => k).filter(k => k % procs === p));
  const outs = await Promise.all(parts.map(st => new Promise((res, rej) => {
    const c = spawn(process.execPath, [process.argv[1], '--part', String(runs), st.join(',')]);
    let out = '', err = ''; c.stdout.on('data', d => out += d); c.stderr.on('data', d => err += d);
    c.on('close', code => code === 0 ? res(JSON.parse(out)) : rej(new Error(err.slice(0, 500))));
  })));
  const stages = Array.from({ length: n }, (_, k) => outs.find((o, p) => parts[p].includes(k)).stages[k]);
  const { stages: _s, ...gen } = outs[0].gen;
  const data = { v: 4, gen, sizes: outs[0].sizes, stages, hash: dataHash(chars) };
  const v = validateBotTeams(data, makeCharMap(chars), RULES, data.hash);
  if (!v.ok) { console.log('❌ ทีมบอทไม่ผ่านตัวตรวจ:', v.errors.slice(0, 5).join(' | ')); process.exit(1); }
  writeFileSync('core/botdata.js', `// สร้างอัตโนมัติด้วย lab/botgen.mjs (ชุด 23) · ห้ามแก้มือ · ${runs} run จำลอง เมล็ด ${gen.seed}\nexport const BOT_TEAMS = ${JSON.stringify(data)};\n`);
  console.log(`✅ ทีมบอท ${n * BOT_SPANS.length * 3 * BOT_PER} ทีม · ${runs} run จำลอง · ${Math.round((Date.now() - t0) / 1000)} วิ · แฮช ${data.hash}`);
  const cm = makeCharMap(chars);
  data.stages.forEach((sp, k) => sp.forEach((l, b) => {
    const borrowed = l[0].from !== k ? ` (ไม่มีตัวอย่าง ใช้ขั้น ${l[0].from} · ${data.sizes[k][b]})` : ` (ตัวอย่าง ${data.sizes[k][b]} · รอบ ≤ ${k + 1 + BOT_SPANS[b][0]})`;
    console.log(`ขั้น ${k} ช่วง${BOT_SPAN_TH[b]}${borrowed}: ` + l.map(t => `${t.tier} ${teamTribe(t.team, cm)} ${t.power}%`).join(' · '));
  }));
}
