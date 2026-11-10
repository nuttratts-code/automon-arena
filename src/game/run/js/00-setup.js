// set 180: catch every uncaught error / rejected promise → show a bar (copy the error · reload · close). Runs before everything else so
// load-time errors show too; uses only DOM calls + textContent. The save is untouched (it is written at each step, not here).
(() => {
  let seen = '';
  const show = (msg, stack) => {
    msg = String(msg || 'unknown error').slice(0, 300);
    if (seen || /ResizeObserver loop/.test(msg)) return;
    seen = `Automon Arena error\n${msg}\n${String(stack || '').slice(0, 1500)}\n${navigator.userAgent}`;
    const mk = (tag, text, cls) => { const e = document.createElement(tag); e.textContent = text; if (cls) e.className = cls; return e; };
    const box = mk('div', ''), p = mk('p', ''), copy = mk('button', 'คัดลอกข้อผิดพลาด', 'primary'), again = mk('button', 'โหลดหน้าใหม่'), shut = mk('button', 'ปิด');
    box.id = 'crash'; box.setAttribute('role', 'alert');
    p.append(mk('b', 'เกมขัดข้อง '), 'ถ้าจอค้าง กดโหลดหน้าใหม่ เกมจะเล่นต่อจากเซฟล่าสุด · กดคัดลอกแล้วส่งให้คนทำเกม');
    copy.id = 'crashCopy'; again.id = 'crashReload'; shut.id = 'crashClose';
    copy.onclick = async () => { try { await navigator.clipboard.writeText(seen); copy.textContent = 'คัดลอกแล้ว'; } catch (e) { p.textContent = seen; } };
    again.onclick = () => location.reload();
    shut.onclick = () => { box.remove(); seen = ''; };
    box.append(p, copy, again, shut);
    (document.querySelector('dialog[open]') || document.body || document.documentElement).append(box);
  };
  window.addEventListener('error', e => show(e.message, e.error && e.error.stack));
  window.addEventListener('unhandledrejection', e => show(e.reason && e.reason.message || e.reason, e.reason && e.reason.stack));
})();
/*__CORE__*/const $ = id => document.getElementById(id);
// ---- set 84: match detail = the Balance Room match tab (lab/balance/js/50 + 51, shared) · shims for the names it takes from other Balance Room fragments ----
const TB_STYLE = Object.fromEntries(Object.entries(TRIBE_STYLE).map(([t, st]) => [t, [st.color, st.shape]]));
function tribeBadge(tribe, extras = []) {
  const box = el('span', 'tb'); box.setAttribute('aria-hidden', 'true');
  [tribe, ...extras].forEach((t, i) => { const st = TB_STYLE[t]; if (!st) return; const dot = el('i', `s-${st[1]}${i ? ' extra' : ''}`); dot.style.setProperty('--tc', st[0]); box.append(dot); });
  return box;
}
const pill = (text, cls) => el('span', `pill ${cls}`, text);
let hiTribe = null; // set 171: tribe lit up on the prep board (setHiTribe)
let simLast = null; // { r, m } of the match shown (detail result)
const simSeedLabel = () => null;
