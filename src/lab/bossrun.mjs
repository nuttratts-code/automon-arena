// Boss report tools (set 88 → set 170) · node lab/bossrun.mjs [runs] [target1] [target2] [target3] (--fit | --tribes) [--ref] [--md file]
// set 141 (user A1): teams come from the SAME flow as runerun / Balance Room "รันจริง" (lab/analyze.js runPlayStats: pickFoe +
//   win streak, runes on both sides, extra matches) · every boss fight at k = 1 / 2 / 3 is kept (any boss drawn)
// set 168 (C-17.6 H1): --ref = fixed reference teams (lab/bossref.json, node lab/bossref.mjs) instead of fresh runs ·
//   --tribes = per boss × team tribe win % + a neutral-boss baseline (no rules, no Heat, median stats) + cause check (each rule off)
//   --fit [--md file] = calibrator (report only, never writes; widened set 168 cont. 3): one power factor per boss (hp + atk + phase atk)
//   so k1 all ≈ target1 on the reference teams + weak/resist % per boss, then the shared g + a so k2 / k3 averages ≈ target2 / target3
// set 170 (user A1): the old per-boss tuning (scale + mult10 + endlessPct, --write into stage-user.js) is removed — every boss uses the
//   shared g/a curve now · the user picks fitted values cell by cell (HARD RULE 6), tools/apply-stage.mjs writes them
import { writeFileSync } from 'node:fs';
import { simulate } from '../core/battle.js';
import { buildCharacterList } from '../core/characters.js';
import { RULES } from '../core/rules.js';
import { BOT_TEAMS } from '../core/botdata.js';
import { validateBotTeams } from '../core/botteams.js';
import { dataHash } from '../core/save.js';
import { RUN_STAGE, runBossTeam, bossExtraOf } from '../core/runboss.js';
import { bossUnit } from '../core/boss.js';
import { phaseStatsAt } from '../core/stage.js';
import * as fs from 'node:fs';
import { loadRef } from './bossref.mjs';
import { makeCharMap } from '../core/team.js';
import { runPlayStats } from './analyze.js';
const args = process.argv.slice(2).filter((a, i, l) => !a.startsWith('--') && l[i - 1] !== '--md');
const runs = +args[0] || 600, T1 = +(args[1] || 60), T2 = +(args[2] || 50), T3 = +(args[3] || 45);
const chars = buildCharacterList(), cm = makeCharMap(chars);
const bt = validateBotTeams(BOT_TEAMS, cm, RULES, dataHash(chars, RULES));
if (!bt.ok) { console.log('bot teams not usable: run node lab/botgen.mjs first ·', bt.errors?.[0] || ''); process.exit(1); }
const t0 = Date.now(), FIT = process.argv.includes('--fit'), REF = FIT || process.argv.includes('--ref');
let teams, XTRA = {};
if (REF) {
  const o = loadRef(fs);
  if (!o) { console.log('lab/bossref.json missing: run node lab/bossref.mjs first'); process.exit(1); }
  if (o.hash !== dataHash(chars, RULES)) { console.log(`lab/bossref.json was made for other game data (${o.at}): run node lab/bossref.mjs again`); process.exit(1); }
  teams = o.teams; XTRA = o.xtra; console.log(`reference teams ${o.at} (runs ${o.runs}) · tribe top-up ${[1, 2, 3].map(k => XTRA[k].length).join('/')}`);
} else teams = (await runPlayStats(chars, RULES, RUN_STAGE, { n: runs, keepTeams: true })).teams;
const med = a => { const x = a.slice().sort((p, q) => p - q), m = x.length >> 1; return x.length % 2 ? x[m] : (x[m - 1] + x[m]) / 2; };
// neutral boss (C-17.6 tribe baseline): no rules, no Heat, median stats (hp, atk, cd, multi, phase atk) of the enabled bosses · 3 phases at 0/2/4
function neutralBoss() {
  const L = RUN_STAGE.bosses.filter(x => x.on);
  const pa = i => Math.round(med(L.map(b => phaseStatsAt(b, Math.min(i, b.phases.length - 1)).atk)));
  return { id: 'B0', name: 'บอสกลาง', tribe: 'เหล็กกล้า', resistPct: 0, hp: Math.round(med(L.map(b => b.hp))), atk: pa(0), cdMs: Math.round(med(L.map(b => b.cdMs))),
    multi: Math.round(med(L.map(b => b.multi))), bars: 5, spot: 'all', moveSec: 8, armor: 0, burn: 0, shock: 0, armorHit: 0, healHit: 0, on: true,
    phases: [0, 2, 4].map((at, i) => ({ at, rules: [], fx: [], spot: '', stats: i ? { atk: pa(i) } : {} })) };
}
const NO_HEAT = { ...RUN_STAGE.boss2, heat: [] };
const bossTeamOf = (b, k, t, stage = RUN_STAGE) => (b.id === 'B0' ? [bossUnit(b, k, bossExtraOf(t.ex, stage), NO_HEAT)] : runBossTeam(b, k, stage, t.ex));
console.log(`teams k1 ${teams[1].length} · k2 ${teams[2].length} · k3 ${teams[3].length} · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
// set 167 (user A1): --tribes = report only, nothing is tuned or written · per boss: player win % per team tribe (tribe4, else ผสม) × k
//   + cause check (each rule off in every phase → k1/k2 win % all / weak tribe / resisted tribe) · --md <file> also writes the tables
if (process.argv.includes('--tribes')) {
  const TR = ['เพลิงเผา', 'สายฟ้า', 'วายุ', 'ภูติ', 'เหล็กกล้า', 'อสูร', 'ผสม'], ALL = ['all', ...TR];
  // set 168 cont. 3: reference xtra teams (tribe top-up) count only in their tribe column, never in 'all'
  const fight = (b, k) => { const c = { all: [0, 0] }; for (const t of [...teams[k], ...(XTRA[k] || [])]) { const w = simulate(t.units, bossTeamOf(b, k, t), { ...t.opts, rules: RULES, log: false }).winner !== 1 ? 1 : 0;
    for (const key of t.xtra ? [t.tr] : ['all', t.tr || 'ผสม']) { c[key] ??= [0, 0]; c[key][0]++; c[key][1] += w; } } return c; };
  const p = a => (a && a[0] ? (100 * a[1] / a[0]).toFixed(0) : '-');
  let md = `teams k1 ${teams[1].length} · k2 ${teams[2].length} · k3 ${teams[3].length} · ${REF ? `reference teams (lab/bossref.json · + tribe top-up ${[1, 2, 3].map(k => XTRA[k].length).join('/')} in tribe columns only)` : `runs ${runs}`} · cell = player win % (teams)\n`;
  // set 168: neutral boss first (tribe baseline) · boss cells then show the gap to it: "45 (−12)"
  const nb0 = neutralBoss(), base = {};
  md += `\n### บอสกลาง (baseline: no rules · median stats hp ${nb0.hp} atk ${nb0.phases.map((q, i) => i ? q.stats.atk : nb0.atk).join('/')} cd ${nb0.cdMs})\n| k | ${ALL.join(' | ')} |\n|${'---|'.repeat(ALL.length + 1)}\n`;
  for (const k of [1, 2, 3]) { const c = base[k] = fight(nb0, k); md += `| ${k} | ${ALL.map(t => `${p(c[t])} (${c[t]?.[0] || 0})`).join(' | ')} |\n`; }
  const gap = (c, k, t) => { const a = c[t], z = base[k][t]; if (!a || !a[0] || !z || !z[0]) return p(a); const d = Math.round(100 * a[1] / a[0] - 100 * z[1] / z[0]); return `${p(a)} (${d >= 0 ? '+' : '−'}${Math.abs(d)})`; };
  for (const b of RUN_STAGE.bosses.filter(x => x.on)) {
    const weak = b.weak, res = b.tribe;
    md += `\n### ${b.id} ${b.name} · weak ${weak || '-'} · resist ${res || '-'} · cell = win % (vs baseline)\n| k | ${ALL.join(' | ')} |\n|${'---|'.repeat(ALL.length + 1)}\n`;
    for (const k of [1, 2, 3]) { const c = fight(b, k); md += `| ${k} | ${ALL.map(t => gap(c, k, t)).join(' | ')} |\n`; }
    md += '\ncause (rule off → k1 all/weak/resist · k2 all/weak/resist):\n';
    const ids = [...new Set(['tribeWeak', 'tribeResist', ...b.phases.flatMap(ph => (ph.rules || []).map(r => r.id))])];
    for (const id of ids) {
      const nb = id === 'tribeWeak' ? { ...b, weakPct: 0 } : id === 'tribeResist' ? { ...b, resistPct: 0 } : { ...b, phases: b.phases.map(ph => ({ ...ph, rules: (ph.rules || []).filter(r => r.id !== id) })) }, c1 = fight(nb, 1), c2 = fight(nb, 2);
      md += `- ${id}: k1 ${[c1.all, c1[weak], c1[res]].map(p).join('/')} · k2 ${[c2.all, c2[weak], c2[res]].map(p).join('/')}\n`;
    }
  }
  console.log(md);
  const mi = process.argv.indexOf('--md'); if (mi > 0 && process.argv[mi + 1]) writeFileSync(process.argv[mi + 1], md);
  process.exit(0);
}
const scale = (b, s) => ({ ...b, hp: Math.max(10, Math.round(b.hp * s / 10) * 10), atk: Math.max(1, Math.round(b.atk * s)),
  phases: b.phases.map(p => ({ ...p, stats: typeof p.stats?.atk === 'number' ? { ...p.stats, atk: Math.max(1, Math.round(p.stats.atk * s)) } : p.stats })) });
