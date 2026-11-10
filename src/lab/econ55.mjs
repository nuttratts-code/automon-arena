// Set 136 (step 5.5 measure, user 8 Nov "ลองวัดมาก่อน"): permanent stats + Lv1 legends over real-flow runs · measure only, changes nothing
// node lab/econ55.mjs [runs=600]  · run flow = lab/analyze.js runPlayStats (set 178), same as lab/runerun.mjs (player bot with runes, real bot teams, bosses, extra to lastStage)
// Prints per round bucket: (1) team-total permanent values per key (share of matches that have it · p50/p90/max of those)
// (2) per perm-source character on the board: matches, round-adjusted win delta, perm it carries itself
// (3) Lv1 legends: round-adjusted win delta of teams holding a Lv1 legend (and no higher legend) vs all teams
// Round-adjusted delta = mean(win − baseline win % of that round over all matches).
import { buildCharacterList } from '../core/characters.js';
import { RULES } from '../core/rules.js';
import { BOT_TEAMS } from '../core/botdata.js';
import { validateBotTeams } from '../core/botteams.js';
import { runPlayStats } from './analyze.js';
import { dataHash } from '../core/save.js';
import { RUN_STAGE } from '../core/runboss.js';
import { makeCharMap } from '../core/team.js';

const A = process.argv.slice(2), runs = +A.find(a => !a.startsWith('--')) || 600;
const chars = buildCharacterList(), cm = makeCharMap(chars);
const bt = validateBotTeams(BOT_TEAMS, cm, RULES, dataHash(chars, RULES));
if (!bt.ok) { console.log('bot teams not usable: run node lab/botgen.mjs first'); process.exit(1); }
// --set=ID:v1,v2,v3 (repeatable) = scratch override of that character's 1st permanent skill values for this measure only
for (const a of A.filter(a => a.startsWith('--set='))) { const [id, vs] = a.slice(6).split(':'), c = chars.find(x => x.id === id), s = c && (c.skills || []).find(s => s.perm || /^perm/.test(s.do));
  if (!s) { console.log('no perm skill', id); process.exit(1); } s.v = vs.split(',').map(Number); console.log(`override ${id} v ${s.v.join('/')}`); }
const isSrc = s => s.perm || /^perm/.test(s.do);
const SRC = chars.filter(c => (c.skills || []).some(isSrc)).map(c => c.id);
const LEG = chars.filter(c => c.rarity === 'ตำนาน').map(c => c.id);
const BK = r => r <= 5 ? '1-5' : r <= 10 ? '6-10' : r <= 15 ? '11-15' : '16-20';
const BKS = ['1-5', '6-10', '11-15', '16-20'];
const M = []; const t0 = Date.now();
// set 178: matches come from lab/analyze.js runPlayStats (same flow as runerun / Balance Room "รันจริง") — seed 8800, focus tribe per run, runes, extra to lastStage
await runPlayStats(chars, RULES, RUN_STAGE, { n: runs, runeWhatIf: false, onMatch: m => {
  if (m.boss === 'DUMMY' || !m.team?.length) return;
  M.push({ round: m.round, win: m.winner !== 1 ? 1 : 0, boss: !!m.boss, team: m.team.map(e => ({ id: e.id, level: e.level || 1, perm: e.perm || {} })) });
} });
const base = {}; for (const m of M) { const b = (base[m.round] ||= [0, 0]); b[0]++; b[1] += m.win; }
const adj = m => m.win - base[m.round][1] / base[m.round][0];
const q = (a, p) => a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : 0;
const f1 = v => (Math.round(v * 10) / 10).toString();
const pp = v => (v >= 0 ? '+' : '') + (v * 100).toFixed(1);
console.log(`runs ${runs} · matches ${M.length} · ${((Date.now() - t0) / 1000).toFixed(0)} s · perm-source chars: ${SRC.join(' ')} · legends: ${LEG.join(' ')}`);

console.log('\n(1) team-total permanent values (matches with key > 0 · p50 / p90 / max) · for scale: base unit HP Lv1 70–130, atk 3–10');
const keys = new Set(); for (const m of M) for (const e of m.team) for (const k in e.perm) keys.add(k);
for (const k of keys) {
  const row = BKS.map(b => { const a = M.filter(m => BK(m.round) === b).map(m => m.team.reduce((s, e) => s + (e.perm[k] || 0), 0)); const nz = a.filter(v => v > 0).sort((x, y) => x - y);
    return `${b}: ${a.length ? (nz.length / a.length * 100).toFixed(0) : 0}% · ${f1(q(nz, 0.5))}/${f1(q(nz, 0.9))}/${f1(nz[nz.length - 1] || 0)}`; });
  // win delta of top-10% holders vs rest (round adjusted)
  const all = M.map(m => ({ m, v: m.team.reduce((s, e) => s + (e.perm[k] || 0), 0) })).filter(x => x.v > 0).sort((a, b) => a.v - b.v);
  const top = all.slice(Math.floor(all.length * 0.9)); const d = top.length ? top.reduce((s, x) => s + adj(x.m), 0) / top.length : 0;
  console.log(`${k.padEnd(10)} ${row.join(' | ')} · top10% holders win ${pp(d)} pts`);
}

console.log('\n(2) perm-source characters on the board (matches · round-adjusted win pts · own perm p50/max at that bucket)');
for (const id of SRC) {
  const row = BKS.map(b => { const ms = M.filter(m => BK(m.round) === b && m.team.some(e => e.id === id)); if (!ms.length) return `${b}: -`;
    const d = ms.reduce((s, m) => s + adj(m), 0) / ms.length;
    const own = ms.map(m => { const e = m.team.find(e => e.id === id); return Object.values(e.perm).reduce((s, v) => s + v, 0); }).sort((x, y) => x - y);
    return `${b}: ${ms.length} · ${pp(d)} · own ${f1(q(own, 0.5))}/${f1(own[own.length - 1] || 0)}`; });
  console.log(`${id.padEnd(5)} ${row.join(' | ')}`);
}

console.log('\n(3) Lv1 legends (team holds a Lv1 legend and no Lv2+ legend) vs team with a Lv3 common · round-adjusted win pts');
for (const b of BKS) {
  const ms = M.filter(m => BK(m.round) === b), L1 = ms.filter(m => m.team.some(e => LEG.includes(e.id) && e.level === 1) && !m.team.some(e => LEG.includes(e.id) && e.level > 1));
  const C3 = ms.filter(m => m.team.some(e => cm[e.id]?.rarity === 'ธรรมดา' && e.level >= 3));
  const av = a => a.length ? pp(a.reduce((s, m) => s + adj(m), 0) / a.length) : '-';
  console.log(`${b}: matches ${ms.length} · Lv1 legend ${L1.length} (${(L1.length / Math.max(1, ms.length) * 100).toFixed(0)}%) win ${av(L1)} · Lv3 common ${C3.length} win ${av(C3)}`);
}
const byLeg = LEG.map(id => { const ms = M.filter(m => m.team.some(e => e.id === id && e.level === 1)); return `${id} ${ms.length} ${ms.length ? pp(ms.reduce((s, m) => s + adj(m), 0) / ms.length) : '-'}`; });
console.log('per legend at Lv1 (matches · win pts): ' + byLeg.join(' · '));
