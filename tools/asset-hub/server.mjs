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
// game data shown read-only on the still step (owner set 248 round 4): always the repo's own files, never ROOT
const GAME_JSON = path.resolve(HERE, '..', '..', 'godot', 'data', 'game.json');
const LABELS_JSON = path.resolve(HERE, '..', '..', 'godot', 'data', 'labels.json');
const NAME_MAX = 24;
const PORT = Number(process.env.HUB_PORT || 5177);

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/;
const EXT = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif',
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
  glb: 'model/gltf-binary', pxo: 'application/octet-stream', txt: 'text/plain; charset=utf-8',
};
const PAGE = { '/': 'index.html', '/app.js': 'app.js', '/style.css': 'style.css', '/pick': 'pick.html', '/pick.js': 'pick.js' };
// still batch picker (owner A2, set 260): batches stay OUTSIDE the repo (style.png = outside sprite, security.md part 2);
// picks are saved in the repo so Claude reads them (latest.json) + every change kept (history.jsonl).
const STILL_BATCHES = process.env.STILL_BATCHES ? path.resolve(process.env.STILL_BATCHES) : path.resolve(HERE, '..', '..', '..', 'automon-scratch', 'still-batches');
const PICKS_DIR = path.join(HUB_DIR, 'stillpicks');
const SLOTS = ['still', 'cut', 'veoin', 'video', 'frames', 'file', 'icon']; // icon = diamond crop for the shop / bench (set 246)
const MAX_UPLOAD = 600 * 1024 * 1024;
const LICENCE_DEFAULT = 'AI placeholder - UNVERIFIED';
// owner A1 (set 240 follow-up): the "ตัดเฟรม + สร้างเงา" button runs Claude's two scripts here, no chat needed.
// Scripts come from the repo next to this file (never from ROOT / art data); fixed argument lists, no shell.
const IDLE_PY = path.resolve(HERE, '..', '..', '.claude', 'skills', 'char-idle', 'painted_idle.py');
const ADD_PY = path.join(HERE, 'hub_add.py');
const PYTHON = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');

// ---------- auto frames + shadow (one job at a time) ----------
let job = null; // { item, round, state: 'run' | 'done' | 'error', step, msg, t }

const EXPORT_FREE_POS = false; // owner set 262 D1 (was true sets 246-261)
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
// display name for Godot: no control characters, trimmed, at most NAME_MAX characters
const cleanName = (v) => (typeof v === 'string' ? [...v.replace(/[\u0000-\u001f\u007f]/g, '').trim()].slice(0, NAME_MAX).join('') : '');

