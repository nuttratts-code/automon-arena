// Automon asset hub — local-only server (set 240). Node built-ins only (HARD RULE 9: no packages).
// Run: node tools/asset-hub/server.mjs   → http://127.0.0.1:5177
//      node tools/asset-hub/server.mjs --export   → write godot/data/unit_shadows.json and exit
//      node tools/asset-hub/server.mjs --check    → validate art/hub/hub.json and exit
// Data: art/hub/hub.json (committed) · uploads art/hub/files/<item>/ (git-ignored, local working files)
// Starred rounds are copied into art/library/characters/<item>/ + an INDEX.csv row (art/library/README.md rules 0–2).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.HUB_ROOT ? path.resolve(process.env.HUB_ROOT) : path.resolve(HERE, '..', '..'); // HUB_ROOT = test copy only
const HUB_DIR = path.join(ROOT, 'art', 'hub');
const HUB_FILE = path.join(HUB_DIR, 'hub.json');
const FILES = path.join(HUB_DIR, 'files');
const LIB = path.join(ROOT, 'art', 'library');
const SHADOW_OUT = path.join(ROOT, 'godot', 'data', 'unit_shadows.json');
const PORT = Number(process.env.HUB_PORT || 5177);

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/;
const EXT = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif',
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
  glb: 'model/gltf-binary', pxo: 'application/octet-stream', txt: 'text/plain; charset=utf-8',
};
const PAGE = { '/': 'index.html', '/app.js': 'app.js', '/style.css': 'style.css' };
const SLOTS = ['still', 'cut', 'veoin', 'video', 'frames', 'file'];
const MAX_UPLOAD = 600 * 1024 * 1024;
const LICENCE_DEFAULT = 'AI placeholder - UNVERIFIED';

// ---------- hub file ----------
export function emptyHub() {
  return {
    v: 1, rev: 0,
    settings: {
      moves: ['idle', 'attack', 'hit', 'die'],
      kinds: ['character', 'scene', 'prop3d', 'effect', 'ui'],
      licences: [LICENCE_DEFAULT, 'owner-made', 'CC0', 'licensed'],
      arenaBg: '', camPitch: 40, starter: '',
      shadowLift: 0.065,
    },
    items: {}, queue: [],
  };
}

function readHub() {
  if (!fs.existsSync(HUB_FILE)) return emptyHub();
  return JSON.parse(fs.readFileSync(HUB_FILE, 'utf8'));
}

function writeHub(hub) {
  fs.mkdirSync(HUB_DIR, { recursive: true });
  const tmp = HUB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(hub, null, 1) + '\n');
  fs.renameSync(tmp, HUB_FILE);
}

const num = (v, lo, hi, d) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
const str = (v, max = 4000) => (typeof v === 'string' ? v.slice(0, max) : '');

