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
import os from 'node:os';
import { spawn } from 'node:child_process';
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
// owner A1 (set 240 follow-up): the "ตัดเฟรม + สร้างเงา" button runs Claude's two scripts here, no chat needed.
// Scripts come from the repo next to this file (never from ROOT / art data); fixed argument lists, no shell.
const IDLE_PY = path.resolve(HERE, '..', '..', '.claude', 'skills', 'char-idle', 'painted_idle.py');
const ADD_PY = path.join(HERE, 'hub_add.py');
const PYTHON = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');

// ---------- auto frames + shadow (one job at a time) ----------
let job = null; // { item, round, state: 'run' | 'done' | 'error', step, msg, t }

function runPy(args, env) {
  return new Promise((resolve, reject) => {
    const p = spawn(PYTHON, ['-I', ...args], { windowsHide: true, env: { ...process.env, ...env, PYTHONIOENCODING: 'utf-8' } });
    let out = '', err = '';
    const kill = setTimeout(() => p.kill(), 10 * 60 * 1000);
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { err += d; });
    p.on('error', (e) => { clearTimeout(kill); reject(new Error('เรียก python ไม่ได้: ' + e.message)); });
    p.on('close', (code) => { clearTimeout(kill); code === 0 ? resolve(out) : reject(new Error((err || out).trim().split('\n').slice(-3).join(' ') || 'exit ' + code)); });
  });
}

