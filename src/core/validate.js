import { AT_LANES, AT_ROWS, CTX_WHEN, DO_INFO, NAME_MAX, OF_STATS, OF_WHO, PERM_ABIL, PERM_STAT2, RARITIES, ROW_HINTS, RULES, SKILL_SPEC, TRIBES, cleanTags, sameTribeOk, skipSameIdOk } from './rules.js';
// ตัวตรวจค่า: ตรวจ config และทีมก่อนใช้ทุกครั้ง ผิดให้บอกทันที ไม่ปล่อยให้พังเงียบ
// ทีมอาจมาจากไฟล์เซฟหรือเครือข่าย (MVP2) จึงถือว่าไม่น่าเชื่อถือ ตรวจทุกช่อง

export const isNum = x => typeof x === 'number' && Number.isFinite(x);
export const isInt = x => Number.isInteger(x);
export const isLv3 = a => Array.isArray(a) && a.length === 3 && a.every(v => isNum(v) && v >= 0);

export function validateConfig(chars, rules = RULES) {
  const errors = [], warnings = [];
  if (!Array.isArray(chars) || chars.length === 0) return { ok: false, errors: ['ไม่มีรายชื่อตัวละคร'], warnings };
  const seen = new Set();
  for (const c of chars) {
    const who = c && typeof c.id === 'string' ? c.id : '(ไม่มี ID)';
    if (!c || typeof c.id !== 'string' || !/^[A-Z]{2}-\d{1,3}$/.test(c.id)) { errors.push(`${who}: ID ผิดรูปแบบ`); continue; }
    if (seen.has(c.id)) errors.push(`${who}: ID ซ้ำ`);
    seen.add(c.id);
    if (typeof c.name !== 'string' || !c.name.trim()) errors.push(`${who}: ไม่มีชื่อ`);
    else if (c.name.length > NAME_MAX || /[\u0000-\u001f\u007f<>]/.test(c.name)) errors.push(`${who}: ชื่อยาวเกิน ${NAME_MAX} ตัวอักษร หรือมีอักขระต้องห้าม`);
    if (!ROW_HINTS.includes(c.rowHint)) errors.push(`${who}: แถวแนะนำผิด`);
    if (!TRIBES.includes(c.tribe)) errors.push(`${who}: เผ่าหลัก "${c.tribe}" ไม่มีในเกม`);
    if (!Array.isArray(c.extraTribes)) errors.push(`${who}: เผ่าเพิ่มต้องเป็นรายการ`);
    else for (const t of c.extraTribes) {
      if (!TRIBES.includes(t)) errors.push(`${who}: เผ่าเพิ่ม "${t}" ไม่มีในเกม`);
      if (t === c.tribe) errors.push(`${who}: เผ่าเพิ่มซ้ำกับเผ่าหลัก`);
    }
    if (Array.isArray(c.extraTribes) && c.extraTribes.length > 1) errors.push(`${who}: เผ่าเพิ่มได้ 1 เผ่า`);
    if (!RARITIES.includes(c.rarity)) errors.push(`${who}: ความหายากผิด`);
    else if (rules.shop && rules.shop.prices && c.price !== rules.shop.prices[c.rarity]) errors.push(`${who}: ราคา ${c.price} ไม่ตรงกับความหายาก${c.rarity} (${rules.shop.prices[c.rarity]})`);
    for (const k of ['hp', 'atk', 'burn', 'shock']) if (!isLv3(c[k])) errors.push(`${who}: ${k} ต้องมีค่า Lv1/2/3 เป็นตัวเลข ≥ 0`);
    if (c.armorHit != null && !isLv3(c.armorHit)) errors.push(`${who}: เกราะ/ฮิต ต้องมีค่า Lv1/2/3 เป็นตัวเลข ≥ 0`);
    if (c.healHit != null && !isLv3(c.healHit)) errors.push(`${who}: ฟื้น/ฮิต ต้องมีค่า Lv1/2/3 เป็นตัวเลข ≥ 0`);
    if (c.armor != null) errors.push(`${who}: ช่องเกราะเริ่มเอาออกแล้ว ใช้สกิล "เริ่มแมตช์ → ได้เกราะ" แทน`);
    if (isLv3(c.hp) && c.hp.some(v => v <= 0)) errors.push(`${who}: HP ต้องมากกว่า 0`);
    if (!isLv3(c.cdMs) || c.cdMs.some(v => v <= 0)) errors.push(`${who}: คูลดาวน์ต้องมีค่า Lv1/2/3 มากกว่า 0`);
    if (!Array.isArray(c.multi) || c.multi.length !== 3 || !c.multi.every(m => isInt(m) && m >= 1 && m <= 10)) errors.push(`${who}: มัลติฮิตต้องมีค่า Lv1/2/3 เป็นจำนวนเต็ม 1–10`);
    if (!Array.isArray(c.skills)) errors.push(`${who}: รายการสกิลผิดรูปแบบ`);
    else if (c.skills.length > 6) errors.push(`${who}: สกิลเกิน 6 อัน`);
    else c.skills.forEach((s, k) => checkSkill(c, s, k, errors, rules));
  }
  // เรียกตัวมาสู้แทน (21 ต.ค.): ตัวที่เรียกต้องมีอยู่จริง ไม่ใช่ตัวเอง และไม่มีสกิลเรียกตัวต่อ (กันเรียกต่อกันไม่จบ)
  const byId = Object.fromEntries(chars.filter(c => c && typeof c.id === 'string').map(c => [c.id, c]));
  for (const c of chars) if (c && Array.isArray(c.skills)) c.skills.forEach((s, k) => {
    if (!s || s.do !== 'summon') return;
    const who = `${c.id} สกิล ${k + 1}`, t = Object.prototype.hasOwnProperty.call(byId, s.summon) ? byId[s.summon] : null;
    if (!t) errors.push(`${who}: ต้องระบุตัวละครที่จะเรียก (ID ที่มีในเกม)`);
    else if (t.id === c.id) errors.push(`${who}: เรียกตัวเองไม่ได้`);
    else if (Array.isArray(t.skills) && t.skills.some(x => x && x.do === 'summon')) errors.push(`${who}: ${t.id} มีสกิลเรียกตัวอยู่แล้ว เรียกต่อกันไม่ได้`);
  });
  // ร้านค้า: ทุกความหายากต้องมีค่าปลดล็อกและโอกาสสุ่มที่ถูกต้อง (กันร้านสุ่มได้ช่องว่าง)
  if (rules.shop) for (const r of RARITIES) {
    if (!isInt(rules.shop.unlockWins[r]) || rules.shop.unlockWins[r] < 0) errors.push(`ร้านค้า: ความหายาก${r} ไม่มีค่าปลดล็อก`);
    if (!isNum(rules.shop.weights[r]) || rules.shop.weights[r] < 0) errors.push(`ร้านค้า: ความหายาก${r} ไม่มีโอกาสสุ่ม`);
  }
  // แต่ละเผ่าต้องมีอย่างน้อย N ตัวที่ต่างกัน (นับเผ่าเพิ่มด้วย)
  for (const t of TRIBES) {
    const n = chars.filter(c => c && (c.tribe === t || (Array.isArray(c.extraTribes) && c.extraTribes.includes(t)))).length;
    if (n < rules.minPerTribe) errors.push(`เผ่า${t}: มี ${n} ตัว ต้องอย่างน้อย ${rules.minPerTribe}`);
  }
  return { ok: errors.length === 0, errors, warnings };
}

