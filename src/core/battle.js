import { makeRng } from './rng.js';
import { DO_INFO, RULES, atMatch } from './rules.js';
import { phaseIndexAt, ruleMap, fxMap, spotCells } from './boss.js';
// ตัวคำนวณการต่อสู้ตาม combat-rules V1.4
// - ใส่ทีมเดิม + เมล็ดสุ่มเดิม ได้ผลเดิมทุกครั้ง (เซิร์ฟเวอร์ MVP2 จำลองซ้ำเพื่อตรวจได้) · ไม่อ่านเวลาเครื่อง
//   เลขสุ่มใช้เฉพาะสกิลที่มี "โอกาส %" หรือเป้าแบบสุ่ม · เมล็ดตั้งต้นคำนวณจากทีม
// - เวลาเก็บเป็นมิลลิวินาทีจำนวนเต็ม · ดาเมจ/เกราะ/ฟื้น ปัดลงเป็นจำนวนเต็ม
// - ลำดับใน 1 tick: ไฟ/พายุทราย → เริ่มชุด → เกราะ → ฮิต → ดาเมจจากสกิล → เกราะจากการโดนตี → สถานะ → ฟื้น HP → เช็ก down (วนจนนิ่ง)
// - ตัวละครมีได้หลายสกิล · สกิลทุกแบบผ่านคิวเดียวกัน (ไม่มีโค้ดพิเศษรายตัวละคร)


export const PRE = { extraHit: 1, spread: 1, retarget: 1, splitAll: 1 };
export const ARMOR_PCT = { dmgPctArmor: 1, burnPctArmor: 1 };
// สกิลที่คิดจากเกราะตัวเอง ต้องจดเกราะก่อนฮิตของ tick (แบบเดิม + แบบ % ของ เกราะ ของตัวเอง ชุด 7)
export const armorSnapSkill = s => !!(ARMOR_PCT[s.do] || (s.of && s.of.stat === 'armor' && s.of.who === 'self'));

// A7 (28 Oct): burn damage is credited to whoever applied the burn, split by share. One tracker shared by the battle
// (u.dealt), the match tab (mxRecords) and the game's run stats (addMatchStats) so all three agree. Fed with events
// (k + data): burn adds the applier's part after scaling old parts to the burn left before it (decay/partial cleanse
// keep shares); full cleanse / down clear it. split(uid) = [[from uid or -1 (no source), fraction], ...].
export function burnShares() {
  const share = new Map();
  return {
    see(k, d) {
      if (k === 'burn') {
        let m = share.get(d.to); if (!m) share.set(d.to, m = new Map());
        const before = d.total - d.amount; let tot = 0; for (const v of m.values()) tot += v;
        if (tot > 0) for (const [s, v] of m) m.set(s, before > 0 ? v * before / tot : 0);
        const key = d.from != null ? d.from : -1; m.set(key, (m.get(key) || 0) + d.amount);
      } else if (k === 'cleanse' && d.what !== 'pct') share.delete(d.to);
      else if (k === 'down') share.delete(d.who);
    },
    split(uid) {
      const m = share.get(uid); let tot = 0; if (m) for (const v of m.values()) tot += v;
      if (!(tot > 0)) return [[-1, 1]];
      const out = []; for (const [s, v] of m) if (v > 0) out.push([s, v / tot]);
      return out;
    },
  };
}

