// วัดความยาวแมตช์ตามรอบของ run (ชุด 23) · รัน: node lab/runlen.mjs [run=2000] [เมล็ด=4242]
// ผู้เล่น = บอท (core/bot.js) · คู่แข่ง = ทีมบอทเตรียมไว้ (core/botdata.js) · ใช้ simRun ตัวเดียวกับตัวสร้างทีม
import { RULES } from '../core/rules.js';
import { buildCharacterList } from '../core/characters.js';
import { BOT_TEAMS } from '../core/botdata.js';
import { pickBotTeam, simRun } from '../core/botteams.js';

const chars = buildCharacterList(), N = +(process.argv[2] || 2000), SEED = +(process.argv[3] || 4242), t0 = Date.now();
const byRound = {}, byStage = {}, end = { won: 0, rounds: 0 }; let abn = 0, matches = 0;
const add = (o, k, m) => { const x = (o[k] ||= { n: 0, ms: 0, w: 0, max: 0, storm: 0 }); x.n++; x.ms += m.timeMs; x.max = Math.max(x.max, m.timeMs); if (m.timeMs > 180000) x.storm++; if (m.winner !== 1) x.w++; };
for (let r = 0; r < N; r++) {
  const P = simRun(chars, RULES, (SEED + Math.imul(r + 1, 0x9E3779B1)) >>> 0, p => pickBotTeam(BOT_TEAMS, p.wins, p.seed, p.round).team,
    m => { matches++; if (m.aborted) abn++; add(byRound, m.round, m); add(byStage, m.stage, m); });
  if (P.wins >= RULES.shop.winsToFinish) end.won++; end.rounds += P.round;
}
const f = (x) => `${(x.ms / x.n / 1000).toFixed(1)} วิ (สูงสุด ${(x.max / 1000).toFixed(0)} · ถึงพายุทราย ${(100 * x.storm / x.n).toFixed(0)}%) · ผู้เล่นชนะ ${(100 * x.w / x.n).toFixed(1)}% · ${x.n} แมตช์`;
console.log(`run ${N} · เมล็ด ${SEED} · ${matches} แมตช์ · ${Math.round((Date.now() - t0) / 1000)} วิ · แมตช์ผิดปกติ ${abn}`);
console.log(`จบ run: ชนะครบ 10 ${(100 * end.won / N).toFixed(1)}% · เล่นเฉลี่ย ${(end.rounds / N).toFixed(1)} รอบ`);
console.log('ตามรอบ:'); for (const k of Object.keys(byRound).map(Number).sort((a, b) => a - b)) console.log(`  รอบ ${k}: ${f(byRound[k])}`);
console.log('ตามขั้นชนะ:'); for (const k of Object.keys(byStage).map(Number).sort((a, b) => a - b)) console.log(`  ขั้น ${k}: ${f(byStage[k])}`);