// what the numbers from painted_idle.py say about the clip (owner reads these instead of Claude looking)
export function clipWarnings(out) {
  const w = [];
  const shape = out.match(/frames \d+ \((\d+), (\d+)/), feet = out.match(/feet row min\/max (\d+) (\d+) union \((-?\d+), (-?\d+), (\d+), (\d+)\)/);
  const sheet = out.match(/sheet_\d+x1_(\d+)x(\d+)/) || out.match(/sheet \((\d+), (\d+)\)/), loop = out.match(/diff ([\d.]+) len ([\d.]+)s/);
  if (shape && feet) {
    const [H, W] = [+shape[1], +shape[2]], [fmin, fmax, x0, y0, x1, y1] = feet.slice(1).map(Number);
    const sh = sheet ? +sheet[2] : 150, scale = sh / Math.max(1, y1 - y0), drift = (fmax - fmin) * scale;
    if (drift > 2) w.push(`เท้าขยับขึ้นลง ~${drift.toFixed(1)} px ในเฟรม (ตัวอาจลอย/จม) ดูใน GIF ว่ารับได้ไหม`);
    if (x0 + 6 <= 1 || x1 - 6 >= W - 1) w.push('ตัวชนขอบซ้าย/ขวาของวิดีโอ อาจโดนตัดขาด');
    if (y0 + 6 <= 1) w.push('หัวชนขอบบนของวิดีโอ อาจโดนตัดขาด');
    if (y1 - 2 >= H - 1) w.push('เท้าชนขอบล่างของวิดีโอ อาจโดนตัดขาด');
  }
  if (loop && +loop[1] > 3) w.push(`ต้นกับท้ายลูปต่างกันพอควร (${loop[1]}) ตอนวนอาจกระตุก`);
  return w;
}

async function runFrames(id, rid, form, move) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'asset-hub-'));
  try {
    const it = readHub().items[id], r = it?.rounds.find((x) => x.id === rid);
    const video = r && resolveFile(r.file);
    if (!video) throw new Error('หาไฟล์วิดีโอไม่เจอ');
    job.step = 'กำลังแตกวิดีโอเป็น 32 เฟรม (10–60 วิ)';
    const out = await runPy([IDLE_PY, video, path.join(tmp, 'out'), '32', '150', '--bg=auto']);
    const sheet = fs.readdirSync(path.join(tmp, 'out')).find((f) => /^sheet_32x1_\d+x\d+\.png$/.test(f));
    const ms = Number((out.match(/ms per frame (\d+)/) || [])[1]);
    const loopLen = (out.match(/len ([\d.]+)s/) || [])[1];
    if (!sheet || !ms) throw new Error('สคริปต์ตัดเฟรมไม่ได้ผลลัพธ์ครบ');
    const warn = clipWarnings(out + ' ' + sheet);
    job.step = 'กำลังใส่เฟรมและตั้งเงา';
    const addOut = await runPy([ADD_PY, id, path.join(tmp, 'out', sheet), String(ms), '--form', String(form), '--move', move,
      '--note', `จากวิดีโอ ${rid} · ลูป ${loopLen} วิ${warn.length ? ' · มีคำเตือน' : ''}`, ...(readHub().items[id]?.rounds.find((x) => x.id === rid)?.flip ? ['--flip'] : [])], process.env.HUB_ROOT ? { HUB_ROOT: ROOT } : {});
    const newRound = (addOut.match(/frames round (r[0-9a-f]+)/) || [])[1];
    const [fw, fh] = sheet.match(/(\d+)x(\d+)\.png$/).slice(1);
    const reply = [`ตัดแล้ว 32 เฟรม (${fw}×${fh}) ลูป ${loopLen} วิ · ${ms} ms ต่อเฟรม · ตั้งเงาบนเฟรมชุดใหม่แล้ว (ค่าวงเงา/เงาตามตัวเดิมเก็บไว้)`,
      ...(warn.length ? warn.map((x) => '⚠ ' + x) : ['ไม่พบปัญหาจากตัวเลข (เท้าไม่ขยับ ตัวไม่ชนขอบ) — ยังควรเปิดดูด้วยตา'])].join('\n');
    const hub = readHub();
    hub.queue.push({ id: 'q' + crypto.randomBytes(4).toString('hex'), item: id, task: 'frames+shadow', by: 'auto', video: rid, round: newRound, step: 'frames', form, move,
      t: job.t, done: today(), text: `ตัดเฟรม + สร้างเงา: ร่าง ${form} (โปรแกรมทำเอง)`, state: 'done', reply });
    hub.rev += 1;
    writeHub(hub);
    Object.assign(job, { state: 'done', step: '', msg: reply, round: newRound, warn: warn.length });
  } catch (e) {
    Object.assign(job, { state: 'error', step: '', msg: String(e.message || e).slice(0, 400) });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

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
      if (r.flip != null && typeof r.flip !== 'boolean') err.push(`${id}: flip must be true/false`);
    }
    if (it.thumb != null && (typeof it.thumb !== 'string' || !ID_RE.test(it.thumb))) err.push(`${id}: bad thumb`);
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
      oval: { dx: num(o.dx, -1, 1, 0), dy: num(o.dy, -1, 1, 0), w: num(o.w, 0.1, 2, 0.8), h: num(o.h, 0.05, 2, 0.45), a: 0 }, // under-feet oval always off (owner rule) = strength 0 in the game
      cast: { len: num(c.len, 0, 2, 1), str: num(c.str, 0, 1, 0.5), ox: num(c.ox, -1, 1, 0), oy: num(c.oy, -1, 1, 0), blur: num(c.blur, 0, 1, 0.3),
        k: Object.fromEntries(['tl', 'tr', 'bl', 'br'].map((q) => [q, Array.isArray(c.k?.[q]) ? [num(c.k[q][0], -3, 3, 0), num(c.k[q][1], -3, 3, 0)] : [0, 0]])) },
    };
  }
  return {
    v: 1,
    note: 'Written by tools/asset-hub (set 240). feet = image fraction (0..1, y down) of the sprite picture the owner set it on; size = that picture in px (the game applies feet only when its texture has the same size). oval = tile units around the feet. cast = shadow that follows the body: len (x height x sun reach), str, ox/oy start offset in tile units; blur = softness (x 0.12 of the picture height, blurred once); k = per-corner offsets [x, z] in tile units of the shadow quad (tl/tr = head end, bl/br = feet end); sun = ground direction [x, z] shared by every unit (r38 port).',
    lift: num(hub.settings?.shadowLift, 0, 0.5, 0.065),
    sun: (() => { const d = num(hub.settings?.sunAngle, -180, 180, -37.4) * Math.PI / 180; return [+Math.cos(d).toFixed(4), +Math.sin(d).toFixed(4)]; })(),
    default: { feet: [0.5, 1], oval: { dx: 0, dy: 0, w: 0.8, h: 0.45, a: 0 }, cast: { len: 1, str: 0.5, ox: 0, oy: 0, blur: 0.3, k: { tl: [0, 0], tr: [0, 0], bl: [0, 0], br: [0, 0] } } },
    units,
  };
}

function doExport(hub) {
  const out = shadowExport(hub);
  fs.writeFileSync(SHADOW_OUT, JSON.stringify(out, null, 1) + '\n');
  return { file: path.relative(ROOT, SHADOW_OUT).replaceAll('\\', '/'), units: Object.keys(out.units).length };
}

