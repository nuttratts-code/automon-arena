// Automon asset hub page (set 240). Plain DOM, textContent only (HARD RULE 7), no outside scripts.
'use strict';

const TRIBES = [
  ['steel', 'เหล็กกล้า'], ['fire', 'เพลิงเผา'], ['storm', 'สายฟ้า'], ['wind', 'วายุ'], ['spirit', 'ภูติ'], ['demon', 'อสูร'],
];
const TRIBE_TH = Object.fromEntries(TRIBES);
const KIND_TH = { character: 'ตัวละคร', scene: 'ฉาก', prop3d: 'โมเดล 3D', effect: 'เอฟเฟกต์', ui: 'UI' };
const STATUS = [
  ['none', 'ยังไม่เริ่ม'], ['wait-still', 'รอภาพนิ่ง'], ['pick', 'รอเลือกภาพ'], ['wait-video', 'รอท่ายืน'],
  ['claude', 'รอ Claude ทำเฟรม'], ['done', 'เฟรมเสร็จ'], ['ingame', 'อยู่ในเกมแล้ว'],
];
const STATUS_TH = Object.fromEntries(STATUS);
const TASK_TH = { 'frames+shadow': 'ตัดเฟรม + สร้างเงา', 'check+veo': 'ตรวจภาพ + เขียนพรอมต์วิดีโอ' };
const taskTh = (q) => TASK_TH[q.task] || 'งานอื่น';
// what the owner does once Claude has finished, per task
const NEXT_TH = { 'frames+shadow': 'ถึงตาคุณ: เปิดขั้น "เฟรม" ติดดาวถ้าโอเค แล้วเปิดขั้น "เงา" ปรับต่อ',
  'check+veo:pass': 'ถึงตาคุณ: เปิดแท็บ "พรอมต์" ส่วน "ภาพส่ง Veo" ดาวน์โหลดภาพ + คัดลอกพรอมต์วิดีโอ ไปเจนใน Veo แล้ววางวิดีโอในขั้น "วิดีโอ" ติดดาว แล้วกด "ตัดเฟรม + สร้างเงา"',
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
// set 262: jobs of the old video flow (check+veo, frames+shadow) are hidden with the switch off; free-text jobs always show
const OLD_TASKS = ['check+veo', 'frames+shadow'];
const jobShown = (q) => showOld || !OLD_TASKS.includes(q.task);
const openJobs = (id) => (hub.queue || []).filter((q) => q.item === id && q.state === 'open' && jobShown(q));
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
// owner C1 (set 246): the rarely used prompt + Veo-input steps are one "พรอมต์" tab at the end (ui.step 'veoin' opens it)
const STEPS = [
  ['still', 'ภาพนิ่ง + ตัดพื้น', 'คุณวางภาพ · ตัดพื้น · ไอคอน'],
  ['video', 'วิดีโอ', 'คุณวางวิดีโอ'],
  ['frames', 'เฟรม', 'กดปุ่ม โปรแกรมทำ'],
  ['shadow', 'เงา', 'คุณปรับ · เลือกเฟรม'],
  ['file', 'ไฟล์อื่น', '.pxo ฯลฯ'],
  ['prompt', 'พรอมต์', 'ภาพ + ภาพส่ง Veo'],
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
// set 262 (owner): parts outside the current flow (still batch → /pick → ★ → idle brief → PixelLab 8×150 ms → ★ → icon + shadow)
// are hidden from the screen only; data, files and old rounds stay. Switch "แสดงส่วนที่ซ่อน" (per browser) shows them again.
let showOld = false; try { showOld = localStorage.getItem('hubShowOld') === '1'; } catch { /* storage off */ }
const OLD_STEPS = ['video', 'file', 'prompt'];
const ui = { tab: 'chars', item: null, step: 'still', form: 1, move: 'idle', bg: 'checker', sel: null, cmp: [], tribe: '', status: '', q: '', showArch: false };

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
  if (!r.ok) { if (opts.method === 'POST') saveFlash('บันทึกไม่สำเร็จ: ' + (j.error || r.statusText), true); throw new Error(j.error || r.statusText); }
  if (opts.method === 'POST') saveFlash(FLASH_TH[path.split('?')[0]] || 'บันทึกแล้ว');
  return j;
}
// big save notice (owner D1, set 247): green "✓ saved" at the bottom centre for 1.5 s after every write; a failure stays red until closed
const FLASH_TH = { '/api/frames': 'เริ่มทำเฟรมแล้ว', '/api/export': 'ส่งเข้า Godot แล้ว', '/api/star': 'บันทึกแล้ว · ใช้อันนี้' };
function saveFlash(msg, bad) {
  let el = $('saveFlash');
  if (!el) { el = h('div', { id: 'saveFlash', role: 'status', 'aria-live': 'polite' }); document.body.append(el); }
  clearTimeout(saveFlash.k);
  el.className = 'show' + (bad ? ' bad' : '');
  el.replaceChildren(...[h('span', { class: 'ic' }, bad ? '!' : '✓'), h('span', {}, msg), bad ? h('button', { class: 'ghost', 'aria-label': 'ปิด', onclick: () => el.classList.remove('show') }, '×') : null].filter(Boolean));
  if (!bad) saveFlash.k = setTimeout(() => el.classList.remove('show'), 1500);
}
// header save light (set 246 UI pass): the owner sees every change land
function saveState(t, cls) { const s = $('saveState'); if (s) { s.textContent = t; s.className = 'small ' + (cls || 'faint'); } }
async function save() {
  // keep the same hub object (open editors hold references into it); only take the new rev
  clearTimeout(saveT); saveState('กำลังบันทึก…');
  try { const j = await api('/api/hub', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(hub) }); hub.rev = j.rev; saveState('บันทึกแล้ว ' + new Date().toTimeString().slice(0, 5), 'ok'); }
  catch (e) { toast(e.message); saveState('บันทึกไม่สำเร็จ', 'bad'); }
}
let saveT = 0;
function saveSoon() { clearTimeout(saveT); saveState('มีการแก้ไข…'); saveT = setTimeout(save, 600); }

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
  if (it.kind === 'character') { const u = usedPic(it, 1); if (u) return u; }
  const byTime = (a, b) => (a.t || '').localeCompare(b.t || '');
  const cuts = it.rounds.filter((r) => !r.archived && r.slot === 'cut' && (r.form || 1) === 1 && isImage(r.file)).sort(byTime);
  if (cuts.length) return cuts.filter((r) => r.star).pop() || cuts.pop();
  const pics = it.rounds.filter((r) => !r.archived && ['still', 'frames'].includes(r.slot) && (r.form || 1) === 1 && (!r.move || r.move === 'idle') && isImage(r.file));
  return pics.filter((r) => r.star).sort(byTime).pop() || pics.sort(byTime).pop() || it.rounds.find((r) => !r.archived && isImage(r.file));
}
// The picture every page uses (owner set 248 A1): ONE ★ across the original stills and their cuts of a form, picked in the
// still step (the server keeps a single ★ across both slots). No ★ = the cut of the newest still, else that still.
function usedPic(it, form = 1) {
  if (!it) return null;
  const byT = (a, b) => (a.t || '').localeCompare(b.t || '');
  const rs = it.rounds.filter((r) => (r.slot === 'still' || r.slot === 'cut') && !r.archived && (r.form || 1) === form && isImage(r.file)).sort(byT);
  const st = rs.filter((r) => r.star).pop();
  if (st) return st;
  const still = rs.filter((r) => r.slot === 'still').pop();
  return cutOf(it, still) || still || rs.pop() || null;
}
function itemOfRound(r) { for (const it of Object.values(hub.items)) if (it.rounds.includes(r)) return it; return null; }
// Facing (owner set 248, round 2): what the still step shows is what every page and the game (our side) show. A still / cut is
// drawn as its file, mirrored when ⇋ กลับข้าง is on; every other picture of a creature (video, frames, Veo input, icon) turns the
// same way as the picture in use. Files are never changed.
function mirrorOf(r) {
  if (!r) return false;
  const it = itemOfRound(r);
  if (!it || it.kind !== 'character' || r.slot === 'still' || r.slot === 'cut') return !!r.flip;
  return !!usedPic(it, r.form || 1)?.flip;
}
const flipped = (el, r) => { if (mirrorOf(r)) el.classList.add('flipx'); return el; };
function mirrorCanvas(c) { const o = document.createElement('canvas'); o.width = c.width; o.height = c.height; const g = o.getContext('2d'); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(c, 0, 0); return o; }
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
    if (nc) ui.sel = nc.id; toast('ตัดพื้นแล้ว ภาพตัดพื้นนี้คือภาพที่ใช้ตอนนี้ (ภาพต้นฉบับยังอยู่)');
  } catch (e) { toast('ตัดพื้นไม่ได้: ' + e.message); }
  render();
}
// owner set 257 D1: meta.pingpong = play 1→n→2 (n frames kept once; PixelLab idles do not loop by themselves). Returns frame indexes of one loop.
function frameSeq(meta) {
  const n = meta?.n || (meta?.cols || 1) * (meta?.rows || 1), a = [...Array(n).keys()];
  return meta?.pingpong && n > 2 ? a.concat(a.slice(1, -1).reverse()) : a;
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
  // owner B1 (set 246 UI pass): the rail only shows while a creature is open, as a quick switcher (own search, no board filters)
  const rq = (ui.railQ || '').trim().toLowerCase();
  const items = Object.values(hub.items).filter((it) => (ui.tab === 'other' ? it.kind !== 'character' : it.kind === 'character')
    && (!rq || it.id.toLowerCase().includes(rq) || (it.name || '').toLowerCase().includes(rq)));
  const groups = ui.tab === 'other' ? Object.keys(KIND_TH).filter((k) => k !== 'character').map((k) => [k, KIND_TH[k], 'var(--dim)']) : TRIBES.map(([t, th]) => [t, th, tribeVar(t)]);
  for (const [g, label, c] of groups) {
    const rows = items.filter((it) => (ui.tab === 'other' ? it.kind : it.tribe) === g);
    if (!rows.length) continue;
    list.append(h('div', { class: 'grp', style: `--c: ${c}` }, label));
    for (const it of rows) {
      const st = status(it);
      list.append(h('button', { class: ui.item === it.id ? 'on' : '', title: `${it.id} ${it.name || ''} · ${STATUS_TH[st]}`, onclick: () => openItem(it.id) },
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
  const it = ui.item && hub.items[ui.item];
  const itemOpen = !!it && (ui.tab === 'chars' || ui.tab === 'other') && (ui.tab === 'other') === (it.kind !== 'character');
  $('rail').hidden = !itemOpen;
  document.querySelector('.shell').style.gridTemplateColumns = $('rail').hidden ? '1fr' : '';
  if (itemOpen) renderRail();
  const m = $('main'); m.replaceChildren();
  document.documentElement.style.setProperty('--tribe', it && it.kind === 'character' ? tribeVar(it.tribe) : 'var(--dim)');
  if (ui.tab === 'library') return renderLibrary(m);
  if (ui.tab === 'queue') return renderQueue(m);
  if (ui.tab === 'team') return renderTeam(m);
  if (it && (ui.tab === 'other') === (it.kind !== 'character')) return renderItem(m, it);
  renderBoard(m);
}

// owner A1 (set 246 UI pass): one row of 8 per tribe, quiet empty tiles; search + tribe + status filters on top (filter in place, typing keeps focus)
function renderBoard(m) {
  const other = ui.tab === 'other';
  const items = Object.values(hub.items).filter(other ? (it) => it.kind !== 'character' : (it) => it.kind === 'character');
  const counts = {}; for (const it of items) counts[status(it)] = (counts[status(it)] || 0) + 1;
  const unverified = Object.values(hub.items).filter((it) => it.inGame && it.rounds.some((r) => r.star && /UNVERIFIED/.test(r.licence || ''))).length;
  m.append(h('div', { class: 'row' }, h('h2', {}, other ? 'ฉาก โมเดล 3D เอฟเฟกต์ และ UI' : 'ภาพรวมตัวละคร'), h('span', { class: 'sp' }),
    other ? h('button', { onclick: newItemDialog }, '+ เพิ่มรายการใหม่') : null));
  const tiles = [], sections = [];
  const empty = h('p', { class: 'dim', hidden: true }, 'ไม่มีตัวที่ตรงกับตัวกรอง');
  function apply() {
    const q = ui.q.trim().toLowerCase();
    for (const t of tiles) t.el.hidden = !((!ui.tribe || t.it.tribe === ui.tribe || t.it.tribe2 === ui.tribe) && (!ui.status || t.st === ui.status)
      && (!q || t.it.id.toLowerCase().includes(q) || (t.it.name || '').toLowerCase().includes(q)));
    for (const s of sections) s.hidden = s.querySelectorAll('.tile:not([hidden])').length === 0;
    empty.hidden = tiles.some((t) => !t.el.hidden) || !items.length;
    chipBox.querySelectorAll('button').forEach((b) => b.classList.toggle('on', (b.dataset.t || '') === ui.tribe));
  }
  const search = h('input', { type: 'search', placeholder: 'ค้นหา ID หรือชื่อ', value: ui.q, 'aria-label': 'ค้นหา', oninput: (e) => { ui.q = e.target.value; apply(); } });
  const chipBox = h('div', { class: 'chips' }, h('button', { 'data-t': '', style: '--c: var(--dim)', onclick: () => { ui.tribe = ''; apply(); } }, 'ทุกเผ่า'),
    other ? null : TRIBES.map(([t, th]) => h('button', { 'data-t': t, style: `--c: ${tribeVar(t)}`, onclick: () => { ui.tribe = ui.tribe === t ? '' : t; apply(); } }, th)));
  const stSel = h('select', { 'aria-label': 'กรองตามสถานะ', onchange: (e) => { ui.status = e.target.value; apply(); } },
    h('option', { value: '' }, 'ทุกสถานะ'), STATUS.map(([k, v]) => h('option', { value: k, selected: ui.status === k }, `${v} (${counts[k] || 0})`)));
  m.append(h('div', { class: 'filters' }, search, chipBox, stSel));
  m.append(h('div', { class: 'legend' }, STATUS.map(([k, v]) => h('span', {}, h('i', { class: 'dot st-' + k }), v)),
    unverified ? h('span', { class: 'warn' }, `ในเกมแต่ยังเป็นภาพ AI ไม่ยืนยันสิทธิ์: ${unverified} ตัว`) : null));
  const groups = other ? Object.keys(KIND_TH).filter((k) => k !== 'character').map((k) => [k, KIND_TH[k], 'var(--dim)', (it) => it.kind === k])
    : TRIBES.map(([t, th]) => [t, th, tribeVar(t), (it) => it.tribe === t]);
  for (const [, label, c, ok] of groups) {
    const rows = items.filter(ok);
    if (!rows.length) continue;
    const box = h('div', { class: 'tiles' + (other ? '' : ' row8') });
    for (const it of rows) {
      const th = h('div', { class: 'th' });
      const r = thumbRound(it);
      if (r) thumbInto(th, r, 96);
      const st = status(it), jobs = openJobs(it.id);
      const el = h('button', { class: 'tile' + (r ? '' : ' empty'), style: `--tribe: ${tribeVar(it.tribe)}`, title: `${it.id} ${it.name || ''} · ${STATUS_TH[st]}`, onclick: () => openItem(it.id) }, th,
        h('div', { class: 'row nm' }, h('span', { class: 'dot st-' + st }), h('b', {}, it.id), h('span', { class: 'dim small ell' }, it.name || '')),
        h('div', { class: 'small faint' }, STATUS_TH[st]),
        jobs.length ? h('span', { class: 'badge corner', title: 'รอ Claude: ' + jobs.map(taskTh).join(', ') }, 'รอ Claude') : null);
      tiles.push({ el, it, st }); box.append(el);
    }
    const sec = h('section', { class: 'board-grp', style: `--c: ${c}` }, h('h3', {}, `${label} (${rows.length})`), box);
    sections.push(sec); m.append(sec);
  }
  m.append(empty);
  if (!items.length) m.append(h('p', { class: 'dim' }, other ? 'ยังไม่มีรายการ กด "เพิ่มรายการใหม่" เพื่อเริ่ม' : 'ยังไม่มีตัวละคร'));
  apply();
}

function thumbInto(box, r, max) {
  if (r.slot === 'frames' && r.meta) {
    loadImg(r.file).then((img) => { const [sx, sy, sw, sh] = sheetFrame(img, r.meta, 0); const c = keyed(img, sx, sy, sw, sh); box.append(flipped(c, r)); }).catch(() => {});
  } else if (isImage(r.file)) box.append(flipped(h('img', { src: fileUrl(r.file), alt: '', loading: 'lazy', onload: (e) => { if (e.target.naturalHeight <= 256) e.target.classList.add('px'); } }), r));
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
  for (const q of openJobs(it.id)) m.append(h('div', { class: 'job slim' },
    h('b', {}, `รอ Claude: ${taskTh(q)}`), h('span', { class: 'small dim' }, `ส่งเมื่อ ${fmtDate(q.t)} · พิมพ์ "ดูคิว" ในแชท`),
    h('span', { class: 'sp' }), h('button', { class: 'ghost small-btn', onclick: () => { q.state = 'cancel'; save().then(render); } }, 'ยกเลิกงานนี้')));
  if (job.state === 'run' && job.item === it.id) m.append(h('div', { class: 'job' }, h('b', {}, 'โปรแกรมกำลังตัดเฟรม + สร้างเงา'), h('span', { class: 'small', id: 'jobStep' }, job.step || ''), h('span', { class: 'spin' })));
  if (job.state === 'error' && job.item === it.id) m.append(h('div', { class: 'job bad-job' }, h('b', {}, 'ตัดเฟรมไม่สำเร็จ'), h('span', { class: 'small' }, job.msg), h('span', { class: 'sp' }), h('button', { class: 'ghost', onclick: () => { job = {}; render(); } }, 'ปิด')));
  const lastDone = (hub.queue || []).filter((q) => q.item === it.id && q.state === 'done' && !q.seen && jobShown(q)).pop();
  if (lastDone) m.append(h('details', { class: 'job done slim' },
    h('summary', {}, h('b', {}, `${lastDone.by === 'auto' ? 'โปรแกรม' : 'Claude '}ทำเสร็จแล้ว: ${taskTh(lastDone)}${lastDone.result === 'fail' ? ' (ไม่ผ่าน)' : ''}`),
      nextTh(lastDone) ? h('span', { class: 'small next-inline' }, nextTh(lastDone)) : null, h('span', { class: 'sp' }), h('span', { class: 'small faint' }, 'กดดูรายละเอียด'),
      h('button', { class: 'ghost small-btn', onclick: (e) => { e.preventDefault(); lastDone.seen = true; save().then(render); } }, 'รับทราบ')),
    h('div', { class: 'small', style: 'white-space:pre-wrap;padding-top:6px' }, lastDone.reply || '')));
  const steps = isChar ? STEPS.filter(([k]) => showOld || !OLD_STEPS.includes(k)) : STEPS.filter(([k]) => ['still', 'video', 'file'].includes(k));
  const labels = isChar ? (showOld ? null : { still: 'ภาพนิ่ง' }) : { still: 'ภาพ', video: 'วิดีโอ', file: 'ไฟล์ (.glb ฯลฯ)' };
  const subs = isChar && !showOld ? { still: 'คุณติดดาว · ไอคอน', frames: 'ท่ายืน PixelLab' } : {};
  if (isChar && !showOld) ui.move = 'idle';
  m.append(h('nav', { class: 'pipe' }, steps.map(([k, label, sub], i) => h('button', {
    class: (ui.step === k ? 'on ' : '') + (stepHas(it, k) ? 'has' : ''), onclick: () => { ui.step = k; ui.sel = null; ui.cmp = []; render(); },
  }, h('span', { class: 'n' }, String(i + 1)), h('b', {}, labels?.[k] || label), h('span', { class: 's' }, subs[k] || sub)))));
  if (ui.step === 'cut') ui.step = 'still'; // step merged into ภาพนิ่ง
  if (ui.step === 'veoin') ui.step = 'prompt'; // merged into the พรอมต์ tab (owner C1)
  if (!steps.some(([k]) => k === ui.step)) ui.step = steps[0][0];
  // form + move switches (F1 / F3, idle / attack …)
  if (isChar && ui.step !== 'shadow') {
    const bar = h('div', { class: 'tools' });
    if (ui.step !== 'prompt' || true) bar.append(h('span', { class: 'seg' }, [1, 3].map((f) => h('button', { class: ui.form === f ? 'on' : '', onclick: () => { ui.form = f; ui.sel = null; render(); } }, `ร่าง ${f}`))));
    if (showOld && ['video', 'frames', 'file'].includes(ui.step)) bar.append(h('span', { class: 'seg' }, hub.settings.moves.map((mv) => h('button', { class: ui.move === mv ? 'on' : '', onclick: () => { ui.move = mv; ui.sel = null; render(); } }, moveTh(mv)))));
    m.append(bar);
  }
  if (showOld && isChar && ['video', 'frames'].includes(ui.step)) m.append(autoFramesBar(it));
  if (isChar && ui.step === 'still') m.append(charInfo(it), briefBox(it), showOld ? checkBar(it) : '');
  if (ui.step === 'prompt') { // image prompt, then the Veo input picture + video prompt underneath
    renderPrompt(m, it);
    if (isChar) { m.append(h('h3', { class: 'sect' }, 'ภาพส่ง Veo + พรอมต์วิดีโอ')); m.append(veoPanel(it)); renderSlot(m, it, 'veoin'); }
    return;
  }
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
  // still step (owner set 248 C1): originals and their cuts are two separate lists; one ★ across both = the picture every page uses
  const pics = slot === 'still';
  const rs = slotRounds(it, slot), cuts = pics ? slotRounds(it, 'cut') : [];
  const all = [...rs, ...cuts];
  const used = pics && it.kind === 'character' ? usedPic(it, ui.form) : null;
  let sel = all.find((r) => r.id === ui.sel) || (used && all.includes(used) ? used : null) || rs.filter((r) => r.star).pop() || rs[rs.length - 1] || cuts[cuts.length - 1];
  const work = h('div', { class: 'work' });
  const left = h('div', {});
  if (pics && it.kind === 'character') left.append(usedBanner(it, used, sel));
  // viewer
  if (sel) {
    // set 246 UI pass: "how you look at it" (quiet, above the picture) is kept apart from "what it does" (actions + on/off switches, below)
    const canCut = sel.slot === 'still' && isImage(sel.file);
    const viewbar = h('div', { class: 'viewbar' }, h('span', { class: 'lbl' }, 'พื้นหลัง'), h('span', { class: 'seg' }, BGS.map(([k, v]) => h('button', { class: ui.bg === k ? 'on' : '', 'aria-pressed': String(ui.bg === k), onclick: () => { ui.bg = k; render(); } }, v))));
    if (pics) viewbar.append(h('span', { class: 'pill' + (sel.slot === 'cut' ? ' cutpill' : '') }, sel.slot === 'cut' ? 'กำลังดู: ภาพตัดพื้น' : 'กำลังดู: ภาพต้นฉบับ'));
    const actbar = h('div', { class: 'actbar' });
    if (canCut && showOld) actbar.append(h('button', { class: cutOf(it, sel) ? '' : 'primary', title: 'ตัดพื้นเขียว/ม่วงแดงออก ภาพต้นฉบับยังเก็บไว้ ภาพตัดพื้นใหม่จะเป็นภาพที่ใช้ทันที', onclick: () => makeCut(it, sel) }, cutOf(it, sel) ? 'ตัดพื้นใหม่' : 'ตัดพื้น'));
    else if (sel.slot === 'cut') { const from = it.rounds.find((x) => x.id === sel.from); actbar.append(h('span', { class: 'small dim' }, from ? `ตัดจากภาพต้นฉบับ ${fmtDate(from.t)}` : 'ภาพตัดพื้นที่ไม่มีภาพต้นฉบับในคลัง')); }
    if (isImage(sel.file) && slot !== 'veoin' && !(sel.slot === 'frames' && sel.meta)) actbar.append(h('button', { title: 'แก้เม็ดพิกเซลง่ายๆ บนเว็บ (ภาพไม่เกิน 256 px) บันทึกเป็นรอบใหม่และใช้ทันที', onclick: () => pixelEditor(it, sel) }, 'แก้พิกเซล'));
    const sw = (on, label, title, fn) => h('button', { class: 'switch' + (on ? ' is-on' : ''), role: 'switch', 'aria-checked': String(on), title, onclick: fn }, h('span', { class: 'knob' }), label);
    if ((isImage(sel.file) || isVideo(sel.file)) && (it.kind !== 'character' || pics)) actbar.append(sw(!!sel.flip, 'กลับข้างซ้าย-ขวา', it.kind === 'character' ? 'ทุกหน้าและในเกม (ฝั่งเรา) หันตามที่เห็นตรงนี้ ภาพต้นฉบับกับภาพตัดพื้นของมันกลับไปด้วยกัน' : 'กลับภาพซ้าย-ขวา', () => {
      const on = !sel.flip, group = new Set([sel, cutOf(it, sel), it.rounds.find((x) => x.id === sel.from)].filter(Boolean));
      for (const r of it.rounds) if (r.slot === 'cut' && r.from && group.has(it.rounds.find((x) => x.id === r.from))) group.add(r);
      for (const r of group) { if (on) r.flip = true; else delete r.flip; }
      save().then(render); }));
    else if (it.kind === 'character' && (isImage(sel.file) || isVideo(sel.file))) actbar.append(h('span', { class: 'small dim' }, 'หันซ้าย-ขวาตามภาพที่ใช้อยู่ในขั้นภาพนิ่ง'));
    if (isImage(sel.file) && slot !== 'veoin') {
      const isOn = it.thumb === sel.id;
      actbar.append(sw(isOn, 'ใช้เป็นภาพหน้าภาพรวม', 'ใช้ภาพนี้แสดงในหน้าภาพรวม (ปิด = ใช้ภาพที่ทุกหน้าใช้)', () => { it.thumb = isOn ? undefined : sel.id; save().then(render); }));
    }
    const stage = h('div', { class: 'stage bg-' + ui.bg });
    if (ui.bg === 'arena') stage.style.backgroundImage = `url("${fileUrl(hub.settings.arenaBg || TEAM_BG)}")`; // no picked arena yet → the battle scene of the team tab
    left.append(viewbar, stage, actbar);
    viewer(stage, left, sel);
    if (ui.cmp.length === 2) left.append(h('div', { class: 'tools' }, h('button', { class: 'primary', onclick: () => compareDialog(it) }, 'เทียบ 2 รอบที่เลือก')));
    else left.append(h('p', { class: 'small faint' }, 'ติ๊ก "เทียบ" ที่ 2 รอบเพื่อดูคู่กันหรือเลื่อนแถบทับกัน'));
    if (pics && it.kind === 'character') left.append(iconBox(it));
    if (showOld && pics && sel.slot === 'still') left.append(stillChecks(it, sel));
  } else left.append(h('p', { class: 'dim' }, emptyText(slot)));
  // drop zone + rounds
  const right = h('div', {});
  right.append(dropZone(it, slot));
  right.append(h('div', { class: 'row small', style: 'margin:10px 0 6px' }, h('span', { class: 'sp' }),
    h('label', {}, h('input', { type: 'checkbox', checked: ui.showArch, onchange: (e) => { ui.showArch = e.target.checked; render(); } }), ' แสดงรอบที่ซ่อน')));
  const group = (title, list, empty) => {
    right.append(h('h3', { class: 'rgroup' }, title, h('span', { class: 'faint small' }, ` ${list.length} รอบ`)));
    const box = h('div', { class: 'rounds' });
    for (const r of list.slice().reverse()) box.append(roundRow(it, r, r === sel));
    if (!list.length) box.append(h('p', { class: 'small faint' }, empty));
    right.append(box);
  };
  if (pics) { group('ภาพต้นฉบับ', rs, showOld ? 'ยังไม่มี วางภาพจาก Gemini ที่ช่องด้านบน' : 'ยังไม่มี ภาพที่คุณเลือกที่หน้าเลือกภาพจะมาอยู่ที่นี่'); if (showOld || cuts.length) group('ภาพตัดพื้น', cuts, 'ยังไม่มี เลือกภาพต้นฉบับแล้วกด "ตัดพื้น"'); }
  else group(STEPS.find((x) => x[0] === slot)?.[1] || 'รอบ', rs, emptyText(slot));
  work.append(left, right);
  m.append(work);
}
// owner set 248 round 4: name (editable, Godot shows it after "ส่งค่าเข้า Godot") + the game's skill texts, read-only
let gameInfo = null;
function charInfo(it) {
  const g = gameInfo?.[it.id];
  const lv = h('span', { class: 'small faint' });
  const orig = h('span', { class: 'small dim' });
  const back = h('button', { class: 'ghost', title: 'ใช้ชื่อเดิมจากข้อมูลเกม', onclick: () => { it.name = g.name; inp.value = g.name; sync(); saveSoon(); render(); } }, 'คืนชื่อเดิม');
  const inp = h('input', { type: 'text', class: 'nameIn', maxlength: 24, value: it.name || '', 'aria-label': 'ชื่อตัวละคร',
    oninput: (e) => { it.name = e.target.value; sync(); saveSoon(); }, onchange: () => { it.name = (it.name || '').trim(); inp.value = it.name; sync(); render(); } });
  function sync() {
    lv.textContent = `${[...(it.name || '')].length}/24`;
    const diff = g && g.name && (it.name || '').trim() !== g.name;
    orig.textContent = diff ? `ชื่อเดิมในเกม: ${g.name}` : ''; back.hidden = !diff;
  }
  sync();
  const skills = h('div', { class: 'skills' });
  if (!gameInfo) skills.append(h('span', { class: 'small faint' }, 'กำลังโหลดสกิล…'));
  else if (!g) skills.append(h('span', { class: 'small faint' }, 'ตัวนี้ยังไม่มีในข้อมูลเกม'));
  else if (!g.skills.length) skills.append(h('span', { class: 'small faint' }, 'ไม่มีสกิล'));
  else for (const t of g.skills) {
    const same = t.every((x) => x === t[0]);
    skills.append(h('div', { class: 'skill' }, same ? h('div', {}, t[0]) : t.map((x, i) => h('div', {}, h('b', { class: 'lv' }, `Lv${i + 1}`), ' ', x))));
  }
  return h('div', { class: 'charinfo' },
    h('div', { class: 'row' }, h('label', { class: 'lbl' }, 'ชื่อ'), inp, lv, orig, back, h('span', { class: 'sp' }),
      g ? h('span', { class: 'small dim' }, `${g.tribe}${g.rarity ? ' · ' + g.rarity : ''}`) : null),
    h('div', { class: 'small faint' }, 'Godot ใช้ชื่อนี้หลังกด "ส่งค่าเข้า Godot" ด้านบน · สกิลมาจากข้อมูลเกม (แก้ที่นี่ไม่ได้)'),
    h('div', { class: 'lbl' }, 'สกิล'), skills);
}
// owner set 258: Thai briefs the owner reviews (concept + 8-frame idle). Claude drafts, the owner edits and ticks;
// Claude generates only from a ticked brief (translates to English itself). Editing a ticked brief clears the tick (C1).
// it.brief = { concept: {th, ok, okT, by, t}, idle: {...}, used: [{kind, en, round, t}] } — used = English prompts that worked.
const BRIEFS = [
  ['concept', 'คอนเซปตัวละคร', 'เช่น สัตว์อะไร นิสัย จุดเด่นของเผ่า สีหลัก ท่ายืน', 'ใช้ทำภาพนิ่ง'],
  ['idle', 'ท่ายืน 8 เฟรม (PixelLab)', 'เช่น หายใจเบาๆ อกยุบ-ยก ปากปิด ขาไม่ขยับ', 'ภาพแรกและภาพสุดท้าย = ภาพนิ่ง ★ · เติมขอบใสก่อนเจนเสมอ · ทิศหันตามภาพนิ่ง'],
];
function briefBox(it) {
  it.brief ||= {};
  const wrap = h('div', { class: 'briefs' });
  for (const [kind, title, hint, sub] of BRIEFS) {
    const b = it.brief[kind] || {};
    const card = h('div', { class: 'brief' + (b.ok ? ' is-ok' : '') });
    const stamp = h('button', { class: 'stamp', 'aria-pressed': String(!!b.ok), disabled: !(b.th || '').trim(),
      title: b.ok ? 'กดอีกครั้งเพื่อยกเลิกการตรวจ' : 'กดเมื่ออ่านแล้วพร้อมให้ Claude เจน',
      onclick: () => { const x = it.brief[kind] ||= {}; x.ok = !x.ok; if (x.ok) x.okT = new Date().toISOString(); else delete x.okT; save().then(render); } },
    b.ok ? `✓ ตรวจแล้ว ${fmtDate(b.okT)}` : 'กดเมื่อตรวจแล้ว');
    const ta = h('textarea', { rows: 6, placeholder: hint, 'aria-label': title,
      oninput: (e) => {
        const x = it.brief[kind] ||= {};
        x.th = e.target.value; x.by = 'owner'; x.t = new Date().toISOString();
        if (x.ok) { x.ok = false; delete x.okT; card.classList.remove('is-ok'); stamp.textContent = 'กดเมื่อตรวจแล้ว'; stamp.setAttribute('aria-pressed', 'false'); }
        stamp.disabled = !x.th.trim();
        saveSoon();
      } }, b.th || '');
    const who = b.th ? h('span', { class: 'small faint' }, `${b.by === 'claude' ? 'Claude ร่าง' : 'คุณแก้'} ${fmtDate(b.t)}`) : null;
    card.append(h('div', { class: 'row' }, h('b', {}, title), h('span', { class: 'sp' }), who),
      h('div', { class: 'small faint' }, sub), ta, h('div', { class: 'row' }, stamp));
    const used = (it.brief.used || []).filter((u) => u.kind === kind);
    if (used.length) {
      const det = h('details', {}, h('summary', { class: 'small' }, `พรอมต์อังกฤษที่ใช้ได้ผล (${used.length})`));
      for (const u of used.slice().reverse()) det.append(h('div', { class: 'usedp' },
        h('div', { class: 'row small' }, h('span', { class: 'faint' }, `${fmtDate(u.t)}${u.round ? ' · รอบ ' + u.round : ''}`), h('span', { class: 'sp' }),
          h('button', { class: 'ghost', onclick: () => copy(u.en) }, 'คัดลอก')),
        h('div', { class: 'small dim' }, u.en)));
      card.append(det);
    }
    wrap.append(card);
  }
  return wrap;
}
// owner set 248: the one picture every page (team, shadow, icon, frames, Godot) uses, always shown at the top of the still step
function usedBanner(it, used, sel) {
  const box = h('div', { class: 'usedbar' + (used ? '' : ' none') });
  if (!used) { box.append(h('b', {}, 'ยังไม่มีภาพที่ใช้'), h('span', { class: 'small dim' }, 'วางภาพต้นฉบับ หรือกด "ใช้รอบนี้" ที่ภาพใดภาพหนึ่ง')); return box; }
  const th = h('span', { class: 'usedth' }); thumbInto(th, used, 52);
  box.append(th, h('div', {}, h('b', {}, 'ทุกหน้าใช้ภาพนี้'),
    h('div', { class: 'small dim' }, `${used.slot === 'cut' ? 'ภาพตัดพื้น' : 'ภาพต้นฉบับ'} ${fmtDate(used.t)}${used.flip ? ' · กลับข้าง' : ''} · จัดทีม เงา ไอคอน เฟรม และเกมใช้ภาพนี้และหันตามนี้`)), h('span', { class: 'sp' }));
  if (sel && sel !== used && isImage(sel.file)) box.append(h('button', { class: 'primary', onclick: () => star(it, sel) }, `ใช้${sel.slot === 'cut' ? 'ภาพตัดพื้น' : 'ภาพต้นฉบับ'}ที่กำลังดูแทน`));
  else if (sel !== used) box.append(h('button', { onclick: () => { ui.sel = used.id; render(); } }, 'ดูภาพนี้'));
  return box;
}
function emptyText(slot) {
  return {
    still: 'ยังไม่มีภาพนิ่ง ลากภาพมาวางที่ช่องด้านขวา',
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
      const el = flipped(keyNeeded ? keyed(img) : img.cloneNode(), r);
      // small pixel sprites (set 246 UI pass): blow up by a whole number so every pixel stays square, label the zoom
      if (img.naturalHeight <= 256) {
        const room = (stage.clientWidth || 700) - 24;
        const z = Math.max(1, Math.floor(Math.min(room / img.naturalWidth, 420 / img.naturalHeight)));
        el.style.width = img.naturalWidth * z + 'px'; el.style.height = img.naturalHeight * z + 'px'; el.classList.add('px');
        if (z > 1 && !stage.querySelector('.zoomtag')) stage.append(h('span', { class: 'zoomtag' }, `ขยาย ×${z} · ภาพจริง ${img.naturalWidth}×${img.naturalHeight}`));
      }
      stage.append(el);
    }).catch(() => stage.append(h('p', { class: 'dim' }, 'เปิดไฟล์ไม่ได้')));
    return;
  }
  stage.append(h('p', { class: 'dim' }, `ไฟล์ ${r.file.split('/').pop()} — เปิดดูด้วยโปรแกรมของมัน`));
}

function sheetPlayer(stage, left, r) {
  // owner set 257: C1 = "แก้พิกเซลเฟรมนี้" edits the frame you stopped on + a strip of every frame (click = stop there) · D1 = ไป-กลับ switch (meta.pingpong)
  const c = document.createElement('canvas'); stage.append(flipped(c, r));
  const n = r.meta.n || 1;
  let i = 0, step = 0, playing = true, seq = frameSeq(r.meta);
  const msIn = h('input', { type: 'number', min: 30, max: 1000, step: 1, value: r.meta.ms || 190, style: 'width:80px', onchange: (e) => { r.meta.ms = Math.max(30, Math.min(1000, Number(e.target.value) || 190)); saveSoon(); } });
  const info = h('span', { class: 'small dim finfo' });
  const go = (k) => { playing = false; i = (k + n) % n; step = Math.max(0, seq.indexOf(i)); draw(); };
  const ppB = h('button', { class: 'switch' + (r.meta.pingpong ? ' is-on' : ''), role: 'switch', 'aria-checked': String(!!r.meta.pingpong), title: 'เล่น 1→สุดท้าย→2 แล้ววนใหม่ (ไฟล์เก็บเฟรมละครั้งเดียว) · ในเกมเล่นแบบเดียวกัน', onclick: () => {
    if (r.meta.pingpong) delete r.meta.pingpong; else r.meta.pingpong = true;
    seq = frameSeq(r.meta); step = Math.max(0, seq.indexOf(i)); ppB.classList.toggle('is-on', !!r.meta.pingpong); ppB.setAttribute('aria-checked', String(!!r.meta.pingpong)); draw(); saveSoon();
  } }, h('span', { class: 'knob' }), 'เล่นไป-กลับ');
  const pxB = h('button', { title: 'แก้เม็ดพิกเซลของเฟรมที่หยุดดูอยู่ บันทึกเป็นชุดเฟรมรอบใหม่ (ชุดเดิมยังอยู่)', onclick: () => { playing = false; draw(); const it = itemOfRound(r); if (it) pixelEditor(it, r, { frame: i }); } }, 'แก้พิกเซลเฟรมนี้');
  left.append(h('div', { class: 'tools' }, h('button', { onclick: () => { playing = !playing; } }, 'เล่น/หยุด'),
    h('button', { onclick: () => go(i - 1) }, '◀ เฟรม'),
    h('button', { onclick: () => go(i + 1) }, 'เฟรม ▶'),
    h('label', { class: 'small' }, 'มิลลิวินาที/เฟรม ', msIn), ppB, pxB, info));
  let img = null, cells = [];
  const strip = h('div', { class: 'fstrip' });
  if (n <= 64) left.append(h('div', { class: 'fstrip-wrap' }, h('div', { class: 'row' }, h('b', {}, `ทุกเฟรม (${n})`), h('span', { class: 'small dim' }, 'คลิกเฟรม = หยุดที่เฟรมนั้น แล้วกด "แก้พิกเซลเฟรมนี้" ได้')), strip));
  const scale = () => Math.max(1, Math.floor(Math.min(560 / r.meta.fw, 420 / r.meta.fh)));
  function draw() {
    if (!img) return;
    const [sx, sy, sw, sh] = sheetFrame(img, r.meta, i);
    const k = keyed(img, sx, sy, sw, sh), s = scale();
    c.width = sw * s; c.height = sh * s;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = r.meta.n < 32 ? false : true; g.drawImage(k, 0, 0, c.width, c.height);
    info.textContent = `เฟรม ${i + 1}/${n} · ${r.meta.fw}×${r.meta.fh} px${r.meta.pingpong ? ' · ไป-กลับ' : ''}`;
    cells.forEach((b, j) => b.classList.toggle('on', j === i));
  }
  loadImg(r.file).then((im) => {
    img = im;
    if (n <= 64) cells = [...Array(n).keys()].map((j) => {
      const k = keyed(im, ...sheetFrame(im, r.meta, j)), tc = flipped(h('canvas', { width: k.width, height: k.height }), r); tc.getContext('2d').drawImage(k, 0, 0);
      return h('button', { class: 'fcell', title: `เฟรม ${j + 1}`, 'aria-label': `เฟรม ${j + 1}`, onclick: () => go(j) }, tc, h('span', { class: 'n' }, String(j + 1)));
    });
    strip.replaceChildren(...cells); draw();
  }).catch(() => info.textContent = 'เปิดไฟล์ไม่ได้');
  let last = 0;
  const tick = (t) => { if (!c.isConnected) return; if (playing && img && t - last >= (r.meta.ms || 190)) { last = t; step = (step + 1) % seq.length; i = seq[step]; draw(); } requestAnimationFrame(tick); };
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
  // set 246 UI pass: one clear row = picture · date · who · "ใช้รอบนี้"; note / licence / hide / delete live under "เพิ่มเติม"
  const more = h('details', { class: 'more' }, h('summary', {}, 'เพิ่มเติม'),
    h('label', { class: 'fld' }, 'โน้ต', h('input', { type: 'text', value: r.note || '', placeholder: 'เช่น หน้าดุไป', oninput: (e) => { r.note = e.target.value; noteEl.textContent = r.note; noteEl.hidden = !r.note; saveSoon(); } })),
    h('label', { class: 'fld' }, 'สิทธิ์ภาพ', lic),
    p ? h('div', { class: 'faint', title: p.text }, `ทำจากพรอมต์วันที่ ${fmtDate(p.t)}`) : null,
    h('div', { class: 'acts' },
      h('button', { class: 'ghost', disabled: r.star && !r.archived, title: r.archived ? 'แสดงอีกครั้ง' : r.star ? 'รอบที่ใช้อยู่ซ่อนไม่ได้ เลือกรอบอื่นก่อน' : 'ซ่อนรอบนี้ (ไฟล์ไม่ถูกลบ)', onclick: () => { r.archived = !r.archived; save().then(render); } }, r.archived ? 'เลิกซ่อน' : 'ซ่อนรอบนี้'),
      h('button', { class: 'ghost danger', disabled: r.star, title: r.star ? 'รอบที่ใช้อยู่ลบไม่ได้ เลือกรอบอื่นก่อน' : 'ลบรอบนี้ออกจากคลังงาน', onclick: () => delRound(it, r) }, 'ลบถาวร')),
    r.star ? h('div', { class: 'faint' }, 'รอบที่ใช้อยู่ซ่อนหรือลบไม่ได้') : null);
  const noteEl = h('div', { class: 'note', hidden: !r.note }, r.note || '');
  return h('div', { class: `round${isSel ? ' sel' : ''}${r.star ? ' star' : ''}${r.archived ? ' arch' : ''}` }, th,
    h('div', { class: 'info' },
      h('div', { class: 'row' }, h('b', {}, fmtDate(r.t) || 'ไม่มีวันที่'), h('span', { class: 'faint' }, r.by === 'claude' ? 'Claude' : 'คุณ'),
        r.slot === 'cut' && ui.step === 'still' ? h('span', { class: 'pill' }, 'ตัดพื้น') : cutOf(it, r) ? h('span', { class: 'faint' }, '· ตัดพื้นแล้ว') : null,
        r.meta?.n ? h('span', { class: 'faint' }, `${r.meta.n} เฟรม`) : null, r.archived ? h('span', { class: 'pill' }, 'ซ่อนอยู่') : null),
      noteEl,
      h('div', { class: 'acts' },
        h('button', { class: r.star ? 'starred' : '', 'aria-pressed': String(!!r.star), title: r.star ? 'รอบนี้คือตัวที่ใช้อยู่ กดอีกครั้งเพื่อเลิกใช้' : 'ใช้รอบนี้เป็นตัวหลัก (คัดลอกเข้าคลังถาวร)', onclick: () => star(it, r) }, r.star ? '★ ใช้อยู่' : 'ใช้รอบนี้'),
        h('label', { class: 'small chk' }, h('input', { type: 'checkbox', checked: ui.cmp.includes(r.id), onchange: (e) => { ui.cmp = e.target.checked ? [...ui.cmp, r.id].slice(-2) : ui.cmp.filter((x) => x !== r.id); render(); } }), 'เทียบ'),
        r.star && !r.library && !String(r.file).startsWith('lib/') ? h('span', { class: 'faint small', title: 'จะคัดลอกเข้าคลังถาวรตอนกด "ส่งค่าเข้า Godot"' }, 'ยังไม่เข้าคลัง') : null),
      more));
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
    const on = r.star ? 0 : 1; // owner set 248: one ★ across originals + cuts, the server clears the other one
    hub = await api(`/api/star?item=${encodeURIComponent(it.id)}&round=${encodeURIComponent(r.id)}&on=${on}`, { method: 'POST' });
    // set 261: a new ★ still/cut drops an older board pin ("ใช้เป็นภาพหน้าภาพรวม"), else the board kept showing the pinned old picture
    const cur = hub.items[it.id];
    if (on && cur && cur.kind === 'character' && ['still', 'cut'].includes(r.slot) && cur.thumb && cur.thumb !== r.id) { delete cur.thumb; await save(); }
    toast(r.star ? 'เลิกเลือกแล้ว' : 'เลือกแล้ว และเก็บเข้าคลังถาวร');
  } catch (e) { toast(e.message); }
  render();
}

function mediaEl(r, cls) {
  if (r.slot === 'frames' && r.meta) { const c = flipped(h('canvas', { class: cls }), r); loadImg(r.file).then((img) => { const [sx, sy, sw, sh] = sheetFrame(img, r.meta, 0); const k = keyed(img, sx, sy, sw, sh); c.width = sw; c.height = sh; c.getContext('2d').drawImage(k, 0, 0); }).catch(() => c.classList.add('broken')); return c; }
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
// owner set 248 B: idle frames made from the picture in use (each frame can get its own shadow), else the picture in use itself.
// Frames older than the picture in use belong to an earlier picture (e.g. old painted frames under a new pixel still) and are skipped.
function shadowSource(it) {
  const set = it.shadow?.round && it.rounds.find((r) => r.id === it.shadow.round && !r.archived && r.slot === 'frames'); // Claude sets it on new frames
  const fr = set || pick(it, 'frames', 1, 'idle') || latest(it, 'frames', 1, 'idle'), u = usedPic(it, 1);
  return fr && (!u || (fr.t || '') >= (u.t || '')) ? fr : u || fr;
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
  let s = it.shadow ? JSON.parse(JSON.stringify(it.shadow)) : null, base = null; // s = what the handles edit: base (every frame) or one frame's own shadow
  let ov = {}, editK = null; // owner set 248 B: ov[i] = frame i's own shadow (same shape as base); editK = the frame being edited, null = every frame
  if (s) { if (s.frames && it.shadow.round === src.id && src.slot === 'frames') for (const [k, v] of Object.entries(s.frames)) ov[k] = v; delete s.frames; delete s.face; }
  let frames = [], fi = 0, playing = true, bg = null, size = [0, 0];
  const pitch = () => hub.settings.camPitch || 40;
  const mir = mirrorOf(src); // the editor shows the creature the way the still step shows it (owner set 248); feet below are in that view
  const feetPic = (o = s) => [mir ? +(1 - o.feet[0]).toFixed(4) : o.feet[0], o.feet[1]];
  const commit = () => {
    if (editK != null) ov[editK] = s; else base = s;
    const fr = Object.entries(ov).map(([k, v]) => [k, { feet: feetPic(v), cast: v.cast }]);
    it.shadow = { ...base, feet: feetPic(base), size, round: src.id, ...(fr.length ? { frames: Object.fromEntries(fr) } : {}) };
    saveSoon(); stripOwn();
  };
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
      h('button', { onclick: () => { const f = frames[editK ?? 0]; if (!f) return; s.feet = guessFeet(f); commit(); sync(); draw(); } }, 'ให้ Claude หาจุดเท้าใหม่'),
      h('button', { class: 'ghost', onclick: () => { s.cast.ox = 0; s.cast.oy = 0; s.cast.k = null; commit(); draw(); } }, 'คืนรูปเงาตามตัว'),
      h('button', { class: 'ghost', onclick: () => { if (editK != null) { const k = editK; delete ov[k]; editK = null; s = base; commit(); editFrame(k); return; } s = JSON.parse(JSON.stringify(SHADOW_DEFAULT)); if (frames[0]) s.feet = guessFeet(frames[0]); commit(); sync(); draw(); } }, 'คืนค่าเริ่มต้น')),
    h('h3', {}, 'มุมกล้องที่ใช้ดู'), pitchSel,
    frames.length > 1 || src.slot === 'frames' ? h('div', { class: 'tools' }, h('button', { onclick: () => { playing = !playing; } }, 'เล่น/หยุดท่าหายใจ')) : '', // '' not null: DOM append prints null
    h('p', { class: 'small faint' }, `ตั้งบนภาพ: ${src.file.split('/').pop()} · กด "ส่งค่าเข้า Godot" ด้านบนเมื่อปรับครบ`));
  function sync() { for (const f of Object.values(vals)) f(); feetOut.textContent = `ตำแหน่งในภาพ x ${(feetPic()[0] * 100).toFixed(1)}% · เส้นพื้น y ${(s.feet[1] * 100).toFixed(1)}% · ภาพ ${size[0]}×${size[1]} px`; }
  // geometry (canvas px)
  const geo = () => {
    const W = cv.width, H = cv.height, T = 300, k = Math.sin(pitch() * Math.PI / 180);
    const C = { x: W * 0.5, y: H * 0.74 };
    const f = frames[fi] || frames[0];
    const sh = SPR_H / TILE * T, sw = f ? sh * f.width / f.height : sh;
    return { W, H, T, k, C, sh, sw, f };
  };
  function draw() { // while every frame plays, a frame with its own shadow shows that one
    const keep = s; if (editK == null && ov[fi]) s = ov[fi];
    try { drawNow(); } finally { s = keep; }
  }
  function drawNow() {
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
    if (mir) frames = frames.map(mirrorCanvas);
    const other = s && it.shadow?.round !== src.id && !(Array.isArray(s.size) && s.size[0] === size[0] && s.size[1] === size[1]);
    if (!s || !Array.isArray(s.feet)) { s = { ...JSON.parse(JSON.stringify(SHADOW_DEFAULT)), ...(s || {}) }; s.feet = guessFeet(frames[0]); } // saved only once the owner changes something
    else if (other) { s.feet = guessFeet(frames[0]); left.append(h('p', { class: 'small warn' }, 'จุดเท้าเดิมตั้งไว้กับภาพอื่น หาจุดเท้าใหม่บนภาพนี้ให้แล้ว (บันทึกเมื่อคุณแก้อะไรสักอย่าง)')); }
    else if (mir) s.feet = [+(1 - s.feet[0]).toFixed(4), s.feet[1]];
    s.oval = { ...SHADOW_DEFAULT.oval, ...s.oval, on: false }; s.cast = { ...SHADOW_DEFAULT.cast, ...s.cast };
    base = s;
    for (const k of Object.keys(ov)) { const v = ov[k]; ov[k] = { ...JSON.parse(JSON.stringify(base)), feet: [mir ? +(1 - v.feet[0]).toFixed(4) : v.feet[0], v.feet[1]], cast: { ...base.cast, ...(v.cast || {}) } }; }
    sync(); draw();
    let last = 0; const ms = src.meta?.ms || 190;
    const seqS = src.slot === 'frames' ? frameSeq({ ...src.meta, n: frames.length }) : [0]; let stS = 0; // owner set 257 D1: ไป-กลับ
    const tick = (t) => { if (!cv.isConnected) return; if (playing && editK == null && frames.length > 1 && t - last >= ms) { last = t; stS = (stS + 1) % seqS.length; fi = seqS[stS] ?? 0; draw(); stripMark(); } requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    await frameStrip(img);
  })().catch(() => left.append(h('p', { class: 'bad' }, 'เปิดภาพไม่ได้')));
  // owner (set 246): every frame of the idle video as small pictures under the editor; pick one → use it as the still
  let stripBtns = [], stripSel = 0, stripSame = false, allBtn = null, editInfo = null, clearBtn = null;
  function stripMark() { if (stripSame && editK == null) { stripSel = fi; stripBtns.forEach((b, j) => b.classList.toggle('on', j === fi)); } }
  function stripOwn() { // which frames have their own shadow + what the handles edit now
    stripBtns.forEach((b, j) => b.classList.toggle('own', !!ov[j]));
    if (allBtn) { allBtn.classList.toggle('on', editK == null); allBtn.setAttribute('aria-pressed', String(editK == null)); }
    if (editInfo) editInfo.textContent = editK == null ? `กำลังแก้: เงาทุกเฟรม${Object.keys(ov).length ? ` (ยกเว้น ${Object.keys(ov).length} เฟรมที่แก้แยกไว้ จุดสีส้ม)` : ''}` : `กำลังแก้: เงาเฉพาะเฟรม ${editK + 1}${ov[editK] ? ' (แก้แยกแล้ว)' : ' (ยังใช้แบบทุกเฟรม แก้อะไรก็จะแยกเป็นของเฟรมนี้)'}`;
    if (clearBtn) clearBtn.hidden = editK == null || !ov[editK];
  }
  function editFrame(k) { // k = null: every frame (plays); a number: that frame only (paused on it)
    editK = k; s = k == null ? base : ov[k] || JSON.parse(JSON.stringify(base));
    if (k == null) playing = true; else { playing = false; fi = k; stripSel = k; stripBtns.forEach((b, j) => b.classList.toggle('on', j === k)); }
    sync(); draw(); stripOwn();
  }
  async function frameStrip(srcImg) {
    const fr = src.slot === 'frames' && src.meta ? src : pick(it, 'frames', 1, 'idle') || latest(it, 'frames', 1, 'idle');
    if (!fr?.meta) return;
    stripSame = fr === src;
    const img = stripSame ? srcImg : await loadImg(fr.file).catch(() => null);
    if (!img) return;
    const n = fr.meta.n || 1, cells = [];
    for (let i = 0; i < n; i++) cells.push(keyed(img, ...sheetFrame(img, fr.meta, i))); // the file's own pixels (the editor's frames may be mirrored)
    const useBtn = h('button', { class: 'primary', onclick: () => useFrame(fr, cells[stripSel], stripSel) });
    const info = h('span', { class: 'small dim' });
    const mark = () => { useBtn.textContent = `ใช้เฟรม ${stripSel + 1} เป็นภาพนิ่ง`; info.textContent = stripSame ? 'ระบบใส่เงาให้ทุกเฟรมแล้ว คลิกเฟรมเพื่อเช็คและแก้เงาเฉพาะเฟรมนั้น' : 'เฟรมเหล่านี้มาจากวิดีโอท่าหายใจ'; stripBtns.forEach((b, j) => b.classList.toggle('on', j === stripSel)); };
    stripBtns = cells.map((c, i) => {
      const t = flipped(h('canvas', { width: c.width, height: c.height }), fr); t.getContext('2d').drawImage(c, 0, 0);
      return h('button', { class: 'fcell', title: stripSame ? `เฟรม ${i + 1} · คลิกเพื่อแก้เงาเฉพาะเฟรมนี้` : `เฟรม ${i + 1}`, 'aria-label': `เฟรม ${i + 1}`, onclick: () => { stripSel = i; if (stripSame) editFrame(i); mark(); } }, t, h('span', { class: 'n' }, String(i + 1)), h('span', { class: 'dot', 'aria-hidden': 'true' }));
    });
    if (stripSame) {
      allBtn = h('button', { class: 'fcell fall', title: 'แก้เงาทุกเฟรมพร้อมกัน (เล่นท่าหายใจ)', onclick: () => { editFrame(null); mark(); } }, h('b', {}, 'ทุก'), h('span', { class: 'small' }, 'เฟรม'));
      editInfo = h('span', { class: 'small editinfo' });
      clearBtn = h('button', { class: 'ghost', hidden: true, onclick: () => { if (editK == null) return; const k = editK; delete ov[k]; editK = null; s = base; commit(); editFrame(k); toast(`เฟรม ${k + 1} กลับไปใช้เงาแบบทุกเฟรมแล้ว`); } }, 'ล้างเงาเฟรมนี้');
    }
    left.append(h('div', { class: 'fstrip-wrap' }, h('div', { class: 'row' }, h('b', {}, `ทุกเฟรม (${n})`), info, h('span', { class: 'sp' }), useBtn),
      stripSame ? h('div', { class: 'row' }, editInfo, h('span', { class: 'sp' }), clearBtn) : '',
      h('div', { class: 'fstrip' }, allBtn || '', stripBtns)));
    mark(); stripOwn();
  }
  async function useFrame(fr, c, i) {
    if (!c) return;
    const m0 = mirrorOf(fr); // the new still keeps the facing it has on screen now
    try {
      const blob = await new Promise((ok) => c.toBlob(ok, 'image/png'));
      const q = new URLSearchParams({ item: it.id, slot: 'still', name: `${it.id}_frame${i + 1}.png`, form: String(fr.form || 1) });
      hub = await api('/api/upload?' + q, { method: 'POST', body: blob }); // newest upload = ★ used (owner A1)
      const nr = hub.items[it.id].rounds.at(-1);
      if (nr) { nr.note = `เฟรม ${i + 1} จากวิดีโอ ${fmtDate(fr.t)}`; if (m0) nr.flip = true; await save(); }
      toast(`ใช้เฟรม ${i + 1} เป็นภาพนิ่งแล้ว (ภาพนิ่งเดิมยังอยู่ในขั้นภาพนิ่ง)`);
    } catch (e) { toast('ทำไม่ได้: ' + e.message); }
  }
}

