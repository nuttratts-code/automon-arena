// Set 88: re-tune run bosses against real-run teams · node lab/bossrun.mjs [runs] [target1] [target2] [target3] [--write] · [--tribes [--md file]] = report only (set 167)
// set 91: 3rd boss (round 15, bossesPerRun 3) → target3 tunes each boss's endlessPct (k3 = mult10 × (1 + endlessPct/100)) · skipped when bossesPerRun < 3
// set 141 (user A1): teams come from the SAME flow as runerun / Balance Room "รันจริง" (lab/analyze.js runPlayStats: pickFoe +
//   win streak, runes on both sides, extra matches) — before set 141 it used the old no-rune simRun + pickBotTeam flow, so real
//   teams were stronger than the tuning teams (k2 landed easier than k1) · every boss fight at k = 1 / 2 / 3 is kept (any boss drawn)
// per boss: binary search a scale s on k1 hp / atk / phase atk → target1 %, then mult10 → target2 %, then endlessPct → target3 %
// set 141 (user C): also prints per boss × k the win % of the favoured tribe (boss tribeWeak, wants > target + 10) and the resisted
//   tribe (boss tribeResist, wants ≈ target − 20) · team tribe = ≥ 4 units of it (lab/analyze.js tribe4) · plus a cause check for
//   the resisted tribe: win % with tribeResist off, and with burn/shock immunity off (HARD RULE 5: cause before tuning)
// prints old → new values · --write rewrites core/stage-user.js bosses (hp, atk, phase atk, mult10, endlessPct + set 142 counter rules)
import { readFileSync, writeFileSync } from 'node:fs';
import { simulate } from '../core/battle.js';
import { buildCharacterList } from '../core/characters.js';
import { RULES } from '../core/rules.js';
import { BOT_TEAMS } from '../core/botdata.js';
import { validateBotTeams } from '../core/botteams.js';
import { dataHash } from '../core/save.js';
import { RUN_STAGE, runBossTeam } from '../core/runboss.js';
import { makeCharMap } from '../core/team.js';
import { runPlayStats } from './analyze.js';
const args = process.argv.slice(2).filter((a, i, l) => !a.startsWith('--') && l[i - 1] !== '--md'), WRITE = process.argv.includes('--write');
const runs = +args[0] || 600, T1 = +(args[1] || 60), T2 = +(args[2] || 50), T3 = +(args[3] || 45), K3 = true; // set 141: bossesPerRun no longer exists (set 108 fixed boss rounds) → the old check skipped k3 since then
const chars = buildCharacterList(), cm = makeCharMap(chars);
const bt = validateBotTeams(BOT_TEAMS, cm, RULES, dataHash(chars, RULES));
if (!bt.ok) { console.log('bot teams not usable: run node lab/botgen.mjs first ·', bt.errors?.[0] || ''); process.exit(1); }
const t0 = Date.now();
const S = await runPlayStats(chars, RULES, RUN_STAGE, { n: runs, keepTeams: true });
const teams = S.teams;
console.log(`teams k1 ${teams[1].length} · k2 ${teams[2].length} · k3 ${teams[3].length} · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
// set 167 (user A1): --tribes = report only, nothing is tuned or written · per boss: player win % per team tribe (tribe4, else ผสม) × k
//   + cause check (each rule off in every phase → k1/k2 win % all / weak tribe / resisted tribe) · --md <file> also writes the tables
if (process.argv.includes('--tribes')) {
  const TR = ['เพลิงเผา', 'สายฟ้า', 'วายุ', 'ภูติ', 'เหล็กกล้า', 'อสูร', 'ผสม'], ALL = ['all', ...TR];
  const fight = (b, k) => { const c = { all: [0, 0] }; for (const t of teams[k]) { const w = simulate(t.units, runBossTeam(b, k, RUN_STAGE, t.ex), { ...t.opts, rules: RULES, log: false }).winner !== 1 ? 1 : 0;
    for (const key of ['all', t.tr || 'ผสม']) { c[key] ??= [0, 0]; c[key][0]++; c[key][1] += w; } } return c; };
  const p = a => (a && a[0] ? (100 * a[1] / a[0]).toFixed(0) : '-');
  let md = `teams k1 ${teams[1].length} · k2 ${teams[2].length} · k3 ${teams[3].length} · runs ${runs} · cell = player win % (teams)\n`;
  for (const b of RUN_STAGE.bosses.filter(x => x.on)) {
    const r0 = b.phases[0].rules || [], weak = r0.find(r => r.id === 'tribeWeak')?.tribe, res = r0.find(r => r.id === 'tribeResist')?.tribe;
    md += `\n### ${b.id} ${b.name} · weak ${weak || '-'} · resist ${res || '-'}\n| k | ${ALL.join(' | ')} |\n|${'---|'.repeat(ALL.length + 1)}\n`;
    for (const k of [1, 2, 3]) { const c = fight(b, k); md += `| ${k} | ${ALL.map(t => `${p(c[t])} (${c[t]?.[0] || 0})`).join(' | ')} |\n`; }
    md += '\ncause (rule off → k1 all/weak/resist · k2 all/weak/resist):\n';
    for (const id of [...new Set(b.phases.flatMap(ph => (ph.rules || []).map(r => r.id)))]) {
      const nb = { ...b, phases: b.phases.map(ph => ({ ...ph, rules: (ph.rules || []).filter(r => r.id !== id) })) }, c1 = fight(nb, 1), c2 = fight(nb, 2);
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
