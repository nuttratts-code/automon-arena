// นำค่าห้องบาลานซ์ (config/main ที่บันทึกด้วย ArtifactData out_dir) เข้า core/characters.js · แทนเฉพาะ ID ที่มีใน config
// รัน: node tools/apply-config.mjs <config.json> [overrides.json]  (overrides = { ID: { skills: [...] } } ที่ผู้ใช้ตัดสินเพิ่ม)
// ค่าที่ไม่มีใน config = ค่าเดิม · skills ถ้ามี = แทนทั้งชุด · extraTribes แทนเผ่าเพิ่ม · cdMs (มิลลิวินาที) → วินาทีในตาราง
// ชุด 19: ความหายาก (rarity) → ราคาตาม RULES.shop.prices · ชุด 18: ค่าพลัง healHit (ฟื้น/ฮิต) → คอลัมน์ที่ 15 ของแถว · ชุด 17: ช่องสกิลใหม่ skipSameId (ไม่ให้ผลกับตัวอื่นที่ ID เดียวกัน) · cdGrow (คูลดาวน์สกิลเพิ่ม % ทุกครั้งที่ใช้)
import fs from 'fs';
import { ROWS, SKILLS } from '../core/characters.js';
import { RULES, cleanRuleEdits, setRuleEdits } from '../core/rules.js';
import { RULES_USER } from '../core/rules-user.js';
const cfg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const ov = process.argv[3] ? JSON.parse(fs.readFileSync(process.argv[3], 'utf8')) : {};
const q = s => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
const arr = a => `[${a.join(',')}]`;
const KEYS = ['when', 'do', 'summon', 'of', 'perm', 'sameTribe', 'skipSameId', 'at', 'to', 'v', 'cd', 'cdGrow', 'lv', 'chance', 'tags'];
const val = (k, x) => (Array.isArray(x) ? `[${x.map(y => (typeof y === 'string' ? q(y) : y)).join(', ')}]`
  : typeof x === 'object' ? `{ ${Object.entries(x).map(([a, b]) => `${a}: ${typeof b === 'string' ? q(b) : b}`).join(', ')} }`
  : typeof x === 'string' ? q(x) : String(x));
