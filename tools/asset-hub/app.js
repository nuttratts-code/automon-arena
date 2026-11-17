// Automon asset hub page (set 240). Plain DOM, textContent only (HARD RULE 7), no outside scripts.
'use strict';

const TRIBES = [
  ['steel', 'เหล็กกล้า'], ['fire', 'เพลิงเผา'], ['storm', 'สายฟ้า'], ['wind', 'วายุ'], ['spirit', 'ภูติ'], ['demon', 'อสูร'],
];
const TRIBE_TH = Object.fromEntries(TRIBES);
const KIND_TH = { character: 'ตัวละคร', scene: 'ฉาก', prop3d: 'โมเดล 3D', effect: 'เอฟเฟกต์', ui: 'UI' };
const STATUS = [
  ['none', 'ยังไม่เริ่ม'], ['wait-still', 'รอภาพนิ่ง'], ['pick', 'รอเลือกภาพ'], ['wait-video', 'รอวิดีโอ'],
  ['claude', 'รอ Claude ทำเฟรม'], ['done', 'เฟรมเสร็จ'], ['ingame', 'อยู่ในเกมแล้ว'],
];
const STATUS_TH = Object.fromEntries(STATUS);
const TASK_TH = { 'frames+shadow': 'ตัดเฟรม + สร้างเงา', 'check+veo': 'ตรวจภาพ + เขียนพรอมต์วิดีโอ' };
const taskTh = (q) => TASK_TH[q.task] || 'งานอื่น';
// what the owner does once Claude has finished, per task
const NEXT_TH = { 'frames+shadow': 'ถึงตาคุณ: เปิดขั้น "เฟรม" ติดดาวถ้าโอเค แล้วเปิดขั้น "เงา" ปรับต่อ',
  'check+veo:pass': 'ถึงตาคุณ: เปิดช่อง 4 "ภาพส่ง Veo" ดาวน์โหลดภาพ + คัดลอกพรอมต์วิดีโอ ไปเจนใน Veo แล้ววางวิดีโอในขั้น "วิดีโอ" ติดดาว แล้วกด "ตัดเฟรม + สร้างเงา"',
  'check+veo:fail': 'ถึงตาคุณ: เปิดขั้น "พรอมต์" คัดลอกรุ่นที่ Claude แก้ไปเจนภาพใหม่ วางในขั้น "ภาพนิ่ง" แล้วส่งตรวจอีกครั้ง' };
const nextTh = (q) => NEXT_TH[q.task === 'check+veo' ? `${q.task}:${q.result || 'pass'}` : q.task] || '';
const veoPrompt = (it, form) => it.prompts.filter((p) => p.kind === 'veo' && (p.form || 1) === form).pop();
// owner flow (set 240): still → "ส่งให้ Claude ตรวจ" → Claude checks the rules → pass: cut (3) + Veo input (4) + Veo prompt · fail: reasons + fixed Gemini prompt
function sendCheck(it, still) {
  hub.queue.push({ id: uid('q'), item: it.id, task: 'check+veo', still: still.id, step: 'still', form: ui.form, t: new Date().toISOString(),
    text: `ตรวจภาพนิ่งร่าง ${ui.form} (${fmtDate(still.t)}) ตามกฎ ถ้าผ่าน ตัดพื้น + ทำภาพส่ง Veo + เขียนพรอมต์วิดีโอ`, state: 'open', reply: '' });
  save().then(() => { toast('ส่งแล้ว พิมพ์ "ดูคิว" ในแชทให้ Claude ตรวจ'); render(); });
}
function checkBar(it) {
  const st = pick(it, 'still', ui.form) || latest(it, 'still', ui.form), waiting = openJobs(it.id).some((q) => q.task === 'check+veo');
  return h('div', { class: 'tools' },
    h('button', { class: 'primary', disabled: !st || waiting, onclick: () => sendCheck(it, st) }, 'ส่งให้ Claude ตรวจ + เขียนพรอมต์วิดีโอ'),
    h('span', { class: 'small dim' }, waiting ? 'ส่งแล้ว รอ Claude (พิมพ์ "ดูคิว" ในแชท)' : st ? `จะส่งภาพ${st.star ? 'ที่ติดดาว' : 'ล่าสุด'} (${fmtDate(st.t)}) · ผ่าน = ได้ภาพตัดพื้น + ภาพส่ง Veo + พรอมต์วิดีโอ · ไม่ผ่าน = เหตุผล + พรอมต์ Gemini รุ่นแก้` : 'วางภาพนิ่งก่อน ปุ่มนี้จึงจะกดได้'));
}
function veoPanel(it) {
  const p = veoPrompt(it, ui.form), pic = pick(it, 'veoin', ui.form) || latest(it, 'veoin', ui.form);
  const box = h('div', { class: 'panel', style: 'margin-bottom:12px' }, h('h3', { style: 'margin-top:0' }, `พรอมต์วิดีโอ (Veo) ร่าง ${ui.form}`));
  if (!p && !pic) { box.append(h('p', { class: 'dim small' }, 'ยังไม่มี — วางภาพนิ่งแล้วกด "ส่งให้ Claude ตรวจ + เขียนพรอมต์วิดีโอ" ในขั้นภาพนิ่ง')); return box; }
  box.append(h('div', { class: 'tools' },
    pic ? h('a', { class: 'btn primary', href: fileUrl(pic.file), download: `${it.id}_veo_input_f${ui.form}.png` }, 'ดาวน์โหลดภาพส่ง Veo') : null,
    p ? h('button', { class: 'primary', onclick: () => copy(p.text) }, 'คัดลอกพรอมต์วิดีโอ') : null,
    h('span', { class: 'small dim' }, 'ตั้งค่า Veo: 3.1 · Frames · 16:9 · 1080p · อัปโหลดภาพนี้ ไม่ใช่ภาพต้นฉบับ')));
  if (p) box.append(h('pre', { class: 'prompt' }, p.text), h('p', { class: 'small faint' }, `Claude เขียน ${fmtDate(p.t)} จากภาพนิ่งที่ตรวจผ่าน`));
  return box;
}
const openJobs = (id) => (hub.queue || []).filter((q) => q.item === id && q.state === 'open');
// owner A1: "ตัดเฟรม + สร้างเงา" runs on this computer right away (server calls Claude's scripts), no chat needed
let job = {};
async function pollJob() {
  const was = job.state;
  try { job = await api('/api/job'); } catch { return; }
  if (job.state === 'run') { if (was !== 'run') render(); else { const st = document.getElementById('jobStep'); if (st) st.textContent = job.step || ''; } setTimeout(pollJob, 1000); return; }
  if (was === 'run') {
    try { hub = await api('/api/hub'); } catch {}
    if (job.state === 'done') { ui.item = job.item; ui.step = 'frames'; ui.form = job.form || 1; ui.move = job.move || 'idle'; ui.sel = job.round || null; toast(job.warn ? 'ตัดเฟรมเสร็จ มีคำเตือน ดูแถบด้านบน' : 'ตัดเฟรมเสร็จ'); }
    else toast('ตัดเฟรมไม่สำเร็จ: ' + job.msg);
    render();
  }
}
async function startFrames(it, vid) {
  try { job = await api(`/api/frames?item=${encodeURIComponent(it.id)}&round=${encodeURIComponent(vid.id)}&form=${ui.form}&move=${encodeURIComponent(ui.move)}`, { method: 'POST' }); }
  catch (e) { toast(e.message); return; }
  render(); setTimeout(pollJob, 1000);
}
function autoFramesBar(it) {
  const vid = pick(it, 'video', ui.form, ui.move), busy = job.state === 'run';
  return h('div', { class: 'tools' },
    h('button', { class: 'primary', disabled: !vid || busy, onclick: () => startFrames(it, vid) }, 'ตัดเฟรม + สร้างเงา'),
    h('span', { class: 'small dim' }, busy ? 'กำลังทำงานอยู่ รอสักครู่' : vid ? `โปรแกรมจะแตกวิดีโอที่ติดดาว (ร่าง ${ui.form} ท่า${moveTh(ui.move)}) เป็น 32 เฟรม แล้ววางเงาบนเฟรมชุดใหม่ให้เอง ~10–60 วิ` : 'ติดดาววิดีโอของร่าง/ท่านี้ในขั้น "วิดีโอ" ก่อน ปุ่มนี้จึงจะกดได้'));
}
const STEPS = [
  ['prompt', 'พรอมต์', 'คุณคัดลอกไปเจน'],
  ['still', 'ภาพนิ่ง + ตัดพื้น', 'คุณวางภาพ · กดตัดพื้น'],
  ['veoin', 'ภาพส่ง Veo', 'Claude ทำตอนตรวจผ่าน'],
  ['video', 'วิดีโอ', 'คุณวางวิดีโอ'],
  ['frames', 'เฟรม', 'กดปุ่ม โปรแกรมทำ'],
  ['shadow', 'เงา', 'คุณปรับ'],
  ['file', 'ไฟล์อื่น', '.pxo ฯลฯ'],
];
const BGS = [['checker', 'ตาราง'], ['magenta', 'ม่วงแดง'], ['black', 'ดำ'], ['white', 'ขาว'], ['arena', 'ฉาก']];
const STILL_CHECKS = [
  'อ่านออกว่าเผ่าอะไรจากสีและรูปทรง',
  'ดูเป็นสัตว์แฟนตาซี ไม่ใช่สัตว์ธรรมดา',
  'หน้าไม่ดุเกินไป',
  'ไม่มีสีชมพูบนตัว',
  'เห็นเต็มตัว หันซ้าย เท้าแตะพื้น (ภูติลอยได้)',
  'ไม่มีกรอบ เงา หรือพื้นติดมา',
];
// game numbers mirrored from godot/scripts/ui/stage3d.gd (TILE, SPR_H) — preview only
const TILE = 1.8, SPR_H = 1.7, RING_R = 0.84;
// sun: stage3d.gd sun (0.55, -0.72, -0.42) -> ground direction + shadow length per unit of height; the direction is one value for
// every creature (hub.settings.sunAngle, degrees, x right / z toward the camera) because there is one sun.
const SUN_DEFAULT_ANGLE = +(Math.atan2(-0.42, 0.55) * 180 / Math.PI).toFixed(1);
const SUN_REACH = Math.min(Math.hypot(0.55, 0.42) / 0.72, 1.4);
const sunDir = () => { const a = (hub.settings.sunAngle ?? SUN_DEFAULT_ANGLE) * Math.PI / 180; return { x: Math.cos(a), z: Math.sin(a) }; };
const SHADOW_DEFAULT = { feet: [0.5, 1], oval: { on: false, dx: 0, dy: 0, w: 0.8, h: 0.45, a: 1 }, cast: { len: 1, str: 0.5, ox: 0, oy: 0, blur: 0.3, k: null } };

let hub = null;
const ui = { tab: 'chars', item: null, step: 'still', form: 1, move: 'idle', bg: 'checker', cutView: 'both', sel: null, cmp: [], tribe: '', status: '', q: '', showArch: false };

// ---------- helpers ----------
const $ = (id) => document.getElementById(id);
function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'style') e.style.cssText = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'text') e.textContent = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) e.append(k instanceof Node ? k : document.createTextNode(String(k)));
  return e;
}
const fileUrl = (rel) => '/f/' + rel.split('/').map(encodeURIComponent).join('/');
const isVideo = (f) => /\.(mp4|webm|mov)$/i.test(f);
const isImage = (f) => /\.(png|jpe?g|webp|gif)$/i.test(f);
const fmtDate = (t) => (t ? t.slice(0, 10) : '');
const uid = (p) => p + Math.random().toString(36).slice(2, 10);
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.k); toast.k = setTimeout(() => t.classList.remove('show'), 2200); }
const tribeVar = (t) => (t ? `var(--${t})` : 'var(--dim)');

async function api(path, opts = {}) {
  const r = await fetch(path, opts);
  const j = await r.json().catch(() => ({}));
  if (r.status === 409) { hub = j.hub; render(); throw new Error('ไฟล์ถูกแก้จากที่อื่น โหลดข้อมูลล่าสุดแล้ว ลองอีกครั้ง'); }
  if (r.status === 404 && j.error === 'not found') throw new Error('เซิร์ฟเวอร์คลังงานยังเป็นรุ่นเก่า ปิดแล้วเปิดใหม่ (npm run assets)');
  if (!r.ok) throw new Error(j.error || r.statusText);
  return j;
}
async function save() {
  // keep the same hub object (open editors hold references into it); only take the new rev
  try { const j = await api('/api/hub', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(hub) }); hub.rev = j.rev; }
  catch (e) { toast(e.message); }
}
let saveT = 0;
function saveSoon() { clearTimeout(saveT); saveT = setTimeout(save, 600); }

