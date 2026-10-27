// ตัวช่วยทดสอบร่วมของทุกไฟล์ t-*.js (mk dummy u fight eq ok …) · แยกจาก mechanics.js (ชุด D) · ห้ามมีเทสต์ในไฟล์นี้
import { simulate } from '../core/battle.js';
import { RULES } from '../core/rules.js';
import { buildTeam, makeCharMap } from '../core/team.js';
import { validateConfig } from '../core/validate.js';
// ชุดทดสอบกลไก: ตรวจว่าตัวคำนวณทำตาม combat-rules ทุกข้อ · รันได้ทั้งใน node และในหน้าเว็บ


export const NEVER = 900000;
// ตัวช่วยทดสอบ: armor = เกราะเริ่ม (แปลงเป็นสกิล "เริ่มแมตช์ → ได้เกราะ" ตามกฎ V1.8) · multi ตัวเลขเดียว = ทุกเลเวล
export function mk(id, o = {}) {
  const { armor, multi = 1, cdMs = 1000, ...rest } = o;
  const c = { id, name: id, tribe: 'เหล็กกล้า', extraTribes: [], rarity: 'ธรรมดา', price: 3, rowHint: 'หน้า',
    hp: [100, 200, 400], atk: [10, 20, 40], cdMs: Array.isArray(cdMs) ? cdMs : [cdMs, cdMs, cdMs], multi: Array.isArray(multi) ? multi : [multi, multi, multi],
    burn: [0, 0, 0], shock: [0, 0, 0], skills: [], ...rest };
  if (armor && armor.some(x => x > 0)) c.skills = [{ when: 'matchStart', do: 'armor', to: 'self', v: armor }, ...c.skills];
  return c;
}
export const L3 = v => [v, v, v];
export const skErr = c => validateConfig([c]).errors.filter(e => !e.startsWith('เผ่า'));
export const dummy = (id, o = {}) => mk(id, { atk: L3(0), cdMs: NEVER, hp: L3(10000), ...o });
export const u = (id, row = 0, lane = 0, level = 1, perm) => (perm ? { id, level, row, lane, perm } : { id, level, row, lane });
// ทดสอบกลไกเดี่ยวโดยปิดโบนัสเผ่า (ตัวทดสอบเป็นเผ่าเดียวกันหมด) · ทดสอบเผ่าเปิดเอง
export const NT = { ...RULES, tribesOn: false };
export const fight = (chars, A, B, opts = {}) => { const m = makeCharMap(chars); return simulate(buildTeam(A, m), buildTeam(B, m), { rules: NT, ...opts }); };
export const fightT = (chars, A, B, opts = {}) => { const m = makeCharMap(chars); return simulate(buildTeam(A, m), buildTeam(B, m), opts); };
export const TBN = RULES.tribeBonus;
// ชุด 38: เทสต์โบนัสเผ่ารุ่นเดิมตรึงค่าเอง ไม่ผูกกับค่าที่ผู้ใช้ปรับในห้องบาลานซ์ (เสริมจาก NT: เปิดโบนัสเผ่า)
export const TBR = o => ({ ...RULES, tribeBonus: { ...structuredClone(RULES.tribeBonus), ...o } });
export const ev = (r, k, f = () => true) => r.events.filter(e => e.k === k && f(e));
export const uidOf = (r, side, id) => r.events[0].units.find(x => x.side === side && x.id === id).uid;

export function eq(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg}: ได้ ${JSON.stringify(a)} ควรเป็น ${JSON.stringify(b)}`); }
export function ok(c, msg) { if (!c) throw new Error(msg); }

export function randomTeam(rng, chars, size = 6, level = 1) {
  const slots = [];
  for (let r = 0; r < 3; r++) for (let l = 0; l < 2; l++) slots.push([r, l]);
  const out = [];
  for (let i = 0; i < size; i++) {
    const s = slots.splice(rng.int(slots.length), 1)[0];
    out.push(u(rng.pick(chars).id, s[0], s[1], typeof level === 'number' ? level : 1 + rng.int(3)));
  }
  return out;
}
