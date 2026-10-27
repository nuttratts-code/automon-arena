import { simulate } from './battle.js';
import { botShop } from './bot.js';
import { makeRng } from './rng.js';
import { RULES } from './rules.js';
import { endMatch, newRun, startRound, teamEntries } from './shop.js';
import { buildTeam, makeCharMap } from './team.js';
import { validateTeam } from './validate.js';
// ทีมบอทเตรียมไว้ล่วงหน้า (ชุด 23 · ผู้ใช้เลือก 24 ต.ค.) · ข้อมูลล้วน ไม่แตะหน้าจอ (ย้ายไปเซิร์ฟเวอร์ได้)
// - 10 ขั้นตามจำนวนชนะของผู้เล่น (0–9) × 3 ช่วงรอบ × ง่าย/กลาง/ยาก = 90 ทีม (ผู้ใช้เลือก 24 ต.ค.)
// - ช่วงรอบ = จำนวนแพ้ก่อนแมตช์ (รอบ − 1 − ขั้น): ต้น 0–2 · กลาง 3–5 · ปลาย 6–9 (ผู้ใช้เลือก · ค่าเสนอ)
// - ชุด 24 (ผู้ใช้เลือก A · 2A): ทีมของช่วงมาจากรอบไม่เกินรอบแรกของช่วงนั้นเท่านั้น (แพ้ ≤ ค่าต่ำสุดของช่วง)
//   → รอบทีมบอทไม่เกินรอบของผู้เล่นเสมอ · ตัวอย่างน้อยใช้เท่าที่มี ไม่ยืมรอบที่สูงกว่า · ไม่มีเลยใช้ขั้นก่อนหน้า (รอบต่ำกว่า)
// - สร้างจาก run จำลอง (บอทเล่นกับบอท) → เก็บทีมตอนกดสู้ พร้อมเงิน/รอบ/ค่าถาวรที่สะสมได้จริง (ผู้ใช้เลือก 2A)
// - จัดอันดับความแรงในช่วงเดียวกัน แล้วเลือกอันดับ 25/50/75% เป็น ง่าย/กลาง/ยาก (ผู้ใช้เลือก 3A · % เป็นค่าเสนอ)
// - ตอนเล่น สุ่ม 1 ทีมจากขั้น+ช่วงนั้นด้วยเมล็ดของ run + รอบ (เล่นต่อจากเซฟได้คู่แข่งเดิม)
// - ตอนโหลด ตรวจทุกช่องด้วยตัวตรวจทีมตัวเดียวกับผู้เล่น · แฮชค่าเกมไม่ตรง/ข้อมูลผิด = ไม่ใช้ (เกมกลับไปใช้บอทซื้อสด)
export const BOT_TIERS = ['ง่าย', 'กลาง', 'ยาก'];
export const BOT_SPANS = [[0, 2], [3, 5], [6, 9]]; // จำนวนแพ้ก่อนแมตช์ (ค่าเสนอ · ผู้ใช้เลือก)
export const BOT_SPAN_TH = ['ต้น', 'กลาง', 'ปลาย'];
export const BOT_GEN = { runs: 1000, seed: 2310, perStage: 120, refOpp: 30, pct: [25, 50, 75] }; // ค่าเสนอ (ชุด 23 · ชุด 24 เลิกใช้ minPool)
export function spanOf(losses) {
  const n = Math.max(0, losses | 0);
  const i = BOT_SPANS.findIndex(([a, b]) => n >= a && n <= b);
  return i < 0 ? BOT_SPANS.length - 1 : i;
}

