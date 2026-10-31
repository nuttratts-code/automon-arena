// ---------- ไอเดียสกิล (เก็บในฐานข้อมูลของหน้า ให้ Claude อ่าน) ----------
// เลือกตัวในช่องไอเดีย → ที่แก้ค่าด้านบนเปลี่ยนตามด้วย (เลือก "ทั่วไป" ด้านบนคงเดิม)
// ชุด 30: ไม่มีช่องเลือกตัวละครแยกแล้ว (ซ้ำกับช่องด้านบนของขั้นแก้) → ไอเดียผูกกับตัวที่แก้อยู่ หรือติ๊ก "ทั่วไป"
ideaPick = {
  set() { const c = charOf(current); $('ideaFor').replaceChildren(); if ($('ideaGeneral').checked) { $('ideaFor').textContent = 'ทั่วไป'; return; } if (c) $('ideaFor').append(charBadge(c.id), `${c.id} ${c.name}`); },
  value: () => ($('ideaGeneral').checked ? '' : current),
};
$('ideaGeneral').addEventListener('change', () => ideaPick.set());
ideaPick.set();
const IDEA_STATUS = { 'รอ Claude': 'p-lo', 'ใช้แล้ว': 'p-ok', 'ต้องเลือกก่อน': 'p-hi', 'ไม่ใช้': 'p-na' };
// ไอเดีย: แก้/ลบได้ · ที่จบแล้ว (ใช้แล้ว/ไม่ใช้) ซ่อนไว้ก่อน · แก้ข้อความแล้วกลับเป็น "รอ Claude" ให้ Claude อ่านใหม่
const IDEA_DONE = new Set(['ใช้แล้ว', 'ไม่ใช้']);
const IDEA_OPEN = new Set(['รอ Claude', 'ต้องเลือกก่อน']); // set 61: these go into the "คัดลอกค่าให้ Claude" code
let ideaDocs = [], ideaEditing = null, ideaDel = null;
try { $('ideaShowDone').checked = localStorage.getItem('automon-balance-ideadone') === '1'; } catch (e) {}
$('ideaShowDone').addEventListener('change', () => { try { localStorage.setItem('automon-balance-ideadone', $('ideaShowDone').checked ? '1' : ''); } catch (e) {} renderIdeas(); });
function renderIdeas(docs) {
  if (docs) ideaDocs = docs;
  const list = $('ideas'), showDone = $('ideaShowDone').checked;
  const all = ideaDocs.map(d => ({ id: d.id, x: d.data() || {} }));
  const stOf = x => (typeof x.status === 'string' ? x.status : 'รอ Claude');
  const shown = all.filter(o => showDone || !IDEA_DONE.has(stOf(o.x)));
  const hid = all.length - shown.length;
  $('ideaHidden').textContent = hid && !showDone ? `ซ่อนไว้ ${hid} ข้อ` : '';
  if (!shown.length) { list.replaceChildren(Object.assign(document.createElement('li'), { className: 'status', textContent: all.length ? 'ไม่มีไอเดียที่ค้างอยู่' : 'ยังไม่มีไอเดีย' })); return; }
  list.replaceChildren(...shown.map(({ id, x }) => {
    const who = cell(typeof x.char === 'string' && x.char ? x.char : 'ทั่วไป'); if (typeof x.char === 'string' && x.char && charOf(x.char)) who.prepend(charBadge(x.char));
    return ideaItem(id, x, who, t => { $('ideaMsg').textContent = t; });
  }));
}
// Both idea lists redraw together (set 61: the rune/boss list on the stage tab has the same edit/delete)
const ideasRedraw = () => { renderIdeas(); renderStageIdeas(); };
// One idea row: status · who · time · text / reply · แก้ (status back to "รอ Claude") · ลบ (tap twice)
function ideaItem(id, x, who, say) {
  const stOf = q => (typeof q.status === 'string' ? q.status : 'รอ Claude');
  const li = document.createElement('li'); li.className = 'idea' + (IDEA_DONE.has(stOf(x)) ? ' done' : '');
  const meta = document.createElement('div'); meta.className = 'meta';
  const st = stOf(x);
  meta.append(cell(st, `pill ${IDEA_STATUS[st] || 'p-na'}`), who, cell(typeof x.at === 'string' ? x.at.slice(0, 16).replace('T', ' ') : ''));
  if (typeof x.editedAt === 'string') meta.append(cell('แก้แล้ว'));
  li.append(meta);
  const acts = el('div', 'acts');
  if (ideaEditing === id) {
    const ta = document.createElement('textarea'); ta.rows = 3; ta.maxLength = 1000; ta.value = typeof x.text === 'string' ? x.text : '';
    const save = el('button', 'primary', 'บันทึก'), cancel = el('button', '', 'ยกเลิก'); save.type = cancel.type = 'button';
    save.addEventListener('click', async () => {
      const t = ta.value.trim().slice(0, 1000); if (!t || !db) return;
      save.disabled = true;
      try { await db.doc('ideas/' + id).update({ text: t, status: 'รอ Claude', editedAt: new Date().toISOString() }); ideaEditing = null; say('แก้แล้ว · บอก Claude ในแชทได้เลย'); }
      catch (e) { say('แก้ไม่สำเร็จ ลองใหม่อีกครั้ง'); save.disabled = false; return; }
      ideasRedraw();
    });
    cancel.addEventListener('click', () => { ideaEditing = null; ideasRedraw(); });
    acts.append(save, cancel); li.append(ta, acts);
    setTimeout(() => ta.focus(), 0);
  } else {
    li.append(cell(typeof x.text === 'string' ? x.text : '', 'text'));
    if (typeof x.reply === 'string' && x.reply) li.append(cell(x.reply, 'reply'));
    if (db) {
      const ed = el('button', '', 'แก้'); ed.type = 'button';
      ed.addEventListener('click', () => { ideaEditing = id; ideaDel = null; ideasRedraw(); });
      const del = el('button', 'danger', ideaDel === id ? 'กดอีกครั้งเพื่อลบ' : 'ลบ'); del.type = 'button';
      del.addEventListener('click', async () => {
        if (ideaDel !== id) { ideaDel = id; ideasRedraw(); return; } // กดสองครั้งกันลบพลาด (ไม่ใช้กล่อง confirm)
        ideaDel = null; del.disabled = true;
        try { await db.doc('ideas/' + id).delete(); say('ลบแล้ว'); } catch (e) { say('ลบไม่สำเร็จ ลองใหม่อีกครั้ง'); ideasRedraw(); }
      });
      acts.append(ed, del); li.append(acts);
    }
  }
  return li;
}
$('ideaSend').addEventListener('click', async () => {
  const text = $('ideaText').value.trim();
  if (!text) { $('ideaMsg').textContent = 'พิมพ์ไอเดียก่อนกดส่ง'; return; }
  if (!db) { $('ideaMsg').textContent = 'ส่งไม่ได้ในมุมมองนี้ (ต้องเปิดหน้าขณะล็อกอิน)'; return; }
  $('ideaSend').disabled = true;
  try {
    await db.collection('ideas').add({ char: ideaPick.value(), text: text.slice(0, 1000), status: 'รอ Claude', at: new Date().toISOString() });
    $('ideaText').value = ''; $('ideaMsg').textContent = 'ส่งแล้ว · บอก Claude ในแชทได้เลยว่ามีไอเดียใหม่';
  } catch (e) { $('ideaMsg').textContent = 'ส่งไม่สำเร็จ: ' + (e && e.message ? e.message : 'ลองใหม่อีกครั้ง'); }
  $('ideaSend').disabled = false;
});