export function checkSkill(c, s, k, errors, rules) {
  const who = `${c.id} สกิล ${k + 1}`;
  if (!s || typeof s !== 'object') { errors.push(`${who}: ผิดรูปแบบ`); return; }
  const byWhen = Object.prototype.hasOwnProperty.call(SKILL_SPEC, s.when) ? SKILL_SPEC[s.when] : null;
  if (!byWhen) { errors.push(`${who}: เงื่อนไข "${String(s.when).slice(0, 20)}" ไม่รู้จัก`); return; }
  const tos = Object.prototype.hasOwnProperty.call(byWhen, s.do) ? byWhen[s.do] : null;
  if (!tos) { errors.push(`${who}: เงื่อนไข "${s.when}" ใช้คู่กับผล "${String(s.do).slice(0, 20)}" ไม่ได้`); return; }
  if (!tos.includes(s.to)) errors.push(`${who}: ผล "${s.do}" ใช้กับเป้า "${String(s.to).slice(0, 20)}" ไม่ได้`);
  if (!isLv3(s.v)) errors.push(`${who}: ค่าสกิลต้องมี Lv1/2/3`);
  if (s.tags != null && (!Array.isArray(s.tags) || JSON.stringify(cleanTags(s.tags)) !== JSON.stringify(s.tags))) errors.push(`${who}: แท็กผิดรูปแบบ (ไม่เกิน 3 แท็ก แท็กละไม่เกิน 12 ตัวอักษร ไม่ซ้ำ)`);
  if (s.cap != null) errors.push(`${who}: เพดานครั้ง/แมตช์เอาออกจากเกมแล้ว (combat-rules V1.6)`);
  if (s.chance != null && (!isNum(s.chance) || s.chance <= 0 || s.chance > 100)) errors.push(`${who}: โอกาสต้องอยู่ระหว่าง 1–100%`);
  if (DO_INFO[s.do].of) { // ผลแบบ % ของ (ชุด 7): ต้องเลือกค่าและเจ้าของค่า
    const o = s.of;
    if (!o || typeof o !== 'object' || !OF_STATS.includes(o.stat) || !OF_WHO.includes(o.who) || Object.keys(o).length !== 2) errors.push(`${who}: ต้องเลือก "คิดจากค่า" และ "ของใคร" ให้ถูกต้อง`);
    else if (o.who === 'ctx' && !CTX_WHEN[s.when]) errors.push(`${who}: เงื่อนไข "${s.when}" ไม่มีเป้าหมาย/ผู้ตี ให้ใช้เป็น "ของใคร"`);
  } else if (s.of != null) errors.push(`${who}: ช่อง "คิดจากค่า" ใช้ได้เฉพาะผลแบบ % ของ`);
  if (s.to === 'allyAt') { // ชุด 14: เพื่อนตามตำแหน่ง ต้องเลือกแถวและเลน
    const a = s.at;
    if (!a || typeof a !== 'object' || !AT_ROWS.includes(a.row) || !AT_LANES.includes(a.lane) || Object.keys(a).length !== 2) errors.push(`${who}: เพื่อนตามตำแหน่ง ต้องเลือกแถวและเลน`);
  } else if (s.at != null) errors.push(`${who}: ช่องตำแหน่งใช้ได้เฉพาะ "เพื่อนตามตำแหน่ง"`);
  if (s.sameTribe != null && (s.sameTribe !== true || !sameTribeOk(s))) errors.push(`${who}: "เฉพาะเผ่าเดียวกัน" ใช้ได้กับผู้รับฝ่ายเรา (ไม่รวมตัวเอง เพื่อนเผ่าเดียวกัน ตัวถัดไปที่ซื้อ และแบ่งเกราะ)`);
  if (s.skipSameId != null && (s.skipSameId !== true || !skipSameIdOk(s))) errors.push(`${who}: "ไม่ให้ผลกับตัวอื่นที่ ID เดียวกัน" ใช้ได้กับผู้รับฝ่ายเรา (ไม่รวมตัวเอง ตัวถัดไปที่ซื้อ และแบ่งเกราะ)`);
  if (s.cdGrow != null && (!isInt(s.cdGrow) || s.cdGrow < 1 || s.cdGrow > rules.cdGrowMax || s.cd == null)) errors.push(`${who}: คูลดาวน์สกิลเพิ่มต่อครั้ง ต้องเป็นจำนวนเต็ม 1–${rules.cdGrowMax}% และต้องตั้งคูลดาวน์สกิลก่อน`);
  if (s.summon != null && s.do !== 'summon') errors.push(`${who}: ช่องตัวที่เรียกใช้ได้เฉพาะสกิลเรียกตัวมาสู้แทน`);
  if (s.perm != null) { // ถาวร (22 ต.ค.): เฉพาะสกิลระหว่างสู้ที่ผลให้ฝ่ายเรา (DO_INFO.perm)
    if (s.perm !== true) errors.push(`${who}: ช่องถาวรต้องเป็น true`);
    else if (DO_INFO[s.do].shop) errors.push(`${who}: สกิลร้านค้าเป็นถาวรอยู่แล้ว ไม่ต้องติ๊กถาวร`);
    else if (!DO_INFO[s.do].perm) errors.push(`${who}: ผล "${s.do}" ตั้งเป็นถาวรไม่ได้ (ผลที่ใส่ศัตรู หรือผลเฉพาะชุด/ตอน down)`);
  }
  if (s.n != null) errors.push(`${who}: "ทุก N ชุด" เอาออกแล้ว ใช้คูลดาวน์สกิลแทน`);
  if (s.cd != null && (!isInt(s.cd) || s.cd < 100 || s.cd > rules.skillCdMaxMs)) errors.push(`${who}: คูลดาวน์สกิลต้องอยู่ระหว่าง 0.1–${rules.skillCdMaxMs / 1000} วิ`);
  if (s.lv != null && (!Array.isArray(s.lv) || !s.lv.length || s.lv.length > 3 || new Set(s.lv).size !== s.lv.length || !s.lv.every(x => isInt(x) && x >= 1 && x <= rules.maxLevel)))
    errors.push(`${who}: เลเวลที่ใช้ได้ผิดรูปแบบ`);
  const heal = rules.healTribes || [];
  if (DO_INFO[s.do].heal && ![c.tribe, ...(c.extraTribes || [])].some(t => heal.includes(t)))
    errors.push(`${who}: สกิลฟื้น HP ใช้ได้เฉพาะเผ่า${heal.join(' และ ')}`);
}