// ---------- icon: diamond crop for the shop / bench screens (set 246, owner B1) ----------
// Real pixels, no scaling: an N×N square of the picture the game uses (★ cut, else ★ still), pixels outside the diamond made
// transparent, no border (the game draws its own). Saved as an "icon" round (newest = ★ used); the crop is remembered in it.iconCrop.
// Owner set 255 (B1): "แต่งกรอบ" opens parts of the frame edge; whatever lies behind an opening (up to 25 % of the frame size out) shows
// over the frame. With openings the file is (n + 2m)² with the diamond inset by m (round.iconPad = m); "แก้พิกเซล" edits the icon after.
// owner set 255 A1: the gold frame line the game draws over an icon, left open at the round's gaps (iconOpen)
const ICON_GOLD = '#d6b25c';
function iconGeom(r, w) { const m = r.iconPad || 0; return { m, n: r.iconN || (w - 2 * m), open: Array.isArray(r.iconOpen) ? r.iconOpen : [] }; }
function iconEdgeP(n, t) { const C = [[n / 2, 0], [n, n / 2], [n / 2, n], [0, n / 2]], tt = ((t % 1) + 1) % 1, k = Math.floor(tt * 4), u = tt * 4 - k, a = C[k], b = C[(k + 1) % 4]; return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]; }
function iconEdgeT(n, px, py) {
  const C = [[n / 2, 0], [n, n / 2], [n / 2, n], [0, n / 2]]; let best = null;
  for (let k = 0; k < 4; k++) { const [ax, ay] = C[k], [bx, by] = C[(k + 1) % 4], dx = bx - ax, dy = by - ay; const u = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))); const d = (ax + dx * u - px) ** 2 + (ay + dy * u - py) ** 2; if (!best || d < best[0]) best = [d, (k + u) / 4]; }
  return best[1] % 1;
}
const iconInIv = (t, [a, b]) => (a <= b ? t >= a && t <= b : t >= a || t <= b);
function iconFrameLine(g, k, n, m, open, colour = ICON_GOLD) { // k = screen px per icon px
  g.save(); g.strokeStyle = colour; g.lineWidth = Math.max(1.5, k); const N = 400; let on = false;
  for (let i = 0; i <= N; i++) {
    const t = (i % N) / N, [px, py] = iconEdgeP(n, t), X = (m + px) * k, Y = (m + py) * k;
    if (!open.some((iv) => iconInIv(t, iv))) { if (!on) { g.beginPath(); g.moveTo(X, Y); on = true; } else g.lineTo(X, Y); } else if (on) { g.stroke(); on = false; }
  }
  if (on) g.stroke(); g.restore();
}
// owner set 256 (A1): frame gaps are painted like an eraser / pencil on the gold line instead of one drag = one gap.
// Gaps stay intervals [t0, t1] on the circle (t0 > t1 wraps); the helpers below merge / cut them exactly.
function ivPieces(open) { const p = []; for (const [a, b] of open) { if (a <= b) p.push([a, b]); else { p.push([a, 1]); p.push([0, b]); } } return p.sort((u, v) => u[0] - v[0]); }
function ivJoin(pieces) { // sorted linear pieces -> merged circle intervals
  const mg = []; for (const [a, b] of pieces) { if (b - a <= 1e-6) continue; const l = mg[mg.length - 1]; if (l && a <= l[1] + 1e-6) l[1] = Math.max(l[1], b); else mg.push([a, b]); }
  if (mg.length === 1 && mg[0][0] <= 1e-6 && mg[0][1] >= 1 - 1e-6) return [[0, 0.9999]]; // the whole frame open
  if (mg.length > 1 && mg[0][0] <= 1e-6 && mg[mg.length - 1][1] >= 1 - 1e-6) { const f = mg.shift(); mg[mg.length - 1][1] = f[1]; } // joins across the top corner
  return mg.map(([a, b]) => [a % 1, b >= 1 - 1e-6 ? 0.9999 : b]);
}
function ivAdd(open, iv) { return ivJoin(ivPieces([...open, iv])); }
function ivSub(open, iv) {
  const cut = ivPieces([iv]), out = [];
  for (const [a, b] of ivPieces(open)) { let segs = [[a, b]]; for (const [c, d] of cut) segs = segs.flatMap(([x, y]) => (d <= x || c >= y ? [[x, y]] : [[x, c], [d, y]].filter(([p, q]) => q - p > 1e-6))); out.push(...segs); }
  return ivJoin(out.sort((u, v) => u[0] - v[0]));
}
// Brush on a canvas: o = { tAt(e) -> t, n() -> frame size px, get() / set(open), active() -> bool, changed() }.
// Left button = the chosen tool, right button = the other one; Ctrl+Z / "ย้อน" undoes one stroke, Ctrl+Y / "ทำซ้ำ" redoes (set 256).
// Returns the tool row; row.clear() = "ปิดทุกช่อง" as an undoable step.
function gapBrush(cv, o) {
  let tool = 'erase', stroke = null; const undo = [], redo = [];
  const snap = () => o.get().map((v) => v.slice());
  const record = () => { undo.push(snap()); if (undo.length > 100) undo.shift(); redo.length = 0; };
  const shortIv = (ta, tb) => { const d = ((tb - ta + 1.5) % 1) - 0.5; return d >= 0 ? [ta, ta + d] : [tb, ta]; };
  function paint(ta, tb) { // brush = 1.5 frame px either side of the path, so a single click makes a 3 px gap
    const r = 1.5 / (2 * Math.SQRT2 * Math.max(4, o.n())), [a, b] = shortIv(ta, tb), iv = [((a - r) % 1 + 1) % 1, ((b + r) % 1 + 1) % 1];
    o.set((stroke.mode === 'erase' ? ivAdd : ivSub)(o.get(), b - a + 2 * r >= 1 ? [0, 0.9999] : iv)); o.changed();
  }
  cv.addEventListener('contextmenu', (e) => { if (o.active()) e.preventDefault(); });
  cv.addEventListener('pointerdown', (e) => {
    if (!o.active() || (e.button !== 0 && e.button !== 2)) return;
    e.preventDefault(); e.stopImmediatePropagation(); cv.focus?.();
    record();
    const t = o.tAt(e); stroke = { mode: (e.button === 2) === (tool === 'erase') ? 'draw' : 'erase', t }; cv.setPointerCapture(e.pointerId); paint(t, t); syncUi();
  });
  cv.addEventListener('pointermove', (e) => { if (!stroke) return; const t = o.tAt(e); paint(stroke.t, t); stroke.t = t; });
  const end = () => { stroke = null; }; cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  const back = () => { if (!undo.length) return; redo.push(snap()); o.set(undo.pop()); o.changed(); syncUi(); };
  const fwd = () => { if (!redo.length) return; undo.push(snap()); o.set(redo.pop()); o.changed(); syncUi(); };
  const onKey = (e) => { // whole dialog, not only the canvas (owner set 256: undo after clicking a button too)
    if (!cv.isConnected) { document.removeEventListener('keydown', onKey); return; }
    if (!o.active() || !(e.ctrlKey || e.metaKey) || e.target?.tagName === 'INPUT') return;
    const k = e.key.toLowerCase();
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); back(); } else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); fwd(); }
  };
  document.addEventListener('keydown', onKey);
  const bE = h('button', { onclick: () => { tool = 'erase'; syncUi(); } }, '🧽 ลบเส้น');
  const bD = h('button', { onclick: () => { tool = 'draw'; syncUi(); } }, '✏️ วาดเส้น');
  const bU = h('button', { class: 'ghost', title: 'ย้อน 1 ครั้ง (Ctrl+Z)', onclick: back }, '↶ ย้อน');
  const bR = h('button', { class: 'ghost', title: 'ทำซ้ำ (Ctrl+Y)', onclick: fwd }, '↷ ทำซ้ำ');
  function syncUi() { for (const [b, k] of [[bE, 'erase'], [bD, 'draw']]) { b.classList.toggle('on', tool === k); b.setAttribute('aria-pressed', String(tool === k)); } bU.disabled = !undo.length; bR.disabled = !redo.length; }
  syncUi();
  const row = h('div', { class: 'row gap-tools' }, h('span', { class: 'seg' }, bE, bD), bU, bR);
  row.clear = () => { if (!o.get().length) return; record(); o.set([]); o.changed(); syncUi(); };
  return row;
}
// owner set 256: Ctrl + wheel over ANY part of the open dialog zooms the picture (over the stage: at the pointer), never the browser page.
// The listener lives until the dialog closes.
function dlgCtrlWheel(zoom, stageEl) {
  const dlg = $('dlg');
  const onWheel = (e) => { if (!(e.ctrlKey || e.metaKey)) return; e.preventDefault(); zoom(e, stageEl.contains(e.target)); };
  dlg.addEventListener('wheel', onWheel, { passive: false });
  dlg.addEventListener('close', () => dlg.removeEventListener('wheel', onWheel), { once: true });
}
const GAP_HINT = 'ทาไปตามขอบกรอบ (กดใกล้ขอบตรงไหนก็ได้) · 🧽 = เปิดช่อง ของหลังช่องโผล่ออกนอกกรอบ · ✏️ = ปิดคืนเฉพาะส่วนที่ทา · คลิกขวา = ใช้อีกอัน · Ctrl+Z = ย้อน · Ctrl+Y = ทำซ้ำ';
// owner set 255: open / close frame gaps on an icon that already exists (keeps its pixel edits); only the gaps change, the file stays
async function iconFrameEditor(it, r) {
  let img; try { img = await loadImg(r.file); } catch { toast('เปิดภาพไม่ได้'); return; }
  const w = img.naturalWidth, { m, n } = iconGeom(r, w);
  let open = iconGeom(r, w).open.map((a) => a.slice());
  const fitZ = Math.max(3, Math.min(12, Math.floor(Math.min(window.innerWidth * 0.6, window.innerHeight * 0.7) / w)));
  let z = fitZ; // owner set 256: zoom − / + / พอดีจอ, Ctrl + wheel at the pointer (same as the cropper)
  const cv = h('canvas', { class: 'icon-cv frame-mode', width: w * z, height: w * z, tabindex: 0, 'aria-label': 'ทาไปตามขอบกรอบ ลบเส้นเพื่อเปิดช่อง วาดเส้นเพื่อปิด' });
  if (r.flip) cv.classList.add('flipx');
  const info = h('span', { class: 'small dim' });
  function draw() {
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, cv.width, cv.height);
    g.save(); g.fillStyle = 'rgba(64,58,48,0.9)'; g.beginPath(); const C = [0, 1, 2, 3].map((q) => iconEdgeP(n, q / 4)); C.forEach(([x, y], i) => (i ? g.lineTo : g.moveTo).call(g, (m + x) * z, (m + y) * z)); g.closePath(); g.fill(); g.restore();
    g.drawImage(img, 0, 0, w * z, w * z);
    iconFrameLine(g, z, n, m, open);
    const ivs = open;
    g.save(); g.strokeStyle = 'rgba(90,209,255,0.85)'; g.lineWidth = Math.max(2, z * 0.5); g.setLineDash([z, z]);
    for (const [a, b] of ivs) { const len = (b - a + 1) % 1, st = Math.max(2, Math.ceil(len * 160)); g.beginPath(); for (let i = 0; i <= st; i++) { const [x, y] = iconEdgeP(n, a + len * i / st); (i ? g.lineTo : g.moveTo).call(g, (m + x) * z, (m + y) * z); } g.stroke(); }
    g.restore();
    zTxt.textContent = `×${z}`; info.textContent = open.length ? `เปิด ${open.length} ช่อง (เส้นฟ้าประ = ช่องที่เปิด)` : 'ยังไม่มีช่องเปิด';
  }
  const tAt = (e) => { const rc = cv.getBoundingClientRect(); const fx = (r.flip ? rc.right - e.clientX : e.clientX - rc.left) / rc.width * w, fy = (e.clientY - rc.top) / rc.height * w; return iconEdgeT(n, fx - m, fy - m); };
  const tools = gapBrush(cv, { tAt, n: () => n, get: () => open, set: (v) => { open = v; }, active: () => true, changed: draw });
  const stageEl = h('div', { class: 'icon-stage' }, cv), zTxt = h('b', {});
  function zoomTo(nz, e) { // keeps the point under the pointer (or the middle of the view) in place
    nz = Math.max(1, Math.min(32, nz)); if (nz === z) return;
    const st = stageEl, rc = st.getBoundingClientRect();
    const ox = e ? e.clientX - rc.left : st.clientWidth / 2, oy = e ? e.clientY - rc.top : st.clientHeight / 2;
    const fx = (st.scrollLeft + ox) / z, fy = (st.scrollTop + oy) / z;
    z = nz; cv.width = cv.height = w * z; draw();
    st.scrollLeft = fx * z - ox; st.scrollTop = fy * z - oy;
  }
  // Ctrl + wheel anywhere in the dialog zooms the picture, never the browser page (owner set 256: it zoomed the whole page)
  dlgCtrlWheel((e, inStage) => zoomTo(z + (e.deltaY < 0 ? 1 : -1), inStage ? e : undefined), stageEl);
  const zoomRow = h('div', { class: 'row' }, h('span', { class: 'lbl' }, 'ซูม'), h('span', { class: 'sp' }),
    h('button', { 'aria-label': 'ซูมออก', title: 'Ctrl + ล้อเมาส์ลง', onclick: () => zoomTo(z - 1) }, '−'), zTxt,
    h('button', { 'aria-label': 'ซูมเข้า', title: 'Ctrl + ล้อเมาส์ขึ้น', onclick: () => zoomTo(z + 1) }, '+'),
    h('button', { class: 'ghost', onclick: () => zoomTo(fitZ) }, 'พอดีจอ'));
  const dlg = $('dlg'); const close = () => { dlg.classList.remove('icon-dlg'); dlg.close(); };
  const saveB = h('button', { class: 'primary', onclick: async () => {
    const nr = hub.items[it.id].rounds.find((x) => x.id === r.id); if (!nr) { toast('ไม่พบไอคอนนี้แล้ว'); return; }
    nr.iconOpen = open.map((iv) => iv.map((v) => Math.round(v * 10000) / 10000)); nr.iconN = n; if (m) nr.iconPad = m;
    await save(); toast('บันทึกช่องกรอบแล้ว'); close(); render();
  } }, 'บันทึก');
  $('dlgBody').replaceChildren(
    h('div', { class: 'row' }, h('h3', { style: 'margin:0' }, `แต่งกรอบไอคอน · ${it.id}`), h('span', { class: 'small dim' }, 'ทาตามขอบ: 🧽 = เปิดช่อง · ✏️ = ปิด · ไฟล์ภาพไม่เปลี่ยน'), h('span', { class: 'sp' }), saveB, h('button', { onclick: close }, 'ปิด')),
    h('div', { class: 'icon-ed' }, stageEl,
      h('div', { class: 'icon-side' }, h('div', { class: 'row' }, info, h('span', { class: 'sp' }), h('button', { class: 'ghost', onclick: () => tools.clear() }, 'ปิดทุกช่อง')),
        zoomRow, tools, h('p', { class: 'small icon-hint' }, GAP_HINT),
        h('p', { class: 'small faint' }, 'เส้นทอง = ขอบที่เกมจะวาด (ไม่อยู่ในไฟล์) · ช่องใหม่ตรงที่ไฟล์ไม่มีพิกเซลยื่นออกไป จะแค่ไม่มีเส้น ถ้าอยากให้มีของโผล่ ใช้ "แก้พิกเซล" วาดเพิ่ม หรือ "ตัดกรอบใหม่"'),
        m ? null : h('p', { class: 'small faint' }, 'ไอคอนนี้ทำก่อนมีระบบเปิดกรอบ ไม่มีที่ว่างรอบกรอบ ส่วนที่ยื่นจะโผล่ไม่ได้'))));
  dlg.classList.add('icon-dlg'); dlg.addEventListener('close', () => dlg.classList.remove('icon-dlg'), { once: true });
  draw(); dlg.showModal();
}
function iconBox(it) {
  const icons = slotRounds(it, 'icon').filter((r) => !r.archived);
  const cur = icons.filter((r) => r.star).pop() || icons[icons.length - 1];
  const box = h('div', { class: 'iconbox' });
  const head = h('div', { class: 'row' }, h('b', {}, 'ไอคอน (กรอบข้าวหลามตัด)'), h('span', { class: 'small dim' }, 'ใช้ในหน้าร้านค้า / ม้านั่ง'), h('span', { class: 'sp' }),
    cur && isImage(cur.file) ? h('button', { title: 'เปิด/ปิดช่องของขอบกรอบบนไอคอนที่ใช้อยู่ (ภาพไม่เปลี่ยน)', onclick: () => iconFrameEditor(it, cur) }, 'แต่งกรอบ') : null,
    cur && isImage(cur.file) ? h('button', { title: 'แก้เม็ดพิกเซลของไอคอนที่ใช้อยู่ บันทึกเป็นไอคอนใหม่และใช้ทันที', onclick: () => pixelEditor(it, cur) }, 'แก้พิกเซล') : null,
    h('button', { class: cur ? '' : 'primary', onclick: () => iconEditor(it) }, cur ? 'ตัดกรอบใหม่' : 'ตัดกรอบไอคอน'));
  box.append(head);
  if (!icons.length) { box.append(h('p', { class: 'small faint' }, 'ยังไม่มีไอคอน กดปุ่มด้านบนแล้วเลือกส่วนที่จะอยู่ในกรอบ')); return box; }
  const row = h('div', { class: 'iconrow' });
  for (const r of icons.slice().reverse()) {
    const c = h('canvas', { class: 'iconthumb' + (r.star ? ' on' : '') });
    loadImg(r.file).then((img) => { const w = img.naturalWidth, k = 3, gm = iconGeom(r, w); c.width = w * k; c.height = img.naturalHeight * k; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(img, 0, 0, c.width, c.height); iconFrameLine(g, k, gm.n, gm.m, gm.open); }).catch(() => c.classList.add('broken'));
    const pick = h('button', { class: 'iconpick' + (r.star ? ' on' : ''), title: r.star ? 'ใช้อยู่' : 'คลิกเพื่อใช้ไอคอนนี้', 'aria-pressed': String(!!r.star),
      onclick: async () => { if (r.star) return; try { hub = await api(`/api/star?item=${encodeURIComponent(it.id)}&round=${encodeURIComponent(r.id)}&on=1`, { method: 'POST' }); render(); } catch (e) { toast(e.message); } } },
    flipped(c, r), h('span', { class: 'small' }, r.star ? '★ ใช้อยู่' : fmtDate(r.t)));
    // owner set 255: old icons can be deleted (the one in use cannot; same server delete as other rounds, library copies stay)
    const del = r.star ? null : h('button', { class: 'ghost danger icondel', title: 'ลบไอคอนนี้ถาวร', 'aria-label': `ลบไอคอน ${fmtDate(r.t)}`, onclick: async () => {
      if (!confirm(`ลบไอคอน ${fmtDate(r.t)} ถาวร?
ไฟล์ในคลังงานจะหายและกู้คืนไม่ได้ (สำเนาในคลังถาวร art/library ถ้ามี ยังอยู่)`)) return;
      try { hub = await api(`/api/delete?item=${encodeURIComponent(it.id)}&round=${encodeURIComponent(r.id)}`, { method: 'POST' }); toast('ลบแล้ว'); } catch (e) { toast('ลบไม่ได้: ' + e.message); }
      render();
    } }, 'ลบ');
    row.append(h('div', { class: 'iconcell' }, pick, del));
  }
  box.append(row);
  return box;
}
async function iconEditor(it) {
  const src = teamRound(it);
  if (!src || !isImage(src.file)) { toast('ต้องมีภาพนิ่งก่อน'); return; }
  let img; try { img = await loadImg(src.file); } catch { toast('เปิดภาพไม่ได้'); return; }
  const W = img.naturalWidth, H = img.naturalHeight;
  const pic = keyed(img); // green/magenta background removed, same as the game picture
  const prev = it.iconCrop && it.iconCrop.round === src.id ? it.iconCrop : null;
  let n = prev ? prev.n : Math.max(8, Math.round(Math.min(W, H) * 0.7 / 2) * 2), x = prev ? prev.x : Math.round((W - n) / 2), y = prev ? prev.y : Math.round((H - n) / 3);
  const pad = 24; // picture px of room around the picture, so the frame can hang over an edge
  const fitZ = Math.max(2, Math.min(10, Math.floor(Math.min((window.innerWidth * 0.96 - 420) / (W + pad * 2), (window.innerHeight * 0.92 - 170) / (H + pad * 2)))));
  let z = fitZ; // owner set 255: zoom − / + / พอดี, Ctrl + wheel zooms at the pointer (plain wheel = frame size)
  const cv = h('canvas', { class: 'icon-cv', width: (W + pad * 2) * z, height: (H + pad * 2) * z, tabindex: 0, 'aria-label': 'ลากกรอบข้าวหลามตัดไปวางบนส่วนที่ต้องการ ล้อเมาส์หรือแถบเลื่อนเพื่อปรับขนาด ปุ่มลูกศรขยับทีละ 1 เม็ด' });
  const out = h('canvas', { class: 'icon-out' }), out1 = h('canvas', { class: 'icon-out1' });
  const sizeIn = h('input', { type: 'range', min: 8, max: Math.max(16, Math.min(256, Math.max(W, H) + 16)), step: 2, value: n, 'aria-label': 'ขนาดกรอบ', oninput: (e) => setN(Number(e.target.value)) });
  const sizeTxt = h('b', {});
  const inside = (i, j, N) => Math.abs(i + 0.5 - N / 2) + Math.abs(j + 0.5 - N / 2) <= N / 2;
  // frame openings (owner set 255): intervals [t0, t1] of the frame edge, t = 0..1 clockwise from the top corner (t0 > t1 = wraps past the top)
  let open = prev && Array.isArray(prev.open) ? prev.open.filter((a) => Array.isArray(a) && a.length === 2 && a.every((v) => Number.isFinite(v) && v >= 0 && v <= 1)).map((a) => a.slice()) : [];
  let frameMode = false;
  const margin = () => (open.length ? Math.max(1, Math.round(n / 4)) : 0); // reach out <= 25 % of the frame size (owner B1)
  const corner = (k) => [[n / 2, 0], [n, n / 2], [n / 2, n], [0, n / 2]][k % 4];
  function edgeT(px, py) { // nearest point of the frame edge (frame-square coords) -> t
    let best = null;
    for (let k = 0; k < 4; k++) {
      const [ax, ay] = corner(k), [bx, by] = corner(k + 1), dx = bx - ax, dy = by - ay;
      const u = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
      const d = (ax + dx * u - px) ** 2 + (ay + dy * u - py) ** 2;
      if (!best || d < best[0]) best = [d, (k + u) / 4];
    }
    return best[1] % 1;
  }
  const edgeP = (t) => { const tt = ((t % 1) + 1) % 1, k = Math.floor(tt * 4), u = tt * 4 - k, [ax, ay] = corner(k), [bx, by] = corner(k + 1); return [ax + (bx - ax) * u, ay + (by - ay) * u]; };
  const inIv = (t, [a, b]) => (a <= b ? t >= a && t <= b : t >= a || t <= b);
  const isOpen = (t) => open.some((iv) => inIv(t, iv));
  function result() { // real pixels; outside the diamond transparent unless behind a frame opening
    const m = margin(), S = n + 2 * m;
    const o = document.createElement('canvas'); o.width = S; o.height = S;
    const g = o.getContext('2d'); g.drawImage(pic, -(x - m), -(y - m));
    const d = g.getImageData(0, 0, S, S);
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const li = i - m, lj = j - m;
      if (inside(li, lj, n) || (m && isOpen(edgeT(li + 0.5, lj + 0.5)))) continue;
      d.data[(j * S + i) * 4 + 3] = 0;
    }
    g.putImageData(d, 0, 0); return o;
  }
  function draw() {
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, cv.width, cv.height);
    g.drawImage(pic, pad * z, pad * z, W * z, H * z);
    // dim everything outside the diamond
    const cx = (pad + x + n / 2) * z, cy = (pad + y + n / 2) * z, r = n / 2 * z;
    g.save(); g.fillStyle = 'rgba(10,12,16,0.62)'; g.beginPath(); g.rect(0, 0, cv.width, cv.height);
    g.moveTo(cx, cy - r); g.lineTo(cx - r, cy); g.lineTo(cx, cy + r); g.lineTo(cx + r, cy); g.closePath(); g.fill('evenodd');
    g.strokeStyle = '#ffd34d'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, cy - r); g.lineTo(cx + r, cy); g.lineTo(cx, cy + r); g.lineTo(cx - r, cy); g.closePath(); g.stroke();
    g.setLineDash([4, 4]); g.strokeStyle = 'rgba(255,211,77,0.45)'; g.strokeRect((pad + x) * z, (pad + y) * z, n * z, n * z); g.restore();
    const o = result(), m = margin(), S = n + 2 * m;
    if (m) { // what pokes out is shown undimmed, inside the dashed 25 % reach box
      g.drawImage(o, (pad + x - m) * z, (pad + y - m) * z, S * z, S * z);
      g.save(); g.setLineDash([3, 5]); g.strokeStyle = 'rgba(90,209,255,0.5)'; g.lineWidth = 1; g.strokeRect((pad + x - m) * z, (pad + y - m) * z, S * z, S * z); g.restore();
      g.save(); g.strokeStyle = '#ffd34d'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, cy - r); g.lineTo(cx + r, cy); g.lineTo(cx, cy + r); g.lineTo(cx - r, cy); g.closePath(); g.stroke(); g.restore(); // frame line back on top
    }
    const ivs = open;
    if (ivs.length) { // openings = thick cyan along the frame edge
      g.save(); g.strokeStyle = '#5ad1ff'; g.lineWidth = Math.max(3, z * 0.9); g.lineCap = 'round';
      for (const [a, b] of ivs) {
        const len = (b - a + 1) % 1, steps = Math.max(2, Math.ceil(len * 160));
        g.beginPath();
        for (let s2 = 0; s2 <= steps; s2++) { const [px, py] = edgeP(a + len * s2 / steps); const X = (pad + x + px) * z, Y = (pad + y + py) * z; if (s2) g.lineTo(X, Y); else g.moveTo(X, Y); }
        g.stroke();
      }
      g.restore();
    }
    for (const [c, k] of [[out, Math.max(1, Math.floor(200 / S))], [out1, 1]]) { c.width = S * k; c.height = S * k; const gg = c.getContext('2d'); gg.imageSmoothingEnabled = false; gg.drawImage(o, 0, 0, S * k, S * k); }
    { // owner set 255 A1: preview the frame line the game draws, left open at the gaps
      const k = out.width / S, gg = out.getContext('2d'); gg.save(); gg.strokeStyle = '#d6b25c'; gg.lineWidth = Math.max(2, k); gg.lineCap = 'butt';
      const N = 400; let on = false;
      for (let i = 0; i <= N; i++) {
        const t = (i % N) / N, [px, py] = edgeP(t), X = (m + px) * k, Y = (m + py) * k;
        if (!isOpen(t)) { if (!on) { gg.beginPath(); gg.moveTo(X, Y); on = true; } else gg.lineTo(X, Y); } else if (on) { gg.stroke(); on = false; }
      }
      if (on) gg.stroke(); gg.restore();
    }
    zTxt.textContent = `×${z}`;
    sizeTxt.textContent = m ? `${n}×${n} px · ไฟล์ ${S}×${S}` : `${n}×${n} px`; sizeIn.value = String(n);
    openTxt.textContent = open.length ? `เปิดกรอบ ${open.length} ช่อง · ยื่นได้ไม่เกิน ${m} เม็ด (25%)` : 'ยังไม่มีช่องเปิด';
    clearB.disabled = !open.length; frameSw.setAttribute('aria-checked', String(frameMode)); frameSw.classList.toggle('is-on', frameMode);
    cv.classList.toggle('frame-mode', frameMode); hintEl.hidden = !frameMode;
  }
  function setN(v) { const c = [x + n / 2, y + n / 2]; n = Math.max(8, Math.min(256, Math.round(v / 2) * 2)); x = Math.round(c[0] - n / 2); y = Math.round(c[1] - n / 2); clamp(); draw(); }
  function clamp() { x = Math.max(-n + 4, Math.min(W - 4, x)); y = Math.max(-n + 4, Math.min(H - 4, y)); }
  let drag = null;
  const mirI = mirrorOf(src); if (mirI) cv.classList.add('flipx'); // facing right like the game; crop numbers stay in file pixels
  const at = (e) => { const rc = cv.getBoundingClientRect(); return [(mirI ? rc.right - e.clientX : e.clientX - rc.left) / rc.width * cv.width / z - pad, (e.clientY - rc.top) / rc.height * cv.height / z - pad]; };
  const tAt = (e) => { const p = at(e); return edgeT(p[0] - x, p[1] - y); };
  const gapTools = gapBrush(cv, { tAt, n: () => n, get: () => open, set: (v) => { open = v; }, active: () => frameMode, changed: draw }); // owner set 256 A1
  cv.addEventListener('pointerdown', (e) => { if (frameMode) return; e.preventDefault(); cv.focus(); const p = at(e); drag = { p, x0: x, y0: y }; if (!(p[0] >= x && p[0] <= x + n && p[1] >= y && p[1] <= y + n)) { x = Math.round(p[0] - n / 2); y = Math.round(p[1] - n / 2); clamp(); drag = { p, x0: x, y0: y }; draw(); } cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', (e) => { if (!drag || frameMode) return; const p = at(e); x = Math.round(drag.x0 + p[0] - drag.p[0]); y = Math.round(drag.y0 + p[1] - drag.p[1]); clamp(); draw(); });
  const end = () => { drag = null; };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  cv.addEventListener('wheel', (e) => { if (e.ctrlKey || e.metaKey) return; e.preventDefault(); setN(n + (e.deltaY < 0 ? 2 : -2)); }, { passive: false }); // Ctrl + wheel = dlgCtrlWheel
  const stageEl = h('div', { class: 'icon-stage' }, cv), zTxt = h('b', {});
  dlgCtrlWheel((e, inStage) => zoomTo(z + (e.deltaY < 0 ? 1 : -1), inStage ? e : undefined), stageEl); // owner set 256: never the page zoom
  function zoomTo(nz, e) { // keeps the point under the pointer (or the middle of the view) in place
    nz = Math.max(1, Math.min(32, nz)); if (nz === z) return;
    const st = stageEl, rc = st.getBoundingClientRect();
    const ox = e ? e.clientX - rc.left : st.clientWidth / 2, oy = e ? e.clientY - rc.top : st.clientHeight / 2;
    const fx = (st.scrollLeft + ox) / z, fy = (st.scrollTop + oy) / z;
    z = nz; cv.width = (W + pad * 2) * z; cv.height = (H + pad * 2) * z; draw();
    st.scrollLeft = fx * z - ox; st.scrollTop = fy * z - oy;
  }
  const zoomRow = h('div', { class: 'row' }, h('span', { class: 'lbl' }, 'ซูม'), h('span', { class: 'sp' }),
    h('button', { 'aria-label': 'ซูมออก', title: 'Ctrl + ล้อเมาส์ลง', onclick: () => zoomTo(z - 1) }, '−'), zTxt,
    h('button', { 'aria-label': 'ซูมเข้า', title: 'Ctrl + ล้อเมาส์ขึ้น', onclick: () => zoomTo(z + 1) }, '+'),
    h('button', { class: 'ghost', onclick: () => zoomTo(fitZ) }, 'พอดีจอ'));
  cv.addEventListener('keydown', (e) => {
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (d) { e.preventDefault(); const k = e.shiftKey ? 10 : 1; x += d[0] * k * (mirI ? -1 : 1); y += d[1] * k; clamp(); draw(); }
    else if (e.key === '+' || e.key === '=') { e.preventDefault(); setN(n + 2); } else if (e.key === '-') { e.preventDefault(); setN(n - 2); }
  });
  const dlg = $('dlg');
  const close = () => { dlg.classList.remove('icon-dlg'); dlg.close(); };
  async function saveIcon(thenEdit) {
    saveB.disabled = true; saveEdB.disabled = true;
    try {
      const m = margin(), S = n + 2 * m;
      const blob = await new Promise((ok) => result().toBlob(ok, 'image/png'));
      const q = new URLSearchParams({ item: it.id, slot: 'icon', name: `${it.id}_icon_${S}.png`, form: String(src.form || ui.form) });
      hub = await api('/api/upload?' + q, { method: 'POST', body: blob }); // newest = ★ used
      const nit = hub.items[it.id], nr = nit.rounds.at(-1);
      nit.iconCrop = { round: src.id, x, y, n };
      if (open.length) { nit.iconCrop.open = open.map((iv) => iv.map((v) => Math.round(v * 10000) / 10000)); nit.iconCrop.m = m; }
      if (nr) {
        nr.note = `ไอคอน ${n}×${n} จาก${src.slot === 'cut' ? 'ภาพตัดพื้น' : 'ภาพนิ่ง'} ${fmtDate(src.t)}` + (m ? ` · เปิดกรอบ ${open.length} ช่อง ยื่นได้ ${m} เม็ด (ไฟล์ ${S}×${S})` : '');
        if (src.flip) nr.flip = true;
        if (m) { nr.iconPad = m; nr.iconOpen = nit.iconCrop.open; nr.iconN = n; } // each icon keeps its own gaps, so the game knows where the frame line opens
      }
      await save(); toast('บันทึกไอคอนแล้ว ใช้อันนี้แล้ว'); close(); render();
      if (thenEdit && nr) pixelEditor(hub.items[it.id], nr);
    } catch (e) { toast('บันทึกไม่ได้: ' + e.message); saveB.disabled = false; saveEdB.disabled = false; }
  }
  const saveB = h('button', { class: 'primary', onclick: () => saveIcon(false) }, 'บันทึกและใช้เลย');
  const saveEdB = h('button', { title: 'บันทึกไอคอนนี้ แล้วเปิดตัวแก้พิกเซลเพื่อเก็บงานส่วนที่ยื่นออก', onclick: () => saveIcon(true) }, 'บันทึกแล้วแก้พิกเซลต่อ');
  const frameSw = h('button', { class: 'switch', role: 'switch', 'aria-checked': 'false', onclick: () => { frameMode = !frameMode; draw(); } }, h('span', { class: 'knob' }), 'แต่งกรอบ (เปิดช่องให้ยื่นออก)');
  const clearB = h('button', { class: 'ghost', onclick: () => gapTools.clear() }, 'ปิดทุกช่อง');
  const openTxt = h('span', { class: 'small dim' });
  const hintEl = h('div', {}, gapTools, h('p', { class: 'small icon-hint' }, GAP_HINT + ' · ปิดสวิตช์เพื่อกลับไปลากย้ายกรอบ'));
  $('dlgBody').replaceChildren(
    h('div', { class: 'row' }, h('h3', { style: 'margin:0' }, `ตัดกรอบไอคอน · ${it.id}`), h('span', { class: 'small dim' }, 'ลากกรอบไปวางบนส่วนที่อยากให้อยู่ในไอคอน · ล้อเมาส์ = ขนาด · Ctrl + ล้อเมาส์ = ซูม · ลูกศร = ขยับทีละ 1 เม็ด'), h('span', { class: 'sp' }), saveEdB, saveB, h('button', { onclick: close }, 'ปิด')),
    h('div', { class: 'icon-ed' },
      stageEl,
      h('div', { class: 'icon-side' },
        zoomRow,
        h('div', { class: 'row' }, h('span', { class: 'lbl' }, 'ขนาดกรอบ'), h('span', { class: 'sp' }), sizeTxt), sizeIn,
        h('div', { class: 'icon-frame' }, frameSw, h('div', { class: 'row' }, openTxt, h('span', { class: 'sp' }), clearB), hintEl),
        h('div', { class: 'lbl' }, 'ผลลัพธ์ (ขยายให้ดู · เส้นทอง = ขอบที่เกมจะวาด ไม่อยู่ในไฟล์)'), h('div', { class: 'icon-prev' }, flipped(out, src)),
        h('div', { class: 'lbl' }, 'ขนาดจริง'), h('div', { class: 'icon-prev small' }, flipped(out1, src)),
        h('p', { class: 'small faint' }, 'พิกเซลจริงไม่ย่อไม่ขยาย · นอกกรอบโปร่งใส (ยกเว้นหลังช่องที่เปิด) · ไม่มีขอบ (ให้เกมวาดเอง) · หันข้างตามสวิตช์กลับข้างของภาพ'))));
  dlg.classList.add('icon-dlg'); dlg.addEventListener('close', () => dlg.classList.remove('icon-dlg'), { once: true });
  draw(); dlg.showModal(); cv.focus();
}

// ---------- pixel editor (set 246, owner spec) ----------
// Small pictures only (≤ 256 px). Left click = paint, right click = erase (owner swapped it), hold + drag = keep painting/erasing along the path.
// Hold Space = colour picker: the colour under the pointer is picked as you point (no click); let go of Space = back to normal. Saved as a NEW round
// (the original stays) and starred = used right away (owner); the old round can be starred back from the list.
const PXED_MAX = 256;
// copied pixels (owner set 248): kept between editors, so a piece of one picture can be pasted into another
let pxClip = null;
async function pixelEditor(it, r, opt = {}) {
  let img;
  try { img = await loadImg(r.file); } catch { toast('เปิดภาพไม่ได้'); return; }
  // owner set 257 C1: a frames sheet is edited one frame at a time (opt.frame); saving writes that frame back into a copy of the whole sheet
  const fr = r.slot === 'frames' && r.meta && Number.isInteger(opt.frame) ? sheetFrame(img, r.meta, opt.frame) : null;
  let W = fr ? fr[2] : img.naturalWidth, H = fr ? fr[3] : img.naturalHeight; // let: the copied-piece tab swaps in its own size (owner set 248 round 5)
  if (W > PXED_MAX || H > PXED_MAX) { toast(`ภาพนี้ ${W}×${H} ใหญ่เกินไปสำหรับตัวแก้บนเว็บ (สูงสุด ${PXED_MAX} px) ใช้ Pixelorama แทน`); return; }
  const src = document.createElement('canvas'); src.width = W; src.height = H;
  const sg = src.getContext('2d', { willReadFrequently: true }); if (fr) sg.drawImage(img, fr[0], fr[1], W, H, 0, 0, W, H); else sg.drawImage(img, 0, 0);
  let data = sg.getImageData(0, 0, W, H);
  let undoS = [], redoS = [];
  let colour = [0, 0, 0, 255], tool = 'pen', grid = true, picking = false, dirty = false, stroke = null, hover = null, lastDown = 0;
  // selection (owner set 248 A1: rectangle + freehand lasso, Shift adds) and a floating piece (paste / dragged-out copy) that is placed with Enter
  let sel = null, selEdges = null, rectD = null, lassoD = null, float = null, fdrag = null;
  // owner set 248 round 5 (A1 + B1): every copy opens a 2nd tab with just the copied piece; edit it there, then it floats onto the real picture
  const docs = { main: {}, piece: null }; let cur = 'main';
  // owner set 253 (B: keep layers until saved · C1): every placed piece becomes its own layer on the real picture; tools edit the chosen layer;
  // saving merges the visible layers into one picture. `data` is always the chosen layer's pixels (main tab) or the piece (piece tab).
  let layers = [{ name: 'ภาพหลัก', data, vis: true }], act = 0, lyrN = 0;
  const cloneI = (d) => new ImageData(new Uint8ClampedArray(d.data), d.width, d.height);
  function composeL(Ls, vis = true) { // a pixel of a higher layer replaces what is under it (same rule as placing a piece)
    const o = new ImageData(Ls[0].data.width, Ls[0].data.height), d = o.data;
    for (const l of Ls) { if (vis && !l.vis) continue; const s0 = l.data.data; for (let i = 0; i < s0.length; i += 4) if (s0[i + 3]) { d[i] = s0[i]; d[i + 1] = s0[i + 1]; d[i + 2] = s0[i + 2]; d[i + 3] = s0[i + 3]; } }
    return o;
  }
  const compose = () => (layers ? composeL(layers) : data);
  let swapBtn = false; try { swapBtn = localStorage.getItem('pxedSwap2') === '1'; } catch { /* storage off */ }
  const fitZ = (mx = 16) => Math.max(2, Math.min(mx, Math.floor(Math.min((window.innerWidth * 0.96 - 360) / W, (window.innerHeight * 0.92 - 150) / H))));
  let z = fitZ();
  const cv = h('canvas', { class: 'pxed-cv', tabindex: 0, 'aria-label': 'ตัวแก้พิกเซล คลิกซ้ายใส่สี คลิกขวาลบ กด Space ค้างแล้วคลิกเพื่อดูดสี' });
  const hex = (c) => '#' + c.slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join('');
  const curSw = h('span', { class: 'pxed-cur' }), curTxt = h('span', { class: 'small dim' });
  const colIn = h('input', { type: 'color', 'aria-label': 'เลือกสีเอง', oninput: (e) => { const v = e.target.value; setColour([parseInt(v.slice(1, 3), 16), parseInt(v.slice(3, 5), 16), parseInt(v.slice(5, 7), 16), 255]); } });
  const pal = h('div', { class: 'pxed-pal', role: 'group', 'aria-label': 'สีในภาพ' });
  const modeEl = h('div', { class: 'pxed-mode' }), posEl = h('span', { class: 'small dim' });
  const zEl = h('b', {});
  const undoB = h('button', { title: 'Ctrl+Z', onclick: () => undo() }, 'ย้อน'), redoB = h('button', { title: 'Ctrl+Y', onclick: () => redo() }, 'ทำซ้ำ');
  // plain backdrops that stand out against the sprite (owner: black, white, bright green, bright pink)
  const PXBG = [['checker', 'ตาราง', ''], ['black', 'ดำ', '#000000'], ['white', 'ขาว', '#ffffff'], ['green', 'เขียว', '#00ff00'], ['pink', 'ชมพู', '#ff00ff']];
  let bgK = 'checker'; try { bgK = localStorage.getItem('pxedBg') || 'checker'; } catch { /* storage off */ }
  const stageEl = h('div', { class: 'pxed-stage' }, cv);
  const bgSeg = h('span', { class: 'seg' }, PXBG.map(([k, l, c]) => h('button', { 'data-k': k, onclick: () => { bgK = k; try { localStorage.setItem('pxedBg', k); } catch { /* storage off */ } syncUi(); paint(); } }, c ? [h('i', { class: 'pxed-dot', style: `--sw:${c}` }), l] : l)));
  const swapSw = h('button', { class: 'switch', role: 'switch', title: 'สำหรับเมาส์/ทัชแพดที่คลิกขวาไม่สะดวก', onclick: () => { swapBtn = !swapBtn; try { localStorage.setItem('pxedSwap2', swapBtn ? '1' : '0'); } catch { /* storage off */ } syncUi(); } }, h('span', { class: 'knob' }), 'สลับปุ่ม: คลิกขวา = ใส่สี');
  const toolSeg = h('span', { class: 'seg' }, [['pen', 'ดินสอ'], ['fill', 'ถังเท'], ['rect', 'เลือก ▭'], ['lasso', 'เลือกวาดเอง']].map(([k, l]) => h('button', { 'data-k': k, onclick: () => setTool(k) }, l)));
  const gridSw = h('button', { class: 'switch', role: 'switch', onclick: () => { grid = !grid; syncUi(); paint(); } }, h('span', { class: 'knob' }), 'เส้นตาราง');
  const saveB = h('button', { class: 'primary', onclick: () => saveEdit() }, 'บันทึกและใช้เลย');
  const copyB = h('button', { title: 'Ctrl+C', onclick: () => copySel() }, 'คัดลอก'), cutB = h('button', { title: 'Ctrl+X', onclick: () => cutSel() }, 'ตัด');
  const pasteB = h('button', { title: 'Ctrl+V', onclick: () => paste() }, 'วาง'), delB = h('button', { title: 'Delete', onclick: () => delSel() }, 'ลบที่เลือก');
  const noneB = h('button', { class: 'ghost', title: 'Esc', onclick: () => { setSel(null); paint(); } }, 'ยกเลิกเลือก');
  const placeB = h('button', { class: 'primary', title: 'Enter', onclick: () => commitFloat() }, 'วางลง'), dropB = h('button', { class: 'ghost', title: 'Esc', onclick: () => cancelFloat() }, 'ยกเลิก');
  const flipHB = h('button', { onclick: () => flipFloat(true) }, 'กลับซ้าย-ขวา'), flipVB = h('button', { onclick: () => flipFloat(false) }, 'กลับบน-ล่าง');
  const floatRow = h('div', { class: 'row pxed-float' }, placeB, dropB, flipHB, flipVB);
  const closeB = h('button', { onclick: () => close() }, 'ปิด');
  const mainTab = h('button', { 'data-k': 'main', onclick: () => switchTo('main') }, 'ภาพจริง'), pieceTab = h('button', { 'data-k': 'piece', onclick: () => switchTo('piece') }, 'ชิ้นที่ก๊อป');
  const tabSeg = h('span', { class: 'seg pxed-tabs', role: 'tablist' }, mainTab, pieceTab);
  const sendB = h('button', { class: 'primary', title: 'Enter', onclick: () => sendPiece() }, 'เอาไปวางบนภาพจริง');
  // owner set 248 round 5: turn the piece. Every angle is drawn from the piece as it was when turning started (no blur build-up); 90° steps are exact
  let rot = null; // { base: ImageData, deg } while turning; any other edit ends it
  const rotIn = h('input', { type: 'range', min: -180, max: 180, step: 1, value: 0, 'aria-label': 'หมุนองศา', oninput: (e) => rotateTo(+e.target.value) });
  const rotNum = h('input', { type: 'number', min: -180, max: 180, step: 1, value: 0, class: 'pxed-rotnum', 'aria-label': 'องศา', onchange: (e) => rotateTo(Math.max(-180, Math.min(180, Math.round(+e.target.value || 0)))) });
  const rotL = h('button', { title: 'หมุนทวนเข็ม 90°', onclick: () => rotateTo((rot ? rot.deg : 0) - 90) }, '⟲ 90°'), rotR = h('button', { title: 'หมุนตามเข็ม 90°', onclick: () => rotateTo((rot ? rot.deg : 0) + 90) }, '⟳ 90°');
  const rotRow = h('div', { class: 'row pxed-rot' }, h('span', { class: 'lbl' }, 'หมุน'), rotL, rotR, rotIn, rotNum, h('span', { class: 'small dim' }, '°'));
  const pieceBar = h('div', { class: 'pxed-piecebar' }, h('strong', {}, 'หน้าชิ้นที่ก๊อป'), h('span', { class: 'small dim' }, 'แก้ชิ้นนี้ก่อนได้ทุกเครื่องมือ หมุนได้ ภาพจริงยังไม่เปลี่ยน · Enter = เอาไปลอยบนภาพจริงที่จุดเดิม แล้วลาก/ขยับก่อนวาง · Esc = กลับภาพจริง (ไม่วาง)'), rotRow, sendB);
  // layers panel + edit menu (owner set 253)
  const lyrList = h('div', { class: 'pxed-lyrs', role: 'group', 'aria-label': 'เลเยอร์' });
  const lyrUp = h('button', { title: 'เลื่อนเลเยอร์ขึ้น', onclick: () => layerOp('up') }, 'ขึ้น'), lyrDown = h('button', { title: 'เลื่อนเลเยอร์ลง', onclick: () => layerOp('down') }, 'ลง');
  const lyrMerge = h('button', { title: 'รวมเลเยอร์นี้ลงกับชั้นล่าง', onclick: () => layerOp('merge') }, 'รวมลงล่าง'), lyrDel = h('button', { title: 'ลบเลเยอร์นี้', onclick: () => layerOp('del') }, 'ลบ');
  const lyrBox = h('div', { class: 'pxed-lyrbox' }, h('div', { class: 'lbl' }, 'เลเยอร์'), lyrList, h('div', { class: 'row pxed-lyrrow' }, lyrUp, lyrDown, lyrMerge, lyrDel),
    h('span', { class: 'small dim' }, 'เครื่องมือแก้เฉพาะเลเยอร์ที่เลือก · ตอนบันทึก เลเยอร์ที่ซ่อนจะไม่ติดไปด้วย'));
  let editOn = false; try { editOn = localStorage.getItem('pxedEdit') === '1'; } catch { /* storage off */ }
  const editSw = h('button', { class: 'switch', role: 'switch', onclick: () => { editOn = !editOn; try { localStorage.setItem('pxedEdit', editOn ? '1' : '0'); } catch { /* storage off */ } syncUi(); } }, h('span', { class: 'knob' }), 'เมนูแก้ไข (ย้าย หมุน กลับด้าน)');
  const mRotIn = h('input', { type: 'range', min: -180, max: 180, step: 1, value: 0, 'aria-label': 'หมุนองศา', oninput: (e) => rotF(+e.target.value) });
  const mRotNum = h('input', { type: 'number', min: -180, max: 180, step: 1, value: 0, class: 'pxed-rotnum', 'aria-label': 'องศา', onchange: (e) => rotF(Math.max(-180, Math.min(180, Math.round(+e.target.value || 0)))) });
  const mDeg = () => (float && float.deg) || 0;
  const editBox = h('div', { class: 'pxed-editbox' },
    h('span', { class: 'small dim' }, 'ใช้กับส่วนที่เลือก ถ้าไม่ได้เลือกใช้กับทั้งเลเยอร์'),
    h('div', { class: 'row pxed-editrow' }, h('button', { title: 'ยกขึ้นมาลากย้าย (ลูกศร = ทีละเม็ด)', onclick: () => lift() }, 'ย้าย'), h('button', { onclick: () => flipM(true) }, 'กลับซ้าย-ขวา'), h('button', { onclick: () => flipM(false) }, 'กลับบน-ล่าง')),
    h('div', { class: 'row pxed-mrot' }, h('span', { class: 'lbl' }, 'หมุน'), h('button', { title: 'หมุนทวนเข็ม 90°', onclick: () => rotF(mDeg() - 90) }, '⟲ 90°'), h('button', { title: 'หมุนตามเข็ม 90°', onclick: () => rotF(mDeg() + 90) }, '⟳ 90°'), mRotNum, h('span', { class: 'small dim' }, '°')), mRotIn);
  // RotSprite (owner set 253 A1): for angles that are not a 90° step, the piece is first blown up 8× with Scale2x three times (keeps edges
  // smooth, adds no new colours), turned there, then read back one sample per pixel → far fewer broken / doubled pixels. 90° steps stay exact.
  const up8Cache = new WeakMap();
  function scale2x(u, w, hh) { // EPX on packed RGBA; neighbours at the border repeat the edge pixel
    const o = new Uint32Array(w * hh * 4), w2 = w * 2;
    for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) {
      const P = u[y * w + x], A = u[(y > 0 ? y - 1 : y) * w + x], D = u[(y < hh - 1 ? y + 1 : y) * w + x], C = u[y * w + (x > 0 ? x - 1 : x)], B = u[y * w + (x < w - 1 ? x + 1 : x)];
      const i = (y * 2) * w2 + x * 2;
      o[i] = C === A && C !== D && A !== B ? A : P; o[i + 1] = A === B && A !== C && B !== D ? B : P;
      o[i + w2] = D === C && D !== B && C !== A ? C : P; o[i + w2 + 1] = B === D && B !== A && D !== C ? D : P;
    }
    return o;
  }
  function up8(img) {
    let c = up8Cache.get(img); if (c) return c;
    let u = new Uint32Array(img.data.buffer.slice(img.data.byteOffset, img.data.byteOffset + img.data.byteLength)), w = img.width, hh = img.height;
    for (let k = 0; k < 3; k++) { u = scale2x(u, w, hh); w *= 2; hh *= 2; }
    c = { u, w, h: hh }; up8Cache.set(img, c); return c;
  }
  function rotImg(img, deg) { // the box grows to fit; deg = clockwise in file pixels
    const a = deg * Math.PI / 180; let c = Math.cos(a), sn = Math.sin(a);
    if (Math.abs(c) < 1e-9) c = 0; if (Math.abs(sn) < 1e-9) sn = 0;
    const w = img.width, hh = img.height, nw = Math.max(1, Math.round(Math.abs(w * c) + Math.abs(hh * sn))), nh = Math.max(1, Math.round(Math.abs(w * sn) + Math.abs(hh * c)));
    const out = new ImageData(nw, nh), s0 = img.data, d = out.data, ou = new Uint32Array(d.buffer);
    const exact = !c || !sn, U = exact ? null : up8(img);
    for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
      const dx = x + 0.5 - nw / 2, dy = y + 0.5 - nh / 2, fx = dx * c + dy * sn + w / 2, fy = -dx * sn + dy * c + hh / 2;
      if (exact) {
        const sx = Math.floor(fx + 1e-6), sy = Math.floor(fy + 1e-6);
        if (sx < 0 || sy < 0 || sx >= w || sy >= hh) continue;
        const i = (sy * w + sx) * 4, o = (y * nw + x) * 4; d[o] = s0[i]; d[o + 1] = s0[i + 1]; d[o + 2] = s0[i + 2]; d[o + 3] = s0[i + 3];
      } else {
        const ux = Math.floor(fx * 8), uy = Math.floor(fy * 8);
        if (ux < 0 || uy < 0 || ux >= U.w || uy >= U.h) continue;
        ou[y * nw + x] = U.u[uy * U.w + ux];
      }
    }
    return out;
  }
  function setData(d) { data = d; if (d.width !== W || d.height !== H) { W = d.width; H = d.height; src.width = W; src.height = H; sel = null; selEdges = null; } }
  function rotateTo(deg) {
    if (cur !== 'piece') return;
    commitFloat(); setSel(null);
    deg = ((Math.round(deg) + 540) % 360) - 180; if (deg === -180) deg = 180;
    if (!rot) { snapshot(); rot = { base: data, deg: 0 }; }
    rot.deg = deg; setData(deg ? rotImg(rot.base, mirX ? -deg : deg) : rot.base); // the piece is shown mirrored when the picture is: turn the way it looks
    rotIn.value = String(deg); rotNum.value = String(deg); syncUi(); paint();
  }
  function rotReset() { rot = null; rotIn.value = '0'; rotNum.value = '0'; }
  const mainDirty = () => (cur === 'main' ? dirty : !!docs.main.dirty);
  function stash() { Object.assign(docs[cur], { W, H, data, undoS, redoS, dirty, z, layers, act }); }
  function load(k) {
    const d = docs[k]; W = d.W; H = d.H; layers = d.layers || null; act = d.act || 0; data = layers ? layers[act].data : d.data; undoS = d.undoS; redoS = d.redoS; dirty = d.dirty; z = d.z; cur = k;
    sel = null; selEdges = null; float = null; fdrag = null; rectD = null; lassoD = null; stroke = null; hover = null;
    src.width = W; src.height = H;
  }
  function pieceClip() { const P = docs.piece; pxClip = { x: P.ox + Math.round((P.ow - W) / 2), y: P.oy + Math.round((P.oh - H) / 2), w: W, h: H, d: new Uint8ClampedArray(data.data) }; } // only while the piece tab is loaded; a turned piece stays centred on the copy spot
  function switchTo(k) {
    if (k === cur || (k === 'piece' && !docs.piece)) return;
    commitFloat();
    if (cur === 'piece') pieceClip(); // the edited piece is what Ctrl+V gives from now on
    stash(); load(k); rotReset(); palette(); syncUi(); paint(); stageEl.scrollTo(0, 0); cv.focus();
  }
  function openPiece(g) {
    stash();
    docs.piece = { W: g.w, H: g.h, data: new ImageData(new Uint8ClampedArray(g.d), g.w, g.h), undoS: [], redoS: [], dirty: false, z: 1, ox: g.x, oy: g.y, ow: g.w, oh: g.h }; rotReset();
    load('piece'); z = docs.piece.z = fitZ(32); tool = 'pen';
    palette(); syncUi(); paint(); stageEl.scrollTo(0, 0); cv.focus();
  }
  function sendPiece() { if (cur !== 'piece') return; commitFloat(); switchTo('main'); paste(); }
  function setColour(c) { colour = c; syncUi(); }
  function setTool(k) { // owner set 248: changing tool places a floating piece and drops the selection (no marks left behind)
    if (k === tool) return;
    commitFloat(); rectD = null; lassoD = null; tool = k; setSel(null); paint();
  }
  function palette() { // the picture's own colours, most used first
    const n = new Map();
    const pd = (cur === 'main' ? composeL(layers, false) : composeL(docs.main.layers, false)).data; // the real picture's colours, also on the piece tab
    for (let i = 0; i < pd.length; i += 4) { if (pd[i + 3] < 128) continue; const k = (pd[i] << 16) | (pd[i + 1] << 8) | pd[i + 2]; n.set(k, (n.get(k) || 0) + 1); }
    const top = [...n.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k]) => [(k >> 16) & 255, (k >> 8) & 255, k & 255, 255]);
    pal.replaceChildren(...top.map((c) => h('button', { class: 'pxed-sw', title: hex(c), 'aria-label': 'สี ' + hex(c), style: `--sw:${hex(c)}`, onclick: () => setColour(c) })));
    if (!pd.some((v, i) => i % 4 === 3 && v > 0)) pal.append(h('span', { class: 'small faint' }, 'ภาพว่าง'));
  }
  function syncUi() {
    curSw.style.setProperty('--sw', hex(colour)); curTxt.textContent = hex(colour); colIn.value = hex(colour);
    toolSeg.querySelectorAll('button').forEach((b) => { const on = b.dataset.k === tool; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    gridSw.classList.toggle('is-on', grid); gridSw.setAttribute('aria-checked', String(grid));
    zEl.textContent = `×${z}`; undoB.disabled = !undoS.length; redoB.disabled = !redoS.length; saveB.disabled = !mainDirty();
    const [pb, eb] = swapBtn ? ['คลิกขวา', 'คลิกซ้าย'] : ['คลิกซ้าย', 'คลิกขวา'];
    modeEl.textContent = picking ? 'โหมดดูดสี · ชี้เม็ดไหนก็ได้สีนั้นทันที · ปล่อย Space เพื่อกลับ'
      : float ? 'ลากชิ้นที่วางไปตำแหน่งที่ต้องการ · ลูกศรขยับทีละ 1 เม็ด · Enter หรือคลิกข้างนอก = วางลง · Esc = ยกเลิก'
      : isSel() ? `${tool === 'rect' ? 'ลากเป็นกรอบ' : 'ลากวาดเส้นรอบส่วนที่ต้องการ'}เพื่อเลือก · Shift = เลือกเพิ่ม · ลากในส่วนที่เลือก = ลากสำเนาออกมา (ภาพเดิมอยู่ที่เดิม) · Ctrl+C คัดลอก · Ctrl+X ตัด · Ctrl+V วาง · Delete ลบ · Esc ยกเลิกเลือก`
      : tool === 'fill' ? `${pb} = เทสีพื้นที่ติดกัน · ${eb} = ลบ · Space ค้าง = ชี้ดูดสี` : `${pb} = ใส่สี · ${eb} = ลบ · ลากค้างได้ · Space ค้าง = ชี้ดูดสี`;
    const bc = (PXBG.find((x) => x[0] === bgK) || PXBG[0])[2];
    stageEl.style.background = bc || ''; stageEl.classList.toggle('plain', !!bc);
    bgSeg.querySelectorAll('button').forEach((b) => { const on = b.dataset.k === bgK; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    swapSw.classList.toggle('is-on', swapBtn); swapSw.setAttribute('aria-checked', String(swapBtn));
    modeEl.classList.toggle('picking', picking); cv.classList.toggle('picking', picking); cv.classList.toggle('selecting', isSel() || !!float);
    for (const b of [copyB, cutB, delB, noneB]) b.disabled = !sel;
    pasteB.disabled = !pxClip; floatRow.hidden = !float;
    pieceTab.hidden = !docs.piece; if (docs.piece) pieceTab.textContent = cur === 'piece' ? `ชิ้นที่ก๊อป ${W}×${H}` : `ชิ้นที่ก๊อป ${docs.piece.W}×${docs.piece.H}`;
    for (const b of [mainTab, pieceTab]) { const on = b.dataset.k === cur; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); }
    pieceBar.hidden = cur !== 'piece'; sendB.disabled = !!float;
    if (!rot && rotIn.value !== '0') { rotIn.value = '0'; rotNum.value = '0'; } // another edit ended the turning
    lyrBox.hidden = !layers; editSw.hidden = !layers; editBox.hidden = !layers || !editOn;
    editSw.classList.toggle('is-on', editOn); editSw.setAttribute('aria-checked', String(editOn));
    mRotIn.value = String(mDeg()); mRotNum.value = String(mDeg());
    if (layers) renderLayers();
  }
  function paint() {
    cv.width = W * z; cv.height = H * z;
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, cv.width, cv.height);
    sg.putImageData(compose(), 0, 0); g.drawImage(src, 0, 0, W * z, H * z);
    if (grid && z >= 4) {
      g.strokeStyle = bgK === 'white' || bgK === 'green' ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.14)'; g.lineWidth = 1; g.beginPath();
      for (let x = 1; x < W; x++) { g.moveTo(x * z + 0.5, 0); g.lineTo(x * z + 0.5, H * z); }
      for (let y = 1; y < H; y++) { g.moveTo(0, y * z + 0.5); g.lineTo(W * z, y * z + 0.5); }
      g.stroke();
    }
    if (float) { // the floating piece over the picture
      const t = document.createElement('canvas'); t.width = float.w; t.height = float.h; t.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(float.d), float.w, float.h), 0, 0);
      g.drawImage(t, float.x * z, float.y * z, float.w * z, float.h * z);
      ants(g, () => g.rect(float.x * z + 0.5, float.y * z + 0.5, float.w * z - 1, float.h * z - 1), '#8cc8ff');
    }
    const ed = edges();
    if (ed) ants(g, () => { for (const [a, b, c, d] of ed) { g.moveTo(a * z, b * z); g.lineTo(c * z, d * z); } });
    if (rectD) { const x0 = Math.min(rectD.a[0], rectD.b[0]), y0 = Math.min(rectD.a[1], rectD.b[1]), x1 = Math.max(rectD.a[0], rectD.b[0]) + 1, y1 = Math.max(rectD.a[1], rectD.b[1]) + 1; ants(g, () => g.rect(x0 * z, y0 * z, (x1 - x0) * z, (y1 - y0) * z)); }
    if (lassoD) ants(g, () => { lassoD.pts.forEach(([x, y], i) => (i ? g.lineTo : g.moveTo).call(g, (x + 0.5) * z, (y + 0.5) * z)); });
    if (hover) {
      if (!picking && !stroke && !isSel() && !float) { g.fillStyle = hex(colour); g.fillRect(hover[0] * z, hover[1] * z, z, z); } // preview of the paint colour under the pointer
      g.strokeStyle = picking ? '#ff5ad1' : '#fff'; g.lineWidth = 2; g.strokeRect(hover[0] * z + 1, hover[1] * z + 1, z - 2, z - 2);
      g.strokeStyle = '#000'; g.lineWidth = 1; g.strokeRect(hover[0] * z - 0.5, hover[1] * z - 0.5, z + 1, z + 1);
    }
  }
  const mirX = mirrorOf(r); if (mirX) cv.classList.add('flipx'); // shown facing right like everywhere else; the file itself is not mirrored
  const at = (e) => { const rc = cv.getBoundingClientRect(); const x = Math.floor((mirX ? rc.right - e.clientX : e.clientX - rc.left) / rc.width * W), y = Math.floor((e.clientY - rc.top) / rc.height * H); return x >= 0 && y >= 0 && x < W && y < H ? [x, y] : null; };
  const px = (x, y) => (y * W + x) * 4;
  function setPx(x, y, c) { const i = px(x, y); data.data[i] = c[0]; data.data[i + 1] = c[1]; data.data[i + 2] = c[2]; data.data[i + 3] = c[3]; }
  function walk(a, b, fn) { // every pixel between two points (Bresenham)
    let [x0, y0] = a; const [x1, y1] = b, dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) { fn(x0, y0); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
  }
  function line(a, b, c) { walk(a, b, (x, y) => setPx(x, y, c)); } // a fast drag leaves no gaps
  function fill(x, y, c) { // flood fill of the touching area with the same colour
    const i0 = px(x, y), t = [data.data[i0], data.data[i0 + 1], data.data[i0 + 2], data.data[i0 + 3]];
    if (t.every((v, j) => v === c[j])) return;
    const same = (i) => (t[3] === 0 ? data.data[i + 3] === 0 : data.data[i] === t[0] && data.data[i + 1] === t[1] && data.data[i + 2] === t[2] && data.data[i + 3] === t[3]);
    const st = [[x, y]], seen = new Uint8Array(W * H);
    while (st.length) { const [a, b] = st.pop(); if (a < 0 || b < 0 || a >= W || b >= H || seen[b * W + a] || !same(px(a, b))) continue; seen[b * W + a] = 1; setPx(a, b, c); st.push([a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]); }
  }
  function ants(g, path, col = '#fff') { g.save(); g.beginPath(); path(); g.lineWidth = 3; g.strokeStyle = '#000'; g.stroke(); g.lineWidth = 1.5; g.setLineDash([4, 4]); g.strokeStyle = col; g.stroke(); g.restore(); }
  // ---- selection / copy / paste ----
  function isSel() { return tool === 'rect' || tool === 'lasso'; }
  const atC = (e) => { const rc = cv.getBoundingClientRect(); const x = Math.floor((mirX ? rc.right - e.clientX : e.clientX - rc.left) / rc.width * W), y = Math.floor((e.clientY - rc.top) / rc.height * H); return [Math.max(0, Math.min(W - 1, x)), Math.max(0, Math.min(H - 1, y))]; };
  function setSel(m) { sel = m && m.some((v) => v) ? m : null; selEdges = null; syncUi(); }
  function edges() { // outline of the selection in pixel units, rebuilt only when it changes
    if (!sel) return null; if (selEdges) return selEdges;
    const e = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!sel[y * W + x]) continue;
      if (y === 0 || !sel[(y - 1) * W + x]) e.push([x, y, x + 1, y]);
      if (y === H - 1 || !sel[(y + 1) * W + x]) e.push([x, y + 1, x + 1, y + 1]);
      if (x === 0 || !sel[y * W + x - 1]) e.push([x, y, x, y + 1]);
      if (x === W - 1 || !sel[y * W + x + 1]) e.push([x + 1, y, x + 1, y + 1]);
    }
    return (selEdges = e);
  }
  function rectMask(a, b, add) {
    const m = add && sel ? sel.slice() : new Uint8Array(W * H);
    for (let y = Math.min(a[1], b[1]); y <= Math.max(a[1], b[1]); y++) for (let x = Math.min(a[0], b[0]); x <= Math.max(a[0], b[0]); x++) m[y * W + x] = 1;
    return m;
  }
  function lassoMask(pts, add) { // pixels whose centre is inside the drawn loop, plus the line itself
    const m = add && sel ? sel.slice() : new Uint8Array(W * H);
    let x0 = W, x1 = 0, y0 = H, y1 = 0; for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside; }
      if (inside) m[y * W + x] = 1;
    }
    for (let i = 0; i < pts.length; i++) walk(pts[i], pts[(i + 1) % pts.length], (x, y) => { m[y * W + x] = 1; });
    return m;
  }
  function grab(m) { // the selected pixels as a tight box; outside the selection = transparent
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (m[y * W + x]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const w = x1 - x0 + 1, hh = y1 - y0 + 1, d = new Uint8ClampedArray(w * hh * 4);
    for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) if (m[(y0 + y) * W + x0 + x]) { const i = px(x0 + x, y0 + y); d.set(data.data.subarray(i, i + 4), (y * w + x) * 4); }
    return { x: x0, y: y0, w, h: hh, d };
  }
  function clearSel() { for (let i = 0; i < W * H; i++) if (sel[i]) data.data.fill(0, i * 4, i * 4 + 4); }
  function copySel() {
    if (!sel) { toast('เลือกส่วนที่จะคัดลอกก่อน'); return false; }
    const g = grab(sel);
    if (cur === 'piece') { pxClip = { ...g, x: g.x + docs.piece.ox, y: g.y + docs.piece.oy }; toast(`คัดลอกแล้ว ${g.w}×${g.h} เม็ด กด Ctrl+V เพื่อวาง`); syncUi(); return true; }
    pxClip = g; openPiece(g); return true; // owner A1: every copy opens the piece tab
  }
  function cutSel() {
    if (!sel) { toast('เลือกส่วนที่จะตัดก่อน'); return; }
    const g = grab(sel); snapshot(); clearSel(); dirty = true;
    if (cur === 'piece') { pxClip = { ...g, x: g.x + docs.piece.ox, y: g.y + docs.piece.oy }; setSel(null); palette(); syncUi(); paint(); return; }
    pxClip = g; openPiece(g);
  }
  function delSel() { if (!sel) return; snapshot(); clearSel(); dirty = true; palette(); syncUi(); paint(); }
  function paste() {
    if (!pxClip) { toast('ยังไม่ได้คัดลอกอะไร'); return; }
    commitFloat();
    const c = pxClip, bx = cur === 'piece' ? 0 : c.x, by = cur === 'piece' ? 0 : c.y; // same spot it was copied from (piece tab: top left), kept inside the picture
    const keep = (v, n, size) => (v + n <= 0 || v >= size ? Math.max(0, Math.min(v, size - n)) : v); // same spot even when a turned piece sticks out past the edge; pulled in only if it would be fully outside
    float = { x: keep(bx, c.w, W), y: keep(by, c.h, H), w: c.w, h: c.h, d: new Uint8ClampedArray(c.d) };
    setSel(null); if (!isSel()) tool = 'rect'; syncUi(); paint(); cv.focus();
  }
  function dupe() { float = grab(sel); setSel(null); } // owner set 248: selecting is for copying — dragging pulls out a copy, the original stays
  function commitFloat() { // place the floating piece; its transparent pixels keep what is underneath (owner B1)
    if (!float) return;
    const f = float; float = null; fdrag = null;
    if (layers && f.into != null) { act = f.into; data = layers[act].data; } // a lifted layer/selection goes back into its own layer (lift already saved the undo step)
    else {
      snapshot();
      if (layers) { layers.splice(act + 1, 0, { name: `ชิ้น ${++lyrN}`, data: new ImageData(W, H), vis: true }); act++; data = layers[act].data; } // owner set 253: a placed piece = a new layer above the chosen one
    }
    for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
      const o = (y * f.w + x) * 4, tx = f.x + x, ty = f.y + y;
      if (f.d[o + 3] === 0 || tx < 0 || ty < 0 || tx >= W || ty >= H) continue;
      setPx(tx, ty, [f.d[o], f.d[o + 1], f.d[o + 2], f.d[o + 3]]);
    }
    dirty = true; palette(); syncUi(); paint();
  }
  function cancelFloat() { if (!float) return; const f = float; float = null; fdrag = null; if (f.restore) { data.data.set(f.restore); undoS.pop(); } syncUi(); paint(); } // a pasted piece never touched the picture; a lifted one is put back
  function flipFloat(hz) {
    if (!float) return; const f = float, d = new Uint8ClampedArray(f.d.length);
    for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) { const sx = hz ? f.w - 1 - x : x, sy = hz ? y : f.h - 1 - y; d.set(f.d.subarray((sy * f.w + sx) * 4, (sy * f.w + sx) * 4 + 4), (y * f.w + x) * 4); }
    f.d = d; f.base = null; f.deg = 0; syncUi(); paint(); // a flip starts a fresh turn from this look
  }
  // ---- layers + edit menu on the real picture (owner set 253) ----
  function lift() { // the selection (or the whole chosen layer) floats so it can be moved / turned / flipped; Enter puts it back into the same layer
    if (!layers || float) return !!float;
    let m = sel;
    if (!m) { m = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) if (data.data[i * 4 + 3]) m[i] = 1; }
    if (!m.some((v) => v)) { toast('เลเยอร์นี้ว่าง ไม่มีอะไรให้ย้าย/หมุน'); return false; }
    snapshot(); const restoreD = new Uint8ClampedArray(data.data), g = grab(m);
    for (let i = 0; i < W * H; i++) if (m[i]) data.data.fill(0, i * 4, i * 4 + 4);
    float = { ...g, into: act, restore: restoreD }; dirty = true; setSel(null); if (!isSel()) tool = 'rect';
    syncUi(); paint(); cv.focus(); return true;
  }
  function rotF(deg) { // turn the floating piece around its middle; every angle is drawn from the look when turning started
    if (!float && !lift()) return;
    const f = float;
    deg = ((Math.round(deg) + 540) % 360) - 180; if (deg === -180) deg = 180;
    if (!f.base) { f.base = new ImageData(new Uint8ClampedArray(f.d), f.w, f.h); f.deg = 0; f.cx = f.x + f.w / 2; f.cy = f.y + f.h / 2; } // turning centre fixed when turning starts (recomputing it from the rounded box made the piece creep)
    const cx = f.cx, cy = f.cy, b = f.base;
    const r2 = deg ? rotImg(b, mirX ? -deg : deg) : b;
    f.d = new Uint8ClampedArray(r2.data); f.w = r2.width; f.h = r2.height; f.x = Math.round(cx - f.w / 2); f.y = Math.round(cy - f.h / 2); f.deg = deg;
    syncUi(); paint();
  }
  function moveF(nx, ny) { const f = float; if (f.cx != null) { f.cx += nx - f.x; f.cy += ny - f.y; } f.x = nx; f.y = ny; } // the turning centre moves with the piece
  function flipM(hz) { if (!float && !lift()) return; flipFloat(hz); }
  function chooseLayer(i) { if (!layers || i === act) return; commitFloat(); setSel(null); act = i; data = layers[i].data; syncUi(); paint(); cv.focus(); }
  function layerOp(k, i = act) {
    if (!layers) return; commitFloat(); setSel(null);
    if (k === 'del' && layers.length < 2) { toast('ต้องเหลืออย่างน้อย 1 เลเยอร์'); return; }
    if (k === 'merge' && i === 0) { toast('เลเยอร์ล่างสุด รวมลงไม่ได้'); return; }
    if ((k === 'up' && i === layers.length - 1) || (k === 'down' && i === 0)) return;
    snapshot();
    if (k === 'vis') layers[i].vis = !layers[i].vis;
    else if (k === 'up' || k === 'down') { const j = k === 'up' ? i + 1 : i - 1; [layers[i], layers[j]] = [layers[j], layers[i]]; act = j; }
    else if (k === 'merge') { layers[i - 1].data = composeL([layers[i - 1], { ...layers[i], vis: true }], false); layers.splice(i, 1); act = i - 1; }
    else if (k === 'del') { layers.splice(i, 1); if (i < act) act--; act = Math.max(0, Math.min(act, layers.length - 1)); }
    data = layers[act].data; dirty = true; palette(); syncUi(); paint();
  }
  function thumb(d) { // small look of one layer so pieces can be told apart (owner set 253 design pass)
    const t = h('canvas', { class: 'pxed-thumb' }), k = Math.min(40 / d.width, 28 / d.height);
    t.width = Math.max(1, Math.round(d.width * k)); t.height = Math.max(1, Math.round(d.height * k));
    const tc = document.createElement('canvas'); tc.width = d.width; tc.height = d.height; tc.getContext('2d').putImageData(d, 0, 0);
    const g = t.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(tc, 0, 0, t.width, t.height);
    if (mirX) t.classList.add('flipx'); return t;
  }
  function renderLayers() {
    lyrList.replaceChildren(...layers.map((l, i) => [l, i]).reverse().map(([l, i]) => h('div', { class: 'pxed-lyr' + (i === act ? ' on' : '') + (l.vis ? '' : ' off') },
      h('button', { class: 'ghost pxed-eye', title: l.vis ? 'ซ่อนเลเยอร์นี้' : 'แสดงเลเยอร์นี้', 'aria-pressed': String(l.vis), 'aria-label': (l.vis ? 'ซ่อน ' : 'แสดง ') + l.name, onclick: () => layerOp('vis', i) }, h('i', { class: 'pxed-eyemark' })),
      h('button', { class: 'pxed-lname', 'aria-pressed': String(i === act), onclick: () => chooseLayer(i) }, thumb(l.data), h('span', {}, l.name + (l.vis ? '' : ' (ซ่อน)'))))));
    lyrUp.disabled = act === layers.length - 1; lyrDown.disabled = act === 0; lyrMerge.disabled = act === 0; lyrDel.disabled = layers.length < 2;
  }
  function cap() { return layers ? { L: layers.map((l) => ({ ...l, data: cloneI(l.data) })), act } : cloneI(data); }
  function restore(st) { if (st.L) { layers = st.L; act = st.act; data = layers[act].data; } else setData(st); }
  function snapshot() { rot = null; undoS.push(cap()); if (undoS.length > 100) undoS.shift(); redoS.length = 0; }
  function undo() { if (float) { cancelFloat(); return; } if (!undoS.length) return; redoS.push(cap()); restore(undoS.pop()); if (cur === 'piece') rotReset(); dirty = true; palette(); syncUi(); paint(); }
  function redo() { if (float) commitFloat(); if (!redoS.length) return; undoS.push(cap()); restore(redoS.pop()); if (cur === 'piece') rotReset(); dirty = true; palette(); syncUi(); paint(); }
  function pick(p, quiet) { const v = compose().data, i = px(...p); if (v[i + 3] === 0) { if (!quiet) toast('เม็ดนี้โปร่งใส ไม่มีสีให้ดูด'); return; } setColour([v[i], v[i + 1], v[i + 2], 255]); } // what you see (all visible layers)
  cv.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (Date.now() - lastDown < 400) return; // a real right press was already handled
    const p = at(e); if (!p) return;
    if (isSel() || float) return; // right button deselects in the select tools (pointerdown)
    if (picking) { pick(p); return; }
    const c = swapBtn ? colour : [0, 0, 0, 0]; // a lone context menu = right button = erase (paint when swapped)
    snapshot(); if (swapBtn && tool === 'fill') fill(p[0], p[1], c); else setPx(p[0], p[1], c);
    dirty = true; palette(); syncUi(); paint();
  });
  cv.addEventListener('pointerdown', (e) => {
    const p = at(e); if (!p) return;
    e.preventDefault(); cv.focus(); lastDown = Date.now();
    if (picking) { pick(p); return; }
    if (float) {
      const inF = p[0] >= float.x && p[0] < float.x + float.w && p[1] >= float.y && p[1] < float.y + float.h;
      if (inF && e.button === 0) { fdrag = { p, x0: float.x, y0: float.y }; cv.setPointerCapture(e.pointerId); return; }
      commitFloat(); return; // a click outside places it
    }
    if (isSel()) {
      if (e.button === 2) { setSel(null); paint(); return; }
      if (e.button !== 0) return;
      if (sel && sel[p[1] * W + p[0]] && !e.shiftKey) { dupe(); fdrag = { p, x0: float.x, y0: float.y }; cv.setPointerCapture(e.pointerId); syncUi(); paint(); return; } // drag inside the selection = drag out a copy
      if (tool === 'rect') rectD = { a: p, b: p, add: e.shiftKey }; else lassoD = { pts: [p], add: e.shiftKey };
      cv.setPointerCapture(e.pointerId); paint(); return;
    }
    if (e.button !== 0 && e.button !== 2) return;
    const erase = (e.button === 2) !== swapBtn, c = erase ? [0, 0, 0, 0] : colour;
    snapshot();
    if (!erase && tool === 'fill') { fill(p[0], p[1], c); dirty = true; palette(); syncUi(); paint(); return; }
    stroke = { c, last: p }; setPx(p[0], p[1], c); dirty = true;
    cv.setPointerCapture(e.pointerId); syncUi(); paint();
  });
  cv.addEventListener('pointermove', (e) => {
    const p = at(e); hover = p; posEl.textContent = p ? `x ${p[0]}, y ${p[1]}` : '';
    if (picking && p) pick(p, true); // Space held: the colour under the pointer is taken right away (owner: no click needed)
    if (stroke && p) { line(stroke.last, p, stroke.c); stroke.last = p; }
    if (fdrag && float) { const q = atC(e); moveF(fdrag.x0 + q[0] - fdrag.p[0], fdrag.y0 + q[1] - fdrag.p[1]); }
    if (rectD) rectD.b = atC(e);
    if (lassoD) { const q = atC(e), l = lassoD.pts[lassoD.pts.length - 1]; if (q[0] !== l[0] || q[1] !== l[1]) lassoD.pts.push(q); }
    paint();
  });
  const endStroke = () => {
    if (stroke) { stroke = null; palette(); syncUi(); }
    fdrag = null;
    if (rectD) { const d = rectD; rectD = null; setSel(d.a[0] === d.b[0] && d.a[1] === d.b[1] && !d.add ? null : rectMask(d.a, d.b, d.add)); paint(); } // a click = deselect
    if (lassoD) { const d = lassoD; lassoD = null; setSel(d.pts.length > 2 ? lassoMask(d.pts, d.add) : d.add ? sel : null); paint(); }
  };
  cv.addEventListener('pointerup', endStroke); cv.addEventListener('pointercancel', endStroke);
  cv.addEventListener('pointerleave', () => { hover = null; posEl.textContent = ''; paint(); });
  function onKey(e) {
    // Esc handled here: Chrome lets a dialog's cancel event block Esc only once per click, so a 2nd Esc would close the editor (and skip the unsaved-work question)
    if (e.type === 'keydown' && e.code === 'Escape') { onCancel(e); return; }
    if (e.target.closest?.('input, select, textarea')) return;
    if (e.code === 'Space') { e.preventDefault(); if (e.type === 'keydown' && !picking) { picking = true; if (hover) pick(hover, true); syncUi(); paint(); } if (e.type === 'keyup') { picking = false; syncUi(); paint(); } return; }
    if (e.type !== 'keydown') return;
    const k = e.code; // physical key: a Thai keyboard layout types ผ / ั on Z / Y
    const mod = e.ctrlKey || e.metaKey;
    if (mod && k === 'KeyZ' && !e.shiftKey) { e.preventDefault(); undo(); }
    else if (mod && (k === 'KeyY' || (k === 'KeyZ' && e.shiftKey))) { e.preventDefault(); redo(); }
    else if (mod && k === 'KeyC') { e.preventDefault(); copySel(); }
    else if (mod && k === 'KeyX') { e.preventDefault(); cutSel(); }
    else if (mod && k === 'KeyV') { e.preventDefault(); paste(); }
    else if (mod && k === 'KeyA') { e.preventDefault(); commitFloat(); if (!isSel()) tool = 'rect'; setSel(new Uint8Array(W * H).fill(1)); paint(); }
    else if ((k === 'Delete' || k === 'Backspace') && !float && sel) { e.preventDefault(); delSel(); }
    else if ((k === 'Enter' || k === 'NumpadEnter') && float) { e.preventDefault(); commitFloat(); }
    else if ((k === 'Enter' || k === 'NumpadEnter') && cur === 'piece') { e.preventDefault(); sendPiece(); }
    else if (float && k.startsWith('Arrow')) { e.preventDefault(); const n = e.shiftKey ? 10 : 1, d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[k]; moveF(float.x + d[0] * n * (mirX ? -1 : 1), float.y + d[1] * n); paint(); }
  }
  const offPick = () => { if (picking) { picking = false; syncUi(); paint(); } };
  document.addEventListener('keydown', onKey); document.addEventListener('keyup', onKey); window.addEventListener('blur', offPick);
  const dlg = $('dlg');
  function cleanup() { document.removeEventListener('keydown', onKey); document.removeEventListener('keyup', onKey); window.removeEventListener('blur', offPick); dlg.classList.remove('pxed-dlg'); dlg.removeEventListener('cancel', onCancel); }
  function close(force) { if (!force && mainDirty() && !confirm('ยังไม่ได้บันทึก ปิดแล้วงานที่แก้จะหาย ปิดเลยไหม')) return; cleanup(); dlg.close(); }
  function onCancel(e) { e.preventDefault(); if (float) { cancelFloat(); return; } if (sel) { setSel(null); paint(); return; } if (cur === 'piece') { switchTo('main'); return; } close(); } // Esc: drop the floating piece, then the selection, then leave the piece tab, then close (asks when there are changes)
  async function saveEdit() {
    saveB.disabled = true;
    switchTo('main'); // the piece tab is never saved by itself
    commitFloat();
    try {
      sg.putImageData(compose(), 0, 0); // visible layers merged into one picture (hidden layers are left out)
      let out = src;
      if (fr) { out = document.createElement('canvas'); out.width = img.naturalWidth; out.height = img.naturalHeight; const og = out.getContext('2d'); og.drawImage(img, 0, 0); og.clearRect(fr[0], fr[1], W, H); og.drawImage(src, fr[0], fr[1]); }
      const blob = await new Promise((ok) => out.toBlob(ok, 'image/png'));
      const q = new URLSearchParams({ item: it.id, slot: r.slot, name: (r.orig || r.slot).replace(/\.\w+$/, '') + '_edit.png' }); // newest upload = ★ used (owner: use the edit right away)
      if (it.kind === 'character') q.set('form', String(r.form || ui.form));
      if (r.slot === 'cut' && r.from) q.set('from', r.from);
      if (r.move) q.set('move', r.move);
      hub = await api('/api/upload?' + q, { method: 'POST', body: blob });
      const nr = hub.items[it.id].rounds.at(-1);
      if (nr && fr) nr.meta = { ...r.meta }; // same frames layout, ms and ไป-กลับ
      if (nr) { nr.note = (fr ? `แก้พิกเซลเฟรม ${opt.frame + 1} บนเว็บ จาก ` : 'แก้พิกเซลบนเว็บ จาก ') + fmtDate(r.t); if (r.flip) nr.flip = true; if (r.iconPad) { nr.iconPad = r.iconPad; if (r.iconOpen) nr.iconOpen = r.iconOpen; if (r.iconN) nr.iconN = r.iconN; } await save(); ui.sel = r.slot === 'cut' || r.slot === 'icon' ? ui.sel : nr.id; }
      dirty = false; toast('บันทึกแล้ว ใช้ภาพนี้แทนแล้ว (ภาพเดิมยังอยู่ในรายการ กด "ใช้รอบนี้" เพื่อกลับไปใช้)'); close(true); render();
    } catch (e) { toast('บันทึกไม่ได้: ' + e.message); saveB.disabled = false; }
  }
  function zoomTo(nz) { // keep the middle of what you were looking at in the middle
    const st = stageEl, cx = (st.scrollLeft + st.clientWidth / 2) / (st.scrollWidth || 1), cy = (st.scrollTop + st.clientHeight / 2) / (st.scrollHeight || 1);
    z = Math.max(1, Math.min(24, nz)); syncUi(); paint();
    st.scrollLeft = cx * st.scrollWidth - st.clientWidth / 2; st.scrollTop = cy * st.scrollHeight - st.clientHeight / 2;
  }
  const zoomBtns = h('span', { class: 'seg' }, h('button', { 'aria-label': 'ซูมออก', onclick: () => zoomTo(z - 1) }, '−'), h('button', { 'aria-label': 'ซูมเข้า', onclick: () => zoomTo(z + 1) }, '+'));
  $('dlgBody').replaceChildren(
    h('div', { class: 'row' }, h('h3', { style: 'margin:0' }, `แก้พิกเซล · ${it.id}${fr ? ` · เฟรม ${opt.frame + 1}/${r.meta.n}` : ''} · ${W}×${H}`), h('span', { class: 'small dim' }, 'หันตามที่เห็นในขั้นภาพนิ่ง · บันทึกเป็นรอบใหม่ ภาพเดิมยังอยู่'), h('span', { class: 'sp' }), saveB, closeB),
    h('div', { class: 'pxed' },
      h('div', { class: 'pxed-main' }, tabSeg, stageEl),
      h('div', { class: 'pxed-side' }, // wide screens: 2 columns side by side (paint | pieces); narrower: one column, painting first
        h('div', { class: 'pxed-col' }, pieceBar, modeEl,
          h('div', { class: 'lbl' }, 'เครื่องมือ'), toolSeg,
          h('div', { class: 'lbl' }, 'สีที่ใช้'), h('div', { class: 'row nowrap' }, curSw, curTxt, colIn),
          h('div', { class: 'lbl' }, 'สีในภาพ'), pal,
          h('div', { class: 'row' }, h('span', { class: 'lbl' }, 'ซูม'), zEl, zoomBtns, gridSw),
          h('div', { class: 'row' }, undoB, redoB, posEl),
          h('div', { class: 'lbl' }, 'พื้นหลัง'), bgSeg, swapSw),
        h('div', { class: 'pxed-col' },
          h('div', { class: 'lbl' }, 'ส่วนที่เลือก'), h('div', { class: 'row pxed-selrow' }, copyB, cutB, pasteB, delB, noneB), floatRow,
          editSw, editBox, lyrBox))));
  dlg.classList.add('pxed-dlg'); dlg.addEventListener('cancel', onCancel);
  palette(); { const f = pal.querySelector('.pxed-sw'); if (f) f.click(); } syncUi(); paint();
  dlg.showModal(); cv.focus();
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
    showOld && it.kind === 'character' ? h('div', { class: 'tools' }, h('button', { class: 'primary', disabled: !stl, onclick: () => { $('dlg').close(); sendCheck(it, stl); } }, 'ตรวจภาพ + เขียนพรอมต์วิดีโอ'), h('span', { class: 'small dim' }, stl ? `ภาพนิ่งร่าง ${ui.form} ${stl.star ? 'ที่ติดดาว' : 'ล่าสุด'}` : 'วางภาพนิ่งก่อน')) : null,
    showOld && it.kind === 'character' ? h('div', { class: 'tools' }, preset, h('span', { class: 'small dim' }, vid ? 'โปรแกรมทำเองทันที ไม่ต้องรอ Claude · ช่องข้อความด้านล่างไว้สำหรับงานอื่นที่ต้องให้ Claude คิด' : 'ติดดาววิดีโอในขั้น "วิดีโอ" ก่อน ปุ่มนี้จึงจะกดได้')) : null,
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
      h('div', { class: 'row nowrap' }, h('b', { class: 'ell', style: 'font-size:17px' }, `${q.item} ${it?.name || ''}`),
        h('span', { class: 'sp' }), q.state === 'open' ? null : h('span', { class: 'pill st' }, state[0])), // open cards sit under the "รอ Claude" heading already
      h('div', { class: 'small dim' }, h('span', { class: 'pill' }, taskTh(q)), ` ร่าง ${q.form || 1}${q.move ? ' · ท่า' + moveTh(q.move) : ''} · ส่งเมื่อ ${fmtDate(q.t)}`),
      q.task ? null : h('div', { style: 'white-space:pre-wrap;margin-top:4px' }, q.text),
      q.reply ? h('div', { class: 'small', style: 'margin-top:6px;white-space:pre-wrap' }, (q.by === 'auto' ? 'โปรแกรม: ' : 'Claude: ') + q.reply) : null,
      q.state === 'done' && nextTh(q) ? h('div', { class: 'small next' }, nextTh(q)) : null,
      h('div', { class: 'tools' },
        q.state === 'done' && q.task === 'check+veo' ? (q.result === 'fail' ? h('button', { class: 'primary', onclick: () => go(q, 'prompt') }, 'เปิดขั้นพรอมต์') : h('button', { class: 'primary', onclick: () => go(q, 'veoin') }, 'เปิดภาพส่ง Veo (แท็บพรอมต์)'))
          : q.state === 'done' && q.task === 'frames+shadow' ? [h('button', { class: 'primary', onclick: () => go(q, 'frames') }, 'เปิดขั้นเฟรม'), h('button', { onclick: () => go(q, 'shadow') }, 'เปิดขั้นเงา')] : h('button', { class: 'ghost', onclick: () => go(q, q.step || 'still') }, 'เปิดตัวนี้'),
        q.state === 'open' ? h('button', { class: 'ghost', onclick: () => { q.state = 'cancel'; save().then(render); } }, 'ยกเลิกงานนี้') : null));
  };
  // set 246 UI pass: what each task does is said once here, not on every card; finished / cancelled lists fold away
  const kinds = [...new Set(open.map((q) => q.task || 'other'))];
  if (open.length) m.append(h('div', { class: 'small dim qhelp' }, kinds.map((k) => h('div', {}, h('b', {}, (TASK_TH[k] || 'งานอื่น') + ': '),
    k === 'frames+shadow' ? 'แตกวิดีโอที่ติดดาวเป็น 32 เฟรม → ใส่ในขั้น "เฟรม" → วางเงาเริ่มต้น'
      : k === 'check+veo' ? 'ตรวจภาพตามกฎ → ผ่าน: ตัดพื้น + ภาพส่ง Veo + พรอมต์วิดีโอ · ไม่ผ่าน: เหตุผล + พรอมต์ Gemini รุ่นแก้' : 'Claude ทำตามข้อความในการ์ด'))));
  if (open.length) m.append(h('h3', {}, `รอ Claude (${open.length})`), h('div', { class: 'qgrid' }, open.map(card)));
  for (const [title, list, isOpen] of [['เสร็จแล้ว', done, !open.length], ['ยกเลิก', cancel, false]])
    if (list.length) m.append(h('details', { class: 'qfold', open: isOpen || undefined }, h('summary', {}, h('b', {}, `${title} (${list.length})`)), h('div', { class: 'qgrid' }, list.map(card))));
}
// ---------- team + size (owner set 246: A scene on/off · B1 free slider + pixel snaps · C1 saved per creature + Godot export · D1 our 6, any slot changeable) ----------
// Background + slot feet points come from the Godot battle test (automon-scratch g/tests/s240_cuts.gd TEAMDUMP=1, 1920×1061, our half).
// Slot k = the game's row*2+lane on our side (row 0 = next to the middle, lane 0 = back, 1 = front).
const TEAM_BG = 'hub/_team/arena_battle_noui_1920x1061.png', TEAM_BG_OLD = 'hub/_team/arena_battle_1920x1061.png', TEAM_W = 1920, TEAM_H = 1061;
const TEAM_SLOTS = [[0.3607, 0.6311], [0.3907, 0.8079], [0.2493, 0.6311], [0.2449, 0.8079], [0.1379, 0.6311], [0.0991, 0.8079]];
const TEAM_IDS = ['HL-1', 'PL-1', 'WY-1', 'PT-1', 'SF-1', 'WN-1'];
const TEAM_SNAPS = [1, 1.5, 2, 2.5, 3];
const TEAM_GRID = [[4, 2, 0], [5, 3, 1]]; // cards laid out like the screen: back row on top, left to right
// scale k = screen px per picture px in the 1920×1061 battle view (1 = the picture at its own size); pixel sprites look even at whole/half steps
const teamDefaultK = (hgt) => (hgt <= 256 ? 2 : +(180 / hgt).toFixed(3));
function teamCfg() {
  const t = hub.settings.team && typeof hub.settings.team === 'object' ? hub.settings.team : (hub.settings.team = {});
  if (!Array.isArray(t.ids) || t.ids.length !== 6) t.ids = TEAM_IDS.slice();
  if (typeof t.showBg !== 'boolean') t.showBg = true;
  return t;
}
// the picture the game will show: the cut of the starred form-1 still, else that still
function teamRound(it) { return usedPic(it, 1); } // owner set 248: the picture in use, from the still step
const teamSprCache = new Map();
function teamSprite(r) {
  if (!teamSprCache.has(r.id)) teamSprCache.set(r.id, loadImg(r.file).then((img) => {
    const c = keyed(img), p = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (p[(y * c.width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return null;
    const o = document.createElement('canvas'); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1;
    o.getContext('2d').drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height);
    return { c: o, w: img.naturalWidth, h: img.naturalHeight, x0, y0 }; // x0/y0 = where the trimmed sprite sits in the whole picture
  }).catch(() => null));
  return teamSprCache.get(r.id);
}
// set 246 UI pass: big canvas cropped to our half + one side panel for the picked creature (mini formation, size, position, feet).
// Owner picks: creatures are LOCKED to their slot (drag on the picture = swap slots); a creature can be unlocked (items[ID].free) and
// then dragged freely, even floating; slot buttons in the panel swap by drag for every creature. The feet point is the SAME value
// as the shadow tab (items[ID].shadow.feet, owner B1), so the shadow keeps matching the feet. No wheel sizing; Ctrl+Z undo.
const TEAM_CROP = { x: 0, y: 330, w: 1100, h: 731 }; // our half of the 1920×1061 battle view
const teamUndo = [], teamRedo = [];
let teamApi = null; // keyboard hooks of the open team tab
function teamSnap() {
  const t = teamCfg(), ids = new Set(t.ids.filter(Boolean));
  for (const it of Object.values(hub.items)) if (it.scale || it.offset || it.rot || it.free || it.shadow) ids.add(it.id);
  const items = {};
  for (const id of ids) { const it = hub.items[id]; if (it) items[id] = { scale: it.scale || null, offset: it.offset || null, rot: it.rot || 0, free: !!it.free, shadow: it.shadow || null }; }
  return JSON.stringify({ ids: t.ids.slice(), items });
}
function teamPush() { const s = teamSnap(); if (teamUndo[teamUndo.length - 1] !== s) teamUndo.push(s); if (teamUndo.length > 60) teamUndo.shift(); teamRedo.length = 0; }
function teamRestore(s) {
  const o = JSON.parse(s), t = teamCfg(); t.ids = o.ids;
  for (const it of Object.values(hub.items)) {
    const v = o.items[it.id];
    if (!v) { delete it.scale; delete it.offset; delete it.rot; delete it.free; continue; }
    if (v.rot) it.rot = v.rot; else delete it.rot;
    for (const key of ['scale', 'offset', 'shadow']) { if (v[key]) it[key] = v[key]; else delete it[key]; }
    if (v.free) it.free = true; else delete it.free;
  }
}
function renderTeam(m) {
  const t = teamCfg();
  if (ui.teamSel == null) ui.teamSel = 1;
  if (ui.teamWhole == null) ui.teamWhole = false;
  ui.teamFeet = false; // feet mode never survives a re-render
  const chars = Object.values(hub.items).filter((it) => it.kind === 'character');
  const crop = ui.teamWhole ? { x: 0, y: 0, w: TEAM_W, h: TEAM_H } : TEAM_CROP;
  const cv = h('canvas', { width: crop.w, height: crop.h, class: 'team-cv', tabindex: 0, 'aria-label': 'ทีมจำลอง 6 ช่องบนฉากต่อสู้ คลิกเพื่อเลือก ลากเพื่อสลับหรือย้าย' });
  const sprs = new Array(6).fill(null), boxes = new Array(6).fill(null), anchors = new Array(6).fill(null);
  let drag = null;
  let bg = null;
  const stale = (it, s) => !!(s && it?.scale && Array.isArray(it.scale.size) && (it.scale.size[0] !== s.w || it.scale.size[1] !== s.h)); // size was set on another picture
  const kOf = (it, s) => (it?.scale && typeof it.scale.k === 'number' && !stale(it, s) ? it.scale.k : teamDefaultK(s ? s.h : 180));
  const rotOf = (it) => (it?.free && Number.isFinite(it.rot) ? it.rot : 0); // degrees clockwise on screen, around the feet (owner B1/C1 set 247: unlocked only)
  const offOf = (it) => (it?.free && it.offset && typeof it.offset === 'object' ? [Number(it.offset.x) || 0, Number(it.offset.y) || 0] : [0, 0]);
  // feet from the shadow tab count only when they were set on this same picture (same round, or same pixel size)
  const feetLinked = (it, s, r) => !!(it?.shadow && Array.isArray(it.shadow.feet) && s && r && (it.shadow.round === r.id || (Array.isArray(it.shadow.size) && it.shadow.size[0] === s.w && it.shadow.size[1] === s.h)));
  const feetOther = (it, s, r) => !!(it?.shadow && Array.isArray(it.shadow.feet) && !feetLinked(it, s, r));
  const anchorOf = (it, s, r) => (feetLinked(it, s, r) ? [it.shadow.feet[0] * s.w - s.x0, it.shadow.feet[1] * s.h - s.y0] : [s.c.width / 2, s.c.height]); // picture px of the trimmed sprite, unmirrored
  const slotXY = (k) => [TEAM_SLOTS[k][0] * TEAM_W - crop.x, TEAM_SLOTS[k][1] * TEAM_H - crop.y];
  const byDepth = [0, 1, 2, 3, 4, 5].sort((a, b) => TEAM_SLOTS[a][1] - TEAM_SLOTS[b][1]); // back row first
  function place(k) { // where slot k's creature is drawn: box [x, y, w, h] + the feet point on screen
    const it = hub.items[t.ids[k]], s = sprs[k], r = teamRound(it);
    if (!s || !it || !r) return null;
    const kk = kOf(it, s), [ax, ay] = anchorOf(it, s, r), mir = mirrorOf(r);
    const w = Math.round(s.c.width * kk), hh = Math.round(s.c.height * kk);
    const [sx, sy] = slotXY(k), [ox, oy] = offOf(it), fx = sx + ox, fy = sy + oy;
    const adx = (mir ? s.c.width - ax : ax) * kk;
    return { box: [Math.round(fx - adx), Math.round(fy - ay * kk), w, hh], feet: [fx, fy], s, r, it, kk, mir };
  }
  function draw() {
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = true;
    if (t.showBg && bg) g.drawImage(bg, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);
    else {
      g.fillStyle = '#2a2d33'; g.fillRect(0, 0, crop.w, crop.h);
      g.strokeStyle = '#3d424c'; g.lineWidth = 2; g.beginPath();
      for (const yy of [0.6311, 0.8079]) { g.moveTo(0, yy * TEAM_H - crop.y); g.lineTo(crop.w, yy * TEAM_H - crop.y); }
      g.stroke();
    }
    for (let k = 0; k < 6; k++) { // slot marks: where the game puts each slot's feet
      const [x, y] = slotXY(k), on = ui.teamSel === k;
      g.save(); g.strokeStyle = on ? '#ffd34d' : 'rgba(255,255,255,0.35)'; g.lineWidth = on ? 3 : 2; g.setLineDash(on ? [] : [6, 5]);
      g.beginPath(); g.ellipse(x, y, 46, 13, 0, 0, Math.PI * 2); g.stroke(); g.restore();
      if (!hub.items[t.ids[k]]) { g.fillStyle = 'rgba(255,255,255,0.6)'; g.font = '600 22px "Leelawadee UI", sans-serif'; g.textAlign = 'center'; g.fillText(`ช่อง ${k + 1} ว่าง`, x, y - 22); }
    }
    g.imageSmoothingEnabled = false;
    const swapping = drag?.moved && drag.kind === 'swap';
    for (const k of byDepth) {
      const p = place(k);
      boxes[k] = p ? p.box : null; anchors[k] = p ? p.feet : null;
      if (!p) continue;
      if (p.it.free && (p.feet[0] !== slotXY(k)[0] || p.feet[1] !== slotXY(k)[1])) { // unlocked + moved: dotted line from the slot to the feet
        const [sx, sy] = slotXY(k); g.save(); g.strokeStyle = 'rgba(140,200,255,0.8)'; g.lineWidth = 2; g.setLineDash([4, 4]);
        g.beginPath(); g.moveTo(sx, sy); g.lineTo(p.feet[0], p.feet[1]); g.stroke(); g.restore();
      }
      if (swapping && drag.k === k) continue; // drawn under the pointer below
      g.save(); turn(g, p); paint(g, p.s, p.r, ...p.box); g.restore();
    }
    const b = boxes[ui.teamSel];
    if (b && !swapping) {
      const free = hub.items[t.ids[ui.teamSel]]?.free;
      g.save(); const ps = place(ui.teamSel); if (ps) turn(g, ps); g.strokeStyle = free ? '#8cc8ff' : '#ffd34d'; g.lineWidth = 3; g.setLineDash([10, 6]); g.strokeRect(b[0] - 5, b[1] - 5, b[2] + 10, b[3] + 10); g.restore();
    }
    if (ui.teamFeet && anchors[ui.teamSel]) { // feet mode: a cross where the feet meet the ground
      const [x, y] = anchors[ui.teamSel];
      g.save(); g.strokeStyle = '#000'; g.lineWidth = 5;
      for (const c of ['#000', '#ff5ad1']) { g.strokeStyle = c; g.lineWidth = c === '#000' ? 5 : 2; g.beginPath(); g.moveTo(x - 22, y); g.lineTo(x + 22, y); g.moveTo(x, y - 22); g.lineTo(x, y + 22); g.stroke(); }
      g.restore();
    }
    if (swapping && boxes[drag.k]) { // the dragged creature follows the pointer; the slot it would land on lights up
      const tk = dropSlot();
      if (tk != null && tk !== drag.k) {
        const [tx, ty] = slotXY(tk); g.save(); g.fillStyle = 'rgba(255,211,77,0.25)'; g.strokeStyle = '#ffd34d'; g.lineWidth = 4;
        g.beginPath(); g.ellipse(tx, ty, 60, 18, 0, 0, Math.PI * 2); g.fill(); g.stroke();
        g.fillStyle = '#ffd34d'; g.font = '600 22px "Leelawadee UI", sans-serif'; g.textAlign = 'center';
        g.fillText(hub.items[t.ids[tk]] ? `สลับกับช่อง ${tk + 1}` : `ย้ายไปช่อง ${tk + 1}`, tx, ty + 44); g.restore();
      }
      const [x, y, w, hh] = boxes[drag.k], it = hub.items[t.ids[drag.k]];
      g.save(); g.globalAlpha = 0.85; paint(g, sprs[drag.k], teamRound(it), Math.round(x + drag.cur[0] - drag.p0[0]), Math.round(y + drag.cur[1] - drag.p0[1]), w, hh); g.restore();
    }
  }
  function turn(g, p) { const a = rotOf(p.it); if (!a) return; g.translate(p.feet[0], p.feet[1]); g.rotate(a * Math.PI / 180); g.translate(-p.feet[0], -p.feet[1]); }
  function paint(g, s, r, x, y, w, hh) {
    g.save();
    if (mirrorOf(r)) { g.translate(x + w, y); g.scale(-1, 1); g.drawImage(s.c, 0, 0, w, hh); } // turned the way the still step shows it (owner set 248)
    else g.drawImage(s.c, x, y, w, hh);
    g.restore();
  }
  function dropSlot() { // nearest slot to where the dragged creature's feet are now (within reach)
    const [fx, fy] = anchors[drag.k] || slotXY(drag.k), px = fx + drag.cur[0] - drag.p0[0], py = fy + drag.cur[1] - drag.p0[1];
    let best = null, bd = 170;
    for (let k = 0; k < 6; k++) { const [x, y] = slotXY(k), d = Math.hypot(x - px, (y - py) * 1.6); if (d < bd) { bd = d; best = k; } }
    return best;
  }
  const toCv = (e) => { const rc = cv.getBoundingClientRect(); return [(e.clientX - rc.left) * crop.w / rc.width, (e.clientY - rc.top) * crop.h / rc.height]; };
  const hit = (e) => {
    const [x, y] = toCv(e);
    return byDepth.slice().reverse().find((k) => boxes[k] && x >= boxes[k][0] && x <= boxes[k][0] + boxes[k][2] && y >= boxes[k][1] && y <= boxes[k][1] + boxes[k][3]);
  };
  function pickSlot(k) { if (ui.teamSel !== k) ui.teamFeet = false; ui.teamSel = k; sync(); draw(); }
  function swapSlots(a, b) {
    if (a === b) return;
    change(() => { [t.ids[a], t.ids[b]] = [t.ids[b], t.ids[a]]; [sprs[a], sprs[b]] = [sprs[b], sprs[a]]; ui.teamSel = b; ui.teamFeet = false; });
    toast(hub.items[t.ids[a]] ? `สลับช่อง ${a + 1} กับช่อง ${b + 1} แล้ว` : `ย้ายไปช่อง ${b + 1} แล้ว`);
  }
  // feet point (shared with the shadow tab): stored as fractions of the whole picture, like the shadow editor
  function setFeet(it, s, r, ax, ay) {
    const fx = +Math.min(1, Math.max(0, (ax + s.x0) / s.w)).toFixed(4), fy = +Math.min(1, Math.max(0, (ay + s.y0) / s.h)).toFixed(4);
    const base = it.shadow ? JSON.parse(JSON.stringify(it.shadow)) : JSON.parse(JSON.stringify(SHADOW_DEFAULT));
    if (base.round !== r.id) delete base.frames;
    it.shadow = { ...base, feet: [fx, fy], size: [s.w, s.h], round: r.id };
  }
  cv.addEventListener('pointerdown', (e) => {
    const k = hit(e); if (k == null) return;
    e.preventDefault(); cv.focus();
    const it = hub.items[t.ids[k]];
    if (ui.teamFeet && k !== ui.teamSel) ui.teamFeet = false;
    const kind = ui.teamFeet ? 'feet' : it?.free ? 'move' : 'swap';
    const p = place(k);
    drag = { k, it, kind, c0: [e.clientX, e.clientY], p0: toCv(e), cur: toCv(e), moved: false, o0: offOf(it), a0: p ? anchorOf(it, p.s, p.r) : null, p };
    cv.setPointerCapture(e.pointerId); cv.classList.add('grabbing'); pickSlot(k);
  });
  cv.addEventListener('pointermove', (e) => {
    if (!drag) { cv.classList.toggle('over', hit(e) != null); return; }
    if (!drag.it) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.c0[0], e.clientY - drag.c0[1]) < 6) return; // a click is not a move
    if (!drag.moved && drag.kind !== 'swap') teamPush();
    drag.moved = true; drag.cur = toCv(e);
    const dx = drag.cur[0] - drag.p0[0], dy = drag.cur[1] - drag.p0[1];
    if (drag.kind === 'move') drag.it.offset = { x: Math.max(-400, Math.min(400, Math.round(drag.o0[0] + dx))), y: Math.max(-300, Math.min(300, Math.round(drag.o0[1] + dy))) };
    if (drag.kind === 'feet' && drag.p) { // the picture follows the pointer, the feet cross stays on the ground
      const { s, r, kk, mir } = drag.p;
      setFeet(drag.it, s, r, drag.a0[0] - (mir ? -dx : dx) / kk, drag.a0[1] - dy / kk);
    }
    if (drag.kind === 'swap') draw(); else { sync(); draw(); }
  });
  const endDrag = () => {
    const d = drag; if (!d) return;
    const tk = d.kind === 'swap' && d.moved ? dropSlot() : null; // reads the drag still in progress
    drag = null; cv.classList.remove('grabbing');
    if (d.kind === 'swap') { if (tk != null && tk !== d.k) swapSlots(d.k, tk); else draw(); return; }
    if (d.moved) saveSoon();
    sync(); draw();
  };
  cv.addEventListener('pointerup', endDrag); cv.addEventListener('pointercancel', endDrag);
  // ---- changes (all go through here: undo snapshot, redraw, save) ----
  let lastPush = 0;
  function change(fn, coalesce) { const now = Date.now(); if (!coalesce || now - lastPush > 800) teamPush(); lastPush = now; fn(); sync(); draw(); saveSoon(); }
  const cur = () => hub.items[t.ids[ui.teamSel]];
  function setK(v, coalesce) {
    const it = cur(), s = sprs[ui.teamSel], r = teamRound(it); if (!it || !s) return;
    change(() => { it.scale = { k: +Math.min(8, Math.max(0.05, v)).toFixed(3), size: [s.w, s.h], round: r.id }; }, coalesce);
  }
  function nudge(dx, dy) { // arrows: feet mode = move the picture 1 picture px; unlocked = move 1 screen px
    const it = cur(), p = place(ui.teamSel); if (!it || !p) return false;
    if (ui.teamFeet) { const [ax, ay] = anchorOf(it, p.s, p.r); change(() => setFeet(it, p.s, p.r, ax - (p.mir ? -dx : dx), ay - dy), true); return true; }
    if (!it.free) return false;
    const [ox, oy] = offOf(it);
    change(() => { it.offset = { x: Math.max(-400, Math.min(400, ox + dx)), y: Math.max(-300, Math.min(300, oy + dy)) }; }, true);
    return true;
  }
  function after(msg) { Promise.all([0, 1, 2, 3, 4, 5].map(loadSlot)).then(() => { sync(); draw(); }); sync(); saveSoon(); toast(msg); }
  function undo() { if (!teamUndo.length) { toast('ไม่มีอะไรให้ย้อนกลับ'); return; } teamRedo.push(teamSnap()); teamRestore(teamUndo.pop()); after('ย้อนกลับแล้ว'); }
  function redo() { if (!teamRedo.length) { toast('ไม่มีอะไรให้ทำซ้ำ'); return; } teamUndo.push(teamSnap()); teamRestore(teamRedo.pop()); after('ทำซ้ำแล้ว'); }
  teamApi = { undo, redo, nudge, rotate: (d) => rotate(d) }; // rotate is defined with the panel below
  // ---- side panel ----
  const formation = h('div', { class: 'formation', role: 'group', 'aria-label': 'เลือกช่อง ลากปุ่มไปวางบนปุ่มอื่นเพื่อสลับ' });
  const slotBtns = [];
  for (const [ri, row] of TEAM_GRID.entries()) {
    formation.append(h('span', { class: 'frow' }, ri ? 'แถวหน้า' : 'แถวหลัง'));
    for (const k of row) {
      const b = h('button', { class: 'fslot', draggable: 'true', title: 'คลิกเพื่อเลือก · ลากไปวางบนช่องอื่นเพื่อสลับ', onclick: () => pickSlot(k) });
      b.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', String(k)); e.dataTransfer.effectAllowed = 'move'; b.classList.add('dragging'); });
      b.addEventListener('dragend', () => { b.classList.remove('dragging'); slotBtns.forEach((x) => x.classList.remove('dropto')); });
      b.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; b.classList.add('dropto'); });
      b.addEventListener('dragleave', () => b.classList.remove('dropto'));
      b.addEventListener('drop', (e) => { e.preventDefault(); b.classList.remove('dropto'); const a = Number(e.dataTransfer.getData('text/plain')); if (Number.isInteger(a) && a >= 0 && a < 6) swapSlots(a, k); });
      slotBtns[k] = b; formation.append(b);
    }
  }
  formation.append(h('span', {}), h('span', { class: 'small faint toward' }, 'ลากปุ่มเพื่อสลับช่อง · ศัตรูอยู่ทางขวา →'));
  const nameEl = h('div', { class: 'insp-name' });
  const sel = h('select', { 'aria-label': 'เปลี่ยนตัวละครในช่องนี้', onchange: (e) => { const k = ui.teamSel; ui.teamFeet = false; change(() => { t.ids[k] = e.target.value; sprs[k] = null; }); loadSlot(k).then(() => { sync(); draw(); }); } },
    h('option', { value: '' }, '— ว่าง —'), chars.map((it) => h('option', { value: it.id }, `${it.id} ${it.name || ''}`)));
  const kVal = h('b', { class: 'kval' }), kInfo = h('div', { class: 'small dim' }), kWarn = h('div', { class: 'small warn' });
  const range = h('input', { type: 'range', min: 0.25, max: 4, step: 0.01, 'aria-label': 'ขนาด', oninput: (e) => setK(Number(e.target.value), true) });
  const snaps = TEAM_SNAPS.map((v) => [v, h('button', { onclick: () => setK(v) }, `${v}×`)]);
  const step = (d) => { const it = cur(); setK(+(kOf(it, sprs[ui.teamSel]) + d).toFixed(2), true); };
  const undoBtn = h('button', { onclick: () => undo(), title: 'Ctrl+Z' }, 'ย้อนกลับ'), redoBtn = h('button', { onclick: () => redo(), title: 'Ctrl+Y' }, 'ทำซ้ำ');
  const resetK = h('button', { class: 'ghost', onclick: () => { const it = cur(); if (it?.scale) change(() => { delete it.scale; }); } }, 'คืนขนาดเริ่มต้น');
  // position: lock switch (on = locked to the slot centre)
  const lockSw = h('button', { class: 'switch', role: 'switch', onclick: () => { const it = cur(); if (!it) return; change(() => { if (it.free) { delete it.free; delete it.offset; delete it.rot; } else it.free = true; }); } }, h('span', { class: 'knob' }), 'ล็อคตำแหน่ง'); // lock = back to the slot centre, upright (owner A1 set 247; Ctrl+Z brings it back)
  const posInfo = h('div', { class: 'small dim' });
  const pad = h('div', { class: 'pad' },
    h('span', {}), h('button', { 'aria-label': 'ขยับขึ้น', onclick: () => nudge(0, -1) }, '↑'), h('span', {}),
    h('button', { 'aria-label': 'ขยับไปทางหลัง', onclick: () => nudge(-1, 0) }, '←'), h('button', { 'aria-label': 'ขยับลง', onclick: () => nudge(0, 1) }, '↓'), h('button', { 'aria-label': 'ขยับไปทางหน้า', onclick: () => nudge(1, 0) }, '→'));
  const resetO = h('button', { class: 'ghost', onclick: () => { const it = cur(); if (it?.offset) change(() => { delete it.offset; }); } }, 'กลับกลางช่อง');
  function setRot(v, coalesce) { const it = cur(); if (!it?.free) return false; let a = Math.round(v); a = ((a + 180) % 360 + 360) % 360 - 180; change(() => { if (a) it.rot = a; else delete it.rot; }, coalesce); return true; }
  const rotate = (d) => setRot(rotOf(cur()) + d, true);
  const rotVal = h('b', { class: 'kval' });
  const rotRange = h('input', { type: 'range', min: -180, max: 180, step: 1, 'aria-label': 'องศาการหมุน', oninput: (e) => setRot(Number(e.target.value), true) });
  const rotL = h('button', { class: 'pm', title: 'หมุนทวนเข็ม 1° (Q · Shift = 15°)', 'aria-label': 'หมุนทวนเข็ม', onclick: (e) => rotate(e.shiftKey ? -15 : -1) }, '⟲');
  const rotR = h('button', { class: 'pm', title: 'หมุนตามเข็ม 1° (E · Shift = 15°)', 'aria-label': 'หมุนตามเข็ม', onclick: (e) => rotate(e.shiftKey ? 15 : 1) }, '⟳');
  const rotReset = h('button', { class: 'ghost', onclick: () => setRot(0) }, 'กลับ 0°');
  const freeBox = h('div', { class: 'freebox' }, h('div', { class: 'row nowrap' }, pad, posInfo), resetO,
    h('div', { class: 'row' }, h('span', { class: 'lbl' }, 'หมุน'), h('span', { class: 'sp' }), rotVal),
    h('div', { class: 'row nowrap' }, rotL, rotRange, rotR), h('div', { class: 'row' }, h('span', { class: 'small dim' }, 'หมุนรอบจุดเท้า · Q / E ทีละ 1° · Shift = 15°'), h('span', { class: 'sp' }), rotReset));
  // feet point
  const feetBtn = h('button', { onclick: () => {
    const it = cur(), p = place(ui.teamSel); if (!it || !p) return;
    if (!ui.teamFeet && feetOther(it, p.s, p.r) && !confirm('จุดเท้าในแท็บเงาของตัวนี้ตั้งไว้กับภาพอื่น (เช่นเฟรม) ถ้าปรับที่นี่ เงาจะเปลี่ยนไปใช้ภาพนิ่งนี้แทน ทำต่อไหม')) return;
    ui.teamFeet = !ui.teamFeet; sync(); draw(); cv.focus();
  } }, 'ปรับจุดเท้า');
  const feetInfo = h('div', { class: 'small dim' });
  const feetReset = h('button', { class: 'ghost', onclick: () => {
    const it = cur(), p = place(ui.teamSel); if (!it || !p) return;
    const g = guessFeet(p.s.c); change(() => setFeet(it, p.s, p.r, g[0] * p.s.c.width, g[1] * p.s.c.height));
  } }, 'หาจุดเท้าอัตโนมัติ');
  const body = h('div', { class: 'insp-body' },
    h('div', { class: 'insp-sec' }, h('div', { class: 'lbl' }, 'ตัวละครในช่องนี้'), sel),
    h('div', { class: 'insp-sec' }, h('div', { class: 'row' }, h('span', { class: 'lbl' }, 'ขนาด'), h('span', { class: 'sp' }), kVal),
      h('div', { class: 'row nowrap' }, h('button', { class: 'pm', 'aria-label': 'เล็กลง', onclick: () => step(-0.05) }, '−'), range, h('button', { class: 'pm', 'aria-label': 'ใหญ่ขึ้น', onclick: () => step(0.05) }, '+')),
      h('div', { class: 'seg snaps' }, snaps.map((x) => x[1])), kInfo, kWarn, resetK),
    h('div', { class: 'insp-sec' }, h('div', { class: 'row' }, h('span', { class: 'lbl' }, 'ตำแหน่ง'), h('span', { class: 'sp' }), lockSw), freeBox, h('div', { class: 'small dim lockinfo' })),
    h('div', { class: 'insp-sec' }, h('div', { class: 'row' }, h('span', { class: 'lbl' }, 'จุดเท้า'), h('span', { class: 'sp' }), feetBtn), feetInfo, feetReset));
  const lockInfo = body.querySelector('.lockinfo');
  const panel = h('aside', { class: 'panel insp' }, formation, nameEl, body);
  function sync() {
    const k = ui.teamSel, it = cur(), s = sprs[k], r = teamRound(it);
    slotBtns.forEach((b, j) => {
      const x = hub.items[t.ids[j]]; b.classList.toggle('on', j === k); b.setAttribute('aria-pressed', String(j === k));
      b.replaceChildren(...[h('span', { class: 'n' }, String(j + 1)), x ? h('b', {}, x.id) : h('span', { class: 'faint' }, 'ว่าง'), x?.free ? h('span', { class: 'freetag', title: 'ปลดล็อคตำแหน่งอยู่' }, 'อิสระ') : null].filter(Boolean));
      const sp = sprs[j]; if (sp) { const c = document.createElement('canvas'); c.width = sp.c.width; c.height = sp.c.height; const g = c.getContext('2d'); if (mirrorOf(teamRound(x))) { g.translate(c.width, 0); g.scale(-1, 1); } g.drawImage(sp.c, 0, 0); c.className = 'fthumb'; c.draggable = false; b.prepend(c); }
    });
    nameEl.textContent = it ? `ช่อง ${k + 1} · ${it.id} ${it.name || ''}` : `ช่อง ${k + 1} · ว่าง`;
    sel.value = t.ids[k] || '';
    const kk = kOf(it, s), [ox, oy] = offOf(it);
    for (const el of [range, ...snaps.map((x) => x[1]), resetK, lockSw, feetBtn, feetReset, ...body.querySelectorAll('.pm')]) el.disabled = !s;
    range.value = String(kk); kVal.textContent = s ? `×${kk.toFixed(2)}` : '—';
    kInfo.textContent = !it ? 'เลือกตัวละครจากเมนูด้านบน' : !s ? 'ตัวนี้ยังไม่มีภาพนิ่ง วางภาพในหน้าตัวละครก่อน' : `สูง ${Math.round(s.c.height * kk)} px บนจอ · 1× 2× 3× = พิกเซลเท่ากันทุกเม็ด${it.scale ? '' : ' · ยังเป็นขนาดเริ่มต้น'}`;
    kWarn.textContent = stale(it, s) ? `ขนาดที่ตั้งไว้ (×${it.scale.k}) เป็นของภาพเก่า ${it.scale.size[0]}×${it.scale.size[1]} ตอนนี้ใช้ขนาดเริ่มต้นแทน ปรับใหม่ได้เลย` : '';
    snaps.forEach(([v, bt]) => { const on = !!s && Math.abs(kk - v) < 0.005; bt.classList.toggle('on', on); bt.setAttribute('aria-pressed', String(on)); });
    resetK.disabled = !s || !it.scale;
    const locked = !it?.free;
    lockSw.classList.toggle('is-on', !!s && locked); lockSw.setAttribute('aria-checked', String(!!s && locked));
    freeBox.hidden = !s || locked;
    lockInfo.textContent = !s ? '' : locked ? 'ยืนกลางช่อง · ลากตัวบนภาพไปวางช่องอื่นเพื่อสลับ' : 'ปลดล็อคแล้ว · ลากตัวบนภาพเพื่อขยับหรือให้ลอย · สลับช่องให้ลากปุ่มช่องด้านบน';
    posInfo.textContent = !s ? '' : ox || oy ? `${ox ? `${ox > 0 ? 'ไปหน้า' : 'ไปหลัง'} ${Math.abs(ox)}` : ''}${ox && oy ? ' · ' : ''}${oy ? `${oy > 0 ? 'ลง' : 'ลอยขึ้น'} ${Math.abs(oy)}` : ''} px` : 'กลางช่อง';
    resetO.disabled = !s || !it.offset;
    const ra = rotOf(it); rotRange.value = String(ra); rotVal.textContent = `${ra}°`; rotReset.disabled = !s || !ra;
    feetBtn.classList.toggle('on', ui.teamFeet); feetBtn.setAttribute('aria-pressed', String(!!ui.teamFeet));
    feetBtn.textContent = ui.teamFeet ? 'เสร็จ' : 'ปรับจุดเท้า';
    feetInfo.textContent = !s ? '' : ui.teamFeet ? 'ลากตัวละครให้เท้าแตะกากบาทชมพู · ปุ่มลูกศรขยับทีละ 1 เม็ด · ใช้ค่าเดียวกับแท็บเงา'
      : feetLinked(it, s, r) ? `ใช้จุดเท้าเดียวกับแท็บเงา (${it.shadow.feet.map((v) => Math.round(v * 100) + '%').join(', ')})`
        : feetOther(it, s, r) ? 'แท็บเงาตั้งจุดเท้าไว้กับภาพอื่น ตอนนี้ใช้ขอบล่างกลางภาพแทน' : 'ยังไม่ได้ตั้ง ใช้ขอบล่างกลางภาพ';
    undoBtn.disabled = !teamUndo.length; redoBtn.disabled = !teamRedo.length;
    const same = t.ids.filter((x) => x && x === t.ids[k]).length > 1;
    nameEl.title = same ? 'ตัวนี้อยู่หลายช่อง ขนาด/ตำแหน่งเปลี่ยนพร้อมกันทุกช่อง' : '';
    nameEl.classList.toggle('dup', same);
  }
  async function loadSlot(k) { const r = teamRound(hub.items[t.ids[k]]); sprs[k] = r && isImage(r.file) ? await teamSprite(r).catch(() => null) : null; }
  m.append(h('div', { class: 'row' }, h('h2', {}, 'จัดทีม · ปรับขนาด'), h('span', { class: 'sp' }),
    h('span', { class: 'seg' }, [[false, 'ฝั่งเรา'], [true, 'ทั้งฉาก']].map(([v, l]) => h('button', { class: ui.teamWhole === v ? 'on' : '', 'aria-pressed': String(ui.teamWhole === v), onclick: () => { ui.teamWhole = v; render(); } }, l))),
    h('button', { class: 'switch' + (t.showBg ? ' is-on' : ''), role: 'switch', 'aria-checked': String(t.showBg), onclick: () => { t.showBg = !t.showBg; saveSoon(); render(); } }, h('span', { class: 'knob' }), 'ฉากหลัง'),
    undoBtn, redoBtn));
  m.append(h('p', { class: 'small dim' }, 'คลิกตัวละครหรือปุ่มช่องเพื่อเลือก · ตัวที่ล็อค: ลากไปวางช่องอื่นเพื่อสลับ · ตัวที่ปลดล็อค: ลากเพื่อขยับ/ลอย · Q/E หมุน · Ctrl+Z ย้อนกลับ · Ctrl+Y ทำซ้ำ · บันทึกเอง · กด "ส่งค่าเข้า Godot" ด้านบนเมื่อพอใจ'));
  m.append(h('div', { class: 'team-layout' }, h('div', { class: 'team-wrap' }, cv), panel));
  sync(); draw();
  Promise.all([loadImg(TEAM_BG).then((i) => { bg = i; }).catch(() => loadImg(TEAM_BG_OLD).then((i) => { bg = i; }).catch(() => {})), ...[0, 1, 2, 3, 4, 5].map(loadSlot)]).then(() => { sync(); draw(); });
}
// team tab keys (bound once): Ctrl+Z undo, arrows = feet / unlocked position — not while typing in a field
document.addEventListener('keydown', (e) => {
  if (ui.tab !== 'team' || !teamApi || e.target.closest?.('input, select, textarea')) return;
  if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && !e.shiftKey) { e.preventDefault(); teamApi.undo(); return; } // physical keys: Thai layout types ผ / ั
  if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyY' || (e.code === 'KeyZ' && e.shiftKey))) { e.preventDefault(); teamApi.redo(); return; }
  const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
  if (d) { const n = e.shiftKey ? 10 : 1; if (teamApi.nudge(d[0] * n, d[1] * n)) e.preventDefault(); return; }
  if (!e.ctrlKey && !e.metaKey && !e.altKey && (e.code === 'KeyQ' || e.code === 'KeyE')) { if (teamApi.rotate((e.code === 'KeyQ' ? -1 : 1) * (e.shiftKey ? 15 : 1))) e.preventDefault(); } // physical keys (Thai layout)
});

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
function applyOld() {
  const b = $('oldBtn'); b.classList.toggle('is-on', showOld); b.setAttribute('aria-checked', String(showOld));
  document.querySelectorAll('#tabs [data-old]').forEach((t) => { t.hidden = !showOld; });
  if (!showOld && ['other', 'library', 'queue'].includes(ui.tab)) { ui.tab = 'chars'; const it = hub.items?.[ui.item]; if (it && it.kind !== 'character') ui.item = null; }
}
$('oldBtn').addEventListener('click', () => { showOld = !showOld; try { localStorage.setItem('hubShowOld', showOld ? '1' : '0'); } catch { /* storage off */ } applyOld(); render(); });
applyOld();
document.querySelectorAll('#tabs button').forEach((b) => b.addEventListener('click', () => { ui.tab = b.dataset.tab; if (ui.tab === 'chars' || ui.tab === 'other') { const it = hub.items[ui.item]; if (it && (it.kind !== 'character') !== (ui.tab === 'other')) ui.item = null; } render(); }));
$('search').addEventListener('input', (e) => { ui.railQ = e.target.value; renderRail(); });
$('boardBtn').addEventListener('click', () => { ui.item = null; render(); });
$('exportBtn').addEventListener('click', async () => { try { const r = await api('/api/export', { method: 'POST' }); if (r.library) { hub = await api('/api/hub'); render(); } toast(`เขียน ${r.file} แล้ว (เงา ${r.units} ตัว · ชื่อ ${r.names} ตัว)${r.library ? ` · เก็บเข้าคลังถาวร ${r.library} ไฟล์` : ''}`); } catch (e) { toast(e.message); } });
$('dlg').addEventListener('click', (e) => { if (e.target === $('dlg') && !$('dlg').classList.contains('pxed-dlg')) $('dlg').close(); }); // the pixel editor closes only by its own buttons
api('/api/game').then((j) => { gameInfo = j; if (hub) render(); }).catch(() => { gameInfo = {}; });
api('/api/hub').then((j) => { hub = j; render(); pollJob(); }).catch((e) => { $('main').append(h('p', { class: 'bad' }, 'โหลดข้อมูลไม่ได้: ' + e.message)); });