// ---------- model ----------
const live = (it, slot) => it.rounds.filter((r) => r.slot === slot && !r.archived);
function pick(it, slot, form, move) {
  const rs = live(it, slot).filter((r) => (!form || (r.form || 1) === form) && (!move || !r.move || r.move === move));
  return rs.filter((r) => r.star).pop() || null;
}
function latest(it, slot, form, move) {
  const rs = live(it, slot).filter((r) => (!form || (r.form || 1) === form) && (!move || !r.move || r.move === move));
  return rs.filter((r) => r.star).pop() || rs[rs.length - 1] || null;
}
function status(it) {
  if (it.inGame) return 'ingame';
  if (it.kind !== 'character') return it.rounds.some((r) => !r.archived) ? 'done' : 'none';
  if (pick(it, 'frames', 1, 'idle')) return 'done';
  if (live(it, 'video').length) return 'claude';
  if (pick(it, 'still', 1)) return 'wait-video';
  if (live(it, 'still').length) return 'pick';
  if (it.prompts.length) return 'wait-still';
  return 'none';
}
// board picture (owner set 241): the round the owner picked ("ใช้เป็นภาพหน้าภาพรวม"), else the cut (★ first, form 1),
// else the newest starred still / idle frames, so a new ★ shows on the board at once
function thumbRound(it) {
  const own = it.thumb && it.rounds.find((r) => r.id === it.thumb && !r.archived && isImage(r.file));
  if (own) return own;
  const byTime = (a, b) => (a.t || '').localeCompare(b.t || '');
  const cuts = it.rounds.filter((r) => !r.archived && r.slot === 'cut' && (r.form || 1) === 1 && isImage(r.file)).sort(byTime);
  if (cuts.length) return cuts.filter((r) => r.star).pop() || cuts.pop();
  const pics = it.rounds.filter((r) => !r.archived && ['still', 'frames'].includes(r.slot) && (r.form || 1) === 1 && (!r.move || r.move === 'idle') && isImage(r.file));
  return pics.filter((r) => r.star).sort(byTime).pop() || pics.sort(byTime).pop() || it.rounds.find((r) => !r.archived && isImage(r.file));
}
// ⇋ กลับข้าง (owner set 241): r.flip = this picture is shown mirrored; the game uses it the way it looks here
const flipped = (el, r) => { if (r && r.flip) el.classList.add('flipx'); return el; };
function stepHas(it, step) {
  if (step === 'still') return it.rounds.some((r) => ['still', 'cut'].includes(r.slot) && r.star && !r.archived);
  if (step === 'prompt') return it.prompts.length > 0;
  if (step === 'shadow') return !!it.shadow;
  return it.rounds.some((r) => r.slot === step && r.star && !r.archived);
}

// ---------- images ----------
const imgCache = new Map();
function loadImg(rel) {
  if (!imgCache.has(rel)) imgCache.set(rel, new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = fileUrl(rel); }));
  return imgCache.get(rel);
}
// a picture with a flat green (or magenta) background → transparent canvas; pictures with alpha pass through.
// Same rule as key_alpha() in veo_prep.py — change both: only background touching the picture edge is removed, plus
// enclosed gaps whose colour is mostly close to the background; key-coloured paint inside the body (runes, stripes) stays.
function keyAlpha(p, w, hh) {
  const N = w * hh, bd = [[], [], []];
  const take = (x, y) => { const i = (y * w + x) * 4; bd[0].push(p[i]); bd[1].push(p[i + 1]); bd[2].push(p[i + 2]); };
  for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) { if (y < 4 || y >= hh - 4 || x < 4 || x >= w - 4) take(x, y); else x = w - 5; }
  const med = bd.map((a) => a.sort((u, v) => u - v)[a.length >> 1]);
  const mag = med[1] < Math.min(med[0], med[2]);
  const [lo, hi] = mag ? [40, 110] : [24, 70];
  if ((mag ? Math.min(med[0], med[2]) - med[1] : med[1] - Math.max(med[0], med[2])) <= lo) return null; // border is not a key colour
  const k = new Int16Array(N);
  for (let j = 0, i = 0; j < N; j++, i += 4) k[j] = mag ? Math.min(p[i], p[i + 2]) - p[i + 1] : p[i + 1] - Math.max(p[i], p[i + 2]);
  const lab = new Int32Array(N), stack = new Int32Array(N), bgComp = [0];
  let n = 0;
  for (let s0 = 0; s0 < N; s0++) {
    if (lab[s0] || k[s0] <= lo) continue;
    n++; let top = 0, size = 0, close = 0, edge = false; stack[top++] = s0; lab[s0] = n;
    while (top) {
      const j = stack[--top], x = j % w, y = (j / w) | 0, i = j * 4; size++;
      if (Math.hypot(p[i] - med[0], p[i + 1] - med[1], p[i + 2] - med[2]) < 65) close++;
      if (x === 0 || y === 0 || x === w - 1 || y === hh - 1) edge = true;
      if (x > 0 && !lab[j - 1] && k[j - 1] > lo) { lab[j - 1] = n; stack[top++] = j - 1; }
      if (x < w - 1 && !lab[j + 1] && k[j + 1] > lo) { lab[j + 1] = n; stack[top++] = j + 1; }
      if (y > 0 && !lab[j - w] && k[j - w] > lo) { lab[j - w] = n; stack[top++] = j - w; }
      if (y < hh - 1 && !lab[j + w] && k[j + w] > lo) { lab[j + w] = n; stack[top++] = j + w; }
    }
    bgComp[n] = edge || (close * 2 > size && size >= 20) ? 1 : 0;
  }
  const a = new Uint8ClampedArray(N).fill(255), bg = new Uint8Array(N);
  for (let j = 0; j < N; j++) if (bgComp[lab[j]]) { bg[j] = 1; a[j] = Math.round(255 * Math.min(1, Math.max(0, (hi - k[j]) / (hi - lo)))); }
  let ring = bg; // despill ring = background grown by 2 px
  for (let it = 0; it < 2; it++) {
    const nx = ring.slice();
    for (let j = 0; j < N; j++) if (!ring[j]) { const x = j % w; if ((x > 0 && ring[j - 1]) || (x < w - 1 && ring[j + 1]) || (j >= w && ring[j - w]) || (j < N - w && ring[j + w])) nx[j] = 1; }
    ring = nx;
  }
  return { a, ring, mag };
}
function keyed(img, sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight) {
  const c = document.createElement('canvas'); c.width = sw; c.height = sh;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  const d = g.getImageData(0, 0, sw, sh), p = d.data;
  if (p[3] < 250) return c; // already transparent
  const ka = keyAlpha(p, sw, sh);
  if (!ka) return c;
  for (let j = 0, i = 0; j < ka.a.length; j++, i += 4) {
    p[i + 3] = ka.a[j];
    if (!ka.ring[j]) continue;
    const r = p[i], gg = p[i + 1], b = p[i + 2];
    if (ka.mag) { p[i] = Math.min(r, Math.max(gg, b) * 1.05); p[i + 2] = Math.min(b, Math.max(gg, r) * 1.05); }
    else p[i + 1] = Math.min(gg, Math.max(r, b) * 1.05);
  }
  g.putImageData(d, 0, 0);
  return c;
}
// the cut made from a still: cuts carry `from`; older owner uploads share the still's file hash
const fileHash = (f) => (String(f).match(/_([0-9a-f]{8})\.\w+$/) || [])[1];
function cutOf(it, st) {
  if (!st || st.slot !== 'still') return null;
  const hs = fileHash(st.file);
  const cs = it.rounds.filter((r) => r.slot === 'cut' && !r.archived && (r.form || 1) === (st.form || 1) && (r.from === st.id || (!r.from && hs && fileHash(r.file) === hs)));
  return cs.filter((r) => r.star).pop() || cs[cs.length - 1] || null;
}
// ตัดพื้น button: cut the still in the page, save it as a new "cut" round linked to the still (the still is kept)
async function makeCut(it, st) {
  toast('กำลังตัดพื้น…');
  try {
    const img = await loadImg(st.file), c = keyed(img);
    const p = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    if (p[3] > 8 && p[p.length - 1] > 8) { toast('ตัดไม่ได้: ขอบภาพไม่ใช่พื้นเขียวหรือม่วงแดงเรียบ'); return; }
    let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (p[(y * c.width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) { toast('ตัดไม่ได้: ไม่เหลือตัวละครหลังตัดพื้น'); return; }
    const o = document.createElement('canvas'); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1;
    o.getContext('2d').drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height);
    const blob = await new Promise((ok) => o.toBlob(ok, 'image/png'));
    const q = new URLSearchParams({ item: it.id, slot: 'cut', name: (st.orig || 'still').replace(/\.\w+$/, '') + '_cut.png', from: st.id });
    if (it.kind === 'character') q.set('form', String(st.form || ui.form));
    hub = await api('/api/upload?' + q, { method: 'POST', body: blob });
    const nc = hub.items[it.id].rounds.at(-1), src = hub.items[it.id].rounds.find((x) => x.id === st.id);
    if (src?.flip && nc) { nc.flip = true; await save(); }
    ui.cutView = 'both'; toast('ตัดพื้นแล้ว ภาพต้นฉบับยังอยู่');
  } catch (e) { toast('ตัดพื้นไม่ได้: ' + e.message); }
  render();
}
function sheetFrame(img, meta, i) {
  const n = meta.n || meta.cols * meta.rows, k = i % n;
  return [(k % meta.cols) * meta.fw, Math.floor(k / meta.cols) * meta.fh, meta.fw, meta.fh];
}
// auto check of a still (feature 5): background colour, body inside the middle 80 %, pink on the body
function analyse(img) {
  const W = 256, s = W / img.naturalWidth, H = Math.max(1, Math.round(img.naturalHeight * s));
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, W, H);
  const p = g.getImageData(0, 0, W, H).data;
  const px = (x, y) => { const i = (y * W + x) * 4; return [p[i], p[i + 1], p[i + 2], p[i + 3]]; };
  // border pixels (2 px inside, so a thin painted frame shows up as "not flat")
  const edge = [];
  for (let x = 0; x < W; x += 2) for (const y of [2, H - 3]) edge.push(px(x, y));
  for (let y = 0; y < H; y += 2) for (const x of [2, W - 3]) edge.push(px(x, y));
  const out = [];
  const med = (k) => edge.map((e) => e[k]).sort((a, b) => a - b)[edge.length >> 1];
  const bgc = [med(0), med(1), med(2), med(3)];
  const dist = (q) => Math.abs(q[0] - bgc[0]) + Math.abs(q[1] - bgc[1]) + Math.abs(q[2] - bgc[2]);
  const flat = edge.filter((e) => (bgc[3] < 20 ? e[3] < 20 : dist(e) < 60)).length / edge.length;
  const [R, G, B] = bgc;
  if (bgc[3] < 20) out.push(['ok', 'พื้นโปร่งใสแล้ว']);
  else if (flat < .85) out.push(['bad', 'พื้นไม่เรียบ หรือมีกรอบ/เงา/พื้นติดมา']);
  else if (G > 220 && R < 60 && B < 60) out.push(['ok', 'พื้นเขียว #00FF00 สะอาด']);
  else if (G - Math.max(R, B) > 40) out.push(['warn', 'พื้นเขียวแต่ไม่ใช่ #00FF00 แท้ (ตัดได้ ระวังขอบ)']);
  else if (Math.min(R, B) - G > 60) out.push([R > 230 && B > 230 && G < 40 ? 'ok' : 'warn', R > 230 && B > 230 && G < 40 ? 'พื้นม่วงแดง #FF00FF สะอาด' : 'พื้นม่วงแดงแต่ไม่ใช่ #FF00FF แท้']);
  else out.push(['warn', 'พื้นเป็นสีเรียบ แต่ไม่ใช่เขียวหรือม่วงแดง']);
  let x0 = W, y0 = H, x1 = -1, y1 = -1, pink = 0, body = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const q = px(x, y), [r, gg, b, a] = q;
    const bg = a < 20 || (bgc[3] >= 20 && dist(q) < 90);
    if (bg) continue;
    body++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    if (r > 200 && b > 140 && gg < 150 && r - gg > 70) pink++;
  }
  if (x1 >= 0) {
    const m = Math.min(x0 / W, (W - 1 - x1) / W, y0 / H, (H - 1 - y1) / H);
    out.push(m >= .08 ? ['ok', `ตัวอยู่ในกรอบกลาง เหลือขอบ ${Math.round(m * 100)}%`] : ['warn', `ตัวชิดขอบ (เหลือ ${Math.round(m * 100)}%) อาจโดนตัดตอนทำวิดีโอ`]);
    const pr = pink / Math.max(1, body);
    out.push(pr < .002 ? ['ok', 'ไม่เจอสีชมพูบนตัว'] : ['warn', `เจอสีชมพู ${(pr * 100).toFixed(1)}% ของตัว`]);
  }
  return out;
}