// ---------- run จำลอง 1 รอบ (ผู้เล่น = บอท) · ใช้ทั้งสร้างทีมและวัดความยาวแมตช์ ----------
// opponent(P, B, round) → entries ของคู่แข่ง หรือ null = ใช้บอทซื้อสด B · onMatch(info) เรียกทุกแมตช์
export function simRun(chars, rules, seed, opponent, onMatch) {
  const cm = makeCharMap(chars);
  const P = newRun(chars, seed >>> 0, rules), B = newRun(chars, ((seed ^ 0xA5A5A5A5) >>> 0), rules);
  for (let guard = 0; guard < 40 && !P.over; guard++) {
    startRound(P, chars, rules); startRound(B, chars, rules, { unlockWins: P.wins });
    botShop(P, chars, rules);
    const preset = opponent ? opponent(P) : null;
    if (!preset) botShop(B, chars, rules, { unlockWins: P.wins });
    const mine = teamEntries(P), theirs = preset || teamEntries(B);
    const res = simulate(buildTeam(mine, cm, rules), buildTeam(theirs, cm, rules), { rules, log: false });
    const stage = P.wins, round = P.round, gold = P.gold;
    const gain = side => (res.perm || []).filter(g => g.side === side);
    endMatch(P, res.winner !== 1, chars, rules, gain(0));
    if (!preset) { endMatch(B, res.winner === 1, chars, rules, gain(1)); B.over = false; B.hearts = rules.shop.hearts; B.lastWon = P.lastWon; }
    if (onMatch) onMatch({ stage, round, gold, team: mine, winner: res.winner, timeMs: res.timeMs, aborted: res.aborted || null });
  }
  return P;
}

// ---------- สร้างชุดทีม (รันใน node ผ่าน lab/botgen.mjs) ----------
// เก็บทีมจาก run จำลองแยกตาม ขั้น × จำนวนแพ้ก่อนแมตช์ (0 ถึง หัวใจ − 1)
export function gatherBotPool(chars, rules = RULES, opt = {}) {
  const g = { ...BOT_GEN, ...opt }, n = rules.shop.winsToFinish, L = rules.shop.hearts;
  const pool = Array.from({ length: n }, () => Array.from({ length: L }, () => []));
  for (let r = 0; r < g.runs; r++) {
    simRun(chars, rules, (g.seed + Math.imul(r + 1, 0x9E3779B1)) >>> 0, null, m => {
      const loss = m.round - 1 - m.stage;
      if (m.team.length && loss >= 0 && loss < L) pool[m.stage][loss].push({ team: m.team, round: m.round });
    });
  }
  return pool;
}
// ทีมตัวอย่างของ ขั้น k ช่วง b (ชุด 24): แพ้ไม่เกินค่าต่ำสุดของช่วง → รอบ ≤ k + 1 + ค่าต่ำสุด
// ไม่มีตัวอย่างเลย = ใช้ขั้นก่อนหน้าด้วยเพดานแพ้เดียวกัน (รอบต่ำกว่าอีก) · from = ขั้นที่ใช้จริง
export function spanPool(pool, k, b) {
  const lim = BOT_SPANS[b][0];
  for (let s = k; s >= 0; s--) {
    const list = pool[s].slice(0, lim + 1).flat();
    if (list.length) return { from: s, list };
  }
  return { from: k, list: [] };
}
// stages = ขั้นที่จะคำนวณ (ใช้แบ่งงานหลายโปรเซส) · ขั้นที่ไม่คำนวณได้ null
export function genBotTeams(chars, rules = RULES, opt = {}, pool = null) {
  const g = { ...BOT_GEN, ...opt }, cm = makeCharMap(chars);
  pool = pool || gatherBotPool(chars, rules, g);
  const only = g.stages ? new Set(g.stages) : null;
  const stages = pool.map((_, k) => {
    if (only && !only.has(k)) return null;
    return BOT_SPANS.map((__, b) => {
      const { from, list } = spanPool(pool, k, b);
      if (!list.length) return [];
      const rng = makeRng((g.seed ^ Math.imul(k + 1, 0x85EBCA6B) ^ Math.imul(b + 1, 0xC2B2AE35)) >>> 0);
      const pick = (arr, m) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rng.int(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, m); };
      const cand = pick(list, g.perStage).map(x => ({ ...x })), ref = pick(list, g.refOpp).map(x => buildTeam(x.team, cm, rules));
      // ความแรง = อัตราชนะ (เสมอ = ครึ่ง) เมื่อสู้กับทีมอ้างอิงชุดเดียวกันของขั้น+ช่วงนั้น
      for (const c of cand) {
        const mine = buildTeam(c.team, cm, rules); let s = 0;
        for (const o of ref) { const w = simulate(mine, o, { rules, log: false }).winner; s += w === 0 ? 1 : w == null ? 0.5 : 0; }
        c.power = Math.round((s / ref.length) * 1000) / 10;
      }
      cand.sort((a, b2) => a.power - b2.power || a.round - b2.round);
      return g.pct.map((p, i) => { const c = cand[Math.min(cand.length - 1, Math.floor((p / 100) * cand.length))]; return { tier: BOT_TIERS[i], span: b, from, round: c.round, power: c.power, team: structuredClone(c.team) }; });
    });
  });
  const sizes = pool.map((_, k) => BOT_SPANS.map((__, b) => spanPool(pool, k, b).list.length));
  return { v: 3, gen: { ...g, spans: BOT_SPANS }, sizes, stages };
}