export function simulate(teamA, teamB, opts = {}) {
  const R = opts.rules || RULES;
  const logOn = opts.log !== false;
  const events = [];
  let t = 0;
  // ชุด 37 (แท็บรายตัว): เมื่อเปิด detail เหตุการณ์ผลอื่นๆ (เกราะ/ฟื้น/บัฟ/ถาวร/ล้างผล/ขโมยช็อต ฯลฯ) จดที่มา from (uid ผู้ใช้สกิล) + d {si, what, src} · ปิด detail = เหตุการณ์เหมือนเดิมทุกประการ
  const SRC_KINDS = new Set(['armor', 'heal', 'buff', 'atkUp', 'perm', 'maxhp', 'cleanse', 'steal', 'cdCut', 'cdPct', 'reflectDebuff', 'revive']);
  const bShare = burnShares(); // A7: burn credit by share (runs with log off too)
  const log = (k, d) => {
    if (muteLog && k !== 'perm') return; // F2: ผลถาวรของตัวที่ down จริง จดเฉพาะ perm
    if (k === 'burn' || k === 'cleanse' || k === 'down') bShare.see(k, d);
    if (!logOn) return;
    if (detailOn && dCur && SRC_KINDS.has(k) && !('d' in d)) events.push({ t, k, ...d, ...('from' in d ? {} : { from: dFrom }), d: { ...dCur } });
    else events.push({ t, k, ...d });
  };
  // ชุด 36: opts.detail = จดส่วนประกอบของดาเมจ (ช่อง d ในเหตุการณ์ dmg) ให้แท็บวิเคราะห์แมตช์ · จดอย่างเดียว ไม่เปลี่ยนผล · ปิดอยู่ตอนวัด/บอท/เกม
  const detailOn = logOn && !!opts.detail;
  let muteLog = false; // F2: true ระหว่างทำผลถาวรของตัวที่ down จริง (ดู apply)
  let dCur = null; // สกิลที่กำลังทำผล (ลำดับสกิล + ชนิดผล) ให้ดาเมจที่เกิดจากสกิลรู้ที่มา
  let dFrom = null; // uid ของผู้ใช้สกิลที่กำลังทำผล (คู่กับ dCur)

  // ---------- สร้างนักสู้ ----------
  const F = [];
  const mkFighter = (u, side) => ({
    side, id: u.id, name: u.name, row: u.row, lane: u.lane, level: u.level,
    hp: u.maxHp, maxHp: u.maxHp, atk: u.atk, atkBonus: 0, armor: 0, startArmor: u.startArmor,
    burnHit: u.burnHit, shockHit: u.shockHit, armorHit: u.armorHit || 0, healHit: u.healHit || 0, multi: u.multi, multiBonus: 0,
    cdMs: u.cdMs, cdMult: 1, cdLeft: 0, stunLeft: 0,
    burn: 0, shock: 0, noDecay: 0, noDecayPerm: false, down: false, sets: 0, lowFired: false, lastHitBy: null,
    // ความสามารถถาวร (22 ต.ค.) มาจากทีม (ค่าถาวร) · ไม่มี = 0
    armorAmp: u.armorAmp || 0, cdAmp: u.cdAmp || 0, shockAmp: u.shockAmp || 0, burnNoDecay: !!u.burnNoDecay, frozen: 0, shareArmor: u.shareArmor || 0, shareTo: { ...(u.shareTo || {}) }, healToAtk: u.healToAtk || 0, cdStart: u.cdStart || 0,
    // ชุด 6: ผลที่ได้รับ/ที่ทำ +% (ฝ่ายเรา · ถาวรได้) และผลใส่ศัตรู (ระหว่างสู้)
    healAmp: u.healAmp || 0, hitAmp: u.hitAmp || 0, burnAmp: u.burnAmp || 0, burnTaken: 0, shockTaken: 0, dmgTakenAmp: 0,
    // คูลดาวน์สกิล (19 ต.ค.): นับจากเริ่มแมตช์ · ใช้ได้เมื่อ cdLeft ถึง 0 แล้วเริ่มนับใหม่
    skills: (u.skills || []).map(s => ({ ...s, uses: 0, cdLeft: s.cd || 0 })), dealt: 0, taken: 0,
    tribes: [u.tribe, ...(u.extraTribes || [])], tb: {}, restoreLeft: 0, restoreAmt: 0,
    reflDebuff: [], // ชุด 20: ผู้ปกป้องที่สะท้อนดีบัฟให้ตัวนี้ [{ by, pct }]
    // ชุด 66 (บอส + รูน): ค่าที่รูนตั้งไว้ (core/runes.js) และค่าของบอส (core/boss.js) · ทีมปกติไม่มี = 0/null ผลเหมือนเดิมทุกประการ
    taunt: !!u.taunt, avoidLeft: u.avoidLeft || 0, downDmgPct: u.downDmgPct || 0, bossDmgPct: u.bossDmgPct || 0,
    lastStandDmg: u.lastStandDmg || 0, lastStandCd: u.lastStandCd || 0, shareTribePct: u.shareTribePct || 0, shareTribeN: u.shareTribeN || 0,
    linkSlot: u.linkSlot || null, linkPct: u.linkPct || 0, silenceUntil: 0, avoidedAt: -1, avoidedBy: null,
    boss: !!u.boss, bars: u.bars || 0, barHp: u.barHp || 0, move: !!u.move, moveSec: u.moveSec || 0,
    cells: u.boss ? (u.move ? [u.slots[0]] : u.slots.slice()) : null, slots: u.boss ? u.slots.slice() : null, phases: u.phases || null,
  });
  [teamA, teamB].forEach((team, side) => team.forEach(u => F.push(mkFighter(u, side))));
  F.sort((a, b) => a.side - b.side || a.row - b.row || a.lane - b.lane);
  F.forEach((f, i) => { f.uid = i; });

  // เมล็ดสุ่ม: ส่งมาเอง หรือคำนวณจากทีม (ทีมเดิม = เลขสุ่มชุดเดิม)
  // ชุด 19: ตัวสุ่มแยกต่อฝั่ง · เมล็ดของแต่ละฝั่งคิดจากทีมตัวเอง + เมล็ดแมตช์ที่ไม่ขึ้นกับว่าอยู่ฝั่งไหน
  //   → สลับฝั่งแล้วผลเหมือนเดิม (สกิลสุ่ม เช่น allyRandom2 ของ WN-5 ไม่ทำให้ฝั่งซ้าย/ขวาได้เปรียบ)
  const teamHash = side => { let h = 2166136261; for (const f of F) if (f.side === side) for (const ch of `${f.id}${f.level}${f.row}${f.lane}`) h = (Math.imul(h ^ ch.charCodeAt(0), 16777619) + 1) >>> 0; return h; };
  const th = [teamHash(0), teamHash(1)];
  const base = opts.seed ? opts.seed >>> 0 : (th[0] + th[1]) >>> 0; // บวกกัน = สลับฝั่งได้ค่าเดิม
  const rngs = [0, 1].map(side => makeRng(((Math.imul(base ^ th[side], 2654435761) + 1) >>> 0) || 1));
  const rngOf = side => rngs[side];

  // ---------- โบนัสเผ่า (tribe-rules): นับตัวไม่ซ้ำชื่อบนบอร์ด ให้ผลทั้งทีม ----------
  const tribeOn = [0, 1].map(s => R.tribesOn !== false && !(opts.tribesOff && opts.tribesOff[s]));
  const tExtra = Object.create(null); // ชุด 66: นับเผ่าเพิ่มจากรูนธงเผ่า (ฝั่งผู้เล่น) [{ tribe, count, maxTier }]
  for (const x of opts.tribeExtra || []) if (x && x.count > 0) tExtra[x.tribe] = { count: (tExtra[x.tribe] ? tExtra[x.tribe].count : 0) + x.count, maxTier: Math.max(tExtra[x.tribe] ? tExtra[x.tribe].maxTier : 0, x.maxTier || 6) };
  const steps = [0, 1].map(side => {
    const out = {};
    if (!tribeOn[side]) return out;
    const counts = {};
    for (const id of new Set(F.filter(f => f.side === side).map(f => f.id))) {
      for (const tr of F.find(f => f.side === side && f.id === id).tribes) counts[tr] = (counts[tr] || 0) + 1;
    }
    for (const [tr, n] of Object.entries(counts)) {
      let idx = R.tribeSteps.filter(x => n >= x).length - 1;
      // รูนธงเผ่า (T8 · ชุด 66): เผ่าที่เลือกนับเพิ่ม N ตัว แต่พาไปได้ไม่เกินขั้นที่รูนกำหนด · ใช้กับเผ่าที่ทีมมีอยู่แล้ว
      const e = side === 0 ? tExtra[tr] : null;
      if (e) idx = Math.max(idx, Math.min(R.tribeSteps.filter(x => n + e.count >= x).length - 1, e.maxTier - 1));
      const only = opts.tribeOnly && opts.tribeOnly[side]; // ใช้ทดสอบบาลานซ์: เปิดเฉพาะเผ่าเดียว
      if (idx >= 0 && R.tribeBonus && R.tribeBonus[tr] && (!only || only === tr)) out[tr] = idx;
    }
    return out;
  });
  const TB = (side, tr) => (tr in steps[side] ? { idx: steps[side][tr], b: R.tribeBonus[tr] } : null);
  const reviveLeft = [0, 1].map(side => { const x = TB(side, 'อสูร'); return x ? x.b.revives[x.idx] : 0; });

  // ---------- ตัวช่วย ----------
  let standMode = false; // ชุด 21: ระหว่างหาเพื่อนที่จะพาไปตี นับ "ยังไม่ down" เป็นยืนอยู่ (ไม่ขึ้นกับลำดับฝั่ง)
  const up = f => !f.down && (standMode || f.hp > 0);
  const enemies = f => F.filter(x => x.side !== f.side && up(x));
  const allies = f => F.filter(x => x.side === f.side && up(x));
  const byFront = (a, b) => a.row - b.row || a.lane - b.lane;
  const amp = p => Math.max(0, 1 + (p || 0) / 100); // ตัวคูณจาก +% (ลดได้ไม่ต่ำกว่า 0)
  const pickN = (list, n, side) => { const r = rngOf(side), l = list.slice(), out = []; while (l.length && out.length < n) out.push(l.splice(Math.floor(r.next() * l.length), 1)[0]); return out; };

  // ---------- บอส + รูน (ชุด 66 · phase 2a) ----------
  // บอส = นักสู้ตัวเดียวที่ยืนหลายช่อง (ผู้ใช้เลือก Q1 A) · สกิลที่เล็งแถว/เลนเจอบอสเมื่อช่องใดช่องหนึ่งตรง และโดนครั้งเดียวต่อการใช้สกิล
  // กฎของเฟสปัจจุบันอยู่ใน BR (id → { v, v2, tribe }) · ทีมปกติไม่มีบอส = ทุกตัวช่วยคืนค่ากลาง ผลเหมือนเดิมทุกประการ
  const BOSS = F.find(f => f.boss) || null;
  let BR = Object.create(null), phIdx = 0, barsGone = 0, barT = 0, moveT = 0, enrageT = 0, growT = 0, auraT = 0, shockT = 0, silT = 0, frzT = 0, vanT = 0, curseT = 0, curseQ = null, stormAt = R.stormStartMs;
  const TICKSK = F.some(f => f.skills.some(s => s.when === 'tick')); // รูนที่ทำงานทุก x วินาที (ฮีลเป็นช่วง) · ไม่มี = ข้ามทั้งก้อน
  const rule = id => (BOSS ? BR[id] : null);
  const inLane = (f, lane) => (f.cells ? f.cells.some(i => (i & 1) === lane) : f.lane === lane);
  const inRow = (f, row) => (f.cells ? f.cells.some(i => (i >> 1) === row) : f.row === row);
  const hittable = f => !(f.boss && f.noHitUntil > t); // R27 หายตัว / X3 ตีไม่โดนชั่วคราว
  const foes = f => enemies(f).filter(hittable);
  const alone = f => allies(f).length === 1; // T10 คนสุดท้าย
  const sideDown = side => F.some(x => x.side === side && x.down);
  // ดาเมจตี +% ตอนนี้ (รูนที่เปลี่ยนไปตามสถานการณ์ + ค่าติดตัว)
  const hitAmpOf = f => f.hitAmp + (f.downDmgPct && sideDown(f.side) ? f.downDmgPct : 0) + (f.lastStandDmg && alone(f) ? f.lastStandDmg : 0);
  function cdExtra(f) { // ตัวคูณคูลดาวน์จากกฎบอส/รูน (ไม่มี = 1)
    let m = 1;
    if (f.lastStandCd && alone(f)) m *= Math.max(0.1, 1 - f.lastStandCd / 100);
    if (BOSS) {
      if (f.boss && BR.fastAtk) m *= Math.max(0.1, 1 - BR.fastAtk.v / 100);
      if (!f.boss && BR.cdSlow) m *= 1 + BR.cdSlow.v / 100;
    }
    return m;
  }
  const effCd = f => Math.max(R.minCooldownMs, Math.round(f.cdMs * f.cdMult * cdExtra(f)));
  const atkOf = f => { // R1 บอสตีแรงขึ้น · R13 คลั่ง (×2)
    const a = f.atk + f.atkBonus;
    if (!BOSS || !f.boss) return a;
    return Math.floor(a * (BR.atkUp ? 1 + BR.atkUp.v / 100 : 1) * (BR.desperate ? 2 : 1));
  };
  // ปิดสกิล: E2 แถวหลังเงียบช่วงแรก · R15 สุ่มปิดสกิลเป็นช่วง
  const silenced = f => !!BOSS && !f.boss && ((BR.backSilence && f.row === 2 && t <= BR.backSilence.v * 1000) || f.silenceUntil > t);
  // เพดานฟื้นเลือดของบอส: ไม่เกินยอดของแถบปัจจุบัน (กันลูป "ศัตรู down" ซ้ำ)
  // ยอดของแถบที่บอสอยู่ตอนนี้ · ไม่เกินยอดของแถบที่ยังไม่หมด (แถบที่หมดไปแล้วไม่เต็มกลับ)
  const bossCap = () => Math.min(BOSS.maxHp, (BOSS.bars - barsGone) * BOSS.barHp, Math.ceil(Math.max(0, BOSS.hp) / BOSS.barHp) * BOSS.barHp);
  function bossHeal(v) {
    v = Math.floor(v); if (!(v > 0) || !up(BOSS)) return;
    const h = Math.min(v, bossCap() - BOSS.hp);
    if (h > 0) { BOSS.hp += h; log('heal', { to: BOSS.uid, amount: h }); }
  }

  function normalTarget(f) {
    const es = foes(f);
    if (BOSS && f.boss) { // R5 ตีตัวเลือดน้อยสุด · R6 ตีแถวหลังก่อน
      if (BR.hunter) return es.slice().sort((a, b) => a.hp - b.hp || byFront(a, b))[0] || null;
      if (BR.backStrike) { const bk = es.filter(e => e.row === 2).sort(byFront); if (bk.length) return bk[0]; }
    }
    const pull = es.filter(e => e.taunt).sort(byFront); // รูนโล่ (U4): ศัตรูต้องตีตัวนี้ก่อน · บอสก็ถูกดึง (ผู้ใช้เลือก Q5 U4)
    if (pull.length) return pull[0];
    const same = es.filter(e => inLane(e, f.lane)).sort(byFront);
    if (same.length) return same[0];
    return es.sort(byFront)[0] || null;
  }
  // ศัตรูแถวหลัง (combat-rules V1.19): เฉพาะแถวหลังจริง (row 2) · เลนเดียวกันก่อน แล้วอีกเลน · ไม่มีตัวแถวหลัง = ไม่มีเป้า (ผู้เล่นหลบได้ด้วยการไม่วางแถวหลัง)
  function backTarget(f) {
    const back = foes(f).filter(e => inRow(e, 2));
    return back.find(e => inLane(e, f.lane)) || null; // 22 ต.ค. ชุด 10: เลนเดียวกันเท่านั้น ไม่มี = ไม่มีผล (ไม่ย้ายเลน)
  }
  const lowestEnemy = f => foes(f).sort((a, b) => a.hp - b.hp || byFront(a, b))[0] || null;

  // ชุด 14: ผู้รับของสกิล = เป้าตามช่อง to + เพื่อนตามตำแหน่ง (allyAt) + กรองเผ่าเดียวกัน (sameTribe · นับเผ่าเพิ่ม · ตัวเองผ่านเสมอถ้าเป้าเดิมรวมตัวเอง)
  const RAND_N = { allyRandom: 1, allyRandom2: 2 };
  function skillTargetsOf(u, s, ctx) {
    if (s.to === 'self' && s.perm && u.down && ctx.downed === u) return [u]; // F2: ตัวเอง down จริง ยังได้ค่าถาวร
    if (RAND_N[s.to] && (s.sameTribe || s.skipSameId)) { // ชุด 20: เป้าสุ่ม + กรอง → กรองก่อนแล้วค่อยสุ่ม (เดิมสุ่มก่อนแล้วกรอง ทำให้บ่อยครั้งไม่มีผู้รับ)
      // ชุด 21: พาเพื่อนไปตี (ทำทันทีระหว่างฮิต) ใช้ "ยังไม่ down" แทน HP > 0 · เพื่อนที่ HP หมดใน tick นี้ยังตีได้ เหมือนชุดปกติที่ตั้งไว้แล้ว (ไม่ขึ้นกับลำดับฝั่ง)
      let pool = allies(u).filter(x => x !== u);
      if (s.sameTribe) pool = pool.filter(x => x.tribes.some(t => u.tribes.includes(t)));
      if (s.skipSameId) pool = pool.filter(x => x.id !== u.id);
      return pickN(pool, RAND_N[s.to], u.side);
    }
    let r = s.to === 'allyAt' ? (s.at ? allies(u).filter(x => x !== u && atMatch(s.at, u.row, u.lane, x.row, x.lane)).sort(byFront) : []) : targetsOf(u, s.to, ctx);
    if (s.sameTribe) r = r.filter(x => x === u || x.tribes.some(t => u.tribes.includes(t)));
    if (s.skipSameId) r = r.filter(x => x === u || x.id !== u.id); // ชุด 17: ไม่ให้ผลกับตัวอื่นที่ ID เดียวกัน (ตัวเองยังได้ถ้าผู้รับเดิมรวมตัวเอง)
    return r;
  }
  function targetsOf(f, to, ctx) {
    const al = allies(f), others = al.filter(x => x !== f);
    switch (to) {
      case 'self': return up(f) ? [f] : [];
      // เป้าของฮิต/ผู้ตี: ยังรับสถานะได้จนกว่าจะ down จริงตอนเช็กท้าย tick (ไฟ/ช็อตจากฮิตสุดท้ายนับรวมตอน down)
      case 'target': return ctx.target && !ctx.target.down ? [ctx.target] : [];
      case 'attacker': return ctx.attacker && !ctx.attacker.down ? [ctx.attacker] : [];
      case 'enemyFront': return [normalTarget(f)].filter(Boolean);
      case 'enemyBackRow': return [backTarget(f)].filter(Boolean);
      case 'enemyLane': return foes(f).filter(e => inLane(e, f.lane)).sort(byFront); // ศัตรูทั้งเลนเดียวกัน · ชุด 10: เลนนั้นหมด = ไม่มีผล (ไม่ย้ายเลน)
      case 'enemyFrontRow': return foes(f).filter(e => inRow(e, 0)).sort(byFront); // แถวหน้าทั้ง 2 เลน · ไม่มีใครแถวหน้า = ไม่มีเป้า
      case 'enemyMidRow': return foes(f).filter(e => inLane(e, f.lane) && inRow(e, 1)); // แถวกลางเลนเดียวกัน · ชุด 10: ไม่มี = ไม่มีผล (เปลี่ยนเป้า: ตีเป้าปกติต่อ)
      case 'lowestHp': return [lowestEnemy(f)].filter(Boolean);
      case 'enemyRandom': return pickN(foes(f), 1, f.side);
      case 'allEnemies': return foes(f);
      case 'frontAlly': return others.filter(x => x.lane === f.lane && x.row === f.row - 1);
      case 'backAlly': return others.filter(x => x.lane === f.lane && x.row === f.row + 1);
      case 'frontBackAlly': return others.filter(x => x.lane === f.lane && Math.abs(x.row - f.row) === 1);
      case 'frontLaneAlly': return others.filter(x => x.lane === f.lane && x.row === 0);
      case 'backLaneAlly': return others.filter(x => x.lane === f.lane && x.row > f.row).sort(byFront).slice(0, 1); // ชุด 12: เพื่อนข้างหลังเลนเดียวกัน ตัวใกล้สุด (ข้ามช่องว่าง) · ไม่มี = ไม่มีผล
      case 'frontRowAllies': return others.filter(x => x.row === 0);
      case 'backRowAllies': return others.filter(x => x.row === 2);
      case 'allyLowest': return al.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp || byFront(a, b)).slice(0, 1);
      case 'allyRandom': return pickN(others, 1, f.side);
      case 'allyRandom2': return pickN(others, 2, f.side);
      case 'tribeAllies': return others.filter(x => x.tribes.some(tr => f.tribes.includes(tr)));
      case 'allAllies': return al;
      default: return [];
    }
  }

  // ---------- คิวผลตามลำดับขั้น ----------
  // A = เกราะ · D = ดาเมจจากสกิล · L = เกราะที่เกิดระหว่างดาเมจ (ได้หลังดาเมจ) · S = สถานะ · H = ฟื้น HP
  const Q = { A: [], D: [], L: [], S: [], H: [] };
  let stage = 'pre';
  function enqueue(u, s, ctx) {
    const ph = DO_INFO[s.do].phase;
    // สกิลที่คิดจากเกราะตัวเอง: ใช้เกราะก่อนโดนฮิตใน tick นั้น (เข้าคิวก่อนฮิต = จดตอนเริ่มฮิต · เข้าคิวระหว่างฮิต = จดตอนนั้น)
    const item = { u, s, ctx: stage === 'damage' && armorSnapSkill(s) ? { ...ctx, armorSnap: u.armorTick ?? u.armor } : ctx }; // เกราะก่อนฮิตของ tick นั้น (ไม่ขึ้นกับลำดับฝั่ง)
    if (ph === 0) (stage === 'damage' ? Q.L : Q.A).push(item);
    else if (ph === 1) Q.D.push(item);
    else if (ph === 3) Q.H.push(item);
    else Q.S.push(item);
  }
  // ไม่มีเพดานครั้งต่อแมตช์ (เอาออก 19 ต.ค. combat-rules V1.6) · สกิลที่มีคูลดาวน์สกิลต้องรอให้พร้อมก่อน
  const usable = s => !(s.cd > 0 && s.cdLeft > 0);
  function fire(u, s, when) { // สกิลทำงาน 1 ครั้ง: นับครั้ง เริ่มคูลดาวน์สกิล บันทึก (โหมดจำลองสกิลใช้)
    s.uses++;
    if (s.cd > 0) { // ชุด 17: คูลดาวน์สกิลเพิ่ม % ทุกครั้งที่ใช้ (ทบต้น ถึงจบแมตช์)
      if (s.cdGrow > 0) s.cdNow = Math.min(3600000, Math.round((s.cdNow || s.cd) * (1 + s.cdGrow / 100)));
      s.cdLeft = s.cdNow || s.cd;
    }
    log('proc', { who: u.uid, si: s.idx, what: s.do, when });
  }
  // ทำงานเมื่อเงื่อนไขตรง · คืนสกิลที่ทำงาน (ใช้กับผลที่ปรับชุดทันที)
  function trigger(u, when, ctx, filter) {
    if (BOSS && when !== 'passive' && when !== 'matchStart' && silenced(u)) return; // E2 / R15 ใช้สกิลไม่ได้
    for (const s of u.skills) {
      if (s.when !== when || !usable(s) || (filter && !filter(s))) continue;
      if (s.do === 'allyStrike' && ctx.carried) continue; // ชุด 20: ฮิตที่ถูกพาไปไม่พาต่อ (กันวน · ไม่ใช้คูลดาวน์สกิล)
      if (s.do === 'revive' || s.do === 'reviveAlly' || s.do === 'summon') continue; // ลุกกลับมา/ชุบเพื่อน/เรียกตัว ตรวจตอน down
      if (s.chance != null && s.chance < 100 && rngOf(u.side).next() * 100 >= s.chance) continue;
      fire(u, s, when);
      if (PRE[s.do]) { applyPre(u, s, ctx); continue; }
      if (s.do === 'allyStrike') { carryHit(u, s, ctx); continue; } // ชุด 20: ตีทันที (ไม่เข้าคิว)
      enqueue(u, s, ctx);
    }
  }
  function applyPre(u, s, plan) {
    if (s.do === 'extraHit') plan.hits += s.value;
    else if (s.do === 'spread') plan.spread = true;
    else if (s.do === 'splitAll') plan.split = true;
    else if (s.do === 'retarget') { const x = targetsOf(u, s.to, plan)[0]; if (x) plan.target = x; }
  }

  // ดาเมจ: หักเกราะก่อน HP (ไม่มีการลดดาเมจ) · pierce = เข้า HP ตรง
  const restoreQ = [];
  let subHit = false; // ชุด 33: ฮิตตีแบ่ง (SF-8) เป้าที่ 2 เป็นต้นไป = ส่วนของฮิตเดิม ไม่นับเป็นฮิตใหม่ในสรุปรายตัว
  // กฎบอสที่ปรับดาเมจ (ชุด 66) · ไม่มีบอส = ไม่ถูกเรียก
  function ruleDmg(target, amount, src, why) {
    if (target.boss) {
      if (!hittable(target) && why !== 'burn' && why !== 'storm') return 0; // R27 หายตัว / X3 ตีไม่โดน (ไฟ/พายุยังเข้า)
      if (src && !src.boss) {
        if (BR.frontOnly && src.row !== 0) return 0; // R26
        if (BR.backOnly && src.row !== 2) return 0;
        if (BR.minHit && amount < BR.minHit.v) return 0; // R23
        if (src.bossDmgPct) amount *= 1 + src.bossDmgPct / 100; // รูนล่าบอส (T9)
        if (BR.tribeWeak && src.tribes.includes(BR.tribeWeak.tribe)) amount *= 1 + BR.tribeWeak.v / 100; // R25
        if (BR.tribeResist && src.tribes.includes(BR.tribeResist.tribe)) amount *= Math.max(0, 1 - BR.tribeResist.v / 100);
      }
      if (BR.desperate) amount *= 1 + BR.desperate.v / 100; // R13 คลั่ง: โดนดาเมจเพิ่ม
      if (BR.weakSpot && target.weakUntil > t) amount *= 1 + BR.weakSpot.v / 100; // R30 หลังย้ายที่
      if (BR.hitCap) amount = Math.min(amount, BOSS.barHp * BR.hitCap.v / 100); // R22 ตี 1 ครั้งเข้าไม่เกิน
    } else if (BR.frontBreak && target.row === 0) amount *= 1 + BR.frontBreak.v / 100; // R18
    return Math.floor(amount);
  }
  function hurt(target, amount, src, pierce, why, det) {
    amount = Math.floor(amount);
    if (BOSS) amount = ruleDmg(target, amount, src, why);
    if (amount <= 0 || target.down) return 0;
    // รูนสายสัมพันธ์ (X6): คู่ที่เลือกรับดาเมจแทน % · รับแทนต่อไม่ได้
    if (target.linkPct > 0 && why !== 'link') {
      const p = F.find(x => x.side === target.side && x !== target && x.row === target.linkSlot[0] && x.lane === target.linkSlot[1]);
      if (p && up(p)) {
        const share = Math.floor(amount * target.linkPct / 100);
        if (share > 0) { hurt(p, share, src, pierce, 'link', det); amount -= share; if (amount <= 0) return 0; }
      }
    }
    // รูนเลี่ยงจุดตาย (X4): ฮิตที่จะทำให้ down ถูกยกเลิกทั้งฮิต (ไฟ/ช็อตของฮิตนั้นด้วย ดู strike)
    if (target.avoidLeft > 0 && (why === 'hit' || why === 'shock') && (pierce ? amount : Math.max(0, amount - target.armor)) >= target.hp) {
      target.avoidLeft--; target.avoidedAt = t; target.avoidedBy = src || null;
      log('avoid', { to: target.uid, from: src ? src.uid : null });
      return 0;
    }
    let absorbed = 0;
    if (!pierce && target.armor > 0) {
      const before = target.armor;
      absorbed = Math.min(before, amount);
      target.armor = before - absorbed;
      if (target.armor === 0) {
        if (target.restoreLeft > 0) { target.restoreLeft--; restoreQ.push(target); }
        trigger(target, 'armorBreak', { amount: before, attacker: src && src.side !== target.side ? src : null });
      }
    }
    const loss = amount - absorbed;
    const wasAbove = target.hp * 2 >= target.maxHp;
    target.hp -= loss;
    target.taken += amount;
    if (src) src.dealt += amount;
    if (BOSS && target.boss && amount > 0) { // R8 ดูดเลือด (ไม่เกินแถบปัจจุบัน) · E7 สะท้อนดาเมจกลับ (ของที่สะท้อนไม่สะท้อนต่อ)
      if (BR.lifesteal) bossHeal(amount * BR.lifesteal.v / 100);
      if (BR.reflect && src && !src.boss && why !== 'reflect' && up(src)) Q.D.push({ u: target, s: { do: 'dmg', to: 'attacker', value: Math.floor(amount * BR.reflect.v / 100), why: 'reflect' }, ctx: { attacker: src } });
    }
    target.lastHitBy = src && src.side !== target.side ? src : null; // ผู้ทำ down = ผู้ทำดาเมจครั้งสุดท้าย (ไฟ/พายุทราย = ไม่มี)
    if (detailOn) { const dd = { ...(dCur || {}), ...(det || {}) }; if (target.hp < 0) dd.over = Math.min(loss, -target.hp); log('dmg', { to: target.uid, from: src ? src.uid : null, amount, absorbed, why, ...(subHit && why === 'hit' ? { sub: 1 } : {}), d: dd }); } else
    log('dmg', subHit && why === 'hit' ? { to: target.uid, from: src ? src.uid : null, amount, absorbed, why, sub: 1 } : { to: target.uid, from: src ? src.uid : null, amount, absorbed, why });
    if (!target.lowFired && wasAbove && target.hp > 0 && target.hp * 2 < target.maxHp) {
      target.lowFired = true;
      trigger(target, 'lowHp', { attacker: src && src.side !== target.side ? src : null });
    }
    return absorbed;
  }
  function addArmor(f, v, why) {
    v = Math.floor(v * amp(f.armorAmp)); // เกราะที่ได้รับ +% (ศัตรูลดได้ด้วย "ได้เกราะน้อยลง" · ต่ำสุด 0)
    if (BOSS && !f.boss) { // R17 ผู้เล่นได้เกราะไม่ได้ · E4 เกราะผู้เล่นลดลง
      if (BR.noArmor) return;
      if (BR.armorCut) v = Math.floor(v * Math.max(0, 1 - BR.armorCut.v / 100));
    }
    if (!(v > 0 && up(f))) return;
    f.armor += v; log('armor', { to: f.uid, amount: v, why });
    // แบ่งเกราะ (HL-8): เพื่อนทั้งทีมได้ % ของเกราะที่ตัวนี้ได้ · เกราะที่ได้จากการแบ่งไม่แบ่งต่อ (กันวนไม่จบ)
    if (why !== 'share') { // แบ่งเกราะ (ชุด 7): แยกตามผู้รับ · shareArmor = ทั้งทีม
      if (f.shareArmor > 0) for (const x of allies(f)) if (x !== f) addArmor(x, v * f.shareArmor / 100, 'share');
      for (const [to, pct] of Object.entries(f.shareTo)) if (pct > 0) for (const x of targetsOf(f, to, {})) if (x !== f) addArmor(x, v * pct / 100, 'share');
      // รูนแบ่งเกราะให้เพื่อนเผ่าเดียวกัน (ชุด 66): สุ่ม N ตัว · เกราะที่แบ่งไปไม่แบ่งต่อ
      if (f.shareTribePct > 0) for (const x of pickN(allies(f).filter(x => x !== f && x.tribes.some(tr => f.tribes.includes(tr))), f.shareTribeN, f.side)) addArmor(x, v * f.shareTribePct / 100, 'share');
    }
  }
  // credit = ผู้ที่นับเป็นผู้ทำให้ติด เมื่อไม่ใช่ src (F1 28 ต.ค. ผู้ใช้เลือก A: ไฟ/ช็อตที่สะท้อน นับเป็นของ PT-8 ที่สะท้อน · ไม่ใช้ค่า +% ของมัน · ถ้ามี PT-8 หลายตัวปกป้องเพื่อนคนเดียวกัน นับให้ตัวแรก)
  function addStatus(f, kind, v, why, src, credit) {
    if (kind === 'burn' && src && src.side !== f.side && src.burnAmp) v *= amp(src.burnAmp); // ไฟที่ทำให้ติด +% (ชุด 6)
    v = Math.floor(v);
    if (v <= 0 || f.down) return;
    if (BOSS && f.boss && BR.statusImmune) return; // R24 บอสไม่ติดไฟ/ช็อต
    const by = src || credit;
    f[kind] += v; log(kind, { to: f.uid, amount: v, total: f[kind], why, from: by ? by.uid : null }); // from = ผู้ทำให้ติด (สรุปผลจำลองใช้)
    if (kind === 'burn' && src && src.burnNoDecay) f.noDecayPerm = true;
    if (why !== 'reflect' && src && src.side !== f.side) reflectBack(f, src, kind, v);
  }
  // ชุด 20 (PT-8): ตัวที่มีผู้ปกป้อง (ยังยืนอยู่) โดนศัตรูใส่ ไฟ/ช็อต/คูลดาวน์ช้าลง → ศัตรูที่ใส่โดนกลับ % (รวมทุกผู้ปกป้อง ไม่เกิน reflectDebuffMaxPct)
  // ตัวที่โดนยังโดนเต็ม · ของที่สะท้อนไปแล้วไม่สะท้อนกลับ (กันวน) · ไฟ/ช็อตที่สะท้อน ปัดลง
  function reflectBack(f, src, kind, v) {
    if (!f.reflDebuff.length || !up(src)) return;
    let p = 0; const by = []; for (const r of f.reflDebuff) if (up(r.by)) { p += r.pct; by.push({ u: r.by, si: r.si }); }
    p = Math.min(R.reflectDebuffMaxPct ?? 100, p);
    if (!(p > 0)) return;
    // ชุด 21: เก็บไว้ทำหลังคิวสถานะของ tick นั้นหมด (เดิมทำทันที → ลำดับฝั่งมีผล เช่น PL-4 อ่านไฟศัตรูก่อน/หลังไฟที่สะท้อน · เทสต์สลับฝั่งพัง)
    if (kind === 'cdSlowPct') reflQ.push({ src, from: f, kind, amount: v * p / 100, by });
    else { const n = Math.floor(v * p / 100); if (n > 0) reflQ.push({ src, from: f, kind, amount: n, by }); }
  }
  let reflQ = [], revQ = [];
  function flushRevive() {
    const list = revQ; revQ = [];
    for (const { u, v, s } of list) {
      if (!up(u)) continue;
      const pool = F.filter(x => x.side === u.side && x.down && !x.summoned && !x.replaced);
      for (const x of pickN(pool, v, u.side)) { x.down = false; x.lastHitBy = null; reviveUnit(x, R.reviveAllyHpPct, 'ally', u, s); }
    }
  }
  function flushRefl() {
    while (reflQ.length) {
      const list = reflQ; reflQ = [];
      for (const { src, from, kind, amount, by } of list) {
        if (src.down) continue;
        const g = by[0]; // ผู้สะท้อน (นับเครดิตให้ตัวนี้) · from = เพื่อนที่ถูกปกป้อง
        // F1 (28 Oct, user A): from = PT-8 ที่สะท้อน (ได้เครดิต) · ally/si = เพื่อนที่ถูกปกป้อง + ลำดับสกิล (จดเมื่อเปิด detail ให้แท็บ "อื่นๆ" ของ PT-8)
        log('reflectDebuff', { to: src.uid, from: g.u.uid, kind, amount, ...(detailOn ? { ally: from.uid, si: g.si } : {}) });
        if (kind === 'cdSlowPct') { src.cdMult *= 1 + amount / 100; buff(src, 'cdSlowPct', amount); }
        else addStatus(src, kind, amount, 'reflect', null, g.u);
      }
    }
  }
  function cutCd(f, ms) { if (up(f)) { ms = Math.floor(ms * (1 + f.cdAmp / 100)); f.cdLeft = Math.max(0, f.cdLeft - ms); log('cdCut', { to: f.uid, ms }); } }
  function heal(f, v, src, why) {
    v = Math.floor(v * amp(f.healAmp)); // ฟื้น HP ที่ได้รับ +% / ฟื้นน้อยลง (ชุด 6)
    if (BOSS && !f.boss && BR.healCut) v = Math.floor(v * Math.max(0, 1 - BR.healCut.v / 100)); // E3 ผู้เล่นฟื้นได้น้อยลง
    if (!up(f) || v <= 0) return; // ฟื้น HP ไม่ช่วยตัวที่ HP ถึง 0 แล้ว (ต้องใช้สกิลลุกกลับมา)
    const h = Math.min(v, f.maxHp - f.hp);
    if (h > 0) {
      f.hp += h; log('heal', detailOn && why ? { to: f.uid, amount: h, why } : { to: f.uid, amount: h }); // A1: why (e.g. healHit) only with detail on
      // ฟื้นเป็นพลัง (PT-4): ผู้ฟื้นได้พลังโจมตี % ของ HP ที่ฟื้นได้จริง (ระหว่างสู้)
      if (src && src.healToAtk > 0 && up(src)) { const a = Math.floor(h * src.healToAtk / 100); if (a > 0) { src.atkBonus += a; log('atkUp', { to: src.uid, amount: a }); } }
    }
  }
  const buff = (x, what, amount) => log('buff', { to: x.uid, what, amount });
  // ชุด 37: ค่าที่เดิมไม่มีเหตุการณ์ (ดาเมจตี/ไฟ/ช็อต +% · ฟื้น/เกราะที่ได้รับ · เร่งผลคูลดาวน์ · ฟื้นเป็นพลัง) จดเฉพาะเมื่อเปิด detail (dx = จดเพิ่มเพื่อแสดง ไม่นับเป็นเหตุการณ์ของเกม)
  const statNote = (x, what, amount) => { if (detailOn) log('buff', { to: x.uid, what, amount, dx: 1 }); };
  // ชุด 37: ค่าสเตตัสของนักสู้ ณ ตอนนั้น (ใช้เทียบก่อน/หลังแมตช์ในแท็บสเตตัส · เปิด detail เท่านั้น)
  const snapStats = f => ({ atk: atkOf(f), maxHp: f.maxHp, multi: f.multi + f.multiBonus, burnHit: f.burnHit, shockHit: f.shockHit, armorHit: f.armorHit, healHit: f.healHit || 0, cdMs: f.cdMs, cdMult: f.cdMult, hitAmp: f.hitAmp, burnAmp: f.burnAmp, shockAmp: f.shockAmp, healAmp: f.healAmp, armorAmp: f.armorAmp, cdAmp: f.cdAmp, healToAtk: f.healToAtk, burnTaken: f.burnTaken, shockTaken: f.shockTaken, dmgTaken: f.dmgTakenAmp });
  const iniStats = new Map();
  // ค่าที่ผล "% ของ" ใช้คิด (ชุด 7): stat ของ who · each = ตัวที่โดนผล · ctx = เป้าหมาย/ผู้ตี · all* = รวมตัวที่ยืนอยู่
  const STAT = { atk: (f, me, ctx) => atkOf(f), armor: (f, me, ctx) => (f === me && ctx.armorSnap != null ? ctx.armorSnap : f.armor), maxHp: f => f.maxHp, hp: f => Math.max(0, f.hp), hpLost: f => Math.max(0, f.maxHp - Math.max(0, f.hp)), burn: f => f.burn, shock: f => f.shock, healHit: f => f.healHit || 0 };
  function ofVal(u, s, x, ctx) {
    const st = STAT[s.of && s.of.stat]; if (!st) return 0;
    const who = s.of.who, one = f => (f ? st(f, u, ctx) : 0);
    if (who === 'self') return one(u);
    if (who === 'each') return one(x);
    if (who === 'ctx') return one(ctx.target || ctx.attacker);
    if (who === 'allEnemies') return enemies(u).reduce((a, f) => a + one(f), 0);
    if (who === 'allAllies') return allies(u).reduce((a, f) => a + one(f), 0);
    // ชุด 12: เลนเดียวกัน = เลนของตัวนี้ · แถวเดียวกัน = แถวของตัวนี้ ทั้ง 2 เลน · รวมเฉพาะตัวที่ยืนอยู่ (ไม่มี = 0) · ฝั่งเพื่อนนับตัวนี้ด้วย
    if (who === 'laneEnemies') return enemies(u).filter(f => inLane(f, u.lane)).reduce((a, f) => a + one(f), 0);
    if (who === 'rowEnemies') return enemies(u).filter(f => inRow(f, u.row)).reduce((a, f) => a + one(f), 0);
    if (who === 'laneAllies') return allies(u).filter(f => f.lane === u.lane).reduce((a, f) => a + one(f), 0);
    if (who === 'rowAllies') return allies(u).filter(f => f.row === u.row).reduce((a, f) => a + one(f), 0);
    return 0;
  }
  // สกิลถาวร (22 ต.ค. combat-rules V1.24): ผลเกิดทันทีตามปกติ + จดค่าถาวรให้ตัวฝ่ายเดียวกันที่ได้รับ (ไม่รวมตัวที่ถูกเรียกมาสู้แทน)
  // ร้านค้าใช้ผล perm ของฝั่งตัวเองหลังจบแมตช์ (endMatch) · ทุกครั้งที่สกิลทำงานนับหมด
  const gains = new Map();
  function permRec(u, s, x, amount, key = DO_INFO[s.do].perm) {
    amount = Math.floor(amount);
    if (!s.perm || !key || !(amount > 0) || !x || x.side !== u.side || x.summoned) return;
    const k = `${x.side}:${x.row}:${x.lane}:${x.id}:${key}`;
    const g = gains.get(k) || { side: x.side, row: x.row, lane: x.lane, id: x.id, key, amount: 0 };
    g.amount += amount; gains.set(k, g);
    log('perm', { to: x.uid, key, amount });
  }

  // ทำผลของสกิล 1 ครั้ง
  // F2 (28 Oct, user A): สกิล "ตัวเอง down" ที่ได้ค่าถาวรให้ตัวเอง ได้ค่าถาวรทุกครั้งที่ทำงาน แม้ down จริง (ไม่ลุก) · ผลในแมตช์ไม่มี (ตัวนี้สู้ต่อไม่ได้แล้ว): ปิดบันทึกยกเว้น perm แล้วคืนค่าตัวนั้นเหมือนเดิม
  function apply(it) {
    if (!(it.u.down && it.ctx.downed === it.u && it.s.perm && it.s.to === 'self')) return applyD(it);
    const keep = { ...it.u }; muteLog = true;
    try { return applyD(it); } finally { muteLog = false; Object.assign(it.u, keep); }
  }
  function applyD(it) { // ชุด 36: จดที่มาของดาเมจจากสกิล (เฉพาะเมื่อเปิด detail)
    if (!detailOn) return apply0(it);
    const prev = dCur, prevFrom = dFrom; dCur = { si: it.s.idx ?? null, what: it.s.do, ...(it.s.src ? { src: it.s.src } : {}), ...(it.s.why === 'tribe' ? { src: 'tribe' } : {}) }; dFrom = it.u.uid;
    try { return apply0(it); } finally { dCur = prev; dFrom = prevFrom; }
  }
  function apply0({ u, s, ctx }) {
    const v = s.value, why = s.why || u.id;
    const dwhy = s.why || (ctx.downed ? 'downSkill' : 'skill');
    const T = () => skillTargetsOf(u, s, ctx);
    switch (s.do) {
      case 'armor': for (const x of T()) { addArmor(x, v, why); permRec(u, s, x, v); } break;
      case 'armorPct': for (const x of T()) { addArmor(x, x.maxHp * v / 100, why); permRec(u, s, x, x.maxHp * v / 100); } break;
      case 'heal': for (const x of T()) { heal(x, v, u, why); permRec(u, s, x, v); } break;
      case 'healPct': for (const x of T()) { heal(x, x.maxHp * v / 100, u); permRec(u, s, x, x.maxHp * v / 100); } break;
      case 'lifesteal': if (ctx.dealt > 0) { heal(u, ctx.dealt * v / 100, u); permRec(u, s, u, ctx.dealt * v / 100); } break;
      case 'dmgPctArmor': for (const x of T()) hurt(x, (ctx.armorSnap ?? u.armor) * v / 100, u, false, dwhy); break;
      case 'dmgPctEnemyBurn': { const sum = enemies(u).reduce((a, e) => a + e.burn, 0); for (const x of T()) hurt(x, sum * v / 100, u, false, dwhy); break; }
      case 'execute': for (const x of T()) if (up(x)) hurt(x, x.hp, u, true, 'execute'); break; // เข้า HP ตรง ไม่สนเกราะ
      case 'selfKo': if (up(u)) hurt(u, u.hp, null, true, 'execute'); break; // ชุด 16 (SF-5): ตัวเอง down ทันที · ไม่มีผู้ทำ down (ไม่กระตุ้น "ทำศัตรู down")
      case 'burnPctArmor': for (const x of T()) addStatus(x, 'burn', (ctx.armorSnap ?? u.armor) * v / 100, why, u); break;
      case 'maxHpCut': for (const x of T()) if (up(x)) {
        const cut = Math.floor(x.maxHp * v / 100);
        if (cut <= 0) continue;
        x.maxHp = Math.max(1, x.maxHp - cut); x.hp = Math.min(x.hp, x.maxHp);
        log('maxhp', { to: x.uid, amount: cut, maxHp: x.maxHp, hp: x.hp });
      } break;
      case 'cleanse': for (const x of T()) if (up(x)) { // ล้าง ไฟ ช็อต ไฟไม่ลด มึนงง และแช่แข็งที่ยังไม่หมด
        x.burn = x.shock = x.noDecay = 0; x.noDecayPerm = false; x.stunLeft = 0;
        if (x.frozen > 0) { x.cdLeft = Math.max(0, x.cdLeft - x.frozen); x.frozen = 0; }
        log('cleanse', { to: x.uid });
      } break;
      case 'cleansePct': for (const x of T()) if (up(x) && (x.burn > 0 || x.shock > 0)) { // ชุด 20: ล้างไฟ/ช็อต % ของที่มี (ปัดลง) · ไม่แตะแช่แข็ง/มึนงง
        const b = Math.floor(x.burn * v / 100), k = Math.floor(x.shock * v / 100);
        if (b <= 0 && k <= 0) continue;
        x.burn -= b; x.shock -= k; if (x.burn === 0) { x.noDecay = 0; x.noDecayPerm = false; }
        log('cleanse', { to: x.uid, what: 'pct', burn: x.burn, shock: x.shock, cut: [b, k] });
      } break;
      case 'reviveDowned': { // ชุด 20 (WN-4): ชุบเพื่อนที่ down จริงอยู่ สุ่ม v ตัว · ไม่รวมตัวที่ถูกเรียกมาสู้แทน และตัวที่ช่องถูกแทนแล้ว · HP เท่าชุบเพื่อน
        if (!up(u)) break;
        revQ.push({ u, v, s }); // ชุด 21: ชุบหลังฟื้น HP ทั้งหมดของ tick (เดิมชุบทันที → ฟื้นที่เลือก "เพื่อน HP ต่ำสุด" ขึ้นกับลำดับฝั่ง)
        break; }
      case 'reflectDebuff': for (const x of T()) { x.reflDebuff.push({ by: u, pct: v, si: s.idx ?? null }); buff(x, 'reflectDebuff', v); } break;
      case 'eatAllyBurn': { let sum = 0; for (const x of allies(u)) if (x.burn > 0) { sum += x.burn; x.burn = 0; x.noDecay = 0; x.noDecayPerm = false; log('cleanse', { to: x.uid, what: 'burn' }); }
        const a = Math.floor(sum * v / 100); if (a > 0) { u.atkBonus += a; log('atkUp', { to: u.uid, amount: a }); permRec(u, s, u, a); } break; }
      case 'stealShock': for (const x of T()) if (up(x) && x.shock > 0) { // ดูดช็อต (SF-6): ช็อตบนเป้าลดลงเท่าที่ดูด ตัวเองได้ช็อตต่อฮิตเท่านั้น (ระหว่างสู้)
        const n = Math.floor(x.shock * v / 100); if (n <= 0) continue;
        x.shock -= n; u.shockHit += n;
        log('steal', { to: x.uid, from: u.uid, amount: n, total: x.shock }); buff(u, 'shockHitUp', n); permRec(u, s, u, n);
      } break;
      case 'shareArmor': { const to = s.to === 'self' || s.to === 'allAllies' ? null : s.to; // เดิม self = ทั้งทีม
        if (to) u.shareTo[to] = (u.shareTo[to] || 0) + v; else u.shareArmor += v;
        permRec(u, s, u, v, to ? 'share_' + to : 'shareArmor'); break; }
      // ชุด 7: ผลแบบ % ของ ค่า ของ ใคร
      case 'dmgOf': for (const x of T()) hurt(x, ofVal(u, s, x, ctx) * v / 100, u, false, dwhy); break;
      case 'burnOf': case 'shockOf': for (const x of T()) addStatus(x, s.do === 'burnOf' ? 'burn' : 'shock', ofVal(u, s, x, ctx) * v / 100, why, u); break;
      case 'atkOf': for (const x of T()) { const a = Math.floor(ofVal(u, s, x, ctx) * v / 100); if (a > 0) { x.atkBonus += a; log('atkUp', { to: x.uid, amount: a }); permRec(u, s, x, a); } } break;
      case 'hpOf': for (const x of T()) { const a = Math.floor(ofVal(u, s, x, ctx) * v / 100); if (a > 0) { x.maxHp += a; x.hp += a; buff(x, 'hpUp', a); permRec(u, s, x, a); } } break;
      case 'burnHitOf': for (const x of T()) { const a = Math.floor(ofVal(u, s, x, ctx) * v / 100); if (a > 0) { x.burnHit += a; buff(x, 'burnHitUp', a); permRec(u, s, x, a); } } break;
      case 'shockHitOf': for (const x of T()) { const a = Math.floor(ofVal(u, s, x, ctx) * v / 100); if (a > 0) { x.shockHit += a; buff(x, 'shockHitUp', a); permRec(u, s, x, a); } } break;
      case 'armorHitOf': for (const x of T()) { const a = Math.floor(ofVal(u, s, x, ctx) * v / 100); if (a > 0) { x.armorHit += a; buff(x, 'armorHitUp', a); permRec(u, s, x, a); } } break;
      case 'armorOf': for (const x of T()) { const a = ofVal(u, s, x, ctx) * v / 100; addArmor(x, a, why); permRec(u, s, x, a); } break;
      // F3 (28 Oct, user A): ค่าที่ใช้คิดอ่านครั้งเดียวตอนสกิลทำงาน → ทุกคนที่ได้ฟื้นได้ % ของค่าเดียวกัน (เดิมอ่านใหม่หลังฟื้นแต่ละคน PT-6 ฟื้นตัวเองก่อนแล้วคนถัดไปได้น้อยลง) · who=each (WN-5) ยังอ่านของแต่ละคน
      case 'healOf': { const once = s.of && s.of.who === 'each' ? null : ofVal(u, s, null, ctx); for (const x of T()) { const a = (once ?? ofVal(u, s, x, ctx)) * v / 100; heal(x, a, u); permRec(u, s, x, a); } break; }
      case 'healToAtk': u.healToAtk += v; statNote(u, 'healToAtk', v); permRec(u, s, u, v); break;
      case 'dmg': for (const x of T()) hurt(x, v, u, false, dwhy); break;
      case 'dmgPctAtk': for (const x of T()) hurt(x, atkOf(u) * v / 100, u, false, dwhy); break;
      case 'armorBreakDmg': if (ctx.amount > 0) for (const x of T()) hurt(x, ctx.amount * v / 100, u, false, 'armorBreak'); break;
      case 'reflect': if (ctx.taken > 0) for (const x of T()) hurt(x, ctx.taken * v / 100, u, false, 'reflect'); break;
      case 'reflectOf': for (const x of T()) hurt(x, ofVal(u, s, x, ctx) * v / 100, u, false, 'reflect'); break; // ชุด 12
      case 'counter': case 'counterMulti': for (const x of T()) for (let i = 0, n = s.do === 'counter' ? v : u.multi + u.multiBonus; i < n && up(x); i++) { // สวนกลับ: ไม่กระตุ้นสกิลโดนตีต่อ (กันวนไม่จบ)
        hurt(x, atkOf(u), u, false, 'counter', detailOn ? { atk: u.atk, bonus: u.atkBonus } : null);
        if (x.shock > 0 && up(x)) hurt(x, x.shock * amp(u.shockAmp) * amp(x.shockTaken), u, true, 'shock', detailOn ? { shock: x.shock, amp: u.shockAmp, tribeAmp: u.shockAmpT || 0, takenAmp: x.shockTaken } : null);
      } break;
      case 'burn': case 'shock': for (const x of T()) addStatus(x, s.do, v, why, u); break;
      case 'freeze': for (const x of T()) if (up(x)) { x.cdLeft += v; x.frozen += v; buff(x, 'freeze', v); } break;
      case 'cdSlowPct': for (const x of T()) if (up(x)) { x.cdMult *= 1 + v / 100; buff(x, 'cdSlowPct', v); if (x.side !== u.side) reflectBack(x, u, 'cdSlowPct', v); } break; // ชุด 16: มีผลกับคูลดาวน์รอบถัดไป
      case 'stun': for (const x of T()) if (up(x)) { const vv = s.bossPct != null && x.boss ? Math.floor(v * s.bossPct / 100) : v; if (vv > 0) { x.stunLeft = Math.max(x.stunLeft, vv); buff(x, 'stun', vv); } } break; // bossPct = รูนหยุดศัตรู (บอสหยุดสั้นกว่า)
      case 'noDecay': for (const x of T()) if (up(x)) x.noDecay += v; break;
      case 'spreadBurn': if (ctx.burn > 0) for (const x of T()) addStatus(x, 'burn', ctx.burn * v / 100, why, u); break;
      case 'moveShock': if (ctx.shock > 0) for (const x of T()) addStatus(x, 'shock', ctx.shock * v / 100, why, u); break;
      case 'cdCut': for (const x of T()) { cutCd(x, v); permRec(u, s, x, v); } break;
      case 'cdPct': for (const x of T()) { x.cdMult *= Math.max(0.05, 1 - (v * (1 + x.cdAmp / 100)) / 100); log('cdPct', { to: x.uid, pct: v }); permRec(u, s, x, v); } break;
      case 'atkUp': for (const x of T()) { x.atkBonus += v; log('atkUp', { to: x.uid, amount: v }); permRec(u, s, x, v); } break;
      case 'atkPct': for (const x of T()) { const a = Math.floor(atkOf(x) * v / 100); x.atkBonus += a; log('atkUp', { to: x.uid, amount: a }); permRec(u, s, x, a); } break;
      case 'hpUp': for (const x of T()) { x.maxHp += v; x.hp += v; buff(x, 'hpUp', v); permRec(u, s, x, v); } break;
      case 'multiUp': for (const x of T()) { x.multiBonus += v; buff(x, 'multiUp', v); permRec(u, s, x, v); } break;
      case 'burnHitUp': for (const x of T()) { x.burnHit += v; buff(x, 'burnHitUp', v); permRec(u, s, x, v); } break;
      case 'shockHitUp': for (const x of T()) { x.shockHit += v; buff(x, 'shockHitUp', v); permRec(u, s, x, v); } break;
      case 'burnNoDecay': for (const x of T()) { x.burnNoDecay = true; permRec(u, s, x, 1); } break;
      case 'armorAmp': for (const x of T()) { x.armorAmp += v; statNote(x, 'armorAmp', v); permRec(u, s, x, v); } break;
      case 'cdAmp': for (const x of T()) { x.cdAmp += v; statNote(x, 'cdAmp', v); permRec(u, s, x, v); } break;
      case 'shockAmp': for (const x of T()) { x.shockAmp += v; statNote(x, 'shockAmp', v); permRec(u, s, x, v); } break;
      // ชุด 6: ค่าพลังเพิ่มทุกแบบ (+ ค่า / + %) · ผลที่ได้รับ/ที่ทำ +% · ผลใส่ศัตรู
      case 'hpPct': for (const x of T()) { const a = Math.floor(x.maxHp * v / 100); x.maxHp += a; x.hp += a; buff(x, 'hpUp', a); permRec(u, s, x, v); } break;
      case 'armorHitUp': for (const x of T()) { x.armorHit += v; buff(x, 'armorHitUp', v); permRec(u, s, x, v); } break;
      case 'healHitUp': for (const x of T()) { x.healHit = (x.healHit || 0) + v; buff(x, 'healHitUp', v); permRec(u, s, x, v); } break; // ฟื้น/ฮิต + (28 ต.ค.)
      case 'armorHitPct': for (const x of T()) { const a = Math.floor(x.armorHit * v / 100); x.armorHit += a; buff(x, 'armorHitUp', a); permRec(u, s, x, v); } break;
      case 'burnHitPct': for (const x of T()) { const a = Math.floor(x.burnHit * v / 100); x.burnHit += a; buff(x, 'burnHitUp', a); permRec(u, s, x, v); } break;
      case 'shockHitPct': for (const x of T()) { const a = Math.floor(x.shockHit * v / 100); x.shockHit += a; buff(x, 'shockHitUp', a); permRec(u, s, x, v); } break;
      case 'cdMsDown': for (const x of T()) { x.cdMs = Math.max(0, x.cdMs - v); buff(x, 'cdMsDown', v); permRec(u, s, x, v); } break;
      case 'healAmp': for (const x of T()) { x.healAmp += v; statNote(x, 'healAmp', v); permRec(u, s, x, v); } break;
      case 'hitAmp': for (const x of T()) { x.hitAmp += v; statNote(x, 'hitAmp', v); permRec(u, s, x, v); } break;
      case 'burnAmp': for (const x of T()) { x.burnAmp += v; statNote(x, 'burnAmp', v); permRec(u, s, x, v); } break;
      case 'burnTakenUp': for (const x of T()) if (up(x)) { x.burnTaken += v; buff(x, 'burnTakenUp', v); } break;
      case 'shockTakenUp': for (const x of T()) if (up(x)) { x.shockTaken += v; buff(x, 'shockTakenUp', v); } break;
      case 'dmgTakenUp': for (const x of T()) if (up(x)) { x.dmgTakenAmp += v; buff(x, 'dmgTakenUp', v); } break;
      case 'armorGainCut': for (const x of T()) if (up(x)) { x.armorAmp -= v; buff(x, 'armorGainCut', v); } break;
      case 'healCut': for (const x of T()) if (up(x)) { x.healAmp -= v; buff(x, 'healCut', v); } break;
    }
  }
  // ฮิต 1 ครั้ง (แยกออกมาชุด 20 ให้ฮิตที่ถูกพาไปใช้ร่วม): n = จำนวนเป้าที่แบ่ง · first = ฮิตแรกของชุด (โบนัสเผ่า) · carried = ฮิตที่ถูกพาไป
  function strike(a, tg, n, first, carried, pow) {
    const part = x => Math.floor(x / n);
    const atk0 = n > 1 ? Math.max(1, part(atkOf(a))) : atkOf(a);
    const atkP = pow != null && pow !== 100 ? Math.max(1, Math.floor(atk0 * pow / 100)) : atk0; // R4 ตีโดนทุกตัว % · รูนคู่หู % ของการโจมตีปกติ
    const ha = hitAmpOf(a); // ชุด 66: รูนที่เปลี่ยนตามสถานการณ์ (เพื่อน down / เหลือตัวเดียว)
    const atk = ha || tg.dmgTakenAmp ? Math.floor(atkP * amp(ha) * amp(tg.dmgTakenAmp)) : atkP; // ดาเมจตี +% / ดาเมจที่โดน +% (ชุด 6)
    const absorbed = hurt(tg, atk, a, false, 'hit', detailOn ? { atk: a.atk, bonus: a.atkBonus, n, amp: ha, tribeAmp: a.hitAmpT || 0, takenAmp: tg.dmgTakenAmp, carried: carried ? 1 : 0 } : null);
    if (tg.avoidedAt === t && tg.avoidedBy === a) return; // รูนเลี่ยงจุดตาย: ยกเลิกทั้งฮิต (ดาเมจ ไฟ ช็อต)
    let taken = atk;
    if (tg.shock > 0 && up(tg)) { const sd = Math.floor(tg.shock * amp(a.shockAmp) * amp(tg.shockTaken)); hurt(tg, sd, a, true, 'shock', detailOn ? { shock: tg.shock, amp: a.shockAmp, tribeAmp: a.shockAmpT || 0, takenAmp: tg.shockTaken } : null); taken += Math.max(0, sd); } // ช็อต: ดาเมจจริงเต็มค่าทุกฮิต · ชุด 34: ตีแบ่งหารเฉพาะค่าของผู้ตี ช็อตบนเป้าแตกเต็มค่า
    if (first) { // โบนัสเผ่า: ฮิตแรกของชุด (ฮิตที่ถูกพาไปไม่นับ)
      if (a.tb.burn && a.sets % a.tb.burn[1] === 0) Q.S.push({ u: a, s: { do: 'burn', to: 'target', value: a.tb.burn[0], why: 'tribe' }, ctx: { target: tg } });
      if (a.tb.shock && a.sets % a.tb.shock[1] === 0) Q.S.push({ u: a, s: { do: 'shock', to: 'target', value: a.tb.shock[0], why: 'tribe' }, ctx: { target: tg } });
    }
    if (part(a.burnHit) > 0) Q.S.push({ u: a, s: { do: 'burn', to: 'target', value: part(a.burnHit) }, ctx: { target: tg } });
    if (part(a.shockHit) > 0) Q.S.push({ u: a, s: { do: 'shock', to: 'target', value: part(a.shockHit) }, ctx: { target: tg } });
    if (part(a.armorHit) > 0) Q.L.push({ u: a, s: { do: 'armor', to: 'self', value: part(a.armorHit), why: 'armorHit' }, ctx: {} }); // เกราะ/ฮิต: ได้หลังดาเมจ
    if (part(a.healHit) > 0) Q.H.push({ u: a, s: { do: 'heal', to: 'self', value: part(a.healHit), why: 'healHit' }, ctx: {} }); // ฟื้น/ฮิต (ชุด 18): ฟื้นตัวเอง ขั้นฟื้น HP ท้าย tick · ทุกเผ่า
    // R7 ตีจนเลือดต่ำกว่าเกณฑ์ = down ทันที (เฉพาะบอส)
    if (BOSS && a.boss && BR.execute && up(tg) && tg.hp > 0 && tg.hp * 100 < tg.maxHp * BR.execute.v) hurt(tg, tg.hp, a, true, 'execute');
    trigger(a, 'hit', carried ? { target: tg, dealt: taken, carried: true } : { target: tg, dealt: taken });
    trigger(tg, 'hitTaken', { attacker: a, amount: absorbed, taken });
  }
  // ชุด 20 (PT-5): ตีโดน → ผู้รับ (เช่น สุ่มเพื่อนเผ่าเดียวกัน 1 ตัว) ตีเป้าเดียวกันทันที v ฮิต · นับเป็นฮิตปกติของเพื่อน (ไฟ/ช็อต/เกราะ/ฟื้นต่อฮิต สกิลตีโดนของเพื่อน สกิลโดนตีของเป้า)
  //   ไม่นับโบนัสเผ่าฮิตแรก · ไม่นับครบ 3 ฮิต · ฮิตที่ถูกพาไปไม่พาต่อ · นับเข้าตัวตัดนิรภัยฮิต
  function carryHit(u, s, ctx) {
    const tg = ctx.target;
    if (!tg) return;
    standMode = true; const xs = skillTargetsOf(u, s, ctx); standMode = false; // ชุด 21: เพื่อนที่ HP หมดใน tick นี้ยังตีได้ เหมือนชุดปกติที่ตั้งไว้แล้ว
    for (const x of xs) for (let i = 0; i < s.value; i++) {
      if (aborted || !up(tg) || x.down) return; // ชุด 21: เพื่อนยังไม่ down = ตีได้ (ดูหมายเหตุใน skillTargetsOf)
      if (++hitN > R.hitCapPerMatch) { aborted = 'hits'; return; }
      log('carry', { who: x.uid, by: u.uid, target: tg.uid });
      strike(x, tg, 1, false, true, s.pow); // pow = รูนคู่หู (% ของการโจมตีปกติ) · สกิลปกติไม่มี = เต็มแรง
    }
  }
  // ชุด 17: ทำผลในคิวจนหมดใน tick นั้น (เดิมทำได้ 2,000 ผล ที่เกินเลื่อนไป tick ถัดไปเงียบๆ) · ตัวตัดนิรภัย: ผลรวมทั้งแมตช์เกินเพดาน → หยุด แล้วจบเสมอ
  let effN = 0, hitN = 0, aborted = null;
  function drain(list) { // อ่านตามลำดับแทนการตัดหัวคิว (shift ช้ามากเมื่อคิวยาว) · ผลที่เข้าคิวเพิ่มระหว่างทำ ทำต่อท้ายตามเดิม
    for (let i = 0; i < list.length; i++) { if (++effN > R.effectCapPerMatch) { aborted = aborted || 'effects'; break; } apply(list[i]); }
    list.length = 0;
  }
  // ชุด 21 (ผู้ใช้เลือก 2A): ลำดับในคิวสถานะ/ฟื้น HP ไม่ขึ้นกับฝั่ง · เดิมทำตามลำดับที่เข้าคิว ซึ่งขึ้นกับว่าฝั่งไหนตีก่อนใน tick
  //   สถานะ: (1) ใส่ศัตรู (ไฟ ช็อต ดีบัฟ) ของทั้งสองฝั่ง → (2) ล้าง → (3) ผลฝ่ายเดียวกัน/ตัวเอง (บัฟ ค่าที่คิดจากไฟ/ช็อตศัตรู)
  //   ฟื้น HP: เรียงตามตำแหน่งตัวที่ใช้สกิล (แถว เลน ลำดับสกิล) · ฟื้นมีผลกับฝั่งตัวเองเท่านั้น จึงไม่ต้องดูฝั่ง
  const sTier = it => { const i = DO_INFO[it.s.do]; if (!i) return 2; if (i.side === 'foe' || (i.side === 'foeSelf' && it.s.to !== 'self')) return 0; return it.s.do === 'cleanse' || it.s.do === 'cleansePct' ? 1 : 2; };
  const hKey = it => ((it.u.row * 2 + it.u.lane) * 64 + (it.s.idx ?? 63));
  function drainSorted(list, key) {
    while (list.length && !aborted) {
      const batch = list.splice(0).map((it, i) => [key(it), i, it]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      for (const [, , it] of batch) { if (++effN > R.effectCapPerMatch) { aborted = aborted || 'effects'; break; } apply(it); }
    }
    list.length = 0;
  }
  const drainS = () => drainSorted(Q.S, sTier), drainH = () => drainSorted(Q.H, hKey);
  function drainAll() { drain(Q.A); drain(Q.D); drain(Q.L); restoreArmor(); drainS(); flushRefl(); drainH(); flushRefl(); flushRevive(); }
  function restoreArmor() { while (restoreQ.length) { const f = restoreQ.shift(); addArmor(f, f.restoreAmt, 'tribe'); } }

  // ---------- เฟสบอส + กฎที่ทำงานตามเวลา (ชุด 66) ----------
  // เฟสเปลี่ยนตามจำนวนแถบเลือดที่หมดไป (ผู้ใช้เลือก Q1 A) · กฎของเฟสใหม่แทนที่กฎเก่าทั้งหมด (Q3 A)
  function enterPhase(i) {
    phIdx = i;
    const p = BOSS.phases[i] || { rules: [], fx: [], spot: '' };
    BR = ruleMap(p);
    const fx = fxMap(p);
    if (fx.armorBar != null) addArmor(BOSS, BOSS.barHp * fx.armorBar / 100, 'boss'); // X1
    if ('cleanse' in fx) { BOSS.burn = BOSS.shock = BOSS.noDecay = 0; BOSS.noDecayPerm = false; log('cleanse', { to: BOSS.uid }); } // X2
    if (fx.untargetable) BOSS.noHitUntil = Math.max(BOSS.noHitUntil || 0, t + fx.untargetable * 1000); // X3
    if (fx.stunAll) for (const x of enemies(BOSS)) { x.stunLeft = Math.max(x.stunLeft, fx.stunAll * 1000); buff(x, 'stun', fx.stunAll * 1000); } // X4
    if (p.spot) { const c = spotCells(p.spot); if (c) { BOSS.slots = c.slots; BOSS.cells = c.cells; BOSS.move = c.move; BOSS.row = c.cells[0] >> 1; BOSS.lane = c.cells[0] & 1; } } // X5
    if (BR.rowSwap) for (const x of F) if (!x.boss) { if (x.row === 0) x.row = 2; else if (x.row === 2) x.row = 0; } // R19
    if (BR.earlyStorm) stormAt = Math.min(stormAt, t); // R21
    if (BR.tribeOff) for (const x of F) if (!x.boss) x.tb = {}; // E5 ปิดโบนัสเผ่าที่ทำงานระหว่างสู้ (ค่าที่ได้ตอนเริ่มยังอยู่)
    barT = enrageT = growT = auraT = shockT = silT = frzT = vanT = curseT = t;
    log('phase', { who: BOSS.uid, i, rules: p.rules.map(r => r.id), ...(p.spot && spotCells(p.spot) ? { cells: BOSS.cells.slice() } : {}) });
  }
  // แถบเลือดหมด 1 แถบ = "ศัตรู down" สำหรับสกิลผู้เล่น (ผู้ใช้เลือก Q2 A) · นับสูงสุดที่เคยถึง แถบที่เต็มกลับไม่กระตุ้นซ้ำ
  function bossBars() {
    if (!BOSS || !up(BOSS)) return;
    const gone = Math.max(0, Math.min(BOSS.bars, BOSS.bars - Math.ceil(Math.max(0, BOSS.hp) / BOSS.barHp)));
    let changed = false;
    while (barsGone < gone && barsGone < BOSS.bars) {
      barsGone++; barT = t; changed = true;
      log('bar', { who: BOSS.uid, gone: barsGone, left: BOSS.bars - barsGone });
      const ctx = { downed: BOSS, burn: BOSS.burn, shock: BOSS.shock, attacker: BOSS.lastHitBy };
      for (const x of F.filter(x => !x.boss && up(x))) trigger(x, 'enemyDown', ctx);
      if (BOSS.lastHitBy && up(BOSS.lastHitBy)) trigger(BOSS.lastHitBy, 'kill', ctx);
    }
    const i = phaseIndexAt(BOSS.phases, barsGone);
    if (i !== phIdx) { enterPhase(i); changed = true; }
    if (changed) drainAll();
  }
  function moveBoss() {
    const next = pickN(BOSS.slots.filter(i => i !== BOSS.cells[0]), 1, BOSS.side)[0];
    if (next == null) return;
    BOSS.cells = [next]; BOSS.row = next >> 1; BOSS.lane = next & 1;
    if (BR.weakSpot) BOSS.weakUntil = t + 3000; // R30 หลังย้ายที่ โดนดาเมจเพิ่ม 3 วิ
    log('bossMove', { who: BOSS.uid, slot: next });
  }
  function bossTick() {
    if (!up(BOSS)) return;
    if (BR.enrage && t - enrageT >= 10000) { enrageT = t; const a = Math.floor(BOSS.atk * BR.enrage.v / 100); if (a > 0) { BOSS.atkBonus += a; log('atkUp', { to: BOSS.uid, amount: a }); } } // E6
    if (BR.regen && t % 1000 === 0) bossHeal(BOSS.barHp * BR.regen.v / 100); // R9
    if (BR.armorGrow && t - growT >= 10000) { growT = t; addArmor(BOSS, BR.armorGrow.v, 'boss'); } // R10
    if (BR.burnAura && t - auraT >= 5000) { auraT = t; for (const x of enemies(BOSS)) addStatus(x, 'burn', BR.burnAura.v, 'boss', BOSS); } // R11
    if (BR.shockAura && t - shockT >= 5000) { shockT = t; for (const x of pickN(enemies(BOSS), 1, BOSS.side)) addStatus(x, 'shock', BR.shockAura.v, 'boss', BOSS); } // R12
    if (BR.randomSilence && t - silT >= BR.randomSilence.v * 1000) { // R15
      silT = t;
      for (const x of pickN(enemies(BOSS), 1, BOSS.side)) { x.silenceUntil = t + BR.randomSilence.v2 * 1000; buff(x, 'silence', BR.randomSilence.v2 * 1000); }
    }
    if (BR.freezeRow && t - frzT >= BR.freezeRow.v * 1000) { // R16
      frzT = t;
      const row = Math.floor(rngOf(BOSS.side).next() * 3), ms = BR.freezeRow.v2 * 1000;
      for (const x of enemies(BOSS).filter(e => e.row === row)) { x.cdLeft += ms; x.frozen += ms; buff(x, 'freeze', ms); }
    }
    if (BR.vanish && t - vanT >= BR.vanish.v * 1000) { vanT = t; BOSS.noHitUntil = t + BR.vanish.v2 * 1000; log('vanish', { who: BOSS.uid, ms: BR.vanish.v2 * 1000 }); } // R27
    if (BR.dpsCheck && t - barT >= BR.dpsCheck.v * 1000) { // R28 ตีแถบไม่หมดในเวลา → แถบเต็มกลับ (ไม่กระตุ้น "ศัตรู down" ซ้ำ)
      barT = t;
      const top = bossCap();
      if (BOSS.hp < top) { BOSS.hp = top; log('barRefill', { who: BOSS.uid, hp: top }); }
    }
    if (BR.curse) { // R29 สาป: ลงโทษถ้าทีมตีบอสไม่ถึงเป้าใน 5 วิ
      if (curseQ && t >= curseQ.until) {
        if (up(curseQ.u) && BOSS.taken - curseQ.base < BOSS.barHp * BR.curse.v2 / 100) { log('curse', { to: curseQ.u.uid, done: 0 }); hurt(curseQ.u, curseQ.u.hp, BOSS, true, 'execute'); }
        curseQ = null; curseT = t;
      }
      if (!curseQ && t - curseT >= BR.curse.v * 1000) {
        const x = pickN(enemies(BOSS), 1, BOSS.side)[0];
        if (x) { curseQ = { u: x, until: t + 5000, base: BOSS.taken }; log('curse', { to: x.uid, ms: 5000 }); }
      }
    }
    if (BOSS.move && BOSS.slots.length > 1 && t - moveT >= BOSS.moveSec * 1000) { moveT = t; moveBoss(); }
  }

  // ---------- เริ่มแมตช์ ----------
  for (const f of F) f.armor = f.startArmor;
  for (const f of F) { const st = TB(f.side, 'เหล็กกล้า'), p = st && st.b.hpPct ? st.b.hpPct[st.idx] : 0; // ชุด 32: HP สูงสุด +% (เกราะเริ่มยังคิดจาก HP เดิม)
    if (p > 0) { f.armorBaseHp = f.maxHp; f.maxHp = Math.floor(f.maxHp * (1 + p / 100)); f.hp = f.maxHp; } }
  const tbv = (side, tr, k) => { const x = TB(side, tr); return x && x.b[k] ? x.b[k][x.idx] || 0 : 0; };
  const burnDmgOn = [tbv(1, 'เพลิงเผา', 'burnDmgPct'), tbv(0, 'เพลิงเผา', 'burnDmgPct')]; // ดาเมจไฟบนตัวฝั่ง s +% จากโบนัสเพลิงเผาของอีกฝั่ง
  if (detailOn) for (const f of F) iniStats.set(f.uid, snapStats(f)); // ชุด 37: ค่าก่อนโบนัสเผ่า/สกิลเริ่มแมตช์
  log('start', { tribes: steps.map(o => Object.fromEntries(Object.entries(o).map(([k, i]) => [k, R.tribeSteps[i]]))), units: F.map(f => ({ uid: f.uid, side: f.side, id: f.id, name: f.name, level: f.level, row: f.row, lane: f.lane, hp: f.hp, maxHp: f.maxHp, armor: f.armor, ...(f.cells ? { cells: f.cells.slice() } : {}) })) }); // cells = ช่องที่บอสยืน (หน้าภาพใส่ชื่อทุกช่อง)
  for (const f of F) {
    const steel = TB(f.side, 'เหล็กกล้า'), fire = TB(f.side, 'เพลิงเผา'), bolt = TB(f.side, 'สายฟ้า'), wind = TB(f.side, 'วายุ'), spirit = TB(f.side, 'ภูติ');
    if (steel) {
      const amt = Math.floor((f.armorBaseHp || f.maxHp) * steel.b.armorPct[steel.idx] / 100);
      addArmor(f, amt, 'tribe');
      if (steel.b.restore[steel.idx]) { f.restoreLeft = steel.b.restore[steel.idx]; f.restoreAmt = amt; }
    }
    if (fire) f.tb.burn = [fire.b.burn[fire.idx], fire.b.every[fire.idx]];
    if (bolt) f.tb.shock = [bolt.b.shock[bolt.idx], bolt.b.every[bolt.idx]];
    if (wind) f.tb.hit = [wind.b.extraHit[wind.idx], wind.b.every[wind.idx]];
    if (spirit) { f.cdMult *= 1 - spirit.b.cdPct[spirit.idx] / 100;
      const n = Math.min(R.startSetsMax, Math.max(spirit.b.instantFirst[spirit.idx] ? 1 : 0, Math.floor((spirit.b.startSets || [])[spirit.idx] || 0)));
      f.tb.instant = n > 0; f.burst = Math.max(0, n - 1); } // ชุด 32: ปล่อยทันที n ชุดติดกัน (tick ละชุด)
    if (wind && wind.b.dmgPct) { f.hitAmpT = wind.b.dmgPct[wind.idx] || 0; f.hitAmp += f.hitAmpT; } // ชุด 32: ดาเมจตีปกติ +%
    if (bolt && bolt.b.shockDmgPct) { f.shockAmpT = bolt.b.shockDmgPct[bolt.idx] || 0; f.shockAmp += f.shockAmpT; } // ชุด 32: ดาเมจช็อตที่ตี +%
    const fiend = TB(f.side, 'อสูร');
    if (fiend) f.tb.blast = fiend.b.blastPct[fiend.idx];
  }
  stage = 'start';
  if (BOSS) enterPhase(0); // กฎของเฟสแรกทำงานตั้งแต่ก่อนสกิล "เริ่มแมตช์"
  for (const f of F) trigger(f, 'passive', {});
  drainAll();
  for (const f of F) { // ชุด 32: ติดไฟ/ช็อตศัตรูทุกตัวตอนเริ่มแมตช์ (โบนัสเพลิงเผา/สายฟ้าของอีกฝั่ง)
    const fb = tbv(1 - f.side, 'เพลิงเผา', 'startBurn'), sb = tbv(1 - f.side, 'สายฟ้า', 'startShock');
    if (fb > 0) addStatus(f, 'burn', fb, 'tribe', null);
    if (sb > 0) addStatus(f, 'shock', sb, 'tribe', null);
  }
  // ไม่มีคูลดาวน์เริ่ม: ตีครั้งแรกเมื่อคูลดาวน์ครบ 1 รอบ (โบนัสภูติขั้น 6 ปล่อยทันที)
  // ตั้งคูลดาวน์ก่อนผล "เริ่มแมตช์" แล้วคำนวณใหม่หลังจากนั้น โดยเก็บผลแช่แข็ง/ลดคูลดาวน์ที่เกิดตอนเริ่มไว้
  for (const f of F) { f.cd0 = effCd(f); f.cdLeft = f.cd0; }
  for (const f of F) trigger(f, 'matchStart', {});
  drainAll();
  for (const f of F) f.cdLeft = Math.max(0, (f.tb.instant ? 0 : effCd(f)) + (f.cdLeft - f.cd0) - f.cdStart); // cdStart = ลดคูลดาวน์ตอนเริ่มแบบถาวร (22 ต.ค.)
  resolveDowns(); // ผลตอนเริ่มทำให้ down ได้ (เช่น down ทันที WN-8)
  if (BOSS) bossBars(); // ดาเมจตอนเริ่มแมตช์อาจทำแถบแรกหมดไปแล้ว

  const finish = winner => {
    log('end', aborted ? { winner, aborted } : { winner });
    return { winner, timeMs: t, events, ...(aborted ? { aborted } : {}), perm: [...gains.values()], units: F.map(f => ({ uid: f.uid, side: f.side, id: f.id, hp: Math.max(0, f.hp), maxHp: f.maxHp, down: f.down, dealt: f.dealt, taken: f.taken, ...(detailOn ? { ini: iniStats.get(f.uid), fin: snapStats(f) } : {}) })) };
  };
  const endCheck = () => {
    if (aborted) return finish(null); // ตัวตัดนิรภัย (ชุด 17): แมตช์ผิดปกติ จบเสมอ
    const a = F.some(f => f.side === 0 && !f.down), b = F.some(f => f.side === 1 && !f.down);
    if (!a && !b) return finish(null);
    if (!b) return finish(0);
    if (!a) return finish(1);
    if (t >= R.hardStopMs) return finish(null);
    return null;
  };
  let res = endCheck();
  if (res) return res;

  // ---------- วนทีละ tick ----------
  for (;;) {
    t += R.tickMs;
    for (const f of F) if (up(f)) {
      if (f.stunLeft > 0) f.stunLeft = Math.max(0, f.stunLeft - R.tickMs); else f.cdLeft -= R.tickMs;
      for (const s of f.skills) if (s.cdLeft > 0) s.cdLeft -= R.tickMs; // คูลดาวน์สกิลนับตามเวลาจริง ไม่สนมึนงง/แช่แข็ง/บัฟคูลดาวน์
    }

    // ไฟและพายุทรายทำดาเมจก่อนฮิตใน tick นั้น
    stage = 'damage';
    if (t % R.burnIntervalMs === 0) for (const f of F.filter(f => up(f) && f.burn > 0)) {
      const bAmt = Math.floor(f.burn * amp(f.burnTaken + burnDmgOn[f.side])); // A7: credit burn to its appliers by share (metric only)
      if (bAmt > 0) for (const [s, fr] of bShare.split(f.uid)) if (s >= 0) F[s].dealt += bAmt * fr;
      hurt(f, bAmt, null, false, 'burn', detailOn ? { burn: f.burn, takenAmp: f.burnTaken, tribeAmp: burnDmgOn[f.side] } : null); // โดนไฟแรงขึ้น (ชุด 6) · ชุด 32 โบนัสเพลิงเผา ดาเมจไฟ +%
      if (f.noDecayPerm) continue;
      if (f.noDecay > 0) f.noDecay--; else { f.burn = Math.max(0, f.burn - R.burnDecay); log('burnLeft', { to: f.uid, total: f.burn }); } // ให้หน้าจอรู้ว่าไฟลดลงแล้ว
    }
    if (t > stormAt && (t - stormAt) % R.stormIntervalMs === 0) { // stormAt = R.stormStartMs ปกติ · R21 เลื่อนให้เริ่มทันทีตอนเข้าเฟส
      const k = (t - stormAt) / R.stormIntervalMs;
      const dmg = Math.min(1e12, R.stormDmgStart * R.stormDmgMult ** (k - 1)); // ชุด 24: ดาเมจตายตัว ×2 ทุกวิ ไม่ขึ้นกับ HP สูงสุด (เพดานกันเลขล้น)
      for (const f of F.filter(up)) hurt(f, dmg, null, !!R.stormPierce, 'storm', detailOn ? { k, pierce: R.stormPierce ? 1 : 0 } : null);
    }

    // 1) เริ่มชุด: เลือกเป้าตอนต้น tick ทุกตัวพร้อมกัน แล้วใช้สกิลที่ปรับชุด (ฮิตเพิ่ม กระจาย เปลี่ยนเป้า)
    stage = 'pre';
    if (BOSS) bossTick(); // กฎบอสที่ทำงานตามเวลา (ฟื้นเลือด ออร่า ปิดสกิล หายตัว ย้ายที่ ฯลฯ)
    if (TICKSK) for (const f of F) if (up(f)) trigger(f, 'tick', {}); // รูนฮีลเป็นช่วง
    const plans = F.filter(f => up(f) && f.cdLeft <= 0).map(a => {
      a.sets++;
      const plan = { a, target: normalTarget(a), hits: a.multi + a.multiBonus + (BOSS && a.boss && BR.multiUp ? BR.multiUp.v : 0), spread: false, landed: 0 };
      trigger(a, 'set', plan, s => PRE[s.do]);
      if (a.tb.hit && a.sets % a.tb.hit[1] === 0) plan.hits += a.tb.hit[0];
      if (plan.spread) plan.spread = enemies(a).sort((x, y) => x.hp - y.hp || byFront(x, y)); // ฮิตละตัว เริ่มจาก HP ต่ำสุด
      log('set', { who: a.uid, target: plan.target ? plan.target.uid : null, hits: plan.hits, n: a.sets, atk: atkOf(a) }); // atk = พลังโจมตีต่อฮิตตอนเริ่มชุด (ให้บันทึกแสดง)
      trigger(a, 'set', { target: plan.target }, s => !PRE[s.do]);
      return plan;
    });

    // 2) เกราะจากชุดที่เริ่ม
    drain(Q.A);

    // 3) ฮิตของทุกตัว · ผลที่เกิดระหว่างนี้เข้าคิวตามขั้น
    for (const q of [Q.D, Q.S]) for (const it of q) if (armorSnapSkill(it.s) && it.ctx.armorSnap == null) it.ctx = { ...it.ctx, armorSnap: it.u.armor };
    for (const f of F) f.armorTick = f.armor; // จดเกราะก่อนฮิต: สกิล % เกราะตัวเองที่ทำงานระหว่างฮิตใช้ค่านี้ (21 ต.ค. แก้ให้ผลไม่ขึ้นกับว่าอยู่ฝั่งไหน)
    stage = 'damage';
    for (const p of plans) {
      if (aborted) break;
      const a = p.a;
      for (let h = 0; h < p.hits; h++) {
        if (++hitN > R.hitCapPerMatch) { aborted = 'hits'; break; } // ตัวตัดนิรภัย (ชุด 17): ฮิตรวมทั้งแมตช์เกินเพดาน
        let tgs;
        const aoePow = BOSS && a.boss && BR.aoe ? BR.aoe.v : null; // R4 บอสตีโดนทุกตัว (ดาเมจต่อตัว %)
        if (aoePow) tgs = foes(a).sort(byFront);
        else if (p.split) tgs = enemies(a).sort(byFront); // ตีแบ่งทุกตัว (SF-8): ทุกค่าของฮิตหารเท่ากันตามจำนวนศัตรูที่ยังยืน
        else {
          let tg = p.target;
          if (p.spread) { const live = p.spread.filter(up); tg = live.length ? live[h % live.length] : null; }
          tgs = tg && up(tg) ? [tg] : [];
        }
        if (!tgs.length) break; // เป้า down → รอบที่เหลือหายไป
        const n = aoePow ? 1 : tgs.length; // ตีแบ่ง: ค่าที่แบ่ง ปัดลง (ค่าเสนอ) · พลังโจมตีอย่างน้อย 1 · R4 ไม่ใช่การแบ่ง (ทุกตัวโดนเท่ากัน %)
        p.landed++;
        tgs.forEach((tg, j) => { subHit = j > 0; if (up(tg)) strike(a, tg, n, p.landed === 1 && j === 0, false, aoePow); });
        subHit = false;
      }
      if (p.landed >= 3) trigger(a, 'hits3', { target: p.target });
    }
    // 4) ดาเมจจากสกิล (สวนกลับ สะท้อน ดาเมจตรง) · ไม่กระตุ้นสกิลโดนตี
    for (const f of F) f.armorTick = null;
    drain(Q.D);
    // คูลดาวน์ใหม่ของตัวที่เพิ่งลงมือ (ก่อนผลลดคูลดาวน์ในขั้นสถานะ)
    for (const p of plans) { p.a.cdLeft = effCd(p.a); p.a.frozen = 0; if (p.a.burst > 0) { p.a.burst--; p.a.cdLeft = 0; } } // ชุด 32: โบนัสภูติ ปล่อยชุดทันทีที่เหลือ // แช่แข็งที่ค้างหมดไปเมื่อเริ่มนับรอบใหม่
    // 5) เกราะที่เกิดระหว่างดาเมจ ได้หลังดาเมจ จึงไม่กันฮิตใน tick เดียวกัน
    drain(Q.L); drain(Q.A); restoreArmor();
    // 6) สถานะ → 7) ฟื้น HP
    stage = 'status';
    drainS(); flushRefl(); drainH(); flushRefl(); flushRevive();
    // 8) เช็ก down และผลจากการ down (วนจนนิ่ง)
    resolveDowns();
    if (BOSS) bossBars(); // แถบเลือดที่หมดไป → "ศัตรู down" + เปลี่ยนเฟส

    res = endCheck();
    if (res) return res;
  }

  function resolveDowns() {
    for (let guard = 0; guard < 50; guard++) {
      const fallen = F.filter(f => !f.down && f.hp <= 0);
      if (!fallen.length) return;
      stage = 'down';
      const summons = [];
      // ชุด 21 (2A): ระเบิดเผ่าอสูรเล็งเป้าก่อนตัดสินลุก/ชุบของทุกตัว (เดิมเล็งระหว่างวน → ตัวอีกฝั่งที่ลุกไปก่อนถูกเล็งได้หรือไม่ ขึ้นกับลำดับฝั่ง)
      for (const f of fallen) if (f.tb.blast) { const x = normalTarget(f); if (x) Q.D.push({ u: f, s: { do: 'dmg', to: 'enemyFront', value: Math.floor(atkOf(f) * f.tb.blast / 100), why: 'downSkill', src: 'blast' }, ctx: {} }); }
      for (const f of fallen) {
        // ผลตอน down (combat-rules V1.14): ทำงานทุกครั้งที่ HP ถึง 0 แม้จะลุก/ถูกชุบกลับมา
        // สกิลตัวเอง down · เพื่อน down · ศัตรู down · ทำศัตรู down · ระเบิดเผ่าอสูร · ผลเข้าคิวแล้วทำหลังตัดสินลุก/ชุบ
        const ctx = { downed: f, burn: f.burn, shock: f.shock, attacker: f.lastHitBy };
        trigger(f, 'selfDown', ctx);
        for (const x of F.filter(x => x.side === f.side && x !== f && up(x))) trigger(x, 'allyDown', ctx);
        for (const x of F.filter(x => x.side !== f.side && up(x))) trigger(x, 'enemyDown', ctx);
        if (f.lastHitBy && up(f.lastHitBy)) trigger(f.lastHitBy, 'kill', ctx);
        // R20 ชุบชีวิตไม่ได้ (เฉพาะฝั่งผู้เล่น ระหว่างเฟสนั้น) · รูนชุบ (U2) จำกัดครั้งด้วย s.lim และทำงานก่อนการลุกของเผ่าอสูร (ผู้ใช้เลือก Q5 U2)
        const noRev = !!(BOSS && !f.boss && BR.noRevive);
        const rv = noRev ? null : f.skills.find(s => s.do === 'revive' && s.when === 'selfDown' && usable(s) && (!s.lim || s.uses < s.lim) && (s.chance == null || s.chance >= 100 || rngOf(f.side).next() * 100 < s.chance));
        if (rv) { // สกิลลุกกลับมา: เกิดแทนการ down (ผลตอน down ด้านบนทำงานไปแล้ว)
          fire(f, rv, 'selfDown');
          reviveUnit(f, rv.value, 'skill', f, rv);
          continue;
        }
        // ชุบเพื่อน (WN-4): เพื่อนที่ยังยืนอยู่ใช้ได้ v ครั้ง/แมตช์ · ฟื้นด้วย HP reviveAllyHpPct%
        let healer = null, ra = null;
        for (const x of noRev ? [] : F) {
          if (x === f || x.side !== f.side || !up(x)) continue;
          ra = x.skills.find(s => s.do === 'reviveAlly' && s.when === 'allyDown' && s.uses < s.value && usable(s) && (s.chance == null || s.chance >= 100 || rngOf(x.side).next() * 100 < s.chance));
          if (ra) { healer = x; break; }
        }
        if (ra) {
          fire(healer, ra, 'allyDown');
          reviveUnit(f, R.reviveAllyHpPct, 'ally', healer, ra);
          continue;
        }
        if (!noRev && reviveLeft[f.side] > 0) { // โบนัสอสูร: ตัวที่ down ก่อนลุกกลับมา
          const x = TB(f.side, 'อสูร');
          reviveLeft[f.side]--;
          reviveUnit(f, x.b.revivePct[x.idx], 'tribe');
          continue;
        }
        f.down = true; f.hp = 0; f.burn = f.shock = f.armor = f.noDecay = 0; f.noDecayPerm = false; f.cdLeft = Infinity;
        log('down', { who: f.uid });
        if (BOSS && !f.boss && BR.feedOnDown) bossHeal(BOSS.barHp * BR.feedOnDown.v / 100); // R14 (ไม่เกินแถบปัจจุบัน)
        // เรียกตัวมาสู้แทน (PL-5 · 21 ต.ค.): down จริงเท่านั้น (ถูกชุบ/ลุก = ไม่เรียก) · ช่องเดิม เลเวลเดียวกัน
        // ตัวที่ถูกเรียก: ไม่นับเผ่า ไม่ได้โบนัสเผ่า ไม่มีค่าถาวร สกิลติดตัวทำงานทันที (ค่าเสนอ)
        const sm = f.skills.find(s => s.do === 'summon' && s.when === 'selfDown' && s.unit && usable(s) && (s.chance == null || s.chance >= 100 || rngOf(f.side).next() * 100 < s.chance));
        if (sm) { fire(f, sm, 'selfDown'); f.replaced = true; summons.push([f, sm]); } // ชุด 20: ช่องนี้มีตัวใหม่แล้ว ชุบตัวเดิมไม่ได้
      }
      // ชุด 21 (2A): เรียกตัวมาแทนหลังจัดการตัวที่ down ทุกตัวใน tick แล้ว (เดิมเรียกทันที → ผลตอน down ของอีกฝั่งเล็งตัวที่ถูกเรียกได้หรือไม่ ขึ้นกับลำดับฝั่ง)
      for (const [f, sm] of summons.splice(0)) {
        const n = mkFighter(sm.unit, f.side); n.uid = F.length; n.summoned = true; F.push(n);
        n.cdLeft = effCd(n);
        if (detailOn) iniStats.set(n.uid, snapStats(n));
        log('summon', { who: n.uid, from: f.uid, ...(detailOn ? { d: { si: sm.idx ?? null, what: sm.do } } : {}), unit: { uid: n.uid, side: n.side, id: n.id, name: n.name, level: n.level, row: n.row, lane: n.lane, hp: n.hp, maxHp: n.maxHp, armor: n.armor } });
        trigger(n, 'passive', {});
      }
      drainAll();
    }
  }
  function reviveUnit(f, pct, why, giver, s) { // G2: giver + skill index logged with detail on only (tab อื่นๆ "ชุบใส่ใคร")
    f.hp = Math.max(1, Math.floor(f.maxHp * pct / 100));
    f.burn = f.shock = f.armor = f.noDecay = 0; f.noDecayPerm = false;
    f.cdLeft = effCd(f);
    log('revive', { who: f.uid, hp: f.hp, why, ...(detailOn && giver ? { from: giver.uid, d: { si: s.idx ?? null, what: s.do } } : {}) });
  }
}

