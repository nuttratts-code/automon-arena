// ---------- ลองสู้บอส + ใส่รูนให้ทีมซ้าย (ชุด 66 · phase 2a) ----------
// ใช้ข้อมูลบอส/รูนที่กำลังแก้อยู่ในแท็บ "รูน / บอส" (stageCfg) ทันที ไม่ต้องบันทึกก่อน
let simFoeBoss = false, simBossId = '', simBossK = 1, simRunes = [], simRunePickId = '', simRuneSlotKey = '', simRunePartnerKey = '', simRuneN = 1;
const simBossOf = () => stageCfg.bosses.find(b => b.id === simBossId) || stageCfg.bosses.find(b => b.on) || stageCfg.bosses[0] || null;
const simRuneAll = () => [...Object.entries(stageCfg.runes).map(([id, r]) => ({ ...r, id })), ...stageCfg.custom.map(r => ({ ...r }))].filter(runeActive);
const simRuneOf = id => simRuneAll().find(r => r.id === id) || null;
const simSlotList = () => { const out = []; for (let r = 0; r < 3; r++) for (let l = 0; l < 2; l++) if (simTeam[0][r][l]) out.push([`${r},${l}`, `${ROW_TH[r]}${l + 1} · ${charOf(simTeam[0][r][l].id).name}`]); return out; };
const simSlotVal = k => (k ? k.split(',').map(Number) : null);
// รูนที่ต้องเลือกช่อง (ใส่ตัวเดียว) / ต้องเลือกคู่ (สายสัมพันธ์ คู่หู)
const simRuneNeedsSlot = r => !!r && r.scope === 'one';
const simRuneNeedsPartner = r => !!r && (r.eff === 'link' || r.eff === 'buddy');

// ทีมซ้ายหลังใส่รูน (ใช้ตอนจำลอง) → { units, tribeExtra, skipped }
function simEquip(team) {
  const byId = Object.fromEntries(simRuneAll().map(r => [r.id, r]));
  return equipRunes(team, simRunes.map(x => ({ r: byId[x.id], n: x.n, slot: x.slot, partner: x.partner })).filter(x => x.r));
}
// ตัวละครจำลองของบอส (ให้แผงรายละเอียด/ภาพการต่อสู้แสดงชื่อและค่าพลังได้)
function simBossChar() {
  const b = simBossOf(); if (!b) return null;
  const at = bossAt(b, simBossK), b3 = v => [v, v, v];
  return { id: b.id, name: `${b.name} (บอส)`, tribe: b.tribe, extraTribes: [], rarity: RARITIES[RARITIES.length - 1], price: 0, rowHint: 'หน้า',
    hp: b3(at.hp), atk: b3(at.atk), cdMs: b3(b.cdMs), multi: b3(b.multi), burn: b3(b.burn), shock: b3(b.shock), armorHit: b3(0), healHit: b3(0), skills: [] };
}