// ---------- rail ----------
function renderRail() {
  const chips = $('tribeChips'); chips.replaceChildren();
  chips.append(h('button', { class: ui.tribe ? '' : 'on', style: '--c: var(--dim)', onclick: () => { ui.tribe = ''; render(); } }, 'ทุกเผ่า'));
  for (const [t, th] of TRIBES) chips.append(h('button', { class: ui.tribe === t ? 'on' : '', style: `--c: ${tribeVar(t)}`, onclick: () => { ui.tribe = ui.tribe === t ? '' : t; render(); } }, th));
  const sf = $('statusFilter');
  if (!sf.options.length) { sf.append(h('option', { value: '' }, 'ทุกสถานะ')); for (const [k, v] of STATUS) sf.append(h('option', { value: k }, v)); }
  sf.value = ui.status;
  const list = $('list'); list.replaceChildren();
  const items = filtered(ui.tab === 'other' ? (it) => it.kind !== 'character' : (it) => it.kind === 'character');
  const groups = ui.tab === 'other' ? Object.keys(KIND_TH).filter((k) => k !== 'character').map((k) => [k, KIND_TH[k], 'var(--dim)']) : TRIBES.map(([t, th]) => [t, th, tribeVar(t)]);
  for (const [g, label, c] of groups) {
    const rows = items.filter((it) => (ui.tab === 'other' ? it.kind : it.tribe) === g);
    if (!rows.length) continue;
    list.append(h('div', { class: 'grp', style: `--c: ${c}` }, label));
    for (const it of rows) {
      const st = status(it);
      list.append(h('button', { class: ui.item === it.id ? 'on' : '', title: STATUS_TH[st], onclick: () => openItem(it.id) },
        h('span', { class: 'dot st-' + st }), h('span', { class: 'id' }, it.id), h('span', { class: 'nm' }, it.name || ''),
        openJobs(it.id).length ? h('span', { class: 'badge', title: openJobs(it.id).map(taskTh).join(', ') }, 'รอ Claude') : null));
    }
  }
  if (ui.tab === 'other') list.append(h('button', { class: 'ghost', onclick: newItemDialog }, '+ เพิ่มรายการใหม่'));
}
function filtered(kindOk) {
  const q = ui.q.trim().toLowerCase();
  return Object.values(hub.items).filter((it) => kindOk(it)
    && (!ui.tribe || it.tribe === ui.tribe || it.tribe2 === ui.tribe)
    && (!ui.status || status(it) === ui.status)
    && (!q || it.id.toLowerCase().includes(q) || (it.name || '').toLowerCase().includes(q)));
}
function openItem(id) { ui.item = id; ui.sel = null; ui.cmp = []; const it = hub.items[id]; if (it.kind !== 'character' && ['prompt', 'shadow', 'cut', 'veoin', 'frames'].includes(ui.step)) ui.step = 'file'; render(); window.scrollTo(0, 0); }

// ---------- main views ----------
function render() {
  document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === ui.tab));
  const open = hub.queue.filter((q) => q.state === 'open').length;
  $('qCount').textContent = open ? String(open) : '';
  $('rail').hidden = ui.tab === 'library' || ui.tab === 'queue';
  document.querySelector('.shell').style.gridTemplateColumns = $('rail').hidden ? '1fr' : '';
  renderRail();
  const m = $('main'); m.replaceChildren();
  const it = ui.item && hub.items[ui.item];
  document.documentElement.style.setProperty('--tribe', it && it.kind === 'character' ? tribeVar(it.tribe) : 'var(--dim)');
  if (ui.tab === 'library') return renderLibrary(m);
  if (ui.tab === 'queue') return renderQueue(m);
  if (it && (ui.tab === 'other') === (it.kind !== 'character')) return renderItem(m, it);
  renderBoard(m);
}

function renderBoard(m) {
  const other = ui.tab === 'other';
  const items = filtered(other ? (it) => it.kind !== 'character' : (it) => it.kind === 'character');
  const counts = {}; for (const it of items) counts[status(it)] = (counts[status(it)] || 0) + 1;
  const unverified = Object.values(hub.items).filter((it) => it.inGame && it.rounds.some((r) => r.star && /UNVERIFIED/.test(r.licence || ''))).length;
  m.append(h('div', { class: 'row' }, h('h2', {}, other ? 'ฉาก โมเดล 3D เอฟเฟกต์ และ UI' : 'ภาพรวมตัวละคร'), h('span', { class: 'sp' }),
    other ? h('button', { onclick: newItemDialog }, '+ เพิ่มรายการใหม่') : null));
  m.append(h('div', { class: 'legend' }, STATUS.map(([k, v]) => h('span', {}, h('i', { class: 'dot st-' + k }), `${v} ${counts[k] || 0}`)),
    unverified ? h('span', { class: 'warn' }, `ในเกมแต่ยังเป็นภาพ AI ไม่ยืนยันสิทธิ์: ${unverified} ตัว`) : null));
  const groups = other ? Object.keys(KIND_TH).filter((k) => k !== 'character').map((k) => [k, KIND_TH[k], 'var(--dim)', (it) => it.kind === k])
    : TRIBES.map(([t, th]) => [t, th, tribeVar(t), (it) => it.tribe === t]);
  for (const [, label, c, ok] of groups) {
    const rows = items.filter(ok);
    if (!rows.length) continue;
    const tiles = h('div', { class: 'tiles' });
    for (const it of rows) {
      const th = h('div', { class: 'th' });
      const r = thumbRound(it);
      if (r) thumbInto(th, r, 96);
      const st = status(it);
      tiles.append(h('button', { class: 'tile', style: `--tribe: ${tribeVar(it.tribe)}`, onclick: () => openItem(it.id) }, th,
        h('div', { class: 'row' }, h('span', { class: 'dot st-' + st }), h('b', {}, it.id), h('span', { class: 'dim small' }, it.name || '')),
        h('div', { class: 'small faint' }, STATUS_TH[st] + (it.shadow ? ' · ตั้งเงาแล้ว' : '')),
        openJobs(it.id).length ? h('div', { class: 'small badge-line' }, 'รอ Claude: ' + openJobs(it.id).map(taskTh).join(', ')) : null));
    }
    m.append(h('section', { class: 'board-grp', style: `--c: ${c}` }, h('h3', {}, `${label} (${rows.length})`), tiles));
  }
  if (!items.length) m.append(h('p', { class: 'dim' }, other ? 'ยังไม่มีรายการ กด "เพิ่มรายการใหม่" เพื่อเริ่ม' : 'ไม่มีตัวที่ตรงกับตัวกรอง'));
}

function thumbInto(box, r, max) {
  if (r.slot === 'frames' && r.meta) {
    loadImg(r.file).then((img) => { const [sx, sy, sw, sh] = sheetFrame(img, r.meta, 0); const c = keyed(img, sx, sy, sw, sh); box.append(flipped(c, r)); }).catch(() => {});
  } else if (isImage(r.file)) box.append(flipped(h('img', { src: fileUrl(r.file), alt: '', loading: 'lazy' }), r));
  else if (isVideo(r.file)) box.append(flipped(h('video', { src: fileUrl(r.file) + '#t=0.5', muted: true, preload: 'metadata' }), r));
  else box.append(h('span', { class: 'small faint' }, r.file.split('.').pop().toUpperCase()));
}

// ---------- item ----------
function renderItem(m, it) {
  const st = status(it);
  const isChar = it.kind === 'character';
  m.append(h('div', { class: 'head' },
    h('div', {}, h('div', { class: 'meta' }, isChar ? `${TRIBE_TH[it.tribe] || ''}${it.tribe2 ? ' + ' + TRIBE_TH[it.tribe2] : ''} · ${it.rarity || ''}` : KIND_TH[it.kind]),
      h('h2', {}, `${it.id}  ${it.name || ''}`)),
    h('span', { class: 'pill' }, h('span', { class: 'dot st-' + st }), STATUS_TH[st]),
    h('span', { class: 'sp' }),
    h('label', { class: 'pill' }, h('input', { type: 'checkbox', checked: it.inGame, onchange: (e) => { it.inGame = e.target.checked; save().then(render); } }), 'อยู่ในเกมแล้ว'),
    h('button', { onclick: () => queueDialog(it) }, 'ส่งงานให้ Claude')));
  for (const q of openJobs(it.id)) m.append(h('div', { class: 'job' },
    h('b', {}, `รอ Claude: ${taskTh(q)}`), h('span', { class: 'small dim' }, `ส่งเมื่อ ${fmtDate(q.t)} · พิมพ์ "ดูคิว" ในแชทเพื่อให้ Claude เริ่มทำ`),
    h('span', { class: 'sp' }), h('button', { class: 'ghost', onclick: () => { q.state = 'cancel'; save().then(render); } }, 'ยกเลิกงานนี้')));
  if (job.state === 'run' && job.item === it.id) m.append(h('div', { class: 'job' }, h('b', {}, 'โปรแกรมกำลังตัดเฟรม + สร้างเงา'), h('span', { class: 'small', id: 'jobStep' }, job.step || ''), h('span', { class: 'spin' })));
  if (job.state === 'error' && job.item === it.id) m.append(h('div', { class: 'job bad-job' }, h('b', {}, 'ตัดเฟรมไม่สำเร็จ'), h('span', { class: 'small' }, job.msg), h('span', { class: 'sp' }), h('button', { class: 'ghost', onclick: () => { job = {}; render(); } }, 'ปิด')));
  const lastDone = (hub.queue || []).filter((q) => q.item === it.id && q.state === 'done' && !q.seen).pop();
  if (lastDone) m.append(h('div', { class: 'job done' }, h('b', {}, `${lastDone.by === 'auto' ? 'โปรแกรม' : 'Claude '}ทำเสร็จแล้ว: ${taskTh(lastDone)}`),
    h('span', { class: 'small', style: 'white-space:pre-wrap' }, [lastDone.result === 'fail' ? 'ไม่ผ่าน' : '', lastDone.reply, nextTh(lastDone)].filter(Boolean).join('\n')), h('span', { class: 'sp' }),
    h('button', { class: 'ghost', onclick: () => { lastDone.seen = true; save().then(render); } }, 'รับทราบ')));
  const steps = isChar ? STEPS : STEPS.filter(([k]) => ['still', 'video', 'file'].includes(k));
  const labels = isChar ? null : { still: 'ภาพ', video: 'วิดีโอ', file: 'ไฟล์ (.glb ฯลฯ)' };
  m.append(h('nav', { class: 'pipe' }, steps.map(([k, label, sub], i) => h('button', {
    class: (ui.step === k ? 'on ' : '') + (stepHas(it, k) ? 'has' : ''), onclick: () => { ui.step = k; ui.sel = null; ui.cmp = []; render(); },
  }, h('span', { class: 'n' }, String(i + 1)), h('b', {}, labels?.[k] || label), h('span', { class: 's' }, sub)))));
  if (ui.step === 'cut') ui.step = 'still'; // step merged into ภาพนิ่ง
  if (!steps.some(([k]) => k === ui.step)) ui.step = steps[0][0];
  // form + move switches (F1 / F3, idle / attack …)
  if (isChar && ui.step !== 'shadow') {
    const bar = h('div', { class: 'tools' });
    if (ui.step !== 'prompt' || true) bar.append(h('span', { class: 'seg' }, [1, 3].map((f) => h('button', { class: ui.form === f ? 'on' : '', onclick: () => { ui.form = f; ui.sel = null; render(); } }, `ร่าง ${f}`))));
    if (['video', 'frames', 'file'].includes(ui.step)) bar.append(h('span', { class: 'seg' }, hub.settings.moves.map((mv) => h('button', { class: ui.move === mv ? 'on' : '', onclick: () => { ui.move = mv; ui.sel = null; render(); } }, moveTh(mv)))));
    m.append(bar);
  }
  if (isChar && ['video', 'frames'].includes(ui.step)) m.append(autoFramesBar(it));
  if (isChar && ui.step === 'still') m.append(checkBar(it));
  if (isChar && ui.step === 'veoin') m.append(veoPanel(it));
  if (ui.step === 'prompt') return renderPrompt(m, it);
  if (ui.step === 'shadow') return renderShadow(m, it);
  renderSlot(m, it, ui.step);
}
const moveTh = (mv) => ({ idle: 'หายใจ', attack: 'โจมตี', hit: 'โดนตี', die: 'ล้ม' }[mv] || mv);