const sk = s => {
  for (const k of Object.keys(s)) if (!KEYS.includes(k)) throw new Error('ช่องสกิลไม่รู้จัก ' + k);
  return `{ ${KEYS.filter(k => s[k] !== undefined).map(k => `${k}: ${val(k, s[k])}`).join(', ')} }`;
};
// set 76: game-rule edits (กฎเกม tab) → core/rules-user.js (merged onto the saved user values) · prices below follow the new values
if (cfg.rules && Object.keys(cfg.rules).length) {
  const good = cleanRuleEdits(cfg.rules), bad = Object.keys(cfg.rules).filter(k => !(k in good));
  if (bad.length) throw new Error('ค่ากฎเกมผิด: ' + bad.join(', '));
  const all = { ...cleanRuleEdits(RULES_USER), ...good };
  const head = fs.readFileSync('core/rules-user.js', 'utf8').split('export const RULES_USER')[0];
  const body = Object.keys(all).length ? `{\n${Object.entries(all).map(([k, v]) => `  ${q(k)}: ${v},`).join('\n')}\n}` : '{}';
  fs.writeFileSync('core/rules-user.js', `${head}export const RULES_USER = ${body};\n`);
  setRuleEdits(RULES, good); console.log('กฎเกม', Object.keys(good).length, 'ค่า:', Object.keys(good).join(' '));
}
const src = fs.readFileSync('core/characters.js', 'utf8');
let out = src;
const chars = { ...cfg.chars };
for (const [id, o] of Object.entries(ov)) chars[id] = { ...(chars[id] || {}), ...o };
const changed = [];
for (const [id, c] of Object.entries(chars)) {
  const r = ROWS.find(x => x[0] === id); if (!r) throw new Error('ไม่มี ' + id);
  const n = structuredClone(r);
  if (c.name != null) n[1] = c.name;
  if (c.extraTribes) n[3] = c.extraTribes[0] || '';
  if (c.rarity != null) { const p = RULES.shop.prices[c.rarity]; if (!p) throw new Error('ความหายากไม่รู้จัก ' + id); n[4] = c.rarity; n[5] = p; } // ชุด 19: ความหายาก → ราคาตามกฎร้านค้า
  if (c.rowHint != null) n[6] = c.rowHint;
  if (c.hp) n[7] = c.hp; if (c.atk) n[8] = c.atk;
  if (c.cdMs) { const s = c.cdMs.map(x => x / 1000); n[9] = s.every(x => x === s[0]) ? s[0] : s; }
  if (c.multi) n[10] = c.multi; if (c.burn) n[11] = c.burn; if (c.shock) n[12] = c.shock;
  if (c.armorHit) n[13] = c.armorHit;
  if (c.healHit) { n[13] = n[13] || [0, 0, 0]; n[14] = c.healHit; } // ฟื้น/ฮิต (ชุด 18) ต่อท้าย เกราะ/ฮิต
  if (n[14] && n[14].every(x => x === 0)) n.length = 14;
  if (n.length === 14 && n[13] && n[13].every(x => x === 0)) n.length = 13;
  const cd = Array.isArray(n[9]) ? arr(n[9]) : (Number.isInteger(n[9]) ? n[9].toFixed(1) : String(n[9]));
  const line = `  [${q(n[0])},${q(n[1])},${q(n[2])},${q(n[3])},${q(n[4])},${n[5]},${q(n[6])},${arr(n[7])},${arr(n[8])},${cd},${arr(n[10])},${arr(n[11])},${arr(n[12])}${n[13] ? ',' + arr(n[13]) : ''}${n[14] ? ',' + arr(n[14]) : ''}],`;
  const re = new RegExp(`^  \\['${id}',.*$`, 'm'); if (!re.test(out)) throw new Error('หาแถวไม่เจอ ' + id);
  out = out.replace(re, () => line);
  if (c.skills) {
    const start = out.indexOf(`  '${id}': [`);
    const body = c.skills.length ? `  '${id}': [${c.skills.map(sk).join(',\n' + ' '.repeat(id.length + 7))}],` : '';
    if (start >= 0) { // แทนช่วงเดิม (หาวงเล็บปิดคู่)
      let i = out.indexOf('[', start), d = 0, j = i;
      for (; j < out.length; j++) { if (out[j] === '[') d++; else if (out[j] === ']' && --d === 0) break; }
      let end = out.indexOf('\n', j); // รวมคอมเมนต์ท้ายบรรทัด (ค่าเก่า)
      out = out.slice(0, start) + body + out.slice(end + (body ? 0 : 1));
    } else if (body) out = out.replace(/\n};\n\nexport function buildCharacterList/, `\n${body}\n};\n\nexport function buildCharacterList`);
  }
  changed.push(id);
}
fs.writeFileSync('core/characters.js', out);
// ชุด 32+: โบนัสเผ่า (cfg.tribes) → แทนบรรทัดใน RULES.tribeBonus ของ core/rules.js (เก็บคอมเมนต์ท้ายบรรทัด · ลำดับช่องเดิมก่อน ช่องใหม่ต่อท้าย)
if (cfg.tribes && Object.keys(cfg.tribes).length) {
  let rs = fs.readFileSync('core/rules.js', 'utf8'); const tch = [];
  for (const [t, o] of Object.entries(cfg.tribes)) {
    const cur = RULES.tribeBonus[t]; if (!cur) throw new Error('ไม่มีเผ่า ' + t);
    for (const [k, v] of Object.entries(o)) if (!Array.isArray(v) || v.length !== 3 || v.some(x => typeof x !== 'number' || !isFinite(x))) throw new Error(`โบนัสเผ่า ${t}.${k} ต้องเป็นเลข 3 ช่อง`);
    const keys = [...Object.keys(cur), ...Object.keys(o).filter(k => !(k in cur))];
    const body = keys.filter(k => o[k] || cur[k]).map(k => `${k}: [${(o[k] || cur[k]).join(', ')}]`).join(', ');
    const re = new RegExp(`^(    '${t}':\\s*)\\{[^}]*\\},(.*)$`, 'm'); if (!re.test(rs)) throw new Error('หาบรรทัดเผ่าไม่เจอ ' + t);
    rs = rs.replace(re, (_, a, tail) => `${a}{ ${body} },${tail}`); tch.push(t);
  }
  fs.writeFileSync('core/rules.js', rs); console.log('โบนัสเผ่า', tch.length, 'เผ่า:', tch.join(' '));
}
console.log('แก้', changed.length, 'ตัว:', changed.join(' '));