// ---------- one ★ per slot (owner set 241) ----------
// rounds of the same slot + form + move share one ★; "file" (other files) keeps several
function starOnly(it, r) {
  if (r.slot === 'file') return;
  for (const x of it.rounds) if (x !== r && x.slot === r.slot && (x.form || 1) === (r.form || 1) && (x.move || '') === (r.move || '')) x.star = false;
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
  if (req.method === 'GET' && u.pathname === '/api/job') return send(res, 200, job || {});

  if (req.method === 'POST' && u.pathname === '/api/frames') {
    // runs local programs: demand our own page's Origin (a POST with no Origin is refused here, unlike the file APIs)
    if (req.headers.origin !== `http://127.0.0.1:${PORT}` && req.headers.origin !== `http://localhost:${PORT}`) return send(res, 403, { error: 'origin' });
    if (job?.state === 'run') return send(res, 409, { error: 'มีงานตัดเฟรมทำอยู่แล้ว รอให้เสร็จก่อน' });
    const id = u.searchParams.get('item') || '', rid = u.searchParams.get('round') || '', form = Number(u.searchParams.get('form') || 1), move = u.searchParams.get('move') || 'idle';
    if (!ID_RE.test(id) || !ID_RE.test(rid) || ![1, 3].includes(form) || !ID_RE.test(move)) return send(res, 400, { error: 'bad fields' });
    const r = readHub().items[id]?.rounds.find((x) => x.id === rid);
    if (!r || r.slot !== 'video' || !String(r.file).startsWith('hub/')) return send(res, 404, { error: 'ไม่มีวิดีโอนี้' });
    job = { item: id, round: rid, form, move, state: 'run', step: 'เริ่ม', msg: '', t: new Date().toISOString() };
    runFrames(id, rid, form, move);
    return send(res, 202, job);
  }

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
    const from = u.searchParams.get('from') || '';
    if ((from && !ID_RE.test(from)) || !ID_RE.test(id) || !SLOTS.includes(slot) || !EXT[ext] || ![0, 1, 3].includes(form) || (move && !ID_RE.test(move))) return send(res, 400, { error: 'bad upload fields' });
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
      from: from && it.rounds.some((x) => x.id === from) ? from : undefined, // cut made from this still (ตัดพื้น button)
    };
    if (slot !== 'file') { starOnly(it, r); r.star = true; } // owner A1 (set 241): newest upload = ★ used; art/library copy waits for a manual ★ or the Godot export
    it.rounds.push(r);
    hub.rev += 1;
    writeHub(hub);
    return send(res, 200, hub);
  }

  // owner "ลบ" button: drop an unstarred round and its hub file; art/library copies are never deleted (set 221)
  if (req.method === 'POST' && u.pathname === '/api/delete') {
    const hub = readHub();
    const it = hub.items[u.searchParams.get('item') || ''];
    const i = it ? it.rounds.findIndex((x) => x.id === u.searchParams.get('round')) : -1;
    if (i < 0) return send(res, 404, { error: 'no such round' });
    const r = it.rounds[i];
    if (r.star) return send(res, 400, { error: 'รอบที่เลือก ★ อยู่ลบไม่ได้ เลิกเลือกก่อน' });
    it.rounds.splice(i, 1);
    const shared = Object.values(hub.items).some((x) => x.rounds.some((y) => y.file === r.file));
    if (!shared && String(r.file).startsWith('hub/')) {
      const f = path.resolve(FILES, r.file.slice(4));
      if (f.startsWith(path.resolve(FILES) + path.sep) && fs.existsSync(f)) fs.unlinkSync(f);
    }
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
    if (r.star) starOnly(it, r);
    if (r.star && !r.library) r.library = starToLibrary(hub, it, r);
    hub.rev += 1;
    writeHub(hub);
    return send(res, 200, hub);
  }

  if (req.method === 'POST' && u.pathname === '/api/export') { // also files every ★ round not yet in art/library (auto ★ after upload, owner A1 set 241)
    const hub = readHub();
    let n = 0;
    for (const it of Object.values(hub.items)) for (const r of it.rounds) if (r.star && !r.archived && !r.library) { r.library = starToLibrary(hub, it, r); n++; }
    if (n) { hub.rev += 1; writeHub(hub); }
    return send(res, 200, { ...doExport(hub), library: n });
  }
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