function renderPrompt(m, it) {
  const mine = it.prompts.filter((p) => (p.form || 1) === ui.form && p.kind !== 'veo');
  const cur = mine[mine.length - 1];
  const work = h('div', { class: 'work' });
  const left = h('div', {});
  left.append(h('div', { class: 'row' }, h('h3', {}, `พรอมต์ร่าง ${ui.form} ล่าสุด`), h('span', { class: 'sp' }),
    cur ? h('button', { class: 'primary', onclick: () => copy(cur.text) }, 'คัดลอกพรอมต์') : null));
  if (cur) left.append(h('pre', { class: 'prompt' }, cur.text), h('p', { class: 'small faint' }, `${cur.by === 'claude' ? 'Claude เขียน' : 'คุณเขียน'} · ${fmtDate(cur.t)} · ภาพที่วางหลังจากนี้จะผูกกับพรอมต์นี้`));
  else left.append(h('p', { class: 'dim' }, 'ยังไม่มีพรอมต์สำหรับร่างนี้ กด "ส่งงานให้ Claude" เพื่อขอให้เขียน หรือพิมพ์เองด้านล่าง'));
  const ta = h('textarea', { placeholder: 'พิมพ์พรอมต์ใหม่ของคุณ (จะเก็บเป็นรุ่นใหม่ รุ่นเก่ายังอยู่)', rows: 5 });
  left.append(h('h3', {}, 'เพิ่มรุ่นใหม่'), ta, h('div', { class: 'tools' }, h('button', {
    onclick: () => { const t = ta.value.trim(); if (!t) return; it.prompts.push({ id: uid('p'), t: new Date().toISOString(), by: 'owner', form: ui.form, text: t }); save().then(render); },
  }, 'บันทึกเป็นรุ่นใหม่')));
  if (hub.settings.starter) {
    left.append(h('details', {}, h('summary', {}, 'ข้อความเริ่มต้นสำหรับ Gemini (ส่งครั้งแรกของแชท พร้อมแนบภาพฉาก)'),
      h('div', { class: 'tools' }, h('button', { onclick: () => copy(hub.settings.starter) }, 'คัดลอกข้อความเริ่มต้น')), h('pre', { class: 'prompt' }, hub.settings.starter)));
  }
  const right = h('div', {});
  right.append(h('h3', {}, 'ประวัติพรอมต์'));
  if (!mine.length) right.append(h('p', { class: 'dim small' }, 'ยังไม่มี'));
  for (const p of mine.slice().reverse()) {
    const used = it.rounds.filter((r) => r.promptId === p.id);
    right.append(h('div', { class: 'panel', style: 'margin-bottom:8px' },
      h('div', { class: 'row small' }, h('b', {}, p.by === 'claude' ? 'Claude' : 'คุณ'), h('span', { class: 'faint' }, fmtDate(p.t)), h('span', { class: 'sp' }),
        h('span', { class: 'faint' }, `ใช้กับ ${used.length} รอบ${used.some((r) => r.star) ? ' · มีรอบที่เลือก ★' : ''}`)),
      h('div', { class: 'small dim', style: 'white-space:pre-wrap;max-height:90px;overflow:hidden' }, p.text),
      h('button', { class: 'ghost', style: 'margin-top:4px', onclick: () => copy(p.text) }, 'คัดลอก')));
  }
  if (it.notes != null) {
    right.append(h('h3', {}, 'โน้ตของตัวนี้'));
    right.append(h('textarea', { placeholder: 'เช่น ชอบหน้าแบบรอบ 2 แต่สีรอบ 3', oninput: (e) => { it.notes = e.target.value; saveSoon(); } }, it.notes || ''));
  }
  work.append(left, right);
  m.append(work);
}
async function copy(t) { try { await navigator.clipboard.writeText(t); toast('คัดลอกแล้ว'); } catch { toast('คัดลอกไม่ได้ เลือกข้อความแล้วกด Ctrl+C'); } }

function slotRounds(it, slot) {
  return it.rounds.filter((r) => r.slot === slot && (it.kind !== 'character' || (r.form || 1) === ui.form)
    && (!['video', 'frames', 'file'].includes(slot) || it.kind !== 'character' || !r.move || r.move === ui.move)
    && (ui.showArch || !r.archived));
}

function renderSlot(m, it, slot) {
  let rs = slotRounds(it, slot);
  if (slot === 'still') { // cuts with no still in this list (old uploads) still show, labelled ตัดพื้น
    const owned = new Set(rs.map((r) => cutOf(it, r)?.id).filter(Boolean));
    const mine = new Set(rs.map((r) => r.id));
    rs = [...rs, ...slotRounds(it, 'cut').filter((c) => !owned.has(c.id) && !mine.has(c.from) && !rs.some((r) => fileHash(r.file) && fileHash(r.file) === fileHash(c.file)))]
      .sort((a, b) => (a.t || '').localeCompare(b.t || ''));
  }
  // open a still first (it carries the ตัดพื้น button); a lone cut row only when there is no still
  const stills = rs.filter((r) => r.slot !== 'cut');
  let sel = rs.find((r) => r.id === ui.sel) || stills.filter((r) => r.star).pop() || stills[stills.length - 1] || rs.filter((r) => r.star).pop() || rs[rs.length - 1];
  const work = h('div', { class: 'work' });
  const left = h('div', {});
  // viewer
  if (sel) {
    const tools = h('div', { class: 'tools' }, h('span', { class: 'seg' }, BGS.map(([k, v]) => h('button', { class: ui.bg === k ? 'on' : '', onclick: () => { ui.bg = k; render(); } }, v))));
    const cut = cutOf(it, sel), canCut = sel.slot === 'still' && isImage(sel.file);
    if (canCut) {
      if (cut) tools.append(h('span', { class: 'seg' }, [['both', 'คู่กัน'], ['orig', 'ต้นฉบับ'], ['cut', 'ตัดพื้น']].map(([k, v]) => h('button', { class: ui.cutView === k ? 'on' : '', onclick: () => { ui.cutView = k; render(); } }, v))));
      tools.append(h('button', { class: cut ? '' : 'primary', title: 'ตัดพื้นเขียว/ม่วงแดงออก ภาพต้นฉบับยังเก็บไว้', onclick: () => makeCut(it, sel) }, cut ? 'ตัดพื้นใหม่' : 'ตัดพื้น'));
    } else if (sel.slot === 'cut') tools.append(h('span', { class: 'small dim' }, 'รอบนี้เป็นภาพตัดพื้นที่ไม่มีภาพนิ่งต้นทาง กดแถวภาพนิ่งเพื่อตัดพื้นใหม่'));
    if (isImage(sel.file) || isVideo(sel.file)) {
      tools.append(h('button', { class: sel.flip ? 'on' : '', title: 'กลับข้างซ้าย-ขวา เลือกว่าจะให้ฝั่งไหนเป็นด้านหน้า (เกมใช้ตามที่เห็นตรงนี้)', onclick: () => {
        sel.flip = !sel.flip; if (cut && cut !== sel) cut.flip = sel.flip; save().then(render); } }, sel.flip ? '⇋ กลับข้างแล้ว' : '⇋ กลับข้าง'));
    }
    if (isImage(sel.file) && slot !== 'veoin') {
      const pickR = canCut && cut ? cut : sel, isOn = thumbRound(it) === pickR && it.thumb === pickR.id;
      tools.append(h('button', { class: isOn ? 'on' : '', title: 'ใช้ภาพนี้แสดงในหน้าภาพรวม (ถ้ามีภาพตัดพื้น ใช้ภาพตัดพื้น)', onclick: () => {
        it.thumb = isOn ? undefined : pickR.id; save().then(render); } }, isOn ? '✓ ภาพหน้าภาพรวม' : 'ใช้เป็นภาพหน้าภาพรวม'));
    }
    const view = canCut && cut ? ui.cutView : 'orig';
    const stage = h('div', { class: 'stage bg-' + ui.bg + (view === 'both' ? ' pair' : '') });
    if (ui.bg === 'arena' && hub.settings.arenaBg) stage.style.backgroundImage = `url("${fileUrl(hub.settings.arenaBg)}")`;
    left.append(tools, stage);
    if (view === 'both') { viewer(stage, left, sel); viewer(stage, left, cut); }
    else viewer(stage, left, view === 'cut' ? cut : sel);
    if (ui.cmp.length === 2) left.append(h('div', { class: 'tools' }, h('button', { class: 'primary', onclick: () => compareDialog(it) }, 'เทียบ 2 รอบที่เลือก')));
    else left.append(h('p', { class: 'small faint' }, 'ติ๊ก "เทียบ" ที่ 2 รอบเพื่อดูคู่กันหรือเลื่อนแถบทับกัน'));
    if (slot === 'still') left.append(stillChecks(it, sel));
  } else left.append(h('p', { class: 'dim' }, emptyText(slot)));
  // drop zone + rounds
  const right = h('div', {});
  right.append(dropZone(it, slot));
  right.append(h('div', { class: 'row small', style: 'margin:10px 0 6px' }, h('b', {}, `${rs.length} รอบ`), h('span', { class: 'sp' }),
    h('label', {}, h('input', { type: 'checkbox', checked: ui.showArch, onchange: (e) => { ui.showArch = e.target.checked; render(); } }), ' แสดงรอบที่ซ่อน')));
  const list = h('div', { class: 'rounds' });
  for (const r of rs.slice().reverse()) list.append(roundRow(it, r, r === sel));
  right.append(list);
  work.append(left, right);
  m.append(work);
}
function emptyText(slot) {
  return {
    still: 'ยังไม่มีภาพนิ่ง ลากภาพที่เจนจาก Gemini มาวางที่ช่องด้านขวา',
    veoin: 'ยังไม่มีภาพเตรียมส่ง Veo Claude จะทำจากภาพตัดพื้น',
    video: 'ยังไม่มีวิดีโอ ลากไฟล์ .mp4 จาก Veo มาวางที่ช่องด้านขวา',
    frames: 'ยังไม่มีเฟรม Claude จะแตกเฟรมจากวิดีโอที่ติดดาว',
    file: 'ยังไม่มีไฟล์ วางไฟล์อื่นที่เกี่ยวข้องได้ เช่น .pxo หรือ .glb',
  }[slot];
}

function viewer(stage, left, r) {
  if (r.slot === 'frames' && r.meta) return sheetPlayer(stage, left, r);
  if (isVideo(r.file)) return videoTools(stage, left, r);
  if (isImage(r.file)) {
    loadImg(r.file).then((img) => {
      const keyNeeded = ui.bg !== 'checker' || r.slot !== 'still';
      stage.append(flipped(keyNeeded ? keyed(img) : img.cloneNode(), r));
    }).catch(() => stage.append(h('p', { class: 'dim' }, 'เปิดไฟล์ไม่ได้')));
    return;
  }
  stage.append(h('p', { class: 'dim' }, `ไฟล์ ${r.file.split('/').pop()} — เปิดดูด้วยโปรแกรมของมัน`));
}

