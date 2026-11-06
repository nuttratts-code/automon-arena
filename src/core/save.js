import { RULES } from './rules.js';
import { allUnits, chargeOwner } from './shop.js';
import { isInt, validateTeam } from './validate.js';
import { burnShares } from './battle.js';
import { rnValidate, rnCompactOk } from './runrunes.js';
// เซฟกลางทาง + สถิติ run + ประวัติ run (ชุด 22 · ผู้ใช้เลือก 24 ต.ค.) · ข้อมูลล้วน ไม่แตะหน้าจอ (ย้ายไปเซิร์ฟเวอร์ได้)
// - เซฟ 1 ช่อง · เซฟตอนเริ่ม run และตอนกดสู้ (ผลแมตช์บันทึกทันที ก่อนเล่นภาพ) · ออกกลางรอบร้านค้า = กลับมาเริ่มรอบนั้นใหม่ (ร้านเดิม เพราะเลขสุ่มอยู่ในเซฟ)
// - ค่าตัวละคร/กฎเปลี่ยน (dataHash ไม่ตรง) = ล้างเซฟแล้วแจ้ง (ผู้ใช้เลือก 5A)
// - ตรวจทุกช่องตอนโหลด: ชนิด ช่วงค่า จำนวนเต็ม เวอร์ชัน · ตัวละครมีจริง · ค่าถาวรรู้จักและไม่เกินเพดาน · ประจุ SF-7 · ผิด = ไม่โหลด (ล้างแล้วแจ้ง)
export const SAVE_VERSION = 3; // set 95: kept 3 (in dataHash → bumping would void bot teams) · run v5 old saves caught by P.v check · set 89: run state v3 (shop level follows the round · no streak / interest fields)
export const SAVE_MAX_CHARS = 200000;   // เซฟยาวเกินนี้ = ผิดปกติ (ค่าเสนอ)
export const HISTORY_MAX = 20;          // ประวัติ run เก็บล่าสุด 20 รายการ (ค่าเสนอ)

