// ชุด 83: วัดเศรษฐกิจของ run (ผู้เล่น = บอท core/bot.js · คู่แข่ง = ทีมบอทใน core/botdata.js)
// รัน: node lab/econ.mjs [run=1000] [เมล็ด=4242] [เงินเริ่ม/ต่อรอบ เช่น 25,25]
// พิมพ์ตามขั้นชนะ: เงินเหลือหลังซื้อ · ขนาดทีม · เลเวลเฉลี่ย · % ตัว Lv2/Lv3 · % ทีม Lv2 ครบ · ผู้เล่นชนะ % · BYROUND=1 = จัดกลุ่มตามรอบแทนขั้นชนะ
import { RULES } from '../core/rules.js';
import { buildCharacterList } from '../core/characters.js';
import { BOT_TEAMS } from '../core/botdata.js';
import { pickBotTeam, simRun } from '../core/botteams.js';

const chars = buildCharacterList(), N = +(process.argv[2] || 1000), SEED = +(process.argv[3] || 4242);
const [sg, gp] = (process.argv[4] || '').split(',').map(Number);
const rules = sg ? { ...RULES, shop: { ...RULES.shop, startGold: sg, goldPerRound: gp || sg } } : RULES;
const by = {}, end = { won: 0, rounds: 0 };
for (let r = 0; r < N; r++) {
  const P = simRun(chars, rules, (SEED + Math.imul(r + 1, 0x9E3779B1)) >>> 0, p => pickBotTeam(BOT_TEAMS, p.round, p.seed).team, m => {
    const x = (by[process.env.BYROUND ? m.round : m.stage] ||= { n: 0, gold: 0, size: 0, lv: 0, u: 0, l2: 0, l3: 0, full2: 0, win: 0 });
    const lvs = m.team.map(e => e.level || 1);
    x.n++; x.gold += m.gold; x.size += lvs.length; x.u += lvs.length; x.lv += lvs.reduce((a, b) => a + b, 0);
    x.l2 += lvs.filter(v => v >= 2).length; x.l3 += lvs.filter(v => v >= 3).length;
    if (lvs.length >= 6 && lvs.every(v => v >= 2)) x.full2++; if (m.winner === 1) x.win++;
  });
  if (P.wins >= rules.shop.winsToFinish) end.won++; end.rounds += P.round;
}
const p = (a, b) => (100 * a / b).toFixed(0).padStart(3) + '%';
console.log(`run ${N} · เงิน ${rules.shop.startGold}/${rules.shop.goldPerRound}/+${rules.shop.winBonus} · ชนะครบ ${p(end.won, N)} · เล่นเฉลี่ย ${(end.rounds / N).toFixed(1)} รอบ`);
console.log('ขั้น | แมตช์ | เงินเหลือ | ทีม | Lv เฉลี่ย | Lv2+ | Lv3 | ทีม Lv2 ครบ | ผู้เล่นชนะ');
for (const k of Object.keys(by).map(Number).sort((a, b) => a - b)) { const x = by[k];
  console.log(`${String(k).padStart(4)} | ${String(x.n).padStart(5)} | ${(x.gold / x.n).toFixed(1).padStart(8)} | ${(x.size / x.n).toFixed(1)} | ${(x.lv / x.u).toFixed(2).padStart(8)} | ${p(x.l2, x.u)} | ${p(x.l3, x.u)} | ${p(x.full2, x.n).padStart(10)} | ${p(x.win, x.n)}`); }
