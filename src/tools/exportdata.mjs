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

// Set 196 (plan-set196 7a, user D1): texts + placeholder art for the Godot screens, generated from the web source (one source).
// labels.json = every non-function export of game/labels.js (getters read with the current RULES; Sets → sorted arrays)
//   + runeDesc = the game page's rnDesc() text per rune id (src/game/run/js/60-runes-enemy-tribes.js) — change both if that formula changes.
// art.json = src/game/art.js GAME_ART as plain base64 PNG (data: prefix stripped; anything that is not a PNG fails loudly).
export const LABELS_JSON = resolve(SRC, '../godot/data/labels.json');
export const ART_JSON = resolve(SRC, '../godot/data/art.json');
export async function buildLabels() {
  const L = await import(pathToFileURL(resolve(SRC, 'game/labels.js')).href);
  const S = await import(pathToFileURL(resolve(SRC, 'core/stage.js')).href);
  const RR = await import(pathToFileURL(resolve(SRC, 'core/runrunes.js')).href);
  const tables = {}, bad = [];
  for (const k of Object.keys(L).sort()) {
    let v = L[k];
    if (typeof v === 'function') continue;
    if (v instanceof Set) v = [...v].sort();
    v = JSON.parse(JSON.stringify(v)); // reads getters once (e.g. WHEN_TH.lowHp)
    walk(v, 'labels.' + k, bad); tables[k] = v;
  }
  const runeDesc = {};
  for (const r of RR.rnAll()) { // every rune a run can offer (stage runes + the user's custom runes; switched-off ones skipped)
    runeDesc[r.id] = S.runeText(r) || `${S.runeWho(r)}: ได้สกิล "${L.skillLine({ when: r.when, do: r.do, to: r.to, v: [r.v, r.v, r.v] }, 1)}"`;
  }
  walk(runeDesc, 'labels.runeDesc', bad);
  // set 197 (7b): the unit card's skill lines, per character id · one entry per skillGroups() group = { lv: levels it applies to | null, si: [skill indexes] (set 199), shop: shop skill (set 199), text: [Lv1, Lv2, Lv3] } (labels.js skillLine / skillGroupLine)
  const CH = await import(pathToFileURL(resolve(SRC, 'core/characters.js')).href);
  const skills = {};
  for (const c of CH.buildCharacterList()) {
    skills[c.id] = L.skillGroups(c.skills).map(g => ({ lv: g[0].lv || null, si: g.map(x => c.skills.indexOf(x)), shop: L.isShopWhen(g[0].when), text: [1, 2, 3].map(lv => g.length === 1 ? L.skillLine(g[0], lv) : L.skillGroupLine(g)) }));
  }
  walk(skills, 'labels.skills', bad);
  if (bad.length) throw new Error('exportdata labels: ' + bad.slice(0, 20).join(' · '));
  return { v: EXPORT_VERSION, tables, runeDesc, skills };
}
export async function buildArt() {
  const { GAME_ART } = await import(pathToFileURL(resolve(SRC, 'game/art.js')).href);
  const out = {}, PRE = 'data:image/png;base64,';
  for (const g of Object.keys(GAME_ART).sort()) {
    out[g] = {};
    for (const k of Object.keys(GAME_ART[g]).sort()) {
      const s = GAME_ART[g][k];
      if (typeof s !== 'string' || !s.startsWith(PRE)) throw new Error('exportdata art: ' + g + '.' + k + ' is not a PNG data URI');
      const b = Buffer.from(s.slice(PRE.length), 'base64');
      if (b.readUInt32BE(0) !== 0x89504e47) throw new Error('exportdata art: ' + g + '.' + k + ' bad PNG');
      out[g][k] = s.slice(PRE.length);
    }
  }
  return { v: EXPORT_VERSION, art: out };
}
// colours.json = the web game's colour tokens (src/game/run/css/10-base.css): light = the first :root block, dark = :root[data-theme="dark"] (user pick C1).
export const COLOURS_JSON = resolve(SRC, '../godot/data/colours.json');
export function buildColours() {
  const css = readFileSync(resolve(SRC, 'game/run/css/10-base.css'), 'utf8');
  const block = re => { const m = re.exec(css); if (!m) throw new Error('exportdata colours: block not found ' + re); const o = {};
    for (const [, k, v] of m[1].matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})\b/g)) o[k] = v.toLowerCase(); return o; };
  const light = block(/^:root \{([^}]*)\}/m), dark = block(/^:root\[data-theme="dark"\] \{([^}]*)\}/m);
  const miss = Object.keys(light).filter(k => !(k in dark));
  if (miss.length || Object.keys(light).length < 40) throw new Error('exportdata colours: dark lacks ' + miss.join(',') + ' / light has ' + Object.keys(light).length);
  return { v: EXPORT_VERSION, light, dark };
}
const fmtSmall = d => '{\n' + Object.keys(d).map(k => JSON.stringify(k) + ': ' + (typeof d[k] === 'object' && d[k] ? '{\n' + Object.keys(d[k]).map(j => ' ' + JSON.stringify(j) + ': ' + JSON.stringify(d[k][j])).join(',\n') + '\n}' : JSON.stringify(d[k]))).join(',\n') + '\n}\n';
export async function extraFiles() { return [[LABELS_JSON, fmtSmall(await buildLabels())], [ART_JSON, fmtSmall(await buildArt())], [COLOURS_JSON, fmtSmall(buildColours())]]; }

