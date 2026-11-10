// Godot plan P0 step 2 (set 191): golden fixtures = the JS core's answers, so the GDScript port can be checked number for number.
//   node lab/golden.mjs            write godot/tests/golden/ (rng.json · battles-NN.jsonl · runs.jsonl · teams.jsonl · manifest.json), ~180 MB, ~1–2 min
//   node lab/golden.mjs --small    small set (tests use it in memory: same input twice = byte-identical)
// User pick B1 (set 191): NOT committed (godot/tests/golden/ is in .gitignore) — rebuilt from the current core before every Godot parity check,
// so the fixtures always match the current game values (manifest.gameHash = godot/data/game.json hash).
// gamefloats.json (set 194): [[path array, bits hex]] for every non-integer number in godot/data/game.json
// (a) rng: first N next() values for 5 seeds · (b) battles: input units/opts exactly as the game passes them + full result
//     (log + detail + live, like the game replay) · (c) runs: simRun with runes, bosses, pickFoe enemies, extra rounds → every match + final state.
//     (d) teams.jsonl (set 195, step 6a): team/power/validate answers — see lab/golden-teams.mjs.
// Every input goes through a JSON round trip BEFORE it is simulated: the fixture holds everything the result depends on.
// v2 (set 194, user pick A1): in battles/runs every non-integer number is written as {"$f": "<16 hex digits>"} = its exact
// IEEE-754 bits (big-endian), because Godot's text→float parse can be 1 ulp off (set 193). Godot decodes the bits and
// compares every value exactly. Integers stay plain JSON numbers (exact up to 2^53 in both). rng.json is unchanged (test compares k).
// Security (HARD RULE 9 ④): fixtures live in godot/tests/ = excluded from every Godot export (P1 export_presets.cfg).
import { mkdirSync, rmSync, createWriteStream } from 'fs';
import { dirname, resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { RULES } from '../core/rules.js';
import { buildCharacterList } from '../core/characters.js';
import { makeRng } from '../core/rng.js';
import { simulate } from '../core/battle.js';
import { makeCharMap, buildTeam } from '../core/team.js';
import { SLOT_ORDER } from '../core/shop.js';
import { BOT_TEAMS } from '../core/botdata.js';
import { simRun, pickFoe, botRounds, tribeList } from '../core/botteams.js';
import { walk, buildGameData } from '../tools/exportdata.mjs';
import { teamGolden } from './golden-teams.mjs';

export const GOLDEN_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../godot/tests/golden');
export const GOLDEN_V = 2;
export const RNG_SEEDS = [0, 1, 4242, 2654435761, 4294967295]; // 0 → the core uses 1 · max uint32
export const FULL = { rngN: 10000, runBattles: 2000, randBattles: 1000, runs: 200, perFile: 500, seed: 191, teams: 1000 };
export const SMALL = { rngN: 200, runBattles: 20, randBattles: 10, runs: 3, perFile: 500, seed: 191, teams: 20 };
const BATTLE_OPTS = { log: true, detail: true, live: true }; // = the game replay (game/run/js/70-battle-replay.js)
const runSeed = (base, i) => (base + Math.imul(i + 1, 0x9E3779B1)) >>> 0;

// JSON-only copy: fails loudly on anything JSON would drop or change (function, undefined, NaN, Map…)
function plain(v, path) {
  const bad = [];
  walk(v, path, bad);
  if (bad.length) throw new Error('golden: not JSON-safe:\n  ' + bad.slice(0, 10).join('\n  '));
  return JSON.parse(JSON.stringify(v));
}
// A1 (set 194): non-integer numbers → {"$f": bits hex} · fromExact = the reverse (unit test: round trip is exact)
const F64 = new DataView(new ArrayBuffer(8));
export function exactNums(v) {
  if (typeof v === 'number') {
    if (Number.isInteger(v)) return v;
    F64.setFloat64(0, v);
    return { $f: F64.getBigUint64(0).toString(16).padStart(16, '0') };
  }
  if (Array.isArray(v)) return v.map(exactNums);
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) o[k] = exactNums(v[k]); return o; }
  return v;
}
export function fromExact(v) {
  if (Array.isArray(v)) return v.map(fromExact);
  if (v && typeof v === 'object') {
    const ks = Object.keys(v);
    if (ks.length === 1 && ks[0] === '$f' && typeof v.$f === 'string') { F64.setBigUint64(0, BigInt('0x' + v.$f)); return F64.getFloat64(0); }
    const o = {}; for (const k of ks) o[k] = fromExact(v[k]); return o;
  }
  return v;
}
const optsOf = o => { const { rules, ...rest } = o; return rest; }; // rules come from godot/data/game.json

function battleRec(i, src, a, b, o) {
  const inp = plain({ a, b, o: optsOf(o) }, 'battle' + i);
  const res = simulate(inp.a, inp.b, { ...inp.o, ...BATTLE_OPTS });
  return exactNums({ i, src, ...inp, res: plain(res, 'battle' + i + '.res') });
}

function* rngLines(cfg) {
  const out = { v: GOLDEN_V, n: cfg.rngN, seeds: RNG_SEEDS, values: {} };
  for (const s of RNG_SEEDS) { const r = makeRng(s); out.values[s] = Array.from({ length: cfg.rngN }, () => r.next()); }
  yield JSON.stringify(out);
}

