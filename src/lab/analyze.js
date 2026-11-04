import { simulate } from '../core/battle.js';
import { makeRng } from '../core/rng.js';
import { TRIBES, pickHintRow } from '../core/rules.js';
import { done } from '../core/shop.js';
import { buildTeam, makeCharMap } from '../core/team.js';
import { bossUnit } from '../core/boss.js';
import { equipRunes, RUNE_RUN_ONLY } from '../core/runes.js';
import { rarityOdds, runeActive, runeKind, RUNE_RARITY } from '../core/stage.js';
import { pickBotTeam, simRun, tribeList } from '../core/botteams.js';
import { BOT_TEAMS } from '../core/botdata.js';
import { dataHash } from '../core/save.js';
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


// ---------- ชุด 80: วิเคราะห์ VS บอส + รูน (แท็บดูผล) ----------
// ทีมสุ่ม 6 ตัว (เลเวลที่เลือก) สู้บอส · ชนะ = ฆ่าบอสได้ (หมดเวลา/เสมอ = ไม่ชนะ) · รูนใส่ฝั่งผู้เล่นเท่านั้น
// runeMode: 'none' | 'random' (สุ่มตามน้ำหนักความหายาก runeCount อัน) | 'pick' (pickIds ทุกทีม ทีมละ 1 อันต่อ id)
// รูนที่ใส่ตัวเดียว/ต้องเลือกคู่ = สุ่มตัว · รูนเผ่าที่ทีมไม่มีเผ่านั้น = เสียเปล่าเหมือนของจริง · ไม่สุ่มรูนเงิน/ร้าน + รูนเติบโต (ไม่มีผลในการต่อสู้นี้)
export const BOSS_MEASURE = { seed: 5151, n: 2000, runeN: 300 };
export function battleRunes(stage) {
  const all = [...Object.entries(stage.runes || {}).map(([id, r]) => ({ ...r, id })), ...(stage.custom || []).map(r => ({ ...r }))];
  return all.filter(r => runeActive(r) && runeKind(r.eff) && !RUNE_RUN_ONLY.includes(r.eff) && r.eff !== 'growth');
}
const brSlot = (rng, team) => { const e = team[rng.int(team.length)]; return [e.row, e.lane]; };
function brEquip(rng, team, r) {
  const slot = r.scope === 'one' ? brSlot(rng, team) : null;
  let partner = null;
  if (r.eff === 'link' || r.eff === 'buddy') { const o = team.filter(e => !slot || e.row !== slot[0] || e.lane !== slot[1]); if (o.length) { const e = o[rng.int(o.length)]; partner = [e.row, e.lane]; } }
  return { r, n: 1, slot, partner };
}
// สุ่ม count รูน: ความหายากตามน้ำหนัก → รูนในความหายากนั้น · ได้ซ้ำ = จำนวนเพิ่ม (ไม่เกิน max) · เต็มแล้วสุ่มใหม่
export function randomRunes(rng, team, pool, st, count) {
  const odds = rarityOdds(st), out = [];
  for (let c = 0, guard = 0; c < count && guard < count * 20; guard++) {
    let x = rng.next() * 100, rar = RUNE_RARITY[RUNE_RARITY.length - 1][0];
    for (const [k] of RUNE_RARITY) { if (x < odds[k]) { rar = k; break; } x -= odds[k]; }
    const list = pool.filter(r => r.rarity === rar && (out.find(e => e.r.id === r.id)?.n || 0) < (r.max || 1));
    if (!list.length) continue;
    const r = list[rng.int(list.length)], had = out.find(e => e.r.id === r.id);
    if (had) had.n++; else out.push(brEquip(rng, team, r));
    c++;
  }
  return out;
}
const bossWin = r => (r.winner === 0 ? 1 : 0);
const bossBarsGone = (r, b) => { const u = r.units.find(x => x.side === 1); if (!u) return 0; const bh = Math.max(1, Math.floor(u.maxHp / b.bars)); return Math.max(0, Math.min(b.bars, b.bars - Math.ceil(u.hp / bh))); };
// stage = cleanStage() object · bossIds = บอสที่วัด · k = บอสครั้งที่ · level = 1|2|3|'mix'
export async function bossRanking(chars, rules, stage, { bossIds, k = 1, level = 1, n = BOSS_MEASURE.n, seed = BOSS_MEASURE.seed, runeMode = 'none', runeCount = 1, pickIds = [], onProgress } = {}) {
  const map = makeCharMap(chars), pool = battleRunes(stage);
  const bosses = (bossIds && bossIds.length ? bossIds.map(id => stage.bosses.find(b => b.id === id)) : stage.bosses.filter(b => b.on)).filter(Boolean);
  const picked = pickIds.map(id => pool.find(r => r.id === id)).filter(Boolean);
  const stat = Object.fromEntries(chars.map(c => [c.id, { games: 0, wins: 0, dealt: 0 }]));
  const per = {}; // ต่อบอส: ชนะ แถบ เวลา + ต่อเผ่า
  const top = [], TOP = 10;
  let total = 0, aborted = 0;
  for (const b of bosses) {
    const rng = makeRng(seed + b.id.charCodeAt(1) * 7919 + k * 131);
    const P = per[b.id] = { id: b.id, name: b.name, tribe: b.tribe, games: 0, wins: 0, bars: 0, time: 0, tr: Object.fromEntries(TRIBES.map(t => [t, { teams: 0, wins: 0 }])) };
    for (let i = 0; i < n; i++) {
      const A = randomTeam(rng, chars, level);
      const eqs = runeMode === 'random' ? randomRunes(rng, A, pool, stage.settings, runeCount) : runeMode === 'pick' ? picked.map(r => brEquip(rng, A, r)) : [];
      const eq = equipRunes(buildTeam(A, map, rules), eqs);
      const r = simulate(eq.units, [bossUnit(b, k)], { rules, log: false, tribeExtra: eq.tribeExtra });
      const w = bossWin(r), bars = bossBarsGone(r, b);
      if (r.aborted) aborted++;
      P.games++; P.wins += w; P.bars += bars; P.time += r.timeMs; total++;
      for (const id of new Set(A.map(e => e.id))) { stat[id].games++; stat[id].wins += w; }
      for (const u of r.units.filter(u => u.side === 0)) stat[u.id].dealt += u.dealt;
      for (const t of activeTribes(A, map, rules)) { P.tr[t].teams++; P.tr[t].wins += w; }
      { const dA = Math.round(r.units.filter(u => u.side === 0).reduce((s, u) => s + u.dealt, 0)), dB = Math.round(r.units.filter(u => u.side === 1).reduce((s, u) => s + u.dealt, 0));
        const hpT = r.units.reduce((s, u) => s + (u.maxHp || 0), 0), dmgTotal = dA + dB, dmgPerHp = +(dmgTotal / Math.max(1, hpT)).toFixed(2);
        if (top.length < TOP || dmgPerHp > top[top.length - 1].dmgPerHp) {
          top.push({ level, i, winner: r.winner, timeMs: r.timeMs, dmgTotal, dmgA: dA, dmgB: dB, hpTotal: hpT, dmgPerHp, bars, boss: { id: b.id, k },
            runes: eqs.map(e => ({ id: e.r.id, n: e.n, slot: e.slot, partner: e.partner })), teamA: A.map(e => ({ id: e.id, level: e.level, row: e.row, lane: e.lane })), teamB: [], aborted: r.aborted || null });
          top.sort((x, y) => y.dmgPerHp - x.dmgPerHp); if (top.length > TOP) top.pop();
        } }
      if (i % 50 === 49) { onProgress && onProgress((bosses.indexOf(b) + (i + 1) / n) / bosses.length); await pause(); }
    }
  }
  const rows = chars.map(c => ({ id: c.id, name: c.name, tribe: c.tribe, rarity: c.rarity, games: stat[c.id].games,
    win: stat[c.id].games ? stat[c.id].wins / stat[c.id].games * 100 : 0, dealt: stat[c.id].games ? stat[c.id].dealt / stat[c.id].games : 0 }));
  const bossRows = Object.values(per).map(P => ({ id: P.id, name: P.name, tribe: P.tribe, win: P.games ? P.wins / P.games * 100 : 0, bars: P.games ? P.bars / P.games : 0, time: P.games ? P.time / P.games / 1000 : 0,
    tribeWin: Object.fromEntries(TRIBES.map(t => [t, { teams: P.tr[t].teams, win: P.tr[t].teams ? P.tr[t].wins / P.tr[t].teams * 100 : null }])) }));
  const winAll = total ? bossRows.reduce((a, x) => a + x.win, 0) / bossRows.length : 0;
  return { rows, bossRows, winAll, n, k, level, runeMode, runeCount, aborted, top };
}
// รูนแต่ละอันเพิ่มอัตราชนะเท่าไร: ทีมเดิม คู่เดิม ใส่รูนนี้ 1 อัน กับไม่ใส่ · foe = 'boss' (บอสตามรายการ สลับกัน) หรือ 'team' (ทีมสุ่ม)
export async function runeUplift(chars, rules, stage, { foe = 'boss', bossIds, k = 1, level = 1, n = BOSS_MEASURE.runeN, seed = BOSS_MEASURE.seed + 1, onProgress } = {}) {
  const map = makeCharMap(chars), pool = battleRunes(stage);
  const bosses = (bossIds && bossIds.length ? bossIds.map(id => stage.bosses.find(b => b.id === id)) : stage.bosses.filter(b => b.on)).filter(Boolean);
  if (foe === 'boss' && !bosses.length) return [];
  const out = [];
  for (let j = 0; j < pool.length; j++) {
    const ru = pool[j], rng = makeRng(seed + j * 977);
    let on = 0, off = 0;
    for (let i = 0; i < n; i++) {
      const A = randomTeam(rng, chars, level), base = buildTeam(A, map, rules);
      const eq = equipRunes(base, [brEquip(rng, A, ru)]);
      if (foe === 'boss') {
        const b = bosses[i % bosses.length];
        on += bossWin(simulate(eq.units, [bossUnit(b, k)], { rules, log: false, tribeExtra: eq.tribeExtra }));
        off += bossWin(simulate(buildTeam(A, map, rules), [bossUnit(b, k)], { rules, log: false }));
      } else {
        const B = randomTeam(rng, chars, level);
        on += winScore(simulate(eq.units, buildTeam(B, map, rules), { rules, log: false, tribeExtra: eq.tribeExtra }), 0);
        off += winScore(simulate(buildTeam(A, map, rules), buildTeam(B, map, rules), { rules, log: false }), 0);
      }
    }
    out.push({ id: ru.id, name: ru.name, rarity: ru.rarity, on: on / n * 100, off: off / n * 100, uplift: (on - off) / n * 100 });
    onProgress && onProgress((j + 1) / pool.length); await pause();
  }
  return out.sort((a, b) => b.uplift - a.uplift);
}

