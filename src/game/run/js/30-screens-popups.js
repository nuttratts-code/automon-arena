// set 97: prep and battle share one screen (#app · .fighting = battle on the same field) · resume / runEnd = full-screen overlays
function showScreen(name) {
  if (name !== 'prep' && typeof hideToast === 'function') hideToast(); // set 159: prep toasts floated over the end/resume screens
  $('app').hidden = name !== 'prep' && name !== 'battle';
  $('app').classList.toggle('fighting', name === 'battle');
  $('resume').hidden = name !== 'resume'; $('runEnd').hidden = name !== 'runEnd';
  closePop(); if ($('offerDlg').open) $('offerDlg').close();
  if (name === 'battle' && $('mxDlg').open) $('mxDlg').close();
  if (name !== 'prep' && hiTribe) setHiTribe(null);
  if (name !== 'battle') { $('result').hidden = true; $('replayTag').hidden = true; } // set 98: result card lived on over prep → "ไปรอบถัดไป" could be pressed again and again (free rounds)
}
function beginRound() {
  const r = J('st', [], () => startRound(P, chars)); pushMsgs(r);
  startRound(B, chars, RULES);
  render();
}
// set 97: messages → toast (newest first, errors stay longer)
function pushMsgs(r) {
  if (!r) return;
  const add = r.ok ? (r.msgs || []).map(t => ({ t })) : [{ t: r.msg, err: true }];
  if (!add.length) return;
  msgs = [...add.slice().reverse(), ...msgs].slice(0, 5);
  toast(add);
}
let toastT = 0;
function hideToast() { clearTimeout(toastT); $('toast').hidden = true; }
function toast(list) {
  const t = $('toast'); t.replaceChildren(...list.slice(-3).map(m => el('div', m.err ? 'err' : '', m.t))); t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, list.some(m => m.err) ? 3500 : 2600);
}
// ---------- set 105: run code (testers paste it in chat; read with lab/runcode.mjs) ----------
function runCode() { return makeRunCode([store.get(REPLAY_KEY), store.get(PREV_REPLAY_KEY)], store.get(HIST_KEY), DATA_HASH, Date.now(), RULES, [store.get(RLOG_KEY), store.get(RLOG_PREV_KEY)], playerName); }
async function copyRunCode() {
  const code = runCode();
  if (!code) { toast([{ t: 'ยังไม่มีผลการเล่นให้คัดลอก', err: true }]); return; }
  try { await navigator.clipboard.writeText(code); toast([{ t: 'คัดลอกโค้ดแล้ว วางส่งให้คนทำเกมได้เลย' }]); } catch (e) { openPop('runcode'); }
}
// ---------- set 97: popups (one <dialog> for every detail view · content rebuilt by kind, so it follows the run state) ----------
let popKind = null, popArg = null;
const POPS = {};
function openPop(kind, arg) { popKind = kind; popArg = arg; if (!renderPop()) return; if (!$('dlg').open) $('dlg').showModal(); }
function renderPop() {
  if (!popKind) return false;
  const nodes = POPS[popKind](popArg);
  if (!nodes) { closePop(); return false; }
  $('pop').replaceChildren(...nodes); return true;
}
function closePop() { if ($('dlg').open) $('dlg').close(); popKind = null; popArg = null; }
$('dlg').addEventListener('close', () => { popKind = null; popArg = null; });
$('dlg').addEventListener('click', e => { if (e.target === $('dlg')) closePop(); }); // tap outside = close
const pbtn = (text, fn, cls = '', dis = false) => { const b = el('button', cls, text); b.type = 'button'; b.disabled = !!dis; b.addEventListener('click', fn); return b; };
const pacts = (...extra) => { const a = el('div', 'acts'); a.append(...extra, pbtn('ปิด', closePop)); return a; };
const phead = (title, sub, icon) => { const h = el('div', 'phead'), tx = el('div', 'grow'); tx.append(el('h2', '', title)); if (sub) tx.append(el('div', 'hint', sub)); if (icon) h.append(icon); h.append(tx); return h; };
const back = fn => pbtn('← กลับ', fn);

