// Set 88: re-tune run bosses against real-run teams · node lab/bossrun.mjs [runs] [target1] [target2] [target3] [--write] · [--tribes [--md file]] = report only (set 167)
// set 91: 3rd boss (round 15, bossesPerRun 3) → target3 tunes each boss's endlessPct (k3 = mult10 × (1 + endlessPct/100)) · skipped when bossesPerRun < 3
// set 141 (user A1): teams come from the SAME flow as runerun / Balance Room "รันจริง" (lab/analyze.js runPlayStats: pickFoe +
//   win streak, runes on both sides, extra matches) — before set 141 it used the old no-rune simRun + pickBotTeam flow, so real
//   teams were stronger than the tuning teams (k2 landed easier than k1) · every boss fight at k = 1 / 2 / 3 is kept (any boss drawn)
// per boss: binary search a scale s on k1 hp / atk / phase atk → target1 %, then mult10 → target2 %, then endlessPct → target3 %
// set 141 (user C): also prints per boss × k the win % of the favoured tribe (boss tribeWeak, wants > target + 10) and the resisted
//   tribe (boss tribeResist, wants ≈ target − 20) · team tribe = ≥ 4 units of it (lab/analyze.js tribe4) · plus a cause check for
//   the resisted tribe: win % with tribeResist off, and with burn/shock immunity off (HARD RULE 5: cause before tuning)
// set 168 (C-17.6 H1, plan step 7): --ref = fixed reference teams (lab/bossref.json, node lab/bossref.mjs) instead of fresh runs ·
//   --tribes adds a neutral-boss baseline (no rules, no Heat, stats = median of the enabled bosses) and shows each boss cell vs it ·
//   --fit [--md file] = calibrator for v2 bosses (report only, never writes): one power factor per boss (hp + atk + phase atk) so
//   k1 all ≈ target1 on the reference teams, then the shared HP growth g (C2) so the k2 average ≈ target2, then k3 is reported
//   · the old tuning (no flag) refuses v2 bosses (mult10/endlessPct are not used by them)
// prints old → new values · --write rewrites core/stage-user.js bosses (hp, atk, phase atk, mult10, endlessPct + set 142 counter rules)
import { readFileSync, writeFileSync } from 'node:fs';
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
const args = process.argv.slice(2).filter((a, i, l) => !a.startsWith('--') && l[i - 1] !== '--md'), WRITE = process.argv.includes('--write');
const runs = +args[0] || 600, T1 = +(args[1] || 60), T2 = +(args[2] || 50), T3 = +(args[3] || 45), K3 = true; // set 141: bossesPerRun no longer exists (set 108 fixed boss rounds) → the old check skipped k3 since then
const chars = buildCharacterList(), cm = makeCharMap(chars);
const bt = validateBotTeams(BOT_TEAMS, cm, RULES, dataHash(chars, RULES));
if (!bt.ok) { console.log('bot teams not usable: run node lab/botgen.mjs first ·', bt.errors?.[0] || ''); process.exit(1); }
const t0 = Date.now(), FIT = process.argv.includes('--fit'), REF = FIT || process.argv.includes('--ref');
let teams;
if (REF) {
  const o = loadRef(fs);
  if (!o) { console.log('lab/bossref.json missing: run node lab/bossref.mjs first'); process.exit(1); }
  if (o.hash !== dataHash(chars, RULES)) { console.log(`lab/bossref.json was made for other game data (${o.at}): run node lab/bossref.mjs again`); process.exit(1); }
  teams = o.teams; console.log(`reference teams ${o.at} (runs ${o.runs})`);
} else teams = (await runPlayStats(chars, RULES, RUN_STAGE, { n: runs, keepTeams: true })).teams;
const med = a => { const x = a.slice().sort((p, q) => p - q), m = x.length >> 1; return x.length % 2 ? x[m] : (x[m - 1] + x[m]) / 2; };
// neutral boss (C-17.6 tribe baseline): no rules, no Heat, median stats (hp, atk, cd, multi, phase atk) of the enabled bosses · 3 phases at 0/2/4
function neutralBoss() {
  const L = RUN_STAGE.bosses.filter(x => x.on);
  const pa = i => Math.round(med(L.map(b => phaseStatsAt(b, Math.min(i, b.phases.length - 1)).atk)));
  return { id: 'B0', name: 'บอสกลาง', tribe: 'เหล็กกล้า', v2: true, resistPct: 0, hp: Math.round(med(L.map(b => b.hp))), atk: pa(0), cdMs: Math.round(med(L.map(b => b.cdMs))),
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
  const fight = (b, k) => { const c = { all: [0, 0] }; for (const t of teams[k]) { const w = simulate(t.units, bossTeamOf(b, k, t), { ...t.opts, rules: RULES, log: false }).winner !== 1 ? 1 : 0;
    for (const key of ['all', t.tr || 'ผสม']) { c[key] ??= [0, 0]; c[key][0]++; c[key][1] += w; } } return c; };
  const p = a => (a && a[0] ? (100 * a[1] / a[0]).toFixed(0) : '-');
  let md = `teams k1 ${teams[1].length} · k2 ${teams[2].length} · k3 ${teams[3].length} · ${REF ? 'reference teams (lab/bossref.json)' : `runs ${runs}`} · cell = player win % (teams)\n`;
  // set 168: neutral boss first (tribe baseline) · boss cells then show the gap to it: "45 (−12)"
  const nb0 = neutralBoss(), base = {};
  md += `\n### บอสกลาง (baseline: no rules · median stats hp ${nb0.hp} atk ${nb0.phases.map((q, i) => i ? q.stats.atk : nb0.atk).join('/')} cd ${nb0.cdMs})\n| k | ${ALL.join(' | ')} |\n|${'---|'.repeat(ALL.length + 1)}\n`;
  for (const k of [1, 2, 3]) { const c = base[k] = fight(nb0, k); md += `| ${k} | ${ALL.map(t => `${p(c[t])} (${c[t]?.[0] || 0})`).join(' | ')} |\n`; }
  const gap = (c, k, t) => { const a = c[t], z = base[k][t]; if (!a || !a[0] || !z || !z[0]) return p(a); const d = Math.round(100 * a[1] / a[0] - 100 * z[1] / z[0]); return `${p(a)} (${d >= 0 ? '+' : '−'}${Math.abs(d)})`; };
  for (const b of RUN_STAGE.bosses.filter(x => x.on)) {
    const r0 = b.phases[0].rules || [], weak = b.v2 ? b.weak : r0.find(r => r.id === 'tribeWeak')?.tribe, res = b.v2 ? b.tribe : r0.find(r => r.id === 'tribeResist')?.tribe;
    md += `\n### ${b.id} ${b.name}${b.v2 ? ' (v2)' : ''} · weak ${weak || '-'} · resist ${res || '-'} · cell = win % (vs baseline)\n| k | ${ALL.join(' | ')} |\n|${'---|'.repeat(ALL.length + 1)}\n`;
    for (const k of [1, 2, 3]) { const c = fight(b, k); md += `| ${k} | ${ALL.map(t => gap(c, k, t)).join(' | ')} |\n`; }
    md += '\ncause (rule off → k1 all/weak/resist · k2 all/weak/resist):\n';
    const ids = [...new Set([...(b.v2 ? ['tribeWeak', 'tribeResist'] : []), ...b.phases.flatMap(ph => (ph.rules || []).map(r => r.id))])];
    for (const id of ids) {
      const nb = b.v2 && id === 'tribeWeak' ? { ...b, weakPct: 0 } : b.v2 && id === 'tribeResist' ? { ...b, resistPct: 0 } : { ...b, phases: b.phases.map(ph => ({ ...ph, rules: (ph.rules || []).filter(r => r.id !== id) })) }, c1 = fight(nb, 1), c2 = fight(nb, 2);
      md += `- ${id}: k1 ${[c1.all, c1[weak], c1[res]].map(p).join('/')} · k2 ${[c2.all, c2[weak], c2[res]].map(p).join('/')}\n`;
    }
  }
  console.log(md);
  const mi = process.argv.indexOf('--md'); if (mi > 0 && process.argv[mi + 1]) writeFileSync(process.argv[mi + 1], md);
  process.exit(0);
}
const scale = (b, s) => ({ ...b, hp: Math.max(10, Math.round(b.hp * s / 10) * 10), atk: Math.max(1, Math.round(b.atk * s)),
  phases: b.phases.map(p => ({ ...p, stats: typeof p.stats?.atk === 'number' ? { ...p.stats, atk: Math.max(1, Math.round(p.stats.atk * s)) } : p.stats })) });
const winPct = (b, k, list) => { if (!list.length) return NaN; let w = 0; for (const t of list) { const res = simulate(t.units, runBossTeam(b, k, RUN_STAGE, t.ex), { ...t.opts, rules: RULES, log: false }); w += res.winner !== 1 ? 1 : 0; } return (w / list.length) * 100; };
const ruleOf = (b, id) => b.phases.flatMap(p => p.rules || []).find(r => r.id === id);
const dropRules = (b, ids) => ({ ...b, phases: b.phases.map(p => ({ ...p, rules: (p.rules || []).filter(r => !ids.includes(r.id)) })) });
const f0 = x => (Number.isNaN(x) ? '-' : x.toFixed(0));
const T = [0, T1, T2, T3];
// set 142 (user Q1 A1 B1 C1 D1 · round 2 E1 F1 H1 G1): counter rules added with fixed values (ADD) · FIX sets a rule value ·
//   KNOB = the one value searched per boss so the resisted tribe wins ≈ T1 − 20 at k1 (k2/k3 only reported, G1):
//   scale = existing rule × f in every phase (B1 enrage = cause after the rescale · B4 fastAtk) · otherwise the value itself (B6 burnOverload)
const ADD = { B1: [{ id: 'shellBreak', v: 5, v2: 3 }], B2: [{ id: 'resistWear', v: 2 }], B4: [{ id: 'shockOverload', v: 20 }], B6: [{ id: 'burnOverload', v: 30 }] };
const FIX = { B3: [['tribeResist', 13]], B4: [['tribeResist', 13]] };
// round 3 (user: tune freely until it matches): a list per boss, searched in order · the next knob is searched only when the one
//   before hits its easy edge (kept there) · new counter rules first, then tribeResist, the boss's own rules last (keeps its identity)
// J2 (user, set 142 round 4): floors — a value may drop to half its old value at most, tribeResist ≥ 10, new rules fixed at H1 (B6 overload ≥ 10)
const KNOB = { B1: [{ id: 'tribeResist', lo: 15, hi: 30, int: true }, { id: 'enrage', scale: true, lo: 0.5, hi: 1 }],
  B2: [{ id: 'tribeResist', lo: 15, hi: 30, int: true }],
  B4: [{ id: 'tribeResist', lo: 10, hi: 13, int: true }, { id: 'fastAtk', scale: true, lo: 0.5, hi: 1 }],
  B6: [{ id: 'burnOverload', lo: 10, hi: 3000, int: true }] };
const withRule = (b, r) => ({ ...b, phases: b.phases.map(p => ({ ...p, rules: [...(p.rules || []).filter(x => x.id !== r.id), { ...r }] })) });
const setV = (b, id, v) => ({ ...b, phases: b.phases.map(p => ({ ...p, rules: (p.rules || []).map(r => r.id === id ? { ...r, v } : r) })) });
const kv = (K, x) => (K.inc ? (x = -x, 0) : 0, K.int ? Math.max(K.lo, Math.round(x)) : Math.round(x * 100) / 100);
const knobs = (b, Ks, xs) => Ks.reduce((y, K, i) => knob(y, K, xs[i]), b);
const knob = (b, K, x) => !K ? b : K.scale ? ({ ...b, phases: b.phases.map(p => ({ ...p, rules: (p.rules || []).map(r => r.id === K.id ? { ...r, v: Math.max(1, Math.round(r.v0 * x)) } : r) })) }) : setV(b, K.id, kv(K, x));
const prep = b => { let x = (FIX[b.id] || []).reduce((y, [id, v]) => setV(y, id, v), b); for (const r of ADD[b.id] || []) x = withRule(x, r);
  return { ...x, phases: x.phases.map(p => ({ ...p, rules: p.rules.map(r => ({ ...r, v0: r.v })) })) }; };
const strip = b => ({ ...b, phases: b.phases.map(p => ({ ...p, rules: p.rules.map(({ v0, ...r }) => r) })) });
// win % falls as the boss grows → search the value giving `target`
function search(lo, hi, f, target, steps = 9) { for (let i = 0; i < steps; i++) { const mid = (lo + hi) / 2; if (f(mid) > target) lo = mid; else hi = mid; } return (lo + hi) / 2; }
// set 168 --fit (C-17.6 B2 H1): calibrator for v2 bosses, report only
if (FIT) {
  const L = RUN_STAGE.bosses.filter(x => x.on && x.v2);
  if (!L.length) { console.log('no v2 boss to fit'); process.exit(0); }
  const winS = (b, k, list, stage) => { let w = 0; for (const t of list) w += simulate(t.units, bossTeamOf(b, k, t, stage), { ...t.opts, rules: RULES, log: false }).winner !== 1 ? 1 : 0; return 100 * w / list.length; };
  const avg = (bs, k, stage) => bs.reduce((a, b) => a + winS(b, k, teams[k], stage), 0) / bs.length;
  const g0 = RUN_STAGE.boss2.g, rows = [];
  for (const b of L) {
    const p = search(0.2, 4, x => winS(scale(b, x), 1, teams[1], RUN_STAGE), T1);
    rows.push({ b, p, fb: scale(b, p), k1: [winS(b, 1, teams[1], RUN_STAGE)], k2: [winS(b, 2, teams[2], RUN_STAGE)], k3: [winS(b, 3, teams[3], RUN_STAGE)] });
  }
  const fitted = rows.map(r => r.fb), stOf = g => ({ ...RUN_STAGE, boss2: { ...RUN_STAGE.boss2, g } });
  const g = Math.round(search(1, 6, x => avg(fitted, 2, stOf(x)), T2) * 100) / 100, st = stOf(g);
  for (const r of rows) { r.k1.push(winS(r.fb, 1, teams[1], st)); r.k2.push(winS(r.fb, 2, teams[2], st)); r.k3.push(winS(r.fb, 3, teams[3], st)); }
  const f = x => x.toFixed(0);
  let md = `calibrator (report only) · reference teams k1 ${teams[1].length} · k2 ${teams[2].length} · k3 ${teams[3].length} · targets k1 ${T1} · k2 ${T2} (k3 reported)\n`
    + `shared curve: g ${g0} → ${g} (HP × g^(k−1)) · a ${RUN_STAGE.boss2.a} kept · Heat as set\n\n| boss | power | hp | atk | phase atk | k1 % | k2 % | k3 % |\n|---|---|---|---|---|---|---|---|\n`;
  for (const r of rows) md += `| ${r.b.id} ${r.b.name} | ×${r.p.toFixed(2)} | ${r.b.hp}→${r.fb.hp} | ${r.b.atk}→${r.fb.atk} | ${r.b.phases.map(q => q.stats?.atk ?? '-').join('/')}→${r.fb.phases.map(q => q.stats?.atk ?? '-').join('/')} | ${r.k1.map(f).join('→')} | ${r.k2.map(f).join('→')} | ${r.k3.map(f).join('→')} |\n`;
  md += `| average | | | | | ${f(rows.reduce((a, r) => a + r.k1[1], 0) / rows.length)} | ${f(rows.reduce((a, r) => a + r.k2[1], 0) / rows.length)} | ${f(rows.reduce((a, r) => a + r.k3[1], 0) / rows.length)} |\n`;
  console.log(md);
  const mi = process.argv.indexOf('--md'); if (mi > 0 && process.argv[mi + 1]) writeFileSync(process.argv[mi + 1], md);
  process.exit(0);
}
if (RUN_STAGE.bosses.some(x => x.on && x.v2)) { console.log('v2 bosses do not use mult10/endlessPct: use --fit (report) instead of the old tuning'); process.exit(1); }
const out = [];
for (const b of RUN_STAGE.bosses.filter(x => x.on)) {
  const before = [winPct(b, 1, teams[1]), winPct(b, 2, teams[2])];
  // set 141 (user N1): the rule that holds the resisted tribe down (cause check) is scaled by f (all phases, ≥ 1) so that tribe wins ≈ T1 − 20
  // at k1, alternating with the hp/atk scale s (2 passes) · bosses without a KNOB entry keep their rules
  const K = KNOB[b.id], resT = ruleOf(b, 'tribeResist')?.tribe, R1 = teams[1].filter(t => t.tr === resT);
  const bf = prep(b), Ks = K || [];
  const rng = k => (k.inc ? [-k.hi, -k.lo] : [k.lo, k.hi]), hard = k => (k.scale ? 1 : k.inc ? -k.lo : k.hi);
  // start: every knob at its current value (scale 1 · rule value as set) or the hard end
  const cur = k => { if (k.scale) return 1; const r = bf.phases.flatMap(p => p.rules).find(q => q.id === k.id); return r ? (k.inc ? -r.v : r.v) : hard(k); };
  const xs = Ks.map(cur); let s = 1, edge = false;
  for (let pass = 0; pass < (Ks.length && R1.length ? 3 : 1); pass++) {
    s = search(0.2, 4, x => winPct(scale(knobs(bf, Ks, xs), x), 1, teams[1]), T1);
    if (!Ks.length || !R1.length) break;
    for (let i = 0; i < Ks.length; i++) xs[i] = cur(Ks[i]);
    edge = false;
    for (let i = 0; i < Ks.length; i++) {
      const [lo, hi] = rng(Ks[i]);
      xs[i] = search(lo, hi, x => { const t = xs.slice(); t[i] = x; return winPct(scale(knobs(bf, Ks, t), s), 1, R1); }, T1 - 20, 10);
      if (xs[i] - lo > 0.01 * (hi - lo)) { edge = false; break; } // inside the range → done
      xs[i] = lo; edge = true;
    }
  }
  if (Ks.length && R1.length) s = search(0.2, 4, x => winPct(scale(knobs(bf, Ks, xs), x), 1, teams[1]), T1);
  const b1 = strip(scale(knobs(bf, Ks, xs), s));
  const vals = id => b1.phases.map(p => p.rules.find(r => r.id === id)?.v ?? '-').join('/');
  if (ADD[b.id] || FIX[b.id]) console.log(`  ${b.id} rules: ${[...(ADD[b.id] || []).map(r => r.id), ...(FIX[b.id] || []).map(q => q[0])].map(id => id + ' ' + vals(id)).join(' · ')}`);
  for (const k of Ks) console.log(`  ${b.id} searched ${k.id}: ${b.phases.map(p => p.rules.find(r => r.id === k.id)?.v ?? '-').join('/')} → ${vals(k.id)}`);
  if (edge) console.log(`  ${b.id} every knob at its easy edge`);
  const m10 = Math.round(search(0.5, 6, x => winPct({ ...b1, mult10: x }, 2, teams[2]), T2) * 100) / 100;
  let nb = { ...b1, mult10: m10 };
  const before3 = K3 && teams[3].length ? winPct(b, 3, teams[3]) : NaN;
  if (K3 && teams[3].length) nb = { ...nb, endlessPct: Math.round(search(0, 300, x => winPct({ ...nb, endlessPct: x }, 3, teams[3]), T3)) };
  const after = [winPct(nb, 1, teams[1]), winPct(nb, 2, teams[2]), K3 && teams[3].length ? winPct(nb, 3, teams[3]) : NaN];
  if (K3) console.log(`  ${b.id} k3 ${before3.toFixed(0)}% → ${after[2].toFixed(0)}% · endlessPct ${b.endlessPct}→${nb.endlessPct}`);
  out.push(nb);
  const weak = ruleOf(b, 'tribeWeak')?.tribe, res = ruleOf(b, 'tribeResist')?.tribe, imm = ruleOf(b, 'shockImmune') ? 'shockImmune' : ruleOf(b, 'burnImmune') ? 'burnImmune' : null;
  for (const k of [1, 2, 3]) {
    const L = teams[k], W = L.filter(t => t.tr === weak), R = L.filter(t => t.tr === res);
    let line = `  ${b.id} k${k} (target ${T[k]}): all ${f0(winPct(nb, k, L))}% · favoured ${weak || '-'} ${f0(winPct(nb, k, W))}% (n${W.length}, want > ${T[k] + 10}) · resisted ${res || '-'} ${f0(winPct(nb, k, R))}% (n${R.length}, want ≈ ${T[k] - 20})`;
    if (R.length) line += ` · cause check resisted: no tribeResist ${f0(winPct(dropRules(nb, ['tribeResist']), k, R))}%` + (imm ? ` · no ${imm} ${f0(winPct(dropRules(nb, [imm]), k, R))}% · both off ${f0(winPct(dropRules(nb, ['tribeResist', imm]), k, R))}%` : '');
    console.log(line);
  }
  console.log(`${b.id} ${b.name}: k1 ${before[0].toFixed(0)}% → ${after[0].toFixed(0)}% · k2 ${before[1].toFixed(0)}% → ${after[1].toFixed(0)}% · s ${s.toFixed(2)} hp ${b.hp}→${nb.hp} atk ${b.atk}→${nb.atk} phase atk ${b.phases.map(p => p.stats?.atk ?? '-').join('/')}→${nb.phases.map(p => p.stats?.atk ?? '-').join('/')} · mult10 ${b.mult10}→${m10}`);
}
if (WRITE) { // set 142: the whole boss line is rewritten (new rules added) · raw boss from STAGE_USER + new hp/atk/mult10/endlessPct/phases
  const { STAGE_USER } = await import('../core/stage-user.js');
  const { lit } = await import('../tools/apply-stage.mjs');
  const f = new URL('../core/stage-user.js', import.meta.url);
  let src = readFileSync(f, 'utf8');
  for (const nb of out) {
    const raw = STAGE_USER.bosses.find(x => x.id === nb.id);
    const re = new RegExp(`\\n    (\\{[^\\n]*id: '${nb.id}'[^\\n]*\\}),\\n`);
    const m = src.match(re); if (!m || !raw) { console.log('not found', nb.id); continue; }
    src = src.replace(m[1], lit({ ...raw, hp: nb.hp, atk: nb.atk, mult10: nb.mult10, endlessPct: nb.endlessPct, phases: nb.phases.map(p => ({ at: p.at, fx: p.fx, rules: p.rules, spot: p.spot || '', stats: p.stats || {} })) }));
  }
  writeFileSync(f, src);
  console.log('core/stage-user.js written');
}