// (b) battles: first from bot runs (real teams with runes, perm stats, bosses, scaled enemies), then random seeded teams (odd sizes, any level)
function* battleLines(cfg, chars) {
  const cm = makeCharMap(chars);
  let i = 0;
  for (let r = 0; i < cfg.runBattles; r++) {
    const recs = [];
    simRun(chars, RULES, runSeed(cfg.seed * 1000, r), foeOf, m => { recs.push([m.units, m.fs.units, { ...m.opts, ...m.fs.opts }, m.boss]); }, undefined, { runes: true, extra: botRounds(RULES), focus: tribeList(chars)[r % 6] });
    for (const [a, b, o, boss] of recs) { if (i >= cfg.runBattles) break; yield JSON.stringify(battleRec(i, boss ? 'run-boss' : 'run', a, b, o)); i++; }
  }
  const rng = makeRng(cfg.seed);
  const randTeam = () => {
    const n = 1 + rng.int(SLOT_ORDER.length), slots = SLOT_ORDER.slice();
    return Array.from({ length: n }, () => { const [row, lane] = slots.splice(rng.int(slots.length), 1)[0]; return { id: rng.pick(chars).id, level: 1 + rng.int(3), row, lane }; });
  };
  for (let k = 0; k < cfg.randBattles; k++, i++) {
    const tribesOff = rng.int(10) === 0, seed = rng.int(3) === 0 ? 1 + rng.int(1e9) : 0;
    const o = { ...(tribesOff ? { tribesOff: [true, false] } : {}), ...(seed ? { seed } : {}) };
    yield JSON.stringify(battleRec(i, 'rand', buildTeam(randTeam(), cm, RULES), buildTeam(randTeam(), cm, RULES), o));
  }
}
// enemy picker = the game's (game/run/js/60-runes-enemy-tribes.js nextFoe)
const foeOf = P => pickFoe(BOT_TEAMS, P.fp | 0, P.round, P.seed, P.extra, undefined, undefined, P.ls | 0, P.ws | 0);

// (c) runs: one line per run = seed, options, every match (what the player had, gold/hearts before, the enemy, the result) and the final state
function* runLines(cfg, chars) {
  const tribes = tribeList(chars);
  for (let r = 0; r < cfg.runs; r++) {
    const seed = runSeed(cfg.seed, r), opts = { runes: true, extra: botRounds(RULES), focus: tribes[r % tribes.length], foeFocus: tribes[(r + 3) % tribes.length] };
    const matches = [];
    const P = simRun(chars, RULES, seed, r % 4 === 3 ? null : foeOf, m => matches.push({
      stage: m.stage, round: m.round, gold: m.gold, hearts: m.hearts, extra: m.extra, second: m.second, ws: m.ws, team: m.team, rn: m.rn,
      foe: m.foe, foeRn: m.foeRn, boss: m.boss, k: m.k, winner: m.winner, timeMs: m.timeMs, aborted: m.aborted, events: m.res.events.length,
    }), undefined, opts);
    yield JSON.stringify(exactNums(plain({ i: r, seed, foe: r % 4 === 3 ? 'liveBot' : 'pickFoe', opts, matches, final: P }, 'run' + r)));
  }
}

// files = [name, lineGenerator] · write(name, line) is called per line; returns the manifest
export async function buildGolden(cfg = FULL, write = () => {}) {
  const chars = buildCharacterList(), files = {}, counts = {};
  const emit = (name, line) => { (files[name] ||= createHash('sha256')).update(line + '\n'); counts[name] = (counts[name] || 0) + 1; write(name, line); };
  for (const l of rngLines(cfg)) emit('rng.json', l);
  let n = 0;
  for (const l of battleLines(cfg, chars)) emit('battles-' + String(Math.floor(n++ / cfg.perFile)).padStart(2, '0') + '.jsonl', l);
  for (const l of runLines(cfg, chars)) emit('runs.jsonl', l);
  for (const o of teamGolden(cfg, chars)) emit('teams.jsonl', JSON.stringify(exactNums(plain(o, 'teams'))));
  const gd = await buildGameData();
  // A1 guard (set 194): exact bits of every non-integer number in godot/data/game.json → Godot checks its JSON parse of game.json matches
  const gf = []; (function fl(v, p) { if (typeof v === 'number' && !Number.isInteger(v)) gf.push([p, exactNums(v).$f]); else if (v && typeof v === 'object') for (const k of Object.keys(v)) fl(v[k], p.concat(k)); })({ modules: gd.modules, derived: gd.derived }, []);
  emit('gamefloats.json', JSON.stringify(gf));
  return { v: GOLDEN_V, gameHash: gd.hash, cfg, rngSeeds: RNG_SEEDS, battleOpts: BATTLE_OPTS,
    files: Object.fromEntries(Object.keys(files).map(f => [f, { lines: counts[f], sha256: files[f].digest('hex') }])) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const cfg = process.argv.includes('--small') ? SMALL : FULL, t0 = Date.now(), streams = {};
  rmSync(GOLDEN_DIR, { recursive: true, force: true });
  mkdirSync(GOLDEN_DIR, { recursive: true });
  const man = await buildGolden(cfg, (name, line) => (streams[name] ||= createWriteStream(join(GOLDEN_DIR, name))).write(line + '\n'));
  await Promise.all(Object.values(streams).map(s => new Promise(ok => s.end(ok))));
  const txt = JSON.stringify(man, null, 1) + '\n';
  createWriteStream(join(GOLDEN_DIR, 'manifest.json')).end(txt);
  console.log('golden: wrote godot/tests/golden/ · ' + Object.entries(man.files).map(([f, x]) => f + ' ' + x.lines).join(' · ') + ' · gameHash ' + man.gameHash + ' · ' + Math.round((Date.now() - t0) / 1000) + ' s');
}
