import { simulate } from '../core/battle.js';
import { makeRng } from '../core/rng.js';
import { TRIBES, pickHintRow } from '../core/rules.js';
import { done } from '../core/shop.js';
import { buildTeam, makeCharMap } from '../core/team.js';
// ตัววิเคราะห์บาลานซ์: ใช้ตัวคำนวณเดียวกับเกม · เมล็ดสุ่มเดิม = ทีมชุดเดิม จึงเทียบก่อน/หลังแก้ได้ตรงๆ




export const HINT = { 'หน้า': 0, 'กลาง': 1, 'ที่ไหนก็ได้': 1, 'หลัง': 2 };
export const SLOTS = [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1]];
export const pause = () => new Promise(r => setTimeout(r, 0));

// วางตัวตามแถวแนะนำ (หน้าก่อน) สลับเลนแบบสุ่ม ให้ใกล้กับทีมที่ผู้เล่นจัดจริง
export function placeByHint(rng, picks, levelOf) {
  const order = picks.map(c => ({ c, k: pickHintRow(c.rowHint, 0) != null ? pickHintRow(c.rowHint, rng.next()) : HINT[c.rowHint] ?? 1, r: rng.next() })).sort((a, b) => a.k - b.k || a.r - b.r);
  const flip = [0, 1, 2].map(() => (rng.next() < 0.5 ? 1 : 0)); // สลับเลนบน/ล่างของแต่ละแถวแบบสุ่ม
  return order.map((o, i) => {
    const [row, lane] = SLOTS[i];
    return { id: o.c.id, level: levelOf(), row, lane: lane ^ flip[row] };
  });
}
export const levelPicker = (rng, level) => () => (level === 'mix' ? 1 + rng.int(3) : level);
export const winScore = (r, side) => (r.winner == null ? 0.5 : r.winner === side ? 1 : 0);

export function randomTeam(rng, chars, level) {
  const picks = Array.from({ length: 6 }, () => rng.pick(chars));
  return placeByHint(rng, picks, levelPicker(rng, level));
}
export function activeTribes(entries, map, rules) {
  const counts = {};
  for (const id of new Set(entries.map(e => e.id))) for (const t of [map[id].tribe, ...map[id].extraTribes]) counts[t] = (counts[t] || 0) + 1;
  return TRIBES.filter(t => (counts[t] || 0) >= rules.tribeSteps[0]);
}