// ---------- game names + skill texts (read-only, owner set 248 round 4) ----------
let gameInfoCache = null;
function gameInfo() {
  if (gameInfoCache) return gameInfoCache;
  const out = {};
  try {
    const g = JSON.parse(fs.readFileSync(GAME_JSON, 'utf8')), lb = JSON.parse(fs.readFileSync(LABELS_JSON, 'utf8'));
    for (const c of g.derived?.characters || []) {
      if (!ID_RE.test(c.id)) continue;
      const sk = Array.isArray(lb.skills?.[c.id]) ? lb.skills[c.id] : [];
      out[c.id] = { name: str(c.name, 80), tribe: str(c.tribe, 40), rarity: str(c.rarity, 40),
        skills: sk.map((x) => (Array.isArray(x?.text) ? x.text.slice(0, 3).map((t) => str(t, 400)) : [])).filter((t) => t.length) };
    }
  } catch { /* data missing: the page shows no skills */ }
  return (gameInfoCache = out);
}

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
    if (it.name != null && (typeof it.name !== 'string' || [...it.name].length > NAME_MAX)) err.push(`${id}: name must be text, at most ${NAME_MAX} characters`);
    for (const key of ['shadow', 'shadow3']) { // set 267 A1/C1: shadow3 = form 3, same shape
      const s = it[key];
      if (s && (!Array.isArray(s.feet) || s.feet.length !== 2)) err.push(`${id}: ${key}.feet must be [x, y]`);
      if (s?.frames != null && (typeof s.frames !== 'object' || Array.isArray(s.frames) || Object.entries(s.frames).some(([k, v]) => !/^\d{1,3}$/.test(k) || !v || !Array.isArray(v.feet) || v.feet.length !== 2 || !v.feet.every(Number.isFinite)))) err.push(`${id}: ${key}.frames must be {frame: {feet: [x, y], cast}}`);
    }
    const br = it.brief; // owner set 258
    if (br != null) {
      if (typeof br !== 'object' || Array.isArray(br)) err.push(`${id}: brief must be an object`);
      else {
        for (const k of ['concept', 'idle']) { const b = br[k]; if (b != null && (typeof b !== 'object' || (b.th != null && (typeof b.th !== 'string' || b.th.length > 4000)) || (b.ok != null && typeof b.ok !== 'boolean'))) err.push(`${id}: brief.${k} must be {th: text, ok: true/false}`); }
        if (br.used != null && (!Array.isArray(br.used) || br.used.some((u) => !u || !['concept', 'idle'].includes(u.kind) || typeof u.en !== 'string' || u.en.length > 4000))) err.push(`${id}: brief.used must be [{kind, en}]`);
      }
    }
    if (it.palette != null && (!Array.isArray(it.palette) || it.palette.length > 64 || it.palette.some((c) => typeof c !== 'string' || !/^#[0-9a-f]{6}$/.test(c)))) err.push(`${id}: palette must be up to 64 colours '#rrggbb'`); // owner set 262
    const sc = it.scale;
    if (it.free != null && typeof it.free !== 'boolean') err.push(`${id}: free must be true/false`);
    const of = it.offset;
    if (of != null && (typeof of !== 'object' || !Number.isFinite(of.x) || !Number.isFinite(of.y))) err.push(`${id}: offset must be {x, y}`);
    if (it.rot != null && (!Number.isFinite(it.rot) || it.rot < -180 || it.rot > 180)) err.push(`${id}: rot must be a number -180..180`);
    for (const [key, v] of [['scale', sc], ['scale3', it.scale3]]) if (v != null && (typeof v !== 'object' || typeof v.k !== 'number' || !Number.isFinite(v.k) || v.k <= 0 || v.k > 8)) err.push(`${id}: ${key}.k must be a number 0..8`);
  }
  const tm = h.settings?.team;
  if (tm != null && (typeof tm !== 'object' || !Array.isArray(tm.ids) || tm.ids.length !== 6 || tm.ids.some((x) => x !== '' && !ID_RE.test(x)))) err.push('settings.team.ids must be 6 ids');
  if (tm?.forms != null && (!Array.isArray(tm.forms) || tm.forms.length !== 6 || tm.forms.some((f) => f !== 1 && f !== 3))) err.push('settings.team.forms must be 6 numbers, 1 or 3'); // set 267 B1
  return err;
}

// ---------- godot export (E1: feet + oval + cast; A1: one oval) ----------
export function shadowExport(hub) {
  const units = {}, scale = {}, names = {}, units_f3 = {}, scale_f3 = {};
  function unitOf(it, form) { // set 267 C1: one shadow per form (shadow = form 1, shadow3 = form 3)
      const s = it[form === 3 ? 'shadow3' : 'shadow'], o = s.oval || {}, c = s.cast || {};
      const castOf = (cc) => ({ len: num(cc.len, 0, 2, 1), str: num(cc.str, 0, 1, 0.5), ox: num(cc.ox, -1, 1, 0), oy: num(cc.oy, -1, 1, 0), blur: num(cc.blur, 0, 1, 0.3),
        k: Object.fromEntries(['tl', 'tr', 'bl', 'br'].map((q) => [q, Array.isArray(cc.k?.[q]) ? [num(cc.k[q][0], -3, 3, 0), num(cc.k[q][1], -3, 3, 0)] : [0, 0]])) });
      const perFrame = s.frames && typeof s.frames === 'object' ? Object.entries(s.frames).filter(([k, v]) => /^\d{1,3}$/.test(k) && Array.isArray(v?.feet)) : [];
      return {
        mirror: !!usedPicS(it, form)?.flip, // set 248: true = our side shows the picture mirrored, the way the hub still step shows it (enemy = the other way); feet stay file fractions, cast ox / k are in the shown view
        ...(perFrame.length ? { frames: Object.fromEntries(perFrame.map(([k, v]) => [k, { feet: [num(v.feet[0], 0, 1, 0.5), num(v.feet[1], 0, 1, 1)], cast: castOf({ ...c, ...(v.cast || {}) }) }])) } : {}), // owner set 248 B: frame i of the idle sheet has its own shadow
        feet: [num(s.feet?.[0], 0, 1, 0.5), num(s.feet?.[1], 0, 1, 1)],
        size: Array.isArray(s.size) ? [Math.round(num(s.size[0], 1, 8192, 1)), Math.round(num(s.size[1], 1, 8192, 1))] : [0, 0],
        oval: { dx: num(o.dx, -1, 1, 0), dy: num(o.dy, -1, 1, 0), w: num(o.w, 0.1, 2, 0.8), h: num(o.h, 0.05, 2, 0.45), a: 0 }, // under-feet oval always off (owner rule) = strength 0 in the game
        cast: { len: num(c.len, 0, 2, 1), str: num(c.str, 0, 1, 0.5), ox: num(c.ox, -1, 1, 0), oy: num(c.oy, -1, 1, 0), blur: num(c.blur, 0, 1, 0.3),
          k: Object.fromEntries(['tl', 'tr', 'bl', 'br'].map((q) => [q, Array.isArray(c.k?.[q]) ? [num(c.k[q][0], -3, 3, 0), num(c.k[q][1], -3, 3, 0)] : [0, 0]])) },
      };
  }
  for (const it of Object.values(hub.items)) {
    if (it.kind === 'character' && cleanName(it.name)) names[it.id] = cleanName(it.name); // owner set 248 round 4 (A1 + B1): Godot shows this name
    if (it.kind === 'character' && it.scale && typeof it.scale === 'object') { // set 246 team tab: screen px per picture px in the 1920x1061 battle view
      const sz = it.scale.size;
      scale[it.id] = { k: num(it.scale.k, 0.05, 8, 1), size: Array.isArray(sz) ? [Math.round(num(sz[0], 1, 8192, 1)), Math.round(num(sz[1], 1, 8192, 1))] : [0, 0] };
    }
    // owner set 262 D1: the team tab only sets the size now; dragged / turned positions (offset, rot) stay in hub.json but are not exported
    if (EXPORT_FREE_POS && it.kind === 'character' && it.free === true && it.offset && typeof it.offset === 'object') { // unlocked creature (owner A1): screen px in the 1920x1061 view, x toward the foe, y down (up = floating)
      (scale[it.id] ||= { k: 0, size: [0, 0] }).offset = [Math.round(num(it.offset.x, -400, 400, 0)), Math.round(num(it.offset.y, -300, 300, 0))];
    }
    if (EXPORT_FREE_POS && it.kind === 'character' && it.free === true && Number.isFinite(it.rot) && it.rot) { // unlocked creature turned (owner B1/C1 set 247): degrees clockwise on screen, around the feet
      (scale[it.id] ||= { k: 0, size: [0, 0] }).rot = Math.round(num(it.rot, -180, 180, 0));
    }
    if (it.kind !== 'character') continue;
    if (it.scale3 && typeof it.scale3 === 'object') { const sz = it.scale3.size; scale_f3[it.id] = { k: num(it.scale3.k, 0.05, 8, 1), size: Array.isArray(sz) ? [Math.round(num(sz[0], 1, 8192, 1)), Math.round(num(sz[1], 1, 8192, 1))] : [0, 0] }; } // set 267 B1: form-3 size
    if (it.shadow) units[it.id] = unitOf(it, 1);
    if (it.shadow3) units_f3[it.id] = unitOf(it, 3);
  }
  return {
    v: 1,
    note: 'Written by tools/asset-hub (set 240). feet = image fraction (0..1, y down) of the sprite picture the owner set it on; size = that picture in px (the game applies feet only when its texture has the same size). oval = tile units around the feet. cast = shadow that follows the body: len (x height x sun reach), str, ox/oy start offset in tile units; blur = softness (x 0.12 of the picture height, blurred once); k = per-corner offsets [x, z] in tile units of the shadow quad (tl/tr = head end, bl/br = feet end); sun = ground direction [x, z] shared by every unit (r38 port).',
    lift: num(hub.settings?.shadowLift, 0, 0.5, 0.065),
    sun: (() => { const d = num(hub.settings?.sunAngle, -180, 180, -37.4) * Math.PI / 180; return [+Math.cos(d).toFixed(4), +Math.sin(d).toFixed(4)]; })(),
    default: { feet: [0.5, 1], oval: { dx: 0, dy: 0, w: 0.8, h: 0.45, a: 0 }, cast: { len: 1, str: 0.5, ox: 0, oy: 0, blur: 0.3, k: { tl: [0, 0], tr: [0, 0], bl: [0, 0], br: [0, 0] } } },
    units,
    scale_note: 'set 246 asset-hub team tab: k = screen px per picture px when the battle view is 1061 px tall (Godot: pixel_size = k x world size of one screen px at the battle camera); size = the picture it was set on (apply only when the texture has the same size); k 0 = no size set (keep the default); creatures stand on their slot centre (feet = units[ID].feet, shared with the shadow) (set 262 D1: offset / rot no longer exported, every creature stands on its slot centre); old: offset = [x toward the foe, y down] screen px from the slot centre, only for unlocked creatures (negative y = floating); rot = degrees clockwise on screen around the feet, only for unlocked creatures (set 247). Not read by the game yet (r38 port).',
    scale,
    f3_note: 'set 267: units_f3 / scale_f3 = the same values for form 3 (ร่าง 3) pictures, set in the hub shadow tab / team tab with ร่าง 3 picked; form 1 stays in units / scale.',
    units_f3,
    scale_f3,
    names_note: 'set 248 asset-hub still step: display name per creature; Godot uses it in place of the game.json name (screens + messages), the save data hash stays on the game.json names.',
    names,
  };
}

function doExport(hub) {
  const out = shadowExport(hub);
  fs.writeFileSync(SHADOW_OUT, JSON.stringify(out, null, 1) + '\n');
  return { file: path.relative(ROOT, SHADOW_OUT).replaceAll('\\', '/'), units: Object.keys(out.units).length, names: Object.keys(out.names).length };
}

// ---------- one ★ per slot (owner set 241) ----------
// rounds of the same slot + form + move share one ★; "file" (other files) keeps several
// owner set 248 A1: for creatures the original stills and their cuts share ONE ★ = the picture every page and the game use
const starGroup = (it, slot) => (it.kind === 'character' && (slot === 'still' || slot === 'cut') ? 'pic' : slot);
function starOnly(it, r) {
  if (r.slot === 'file') return;
  const g = starGroup(it, r.slot);
  for (const x of it.rounds) if (x !== r && starGroup(it, x.slot) === g && (x.form || 1) === (r.form || 1) && (x.move || '') === (r.move || '')) x.star = false;
}
function usedPicS(it, form = 1) { // same rule as usedPic in app.js
  const rs = it.rounds.filter((r) => (r.slot === 'still' || r.slot === 'cut') && !r.archived && (r.form || 1) === form).sort((a, b) => String(a.t || '').localeCompare(String(b.t || '')));
  const st = rs.filter((r) => r.star).pop();
  if (st) return st;
  const still = rs.filter((r) => r.slot === 'still').pop();
  return (still && rs.filter((r) => r.slot === 'cut' && r.from === still.id).pop()) || still || rs.pop() || null;
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


// ---------- still batch picker (set 260) ----------
const BATCH_PIC = /^(g\d\d|style|sheet)\.png$/;
function readJson(p, dflt) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return dflt; } }
function stillBatches() {
  if (!fs.existsSync(STILL_BATCHES)) return [];
  // set 265 (owner I1): pictures already added to the hub (round meta.batch ends with _<job8>, meta.pick = gNN) show first on /pick
  const added = new Map(), hubItems = readHub().items || {};
  // set 265 (owner): a form-3 batch shows its creature's ★ form-1 still next to the style ref
  const f1Still = (id) => { const r = (hubItems[id]?.rounds || []).find((x) => x.slot === 'still' && x.star && !x.archived && (x.form || 1) === 1); return r ? r.file : ''; };
  for (const it of Object.values(hubItems)) for (const r of it.rounds || []) {
    const mb = r.meta && typeof r.meta.batch === 'string' ? /_([0-9a-f]{8})$/.exec(r.meta.batch) : null;
    if (mb && typeof r.meta.pick === 'string') { if (!added.has(mb[1])) added.set(mb[1], new Set()); added.get(mb[1]).add(r.meta.pick); }
  }
  return fs.readdirSync(STILL_BATCHES, { withFileTypes: true }).filter((d) => d.isDirectory() && ID_RE.test(d.name)).map((d) => {
    const dir = path.join(STILL_BATCHES, d.name);
    const pics = fs.readdirSync(dir).filter((n) => /^g\d\d\.png$/.test(n)).sort().map((n) => n.slice(0, -4));
    if (!pics.length) return null;
    const m = readJson(path.join(dir, 'batch.json'), {}), req = readJson(path.join(dir, 'request.json'), {});
    // set 265 (owner): a batch made for one creature (batch.json item + form, e.g. a form-3 batch) locks its ID on /pick
    const item = typeof m.item === 'string' && ID_RE.test(m.item) ? m.item : '';
    return { key: d.name, tribe: String(m.tribe || ''), desc: String(req.description || ''), styleSrc: String(m.style_src || ''),
      note: String(m.note || ''), seed: String(m.seed || ''), style: fs.existsSync(path.join(dir, 'style.png')), pics,
      item, form: m.form === 3 ? 3 : 1, f1: item && m.form === 3 ? f1Still(item) : '', inHub: pics.filter((n) => (added.get(String(m.job || '').slice(0, 8)) || new Set()).has(n)) };
  }).filter(Boolean).sort((a, b) => a.tribe.localeCompare(b.tribe) || a.key.localeCompare(b.key));
}
function readPicks() { return readJson(path.join(PICKS_DIR, 'latest.json'), { rev: 0, t: '', batches: {} }); }
function validatePicks(body, batches) {
  if (!body || typeof body !== 'object' || typeof body.batches !== 'object' || Array.isArray(body.batches)) return 'bad body';
  const known = new Map(batches.map((b) => [b.key, b]));
  const out = {};
  for (const [k, v] of Object.entries(body.batches)) {
    const b = known.get(k);
    if (!b) return 'unknown batch ' + String(k).slice(0, 40);
    if (!v || typeof v !== 'object') return 'bad entry ' + k;
    const id = b.item || (v.id ?? ''); // locked batch: always its own creature
    if (typeof id !== 'string' || (id && !ID_RE.test(id))) return 'bad id ' + k;
    if (!Array.isArray(v.pick) || v.pick.length > 25 || !v.pick.every((p) => typeof p === 'string' && b.pics.includes(p))) return 'bad pick ' + k;
    out[k] = { id, form: b.form, pick: [...new Set(v.pick)].sort(), eye: v.eye === true, hidden: v.hidden === true, closed: v.closed === true };
  }
  return out;
}
const pickLine = (b) => Object.entries(b).filter(([, v]) => !v.hidden).map(([k, v]) => `${k}>${v.id || '?'}:${v.pick.join(',') || '-'}:${v.eye ? 'ok' : 'no'}`).sort().join(' ');
function savePicks(body) {
  const batches = stillBatches();
  const clean = validatePicks(body, batches);
  if (typeof clean === 'string') return { code: 400, obj: { error: clean } };
  const cur = readPicks();
  if (body.rev !== cur.rev) return { code: 409, obj: { error: 'changed elsewhere', picks: cur } };
  const t = new Date().toISOString();
  const next = { rev: cur.rev + 1, t, batchDir: STILL_BATCHES, batches: clean };
  fs.mkdirSync(PICKS_DIR, { recursive: true });
  const lf = path.join(PICKS_DIR, 'latest.json');
  fs.writeFileSync(lf + '.tmp', JSON.stringify(next, null, 1) + '\n');
  fs.renameSync(lf + '.tmp', lf);
  // history: one line per change of the picks (ids / ★ / eye / hidden); fold/unfold only is not history
  const hf = path.join(PICKS_DIR, 'history.jsonl');
  const line = pickLine(clean);
  const lines = fs.existsSync(hf) ? fs.readFileSync(hf, 'utf8').split('\n').filter(Boolean) : [];
  const last = lines.length ? readJsonLine(lines[lines.length - 1]) : null;
  if (!last || last.line !== line) {
    const summary = Object.fromEntries(Object.entries(clean).filter(([, v]) => !v.hidden).map(([k, v]) => [k, { id: v.id, pick: v.pick, eye: v.eye }]));
    fs.appendFileSync(hf, JSON.stringify({ t, rev: next.rev, line, picks: summary }) + '\n');
  }
  return { code: 200, obj: next };
}
function readJsonLine(l) { try { return JSON.parse(l); } catch { return null; } }

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
  if (req.method === 'GET' && u.pathname === '/api/game') return send(res, 200, gameInfo());
  if (req.method === 'GET' && u.pathname === '/api/stillbatches') return send(res, 200, { dir: STILL_BATCHES, batches: stillBatches(), items: Object.entries(readHub().items).map(([id, v]) => ({ id, name: v.name || '', tribe: v.tribe || '' })) });
  if (req.method === 'GET' && u.pathname === '/api/stillpicks') return send(res, 200, readPicks());
  if (req.method === 'GET' && u.pathname.startsWith('/sb/')) { // batch pictures from the outside folder (never copied into the repo)
    const [k, n, extra] = u.pathname.slice(4).split('/');
    if (extra !== undefined || !ID_RE.test(k || '') || !BATCH_PIC.test(n || '')) return send(res, 400, { error: 'bad path' });
    return sendFile(req, res, path.join(STILL_BATCHES, k, n));
  }
  if (req.method === 'POST' && u.pathname === '/api/stillpicks') {
    if (req.headers.origin !== `http://127.0.0.1:${PORT}` && req.headers.origin !== `http://localhost:${PORT}`) return send(res, 403, { error: 'origin' });
    const r = savePicks(JSON.parse((await readBody(req, 2e5)).toString('utf8')));
    return send(res, r.code, r.obj);
  }

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
    if (slot !== 'file' && u.searchParams.get('nostar') !== '1') { starOnly(it, r); r.star = true; } // nostar=1: web pixel-editor saves wait for the owner's ★ // owner A1 (set 241): newest upload = ★ used; art/library copy waits for a manual ★ or the Godot export
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
