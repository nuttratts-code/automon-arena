// ชุด 81: node lab/bossidfit.mjs <A> <boss ids> <s list> [n] · run on a tree with the user's chars applied (tools/apply-config.mjs)
// boss identity fit: base HP 1000 / atk A × tribe mult (T-3.1) × s · phase atk keeps today's ratio to base
import { RULES } from '../core/rules.js';
import { buildCharacterList } from '../core/characters.js';
import { stageDefaults } from '../core/stage.js';
import { bossRanking } from './analyze.js';
const TM = { 'เหล็กกล้า': [1.4, 0.6], 'เพลิงเผา': [0.9, 0.8], 'สายฟ้า': [0.9, 0.8], 'วายุ': [0.8, 0.5], 'ภูติ': [0.9, 0.7], 'อสูร': [1.0, 1.4] };
const A = +process.argv[2], ids = process.argv[3].split(','), SS = process.argv[4].split(',').map(Number), n = +process.argv[5] || 500;
const chars = buildCharacterList(), st = stageDefaults();
for (const id of ids) for (const s of SS) {
  const b = st.bosses.find(x => x.id === id), [hm, am] = TM[b.tribe];
  const hp = Math.round(1000 * hm * s / 50) * 50, atk = Math.round(A * am * s), r = atk / (b.id === 'B5' ? 55 : b.atk);
  const nb = { ...b, hp, atk, phases: b.phases.map(p => ({ ...p, stats: typeof p.stats?.atk === 'number' ? { ...p.stats, atk: Math.round(p.stats.atk * r) } : p.stats })) };
  const br = (await bossRanking(chars, RULES, { ...st, bosses: st.bosses.map(x => x.id === id ? nb : x) }, { bossIds: [id], k: 1, level: 2, n })).bossRows[0];
  const tr = Object.entries(br.tribeWin).filter(([, v]) => v.teams >= n * 0.13).sort((a, c) => a[1].win - c[1].win);
  console.log(`${id} ${b.tribe} s${s} hp ${hp} atk ${atk} p ${nb.phases.map(p => p.stats?.atk ?? '-').join('/')} · ${br.win.toFixed(0)}% · ${tr[0][0]} ${tr[0][1].win.toFixed(0)} · ${tr.at(-1)[0]} ${tr.at(-1)[1].win.toFixed(0)}`);
}
