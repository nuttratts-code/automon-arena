// Still batch picker on the hub server (owner A2, set 260). Every change is saved to art/hub/stillpicks/ (latest.json + history.jsonl).
'use strict';
const TRIBE_TH = { steel: 'เหล็กกล้า', fire: 'เพลิงเผา', storm: 'สายฟ้า', wind: 'วายุ', spirit: 'ภูติ', demon: 'อสูร' };
let D = { batches: [], items: [] }, S = {}, rev = 0, tab = '', timer = 0, saving = false, again = false;
try { tab = localStorage.getItem('stillpick:tab') || ''; } catch (e) { /* private window */ }
const el = (t, a = {}, ...k) => { const e = document.createElement(t); Object.assign(e, a); k.forEach((x) => e.append(x)); return e; };
const th = (t) => TRIBE_TH[t] || t || '?';
const $ = (id) => document.getElementById(id);
let saveMsg = ['', ''];
function status(t, cls) { saveMsg = [t, cls || '']; const s = $('save'); if (s) { s.textContent = t; s.className = cls || ''; } }

function change() { render(); status('กำลังบันทึก…'); clearTimeout(timer); timer = setTimeout(save, 300); }
async function save() {
  if (saving) { again = true; return; }
  saving = true;
  try {
    const r = await fetch('/api/stillpicks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rev, batches: S }) });
    const j = await r.json();
    if (r.status === 409) { rev = j.picks.rev; const f = fill(j.picks.batches); for (const k in f) Object.assign(S[k], f[k]); /* keep the objects the click handlers hold */ render(); status('มีการแก้จากอีกหน้า — โหลดค่าล่าสุดแล้ว กดใหม่อีกครั้ง', 'bad'); }
    else if (!r.ok) status('บันทึกไม่ได้: ' + (j.error || r.status), 'bad');
    else { rev = j.rev; status('บันทึกแล้ว ✓ ' + new Date(j.t).toLocaleTimeString('th-TH'), 'ok'); }
  } catch (e) { status('บันทึกไม่ได้ (server ปิดอยู่?)', 'bad'); }
  saving = false;
  if (again) { again = false; save(); }
}
function fill(saved) {
  const o = {};
  D.batches.forEach((b) => {
    const v = saved[b.key] || {};
    o[b.key] = { id: v.id || '', pick: Array.isArray(v.pick) ? v.pick.filter((p) => b.pics.includes(p)) : [], eye: !!v.eye, hidden: !!v.hidden, closed: !!v.closed };
  });
  return o;
}

function build() {
  const L = $('list'); L.textContent = '';
  D.batches.forEach((b) => {
    const s = S[b.key];
    const sel = el('select'); sel.append(el('option', { value: '', textContent: '— รหัสตัวละคร —' }));
    // owner set 260: only the batch's own tribe (a saved id from another tribe stays listed so it is not lost)
    D.items.filter((i) => !b.tribe || i.tribe === b.tribe || i.id === s.id)
      .forEach((i) => sel.append(el('option', { value: i.id, textContent: i.id + ' ' + i.name + (b.tribe && i.tribe !== b.tribe ? ' (' + th(i.tribe) + ')' : '') })));
    sel.onchange = () => { s.id = sel.value; change(); };
    const eye = el('input', { type: 'checkbox', className: 'eye' }); eye.onchange = () => { s.eye = eye.checked; change(); };
    const fold = el('button', { className: 'fold' }); fold.onclick = () => { s.closed = !s.closed; change(); };
    const del = el('button', { className: 'del', textContent: '✕ ซ่อนชุดนี้' });
    del.onclick = () => { if (confirm('ซ่อนชุด ' + b.key + ' ออกจากหน้านี้?\nภาพที่ติด ★ ในชุดนี้ (' + s.pick.length + ' ภาพ) จะไม่นับในผล\nไฟล์ไม่ถูกลบ กด "แสดงชุดที่ซ่อน" ด้านล่างเพื่อเอากลับได้')) { s.hidden = true; change(); } };
    const head = el('div', { className: 'head' }, fold, el('h2', { textContent: 'เผ่า' + th(b.tribe) + ' · ' + b.key }), el('span', { className: 'mut cnt' }), del);
    const top = el('div', { className: 'top' });
    if (b.style) top.append(el('div', { className: 'ref' }, el('img', { src: '/sb/' + b.key + '/style.png', alt: '' }), 'ต้นแบบสไตล์ ' + b.styleSrc));
    top.append(el('div', {}, el('div', { className: 'desc', textContent: b.desc + (b.note ? ' · ' + b.note : '') }), el('p', {}, sel), el('label', {}, eye, ' ดูแล้ว ไม่เหมือนต้นแบบ')));
    const g = el('div', { className: 'grid' });
    b.pics.forEach((n) => {
      const p = el('div', { className: 'p' }, el('img', { src: '/sb/' + b.key + '/' + n + '.png', alt: n, loading: 'lazy' }), el('span', { textContent: n }));
      p.dataset.n = n;
      p.onclick = () => { const i = s.pick.indexOf(n); if (i < 0) s.pick.push(n); else s.pick.splice(i, 1); s.pick.sort(); change(); };
      g.append(p);
    });
    L.append(el('div', { className: 'b batch', id: 'b_' + b.key }, head, el('div', { className: 'body' }, top, g)));
  });
  render();
}
function render() {
  const tribes = [...new Set(D.batches.map((b) => b.tribe || '?'))];
  if (!tribes.includes(tab)) tab = tribes[0] || '';
  try { localStorage.setItem('stillpick:tab', tab); } catch (e) { /* ignore */ }
  const T = $('tabs');
  T.textContent = '';
  tribes.forEach((t) => {
    const n = D.batches.filter((b) => (b.tribe || '?') === t && !S[b.key].hidden).reduce((a, b) => a + S[b.key].pick.length, 0);
    const bt = el('button', { className: t === tab ? 'on' : '' }, th(t), el('span', { className: 'n', textContent: n ? '★' + n : '' }));
    bt.dataset.tribe = t; bt.onclick = () => { tab = t; render(); };
    T.append(bt);
  });
  T.append(el('span', { id: 'save', textContent: saveMsg[0], className: saveMsg[1] }));
  D.batches.forEach((b) => {
    const s = S[b.key], box = $('b_' + b.key);
    box.style.display = (b.tribe || '?') === tab && !s.hidden ? '' : 'none';
    box.classList.toggle('closed', s.closed);
    box.querySelector('.fold').textContent = s.closed ? '▸ ขยาย' : '▾ หุบ';
    box.querySelector('.cnt').textContent = s.pick.length ? '★ ' + s.pick.join(', ') : '';
    box.querySelector('select').value = s.id; box.querySelector('.eye').checked = s.eye;
    box.querySelectorAll('.p').forEach((p) => p.classList.toggle('on', s.pick.includes(p.dataset.n)));
  });
  const H = $('hidden'); H.textContent = '';
  const hid = D.batches.filter((b) => S[b.key].hidden);
  if (hid.length) {
    const r = el('button', { textContent: 'แสดงชุดที่ซ่อน (' + hid.length + ')' });
    r.onclick = () => { hid.forEach((b) => { S[b.key].hidden = false; }); change(); };
    H.append('ซ่อนไว้: ' + hid.map((b) => b.key).join(', ') + ' ', r);
  }
}
// old page result lines: "<batch> -> <ID> : g00,g05 · eye ok"
$('impGo').onclick = () => {
  let n = 0; const bad = [];
  $('impText').value.split('\n').forEach((l) => {
    const m = /^\s*([A-Za-z0-9_-]+)\s*->\s*([A-Za-z0-9_-]+|\?)\s*:\s*([g0-9,\s-]*)·\s*eye\s+(ok|no)\s*$/.exec(l);
    if (!m) { if (l.trim() && l.trim() !== 'STILLPICK') bad.push(l.trim().slice(0, 30)); return; }
    const s = S[m[1]], b = D.batches.find((x) => x.key === m[1]);
    if (!s) { bad.push(m[1]); return; }
    s.id = m[2] === '?' || !D.items.some((i) => i.id === m[2]) ? '' : m[2];
    s.pick = m[3].split(',').map((x) => x.trim()).filter((x) => b.pics.includes(x)).sort();
    s.eye = m[4] === 'ok'; s.hidden = false; n++;
  });
  $('impMsg').textContent = 'นำเข้า ' + n + ' ชุด' + (bad.length ? ' · อ่านไม่ออก: ' + bad.join(', ') : '');
  if (n) change();
};
(async () => {
  const [b, p] = await Promise.all([fetch('/api/stillbatches').then((r) => r.json()), fetch('/api/stillpicks').then((r) => r.json())]);
  D = b; rev = p.rev; S = fill(p.batches || {});
  if (!D.batches.length) { $('list').append(el('p', { className: 'b', textContent: 'ไม่พบชุดเจนใน ' + D.dir })); return; }
  status(p.rev ? 'บันทึกล่าสุด ' + new Date(p.t).toLocaleTimeString('th-TH') : 'ยังไม่เคยบันทึก', p.rev ? 'ok' : '');
  build();
})();
