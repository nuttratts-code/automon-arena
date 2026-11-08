// Set 88: re-tune run bosses against real-run teams · node lab/bossrun.mjs [runs] [target1] [target2] [target3] [--write]
// set 91: 3rd boss (round 15, bossesPerRun 3) → target3 tunes each boss's endlessPct (k3 = mult10 × (1 + endlessPct/100)) · skipped when bossesPerRun < 3
// set 141 (user A1): teams come from the SAME flow as runerun / Balance Room "รันจริง" (lab/analyze.js runPlayStats: pickFoe +
//   win streak, runes on both sides, extra matches) — before set 141 it used the old no-rune simRun + pickBotTeam flow, so real
//   teams were stronger than the tuning teams (k2 landed easier than k1) · every boss fight at k = 1 / 2 / 3 is kept (any boss drawn)
// per boss: binary search a scale s on k1 hp / atk / phase atk → target1 %, then mult10 → target2 %, then endlessPct → target3 %
// set 141 (user C): also prints per boss × k the win % of the favoured tribe (boss tribeWeak, wants > target + 10) and the resisted
//   tribe (boss tribeResist, wants ≈ target − 20) · team tribe = ≥ 4 units of it (lab/analyze.js tribe4) · plus a cause check for
//   the resisted tribe: win % with tribeResist off, and with burn/shock immunity off (HARD RULE 5: cause before tuning)
// prints old → new values · --write rewrites core/stage-user.js bosses (hp, atk, phase atk, mult10, endlessPct)
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
// set 141 (user N1): per boss the rule found by the cause check (resisted tribe win % with the rule off) · B5 near target → none
const KNOB = { B1: 'armorCut', B2: 'tribeResist', B3: 'tribeResist', B4: 'shockImmune', B6: 'burnImmune' };
const knob = (b, id, f) => !id || f === 1 ? b : ({ ...b, phases: b.phases.map(p => ({ ...p, rules: (p.rules || []).map(r => r.id === id && typeof r.v === 'number' ? { ...r, v: Math.max(1, Math.round(r.v * f)) } : r) })) });
// win % falls as the boss grows → search the value giving `target`
function search(lo, hi, f, target, steps = 9) { for (let i = 0; i < steps; i++) { const mid = (lo + hi) / 2; if (f(mid) > target) lo = mid; else hi = mid; } return (lo + hi) / 2; }
const out = [];
for (const b of RUN_STAGE.bosses.filter(x => x.on)) {
  const before = [winPct(b, 1, teams[1]), winPct(b, 2, teams[2])];
  // set 141 (user N1): the rule that holds the resisted tribe down (cause check) is scaled by f (all phases, ≥ 1) so that tribe wins ≈ T1 − 20
  // at k1, alternating with the hp/atk scale s (2 passes) · bosses without a KNOB entry keep their rules
  const kn = KNOB[b.id], resT = ruleOf(b, 'tribeResist')?.tribe, R1 = teams[1].filter(t => t.tr === resT);
  let f = 1, s = 1;
  for (let pass = 0; pass < (kn && R1.length ? 2 : 1); pass++) {
    s = search(0.2, 4, x => winPct(scale(knob(b, kn, f), x), 1, teams[1]), T1);
    if (kn && R1.length) f = search(0, 1, x => winPct(scale(knob(b, kn, x), s), 1, R1), T1 - 20);
  }
  if (kn && R1.length) s = search(0.2, 4, x => winPct(scale(knob(b, kn, f), x), 1, teams[1]), T1);
  const b1 = scale(knob(b, kn, f), s);
  if (kn) console.log(`  ${b.id} ${kn}: ${b.phases.map(p => (p.rules || []).find(r => r.id === kn)?.v ?? '-').join('/')} → ${b1.phases.map(p => (p.rules || []).find(r => r.id === kn)?.v ?? '-').join('/')}`);
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
if (WRITE) {
  const f = new URL('../core/stage-user.js', import.meta.url);
  let src = readFileSync(f, 'utf8');
  for (const nb of out) {
    const re = new RegExp(`(\\{[^\\n]*id: '${nb.id}'[^\\n]*\\},?)\\n`);
    const m = src.match(re); if (!m) { console.log('not found', nb.id); continue; }
    let line = m[1].replace(/ atk: \d+(\.\d+)?, bars:/, ` atk: ${nb.atk}, bars:`).replace(/ hp: \d+, id:/, ` hp: ${nb.hp}, id:`).replace(/mult10: [\d.]+/, `mult10: ${nb.mult10}`).replace(/endlessPct: -?\d+/, `endlessPct: ${nb.endlessPct}`);
    let i = 0; line = line.replace(/stats: \{ atk: \d+ \}/g, () => { while (i < nb.phases.length && typeof nb.phases[i].stats?.atk !== 'number') i++; return `stats: { atk: ${nb.phases[i++].stats.atk} }`; });
    const kn = KNOB[nb.id];
    if (kn) { const vals = nb.phases.flatMap(p => (p.rules || []).filter(r => r.id === kn).map(r => r.v)); let j = 0;
      line = line.replace(new RegExp(`(\\{ id: '${kn}',(?: tribe: '[^']*',)? v: )\\d+`, 'g'), (_, a) => `${a}${vals[j++]}`); }
    src = src.replace(m[1], line);
  }
  writeFileSync(f, src);
  console.log('core/stage-user.js written');
}