// light shape check on a hub sent by the page (it is our own page, but keep bad data out of the file)
export function validateHub(h) {
  const err = [];
  if (!h || typeof h !== 'object') return ['not an object'];
  if (h.v !== 1) err.push('v must be 1');
  if (!h.items || typeof h.items !== 'object' || Array.isArray(h.items)) err.push('items must be an object');
  if (!Array.isArray(h.queue)) err.push('queue must be an array');
  for (const [id, it] of Object.entries(h.items || {})) {
    if (!ID_RE.test(id) || it.id !== id) { err.push(`bad item id ${id}`); continue; }
    if (!Array.isArray(it.rounds) || !Array.isArray(it.prompts)) err.push(`${id}: rounds/prompts must be arrays`);
    for (const r of it.rounds || []) {
      if (!SLOTS.includes(r.slot)) err.push(`${id}: bad slot ${r.slot}`);
      if (typeof r.file !== 'string' || !/^(hub|lib)\//.test(r.file) || r.file.includes('..')) err.push(`${id}: bad file ${r.file}`);
    }
    const s = it.shadow;
    if (s && (!Array.isArray(s.feet) || s.feet.length !== 2)) err.push(`${id}: shadow.feet must be [x, y]`);
  }
  return err;
}

// ---------- godot export (E1: feet + oval + cast; A1: one oval) ----------
export function shadowExport(hub) {
  const units = {};
  for (const it of Object.values(hub.items)) {
    if (it.kind !== 'character' || !it.shadow) continue;
    const s = it.shadow, o = s.oval || {}, c = s.cast || {};
    units[it.id] = {
      feet: [num(s.feet?.[0], 0, 1, 0.5), num(s.feet?.[1], 0, 1, 1)],
      size: Array.isArray(s.size) ? [Math.round(num(s.size[0], 1, 8192, 1)), Math.round(num(s.size[1], 1, 8192, 1))] : [0, 0],
      oval: { dx: num(o.dx, -1, 1, 0), dy: num(o.dy, -1, 1, 0), w: num(o.w, 0.1, 2, 0.8), h: num(o.h, 0.05, 2, 0.45), a: o.on === false ? 0 : num(o.a, 0, 1, 1) }, // oval off = strength 0 in the game
      cast: { len: num(c.len, 0, 2, 1), str: num(c.str, 0, 1, 0.5), ox: num(c.ox, -1, 1, 0), oy: num(c.oy, -1, 1, 0), blur: num(c.blur, 0, 1, 0.3),
        k: Object.fromEntries(['tl', 'tr', 'bl', 'br'].map((q) => [q, Array.isArray(c.k?.[q]) ? [num(c.k[q][0], -3, 3, 0), num(c.k[q][1], -3, 3, 0)] : [0, 0]])) },
    };
  }
  return {
    v: 1,
    note: 'Written by tools/asset-hub (set 240). feet = image fraction (0..1, y down) of the sprite picture the owner set it on; size = that picture in px (the game applies feet only when its texture has the same size). oval = tile units around the feet. cast = shadow that follows the body: len (x height x sun reach), str, ox/oy start offset in tile units; blur = softness (x 0.12 of the picture height, blurred once); k = per-corner offsets [x, z] in tile units of the shadow quad (tl/tr = head end, bl/br = feet end); sun = ground direction [x, z] shared by every unit (r38 port).',
    lift: num(hub.settings?.shadowLift, 0, 0.5, 0.065),
    sun: (() => { const d = num(hub.settings?.sunAngle, -180, 180, -37.4) * Math.PI / 180; return [+Math.cos(d).toFixed(4), +Math.sin(d).toFixed(4)]; })(),
    default: { feet: [0.5, 1], oval: { dx: 0, dy: 0, w: 0.8, h: 0.45, a: 1 }, cast: { len: 1, str: 0.5, ox: 0, oy: 0, blur: 0.3, k: { tl: [0, 0], tr: [0, 0], bl: [0, 0], br: [0, 0] } } },
    units,
  };
}

function doExport(hub) {
  const out = shadowExport(hub);
  fs.writeFileSync(SHADOW_OUT, JSON.stringify(out, null, 1) + '\n');
  return { file: path.relative(ROOT, SHADOW_OUT).replaceAll('\\', '/'), units: Object.keys(out.units).length };
}

// ---------- library (star → copy, never overwrite) ----------
function csvCell(s) { s = String(s ?? ''); return /[",\n]/.test(s) ? '"' + s.replaceAll('"', '""') + '"' : s; }

function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function starToLibrary(hub, it, r) {
  if (r.file.startsWith('lib/')) return r.file; // already in the library
  const src = resolveFile(r.file);
  if (!src || !fs.existsSync(src)) throw new Error('file missing: ' + r.file);
  const ext = path.extname(src).slice(1).toLowerCase();
  const hash = crypto.createHash('sha1').update(fs.readFileSync(src)).digest('hex').slice(0, 8);
  const tag = [r.slot, r.move, r.form ? 'f' + r.form : ''].filter(Boolean).join('_');
  const name = `${it.id}_${tag}_${(r.t || '').slice(0, 10) || today()}_${hash}.${ext}`;
  const rel = `characters/${it.id}/${name}`;
  const dst = path.join(LIB, rel);
  if (!fs.existsSync(dst)) { // library rule 1: never overwrite
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
    const what = `${it.id} ${it.name || ''} — ${r.slot}${r.move ? ' ' + r.move : ''}${r.form ? ' form ' + r.form : ''}${r.note ? ' · ' + r.note : ''} (asset hub)`;
    const line = [rel, what, r.tool || 'owner upload', today(), r.by || 'owner', 'not yet', r.licence || LICENCE_DEFAULT].map(csvCell).join(',');
    const idx = path.join(LIB, 'INDEX.csv');
    const cur = fs.readFileSync(idx, 'utf8');
    fs.appendFileSync(idx, (cur.endsWith('\n') ? '' : '\n') + line + '\n');
  }
  return 'lib/' + rel;
}

const today = () => new Date().toISOString().slice(0, 10);

// ---------- files ----------
function resolveFile(rel) {
  if (typeof rel !== 'string' || rel.includes('\0')) return null;
  const m = /^(hub|lib)\/(.+)$/.exec(rel);
  if (!m) return null;
  const base = m[1] === 'hub' ? FILES : LIB;
  const p = path.resolve(base, decodeURIComponent(m[2]));
  return p.startsWith(base + path.sep) ? p : null;
}

function sendFile(req, res, p) {
  const ext = path.extname(p).slice(1).toLowerCase();
  const type = EXT[ext] || (ext === 'html' ? 'text/html; charset=utf-8' : ext === 'js' ? 'text/javascript; charset=utf-8' : ext === 'css' ? 'text/css; charset=utf-8' : ext === 'csv' ? 'text/plain; charset=utf-8' : null);
  if (!type || !fs.existsSync(p) || !fs.statSync(p).isFile()) return send(res, 404, { error: 'not found' });
  const size = fs.statSync(p).size;
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  const head = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' };
  if (range) { // video seeking needs ranges
    let a = range[1] === '' ? size - Number(range[2]) : Number(range[1]);
    let b = range[1] !== '' && range[2] !== '' ? Number(range[2]) : size - 1;
    a = Math.max(0, a); b = Math.min(size - 1, b);
    if (a > b) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }); return res.end(); }
    res.writeHead(206, { ...head, 'Content-Range': `bytes ${a}-${b}/${size}`, 'Content-Length': b - a + 1 });
    return fs.createReadStream(p, { start: a, end: b }).pipe(res);
  }
  res.writeHead(200, { ...head, 'Content-Length': size });
  fs.createReadStream(p).pipe(res);
}