function sheetPlayer(stage, left, r) {
  const c = document.createElement('canvas'); stage.append(flipped(c, r));
  let i = 0, playing = true;
  const msIn = h('input', { type: 'number', min: 30, max: 1000, step: 1, value: r.meta.ms || 190, style: 'width:80px', onchange: (e) => { r.meta.ms = Math.max(30, Math.min(1000, Number(e.target.value) || 190)); saveSoon(); } });
  const info = h('span', { class: 'small dim' });
  left.append(h('div', { class: 'tools' }, h('button', { onclick: () => { playing = !playing; } }, 'เล่น/หยุด'),
    h('button', { onclick: () => { playing = false; i = (i + (r.meta.n || 1) - 1) % (r.meta.n || 1); draw(); } }, '◀ เฟรม'),
    h('button', { onclick: () => { playing = false; i = (i + 1) % (r.meta.n || 1); draw(); } }, 'เฟรม ▶'),
    h('label', { class: 'small' }, 'มิลลิวินาที/เฟรม ', msIn), info));
  let img = null;
  const scale = () => Math.max(1, Math.floor(Math.min(560 / r.meta.fw, 420 / r.meta.fh)));
  function draw() {
    if (!img) return;
    const [sx, sy, sw, sh] = sheetFrame(img, r.meta, i);
    const k = keyed(img, sx, sy, sw, sh), s = scale();
    c.width = sw * s; c.height = sh * s;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = r.meta.n < 32 ? false : true; g.drawImage(k, 0, 0, c.width, c.height);
    info.textContent = `เฟรม ${i + 1}/${r.meta.n} · ${r.meta.fw}×${r.meta.fh} px`;
  }
  loadImg(r.file).then((im) => { img = im; draw(); });
  let last = 0;
  const tick = (t) => { if (!c.isConnected) return; if (playing && img && t - last >= (r.meta.ms || 190)) { last = t; i = (i + 1) % (r.meta.n || 1); draw(); } requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}

function videoTools(stage, left, r) {
  const v = h('video', { src: fileUrl(r.file), controls: true, loop: true, muted: true, autoplay: true, playsinline: true });
  stage.append(flipped(v, r));
  const out = h('div', { class: 'auto' });
  const step = (d) => { v.pause(); v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + d / 24)); };
  left.append(h('div', { class: 'tools' },
    h('button', { onclick: () => step(-1) }, '◀ เฟรม'), h('button', { onclick: () => step(1) }, 'เฟรม ▶'),
    h('span', { class: 'seg' }, [0.25, 0.5, 1].map((s) => h('button', { onclick: (e) => { v.playbackRate = s; e.target.parentNode.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === e.target)); } }, `×${s}`))),
    h('button', { onclick: () => { v.currentTime = Math.max(0, (v.duration || 0) - 0.4); v.play(); } }, 'ดูรอยต่อตอนวน'),
    h('button', { onclick: () => driftCheck(v, out) }, 'ตรวจกล้องขยับ/ซูม')), out);
}
// sample 6 moments, find the creature box on the green background, report zoom (height change) and pan (centre move)
async function driftCheck(v, out) {
  out.replaceChildren(h('span', { class: 'dim' }, 'กำลังตรวจ…'));
  v.pause();
  const W = 320, H = Math.round(W * (v.videoHeight / v.videoWidth || 9 / 16));
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  const boxes = [];
  for (const f of [0.02, 0.2, 0.4, 0.6, 0.8, 0.98]) {
    v.currentTime = f * v.duration;
    await new Promise((ok) => v.addEventListener('seeked', ok, { once: true }));
    g.drawImage(v, 0, 0, W, H);
    const p = g.getImageData(0, 0, W, H).data;
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; if (p[i + 1] - Math.max(p[i], p[i + 2]) < 30) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
    if (x1 >= 0) boxes.push({ h: (y1 - y0) / H, cx: (x0 + x1) / 2 / W, by: y1 / H });
  }
  out.replaceChildren();
  if (boxes.length < 2) { out.append(h('span', { class: 'warn' }, 'หาตัวบนพื้นเขียวไม่เจอ (พื้นไม่ใช่สีเขียว?)')); return; }
  const hs = boxes.map((b) => b.h), zoom = (Math.max(...hs) - Math.min(...hs)) / Math.max(...hs);
  const pan = Math.max(...boxes.map((b) => b.cx)) - Math.min(...boxes.map((b) => b.cx));
  const feet = Math.max(...boxes.map((b) => b.by)) - Math.min(...boxes.map((b) => b.by));
  out.append(h('span', { class: zoom < 0.04 ? 'ok' : 'bad' }, `ขนาดตัวเปลี่ยน ${(zoom * 100).toFixed(1)}% ${zoom < 0.04 ? '(ปกติ หายใจ)' : '(กล้องน่าจะซูม)'}`),
    h('span', { class: pan < 0.02 ? 'ok' : 'bad' }, `ตัวเลื่อนซ้ายขวา ${(pan * 100).toFixed(1)}% ${pan < 0.02 ? '' : '(กล้องน่าจะแพน)'}`),
    h('span', { class: feet < 0.015 ? 'ok' : 'warn' }, `เท้าขยับขึ้นลง ${(feet * 100).toFixed(1)}%`));
}

function stillChecks(it, r) {
  r.check = r.check || {};
  const box = h('div', { class: 'panel', style: 'margin-top:12px' }, h('b', {}, 'ตรวจภาพนิ่ง (ข้อ P1)'));
  const checks = h('div', { class: 'checks' });
  STILL_CHECKS.forEach((t, i) => checks.append(h('label', {}, h('input', { type: 'checkbox', checked: !!r.check[i], onchange: (e) => { r.check[i] = e.target.checked; saveSoon(); } }), t)));
  const auto = h('div', { class: 'auto' }, h('span', { class: 'dim' }, 'ตรวจอัตโนมัติ…'));
  box.append(checks, auto);
  loadImg(r.file).then((img) => { auto.replaceChildren(h('b', { class: 'small' }, 'ตรวจอัตโนมัติ'), ...analyse(img).map(([k, t]) => h('span', { class: k }, (k === 'ok' ? '✓ ' : '! ') + t))); }).catch(() => auto.replaceChildren());
  return box;
}

