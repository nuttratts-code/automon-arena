// Builds bot teams (set 23 · set 99: one cell per round 1–19 × ง่าย/กลาง/ยาก × 4 teams, varied tribes) · รัน: node lab/botgen.mjs [run จำลอง=1000] [จำนวนโปรเซส=2]
// → เขียน core/botdata.js (BOT_TEAMS + แฮชค่าเกม) · ค่าตัวละคร/กฎเปลี่ยน = เทสต์ "ชุด 23" แจ้งให้รันใหม่
// แบ่งขั้นให้หลายโปรเซสคำนวณพร้อมกัน (ทุกโปรเซสเก็บทีมจาก run จำลองชุดเดียวกัน ผลเหมือนรันโปรเซสเดียว)
import { writeFileSync } from 'fs';
import { spawn } from 'child_process';
import { RULES } from '../core/rules.js';
import { buildCharacterList } from '../core/characters.js';
import { makeCharMap } from '../core/team.js';
import { dataHash } from '../core/save.js';
import { BOT_GEN, BOT_PER, BOT_TIERS, botRounds, genBotTeams, teamTribe, validateBotTeams } from '../core/botteams.js';

const chars = buildCharacterList(), n = botRounds(RULES);
if (process.argv[2] === '--part') { // โปรเซสลูก: คำนวณเฉพาะขั้นที่ได้รับ แล้วพิมพ์ JSON
  const runs = +process.argv[3], cells = process.argv[4].split(',').map(Number);
  process.stdout.write(JSON.stringify(genBotTeams(chars, RULES, { runs, cells })));
} else {
  const runs = +(process.argv[2] || BOT_GEN.runs), procs = Math.max(1, Math.min(n, +(process.argv[3] || 2))), t0 = Date.now();
  // ขั้นต้นๆ มีทีมตัวอย่างมากกว่า → สลับแจกให้งานเท่าๆ กัน
  const parts = Array.from({ length: procs }, (_, p) => Array.from({ length: n }, (_, k) => k).filter(k => k % procs === p));
  const outs = await Promise.all(parts.map(st => new Promise((res, rej) => {
    const c = spawn(process.execPath, [process.argv[1], '--part', String(runs), st.join(',')]);
    let out = '', err = ''; c.stdout.on('data', d => out += d); c.stderr.on('data', d => err += d);
    c.on('close', code => code === 0 ? res(JSON.parse(out)) : rej(new Error(err.slice(0, 500))));
  })));
  const rounds = Array.from({ length: n }, (_, k) => outs.find((o, p) => parts[p].includes(k)).rounds[k]);
  const { cells: _c, ...gen } = outs[0].gen;
  const data = { v: 6, gen, sizes: outs[0].sizes, rounds, hash: dataHash(chars) };
  writeFileSync(process.env.BOTGEN_RAW || '/tmp/botgen-raw.json', JSON.stringify(data)); // set 107: keep the raw result even when the check fails
  const v = validateBotTeams(data, makeCharMap(chars), RULES, data.hash);
  if (!v.ok) { console.log('❌ ทีมบอทไม่ผ่านตัวตรวจ:', v.errors.slice(0, 5).join(' | ')); process.exit(1); }
  writeFileSync('core/botdata.js', `// สร้างอัตโนมัติด้วย lab/botgen.mjs (ชุด 23) · ห้ามแก้มือ · ${runs} run จำลอง เมล็ด ${gen.seed}\nexport const BOT_TEAMS = ${JSON.stringify(data)};\n`);
  console.log(`✅ ทีมบอท ${n * BOT_TIERS.length * BOT_PER} ทีม · ${runs} run จำลอง · ${Math.round((Date.now() - t0) / 1000)} วิ · แฮช ${data.hash}`);
  const cm = makeCharMap(chars);
  data.rounds.forEach((l, k) => {
    const borrowed = l[0].from !== k ? ` (ไม่มีตัวอย่าง ใช้รอบ ${l[0].from + 1} · ${data.sizes[k]})` : ` (ตัวอย่าง ${data.sizes[k]})`;
    console.log(`รอบ ${k + 1}${borrowed}: units ${Math.min(...l.map(t => t.team.length))}–${Math.max(...l.map(t => t.team.length))} · ` + l.map(t => `${t.tier} ${teamTribe(t.team, cm)} ${t.power}%`).join(' · '));
  });
}
