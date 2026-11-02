// Replay one match from a measure run (same seed/index as results.suspicious) and print where its damage came from.
// Usage: node lab/replay.mjs <level: mix|1|2|3> <match index i> [seed=4242]
//        node lab/replay.mjs --code <file with a match code from the try-fight tab (set 39)>
// Output: teams, damage per attacker per 10 s, damage by attacker+type, final stats. Changes nothing.
import { RULES } from '../core/rules.js';
import { buildCharacterList } from '../core/characters.js';
import { randomTeam } from './analyze.js';
import { simulate } from '../core/battle.js';
import { makeRng } from '../core/rng.js';
import { buildTeam, makeCharMap } from '../core/team.js';
import { validateConfig } from '../core/validate.js';
import { baseFingerprint, parseMatchCode, applyMatchDiff, matchFightParts } from './matchcode.js';
import { equipRunes } from '../core/runes.js';
import { bossUnit } from '../core/boss.js';
import fs from 'fs';

const args = process.argv.slice(2);
let A, B, r;
if (args[0] === '--code') {
  const mc = parseMatchCode(fs.readFileSync(args[1], 'utf8'));
  const baseChars = buildCharacterList(), baseTribes = JSON.parse(JSON.stringify(RULES.tribeBonus));
  if (mc.base !== baseFingerprint(baseChars, baseTribes)) console.log('⚠ base values differ from this repo (page built from other values) — replay may not match');
  const { chars, tribes } = applyMatchDiff(baseChars, baseTribes, mc.diff);
  const rules = { ...RULES, tribeBonus: tribes }, v = validateConfig(chars, rules);
  if (!v.ok) throw new Error('edited values invalid: ' + v.errors.slice(0, 3).join(' | '));
  const map = makeCharMap(chars);
  ({ A, B } = mc);
  const fp = matchFightParts(mc); // set 72: boss fight + runes on team A
  const eq = mc.runes.length ? equipRunes(buildTeam(A, map), fp.equips) : null;
  const teamB = fp.boss ? [bossUnit(fp.boss, fp.k)] : buildTeam(B, map);
  if (fp.boss) console.log(`boss ${fp.boss.id} ${fp.boss.name} · appearance ${fp.k} · bars ${fp.boss.bars} · phases ${fp.boss.phases.length}`);
  if (eq) console.log('runes: ' + fp.equips.map(e => `${e.r.id} ${e.r.name} x${e.n}`).join(' · ') + (eq.skipped.length ? ` (run-only, skipped: ${eq.skipped.join(' ')})` : ''));
  r = simulate(eq ? eq.units : buildTeam(A, map), teamB, { rules, ...(mc.seed ? { seed: mc.seed } : {}), tribesOff: mc.tribesOff, ...(eq ? { tribeExtra: eq.tribeExtra } : {}), detail: true });
  const same = r.winner === mc.result.winner && r.timeMs === mc.result.timeMs;
  console.log(`edited chars: ${Object.keys(mc.diff.chars).join(' ') || '-'} · tribes: ${Object.keys(mc.diff.tribes).join(' ') || '-'} · seed ${mc.seed || 'from teams'} · replay ${same ? 'MATCHES' : 'DIFFERS from'} the page result`);
} else {
  const [lvArg, idxArg, seedArg] = args;
  const lv = lvArg === 'mix' ? 'mix' : +lvArg, idx = +idxArg, seed = +(seedArg || 4242);
  if (!(lv === 'mix' || [1, 2, 3].includes(lv)) || !Number.isInteger(idx) || idx < 0) throw new Error('usage: node lab/replay.mjs <mix|1|2|3> <index> [seed] | --code <file>');
  const chars = buildCharacterList(), map = makeCharMap(chars), rng = makeRng(seed);
  for (let i = 0; i <= idx; i++) { // the rng must advance exactly like charRanking, so every earlier match is simulated too
    A = randomTeam(rng, chars, lv); B = randomTeam(rng, chars, lv);
    const last = i === idx;
    r = simulate(buildTeam(A, map, RULES), buildTeam(B, map, RULES), { rules: RULES, log: last, detail: last });
  }
}
const nm = Object.fromEntries(r.units.map(u => [u.uid, u.side + ':' + u.id]));
const fmt = t => t.map(e => `${e.id}L${e.level}r${e.row}${e.lane}`).join(' ');
console.log(`A ${fmt(A)}\nB ${fmt(B)}\ntime ${r.timeMs / 1000}s winner ${r.winner}`);
const bucket = {}, kind = {};
let overkill = 0;
for (const e of r.events) if (e.k === 'dmg' && e.from != null) {
  const b = Math.floor(e.t / 10000) * 10, k = nm[e.from];
  (bucket[b] ||= {})[k] = (bucket[b][k] || 0) + e.amount;
  kind[k + ' ' + e.why] = (kind[k + ' ' + e.why] || 0) + e.amount;
  overkill += e.d && e.d.over || 0;
}
for (const [b, v] of Object.entries(bucket)) console.log(`${b}s`, Object.entries(v).map(([k, x]) => `${k}=${x}`).join(' '));
const fx = r.events.filter(e => ['heal', 'armor'].includes(e.k)).map(e => `${(e.t / 1000).toFixed(1)}s ${e.k} ${e.from != null ? nm[e.from] : '?'}→${nm[e.to]} +${e.amount}`);
if (args.includes('--fx')) console.log('heal/armor events:\n' + fx.join('\n'));
const bossLine = r.events.filter(e => e.k === 'bar' || e.k === 'phase').map(e => (e.k === 'bar' ? `${(e.t / 1000).toFixed(1)}s bar gone ${e.gone} left ${e.left}` : `${(e.t / 1000).toFixed(1)}s phase ${e.i + 1} [${(e.rules || []).join(' ')}]`));
if (bossLine.length) console.log('boss timeline: ' + bossLine.join(' · ')); // set 72
console.log('by attacker+type:', Object.entries(kind).sort((a, b) => b[1] - a[1]).slice(0, 8));
console.log('damage past 0 HP (overkill, from hp loss only):', overkill);
for (const u of r.units) console.log(`${nm[u.uid]} hp ${u.hp}/${u.maxHp} down ${u.down} dealt ${u.dealt} atk ${u.fin.atk} shock/hit ${u.fin.shockHit}`);