function dropZone(it, slot) {
  const inp = h('input', { type: 'file', multiple: true, hidden: true, accept: slot === 'video' ? 'video/*' : slot === 'file' ? '' : 'image/*', onchange: (e) => upload(it, slot, [...e.target.files]) });
  const z = h('div', { class: 'drop', tabindex: 0, role: 'button', onclick: () => inp.click(), onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') inp.click(); } },
    h('b', {}, slot === 'video' ? 'ลากวิดีโอมาวาง' : slot === 'file' ? 'ลากไฟล์มาวาง' : 'ลากภาพมาวาง'), h('div', { class: 'small' }, 'หรือคลิกเพื่อเลือกไฟล์'), inp);
  z.addEventListener('dragover', (e) => { e.preventDefault(); z.classList.add('over'); });
  z.addEventListener('dragleave', () => z.classList.remove('over'));
  z.addEventListener('drop', (e) => { e.preventDefault(); z.classList.remove('over'); upload(it, slot, [...e.dataTransfer.files]); });
  return z;
}
async function upload(it, slot, files) {
  for (const f of files) {
    toast(`กำลังอัปโหลด ${f.name}…`);
    const q = new URLSearchParams({ item: it.id, slot, name: f.name });
    if (it.kind === 'character') { q.set('form', String(ui.form)); if (['video', 'frames', 'file'].includes(slot)) q.set('move', ui.move); }
    try { hub = await api('/api/upload?' + q, { method: 'POST', body: f }); ui.sel = it.rounds.length ? hub.items[it.id].rounds.at(-1).id : null; }
    catch (e) { toast('อัปโหลดไม่ได้: ' + e.message); return; }
  }
  toast('เก็บแล้ว'); render();
}

function roundRow(it, r, isSel) {
  const th = h('button', { class: 'th', title: 'ดูรอบนี้', onclick: () => { ui.sel = r.id; render(); } });
  thumbInto(th, r, 72);
  const lic = h('select', { onchange: (e) => { r.licence = e.target.value; saveSoon(); }, 'aria-label': 'สถานะสิทธิ์' }, hub.settings.licences.map((l) => h('option', { value: l, selected: r.licence === l }, l)));
  const p = it.prompts.find((x) => x.id === r.promptId);
  return h('div', { class: `round${isSel ? ' sel' : ''}${r.star ? ' star' : ''}${r.archived ? ' arch' : ''}` }, th,
    h('div', { class: 'info' },
      h('div', { class: 'row' }, h('b', {}, fmtDate(r.t) || 'ไม่มีวันที่'), h('span', { class: 'faint' }, r.by === 'claude' ? 'Claude' : 'คุณ'), r.slot === 'cut' && ui.step === 'still' ? h('span', { class: 'pill' }, 'ตัดพื้น') : cutOf(it, r) ? h('span', { class: 'faint' }, '· มีภาพตัดพื้น') : null, r.meta ? h('span', { class: 'faint' }, `${r.meta.n} เฟรม`) : null),
      h('input', { type: 'text', value: r.note || '', placeholder: 'โน้ต เช่น หน้าดุไป', oninput: (e) => { r.note = e.target.value; saveSoon(); } }),
      lic,
      p ? h('span', { class: 'faint', title: p.text }, `พรอมต์ ${fmtDate(p.t)}`) : null,
      r.star && !r.library && !String(r.file).startsWith('lib/') ? h('span', { class: 'faint', title: 'จะคัดลอกเข้าคลังถาวรตอนกด "ส่งค่าเข้าเกม Godot"' }, 'ยังไม่เข้าคลังถาวร') : null,
      h('div', { class: 'acts' },
        h('button', { class: r.star ? 'starred' : '', title: 'เลือกรอบนี้เป็นตัวที่ใช้ (คัดลอกเข้าคลังถาวร)', onclick: () => star(it, r) }, r.star ? '★ ใช้รอบนี้' : '☆ เลือก'),
        h('label', { class: 'small' }, h('input', { type: 'checkbox', checked: ui.cmp.includes(r.id), onchange: (e) => { ui.cmp = e.target.checked ? [...ui.cmp, r.id].slice(-2) : ui.cmp.filter((x) => x !== r.id); render(); } }), ' เทียบ'),
        h('button', { class: 'ghost', title: r.archived ? 'แสดงอีกครั้ง' : 'ซ่อนรอบนี้ (ไฟล์ไม่ถูกลบ)', onclick: () => { r.archived = !r.archived; save().then(render); } }, r.archived ? 'เลิกซ่อน' : 'ซ่อน'),
        h('button', { class: 'ghost danger', disabled: r.star, title: r.star ? 'รอบที่เลือก ★ อยู่ลบไม่ได้ เลิกเลือกก่อน' : 'ลบรอบนี้ออกจากคลังงาน', onclick: () => delRound(it, r) }, 'ลบ'))));
}
// ลบ: removes an unstarred round + its file in art/hub/files (a still takes its unstarred cut with it).
// The permanent copy in art/library (made when a round was starred) is never deleted (set 221).
async function delRound(it, r) {
  const cut = cutOf(it, r), withCut = cut && !cut.star;
  if (!confirm(`ลบรอบ ${fmtDate(r.t)} ถาวร?${withCut ? '\nภาพตัดพื้นของภาพนี้จะถูกลบด้วย' : ''}\nไฟล์ในคลังงานจะหายและกู้คืนไม่ได้ (สำเนาในคลังถาวร art/library ถ้ามี ยังอยู่)`)) return;
  try {
    for (const x of withCut ? [cut, r] : [r]) hub = await api(`/api/delete?item=${encodeURIComponent(it.id)}&round=${encodeURIComponent(x.id)}`, { method: 'POST' });
    ui.sel = null; ui.cmp = ui.cmp.filter((x) => x !== r.id); toast('ลบแล้ว');
  } catch (e) { toast('ลบไม่ได้: ' + e.message); }
  render();
}
async function star(it, r) {
  try {
    const on = r.star ? 0 : 1, cut = cutOf(it, r); // a still's cut follows its star (the shadow editor uses the starred cut)
    hub = await api(`/api/star?item=${encodeURIComponent(it.id)}&round=${encodeURIComponent(r.id)}&on=${on}`, { method: 'POST' });
    if (cut && !!cut.star !== !!on) hub = await api(`/api/star?item=${encodeURIComponent(it.id)}&round=${encodeURIComponent(cut.id)}&on=${on}`, { method: 'POST' });
    toast(r.star ? 'เลิกเลือกแล้ว' : 'เลือกแล้ว และเก็บเข้าคลังถาวร');
  } catch (e) { toast(e.message); }
  render();
}

function mediaEl(r, cls) {
  if (r.slot === 'frames' && r.meta) { const c = flipped(h('canvas', { class: cls }), r); loadImg(r.file).then((img) => { const [sx, sy, sw, sh] = sheetFrame(img, r.meta, 0); const k = keyed(img, sx, sy, sw, sh); c.width = sw; c.height = sh; c.getContext('2d').drawImage(k, 0, 0); }); return c; }
  if (isVideo(r.file)) return flipped(h('video', { class: cls, src: fileUrl(r.file), autoplay: true, loop: true, muted: true, playsinline: true }), r);
  return flipped(h('img', { class: cls, src: fileUrl(r.file), alt: '' }), r);
}
function compareDialog(it) {
  const [a, b] = ui.cmp.map((id) => it.rounds.find((r) => r.id === id));
  if (!a || !b) return;
  let mode = 'side';
  const body = $('dlgBody');
  const draw = () => {
    body.replaceChildren();
    const bar = h('div', { class: 'tools' }, h('span', { class: 'seg' },
      h('button', { class: mode === 'side' ? 'on' : '', onclick: () => { mode = 'side'; draw(); } }, 'วางคู่กัน'),
      h('button', { class: mode === 'slide' ? 'on' : '', onclick: () => { mode = 'slide'; draw(); } }, 'เลื่อนแถบทับกัน')),
    h('span', { class: 'sp' }), h('button', { onclick: () => $('dlg').close() }, 'ปิด'));
    body.append(bar);
    const cap = (r) => `${fmtDate(r.t)} ${r.note || ''}`;
    if (mode === 'side') body.append(h('div', { class: 'cmp-side' }, [a, b].map((r) => h('div', {}, mediaEl(r), h('div', { class: 'small dim' }, cap(r))))));
    else {
      const top = mediaEl(b, 'layer');
      const rng = h('input', { type: 'range', min: 0, max: 100, value: 50, style: 'width:100%', oninput: (e) => { top.style.clipPath = `inset(0 0 0 ${e.target.value}%)`; } });
      top.style.clipPath = 'inset(0 0 0 50%)';
      body.append(h('div', { class: 'cmp bg-checker' }, mediaEl(a, 'layer'), top), rng, h('div', { class: 'row small dim' }, h('span', {}, 'ซ้าย: ' + cap(a)), h('span', { class: 'sp' }), h('span', {}, 'ขวา: ' + cap(b))));
    }
  };
  draw();
  $('dlg').showModal();
}

// ---------- shadow editor (E1: feet + ground line + one oval + sun-cast) ----------
function shadowSource(it) {
  const set = it.shadow?.round && it.rounds.find((r) => r.id === it.shadow.round && !r.archived); // the picture the shadow was set on (Claude sets it on new frames)
  if (set) return set;
  return pick(it, 'frames', 1, 'idle') || pick(it, 'cut', 1) || pick(it, 'still', 1) || latest(it, 'frames', 1, 'idle') || latest(it, 'cut', 1) || latest(it, 'still', 1);
}
function guessFeet(k) {
  const g = k.getContext('2d', { willReadFrequently: true }), W = k.width, H = k.height;
  const p = g.getImageData(0, 0, W, H).data;
  let bottom = -1;
  for (let y = H - 1; y >= 0 && bottom < 0; y--) for (let x = 0; x < W; x++) if (p[(y * W + x) * 4 + 3] > 128) { bottom = y; break; }
  if (bottom < 0) return [0.5, 1];
  // x = middle between leftmost and rightmost solid pixel of the bottom 12 % (a mean got pulled onto one big fist)
  const band = Math.max(2, Math.round(H * 0.12));
  let x0 = W, x1 = -1;
  for (let y = Math.max(0, bottom - band); y <= bottom; y++) for (let x = 0; x < W; x++) if (p[(y * W + x) * 4 + 3] > 128) { if (x < x0) x0 = x; if (x > x1) x1 = x; }
  return [+(x1 >= 0 ? (x0 + x1 + 1) / 2 / W : 0.5).toFixed(4), +((bottom + 1) / H).toFixed(4)];
}
function renderShadow(m, it) {
  const src = shadowSource(it);
  if (!src) { m.append(h('p', { class: 'dim' }, 'ต้องมีภาพนิ่ง ภาพตัดพื้น หรือเฟรมก่อน จึงจะตั้งเงาได้')); return; }
  const work = h('div', { class: 'work' });
  const left = h('div', { class: 'shadow-ed' });
  const cv = h('canvas', { width: 900, height: 560, 'aria-label': 'ตัวแก้เงา: ลากตัวละครเพื่อวางเท้าบนจุดกลางช่อง ลากวงเงาเพื่อย้าย ลากจุดขอบเพื่อปรับขนาด' });
  left.append(cv, h('p', { class: 'small faint' }, 'เงาตามตัว: ลากจุดส้มกลมที่ปลายเงาเพื่อปรับทิศและความยาว · ลากสี่เหลี่ยมส้มที่มุมเพื่อยืด/ให้ฐานชนเท้าหน้าและเท้าหลัง · ลากตัวเงาเพื่อเลื่อน · ลากตัวละครให้เท้าแตะกากบาท (เงาเริ่มที่เท้า) · ภาพนี้คือตัวอย่างโดยประมาณ ของจริงให้ดูในเกม'));
  const right = h('div', {});
  work.append(left, right);
  m.append(work);
  const hit = document.createElement('canvas'); hit.width = cv.width; hit.height = cv.height;
  const hitG = hit.getContext('2d', { willReadFrequently: true });
  let s = it.shadow ? JSON.parse(JSON.stringify(it.shadow)) : null;
  let frames = [], fi = 0, playing = true, bg = null, size = [0, 0];
  const pitch = () => hub.settings.camPitch || 40;
  const commit = () => { it.shadow = { ...s, size, round: src.id }; saveSoon(); };
  // sliders
  const sl = h('div', { class: 'sliders' });
  const vals = {};
  const slider = (label, get, set, min, max, stepv, fmt = (v) => v.toFixed(2)) => {
    const out = h('span', { class: 'small dim' });
    const r = h('input', { type: 'range', min, max, step: stepv, oninput: (e) => { set(Number(e.target.value)); out.textContent = fmt(Number(e.target.value)); commit(); draw(); } });
    vals[label] = () => { r.value = get(); out.textContent = fmt(get()); };
    sl.append(h('label', { class: 'small' }, label), r, out);
  };
  slider('ความยาวเงาตามตัว', () => s.cast.len, (v) => { s.cast.len = v; }, 0, 2, 0.01);
  slider('ความเข้มเงาตามตัว', () => s.cast.str, (v) => { s.cast.str = v; }, 0, 1, 0.01);
  slider('ความฟุ้งเงาตามตัว', () => s.cast.blur ?? 0.3, (v) => { s.cast.blur = v; }, 0, 1, 0.01);
  slider('ทิศแดด (ใช้ร่วมทุกตัว)', () => hub.settings.sunAngle ?? SUN_DEFAULT_ANGLE, (v) => { hub.settings.sunAngle = v; }, -180, 180, 0.5, (v) => v.toFixed(0) + '°');
  const pitchSel = h('select', { onchange: (e) => { hub.settings.camPitch = Number(e.target.value); saveSoon(); draw(); } },
    [[40, 'กล้องเกมตอนนี้ (ก้ม 40°)'], [14, 'กล้อง FF Re (ก้ม 14°)'], [8.5, 'กล้อง r36 (ก้ม 8.5°)']].map(([v, t]) => h('option', { value: v, selected: pitch() === v }, t)));
  const feetOut = h('div', { class: 'small dim' });
  right.append(h('h3', {}, 'ค่าเงาของตัวนี้'), sl,
    h('h3', {}, 'จุดเท้า'), feetOut,
    h('div', { class: 'tools' },
      h('button', { onclick: () => { if (!frames[0]) return; s.feet = guessFeet(frames[0]); commit(); sync(); draw(); } }, 'ให้ Claude หาจุดเท้าใหม่'),
      h('button', { class: 'ghost', onclick: () => { s.cast.ox = 0; s.cast.oy = 0; s.cast.k = null; commit(); draw(); } }, 'คืนรูปเงาตามตัว'),
      h('button', { class: 'ghost', onclick: () => { s = JSON.parse(JSON.stringify(SHADOW_DEFAULT)); if (frames[0]) s.feet = guessFeet(frames[0]); commit(); sync(); draw(); } }, 'คืนค่าเริ่มต้น')),
    h('h3', {}, 'มุมกล้องที่ใช้ดู'), pitchSel,
    frames.length > 1 || src.slot === 'frames' ? h('div', { class: 'tools' }, h('button', { onclick: () => { playing = !playing; } }, 'เล่น/หยุดท่าหายใจ')) : null,
    h('p', { class: 'small faint' }, `ตั้งบนภาพ: ${src.file.split('/').pop()} · กด "ส่งค่าเงาเข้า Godot" ด้านบนเมื่อปรับครบ`));
  function sync() { for (const f of Object.values(vals)) f(); feetOut.textContent = `ตำแหน่งในภาพ x ${(s.feet[0] * 100).toFixed(1)}% · เส้นพื้น y ${(s.feet[1] * 100).toFixed(1)}% · ภาพ ${size[0]}×${size[1]} px`; }
  // geometry (canvas px)
  const geo = () => {
    const W = cv.width, H = cv.height, T = 300, k = Math.sin(pitch() * Math.PI / 180);
    const C = { x: W * 0.5, y: H * 0.74 };
    const f = frames[fi] || frames[0];
    const sh = SPR_H / TILE * T, sw = f ? sh * f.width / f.height : sh;
    return { W, H, T, k, C, sh, sw, f };
  };
  function draw() {
    const g = cv.getContext('2d'); const { W, H, T, k, C, sh, sw, f } = geo();
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    if (bg) { const r = Math.max(W / bg.width, H / bg.height); g.globalAlpha = 0.85; g.drawImage(bg, (W - bg.width * r) / 2, (H - bg.height * r) * 0.7, bg.width * r, bg.height * r); g.globalAlpha = 1; }
    else { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#2f3a33'); gr.addColorStop(1, '#4a5a44'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
    // slot ring
    const rr = RING_R / TILE * T;
    g.strokeStyle = 'rgba(150,200,255,.55)'; g.lineWidth = 3; g.beginPath(); g.ellipse(C.x, C.y, rr, rr * k, 0, 0, Math.PI * 2); g.stroke();
    if (!f) return;
    const fx = s.feet[0] * sw, fy = s.feet[1] * sh; // feet inside the drawn sprite
    // shadow that follows the body (owner F1): the picture rows above the ground line, darkened, faded to the head,
    // blurred (softness), then warped onto 4 ground corners — start = sun projection, each corner can be dragged
    const cg = castGeo();
    hitG.setTransform(1, 0, 0, 1, 0, 0); hitG.clearRect(0, 0, W, H);
    if (s.cast.len > 0 && cg.silH > 0) {
      const sil = silCanvas(f, cg.silH);
      g.globalAlpha = Math.max(0.05, s.cast.str); warp(g, sil, cg); g.globalAlpha = 1;
      warp(hitG, sil, cg);
    }
    // oval
    const o = s.oval, ox = C.x + o.dx * T, oy = C.y + o.dy * T * k, rw = o.w * T / 2, rh = Math.max(2, o.h * T * k / 2);
    const ovOn = o.on !== false;
    if (ovOn) { g.save(); g.translate(ox, oy); g.scale(1, rh / rw);
    const rg = g.createRadialGradient(0, 0, 0, 0, 0, rw); rg.addColorStop(0, `rgba(0,0,0,${0.55 * o.a})`); rg.addColorStop(0.6, `rgba(0,0,0,${0.35 * o.a})`); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg; g.beginPath(); g.arc(0, 0, rw, 0, Math.PI * 2); g.fill(); g.restore(); }
    // sprite
    const x0 = C.x - fx, y0 = C.y - fy;
    g.imageSmoothingEnabled = f.width > 300; g.drawImage(f, x0, y0, sw, sh);
    // ground line + feet cross + oval handles
    g.strokeStyle = 'rgba(255,230,120,.8)'; g.setLineDash([6, 5]); g.lineWidth = 1.5; g.beginPath(); g.moveTo(x0 - 20, C.y); g.lineTo(x0 + sw + 20, C.y); g.stroke(); g.setLineDash([]);
    g.strokeStyle = '#ffe678'; g.lineWidth = 2; g.beginPath(); g.moveTo(C.x - 10, C.y); g.lineTo(C.x + 10, C.y); g.moveTo(C.x, C.y - 10); g.lineTo(C.x, C.y + 10); g.stroke();
    g.fillStyle = '#fff'; g.strokeStyle = '#000';
    if (ovOn) for (const [hx, hy] of [[ox + rw, oy], [ox, oy + rh]]) { g.beginPath(); g.arc(hx, hy, 6, 0, Math.PI * 2); g.fill(); g.stroke(); }
    // cast-shadow tip handle (orange) on a dashed line from where the shadow starts
    g.strokeStyle = 'rgba(255,160,60,.9)'; g.setLineDash([5, 4]); g.lineWidth = 1.5; g.beginPath(); g.moveTo(cg.bx, cg.by); g.lineTo(cg.tip.x, cg.tip.y); g.stroke(); g.setLineDash([]);
    g.fillStyle = '#ff9a3c'; g.strokeStyle = '#000'; g.beginPath(); g.arc(cg.tip.x, cg.tip.y, 9, 0, Math.PI * 2); g.fill(); g.stroke();
    // 4 corner handles (orange squares): base corners meet the front / back feet, top corners stretch or tilt the tip
    g.strokeStyle = 'rgba(255,160,60,.5)'; g.lineWidth = 1; g.beginPath();
    g.moveTo(cg.q.bl.x, cg.q.bl.y); g.lineTo(cg.q.br.x, cg.q.br.y); g.lineTo(cg.q.tr.x, cg.q.tr.y); g.lineTo(cg.q.tl.x, cg.q.tl.y); g.closePath(); g.stroke();
    for (const c of Object.values(cg.q)) { g.fillStyle = '#ffb35c'; g.strokeStyle = '#000'; g.fillRect(c.x - 6, c.y - 6, 12, 12); g.strokeRect(c.x - 6, c.y - 6, 12, 12); }
  }
  // dark, faded, blurred silhouette of the rows above the ground line (padding = room for the blur)
  function silCanvas(f, silH) {
    const bl = Math.round((s.cast.blur ?? 0.3) * 0.12 * f.height), pad = bl * 2 + 1;
    const base = document.createElement('canvas'); base.width = f.width; base.height = silH;
    const bg2 = base.getContext('2d'); bg2.drawImage(f, 0, 0, f.width, silH, 0, 0, f.width, silH);
    bg2.globalCompositeOperation = 'source-in'; bg2.fillStyle = 'rgb(13,18,33)'; bg2.fillRect(0, 0, f.width, silH);
    bg2.globalCompositeOperation = 'destination-in'; const fd = bg2.createLinearGradient(0, silH, 0, 0); fd.addColorStop(0, '#000'); fd.addColorStop(1, 'rgba(0,0,0,.35)'); bg2.fillStyle = fd; bg2.fillRect(0, 0, f.width, silH);
    const c = document.createElement('canvas'); c.width = f.width + pad * 2; c.height = silH + pad * 2;
    const cg2 = c.getContext('2d'); if (bl > 0) cg2.filter = `blur(${bl}px)`; cg2.drawImage(base, pad, pad);
    c.pad = pad; c.fw = f.width; c.fh = silH;
    return c;
  }
  // draw sil onto the quad cg.q in thin horizontal strips (each strip = one affine piece of the bilinear warp)
  function warp(ctx, sil, cg) {
    const { tl, tr, bl, br } = cg.q, pad = sil.pad, fw = sil.fw, fh = sil.fh;
    const L = (u, t) => ({ x: (tl.x + (tr.x - tl.x) * u) * (1 - t) + (bl.x + (br.x - bl.x) * u) * t, y: (tl.y + (tr.y - tl.y) * u) * (1 - t) + (bl.y + (br.y - bl.y) * u) * t });
    const N = 40, u0 = -pad / fw, u1 = (fw + pad) / fw;
    ctx.imageSmoothingEnabled = true;
    for (let i = 0; i < N; i++) {
      const y0 = (sil.height * i) / N, y1 = (sil.height * (i + 1)) / N;
      const t0 = (y0 - pad) / fh, t1 = (y1 - pad) / fh;
      const A = L(u0, t0), B = L(u1, t0), Cc = L(u0, t1);
      const a = (B.x - A.x) / sil.width, b = (B.y - A.y) / sil.width, c = (Cc.x - A.x) / (y1 - y0), d = (Cc.y - A.y) / (y1 - y0);
      ctx.setTransform(a, b, c, d, A.x - c * y0, A.y - d * y0);
      ctx.drawImage(sil, 0, y0, sil.width, Math.min(sil.height - y0, y1 - y0 + 1), 0, y0, sil.width, Math.min(sil.height - y0, y1 - y0 + 1));
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  // cast geometry: image (u, v) -> canvas = (a*u + c*v + e, d*v + f)
  function castGeo() {
    const { T, k, C, sh, sw, f } = geo(), D = sunDir(), m = s.cast.len * SUN_REACH;
    const fw = f ? f.width : 1, fh = f ? f.height : 1;
    const bx = C.x + (s.cast.ox || 0) * T, by = C.y + (s.cast.oy || 0) * T * k;
    const a = sw / fw, c = -(sh / fh) * m * D.x, d = -(sh / fh) * m * D.z * k;
    const hgt = Math.max(1, s.feet[1] * sh);
    const e = bx - a * s.feet[0] * fw - c * s.feet[1] * fh, ff = by - d * s.feet[1] * fh, silH = Math.max(1, Math.round(s.feet[1] * fh));
    const P = (u, v) => ({ x: a * u + c * v + e, y: d * v + ff });
    const K = s.cast.k || {}, off = (pt, kk) => ({ x: pt.x + ((K[kk] || [0, 0])[0]) * T, y: pt.y + ((K[kk] || [0, 0])[1]) * T * k });
    const q = { tl: off(P(0, 0), 'tl'), tr: off(P(fw, 0), 'tr'), bl: off(P(0, silH), 'bl'), br: off(P(fw, silH), 'br') };
    const tip = { x: (q.tl.x + q.tr.x) / 2, y: (q.tl.y + q.tr.y) / 2 };
    const base0 = P(s.feet[0] * fw, silH);
    return { a, c, d, e, f: ff, bx: base0.x, by: base0.y, hgt, silH, q, tip, def: { tl: P(0, 0), tr: P(fw, 0), bl: P(0, silH), br: P(fw, silH) } };
  }
  // dragging
  let drag = null;
  const pos = (e) => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * cv.width / r.width, y: (e.clientY - r.top) * cv.height / r.height }; };
  cv.addEventListener('pointerdown', (e) => {
    if (!s) return;
    const p = pos(e), { T, k, C, sh, sw } = geo(), o = s.oval;
    const ox = C.x + o.dx * T, oy = C.y + o.dy * T * k, rw = o.w * T / 2, rh = Math.max(2, o.h * T * k / 2);
    const near = (x, y) => Math.hypot(p.x - x, p.y - y) < 14;
    const x0 = C.x - s.feet[0] * sw, y0 = C.y - s.feet[1] * sh;
    const cg = castGeo();
    const onSil = hitG.getImageData(Math.round(p.x), Math.round(p.y), 1, 1).data[3] > 20;
    const corner = Object.entries(cg.q).find(([, c]) => Math.abs(p.x - c.x) < 10 && Math.abs(p.y - c.y) < 10);
    if (corner) drag = { t: 'corner', kk: corner[0], sx: p.x, sy: p.y, o: [...((s.cast.k || {})[corner[0]] || [0, 0])] };
    else if (Math.hypot(p.x - cg.tip.x, p.y - cg.tip.y) < 16) drag = { t: 'tip' };
    else if (o.on !== false && near(ox + rw, oy)) drag = { t: 'w' };
    else if (o.on !== false && near(ox, oy + rh)) drag = { t: 'h' };
    else if (p.x > x0 && p.x < x0 + sw && p.y > y0 && p.y < C.y - 6) drag = { t: 'feet', sx: p.x, sy: p.y, f: [...s.feet] };
    else if (onSil) drag = { t: 'cast', sx: p.x, sy: p.y, ox: s.cast.ox || 0, oy: s.cast.oy || 0 };
    else if (o.on !== false && ((p.x - ox) / rw) ** 2 + ((p.y - oy) / rh) ** 2 <= 1) drag = { t: 'oval', sx: p.x, sy: p.y, dx: o.dx, dy: o.dy };
    else if (p.x > x0 && p.x < x0 + sw && p.y > y0 && p.y < y0 + sh) drag = { t: 'feet', sx: p.x, sy: p.y, f: [...s.feet] };
    if (drag) { try { cv.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ } cv.style.cursor = 'grabbing'; }
  });
  cv.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = pos(e), { T, k, C, sh, sw } = geo(), o = s.oval;
    if (drag.t === 'tip') {
      const cg = castGeo(), kt = s.cast.k || {}, tdx = (((kt.tl || [0, 0])[0]) + ((kt.tr || [0, 0])[0])) / 2 * T, tdz = (((kt.tl || [0, 0])[1]) + ((kt.tr || [0, 0])[1])) / 2 * T;
      const vx = p.x - tdx - cg.bx, vz = (p.y - tdz * k - cg.by) / k;
      s.cast.len = Math.max(0, Math.min(2, Math.hypot(vx, vz) / cg.hgt / SUN_REACH));
      hub.settings.sunAngle = +(Math.atan2(vz, vx) * 180 / Math.PI).toFixed(1);
    }
    if (drag.t === 'corner') { s.cast.k = { ...(s.cast.k || {}) }; s.cast.k[drag.kk] = [Math.max(-3, Math.min(3, drag.o[0] + (p.x - drag.sx) / T)), Math.max(-3, Math.min(3, drag.o[1] + (p.y - drag.sy) / (T * k)))]; }
    if (drag.t === 'cast') { s.cast.ox = Math.max(-1, Math.min(1, drag.ox + (p.x - drag.sx) / T)); s.cast.oy = Math.max(-1, Math.min(1, drag.oy + (p.y - drag.sy) / (T * k))); }
    if (drag.t === 'w') o.w = Math.max(0.1, Math.min(2, Math.abs(p.x - (C.x + o.dx * T)) * 2 / T));
    if (drag.t === 'h') o.h = Math.max(0.05, Math.min(2, Math.abs(p.y - (C.y + o.dy * T * k)) * 2 / (T * k)));
    if (drag.t === 'oval') { o.dx = Math.max(-1, Math.min(1, drag.dx + (p.x - drag.sx) / T)); o.dy = Math.max(-1, Math.min(1, drag.dy + (p.y - drag.sy) / (T * k))); }
    if (drag.t === 'feet') { s.feet = [Math.max(0, Math.min(1, drag.f[0] - (p.x - drag.sx) / sw)), Math.max(0, Math.min(1, drag.f[1] - (p.y - drag.sy) / sh))]; }
    sync(); draw();
  });
  const end = () => { if (drag) { drag = null; cv.style.cursor = ''; s.feet = s.feet.map((v) => +v.toFixed(4)); for (const kk of ['dx', 'dy', 'w', 'h']) s.oval[kk] = +s.oval[kk].toFixed(3); for (const kk of ['len', 'ox', 'oy']) s.cast[kk] = +(s.cast[kk] || 0).toFixed(3); if (s.cast.k) for (const kk in s.cast.k) s.cast.k[kk] = s.cast.k[kk].map((v) => +v.toFixed(3)); commit(); sync(); } };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  // load pictures
  (async () => {
    if (hub.settings.arenaBg) bg = await loadImg(hub.settings.arenaBg).catch(() => null);
    const img = await loadImg(src.file);
    if (src.slot === 'frames' && src.meta) { for (let i = 0; i < (src.meta.n || 1); i++) frames.push(keyed(img, ...sheetFrame(img, src.meta, i))); size = [src.meta.fw, src.meta.fh]; }
    else { frames = [keyed(img)]; size = [img.naturalWidth, img.naturalHeight]; }
    if (!s) { s = JSON.parse(JSON.stringify(SHADOW_DEFAULT)); s.feet = guessFeet(frames[0]); } // saved only once the owner changes something
    s.oval = { ...SHADOW_DEFAULT.oval, ...s.oval, on: false }; s.cast = { ...SHADOW_DEFAULT.cast, ...s.cast };
    sync(); draw();
    let last = 0; const ms = src.meta?.ms || 190;
    const tick = (t) => { if (!cv.isConnected) return; if (playing && frames.length > 1 && t - last >= ms) { last = t; fi = (fi + 1) % frames.length; draw(); } requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  })().catch(() => left.append(h('p', { class: 'bad' }, 'เปิดภาพไม่ได้')));
}

// ---------- queue / library / new item ----------
function queueDialog(it) {
  const body = $('dlgBody');
  const ta = h('textarea', { rows: 5, placeholder: 'เช่น เขียนพรอมต์ร่าง 1 ให้ตัวนี้ · ตัดพื้นภาพที่ติดดาว · วิดีโอมาแล้ว แตกเฟรมให้หน่อย' });
  const step = STEPS.find(([k]) => k === ui.step);
  let task = '';
  const vid = it.kind === 'character' ? pick(it, 'video', ui.form, ui.move) : null;
  const preset = h('button', { class: 'primary', disabled: !vid || job.state === 'run', title: vid ? '' : 'ต้องติดดาววิดีโอของร่าง/ท่านี้ก่อน', onclick: () => { $('dlg').close(); startFrames(it, vid); } }, 'ตัดเฟรม + สร้างเงา (ทำเลย)');
  const stl = it.kind === 'character' ? pick(it, 'still', ui.form) || latest(it, 'still', ui.form) : null;
  body.replaceChildren(h('h3', { style: 'margin-top:0' }, `ส่งงานให้ Claude: ${it.id} ${it.name || ''}`),
    it.kind === 'character' ? h('div', { class: 'tools' }, h('button', { class: 'primary', disabled: !stl, onclick: () => { $('dlg').close(); sendCheck(it, stl); } }, 'ตรวจภาพ + เขียนพรอมต์วิดีโอ'), h('span', { class: 'small dim' }, stl ? `ภาพนิ่งร่าง ${ui.form} ${stl.star ? 'ที่ติดดาว' : 'ล่าสุด'}` : 'วางภาพนิ่งก่อน')) : null,
    it.kind === 'character' ? h('div', { class: 'tools' }, preset, h('span', { class: 'small dim' }, vid ? 'โปรแกรมทำเองทันที ไม่ต้องรอ Claude · ช่องข้อความด้านล่างไว้สำหรับงานอื่นที่ต้องให้ Claude คิด' : 'ติดดาววิดีโอในขั้น "วิดีโอ" ก่อน ปุ่มนี้จึงจะกดได้')) : null,
    h('p', { class: 'small dim' }, `งานจะเข้าคิว พอคุณบอก Claude ว่า "ดูคิว" Claude จะทำทุกงานที่รออยู่ (ตอนนี้อยู่ขั้น: ${step ? step[1] : ''} ร่าง ${ui.form})`), ta,
    h('div', { class: 'tools' }, h('button', {
      class: 'primary', onclick: () => {
        const t = ta.value.trim(); if (!t) return;
        hub.queue.push({ id: uid('q'), item: it.id, task: task || undefined, video: task && vid ? vid.id : undefined, step: ui.step, form: ui.form, move: ui.move, t: new Date().toISOString(), text: t, state: 'open', reply: '' });
        $('dlg').close(); save().then(() => { toast('ส่งเข้าคิวแล้ว'); render(); });
      },
    }, 'ส่งเข้าคิว'), h('button', { onclick: () => $('dlg').close() }, 'ยกเลิก')));
  $('dlg').showModal(); ta.focus();
}
function renderQueue(m) {
  const open = hub.queue.filter((q) => q.state === 'open'), done = hub.queue.filter((q) => q.state === 'done').reverse(), cancel = hub.queue.filter((q) => q.state === 'cancel').reverse();
  m.append(h('h2', {}, 'งานที่ส่งถึง Claude'));
  m.append(h('div', { class: 'job' + (open.length ? '' : ' done') }, open.length
    ? [h('b', {}, `มี ${open.length} งานรอ Claude`), h('span', { class: 'small' }, 'พิมพ์ "ดูคิว" ในแชท Claude จะทำทุกงานที่รอ แล้วเขียนผลกลับมาที่นี่')]
    : [h('b', {}, 'ไม่มีงานค้าง'), h('span', { class: 'small' }, 'เปิดตัวละคร แล้วกด "ส่งงานให้ Claude"')]));
  const go = (q, step) => { const it = hub.items[q.item]; ui.tab = it?.kind === 'character' ? 'chars' : 'other'; ui.step = step; ui.form = q.form || 1; if (q.move) ui.move = q.move; openItem(q.item); };
  const card = (q) => {
    const it = hub.items[q.item];
    const state = q.state === 'open' ? ['รอ Claude', 'wait'] : q.state === 'done' ? [q.by === 'auto' ? 'โปรแกรมทำเสร็จ' : q.result === 'fail' ? 'ตรวจไม่ผ่าน' : q.task === 'check+veo' ? 'ตรวจผ่าน' : 'เสร็จแล้ว', q.result === 'fail' ? 'wait' : 'ok'] : ['ยกเลิกแล้ว', 'off'];
    return h('div', { class: 'q q-' + state[1], style: `--c: ${tribeVar(it?.tribe)}` },
      h('div', { class: 'row' }, h('b', { style: 'font-size:17px' }, `${q.item} ${it?.name || ''}`), h('span', { class: 'pill' }, taskTh(q)),
        h('span', { class: 'sp' }), h('span', { class: 'pill st' }, state[0])),
      h('div', { class: 'small dim' }, `ร่าง ${q.form || 1}${q.move ? ' · ท่า' + moveTh(q.move) : ''} · ส่งเมื่อ ${fmtDate(q.t)}`),
      q.task ? null : h('div', { style: 'white-space:pre-wrap;margin-top:4px' }, q.text),
      q.state === 'open' ? h('div', { class: 'small', style: 'margin-top:6px' }, q.task === 'frames+shadow' ? 'Claude จะ: แตกวิดีโอที่ติดดาวเป็น 32 เฟรม → ใส่ในขั้น "เฟรม" → วางเงาเริ่มต้นบนเฟรมชุดใหม่' : q.task === 'check+veo' ? 'Claude จะ: ตรวจภาพตามกฎ (เผ่าดูออก แฟนตาซี หน้าไม่ดุเกิน ไม่มีชมพู พื้นเขียวตัดได้) → ผ่าน: ตัดพื้น + ภาพส่ง Veo + พรอมต์วิดีโอ · ไม่ผ่าน: เหตุผล + พรอมต์ Gemini รุ่นแก้' : 'Claude จะทำตามข้อความด้านบน') : null,
      q.reply ? h('div', { class: 'small', style: 'margin-top:6px;white-space:pre-wrap' }, (q.by === 'auto' ? 'โปรแกรม: ' : 'Claude: ') + q.reply) : null,
      q.state === 'done' && nextTh(q) ? h('div', { class: 'small next' }, nextTh(q)) : null,
      h('div', { class: 'tools' },
        q.state === 'done' && q.task === 'check+veo' ? (q.result === 'fail' ? h('button', { class: 'primary', onclick: () => go(q, 'prompt') }, 'เปิดขั้นพรอมต์') : h('button', { class: 'primary', onclick: () => go(q, 'veoin') }, 'เปิดช่อง 4 ภาพส่ง Veo'))
          : q.state === 'done' && q.task === 'frames+shadow' ? [h('button', { class: 'primary', onclick: () => go(q, 'frames') }, 'เปิดขั้นเฟรม'), h('button', { onclick: () => go(q, 'shadow') }, 'เปิดขั้นเงา')] : h('button', { class: 'ghost', onclick: () => go(q, q.step || 'still') }, 'เปิดตัวนี้'),
        q.state === 'open' ? h('button', { class: 'ghost', onclick: () => { q.state = 'cancel'; save().then(render); } }, 'ยกเลิกงานนี้') : null));
  };
  const section = (title, list) => { if (list.length) m.append(h('h3', {}, `${title} (${list.length})`), ...list.map(card)); };
  section('รอ Claude', open); section('เสร็จแล้ว', done); section('ยกเลิก', cancel);
}
let libCache = null;
async function renderLibrary(m) {
  m.append(h('h2', {}, 'คลังเดิม (art/library)'), h('p', { class: 'dim' }, 'ไฟล์ทุกชิ้นที่อยู่ในคลังถาวร อ่านอย่างเดียว ไฟล์ที่นี่ไม่ถูกลบหรือเขียนทับ · เลือกภาพฉากเพื่อใช้เป็นพื้นหลังตอนดูตัวละครในฉากและตอนตั้งเงา'));
  const box = h('div', {}); m.append(box);
  if (!libCache) libCache = await api('/api/library').catch(() => []);
  const tb = h('table', { class: 'lib' }, h('tr', {}, ['', 'ไฟล์', 'คืออะไร', 'ที่มา', 'สิทธิ์', ''].map((t) => h('th', {}, t))));
  for (const r of libCache) {
    const rel = 'lib/' + r.file;
    const pic = isImage(r.file) && !/[[\]*]| \/ /.test(r.file); // INDEX rows that name a group of files (tree_[ABC]…) have no single picture
    const isBg = hub.settings.arenaBg === rel;
    tb.append(h('tr', {}, h('td', {}, pic ? h('img', { src: fileUrl(rel), alt: '', loading: 'lazy' }) : h('span', { class: 'faint small' }, r.file.split('.').pop())),
      h('td', { class: 'small' }, r.file), h('td', { class: 'small dim' }, r.what), h('td', { class: 'small' }, `${r.source || ''} ${r.date || ''}`), h('td', { class: 'small faint' }, r['licence-status'] || ''),
      h('td', {}, pic ? h('button', { class: isBg ? 'on' : 'ghost', onclick: () => { hub.settings.arenaBg = isBg ? '' : rel; save().then(render); } }, isBg ? 'พื้นฉากอยู่' : 'ใช้เป็นพื้นฉาก') : null)));
  }
  box.append(tb);
}
function newItemDialog() {
  const body = $('dlgBody');
  const kind = h('select', {}, Object.entries(KIND_TH).filter(([k]) => k !== 'character').map(([k, v]) => h('option', { value: k }, v)));
  const id = h('input', { type: 'text', placeholder: 'รหัสภาษาอังกฤษ เช่น stone-runes', maxlength: 40 });
  const nm = h('input', { type: 'text', placeholder: 'ชื่อที่อ่านง่าย เช่น เสาหินรูน' });
  const err = h('p', { class: 'small bad' });
  body.replaceChildren(h('h3', { style: 'margin-top:0' }, 'เพิ่มรายการใหม่'), h('div', { class: 'checks' }, h('label', {}, 'ประเภท ', kind), h('label', {}, 'รหัส ', id), h('label', {}, 'ชื่อ ', nm)), err,
    h('div', { class: 'tools' }, h('button', {
      class: 'primary', onclick: () => {
        const v = id.value.trim();
        if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/.test(v)) { err.textContent = 'รหัสใช้ได้เฉพาะ a-z 0-9 - _ ไม่เกิน 40 ตัว'; return; }
        if (hub.items[v]) { err.textContent = 'มีรหัสนี้อยู่แล้ว'; return; }
        hub.items[v] = { id: v, kind: kind.value, name: nm.value.trim(), tribe: '', prompts: [], rounds: [], notes: '', inGame: false, shadow: null };
        $('dlg').close(); ui.step = 'still'; save().then(() => openItem(v));
      },
    }, 'เพิ่ม'), h('button', { onclick: () => $('dlg').close() }, 'ยกเลิก')));
  $('dlg').showModal(); id.focus();
}