// ---------- ตรวจข้อมูลทีมบอทตอนโหลด ----------
export const btOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
export const btObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
export function validateBotTeams(data, cm, rules = RULES, hash = null) {
  const errors = [], n = rules.shop.winsToFinish;
  if (!btObj(data) || data.v !== 3 || !Array.isArray(data.stages)) return { ok: false, errors: ['ข้อมูลทีมบอทผิดรูปแบบ'] };
  if (hash != null && data.hash !== hash) return { ok: false, errors: ['ทีมบอทสร้างจากค่าเกมชุดเก่า (แฮชไม่ตรง) ต้องสร้างใหม่'] };
  if (data.stages.length !== n) errors.push(`ต้องมี ${n} ขั้น`);
  data.stages.forEach((spans, k) => {
    if (!Array.isArray(spans) || spans.length !== BOT_SPANS.length) { errors.push(`ขั้น ${k}: ต้องมี ${BOT_SPANS.length} ช่วงรอบ`); return; }
    spans.forEach((list, b) => {
      if (!Array.isArray(list) || list.length !== BOT_TIERS.length) { errors.push(`ขั้น ${k} ช่วง ${b + 1}: ต้องมี ${BOT_TIERS.length} ทีม`); return; }
      list.forEach((t, i) => {
        const at = `ขั้น ${k} ช่วง ${b + 1} ทีม ${i + 1}`;
        if (!btObj(t) || !Object.keys(t).every(x => ['tier', 'span', 'from', 'round', 'power', 'team'].includes(x))) { errors.push(`${at}: ผิดรูปแบบ`); return; }
        if (t.tier !== BOT_TIERS[i]) errors.push(`${at}: ระดับผิด`);
        if (t.span !== b) errors.push(`${at}: ช่วงผิด`);
        if (!Number.isInteger(t.from) || t.from < 0 || t.from > k) errors.push(`${at}: ขั้นที่มาผิด`);
        // ชุด 24: รอบของทีมต้องไม่เกินรอบแรกของช่วงนี้ (ผู้เล่นในช่วงนี้อยู่รอบนี้หรือหลังกว่า)
        if (!Number.isInteger(t.round) || t.round < 1 || t.round > k + 1 + BOT_SPANS[b][0]) errors.push(`${at}: รอบผิด/เกินรอบของผู้เล่น`);
        if (typeof t.power !== 'number' || !(t.power >= 0 && t.power <= 100)) errors.push(`${at}: ความแรงผิด`);
        if (!Array.isArray(t.team) || !t.team.length) { errors.push(`${at}: ทีมว่าง`); return; }
        const v = validateTeam(t.team, cm, rules);
        if (!v.ok) errors.push(`${at}: ${v.errors[0]}`);
      });
    });
  });
  return { ok: errors.length === 0, errors };
}

// ---------- เลือกคู่แข่ง: ขั้น = จำนวนชนะ · ช่วง = จำนวนแพ้ก่อนแมตช์ (รอบ − 1 − ชนะ) · สุ่มจากเมล็ดของ run + รอบ (ผลเดิมทุกครั้ง) ----------
export function pickBotTeam(data, wins, seed, round) {
  const k = Math.max(0, Math.min(data.stages.length - 1, wins | 0));
  const b = spanOf((round | 0) - 1 - k), list = data.stages[k][b];
  const i = makeRng(((seed >>> 0) ^ Math.imul((round | 0) + 1, 0x27D4EB2F)) >>> 0).int(list.length);
  const t = list[i];
  return { tier: t.tier, stage: k, span: b, team: structuredClone(t.team) };
}
