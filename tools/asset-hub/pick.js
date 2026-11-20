// Still batch picker on the hub server (owner A2, set 260). Every change is saved to art/hub/stillpicks/ (latest.json + history.jsonl).
'use strict';
const TRIBE_TH = { steel: 'เหล็กกล้า', fire: 'เพลิงเผา', storm: 'สายฟ้า', wind: 'วายุ', spirit: 'ภูติ', demon: 'อสูร' };
let D = { batches: [], items: [] }, S = {}, rev = 0, tab = '', fv = 1, timer = 0, saving = false, again = false;
// set 265 (owner): tab HID = every hidden batch in one separate menu · fv = form view of a tribe tab (ร่าง 1 first, button ร่าง 3)
const HID = '__hidden';
try { tab = localStorage.getItem('stillpick:tab') || ''; fv = Number(localStorage.getItem('stillpick:form')) === 3 ? 3 : 1; } catch (e) { /* private window */ }
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
    o[b.key] = { id: v.id || '', pick: Array.isArray(v.pick) ? v.pick.filter((p) => b.pics.includes(p)) : [], eye: v.eye !== false, hidden: !!v.hidden, closed: !!v.closed };
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
    // set 265 (owner): a batch made for one creature shows its ID locked, no menu
    const who = b.item ? el('span', { className: 'lock', textContent: '🔒 ' + b.item + ' ' + ((D.items.find((i) => i.id === b.item) || {}).name || '') }) : sel;
    // owner set 260: a pick means "checked by eye, not like the ref"; tick only to flag one that IS too close
    const eye = el('input', { type: 'checkbox', className: 'eye' }); eye.onchange = () => { s.eye = !eye.checked; change(); };
    const fold = el('button', { className: 'fold' }); fold.onclick = () => { s.closed = !s.closed; change(); };
    const del = el('button', { className: 'del' });
    del.onclick = () => { if (s.hidden) { s.hidden = false; change(); return; } if (confirm('ซ่อนชุด ' + b.key + ' ออกจากหน้านี้?\nภาพที่ติด ★ ในชุดนี้ (' + s.pick.length + ' ภาพ) จะไม่นับในผล\nไฟล์ไม่ถูกลบ เอากลับได้ที่แท็บ "ซ่อนไว้"')) { s.hidden = true; change(); } };
    const h2 = el('h2', { textContent: 'เผ่า' + th(b.tribe) + ' · ' + b.key });
    if (b.form === 3) h2.append(' ', el('span', { className: 'form3', textContent: 'ร่าง 3' }));
    const head = el('div', { className: 'head' }, fold, h2, el('span', { className: 'mut cnt' }), del);
    const top = el('div', { className: 'top' });
    if (b.style) top.append(el('div', { className: 'ref' }, el('img', { src: '/sb/' + b.key + '/style.png', alt: '' }), 'ต้นแบบสไตล์ ' + b.styleSrc));
    top.append(el('div', {}, el('div', { className: 'desc', textContent: b.desc + (b.note ? ' · ' + b.note : '') }), el('p', {}, who), el('label', {}, eye, ' ⚠ เหมือนต้นแบบเกินไป (ห้ามใช้)')));
    const g = el('div', { className: 'grid' });
    // set 265 (owner I1): pictures already in the hub come first, tagged
    const inHub = new Set(b.inHub || []);
    [...b.pics.filter((n) => inHub.has(n)), ...b.pics.filter((n) => !inHub.has(n))].forEach((n) => {
      const p = el('div', { className: 'p' + (inHub.has(n) ? ' inhub' : '') }, el('img', { src: '/sb/' + b.key + '/' + n + '.png', alt: n, loading: 'lazy' }), el('span', { textContent: n }));
      if (inHub.has(n)) p.append(el('b', { className: 'hubtag', textContent: 'ใน hub แล้ว' }));
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
  const hid = D.batches.filter((b) => S[b.key].hidden);
  if (!tribes.includes(tab) && !(tab === HID && hid.length)) tab = tribes[0] || '';
  try { localStorage.setItem('stillpick:tab', tab); localStorage.setItem('stillpick:form', String(fv)); } catch (e) { /* ignore */ }
  const T = $('tabs');
  T.textContent = '';
  tribes.forEach((t) => {
    const n = D.batches.filter((b) => (b.tribe || '?') === t && !S[b.key].hidden).reduce((a, b) => a + S[b.key].pick.length, 0);
    const bt = el('button', { className: t === tab ? 'on' : '' }, th(t), el('span', { className: 'n', textContent: n ? '★' + n : '' }));
    bt.dataset.tribe = t; bt.onclick = () => { tab = t; render(); };
    T.append(bt);
  });
  if (hid.length) {
    const hb = el('button', { className: 'hidtab' + (tab === HID ? ' on' : ''), textContent: 'ซ่อนไว้ (' + hid.length + ')' });
    hb.dataset.tribe = HID; hb.onclick = () => { tab = HID; render(); };
    T.append(hb);
  }
  T.append(el('span', { id: 'save', textContent: saveMsg[0], className: saveMsg[1] }));
  const shown = (b, f) => (b.tribe || '?') === tab && !S[b.key].hidden && (b.form || 1) === f;
  if (tab !== HID) {
    const seg = el('div', { className: 'fseg' });
    [1, 3].forEach((f) => {
      const n = D.batches.filter((b) => shown(b, f)).length;
      const bt = el('button', { className: fv === f ? 'on' : '', textContent: 'ร่าง ' + f + ' (' + n + ')', disabled: !n && fv !== f });
      bt.dataset.form = String(f); bt.onclick = () => { fv = f; render(); };
      seg.append(bt);
    });
    T.append(seg);
  }
  D.batches.forEach((b) => {
    const s = S[b.key], box = $('b_' + b.key);
    box.style.display = (tab === HID ? s.hidden : shown(b, fv)) ? '' : 'none';
    box.classList.toggle('closed', s.closed);
    box.querySelector('.fold').textContent = s.closed ? '▸ ขยาย' : '▾ หุบ';
    box.querySelector('.del').textContent = s.hidden ? '↩ เอากลับ' : '✕ ซ่อนชุดนี้';
    box.querySelector('.cnt').textContent = s.pick.length ? '★ ' + s.pick.join(', ') : '';
    if (b.item) s.id = b.item; else box.querySelector('select').value = s.id;
    box.querySelector('.eye').checked = !s.eye;
    box.querySelectorAll('.p').forEach((p) => p.classList.toggle('on', s.pick.includes(p.dataset.n)));
  });
  const H = $('hidden');
  H.textContent = tab !== HID && !D.batches.some((b) => shown(b, fv)) ? 'ไม่มีชุดร่าง ' + fv + ' ในเผ่านี้' : '';
}
// old page result lines: "<batch> -> <ID> : g00,g05 · eye ok"
$('impGo').onclick = () => {
  let n = 0; const bad = [];
  $('impText').value.split('\n').forEach((l) => {
    const m = /^\s*([A-Za-z0-9_-]+)\s*->\s*([A-Za-z0-9_-]+|\?)\s*:\s*([g0-9,\s-]*)·\s*eye\s+(ok|no)\s*$/.exec(l);
    if (!m) { if (l.trim() && l.trim() !== 'STILLPICK') bad.push(l.trim().slice(0, 30)); return; }
    const s = S[m[1]], b = D.batches.find((x) => x.key === m[1]);
    if (!s) { bad.push(m[1]); return; }
    s.id = b.item || (m[2] === '?' || !D.items.some((i) => i.id === m[2]) ? '' : m[2]);
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
