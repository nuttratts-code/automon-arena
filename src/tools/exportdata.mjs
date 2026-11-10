// Godot plan P0 step 1 (set 190): export every game value the JS core uses → godot/data/game.json (one source for the Godot port).
//   node tools/exportdata.mjs          write the file
//   node tools/exportdata.mjs --check  exit 1 if the file is missing or stale (tests/run.js runs the same check)
// Values = all non-function exports of core/*.js after the user's edits are merged (RULES_USER, STAGE_USER) + derived lists the game builds at start
// (buildCharacterList, stageDefaults). Strict: a function, undefined, NaN, Infinity, Map/Set or class instance inside a value fails loudly
// (JSON.stringify would drop it silently). Security (HARD RULE 9): data only, no code; Godot must validate every field on load.
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { createHash } from 'crypto';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const GAME_JSON = resolve(SRC, '../godot/data/game.json');
export const EXPORT_VERSION = 1;

export function walk(v, path, bad) {
  if (v === null || typeof v === 'string' || typeof v === 'boolean') return;
  if (typeof v === 'number') { if (!Number.isFinite(v)) bad.push(path + ' = ' + v); return; }
  if (Array.isArray(v)) { v.forEach((x, i) => walk(x, path + '[' + i + ']', bad)); return; }
  if (typeof v === 'object') {
    const proto = Object.getPrototypeOf(v);
    if (proto !== Object.prototype && proto !== null) { bad.push(path + ' = ' + Object.prototype.toString.call(v)); return; }
    for (const k of Object.keys(v)) walk(v[k], path + '.' + k, bad);
    return;
  }
  bad.push(path + ' = ' + typeof v); // function, undefined, bigint, symbol
}

export async function buildGameData() {
  const files = readdirSync(resolve(SRC, 'core')).filter(f => f.endsWith('.js') && f !== 'index.js').sort();
  const modules = {}, bad = [];
  let charList = null, stageDef = null;
  for (const f of files) {
    const m = await import(pathToFileURL(resolve(SRC, 'core', f)).href);
    const name = f.replace(/\.js$/, ''), out = {};
    for (const k of Object.keys(m).sort()) {
      if (typeof m[k] === 'function') continue;
      walk(m[k], name + '.' + k, bad);
      out[k] = m[k];
    }
    if (Object.keys(out).length) modules[name] = out;
    if (m.buildCharacterList) charList = m.buildCharacterList();
    if (m.stageDefaults) stageDef = m.stageDefaults();
  }
  const derived = { characters: charList, stage: stageDef };
  walk(derived, 'derived', bad);
  if (bad.length) throw new Error('exportdata: values JSON cannot hold:\n  ' + bad.slice(0, 20).join('\n  '));
  const body = { modules, derived };
  const hash = createHash('sha256').update(JSON.stringify(body)).digest('hex').slice(0, 16);
  return { v: EXPORT_VERSION, hash, ...body };
}

// One top-level value per line: small git diffs, still one JSON document.
export function formatGameData(d) {
  const sec = o => '{\n' + Object.keys(o).map(k => '  ' + JSON.stringify(k) + ': ' + JSON.stringify(o[k])).join(',\n') + '\n }';
  const mods = '{\n' + Object.keys(d.modules).map(n => ' ' + JSON.stringify(n) + ': ' + sec(d.modules[n])).join(',\n') + '\n}';
  return '{\n"v": ' + d.v + ',\n"hash": ' + JSON.stringify(d.hash) + ',\n"modules": ' + mods + ',\n"derived": ' + sec(d.derived) + '\n}\n';
}

// Returns [] when godot/data/game.json matches the current core values, else the problems.
export async function checkGameData() {
  if (!existsSync(GAME_JSON)) return ['ไม่มี godot/data/game.json → node tools/exportdata.mjs'];
  const want = formatGameData(await buildGameData()), have = readFileSync(GAME_JSON, 'utf8');
  if (have === want) {
    const back = JSON.parse(have); // round trip: what Godot will parse equals the core values
    if (JSON.stringify(back) !== JSON.stringify(JSON.parse(want))) return ['game.json อ่านกลับไม่ตรง'];
    return [];
  }
  return ['godot/data/game.json ไม่ตรงค่าเกมปัจจุบัน → node tools/exportdata.mjs'];
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--check')) {
    const p = await checkGameData();
    console.log(p.length ? 'exportdata: STALE · ' + p.join(' · ') : 'exportdata: OK');
    process.exit(p.length ? 1 : 0);
  }
  const d = await buildGameData(), txt = formatGameData(d);
  mkdirSync(dirname(GAME_JSON), { recursive: true });
  writeFileSync(GAME_JSON, txt);
  console.log('exportdata: wrote godot/data/game.json · hash ' + d.hash + ' · ' + Math.round(txt.length / 1024) + ' KB · modules ' + Object.keys(d.modules).length);
}
