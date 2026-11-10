// ---------- คำสั่ง (ทุกคำสั่งผ่านแกนกลาง ซึ่งตรวจกฎก่อนทำ) ----------
function doBuy(i, dest) { const r = J('by', [i, rlRef(dest)], () => buy(P, i, dest, chars)); pushMsgs(r); confirmEmpty = confirmRunes = false; if (r.ok && r.ref && sel && sel.at === 'shop') { const u = unitAt(r.ref); sel = u ? { uid: u.uid } : null; } render(); }
function doSell(ref) { const u = unitAt(ref); const r = J('sl', [rlRef(ref)], () => sell(P, ref, chars)); pushMsgs(r); if (u && sel && sel.uid === u.uid) sel = null; render(); }
function act(from, to) {
  if (!from || !to || sameRef(from, to)) return;
  if (from.at === 'shop') {
    if (to.at === 'shop') return;
    const t = unitAt(to), sid = P.shop[from.i] && P.shop[from.i].id;
    if (t && t.id === sid) { pushMsgs(J('bm', [from.i, rlRef(to)], () => buyMerge(P, from.i, to, chars))); confirmEmpty = confirmRunes = false; render(); return; } // set 106: drop on own copy = buy + merge
    if (t) { pushMsgs({ ok: false, msg: 'ซื้อลงช่องที่มีตัวอยู่ไม่ได้ เลือกช่องว่าง หรือลากไปทับตัวชนิดเดียวกันเพื่อรวมร่าง' }); render(); return; }
    return doBuy(from.i, to);
  }
  if (to.at === 'shop') return;
  const r = J('mv', [rlRef(from), rlRef(to)], () => move(P, from, to, chars)); pushMsgs(r); confirmEmpty = confirmRunes = false;
  render();
}
function parseRef(key) {
  if (!key) return null;
  const [k, a, b] = key.split(':');
  if (k === 'b') return { at: 'board', row: +a, lane: +b };
  if (k === 'n') return { at: 'bench', i: +a };
  if (k === 's') return { at: 'shop', i: +a };
  return null;
}
// set 97: tap = details popup only · move = drag only (shop → board/bench = buy · board/bench ↔ board/bench = move/swap/merge · own unit → dock = sell)
function tap(ref) {
  const has = ref.at === 'shop' ? !!(P.shop[ref.i] && P.shop[ref.i].id) : !!unitAt(ref);
  if (!has) return;
  const u = ref.at === 'shop' ? null : unitAt(ref);
  sel = u ? { uid: u.uid } : { at: 'shop', i: ref.i, id: P.shop[ref.i].id }; renderSide();
}
let drag = null;
const clearDrop = () => { document.querySelectorAll('.drop-ok, .mergeable, .dragging').forEach(n => n.classList.remove('drop-ok', 'mergeable', 'dragging')); $('dock').classList.remove('sell-over'); };
function dropAt(x, y, from) { // → { ref } board/bench cell · { sell: true } the dock (own unit only) · null
  const over = document.elementFromPoint(x, y); if (!over) return null;
  const cell = over.closest('#board [data-ref], #bench [data-ref]'); if (cell) return { ref: parseRef(cell.dataset.ref), node: cell };
  if (from.at !== 'shop' && over.closest('#dock')) return { sell: true };
  return null;
}
document.addEventListener('pointerdown', e => {
  if (e.button > 0 || !P || $('app').hidden || $('app').classList.contains('fighting')) return;
  const t = e.target.closest('#app [data-ref]'); if (!t) return;
  const ref = parseRef(t.dataset.ref);
  const hasThing = ref.at === 'shop' ? !!(P.shop[ref.i] && P.shop[ref.i].id) : !!unitAt(ref);
  if (!hasThing) return;
  drag = { ref, x: e.clientX, y: e.clientY, moved: false, ghost: null, src: t };
});
document.addEventListener('pointermove', e => {
  if (!drag) return;
  if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 8) return;
  if (!drag.moved) {
    drag.moved = true;
    const u = drag.ref.at === 'shop' ? null : unitAt(drag.ref), id = u ? u.id : P.shop[drag.ref.i].id;
    drag.ghost = shapeOf(id, u ? u.level : 0); drag.ghost.classList.add('ghost'); document.body.append(drag.ghost);
    drag.src.classList.add('dragging'); $('sidePane').hidden = true;
    for (const r of (u ? mergeTargets(u) : shopMergeTargets(id))) { const n = document.querySelector(`[data-ref="${refKey(r)}"]`); if (n && n !== drag.src) n.classList.add('mergeable'); }
  }
  drag.ghost.style.left = e.clientX + 'px'; drag.ghost.style.top = e.clientY + 'px';
  document.querySelectorAll('.drop-ok').forEach(n => n.classList.remove('drop-ok')); $('dock').classList.remove('sell-over');
  const d = dropAt(e.clientX, e.clientY, drag.ref);
  if (d && d.node) d.node.classList.add('drop-ok'); else if (d && d.sell) $('dock').classList.add('sell-over');
});
document.addEventListener('pointerup', e => {
  if (!drag) return;
  const d = drag; drag = null;
  if (d.ghost) d.ghost.remove();
  clearDrop();
  if (!d.moved) { tap(d.ref); return; }
  const to = dropAt(e.clientX, e.clientY, d.ref);
  if (to && to.ref) act(d.ref, to.ref); else if (to && to.sell) doSell(d.ref); else renderSide();
});
document.addEventListener('pointercancel', () => { if (drag && drag.ghost) drag.ghost.remove(); drag = null; clearDrop(); });
document.addEventListener('keydown', e => { // keyboard: Enter / Space on a cell or shop card = details popup
  const t = e.target.closest && e.target.closest('#app [data-ref]');
  if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); tap(parseRef(t.dataset.ref)); }
});

$('reroll').addEventListener('click', () => { pushMsgs(J('rr', [], () => reroll(P, chars))); render(); });
// set 116: ⋯ menu (holds เริ่ม run ใหม่) · click outside / Esc closes
function showMenu(on) { $('menu').hidden = !on; $('menuBtn').setAttribute('aria-expanded', String(!!on)); }
$('menuBtn').addEventListener('click', () => showMenu($('menu').hidden));
document.addEventListener('click', e => { if (!$('menu').hidden && !e.target.closest('.menuwrap')) showMenu(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('menu').hidden) showMenu(false); });
$('newRun').addEventListener('click', () => {
  if ($('newRun').dataset.confirm !== '1' && !P.over) { $('newRun').dataset.confirm = '1'; $('newRun').textContent = 'กดอีกครั้งเพื่อยืนยัน'; setTimeout(() => { $('newRun').dataset.confirm = ''; $('newRun').textContent = 'เริ่ม run ใหม่'; }, 3000); return; }
  $('newRun').dataset.confirm = ''; $('newRun').textContent = 'เริ่ม run ใหม่'; showMenu(false); startNewRun();
});

