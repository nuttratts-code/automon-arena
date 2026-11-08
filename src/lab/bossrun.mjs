// Set 88: re-tune run bosses against real-run teams · node lab/bossrun.mjs [runs] [target1] [target2] [target3] [--write]
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
const args = process.argv.slice(2).filter(a => !a.startsWith('--')), WRITE = process.argv.includes('--write');
const runs = +args[0] || 600, T1 = +(args[1] || 60), T2 = +(args[2] || 50), T3 = +(args[3] || 45), K3 = true; // set 141: bossesPerRun no longer exists (set 108 fixed boss rounds) → the old check skipped k3 since then
const chars = buildCharacterList(), cm = makeCharMap(chars);
const bt = validateBotTeams(BOT_TEAMS, cm, RULES, dataHash(chars, RULES));
if (!bt.ok) { console.log('bot teams not usable: run node lab/botgen.mjs first ·', bt.errors?.[0] || ''); process.exit(1); }
const t0 = Date.now();
const S = await runPlayStats(chars, RULES, RUN_STAGE, { n: runs, keepTeams: true });
const teams = S.teams;
console.log(`teams k1 ${teams[1].length} · k2 ${teams[2].length} · k3 ${teams[3].length} · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
const scale = (b, s) => ({ ...b, hp: Math.max(10, Math.round(b.hp * s / 10) * 10), atk: Math.max(1, Math.round(b.atk * s)),
  phases: b.phases.map(p => ({ ...p, stats: typeof p.stats?.atk === 'number' ? { ...p.stats, atk: Math.max(1, Math.round(p.stats.atk * s)) } : p.stats })) });
const winPct = (b, k, list) => { if (!list.length) return NaN; let w = 0; for (const t of list) { const res = simulate(t.units, runBossTeam(b, k, RUN_STAGE, t.ex), { ...t.opts, rules: RULES, log: false }); w += res.winner !== 1 ? 1 : 0; } return (w / list.length) * 100; };
const ruleOf = (b, id) => b.phases.flatMap(p => p.rules || []).find(r => r.id === id);
const dropRules = (b, ids) => ({ ...b, phases: b.phases.map(p => ({ ...p, rules: (p.rules || []).filter(r => !ids.includes(r.id)) })) });
const f0 = x => (Number.isNaN(x) ? '-' : x.toFixed(0));
const T = [0, T1, T2, T3];
// set 142 (user Q1 A1 B1 C1 D1): each boss gets a counter rule (same value in every phase) whose main value is searched so the
//   resisted tribe wins ≈ T1 − 20 at k1 · inc = win % rises with the value (search runs on −value) · B3 = tribeResist fixed 13 (user) · B5 untouched
const KNOB = { B1: { id: 'shellBreak', v2: 3, lo: 1, hi: 300, int: true }, B2: { id: 'resistWear', lo: 0.01, hi: 20, inc: true },
  B4: { id: 'shockOverload', lo: 1, hi: 3000, int: true }, B6: { id: 'burnOverload', lo: 1, hi: 3000, int: true } };
const FIX = { B3: [['tribeResist', 13]] };
const withRule = (b, id, v, v2) => ({ ...b, phases: b.phases.map(p => ({ ...p, rules: [...(p.rules || []).filter(r => r.id !== id), { id, v, ...(v2 != null ? { v2 } : {}) }] })) });
const setV = (b, id, v) => ({ ...b, phases: b.phases.map(p => ({ ...p, rules: (p.rules || []).map(r => r.id === id ? { ...r, v } : r) })) });
const kv = (K, x) => { const v = K.inc ? -x : x; return K.int ? Math.max(K.lo, Math.round(v)) : Math.round(v * 100) / 100; };
const knob = (b, K, x) => (K ? withRule(b, K.id, kv(K, x), K.v2) : b);
// win % falls as the boss grows → search the value giving `target`
function search(lo, hi, f, target, steps = 9) { for (let i = 0; i < steps; i++) { const mid = (lo + hi) / 2; if (f(mid) > target) lo = mid; else hi = mid; } return (lo + hi) / 2; }
const out = [];
for (const b of RUN_STAGE.bosses.filter(x => x.on)) {
  const before = [winPct(b, 1, teams[1]), winPct(b, 2, teams[2])];
  // set 141 (user N1): the rule that holds the resisted tribe down (cause check) is scaled by f (all phases, ≥ 1) so that tribe wins ≈ T1 − 20
  // at k1, alternating with the hp/atk scale s (2 passes) · bosses without a KNOB entry keep their rules
  const K = KNOB[b.id], resT = ruleOf(b, 'tribeResist')?.tribe, R1 = teams[1].filter(t => t.tr === resT);
  const bf = (FIX[b.id] || []).reduce((x, [id, v]) => setV(x, id, v), b);
  const [klo, khi] = K ? (K.inc ? [-K.hi, -K.lo] : [K.lo, K.hi]) : [0, 0];
  let f = K ? (klo + khi) / 2 : 0, s = 1;
  for (let pass = 0; pass < (K && R1.length ? 3 : 1); pass++) {
    s = search(0.2, 4, x => winPct(scale(knob(bf, K, f), x), 1, teams[1]), T1);
    if (K && R1.length) f = search(klo, khi, x => winPct(scale(knob(bf, K, x), s), 1, R1), T1 - 20, 12);
  }
  if (K && R1.length) s = search(0.2, 4, x => winPct(scale(knob(bf, K, f), x), 1, teams[1]), T1);
  const b1 = scale(knob(bf, K, f), s);
  if (K) console.log(`  ${b.id} new rule ${K.id} = ${kv(K, f)}${K.v2 != null ? ' / ' + K.v2 : ''} (search range ${K.lo}–${K.hi}${kv(K, f) === K.lo || kv(K, f) === K.hi ? ' · HIT THE EDGE' : ''})`);
  if (FIX[b.id]) console.log(`  ${b.id} fixed: ${FIX[b.id].map(([id, v]) => id + ' ' + v).join(', ')}`);
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
