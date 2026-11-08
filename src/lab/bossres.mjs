// set 149 (boss A1): measure-only — current run bosses, k1/k2 win % of all / favoured / resisted tribe, + per-rule cause check for
//   the resisted tribe (drop one rule at a time, all phases; also drop phase fx) · node lab/bossres.mjs [runs] [target1] · writes nothing
import { simulate } from '../core/battle.js';
import { buildCharacterList } from '../core/characters.js';
import { RULES } from '../core/rules.js';
import { BOT_TEAMS } from '../core/botdata.js';
import { validateBotTeams } from '../core/botteams.js';
import { dataHash } from '../core/save.js';
import { RUN_STAGE, runBossTeam } from '../core/runboss.js';
import { makeCharMap } from '../core/team.js';
import { runPlayStats } from './analyze.js';
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const runs = +args[0] || 600, T1 = +(args[1] || 60), T = [0, T1, 50, 45];
const chars = buildCharacterList(), cm = makeCharMap(chars);
const bt = validateBotTeams(BOT_TEAMS, cm, RULES, dataHash(chars, RULES));
if (!bt.ok) { console.log('bot teams not usable: run node lab/botgen.mjs first'); process.exit(1); }
const S = await runPlayStats(chars, RULES, RUN_STAGE, { n: runs, keepTeams: true }), teams = S.teams;
console.log(`runs ${runs} · teams k1 ${teams[1].length} · k2 ${teams[2].length} · k3 ${teams[3].length}`);
const winPct = (b, k, list) => { if (!list.length) return NaN; let w = 0; for (const t of list) { const r = simulate(t.units, runBossTeam(b, k, RUN_STAGE, t.ex), { ...t.opts, rules: RULES, log: false }); w += r.winner !== 1 ? 1 : 0; } return w / list.length * 100; };
const ruleOf = (b, id) => b.phases.flatMap(p => p.rules || []).find(r => r.id === id);
const drop = (b, id) => ({ ...b, phases: b.phases.map(p => ({ ...p, rules: (p.rules || []).filter(r => r.id !== id) })) });
const noFx = b => ({ ...b, phases: b.phases.map(p => ({ ...p, fx: [] })) });
const f0 = x => Number.isNaN(x) ? '-' : x.toFixed(0);
const ids = new Set(process.argv.filter(a => a.startsWith('--boss=')).flatMap(a => a.slice(7).split(',')));
for (const b of RUN_STAGE.bosses.filter(x => x.on && (!ids.size || ids.has(x.id)))) {
  const weak = ruleOf(b, 'tribeWeak')?.tribe, res = ruleOf(b, 'tribeResist')?.tribe;
  for (const k of [1, 2]) {
    const L = teams[k], W = L.filter(t => t.tr === weak), R = L.filter(t => t.tr === res);
    console.log(`${b.id} ${b.name} k${k}: all ${f0(winPct(b, k, L))}% (n${L.length}, target ${T[k]}) · favoured ${weak} ${f0(winPct(b, k, W))}% (n${W.length}) · resisted ${res} ${f0(winPct(b, k, R))}% (n${R.length}, want ≈ ${T[k] - 20})`);
    if (k !== 1 || !R.length) continue;
    const base = winPct(b, k, R), rows = [];
    for (const id of [...new Set(b.phases.flatMap(p => (p.rules || []).map(r => r.id)))].filter(id => id !== 'tribeWeak')) rows.push([id, winPct(drop(b, id), k, R)]);
    if (b.phases.some(p => p.fx?.length)) rows.push(['phase fx', winPct(noFx(b), k, R)]);
    rows.sort((a, c) => c[1] - a[1]);
    console.log(`   cause k1 resisted (rule off → win %, +gain): ` + rows.map(([id, v]) => `${id} ${f0(v)} (${v - base >= 0 ? '+' : ''}${f0(v - base)})`).join(' · '));
  }
}