// แฮชข้อมูลเกม (FNV-1a 32 บิต) · ใช้ตรวจว่าเซฟสร้างจากค่าตัวละคร/กฎชุดเดียวกัน
export function dataHash(chars, rules = RULES) {
  // ชุด 32: ช่องโบนัสเผ่าที่เป็น 0 ทุกขั้นไม่นับ (เพิ่มช่องใหม่ค่า 0 แล้วเซฟ/ทีมบอทเดิมยังใช้ได้ · ใส่ค่าจริงเมื่อไหร่แฮชเปลี่ยน)
  const tb = Object.fromEntries(Object.entries(rules.tribeBonus || {}).map(([t, o]) => [t, Object.fromEntries(Object.entries(o).filter(([, v]) => !(Array.isArray(v) && v.every(x => x === 0))))]));
  const s = JSON.stringify({ c: chars, shop: rules.shop, caps: rules.permCaps, tb, v: SAVE_VERSION });
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export const svObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
export const svIntIn = (x, lo, hi) => isInt(x) && x >= lo && x <= hi;
export const svOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
export const svOnlyKeys = (o, keys) => Object.keys(o).every(k => keys.includes(k));

export function checkUnit(u, cm, rules, at, errors) {
  if (u === null) return;
  if (!svObj(u) || !svOnlyKeys(u, ['uid', 'id', 'level', 'perm', 'paid'])) { errors.push(`${at}: ตัวละครผิดรูปแบบ`); return; }
  if (typeof u.id !== 'string' || !svOwn(cm, u.id)) errors.push(`${at}: ไม่มีตัวละคร`);
  if (!svIntIn(u.uid, 1, 1e9)) errors.push(`${at}: uid ผิด`);
  if (!svIntIn(u.level, 1, rules.maxLevel)) errors.push(`${at}: เลเวลผิด`);
  if (!svIntIn(u.paid, 0, 1e6)) errors.push(`${at}: ราคาที่จ่ายผิด`);
  if (!svObj(u.perm)) { errors.push(`${at}: ค่าถาวรผิดรูปแบบ`); return; }
  if (typeof u.id === 'string' && svOwn(cm, u.id) && svIntIn(u.level, 1, rules.maxLevel)) {
    const r = validateTeam([{ id: u.id, level: u.level, row: 0, lane: 0, perm: u.perm }], cm, rules); // ใช้ตัวตรวจค่าถาวรเดียวกับทีม
    for (const e of r.errors) errors.push(`${at}: ${e}`);
  }
}

// ตรวจสถานะ run 1 ฝั่ง (รูปแบบเดียวกับ newRun ใน shop.js)
export function validateRunState(st, cm, rules = RULES, opts = {}) {
  const S = rules.shop, errors = [];
  if (!svObj(st)) return { ok: false, errors: ['สถานะผิดรูปแบบ'] };
  const KEYS = ['v', 'seed', 'n', 'round', 'gold', 'wins', 'hearts', 'lastWon', 'over', 'shop', 'bench', 'board', 'uid', 'charges', 'rn', 'bw', 'bk', 'extra', 'ls'];
  if (!svOnlyKeys(st, KEYS) || !KEYS.every(k => svOwn(st, k))) return { ok: false, errors: ['ช่องสถานะไม่ครบหรือมีช่องแปลกปลอม'] };
  if (st.v !== 7) errors.push('เวอร์ชันสถานะไม่รู้จัก'); // set 100: v7 = + ls (normal losses in a row) + rn.ro · set 99: v6 = + bw/bk/extra // set 89: v3 = shop level from the round · set 94: v4 = + runes (st.rn) · set 95: v5 = no rune shop
  if (!svIntIn(st.seed, 0, 0xFFFFFFFF)) errors.push('เมล็ดสุ่มผิด');
  if (!svIntIn(st.n, 0, 1e9)) errors.push('ตัวนับสุ่มผิด');
  if (!svIntIn(st.round, 0, 1000)) errors.push('รอบผิด');
  if (!svIntIn(st.gold, 0, 100000)) errors.push('เงินผิด');
  if (!svIntIn(st.wins, 0, 1000) || (!st.extra && st.wins > S.winsToFinish)) errors.push('จำนวนชนะผิด');
  if (!svIntIn(st.bw, 0, 1000) || !svIntIn(st.bk, 0, 1000) || st.bw > st.wins || st.bk > st.wins) errors.push('ตัวนับบอสผิด');
  if (!svIntIn(st.ls, 0, 1000)) errors.push('ตัวนับแพ้ติดผิด');
  if (typeof st.extra !== 'boolean' || (st.extra && st.wins < S.winsToFinish)) errors.push('แมตช์พิเศษผิด');
  if (!svIntIn(st.hearts, 0, S.hearts)) errors.push('หัวใจผิด');
  if (typeof st.lastWon !== 'boolean' || typeof st.over !== 'boolean') errors.push('ค่าจริง/เท็จผิด');
  if (!svIntIn(st.uid, 1, 1e9)) errors.push('uid ผิด');
  if (!Array.isArray(st.shop) || st.shop.length < S.slots || st.shop.length > S.slots + 3) errors.push('ร้านผิด'); // set 94: rune แผงใหญ่ adds up to 3 slots
  else st.shop.forEach((s, i) => {
    if (!svObj(s) || !svOnlyKeys(s, ['id', 'locked']) || typeof s.locked !== 'boolean' || !(s.id === null || (typeof s.id === 'string' && svOwn(cm, s.id)))) errors.push(`ร้านช่อง ${i + 1} ผิด`);
  });
  if (!Array.isArray(st.bench) || st.bench.length !== S.bench) errors.push('ม้านั่งผิด');
  else st.bench.forEach((u, i) => checkUnit(u, cm, rules, `ม้านั่ง ${i + 1}`, errors));
  if (!Array.isArray(st.board) || st.board.length !== rules.rows || !st.board.every(r => Array.isArray(r) && r.length === rules.lanes)) errors.push('บอร์ดผิด');
  else st.board.forEach((r, row) => r.forEach((u, lane) => checkUnit(u, cm, rules, `บอร์ด ${row + 1}/${lane + 1}`, errors)));
  errors.push(...rnValidate(st.rn, rules));
  if (errors.length) return { ok: false, errors };
  const uids = allUnits(st).map(x => x.u.uid);
  if (new Set(uids).size !== uids.length) errors.push('uid ซ้ำ');
  if (uids.some(x => x >= st.uid)) errors.push('uid เกินตัวนับ');
  // ประจุรอใช้ (SF-7 ฯลฯ): ทีละ 1 อันต่อชนิดตัวละคร+สกิล (ตามกฎร้านค้า · ชุด 24 แก้บั๊ก: เดิมรับแค่ 1 อันทั้งทีม เซฟที่มี 2 ชนิดถูกล้าง)
  // ยาวไม่เกินจำนวนช่องบอร์ด+ม้านั่ง · ไม่ซ้ำ · ID/ลำดับสกิลมีจริง · เจ้าของยังอยู่ในทีม
  const chKeys = Array.isArray(st.charges) ? st.charges.map(x => (svObj(x) ? `${x.id}#${x.si}` : '?')) : null;
  if (!chKeys || chKeys.length > rules.maxBoard + S.bench || new Set(chKeys).size !== chKeys.length) errors.push('ประจุผิด');
  else for (const x of st.charges) {
    if (!svObj(x) || !svOnlyKeys(x, ['id', 'uid', 'si']) || typeof x.id !== 'string' || !svOwn(cm, x.id) || !svIntIn(x.uid, 1, 1e9) || !svIntIn(x.si, 0, 5) || !cm[x.id].skills[x.si] || !chargeOwner(st, x)) errors.push('ประจุผิด');
  }
  if (!opts.bot && st.over !== (st.hearts <= 0 || (!st.extra && st.wins >= S.winsToFinish))) errors.push('สถานะจบ run ไม่ตรง'); // บอท: หัวใจ/จบ run ถูกตั้งใหม่ทุกแมตช์
  return { ok: errors.length === 0, errors };
}

// สถิติ run (ผู้ใช้เลือก 4B): นับจากผลแมตช์ของฝั่งผู้เล่น (side 0)
export function newStats() { return { matches: 0, w: 0, l: 0, d: 0, timeMs: 0, streak: 0, best: 0, dmg: {} }; }
export function addMatchStats(stats, result) {
  const w = result.winner;
  stats.matches++; stats.timeMs += Math.max(0, Math.floor(result.timeMs || 0));
  if (w === 1) { stats.l++; stats.streak = 0; } else { if (w === 0) stats.w++; else stats.d++; stats.streak++; stats.best = Math.max(stats.best, stats.streak); }
  const owner = new Map(), add = new Map(), bs = burnShares(); // uid → ID ของฝั่งผู้เล่น (รวมตัวที่ถูกเรียก) · A7: ไฟนับให้ผู้ทำให้ติดตามสัดส่วน
  const credit = (uid, v) => { if (owner.has(uid) && v > 0) { const id = owner.get(uid); add.set(id, (add.get(id) || 0) + v); } };
  for (const e of result.events || []) {
    if (e.k === 'start') for (const u of e.units) { if (u.side === 0) owner.set(u.uid, u.id); }
    else if (e.k === 'summon' && e.unit && e.unit.side === 0) owner.set(e.unit.uid, e.unit.id);
    else if (e.k === 'burn' || e.k === 'cleanse' || e.k === 'down') bs.see(e.k, e);
    else if (e.k === 'dmg' && e.amount > 0) {
      if (e.why === 'burn') { for (const [s, f] of bs.split(e.to)) credit(s, e.amount * f); }
      else credit(e.from, Math.floor(e.amount));
    }
  }
  for (const [id, v] of add) stats.dmg[id] = (stats.dmg[id] || 0) + Math.floor(v + 1e-9);
  return stats;
}
export function topDamage(stats) {
  let best = null;
  for (const [id, v] of Object.entries(stats.dmg)) if (!best || v > best.v) best = { id, v };
  return best;
}
export function validateStats(s, cm) {
  if (!svObj(s) || !svOnlyKeys(s, ['matches', 'w', 'l', 'd', 'timeMs', 'streak', 'best', 'dmg'])) return false;
  for (const k of ['matches', 'w', 'l', 'd', 'streak', 'best']) if (!svIntIn(s[k], 0, 10000)) return false;
  if (!svIntIn(s.timeMs, 0, 1e9) || s.w + s.l + s.d !== s.matches || !svObj(s.dmg) || Object.keys(s.dmg).length > 100) return false;
  return Object.entries(s.dmg).every(([id, v]) => svOwn(cm, id) && svIntIn(v, 0, 1e12));
}

// เซฟ: { sv, data, P, B, stats, startedAt }
export function makeSave(P, B, stats, startedAt, hash) {
  return JSON.stringify({ sv: SAVE_VERSION, data: hash, P, B, stats, startedAt });
}
// คืน { status: 'ok' | 'none' | 'data' | 'bad', save?, errors? } · ไม่เชื่อข้อมูล: แยกวิเคราะห์ใน try · ตรวจครบก่อนใช้
export function readSave(text, cm, rules, hash) {
  if (text == null || text === '') return { status: 'none' };
  if (typeof text !== 'string' || text.length > SAVE_MAX_CHARS) return { status: 'bad', errors: ['เซฟยาวผิดปกติ'] };
  let o; try { o = JSON.parse(text); } catch (e) { return { status: 'bad', errors: ['เซฟอ่านไม่ได้'] }; }
  if (!svObj(o) || !svOnlyKeys(o, ['sv', 'data', 'P', 'B', 'stats', 'startedAt'])) return { status: 'bad', errors: ['เซฟผิดรูปแบบ'] };
  if (o.sv !== SAVE_VERSION) return { status: 'data', errors: ['เวอร์ชันเซฟไม่ตรง'] };
  if (svObj(o.P) && (o.P.v === 3 || o.P.v === 4)) return { status: 'data', errors: ['เซฟเวอร์ชันเก่า (ก่อนรูน set 94 / มีร้านรูน set 94)'] };
  if (o.data !== hash) return { status: 'data', errors: ['ค่าตัวละคร/กฎเปลี่ยนแล้ว'] };
  const a = validateRunState(o.P, cm, rules), b = validateRunState(o.B, cm, rules, { bot: true });
  const errors = [...a.errors.map(e => 'ผู้เล่น: ' + e), ...b.errors.map(e => 'บอท: ' + e)];
  if (!validateStats(o.stats, cm)) errors.push('สถิติผิด');
  if (!svIntIn(o.startedAt, 0, 1e15)) errors.push('เวลาเริ่มผิด');
  if (o.P && o.P.over) errors.push('run ที่จบแล้วไม่ควรอยู่ในเซฟ');
  if (o.B && o.B.over) errors.push('บอท: สถานะจบ run ไม่ตรง');
  return errors.length ? { status: 'bad', errors: errors.slice(0, 5) } : { status: 'ok', save: o };
}

// ประวัติ run (ผู้ใช้เลือก 4C): [{ at, won, wins, hearts, rounds, team: [{ id, level }], top, topDmg, matches }]
export function historyEntry(P, stats, at) {
  const t = topDamage(stats);
  return { at, won: P.wins >= RULES.shop.winsToFinish, wins: P.wins, hearts: P.hearts, rounds: P.round, matches: stats.matches,
    team: allUnits(P).filter(x => x.ref.at === 'board').map(x => ({ id: x.u.id, level: x.u.level })), top: t ? t.id : null, topDmg: t ? t.v : 0 };
}
// รับข้อความจากที่เก็บ คืนรายการที่ผ่านตัวตรวจเท่านั้น (ตัวที่ ID ไม่มีแล้วเก็บไว้ แสดงเป็น ID) · รายการผิดถูกตัดทิ้ง
export function readHistory(text, rules = RULES) {
  if (typeof text !== 'string' || !text || text.length > 50000) return [];
  let a; try { a = JSON.parse(text); } catch (e) { return []; }
  if (!Array.isArray(a)) return [];
  const idOk = x => typeof x === 'string' && /^[A-Z]{2}-\d{1,2}$/.test(x);
  return a.slice(0, HISTORY_MAX).filter(h => svObj(h) && svOnlyKeys(h, ['at', 'won', 'wins', 'hearts', 'rounds', 'team', 'top', 'topDmg', 'matches'])
    && svIntIn(h.at, 0, 1e15) && typeof h.won === 'boolean' && svIntIn(h.wins, 0, 1000) && h.wins <= h.rounds && svIntIn(h.hearts, 0, rules.shop.hearts)
    && svIntIn(h.rounds, 0, 1000) && svIntIn(h.matches, 0, 1000) && (h.top === null || idOk(h.top)) && svIntIn(h.topDmg, 0, 1e12)
    && Array.isArray(h.team) && h.team.length <= rules.maxBoard && h.team.every(u => svObj(u) && svOnlyKeys(u, ['id', 'level']) && idOk(u.id) && svIntIn(u.level, 1, rules.maxLevel)));
}
export function pushHistory(list, entry) { return [entry, ...list].slice(0, HISTORY_MAX); }

// ---- รีเพลย์หลังสู้ (ชุด 25 · ผู้ใช้เลือก 7A) ----
// เก็บแค่ "ทีม 2 ฝั่ง (รวมค่าถาวร) + ผล" ต่อแมตช์ แล้วจำลองซ้ำตอนดู · เมล็ดสุ่มของการต่อสู้คำนวณจากทีมเอง (battle.js) จึงไม่ต้องเก็บแยก
// ผูกกับ run ด้วยเมล็ดของ run + แฮชค่าเกม · ค่าเกมเปลี่ยน = ซ่อนทั้งชุดแล้วแจ้ง · จำลองซ้ำแล้วผล/เวลาไม่ตรง = ไม่เล่น แจ้งว่าเกมเปลี่ยน
export const REPLAY_VERSION = 1;
export const REPLAY_MAX = 40;            // แมตช์ต่อ run สูงสุดจริง = ชนะ 10 + แพ้ 10 − 1 = 19 · เผื่อ (ค่าเสนอ)
// set 94: n = the player's runes at that match (rnCompact) · only written when there are runes (older entries stay valid)
// g = win streak before the match (rune เติบโต reads it)
// d = picked difficulty (set 95: enemy team hp/atk scale) · only written for a scaled team fight
export function replayEntry(round, teamA, teamB, result, runes = [], streak = 0, d = null) {
  const copy = t => JSON.parse(JSON.stringify(t));
  const x = { r: round, a: copy(teamA), b: copy(teamB), w: result.winner, t: Math.floor(result.timeMs) };
  if (runes.length) { x.n = copy(runes); x.g = streak | 0; }
  if (d && Array.isArray(teamB)) x.d = d;
  return x;
}
export function makeReplays(runSeed, hash, list) {
  return JSON.stringify({ rv: REPLAY_VERSION, data: hash, run: runSeed, list: list.slice(-REPLAY_MAX) });
}
export function checkReplay(x, cm, rules = RULES) {
  if (!svObj(x) || !svOnlyKeys(x, ['r', 'a', 'b', 'w', 't', 'n', 'g', 'd']) || !['r', 'a', 'b', 'w', 't'].every(k => svOwn(x, k))) return false;
  if (svOwn(x, 'n') && !rnCompactOk(x.n, rules)) return false;
  if (svOwn(x, 'g') && !svIntIn(x.g, 0, 10000)) return false;
  if (svOwn(x, 'd') && !['ปกติ', 'ยาก', 'นรก', 'ง่าย', 'กลาง'].includes(x.d)) return false;
  if (!svIntIn(x.r, 1, 1000) || ![0, 1, null].includes(x.w) || !svIntIn(x.t, 0, 1e7)) return false;
  return validateTeam(x.a, cm, rules).ok && (isBossFoe(x.b) || validateTeam(x.b, cm, rules).ok);
}
// set 85: enemy side of a boss round = { boss: id, k } (core/runboss.js) · shape only, the game looks the boss up when replaying
export const isBossFoe = b => svObj(b) && svOnlyKeys(b, ['boss', 'k']) && typeof b.boss === 'string' && /^[A-Za-z0-9_-]{1,16}$/.test(b.boss) && svIntIn(b.k, 1, 100);
// คืน { status: 'ok' | 'none' | 'data' | 'other' | 'bad', list } · other = ของ run อื่น (ทิ้งเงียบๆ) · ไม่เชื่อข้อมูล ตรวจทุกช่อง
export function readReplays(text, cm, rules, hash, runSeed) {
  if (text == null || text === '') return { status: 'none', list: [] };
  if (typeof text !== 'string' || text.length > SAVE_MAX_CHARS) return { status: 'bad', list: [] };
  let o; try { o = JSON.parse(text); } catch (e) { return { status: 'bad', list: [] }; }
  if (!svObj(o) || !svOnlyKeys(o, ['rv', 'data', 'run', 'list']) || !Array.isArray(o.list) || o.list.length > REPLAY_MAX) return { status: 'bad', list: [] };
  if (o.rv !== REPLAY_VERSION || o.data !== hash) return { status: 'data', list: [] };
  if (o.run !== runSeed) return { status: 'other', list: [] };
  return o.list.every(x => checkReplay(x, cm, rules)) ? { status: 'ok', list: o.list } : { status: 'bad', list: [] };
}

// ---- บันทึกข้อมูลการเล่นจริง (ชุด 25 · ผู้ใช้เลือก 8A) ----
// สรุป 1 แถวต่อแมตช์ ส่งลงฐานข้อมูลของหน้าเกม · สร้างจากสถานะที่ผ่านตัวตรวจแล้ว และตรวจซ้ำทุกช่องก่อนเขียน (checkPlayRecord)
// ไม่มีข้อมูลระบุตัวผู้เล่น · run = เมล็ดของ run ใช้จัดกลุ่มแมตช์เท่านั้น
export const PLAY_VERSION = 3; // set 85: + boss (null or { boss, k }) · foeSrc 'boss' · set 94: + runes (ids held) + diff (ง่าย/กลาง/ยาก or null)
export const playTeam = t => t.map(e => ({ id: e.id, level: e.level, row: e.row, lane: e.lane, perm: e.perm ? Object.keys(e.perm).length : 0 }));
export function playRecord({ at, hash, runSeed, round, winsBefore, heartsBefore, result, teamA, teamB, foe, boss = null, runes = [], diff = null }, rules = RULES) {
  return {
    v: PLAY_VERSION, at: Math.floor(at), data: hash, run: runSeed >>> 0, round, winsBefore, heartsBefore,
    res: result.winner === 0 ? 'w' : result.winner === 1 ? 'l' : 'd',
    timeMs: Math.floor(result.timeMs), storm: result.timeMs > rules.stormStartMs, aborted: result.aborted || null,
    team: playTeam(teamA), foe: boss ? [] : playTeam(teamB), foeSrc: boss ? 'boss' : foe ? 'set' : 'live', foeStage: foe && !boss ? foe.stage : null, foeSpan: foe && !boss ? foe.span : null,
    boss: boss ? { boss: boss.boss, k: boss.k } : null,
    runes: runes.map(x => x.id).slice(0, 80), diff,
  };
}
export function checkPlayRecord(x, cm, rules = RULES) {
  const KEYS = ['v', 'at', 'data', 'run', 'round', 'winsBefore', 'heartsBefore', 'res', 'timeMs', 'storm', 'aborted', 'team', 'foe', 'foeSrc', 'foeStage', 'foeSpan', 'boss', 'runes', 'diff'];
  if (!svObj(x) || !svOnlyKeys(x, KEYS) || !KEYS.every(k => svOwn(x, k))) return false;
  const S = rules.shop, team = t => Array.isArray(t) && t.length <= rules.maxBoard && t.every(u => svObj(u) && svOnlyKeys(u, ['id', 'level', 'row', 'lane', 'perm'])
    && typeof u.id === 'string' && svOwn(cm, u.id) && svIntIn(u.level, 1, rules.maxLevel) && svIntIn(u.row, 0, rules.rows - 1) && svIntIn(u.lane, 0, rules.lanes - 1) && svIntIn(u.perm, 0, 100));
  return x.v === PLAY_VERSION && svIntIn(x.at, 0, 1e15) && typeof x.data === 'string' && /^[0-9a-f]{8}$/.test(x.data) && svIntIn(x.run, 0, 0xFFFFFFFF)
    && svIntIn(x.round, 1, 1000) && svIntIn(x.winsBefore, 0, 1000) && x.winsBefore < x.round && svIntIn(x.heartsBefore, 0, S.hearts) && ['w', 'l', 'd'].includes(x.res)
    && svIntIn(x.timeMs, 0, 1e7) && typeof x.storm === 'boolean' && [null, 'hits', 'effects'].includes(x.aborted)
    && team(x.team) && team(x.foe) && ['set', 'live', 'boss'].includes(x.foeSrc)
    && (x.foeSrc === 'boss' ? isBossFoe(x.boss) && x.foe.length === 0 : x.boss === null)
    && Array.isArray(x.runes) && x.runes.length <= 80 && x.runes.every(id => typeof id === 'string' && /^[A-Z]{1,2}\d{1,3}$/.test(id)) && [null, 'ปกติ', 'ยาก', 'นรก', 'ง่าย', 'กลาง'].includes(x.diff)
    && (x.foeSrc !== 'set' ? x.foeStage === null && x.foeSpan === null : svIntIn(x.foeStage, 0, 100) && svIntIn(x.foeSpan, 0, 10));
}

// ---- Run code (set 105, user picked option 1) ----
// One line a tester copies from the game page ("คัดลอกโค้ดผลการเล่น") and pastes in chat: the stored replays of the current run
// and of the previous run (both teams, runes, difficulty, result per match) + the latest run-history entries. No player identity.
// Built from the raw stored texts so a finished run (no save left) can still be sent. Read back with lab/runcode.mjs.
export const RUN_CODE_TAG = 'ARUN1';
export const RUN_CODE_MAX = 300000;
const RUN_CODE_HIST = 3, RUN_CODE_RUNS = 2;
export function makeRunCode(replayTexts, historyText, pageHash, at, rules = RULES) {
  const runs = [];
  for (const t of replayTexts.slice(0, RUN_CODE_RUNS)) {
    try { const o = typeof t === 'string' && t.length <= SAVE_MAX_CHARS ? JSON.parse(t) : null; if (svObj(o) && Array.isArray(o.list) && o.list.length) runs.push(o); } catch (e) { /* skip unreadable */ }
  }
  const h = readHistory(historyText, rules).slice(0, RUN_CODE_HIST);
  if (!runs.length && !h.length) return null;
  return RUN_CODE_TAG + ' ' + JSON.stringify({ v: 1, at: Math.floor(at), page: pageHash, runs, h });
}
// Text → { at, page, runs: [{ data, run, list }], hist } (throws Error with a reason) · every match goes through checkReplay, history through readHistory
export function parseRunCode(text, cm, rules = RULES) {
  const t = String(text).trim();
  if (t.length > RUN_CODE_MAX) throw new Error('code too long');
  if (!t.startsWith(RUN_CODE_TAG + ' ')) throw new Error('not a run code (missing ' + RUN_CODE_TAG + ')');
  let o; try { o = JSON.parse(t.slice(RUN_CODE_TAG.length + 1)); } catch (e) { throw new Error('code is not valid (cut off while copying?)'); }
  if (!svObj(o) || !svOnlyKeys(o, ['v', 'at', 'page', 'runs', 'h']) || o.v !== 1) throw new Error('bad code body');
  if (!svIntIn(o.at, 0, 1e15) || typeof o.page !== 'string' || !/^[0-9a-f]{8}$/.test(o.page)) throw new Error('bad header');
  if (!Array.isArray(o.h) || o.h.length > RUN_CODE_HIST) throw new Error('bad history');
  const hist = readHistory(JSON.stringify(o.h), rules);
  if (hist.length !== o.h.length) throw new Error('bad history entry');
  if (!Array.isArray(o.runs) || o.runs.length > RUN_CODE_RUNS) throw new Error('bad runs');
  const runs = o.runs.map((rp, k) => {
    if (!svObj(rp) || !svOnlyKeys(rp, ['rv', 'data', 'run', 'list']) || rp.rv !== REPLAY_VERSION || !Array.isArray(rp.list) || rp.list.length > REPLAY_MAX) throw new Error('bad replays');
    if (typeof rp.data !== 'string' || !/^[0-9a-f]{8}$/.test(rp.data) || !svIntIn(rp.run, 0, 0xFFFFFFFF)) throw new Error('bad replays header');
    rp.list.forEach((x, i) => { if (!checkReplay(x, cm, rules)) throw new Error(`bad match #${i + 1} in run ${k + 1}`); });
    return { data: rp.data, run: rp.run, list: rp.list };
  });
  return { at: o.at, page: o.page, runs, hist };
}