// win % falls as the boss grows → search the value giving `target`
function search(lo, hi, f, target, steps = 9) { for (let i = 0; i < steps; i++) { const mid = (lo + hi) / 2; if (f(mid) > target) lo = mid; else hi = mid; } return (lo + hi) / 2; }
// set 168 --fit (C-17.6 B2 H1 · widened set 168 cont. 3, user A1): calibrator for every boss, report only (never writes)
// ① per boss, 2 passes + a final power pass: power (hp + atk + phase atk) → k1 all ≈ T1 · weakPct (≤ weakCap) → weak tribe k1 ≈ T1 + 10
//    · resistPct → resisted tribe (= boss tribe) k1 ≈ T1 − 20 (tribe rows use the reference top-up teams too)
// ② shared curve: for each a, g so the k2 average ≈ T2; a searched so the k3 average ≈ T3 (Heat as set, not tuned)
if (FIT) {
  const L = RUN_STAGE.bosses.filter(x => x.on);
  if (!L.length) { console.log('no boss to fit'); process.exit(0); }
  const g2 = RUN_STAGE.boss2, TW = T1 + 10, TR = T1 - 20;
  const winS = (b, k, list, stage = RUN_STAGE) => { if (!list.length) return NaN; let w = 0; for (const t of list) w += simulate(t.units, bossTeamOf(b, k, t, stage), { ...t.opts, rules: RULES, log: false }).winner !== 1 ? 1 : 0; return 100 * w / list.length; };
  const avg = (bs, k, stage) => bs.reduce((s, b) => s + winS(b, k, teams[k], stage), 0) / bs.length;
  const tribeTeams = (k, tr) => (tr ? [...teams[k], ...(XTRA[k] || [])].filter(t => t.tr === tr) : []);
  const wOf = b => Math.min(b.weakPct ?? g2.weakPct, g2.weakCap), rOf = b => b.resistPct ?? g2.resistPct;
  const stOf = (g, a) => ({ ...RUN_STAGE, boss2: { ...g2, g, a } });
  const rows = [];
  for (const b of L) {
    const wt = b.weak && b.weak !== b.tribe ? tribeTeams(1, b.weak) : [], rt = tribeTeams(1, b.tribe);
    let P = 1, w = wOf(b), r = rOf(b);
    const mk = (p, ww, rr) => scale({ ...b, weakPct: ww, resistPct: rr }, p);
    for (let pass = 0; pass < 2; pass++) {
      P = search(0.2, 4, x => winS(mk(x, w, r), 1, teams[1]), T1);
      if (wt.length) w = Math.round(search(0, g2.weakCap, x => -winS(mk(P, x, r), 1, wt), -TW) / 5) * 5;
      if (rt.length) r = Math.round(search(0, 100, x => winS(mk(P, w, x), 1, rt), TR));
    }
    P = search(0.2, 4, x => winS(mk(x, w, r), 1, teams[1]), T1);
    const fb = mk(P, w, r);
    rows.push({ b, P, fb, w0: wOf(b), r0: rOf(b), wt, rt,
      k1: [winS(b, 1, teams[1]), winS(fb, 1, teams[1])], kw: [winS(b, 1, wt), winS(fb, 1, wt)], kr: [winS(b, 1, rt), winS(fb, 1, rt)],
      k2: [winS(b, 2, teams[2])], k3: [winS(b, 3, teams[3])] });
    console.log(`${b.id} power ×${P.toFixed(2)} · weak ${wOf(b)}→${w} · resist ${rOf(b)}→${r} · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  const fitted = rows.map(x => x.fb), gFor = a => Math.round(search(1, 6, x => avg(fitted, 2, stOf(x, a)), T2) * 100) / 100;
  // with g refit for k2, k3 gets EASIER as a grows (k3/k2 ≈ g(1+2a)/(1+a) falls) → direction checked, not assumed
  const k3At = x => avg(fitted, 3, stOf(gFor(x), x)), up = k3At(4) > k3At(0);
  const a = Math.round(search(0, 4, x => (up ? -1 : 1) * k3At(x), (up ? -1 : 1) * T3, 7) * 100) / 100, g = gFor(a), st = stOf(g, a);
  console.log(`a search: k3 ${up ? 'rises' : 'falls'} with a · a ${a} · g ${g} · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  for (const x of rows) { x.k2.push(winS(x.fb, 2, teams[2], st)); x.k3.push(winS(x.fb, 3, teams[3], st)); }
  const f = v => (Number.isNaN(v) ? '-' : v.toFixed(0)), ar = l => l.map(f).join('→');
  let md = `calibrator (report only) · reference teams k1 ${teams[1].length} · k2 ${teams[2].length} · k3 ${teams[3].length} (+ tribe top-up ${[1, 2, 3].map(k => (XTRA[k] || []).length).join('/')} for weak/resist rows)\n`
    + `targets: k1 all ${T1} · weak tribe k1 ${TW} · resisted tribe k1 ${TR} · k2 average ${T2} · k3 average ${T3}\n`
    + `shared curve: g ${g2.g} → ${g} (HP × g^(k−1)) · a ${g2.a} → ${a} (atk × (1 + a(k−1))) · Heat as set\n\n`
    + `| boss | power | hp | atk | phase atk | weak % (tribe · teams) | resist % (tribe · teams) | k1 all | k1 weak | k1 resist | k2 % | k3 % |\n|---|---|---|---|---|---|---|---|---|---|---|---|\n`;
  for (const x of rows) md += `| ${x.b.id} ${x.b.name} | ×${x.P.toFixed(2)} | ${x.b.hp}→${x.fb.hp} | ${x.b.atk}→${x.fb.atk} | ${x.b.phases.map(q => q.stats?.atk ?? '-').join('/')}→${x.fb.phases.map(q => q.stats?.atk ?? '-').join('/')} | ${x.w0}→${x.fb.weakPct} (${x.b.weak || '-'} · ${x.wt.length}) | ${x.r0}→${x.fb.resistPct} (${x.b.tribe} · ${x.rt.length}) | ${ar(x.k1)} | ${ar(x.kw)} | ${ar(x.kr)} | ${ar(x.k2)} | ${ar(x.k3)} |\n`;
  const m = (key, i) => f(rows.reduce((s, x) => s + x[key][i], 0) / rows.length);
  md += `| average | | | | | | | ${m('k1', 0)}→${m('k1', 1)} | ${m('kw', 0)}→${m('kw', 1)} | ${m('kr', 0)}→${m('kr', 1)} | ${m('k2', 0)}→${m('k2', 1)} | ${m('k3', 0)}→${m('k3', 1)} |\n`;
  console.log(md);
  const mi = process.argv.indexOf('--md'); if (mi > 0 && process.argv[mi + 1]) writeFileSync(process.argv[mi + 1], md);
  process.exit(0);
}
console.log('usage: node lab/bossrun.mjs [runs] [t1] [t2] [t3] --fit | --tribes [--ref] [--md file] (set 170: the old per-boss tuning is gone)');
process.exit(1);