// ---------- Set 86: full-run simulation with the human-like bot (core/bot.js) · Balance Room ดูผล "รันจริง" ----------
// Each run = the same simRun the bot teams are generated from: shop rounds, boss rounds (stage being edited), hearts, 10 wins.
// opp 'teams' = the game's prepared bot teams (only when they were built from these exact values, else falls back to live)
// opp 'live'  = a second bot plays its own run alongside every match (new team every match, no fixed pool)
export const RUN_SIM = { seed: 8686, top: 10 };
export const botTeamsFit = (chars, rules) => !!BOT_TEAMS && BOT_TEAMS.hash === dataHash(chars, rules);
const mainTribeOf = (team, map, rules) => {
  const act = activeTribes(team, map, rules); if (!act.length) return null;
  const cnt = t => new Set(team.filter(e => [map[e.id].tribe, ...(map[e.id].extraTribes || [])].includes(t)).map(e => e.id)).size;
  return act.slice().sort((a, b) => cnt(b) - cnt(a) || TRIBES.indexOf(a) - TRIBES.indexOf(b))[0];
};
export async function runPlayStats(chars, rules, stage, { n = 300, seed = RUN_SIM.seed, opp = 'teams', onProgress } = {}) {
  const map = makeCharMap(chars), W = rules.shop.winsToFinish;
  const useTeams = opp === 'teams' && botTeamsFit(chars, rules);
  const pick = useTeams ? (P => pickBotTeam(BOT_TEAMS, P.wins, P.seed, P.round).team) : null;
  const tribes = tribeList(chars);
  const ends = Array(W + 1).fill(0), byRound = {}, boss = {}, ch = {}, tr = {}, combos = {};
  for (const c of chars) ch[c.id] = { runs: 0, lvSum: 0, won: 0, winsSum: 0, mGames: 0, mWins: 0 };
  let won = 0, rounds = 0, winsSum = 0, matches = 0, aborted = 0, timeSum = 0, lv3Final = 0;
  for (let r = 0; r < n; r++) {
    let last = null;
    const P = simRun(chars, rules, (seed + Math.imul(r + 1, 0x9E3779B1)) >>> 0, pick, m => {
      matches++; if (m.aborted) aborted++; timeSum += m.timeMs;
      const w = m.winner === 0 ? 1 : 0, lvs = m.team.reduce((a, e) => a + e.level, 0), l3 = m.team.filter(e => e.level >= 3).length;
      const R = (byRound[m.round] ||= { games: 0, wins: 0, gold: 0, lv: 0, lv3: 0, units: 0, boss: 0, ms: 0 });
      R.games++; R.wins += m.winner !== 1 ? 1 : 0; R.gold += m.gold; R.lv += lvs; R.lv3 += l3; R.units += m.team.length; R.ms += m.timeMs; if (m.boss) R.boss++;
      for (const id of new Set(m.team.map(e => e.id))) if (ch[id]) { ch[id].mGames++; ch[id].mWins += w; }
      if (m.boss) {
        const b = stage.bosses.find(x => x.id === m.boss) || { bars: 1, name: m.boss };
        const B = (boss[`${m.boss}#${m.k}`] ||= { id: m.boss, name: b.name, k: m.k, round: m.round, games: 0, wins: 0, bars: 0, maxBars: b.bars, ms: 0, lv: 0, lv3: 0, tribe: {} });
        B.games++; B.wins += w; B.bars += bossBarsGone(m.res, b); B.ms += m.timeMs; B.lv += lvs; B.lv3 += l3;
        const t = mainTribeOf(m.team, map, rules) || '-'; const T = (B.tribe[t] ||= { games: 0, wins: 0 }); T.games++; T.wins += w;
      }
      last = m;
    }, stage, { focus: tribes[r % tribes.length] }); // set 87: each run's bot leans toward one tribe in turn (players differ)
    const fin = P.wins >= W; if (fin) won++;
    ends[Math.min(W, P.wins)]++; rounds += P.round; winsSum += P.wins;
    if (last) {
      const team = last.team;
      lv3Final += team.filter(e => e.level >= 3).length;
      const best = {}; for (const e of team) best[e.id] = Math.max(best[e.id] || 0, e.level);
      for (const [id, lv] of Object.entries(best)) if (ch[id]) { const c = ch[id]; c.runs++; c.lvSum += lv; c.won += fin ? 1 : 0; c.winsSum += P.wins; }
      const t = mainTribeOf(team, map, rules) || '-'; const T = (tr[t] ||= { runs: 0, won: 0, winsSum: 0 }); T.runs++; T.won += fin ? 1 : 0; T.winsSum += P.wins;
      if (fin) { const key = Object.keys(best).sort().join(' '); const C = (combos[key] ||= { ids: Object.keys(best).sort(), count: 0, lv: 0 }); C.count++; C.lv += team.reduce((a, e) => a + e.level, 0); }
    }
    if (r % 5 === 4) { onProgress && onProgress((r + 1) / n); await pause(); }
  }
  const pct = (a, b) => (b ? a / b * 100 : 0);
  return {
    n, opp: useTeams ? 'teams' : 'live', askedTeams: opp === 'teams', matches, aborted,
    won: pct(won, n), avgRounds: rounds / n, avgWins: winsSum / n, avgTime: matches ? timeSum / matches / 1000 : 0, lv3Final: lv3Final / n,
    ends: ends.map((c, w) => ({ wins: w, runs: c, pct: pct(c, n) })),
    rounds: Object.entries(byRound).map(([k, R]) => ({ round: +k, games: R.games, reach: pct(R.games, n), win: pct(R.wins, R.games), gold: R.gold / R.games, lv: R.lv / R.games, lv3: R.lv3 / R.games, units: R.units / R.games, boss: R.boss, time: R.ms / R.games / 1000 })).sort((a, b) => a.round - b.round),
    bosses: Object.values(boss).map(B => ({ id: B.id, name: B.name, k: B.k, round: B.round, games: B.games, reach: pct(B.games, n), win: pct(B.wins, B.games), bars: B.bars / B.games, maxBars: B.maxBars, time: B.ms / B.games / 1000, lv: B.lv / B.games, lv3: B.lv3 / B.games,
      tribe: Object.fromEntries(Object.entries(B.tribe).map(([t, x]) => [t, { games: x.games, win: pct(x.wins, x.games) }])) })).sort((a, b) => a.k - b.k || a.id.localeCompare(b.id)),
    chars: chars.map(c => { const x = ch[c.id]; return { id: c.id, name: c.name, tribe: c.tribe, rarity: c.rarity, price: c.price, runs: x.runs, pick: pct(x.runs, n), lv: x.runs ? x.lvSum / x.runs : 0, won: pct(x.won, x.runs), wins: x.runs ? x.winsSum / x.runs : 0, mGames: x.mGames, mWin: pct(x.mWins, x.mGames) }; }),
    tribes: Object.entries(tr).map(([t, x]) => ({ tribe: t, runs: x.runs, share: pct(x.runs, n), won: pct(x.won, x.runs), wins: x.winsSum / x.runs })).sort((a, b) => b.runs - a.runs),
    combos: Object.values(combos).sort((a, b) => b.count - a.count).slice(0, RUN_SIM.top).map(C => ({ ids: C.ids, count: C.count, share: pct(C.count, won), lv: C.lv / C.count })),
  };
}