export const TEAM_PERM_KEYS = ['hp', 'atk', 'armor', 'burn', 'shock', 'multi', 'cdPct', ...PERM_STAT2, ...PERM_ABIL];

// ตรวจทีม 1 ฝั่ง · entries = [{ id, level, row, lane, perm }]
export function validateTeam(entries, charMap, rules = RULES) {
  const errors = [];
  if (!Array.isArray(entries)) return { ok: false, errors: ['ทีมต้องเป็นรายการ'] };
  if (entries.length > rules.maxBoard) errors.push(`บนบอร์ดมีได้ไม่เกิน ${rules.maxBoard} ตัว`);
  const slots = new Set();
  entries.forEach((e, i) => {
    const at = `ตัวที่ ${i + 1}`;
    if (!e || typeof e !== 'object' || Array.isArray(e)) { errors.push(`${at}: ข้อมูลผิดรูปแบบ`); return; }
    for (const k of Object.keys(e)) if (!['id', 'level', 'row', 'lane', 'perm'].includes(k)) errors.push(`${at}: มีช่องแปลกปลอม "${k}"`);
    if (typeof e.id !== 'string' || !Object.prototype.hasOwnProperty.call(charMap, e.id)) errors.push(`${at}: ไม่มีตัวละคร "${String(e.id).slice(0, 20)}"`);
    if (!isInt(e.level) || e.level < 1 || e.level > rules.maxLevel) errors.push(`${at}: เลเวลต้องเป็น 1–${rules.maxLevel}`);
    if (!isInt(e.row) || e.row < 0 || e.row >= rules.rows) errors.push(`${at}: แถวผิด`);
    if (!isInt(e.lane) || e.lane < 0 || e.lane >= rules.lanes) errors.push(`${at}: เลนผิด`);
    const key = `${e.row}:${e.lane}`;
    if (slots.has(key)) errors.push(`${at}: ช่องซ้ำกับตัวอื่น`);
    slots.add(key);
    if (e.perm != null) {
      if (typeof e.perm !== 'object' || Array.isArray(e.perm)) { errors.push(`${at}: ค่าถาวรผิดรูปแบบ`); return; }
      for (const [k, v] of Object.entries(e.perm)) {
        if (!TEAM_PERM_KEYS.includes(k)) { errors.push(`${at}: ค่าถาวร "${k}" ไม่รู้จัก`); continue; }
        if (!isNum(v) || v < 0) { errors.push(`${at}: ค่าถาวร ${k} ต้องเป็นตัวเลข ≥ 0`); continue; }
        if (k in rules.permCaps && v > rules.permCaps[k]) errors.push(`${at}: ค่าถาวร ${k} = ${v} เกินเพดาน ${rules.permCaps[k]}`);
        if (!(k in rules.permCaps) && v > rules.permSanityMax) errors.push(`${at}: ค่าถาวร ${k} สูงผิดปกติ`);
        if ((k === 'multi') && !isInt(v)) errors.push(`${at}: มัลติฮิตถาวรต้องเป็นจำนวนเต็ม`);
      }
    }
  });
  return { ok: errors.length === 0, errors };
}