// ui_th.json is hand-written (screen captions); every literal part (between {x} slots) must still appear in the web game source.
export function checkUiText() {
  const dir = resolve(SRC, 'game/run'), files = [];
  const walkDir = d => { for (const f of readdirSync(d, { withFileTypes: true })) { const p = resolve(d, f.name); if (f.isDirectory()) walkDir(p); else if (/\.(html|js)$/.test(f.name)) files.push(p); } };
  walkDir(dir);
  files.push(resolve(SRC, 'game/view.js')); // set 198: the battle view lines (ticker, floats) live there
  for (const f of ['lab/balance/js/50-match-analysis.js', 'lab/balance/js/51-match-units.js', 'game/labels.js']) files.push(resolve(SRC, f)); // set 199: the match details popup (bundled in the game page)
  const web = files.map(f => readFileSync(f, 'utf8')).join('\n'), p = [];
  const ui = JSON.parse(readFileSync(resolve(SRC, '../godot/data/ui_th.json'), 'utf8'));
  for (const [k, v] of Object.entries(ui)) {
    if (k.startsWith('_')) continue;
    if (typeof v !== 'string') { p.push(k + ' is not text'); continue; }
    for (const part of v.split(/\{[a-z]+\}/)) if (part.trim() && !web.includes(part)) p.push(k + ': "' + part + '" not in src/game/run (or game/view.js)');
  }
  return p;
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
export async function checkExtra() {
  const p = [];
  for (const [f, want] of await extraFiles()) if (!existsSync(f) || readFileSync(f, 'utf8') !== want) p.push('godot/data/' + f.split('/').pop() + ' ไม่ตรงต้นทาง (labels.js / art.js / 10-base.css) → node tools/exportdata.mjs');
  return p;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--check')) {
    const p = [...await checkGameData(), ...await checkExtra()];
    console.log(p.length ? 'exportdata: STALE · ' + p.join(' · ') : 'exportdata: OK');
    process.exit(p.length ? 1 : 0);
  }
  const d = await buildGameData(), txt = formatGameData(d);
  mkdirSync(dirname(GAME_JSON), { recursive: true });
  writeFileSync(GAME_JSON, txt);
  for (const [f, s] of await extraFiles()) { writeFileSync(f, s); console.log('exportdata: wrote godot/data/' + f.split('/').pop() + ' · ' + Math.round(s.length / 1024) + ' KB'); }
  console.log('exportdata: wrote godot/data/game.json · hash ' + d.hash + ' · ' + Math.round(txt.length / 1024) + ' KB · modules ' + Object.keys(d.modules).length);
}