for (const t of Object.keys(TB_STYLE)) { const sp = document.createElement('span'); sp.append(tribeBadge(t), t); $('legend').append(sp); }
{ const sp = document.createElement('span'); sp.textContent = 'รูปเล็กข้างหลัง = เผ่าเพิ่ม'; $('legend').append(sp); }

// ---------- คลังสกิลแบบใหม่ (ข้อเสนอของ Claude ยังไม่มีในเกม) ----------
// level: ความยากในการเพิ่ม · warn: คำเตือนบาลานซ์ · bad: ขัดกับเอกสารกฎ ต้องตัดสินก่อน · ready: ทำได้แล้วด้วยสกิลที่มี
const CATALOG = [
  { id: 'charge', cat: 'ทำได้แล้ว', name: 'ชาร์จ', level: 'ทำได้แล้ว', ready: true, text: 'ทุกครั้งที่ฮิต พลังโจมตีตัวเอง +X ไปจนจบแมตช์ ยิ่งสู้นานยิ่งแรง', ex: 'ทุกฮิตที่ตีโดน → พลังโจมตี + · ให้ ตัวเอง · ระยะเวลา ระหว่างสู้ (เช่น HL-3 PL-6 ใช้แบบเดียวกันกับค่าอื่น)', warn: 'แมตช์ยาวจะแรงมาก ควรมีเพดานรวม · เป็นไอเดียที่จดไว้ในเอกสารเผ่าแล้ว' },
  { id: 'execute', cat: 'โจมตี', name: 'ประหาร', level: 'ง่าย', text: 'ฮิตใส่เป้าที่ HP ต่ำกว่า X% ทำดาเมจเพิ่มเป็นเท่าตัว', ex: 'เป้า HP ต่ำกว่า 30% → ดาเมจ ×2', warn: 'ช่วยปิดเกมเร็ว · เข้าคู่กับตัวตีแถวหลัง' },
  { id: 'pierce', cat: 'โจมตี', name: 'ทะลุเกราะ', level: 'ง่าย', text: 'ฮิตของตัวนี้ข้ามเกราะ X% เข้า HP ตรง', ex: 'ทะลุ 30/50/100%', warn: 'เป็นตัวแก้ทางเผ่าเหล็กกล้าโดยตรง · 100% อาจแรงเกิน' },
  { id: 'splash', cat: 'โจมตี', name: 'ระเบิดกระจาย', level: 'กลาง', text: 'ฮิตโดนศัตรูที่อยู่ข้างหลังเป้าในเลนเดียวกันด้วย X% ของดาเมจ', ex: 'ข้างหลังโดน 40%', warn: 'ทำให้การวางแถวสำคัญขึ้น' },
  { id: 'chainShock', cat: 'สถานะ', name: 'ช็อตลูกโซ่', level: 'กลาง', text: 'ดาเมจช็อตกระโดดไปศัตรูอีก 1 ตัวที่ X% ของค่าช็อต', ex: 'ช็อต 10 → ตัวถัดไปโดน 5', warn: 'ช็อตแรงอยู่แล้ว (เอกสารให้เฝ้า) ควรค่าต่ำ' },
  { id: 'detonate', cat: 'สถานะ', name: 'จุดระเบิดไฟ', level: 'ง่าย', text: 'ใช้ไฟทั้งหมดบนเป้า ทำดาเมจเท่าไฟ × X แล้วไฟบนเป้าหมด', ex: 'ไฟ 12 × 2 = ดาเมจ 24 ทันที', warn: 'ให้เผ่าเพลิงเผามีตัวปิดเกม · ต้องคุมไม่ให้เพลิงเผากลับมาแรงเกิน' },
  { id: 'stealArmor', cat: 'ป้องกัน', name: 'ขโมยเกราะ', level: 'ง่าย', text: 'ทุกฮิตเอาเกราะของเป้ามาเป็นของตัวเอง X', ex: 'ฮิตละ 3/6/12', warn: '' },
  { id: 'dodge', cat: 'ป้องกัน', name: 'หลบหลีก', level: 'ง่าย', text: 'ฮิต N ครั้งแรกที่โดนในแมตช์ไม่เข้าเลย', ex: 'หลบ 1/2/3 ฮิตแรก', warn: 'แพ้ทางมัลติฮิต (วายุ) เพราะฮิตเล็กๆ ก็นับ 1 ครั้ง' },
  { id: 'guardian', cat: 'ป้องกัน', name: 'ผู้คุ้มกัน', level: 'กลาง', text: 'รับดาเมจแทนเพื่อนข้างหลัง X% ของดาเมจที่เพื่อนโดน', ex: 'รับแทน 50%', warn: 'ต้องคิดลำดับกับเกราะของทั้งสองตัว' },
  { id: 'taunt', cat: 'ป้องกัน', name: 'ยั่วยุ', level: 'กลาง', text: 'ช่วง X วินาทีแรก ศัตรูทั้งสองเลนต้องตีตัวนี้', ex: 'ยั่วยุ 3 วิแรก', warn: 'เป็นข้อยกเว้นกฎเลือกเป้า (เอกสารเปิดไว้ให้สกิลเลือกเป้าได้)' },
  { id: 'lifesteal', cat: 'ทำได้แล้ว', name: 'ดูดเลือด', level: 'ทำได้แล้ว', ready: true, text: 'ฟื้น HP ตัวเอง X% ของดาเมจที่ทำ', ex: 'ทุกฮิตที่ตีโดน → ดูดเลือด % (WN-4) · ใช้ได้เฉพาะเผ่าภูติและอสูร', warn: 'ใช้ได้เฉพาะเผ่าภูติและอสูร (tribe-rules)' },
  { id: 'aura', cat: 'ทีม', name: 'ออร่าเผ่า', level: 'กลาง', text: 'ขณะตัวนี้ยังยืนอยู่ เพื่อนเผ่าเดียวกันพลังโจมตี +X · ตัวนี้ down แล้วหาย', ex: '+3/6/12 ให้เพื่อนเผ่าเดียวกัน', warn: 'ซ้อนกับโบนัสเผ่า อาจทำให้ทีมเผ่าเดียวแรงขึ้นอีก' },
  { id: 'copy', cat: 'ทีม', name: 'เลียนแบบ', level: 'ยาก', text: 'เริ่มแมตช์ คัดลอกสกิลระหว่างสู้ของเพื่อนข้างหน้ามาใช้เอง', ex: 'หลัง PL-3 → ได้ "ทุกฮิตติดไฟ"', warn: 'คอมโบคาดเดายาก ต้องทดสอบเยอะ' },
  { id: 'summon', cat: 'ทำได้แล้ว', name: 'เรียกลูกน้อง', level: 'ทำได้แล้ว', ready: true, text: 'ตัวนี้ down แล้วเรียกตัวเล็ก (HP/พลังโจมตีต่ำ) ลงช่องเดิม', ex: 'ตัวเอง down → เรียกตัวละครมาสู้แทน (PL-5 เรียก PL-7)', warn: 'กระทบการนับเผ่าและหน้าจอสู้ · ใช้เวลาทำนาน' },
  { id: 'push', cat: 'ทีม', name: 'ผลักแถว', level: 'ยาก', text: 'ฮิตแรกของแมตช์ผลักเป้าไปแถวหลังสุด ตัวข้างหลังเลื่อนขึ้นมาแทน', ex: 'ผลักแถวหน้าศัตรูไปหลัง', warn: 'เปลี่ยนตำแหน่งระหว่างสู้ กระทบสกิลที่อิงตำแหน่งหลายตัว' },
  { id: 'interest', cat: 'ร้านค้า', name: 'ดอกเบี้ย', level: 'ง่าย', text: 'เริ่มรอบร้าน ได้เงินเพิ่ม +1 ต่อเงินค้าง 5', ex: 'ค้าง 10 → +2', warn: 'เอกสารกำหนด "เงินค้างไม่มีดอกเบี้ย" · คนที่ชนะเก็บเงินได้เร็วขึ้น (ได้เปรียบสะสม)', bad: true },
  { id: 'freeReroll', cat: 'ร้านค้า', name: 'รีโรลฟรี', level: 'ง่าย', text: 'ขณะอยู่บนบอร์ด รีโรลครั้งแรกของรอบฟรี', ex: 'ฟรีวันละ 1 ครั้ง', warn: 'ทำให้การวนขาย WN-5 ถูกลง (เคยตกลงไว้ว่าต้องทบทวน)', bad: true },
  { id: 'feed', cat: 'ร้านค้า', name: 'ส่งต่อพลัง', level: 'กลาง', text: 'ขายตัวนี้แล้วค่าถาวรทั้งหมดของมันส่งให้เพื่อนข้างหน้า', ex: 'มี พลังโจมตี +4 → เพื่อนได้ +4', warn: 'ต้องเช็กเพดานค่าถาวร' },
  { id: 'enrage', cat: 'ทำได้แล้ว', name: 'คลั่ง', level: 'ทำได้แล้ว', ready: true, text: 'HP ต่ำกว่าครึ่ง พลังโจมตี +X% และคูลดาวน์ลด X%', ex: 'ใส่ 2 สกิล: "HP ต่ำกว่าครึ่ง → ตัวเอง: พลังโจมตี +%" และ "… → ลดคูลดาวน์ทั้งแมตช์"', warn: '' },
  { id: 'thorns', cat: 'ทำได้แล้ว', name: 'หนาม', level: 'ทำได้แล้ว', ready: true, text: 'โดนตีแล้วผู้ตีโดนดาเมจ X', ex: '"เมื่อโดนตี → ผู้ตี: ดาเมจ"', warn: '' },
  { id: 'grow', cat: 'ทำได้แล้ว', name: 'เติบโต', level: 'ทำได้แล้ว', ready: true, text: 'จบแมตช์ ตัวเองได้ HP/พลังโจมตีถาวร', ex: '"ร้านค้า: จบแมตช์ → ตัวเอง: ถาวร พลังโจมตี +"', warn: 'ไม่มีเพดาน HP/พลังโจมตีถาวร ระวังค่าสูง' },
];
const CAT_LEVEL = { 'ง่าย': 'p-ok', 'กลาง': 'p-lo', 'ยาก': 'p-hi', 'ทำได้แล้ว': 'p-na' };
let picks = {}, catFilter = 'ทั้งหมด';
function renderCatalog() {
  const cats = ['ทั้งหมด', ...new Set(CATALOG.map(x => x.cat))];
  $('catFilter').replaceChildren(...cats.map(c => { const b = el('button', '', c); b.type = 'button'; b.setAttribute('aria-pressed', String(c === catFilter)); b.addEventListener('click', () => { catFilter = c; renderCatalog(); }); return b; }));
  const list = CATALOG.filter(x => catFilter === 'ทั้งหมด' || x.cat === catFilter);
  $('catList').replaceChildren(...list.map(x => {
    const p = picks[x.id] || {};
    const card = el('div', 'cat' + (p.want ? ' want' : ''));
    const top = el('div', 'row'); top.append(el('h4', 'grow', x.name), el('span', `pill ${CAT_LEVEL[x.level] || 'p-na'}`, x.level));
    card.append(top, el('span', 'hint', x.cat), el('span', '', x.text), el('div', 'ex', 'ตัวอย่าง: ' + x.ex));
    if (x.warn) card.append(el('span', 'warn' + (x.bad ? ' bad' : ''), (x.bad ? 'ขัดเอกสาร: ' : 'ข้อควรระวัง: ') + x.warn));
    if (!x.ready) {
      const note = document.createElement('input'); note.type = 'text'; note.id = `pick-note-${x.id}`; note.maxLength = 300; note.placeholder = 'จดเพิ่ม เช่น ใส่ให้ตัวไหน ค่าเท่าไร'; note.value = typeof p.note === 'string' ? p.note : '';
      note.addEventListener('change', () => savePick(x.id, { want: !!(picks[x.id] || {}).want, note: note.value.slice(0, 300) }));
      const btn = el('button', p.want ? 'primary' : '', p.want ? 'เลือกแล้ว ✓' : 'อยากได้'); btn.type = 'button'; btn.setAttribute('aria-pressed', String(!!p.want));
      btn.addEventListener('click', () => savePick(x.id, { want: !p.want, note: note.value.slice(0, 300) }));
      card.append(note, btn);
    }
    return card;
  }));
  const n = Object.values(picks).filter(p => p.want).length;
  $('pickCount').textContent = n ? `เลือกไว้ ${n} อย่าง` : '';
}
async function savePick(id, data) {
  picks[id] = { ...data };
  renderCatalog();
  if (!db) { $('pickCount').textContent = 'บันทึกไม่ได้ในมุมมองนี้ (ต้องเปิดหน้าขณะล็อกอิน)'; return; }
  try { await db.doc('skillPicks/' + id).set({ want: !!data.want, note: String(data.note || '').slice(0, 300), at: new Date().toISOString() }); }
  catch (e) { $('pickCount').textContent = 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง'; }
}
renderCatalog();

// ชุด 13: คำอธิบายยาวแสดงประโยคแรก ที่เหลือพับไว้ใต้ "อ่านเพิ่ม" (ข้อความคงที่ในหน้า ใช้ textContent เท่านั้น)
function compactHints(root) {
  for (const p of root.querySelectorAll('p.hint')) {
    if (p.dataset.compact || p.children.length) continue;
    const t = p.textContent.trim(), parts = t.split(' · ');
    if (t.length < 110 || parts.length < 3) continue;
    p.dataset.compact = '1';
    const det = document.createElement('details'), sum = document.createElement('summary');
    sum.textContent = 'อ่านเพิ่ม'; det.append(sum, ' ' + parts.slice(1).join(' · '));
    p.replaceChildren(parts[0] + ' ', det);
  }
}
compactHints(document);