// ---------- boot ----------
document.querySelectorAll('#tabs button').forEach((b) => b.addEventListener('click', () => { ui.tab = b.dataset.tab; if (ui.tab === 'chars' || ui.tab === 'other') { const it = hub.items[ui.item]; if (it && (it.kind !== 'character') !== (ui.tab === 'other')) ui.item = null; } render(); }));
$('search').addEventListener('input', (e) => { ui.q = e.target.value; render(); });
$('statusFilter').addEventListener('change', (e) => { ui.status = e.target.value; render(); });
$('boardBtn').addEventListener('click', () => { ui.item = null; render(); });
$('exportBtn').addEventListener('click', async () => { try { const r = await api('/api/export', { method: 'POST' }); if (r.library) { hub = await api('/api/hub'); render(); } toast(`เขียน ${r.file} แล้ว (${r.units} ตัว)${r.library ? ` · เก็บเข้าคลังถาวร ${r.library} ไฟล์` : ''}`); } catch (e) { toast(e.message); } });
$('dlg').addEventListener('click', (e) => { if (e.target === $('dlg')) $('dlg').close(); });
api('/api/hub').then((j) => { hub = j; render(); pollJob(); }).catch((e) => { $('main').append(h('p', { class: 'bad' }, 'โหลดข้อมูลไม่ได้: ' + e.message)); });