// อันดับตัวละคร: อัตราชนะของทีมที่มีตัวนี้ ในแมตช์ทีมสุ่ม · พร้อมสัดส่วนทีมที่ชนะที่เปิดแต่ละเผ่า
export async function charRanking(chars, rules, { n = 1500, seed = 101, level = 1, onProgress } = {}) {
  const map = makeCharMap(chars), rng = makeRng(seed);
  const stat = Object.fromEntries(chars.map(c => [c.id, { games: 0, wins: 0, dealt: 0 }]));
  const tribe = Object.fromEntries(TRIBES.map(t => [t, { teams: 0, winTeams: 0 }]));
  let decided = 0, totalTime = 0, aborted = 0, abortSample = null; // aborted = แมตช์ที่ตัวตัดนิรภัยหยุด (ชุด 17)
  const TOP = 10, top = []; // ชุด 38: แมตช์ต้องสงสัย (ดาเมจรวมสองฝั่ง ÷ HP สูงสุดรวมทุกตัวสองฝั่ง · A6) เก็บ 10 อันดับ
  for (let i = 0; i < n; i++) {
    const A = randomTeam(rng, chars, level), B = randomTeam(rng, chars, level);
    const r = simulate(buildTeam(A, map, rules), buildTeam(B, map, rules), { rules, log: false });
    totalTime += r.timeMs;
    { // ชุด 38: เก็บเฉพาะแมตช์ที่ดาเมจพุ่งผิดปกติ (ไม่มี log/detail · ต้นทุน O(1) ต่อแมตช์)
      const dA = Math.round(r.units.filter(u => u.side === 0).reduce((s, u) => s + u.dealt, 0)); // A7: dealt has burn shares (fractions)
      const dB = Math.round(r.units.filter(u => u.side === 1).reduce((s, u) => s + u.dealt, 0));
      const hpT = r.units.reduce((s, u) => s + (u.maxHp || 0), 0);
      const dmgTotal = dA + dB;
      const rec = {
        level, i, runSeed: seed, winner: r.winner, timeMs: r.timeMs,
        dmgTotal, dmgA: dA, dmgB: dB, hpTotal: hpT,
        dmgPerHp: +(dmgTotal / Math.max(1, hpT)).toFixed(2),
        dps: +(dmgTotal / Math.max(1, r.timeMs / 1000)).toFixed(1),
        sideRatio: +(Math.max(dA, dB) / Math.max(1, dmgTotal)).toFixed(2),
        survivors: [r.units.filter(u => u.side === 0 && !u.down).length, r.units.filter(u => u.side === 1 && !u.down).length],
        perUnit: r.units.map(u => ({ id: u.id, side: u.side, dealt: Math.round(u.dealt), taken: u.taken, hp: u.hp })),
        teamA: A.map(e => ({ id: e.id, level: e.level, row: e.row, lane: e.lane })),
        teamB: B.map(e => ({ id: e.id, level: e.level, row: e.row, lane: e.lane })),
        aborted: r.aborted || null,
      };
      if (top.length < TOP || rec.dmgPerHp > top[top.length - 1].dmgPerHp) {
        top.push(rec); top.sort((x, y) => y.dmgPerHp - x.dmgPerHp); if (top.length > TOP) top.pop();
      }
    }
    if (r.aborted) { aborted++; abortSample = abortSample || { A: A.map(e => e.id), B: B.map(e => e.id), why: r.aborted }; }
    [A, B].forEach((team, side) => {
      const w = winScore(r, side);
      for (const id of new Set(team.map(e => e.id))) { stat[id].games++; stat[id].wins += w; }
      for (const u of r.units.filter(u => u.side === side)) stat[u.id].dealt += u.dealt;
      for (const t of activeTribes(team, map, rules)) { tribe[t].teams++; if (r.winner === side) tribe[t].winTeams++; }
    });
    if (r.winner != null) decided++;
    if (i % 100 === 99) { onProgress && onProgress((i + 1) / n); await pause(); }
  }
  const rows = chars.map(c => ({ id: c.id, name: c.name, tribe: c.tribe, rarity: c.rarity, games: stat[c.id].games,
    win: stat[c.id].games ? stat[c.id].wins / stat[c.id].games * 100 : 0, dealt: stat[c.id].games ? stat[c.id].dealt / stat[c.id].games : 0 }));
  const byRarity = {};
  for (const r of rows) (byRarity[r.rarity] = byRarity[r.rarity] || []).push(r.win);
  const rarityMean = Object.fromEntries(Object.entries(byRarity).map(([k, v]) => [k, v.reduce((a, b) => a + b, 0) / v.length]));
  for (const r of rows) r.vsRarity = r.win - rarityMean[r.rarity];
  const tribeWin = Object.fromEntries(TRIBES.map(t => [t, { inTeams: tribe[t].teams / (2 * n) * 100, inWinners: decided ? tribe[t].winTeams / decided * 100 : 0 }]));
  return { rows, rarityMean, tribeWin, avgTime: totalTime / n / 1000, aborted, abortSample, top };
}

// ---------- วิธีวัดมาตรฐาน (ชุด 13 · ใช้ร่วมกันระหว่างห้องบาลานซ์กับ lab/measure.mjs ผลจึงตรงกันเสมอ) ----------
// เป้าอัตราชนะ = ค่าเฉลี่ยทั้งเกม + 5 จุดต่อราคา (เทียบราคา 5) − 2 จุดถ้ามีสกิลร้านค้า (combat-rules กฎบาลานซ์ตามความหายาก)
export const TARGET_RULE = { slope: 5, shopDiscount: 2 };
export const SHOP_WHEN_LIST = ['buy', 'sell', 'merge', 'matchEnd', 'matchWin', 'shopStart'];
export const rawTarget = c => TARGET_RULE.slope * (c.price - 5) - (c.skills.some(s => SHOP_WHEN_LIST.includes(s.when)) ? TARGET_RULE.shopDiscount : 0);
export const targetsFor = (chars, mean) => { const off = chars.reduce((a, c) => a + rawTarget(c), 0) / chars.length; return Object.fromEntries(chars.map(c => [c.id, mean + rawTarget(c) - off])); };
// เกณฑ์ผ่าน (combat-rules V1.23): เลเวลผสม ±6 · รายเลเวล ±10 · ใกล้ขอบ = ผสม ≥5 หรือรายเลเวล ≥9 · ความยาวแมตช์ 20–40 วิ
export const MEASURE = { seed: 4242, band: 6, near: 5, lvBand: 10, quickN: 12000, fullN: 24000, levels: ['mix', 1, 2, 3], matchSec: [20, 40] };
export function verdict(err) {
  const mixA = Math.abs(err.mix), lvA = Math.max(...[1, 2, 3].map(L => Math.abs(err[L])));
  return mixA > MEASURE.band || lvA > MEASURE.lvBand ? 'out' : mixA >= MEASURE.near || lvA >= MEASURE.lvBand - 1 ? 'near' : 'ok';
}
export async function measureAll(chars, rules, { n = MEASURE.quickN, seed = MEASURE.seed, levels = MEASURE.levels, onProgress } = {}) {
  const out = { n, seed, levels: {}, avgTime: {}, tribeWin: null, aborted: {}, abortSample: null };
  for (let i = 0; i < levels.length; i++) {
    const lv = levels[i];
    const res = await charRanking(chars, rules, { n, seed, level: lv, onProgress: onProgress && (x => onProgress((i + x) / levels.length)) });
    const mean = res.rows.reduce((a, r) => a + r.win, 0) / res.rows.length;
    const tg = targetsFor(chars, mean);
    out.levels[lv] = Object.fromEntries(res.rows.map(r => [r.id, { win: +r.win.toFixed(1), err: +(r.win - tg[r.id]).toFixed(1), games: r.games }]));
    out.avgTime[lv] = +res.avgTime.toFixed(1);
    out.aborted[lv] = res.aborted; out.abortSample = out.abortSample || res.abortSample;
    out.tribeWin = out.tribeWin || res.tribeWin;
    out.top = (out.top || []).concat(res.top);
  }
  out.top = (out.top || []).sort((a, b) => b.dmgPerHp - a.dmgPerHp).slice(0, 10);
  return out;
}