function send(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}

function readBody(req, max) {
  return new Promise((ok, bad) => {
    const parts = []; let n = 0;
    req.on('data', (c) => { n += c.length; if (n > max) { bad(new Error('too big')); req.destroy(); } else parts.push(c); });
    req.on('end', () => ok(Buffer.concat(parts)));
    req.on('error', bad);
  });
}

function libraryList() {
  const idx = path.join(LIB, 'INDEX.csv');
  const rows = fs.existsSync(idx) ? parseCsv(fs.readFileSync(idx, 'utf8')) : [];
  const head = rows.shift() || [];
  return rows.filter((r) => r.length >= 2 && r[0]).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

// ---------- server ----------
async function handle(req, res) {
  const u = new URL(req.url, 'http://127.0.0.1');
  // only our own page may call the API (blocks other sites in the same browser from writing files)
  if (req.method !== 'GET' && req.headers.origin && req.headers.origin !== `http://127.0.0.1:${PORT}` && req.headers.origin !== `http://localhost:${PORT}`) return send(res, 403, { error: 'origin' });
  if (req.method === 'GET' && PAGE[u.pathname]) return sendFile(req, res, path.join(HERE, PAGE[u.pathname]));
  if (req.method === 'GET' && u.pathname.startsWith('/f/')) {
    const p = resolveFile(u.pathname.slice(3));
    return p ? sendFile(req, res, p) : send(res, 400, { error: 'bad path' });
  }
  if (req.method === 'GET' && u.pathname === '/api/hub') return send(res, 200, readHub());
  if (req.method === 'GET' && u.pathname === '/api/library') return send(res, 200, libraryList());

  if (req.method === 'POST' && u.pathname === '/api/hub') {
    const next = JSON.parse((await readBody(req, 8e6)).toString('utf8'));
    const cur = readHub();
    if (next.rev !== cur.rev) return send(res, 409, { error: 'changed elsewhere', hub: cur });
    const err = validateHub(next);
    if (err.length) return send(res, 400, { error: err.slice(0, 5).join('; ') });
    next.rev = cur.rev + 1;
    writeHub(next);
    return send(res, 200, next);
  }

  if (req.method === 'POST' && u.pathname === '/api/upload') {
    const id = u.searchParams.get('item') || '';
    const slot = u.searchParams.get('slot') || '';
    const ext = (u.searchParams.get('name') || '').split('.').pop().toLowerCase();
    const form = Number(u.searchParams.get('form') || 0);
    const move = u.searchParams.get('move') || '';
    if (!ID_RE.test(id) || !SLOTS.includes(slot) || !EXT[ext] || ![0, 1, 3].includes(form) || (move && !ID_RE.test(move))) return send(res, 400, { error: 'bad upload fields' });
    const hub = readHub();
    const it = hub.items[id];
    if (!it) return send(res, 404, { error: 'no such item' });
    const buf = await readBody(req, MAX_UPLOAD);
    if (!buf.length) return send(res, 400, { error: 'empty file' });
    const hash = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 8);
    const name = `${slot}${move ? '_' + move : ''}${form ? '_f' + form : ''}_${today()}_${hash}.${ext}`;
    const dir = path.join(FILES, id);
    fs.mkdirSync(dir, { recursive: true });
    const dst = path.join(dir, name);
    if (!fs.existsSync(dst)) fs.writeFileSync(dst, buf, { flag: 'wx' });
    const r = {
      id: 'r' + crypto.randomBytes(4).toString('hex'), slot, form: form || undefined, move: move || undefined,
      file: `hub/${id}/${name}`, orig: str(u.searchParams.get('name'), 200), t: new Date().toISOString(),
      by: u.searchParams.get('by') === 'claude' ? 'claude' : 'owner', note: '', star: false, archived: false,
      licence: hub.settings.licences?.[0] || LICENCE_DEFAULT,
      promptId: it.prompts.length ? it.prompts[it.prompts.length - 1].id : undefined,
    };
    it.rounds.push(r);
    hub.rev += 1;
    writeHub(hub);
    return send(res, 200, hub);
  }

  if (req.method === 'POST' && u.pathname === '/api/star') {
    const hub = readHub();
    const it = hub.items[u.searchParams.get('item') || ''];
    const r = it?.rounds.find((x) => x.id === u.searchParams.get('round'));
    if (!r) return send(res, 404, { error: 'no such round' });
    r.star = u.searchParams.get('on') !== '0';
    if (r.star && !r.library) r.library = starToLibrary(hub, it, r);
    hub.rev += 1;
    writeHub(hub);
    return send(res, 200, hub);
  }

  if (req.method === 'POST' && u.pathname === '/api/export') return send(res, 200, doExport(readHub()));
  send(res, 404, { error: 'not found' });
}

function main() {
  const arg = process.argv[2];
  if (arg === '--export') { console.log(JSON.stringify(doExport(readHub()))); return; }
  if (arg === '--check') {
    const err = validateHub(readHub());
    console.log(err.length ? 'HUB CHECK: FAIL\n' + err.join('\n') : 'HUB CHECK: PASS');
    process.exitCode = err.length ? 1 : 0;
    return;
  }
  http.createServer((req, res) => handle(req, res).catch((e) => send(res, 500, { error: String(e.message || e) })))
    .listen(PORT, '127.0.0.1', () => console.log(`asset hub: http://127.0.0.1:${PORT}`));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