function renderSimBoss() {
  const on = simFoeBoss;
  $('simFoeTeam').setAttribute('aria-pressed', String(!on));
  $('simFoeBoss').setAttribute('aria-pressed', String(on));
  for (const id of ['simBossPick', 'simBossK', 'simBossKLab']) $(id).hidden = !on;
  const list = stageCfg.bosses.filter(b => b.on);
  const sel = $('simBossPick');
  if (!simBossId || !list.some(b => b.id === simBossId)) simBossId = list.length ? list[0].id : '';
  sel.replaceChildren(...list.map(b => new Option(`${b.id} ${b.name}`, b.id)));
  sel.value = simBossId;
  const b = simBossOf();
  if (!on) $('simBossInfo').textContent = '';
  else if (!b) $('simBossInfo').textContent = 'ยังไม่มีบอสที่เปิดใช้ (เปิดในแท็บ "รูน / บอส")';
  else {
    const at = bossAt(b, simBossK);
    $('simBossInfo').textContent = `HP ${at.hp} · ${b.bars} แถบ (แถบละ ${at.barHp}) · พลังโจมตี ${at.atk} ทุก ${fmt(b.cdMs / 1000)} วิ · ${spotShort(b.spot)} · ${b.phases.length} เฟส`;
  }
}
function renderSimRunes() {
  const tools = $('simRuneTools'), box = $('simRuneList');
  const all = simRuneAll();
  if (!all.length) { tools.replaceChildren(cell('ยังไม่มีรูนที่เปิดใช้ · เปิดในแท็บ "รูน / บอส"', 'was')); box.replaceChildren(); return; }
  if (!simRunePickId || !all.some(r => r.id === simRunePickId)) simRunePickId = all[0].id;
  const r = simRuneOf(simRunePickId), slots = simSlotList();
  const row = [];
  row.push(selectInput('simRunePick', all.map(x => [x.id, `${x.id} ${x.name}`]), simRunePickId, v => { simRunePickId = v; renderSimRunes(); }));
  if (simRuneNeedsSlot(r)) {
    if (!slots.some(s => s[0] === simRuneSlotKey)) simRuneSlotKey = slots.length ? slots[0][0] : '';
    row.push(cell('ใส่ให้', 'status'), slots.length ? selectInput('simRuneSlot', slots, simRuneSlotKey, v => { simRuneSlotKey = v; }) : cell('ยังไม่มีตัวในทีมซ้าย', 'was'));
  }
  if (simRuneNeedsPartner(r)) {
    const others = slots.filter(s => s[0] !== simRuneSlotKey);
    if (!others.some(s => s[0] === simRunePartnerKey)) simRunePartnerKey = others.length ? others[0][0] : '';
    row.push(cell('คู่', 'status'), others.length ? selectInput('simRunePartner', others, simRunePartnerKey, v => { simRunePartnerKey = v; }) : cell('ต้องมีเพื่อนอีกตัว', 'was'));
  }
  row.push(cell('จำนวน', 'status'), numInput('simRuneN', simRuneN, 1, v => { simRuneN = Math.max(1, Math.min(r ? r.max : 1, Math.round(v))); }));
  const add = el('button', '', '+ ใส่รูน'); add.type = 'button';
  add.addEventListener('click', () => {
    const q = simRuneOf(simRunePickId); if (!q) return;
    if (simRuneNeedsSlot(q) && !simRuneSlotKey) { $('simMsg').textContent = 'รูนนี้ใส่ให้ตัวเดียว · ต้องมีตัวในทีมซ้ายก่อน'; return; }
    if (simRuneNeedsPartner(q) && !simRunePartnerKey) { $('simMsg').textContent = 'รูนนี้ต้องเลือกคู่ · ต้องมีเพื่อนอีกตัวในทีมซ้าย'; return; }
    simRunes.push({ id: q.id, n: Math.max(1, Math.min(q.max, simRuneN)), slot: simRuneNeedsSlot(q) ? simSlotVal(simRuneSlotKey) : null, partner: simRuneNeedsPartner(q) ? simSlotVal(simRunePartnerKey) : null });
    markSimStale(); renderSimRunes();
  });
  const clr = el('button', '', 'ล้างรูน'); clr.type = 'button';
  clr.addEventListener('click', () => { if (!simRunes.length) return; simRunes = []; markSimStale(); renderSimRunes(); });
  row.push(add, clr);
  tools.replaceChildren(...row);
  // รายการรูนที่ใส่แล้ว
  box.replaceChildren(...(simRunes.length ? simRunes.map((x, i) => {
    const q = simRuneOf(x.id), line = el('div', 'skline');
    const where = x.slot ? ` · ${ROW_TH[x.slot[0]]}${x.slot[1] + 1}` : '';
    const pair = x.partner ? ` · คู่ ${ROW_TH[x.partner[0]]}${x.partner[1] + 1}` : '';
    line.append(cell(`${x.id} ${q ? q.name : ''}${x.n > 1 ? ` ×${x.n}` : ''}${where}${pair}`), cell(q ? ' · ' + (runeKind(q.eff) === 'skill' ? skillLine(q) : runeText(q)) : '', 'was'));
    const rm = el('button', '', 'เอาออก'); rm.type = 'button';
    rm.addEventListener('click', () => { simRunes.splice(i, 1); markSimStale(); renderSimRunes(); });
    line.append(rm);
    return line;
  }) : [cell('ยังไม่ได้ใส่รูน', 'was')]));
}
$('simFoeTeam').addEventListener('click', () => { if (!simFoeBoss) return; simFoeBoss = false; markSimStale(); renderSimBoss(); });
$('simFoeBoss').addEventListener('click', () => { if (simFoeBoss) return; simFoeBoss = true; markSimStale(); renderSimBoss(); });
$('simBossPick').addEventListener('change', () => { simBossId = $('simBossPick').value; markSimStale(); renderSimBoss(); });
$('simBossK').addEventListener('change', () => { simBossK = Math.max(1, Math.round(+$('simBossK').value) || 1); markSimStale(); renderSimBoss(); });
$('tab-sim').addEventListener('click', () => { renderSimBoss(); renderSimRunes(); });
renderSimBoss(); renderSimRunes();