// ทดสอบเผ่าตามแผนใน tribe-rules
// - uplift: ทีมที่มีเผ่านี้ s ตัว สู้ทีมสุ่มที่ไม่มีโบนัส เทียบ "เปิดโบนัสเผ่านี้" กับ "ปิด" ทีมเดิมคู่เดิม
//   = โบนัสเพิ่มอัตราชนะกี่ % (เป้า ขั้น 2: +5 ถึง +15 คือชนะ 55–65% เมื่อปกติชนะ 50%)
//   (ตัวคำนวณไม่มีการสุ่ม ทีมเดียวกันสู้กันเองจะชนะ 100% ทุกครั้ง จึงวัดด้วยทีมคู่ต่อสู้ต่างกันแทน)
// - vsMixed: ทีมที่มีเผ่านี้ s ตัว พบทีมสุ่ม โบนัสเปิดทั้งคู่ (เป้า ขั้น 6: ไม่เกิน 70%)
export async function tribeTests(chars, rules, { n = 200, seed = 202, level = 1, onProgress } = {}) {
  const map = makeCharMap(chars), out = {};
  const jobs = TRIBES.length * rules.tribeSteps.length;
  let done = 0;
  for (const T of TRIBES) {
    out[T] = {};
    const members = chars.filter(c => c.tribe === T || c.extraTribes.includes(T));
    const others = chars.filter(c => !(c.tribe === T || c.extraTribes.includes(T)));
    for (const s of rules.tribeSteps) {
      const rng = makeRng(seed + s * 31 + TRIBES.indexOf(T) * 977);
      let on = 0, off = 0, mixed = 0;
      for (let i = 0; i < n; i++) {
        const mem = members.map(c => [rng.next(), c]).sort((x, y) => x[0] - y[0]).slice(0, s).map(x => x[1]);
        const fill = Array.from({ length: 6 - s }, () => rng.pick(others));
        const built = buildTeam(placeByHint(rng, [...mem, ...fill], levelPicker(rng, level)), map, rules);
        const enemy = buildTeam(randomTeam(rng, chars, level), map, rules);
        on += winScore(simulate(built, enemy, { rules, log: false, tribeOnly: [T, null], tribesOff: [false, true] }), 0);
        off += winScore(simulate(built, enemy, { rules, log: false, tribesOff: [true, true] }), 0);
        mixed += winScore(simulate(built, enemy, { rules, log: false }), 0);
      }
      out[T][s] = { on: on / n * 100, off: off / n * 100, uplift: (on - off) / n * 100, vsMixed: mixed / n * 100 };
      done++; onProgress && onProgress(done / jobs); await pause();
    }
  }
  return out;
}

// เกณฑ์อ่านผล (ค่าเสนอ ปรับได้)
export const TARGETS = {
  charBand: 6,                 // ห่างจากค่าเฉลี่ยความหายากเดียวกันเกิน ±6% = แรงไป/อ่อนไป
  upliftStep2: [5, 15],        // tribe-rules: ขั้น 2 ชนะทีมไม่มีโบนัส 55–65% = เพิ่ม +5 ถึง +15
  step6MaxVsMixed: 70,         // tribe-rules: ขั้น 6 ชนะทีมผสมไม่เกิน
  maxShareOfWinners: 50,       // tribe-rules: ไม่มีเผ่าไหนอยู่ในทีมที่ชนะเกินครึ่ง
};

