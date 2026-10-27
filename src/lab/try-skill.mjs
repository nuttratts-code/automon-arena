// ลองค่าสกิลชั่วคราว (ไม่แก้ไฟล์ตัวละคร) · node lab/try-skill.mjs <ID> <ลำดับสกิล> <cd ms> [แมตช์]
// ใช้หาค่าเสนอให้ผู้ใช้อนุมัติก่อนใส่จริง
import { buildCharacterList } from '../core/characters.js';
import { measure } from './measure.mjs';

const [id, si, cd, n] = process.argv.slice(2);
const chars = buildCharacterList();
const c = chars.find(x => x.id === id);
if (!c || !c.skills[+si]) throw new Error('ไม่มีตัวหรือสกิลนี้');
if (+cd > 0) c.skills[+si].cd = +cd; else delete c.skills[+si].cd;
const r = await measure(chars, { n: +(n || 12000) });
const e = Object.fromEntries(Object.entries(r.levels).map(([lv, m]) => [lv, m[id].err]));
console.log(JSON.stringify({ id, cd: +cd, err: e }));
