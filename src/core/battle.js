import { makeRng } from './rng.js';
import { DO_INFO, RULES, atMatch } from './rules.js';
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
    if (k === 'burn' || k === 'cleanse' || k === 'down') bShare.see(k, d);
    if (!logOn) return;
    if (detailOn && dCur && SRC_KINDS.has(k) && !('d' in d)) events.push({ t, k, ...d, ...('from' in d ? {} : { from: dFrom }), d: { ...dCur } });
    else events.push({ t, k, ...d });
  };
  // ชุด 36: opts.detail = จดส่วนประกอบของดาเมจ (ช่อง d ในเหตุการณ์ dmg) ให้แท็บวิเคราะห์แมตช์ · จดอย่างเดียว ไม่เปลี่ยนผล · ปิดอยู่ตอนวัด/บอท/เกม
  const detailOn = logOn && !!opts.detail;
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
  const steps = [0, 1].map(side => {
    const out = {};
    if (!tribeOn[side]) return out;
    const counts = {};
    for (const id of new Set(F.filter(f => f.side === side).map(f => f.id))) {
      for (const tr of F.find(f => f.side === side && f.id === id).tribes) counts[tr] = (counts[tr] || 0) + 1;
    }
    for (const [tr, n] of Object.entries(counts)) {
      const idx = R.tribeSteps.filter(x => n >= x).length - 1;
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
  const effCd = f => Math.max(R.minCooldownMs, Math.round(f.cdMs * f.cdMult));
  const atkOf = f => f.atk + f.atkBonus;
  const amp = p => Math.max(0, 1 + (p || 0) / 100); // ตัวคูณจาก +% (ลดได้ไม่ต่ำกว่า 0)
  const pickN = (list, n, side) => { const r = rngOf(side), l = list.slice(), out = []; while (l.length && out.length < n) out.push(l.splice(Math.floor(r.next() * l.length), 1)[0]); return out; };

  function normalTarget(f) {
    const es = enemies(f);
    const same = es.filter(e => e.lane === f.lane).sort(byFront);
    if (same.length) return same[0];
    return es.sort(byFront)[0] || null;
  }
  // ศัตรูแถวหลัง (combat-rules V1.19): เฉพาะแถวหลังจริง (row 2) · เลนเดียวกันก่อน แล้วอีกเลน · ไม่มีตัวแถวหลัง = ไม่มีเป้า (ผู้เล่นหลบได้ด้วยการไม่วางแถวหลัง)
  function backTarget(f) {
    const back = enemies(f).filter(e => e.row === 2);
    return back.find(e => e.lane === f.lane) || null; // 22 ต.ค. ชุด 10: เลนเดียวกันเท่านั้น ไม่มี = ไม่มีผล (ไม่ย้ายเลน)
  }
  const lowestEnemy = f => enemies(f).sort((a, b) => a.hp - b.hp || byFront(a, b))[0] || null;

  // ชุด 14: ผู้รับของสกิล = เป้าตามช่อง to + เพื่อนตามตำแหน่ง (allyAt) + กรองเผ่าเดียวกัน (sameTribe · นับเผ่าเพิ่ม · ตัวเองผ่านเสมอถ้าเป้าเดิมรวมตัวเอง)
  const RAND_N = { allyRandom: 1, allyRandom2: 2 };
  function skillTargetsOf(u, s, ctx) {
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
      case 'enemyLane': return enemies(f).filter(e => e.lane === f.lane).sort(byFront); // ศัตรูทั้งเลนเดียวกัน · ชุด 10: เลนนั้นหมด = ไม่มีผล (ไม่ย้ายเลน)
      case 'enemyFrontRow': return enemies(f).filter(e => e.row === 0).sort(byFront); // แถวหน้าทั้ง 2 เลน · ไม่มีใครแถวหน้า = ไม่มีเป้า
      case 'enemyMidRow': return enemies(f).filter(e => e.lane === f.lane && e.row === 1); // แถวกลางเลนเดียวกัน · ชุด 10: ไม่มี = ไม่มีผล (เปลี่ยนเป้า: ตีเป้าปกติต่อ)
      case 'lowestHp': return [lowestEnemy(f)].filter(Boolean);
      case 'enemyRandom': return pickN(enemies(f), 1, f.side);
      case 'allEnemies': return enemies(f);
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
  function hurt(target, amount, src, pierce, why, det) {
    amount = Math.floor(amount);
    if (amount <= 0 || target.down) return 0;
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
    if (!(v > 0 && up(f))) return;
    f.armor += v; log('armor', { to: f.uid, amount: v, why });
    // แบ่งเกราะ (HL-8): เพื่อนทั้งทีมได้ % ของเกราะที่ตัวนี้ได้ · เกราะที่ได้จากการแบ่งไม่แบ่งต่อ (กันวนไม่จบ)
    if (why !== 'share') { // แบ่งเกราะ (ชุด 7): แยกตามผู้รับ · shareArmor = ทั้งทีม
      if (f.shareArmor > 0) for (const x of allies(f)) if (x !== f) addArmor(x, v * f.shareArmor / 100, 'share');
      for (const [to, pct] of Object.entries(f.shareTo)) if (pct > 0) for (const x of targetsOf(f, to, {})) if (x !== f) addArmor(x, v * pct / 100, 'share');
    }
  }
  function addStatus(f, kind, v, why, src) {
    if (kind === 'burn' && src && src.side !== f.side && src.burnAmp) v *= amp(src.burnAmp); // ไฟที่ทำให้ติด +% (ชุด 6)
    v = Math.floor(v);
    if (v <= 0 || f.down) return;
    f[kind] += v; log(kind, { to: f.uid, amount: v, total: f[kind], why, from: src ? src.uid : null }); // from = ผู้ทำให้ติด (สรุปผลจำลองใช้)
    if (kind === 'burn' && src && src.burnNoDecay) f.noDecayPerm = true;
    if (why !== 'reflect' && src && src.side !== f.side) reflectBack(f, src, kind, v);
  }
  // ชุด 20 (PT-8): ตัวที่มีผู้ปกป้อง (ยังยืนอยู่) โดนศัตรูใส่ ไฟ/ช็อต/คูลดาวน์ช้าลง → ศัตรูที่ใส่โดนกลับ % (รวมทุกผู้ปกป้อง ไม่เกิน reflectDebuffMaxPct)
  // ตัวที่โดนยังโดนเต็ม · ของที่สะท้อนไปแล้วไม่สะท้อนกลับ (กันวน) · ไฟ/ช็อตที่สะท้อน ปัดลง
  function reflectBack(f, src, kind, v) {
    if (!f.reflDebuff.length || !up(src)) return;
    let p = 0; for (const r of f.reflDebuff) if (up(r.by)) p += r.pct;
    p = Math.min(R.reflectDebuffMaxPct ?? 100, p);
    if (!(p > 0)) return;
    // ชุด 21: เก็บไว้ทำหลังคิวสถานะของ tick นั้นหมด (เดิมทำทันที → ลำดับฝั่งมีผล เช่น PL-4 อ่านไฟศัตรูก่อน/หลังไฟที่สะท้อน · เทสต์สลับฝั่งพัง)
    if (kind === 'cdSlowPct') reflQ.push({ src, from: f, kind, amount: v * p / 100 });
    else { const n = Math.floor(v * p / 100); if (n > 0) reflQ.push({ src, from: f, kind, amount: n }); }
  }
  let reflQ = [], revQ = [];
  function flushRevive() {
    const list = revQ; revQ = [];
    for (const { u, v } of list) {
      if (!up(u)) continue;
      const pool = F.filter(x => x.side === u.side && x.down && !x.summoned && !x.replaced);
      for (const x of pickN(pool, v, u.side)) { x.down = false; x.lastHitBy = null; reviveUnit(x, R.reviveAllyHpPct, 'ally'); }
    }
  }
  function flushRefl() {
    while (reflQ.length) {
      const list = reflQ; reflQ = [];
      for (const { src, from, kind, amount } of list) {
        if (src.down) continue;
        log('reflectDebuff', { to: src.uid, from: from.uid, kind, amount });
        if (kind === 'cdSlowPct') { src.cdMult *= 1 + amount / 100; buff(src, 'cdSlowPct', amount); }
        else addStatus(src, kind, amount, 'reflect', null);
      }
    }
  }
  function cutCd(f, ms) { if (up(f)) { ms = Math.floor(ms * (1 + f.cdAmp / 100)); f.cdLeft = Math.max(0, f.cdLeft - ms); log('cdCut', { to: f.uid, ms }); } }
  function heal(f, v, src) {
    v = Math.floor(v * amp(f.healAmp)); // ฟื้น HP ที่ได้รับ +% / ฟื้นน้อยลง (ชุด 6)
    if (!up(f) || v <= 0) return; // ฟื้น HP ไม่ช่วยตัวที่ HP ถึง 0 แล้ว (ต้องใช้สกิลลุกกลับมา)
    const h = Math.min(v, f.maxHp - f.hp);
    if (h > 0) {
      f.hp += h; log('heal', { to: f.uid, amount: h });
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
  const STAT = { atk: (f, me, ctx) => atkOf(f), armor: (f, me, ctx) => (f === me && ctx.armorSnap != null ? ctx.armorSnap : f.armor), maxHp: f => f.maxHp, hp: f => Math.max(0, f.hp), hpLost: f => Math.max(0, f.maxHp - Math.max(0, f.hp)), burn: f => f.burn, shock: f => f.shock };
  function ofVal(u, s, x, ctx) {
    const st = STAT[s.of && s.of.stat]; if (!st) return 0;
    const who = s.of.who, one = f => (f ? st(f, u, ctx) : 0);
    if (who === 'self') return one(u);
    if (who === 'each') return one(x);
    if (who === 'ctx') return one(ctx.target || ctx.attacker);
    if (who === 'allEnemies') return enemies(u).reduce((a, f) => a + one(f), 0);
    if (who === 'allAllies') return allies(u).reduce((a, f) => a + one(f), 0);
    // ชุด 12: เลนเดียวกัน = เลนของตัวนี้ · แถวเดียวกัน = แถวของตัวนี้ ทั้ง 2 เลน · รวมเฉพาะตัวที่ยืนอยู่ (ไม่มี = 0) · ฝั่งเพื่อนนับตัวนี้ด้วย
    if (who === 'laneEnemies') return enemies(u).filter(f => f.lane === u.lane).reduce((a, f) => a + one(f), 0);
    if (who === 'rowEnemies') return enemies(u).filter(f => f.row === u.row).reduce((a, f) => a + one(f), 0);
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
  function apply(it) { // ชุด 36: จดที่มาของดาเมจจากสกิล (เฉพาะเมื่อเปิด detail)
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
      case 'heal': for (const x of T()) { heal(x, v, u); permRec(u, s, x, v); } break;
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
        revQ.push({ u, v }); // ชุด 21: ชุบหลังฟื้น HP ทั้งหมดของ tick (เดิมชุบทันที → ฟื้นที่เลือก "เพื่อน HP ต่ำสุด" ขึ้นกับลำดับฝั่ง)
        break; }
      case 'reflectDebuff': for (const x of T()) { x.reflDebuff.push({ by: u, pct: v }); buff(x, 'reflectDebuff', v); } break;
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
      case 'healOf': for (const x of T()) { const a = ofVal(u, s, x, ctx) * v / 100; heal(x, a, u); permRec(u, s, x, a); } break;
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
      case 'stun': for (const x of T()) if (up(x)) { x.stunLeft = Math.max(x.stunLeft, v); buff(x, 'stun', v); } break;
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
  function strike(a, tg, n, first, carried) {
    const part = x => Math.floor(x / n);
    const atk0 = n > 1 ? Math.max(1, part(atkOf(a))) : atkOf(a);
    const atk = a.hitAmp || tg.dmgTakenAmp ? Math.floor(atk0 * amp(a.hitAmp) * amp(tg.dmgTakenAmp)) : atk0; // ดาเมจตี +% / ดาเมจที่โดน +% (ชุด 6)
    const absorbed = hurt(tg, atk, a, false, 'hit', detailOn ? { atk: a.atk, bonus: a.atkBonus, n, amp: a.hitAmp, tribeAmp: a.hitAmpT || 0, takenAmp: tg.dmgTakenAmp, carried: carried ? 1 : 0 } : null);
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
      strike(x, tg, 1, false, true);
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

  // ---------- เริ่มแมตช์ ----------
  for (const f of F) f.armor = f.startArmor;
  for (const f of F) { const st = TB(f.side, 'เหล็กกล้า'), p = st && st.b.hpPct ? st.b.hpPct[st.idx] : 0; // ชุด 32: HP สูงสุด +% (เกราะเริ่มยังคิดจาก HP เดิม)
    if (p > 0) { f.armorBaseHp = f.maxHp; f.maxHp = Math.floor(f.maxHp * (1 + p / 100)); f.hp = f.maxHp; } }
  const tbv = (side, tr, k) => { const x = TB(side, tr); return x && x.b[k] ? x.b[k][x.idx] || 0 : 0; };
  const burnDmgOn = [tbv(1, 'เพลิงเผา', 'burnDmgPct'), tbv(0, 'เพลิงเผา', 'burnDmgPct')]; // ดาเมจไฟบนตัวฝั่ง s +% จากโบนัสเพลิงเผาของอีกฝั่ง
  if (detailOn) for (const f of F) iniStats.set(f.uid, snapStats(f)); // ชุด 37: ค่าก่อนโบนัสเผ่า/สกิลเริ่มแมตช์
  log('start', { tribes: steps.map(o => Object.fromEntries(Object.entries(o).map(([k, i]) => [k, R.tribeSteps[i]]))), units: F.map(f => ({ uid: f.uid, side: f.side, id: f.id, name: f.name, level: f.level, row: f.row, lane: f.lane, hp: f.hp, maxHp: f.maxHp, armor: f.armor })) });
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
    if (t > R.stormStartMs && (t - R.stormStartMs) % R.stormIntervalMs === 0) {
      const k = (t - R.stormStartMs) / R.stormIntervalMs;
      const dmg = Math.min(1e12, R.stormDmgStart * R.stormDmgMult ** (k - 1)); // ชุด 24: ดาเมจตายตัว ×2 ทุกวิ ไม่ขึ้นกับ HP สูงสุด (เพดานกันเลขล้น)
      for (const f of F.filter(up)) hurt(f, dmg, null, !!R.stormPierce, 'storm', detailOn ? { k, pierce: R.stormPierce ? 1 : 0 } : null);
    }

    // 1) เริ่มชุด: เลือกเป้าตอนต้น tick ทุกตัวพร้อมกัน แล้วใช้สกิลที่ปรับชุด (ฮิตเพิ่ม กระจาย เปลี่ยนเป้า)
    stage = 'pre';
    const plans = F.filter(f => up(f) && f.cdLeft <= 0).map(a => {
      a.sets++;
      const plan = { a, target: normalTarget(a), hits: a.multi + a.multiBonus, spread: false, landed: 0 };
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
        if (p.split) tgs = enemies(a).sort(byFront); // ตีแบ่งทุกตัว (SF-8): ทุกค่าของฮิตหารเท่ากันตามจำนวนศัตรูที่ยังยืน
        else {
          let tg = p.target;
          if (p.spread) { const live = p.spread.filter(up); tg = live.length ? live[h % live.length] : null; }
          tgs = tg && up(tg) ? [tg] : [];
        }
        if (!tgs.length) break; // เป้า down → รอบที่เหลือหายไป
        const n = tgs.length; // ตีแบ่ง: ค่าที่แบ่ง ปัดลง (ค่าเสนอ) · พลังโจมตีอย่างน้อย 1
        p.landed++;
        tgs.forEach((tg, j) => { subHit = j > 0; if (up(tg)) strike(a, tg, n, p.landed === 1 && j === 0, false); });
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
        const rv = f.skills.find(s => s.do === 'revive' && s.when === 'selfDown' && usable(s) && (s.chance == null || s.chance >= 100 || rngOf(f.side).next() * 100 < s.chance));
        if (rv) { // สกิลลุกกลับมา: เกิดแทนการ down (ผลตอน down ด้านบนทำงานไปแล้ว)
          fire(f, rv, 'selfDown');
          reviveUnit(f, rv.value, 'skill');
          continue;
        }
        // ชุบเพื่อน (WN-4): เพื่อนที่ยังยืนอยู่ใช้ได้ v ครั้ง/แมตช์ · ฟื้นด้วย HP reviveAllyHpPct%
        let healer = null, ra = null;
        for (const x of F) {
          if (x === f || x.side !== f.side || !up(x)) continue;
          ra = x.skills.find(s => s.do === 'reviveAlly' && s.when === 'allyDown' && s.uses < s.value && usable(s) && (s.chance == null || s.chance >= 100 || rngOf(x.side).next() * 100 < s.chance));
          if (ra) { healer = x; break; }
        }
        if (ra) {
          fire(healer, ra, 'allyDown');
          reviveUnit(f, R.reviveAllyHpPct, 'ally');
          continue;
        }
        if (reviveLeft[f.side] > 0) { // โบนัสอสูร: ตัวที่ down ก่อนลุกกลับมา
          const x = TB(f.side, 'อสูร');
          reviveLeft[f.side]--;
          reviveUnit(f, x.b.revivePct[x.idx], 'tribe');
          continue;
        }
        f.down = true; f.hp = 0; f.burn = f.shock = f.armor = f.noDecay = 0; f.noDecayPerm = false; f.cdLeft = Infinity;
        log('down', { who: f.uid });
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
        log('summon', { who: n.uid, from: f.uid, unit: { uid: n.uid, side: n.side, id: n.id, name: n.name, level: n.level, row: n.row, lane: n.lane, hp: n.hp, maxHp: n.maxHp, armor: n.armor } });
        trigger(n, 'passive', {});
      }
      drainAll();
    }
  }
  function reviveUnit(f, pct, why) {
    f.hp = Math.max(1, Math.floor(f.maxHp * pct / 100));
    f.burn = f.shock = f.armor = f.noDecay = 0; f.noDecayPerm = false;
    f.cdLeft = effCd(f);
    log('revive', { who: f.uid, hp: f.hp, why });
  }
}

