// Runes in battle (phase 2a, set 66) — turns equipped runes into things the battle engine already understands.
// Design: a rune is NOT special engine code. Wherever possible it becomes a normal skill on the units in its scope
// (stat runes map 1:1 onto DO_INFO effects, see RUNE_EFFECTS), so the engine treats a rune exactly like a character skill.
// Only effects the skill system cannot express become unit fields that battle.js reads (taunt, avoidDeath, link, bossDmg, …).
// Run-flow runes (gold/shop/drop/scout) are listed in RUNE_RUN_ONLY and are ignored here — they belong to phase 2b.
// Every number is the user's (Balance Room); this file adds no numbers of its own.
import { TRIBES } from './rules.js';
import { RUNE_EFF, RUNE_SPEC, runeKind } from './stage.js';

// Runes that only matter in the run flow (money, shop, drops, info) — no battle effect, phase 2b.
export const RUNE_RUN_ONLY = ['gold', 'interest', 'shopSlots', 'freeRoll', 'heartTrade', 'lure', 'fastMerge', 'shadow', 'scout', 'permUp'];
// Scope → which units of the team the rune works on ('one' needs the slot the player put it on, 'enemy' goes to the enemy team)
const RN_AT_ROW = ['front', 'mid', 'back'];

const rnSameSlot = (u, s) => !!s && u.row === s[0] && u.lane === s[1];
function rnInScope(u, r, eq) {
  switch (r.scope) {
    case 'one': return eq.slot ? rnSameSlot(u, eq.slot) : false;
    case 'front': return u.row === 0;
    case 'mid': return u.row === 1;
    case 'back': return u.row === 2;
    case 'laneTop': return u.lane === 0;
    case 'laneBottom': return u.lane === 1;
    case 'tribe': return [u.tribe, ...(u.extraTribes || [])].includes(r.tribe);
    case 'team': return true;
    default: return false; // 'enemy' handled apart
  }
}
// The unit that casts team-wide effects aimed at the enemy team (front-most, so it is a real unit on the board)
const rnAnchor = units => units[0] || null;
// Skill record the engine runs. idx null = not a card skill (the match tab shows it as a rune line).
const runeSk = (when, doKey, to, value, extra = {}) => ({ when, do: doKey, to, value, idx: null, src: 'rune', ...extra });
const rnInt = (v, lo, hi) => Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.floor(v))) : lo;

// One stat rune (RUNE_EFFECTS) → the DO_INFO effect it stands for · flat and % are separate effects
function rnStatSkill(r, v) {
  const e = RUNE_EFF[r.eff]; if (!e) return null;
  const doKey = r.mode === 'flat' ? e[2] : e[3];
  if (!doKey) return null;
  const foe = e[4] === 'foe';
  const when = doKey === 'lifesteal' ? 'hit' : 'matchStart';
  return { skill: runeSk(when, doKey, foe ? 'allEnemies' : 'self', v), foe };
}

// Special runes that become fields battle.js reads · each returns the field changes for one unit
function rnSpecFields(key, r, n, eq, u, units) {
  const num = q => (typeof r[q] === 'number' ? r[q] : (RUNE_SPEC[key].f.find(f => f[0] === q) || [, , 0])[2]);
  switch (key) {
    case 'allyDownDmg': return { downDmgPct: num('pct') * n };
    case 'bossDmg': return { bossDmgPct: num('dmgPct') * n };
    case 'lastStand': return { lastStandDmg: num('dmgPct') * n, lastStandCd: Math.min(90, num('cdPct') * n) };
    case 'avoidDeath': return { avoidLeft: rnInt(num('times') * n, 0, 9) };
    case 'armorShare': return { shareTribePct: num('pct') * n, shareTribeN: rnInt(num('count'), 1, 5) };
    case 'taunt': return { taunt: true };
    case 'link': return eq.partner && !rnSameSlot(u, eq.partner) ? { linkSlot: eq.partner.slice(), linkPct: Math.min(100, num('pct') * n) } : null;
    default: return null;
  }
}

// Static stat changes (done on the unit before the match, like a shop/permanent value)
function rnSpecStatic(key, r, n, u, ws = 0) {
  const num = q => (typeof r[q] === 'number' ? r[q] : (RUNE_SPEC[key].f.find(f => f[0] === q) || [, , 0])[2]);
  if (key === 'glass') { u.maxHp = Math.max(1, Math.floor(u.maxHp * (1 - Math.min(90, num('hpPct') * n) / 100))); u.hitAmp = (u.hitAmp || 0) + num('dmgPct') * n; return true; }
  if (key === 'fortress') { u.maxHp = Math.floor(u.maxHp * (1 + num('hpPct') * n / 100)); u.atk = Math.max(0, Math.floor(u.atk * (1 - Math.min(90, num('atkPct') * n) / 100))); return true; }
  if (key === 'growth') { u.hitAmp = (u.hitAmp || 0) + Math.min(num('maxPct') * n, num('stepPct') * n * ws); return true; } // ws = ctx.winStreak · set 126 (T11 A): copies multiply step AND cap
  if (key === 'hpToArmorHit') {
    const lost = Math.floor(u.maxHp * Math.min(90, num('hpPct')) / 100);
    u.maxHp = Math.max(1, u.maxHp - lost); u.armorHit = (u.armorHit || 0) + Math.floor(lost * num('rate') * n / 100); return true;
  }
  return false;
}

// Special runes that become a skill the engine already runs
function rnSpecSkill(key, r, n, eq, u) {
  const num = q => (typeof r[q] === 'number' ? r[q] : (RUNE_SPEC[key].f.find(f => f[0] === q) || [, , 0])[2]);
  switch (key) {
    case 'taunt': return { skill: runeSk('matchStart', 'armorPct', 'self', num('armorPct') * n) };
    case 'revive': return { skill: runeSk('selfDown', 'revive', 'self', Math.min(100, num('hpPct')), { lim: rnInt(num('times') * n, 0, 9) }) };
    case 'freeze': return { skill: runeSk('matchStart', 'stun', 'allEnemies', Math.round(num('sec') * n * 1000), { bossPct: num('bossPct') }), foe: true };
    case 'regenLow': return { skill: runeSk('tick', 'healPct', 'allyLowest', num('pct') * n, { cd: Math.max(1000, Math.round(num('sec') * 1000)) }), one: true };
    case 'regen': return { skill: runeSk('tick', 'healPct', 'self', num('pct') * n, { cd: Math.max(1000, Math.round(num('sec') * 1000)) }) };
    case 'buddy': return eq.partner && !rnSameSlot(u, eq.partner)
      ? { skill: runeSk('hit', 'allyStrike', 'allyAt', 1, { at: { row: RN_AT_ROW[eq.partner[0]], lane: eq.partner[1] === u.lane ? 'same' : 'other' }, pow: num('pct') * n }) } : null;
    default: return null;
  }
}

// Tribe counted extra for the bonus (T8 ธงเผ่า) — the engine adds it to the board count, capped at maxTier
// set 126 (user T8 A): each copy carries the tribe the player picked when taking it (e.tribes, one per copy) · same tribe twice = counted twice
// no picks (old saves / old bot data) = the rune record's tribe for every copy
export function rnFlagTribes(r, n, picked) {
  const fb = TRIBES.includes(r.tribe) ? r.tribe : TRIBES[0];
  return Array.from({ length: n }, (_, i) => (Array.isArray(picked) && TRIBES.includes(picked[i]) ? picked[i] : fb));
}
function rnFlagExtra(r, n, picked) {
  const by = {};
  for (const t of rnFlagTribes(r, n, picked)) by[t] = (by[t] || 0) + 1;
  return Object.entries(by).map(([tribe, k]) => ({ tribe, count: rnInt(r.count * k, 0, 9), maxTier: rnInt(r.maxTier, 2, 6) }));
}

// units = buildTeam() output (not changed in place) · equips = [{ r: rune record, n: copies, slot: [row,lane], partner: [row,lane], tribes?: [flag tribe per copy] }]
// Returns { units, tribeExtra, skipped } — tribeExtra goes to simulate(opts.tribeExtra), skipped = runes with no battle effect.
export function equipRunes(units, equips = [], ctx = {}) {
  const out = units.map(u => ({ ...u, extraTribes: (u.extraTribes || []).slice(), skills: (u.skills || []).map(s => ({ ...s })) }));
  const list = (Array.isArray(equips) ? equips : []).filter(e => e && e.r && e.r.eff !== undefined);
  const skipped = [], tribeExtra = [];
  const copies = e => rnInt(e.n ?? 1, 1, 9);
  // DNA first: later runes with scope 'tribe' must see the tribes those runes added (Q4 B: counts as a real tribe)
  for (const e of list) if (e.r.eff === 'addTribe') {
    const tr = TRIBES.includes(e.r.gain) ? e.r.gain : TRIBES[0];
    for (const u of out) if (rnInScope(u, e.r, e) && u.tribe !== tr && !u.extraTribes.includes(tr)) u.extraTribes.push(tr);
  }
  for (const e of list) {
    const r = e.r, n = copies(e), kind = runeKind(r.eff);
    if (r.eff === 'addTribe') continue;
    if (RUNE_RUN_ONLY.includes(r.eff)) { skipped.push(r.id); continue; }
    if (r.eff === 'flag') { tribeExtra.push(...rnFlagExtra(r, n, e.tribes)); continue; }
    if (kind === 'stat') {
      const s = rnStatSkill(r, r.v * n); if (!s) { skipped.push(r.id); continue; }
      if (s.foe) { const a = rnAnchor(out); if (a) a.skills.push(s.skill); continue; }
      for (const u of out) if (rnInScope(u, r, e)) u.skills.push({ ...s.skill });
      continue;
    }
    if (kind === 'skill') {
      for (const u of out) if (rnInScope(u, r, e)) u.skills.push(runeSk(r.when, r.do, r.to, r.v * n));
      continue;
    }
    // special
    const targets = r.scope === 'enemy' ? [rnAnchor(out)].filter(Boolean) : out.filter(u => rnInScope(u, r, e));
    let used = false;
    for (const u of targets) {
      if (rnSpecStatic(r.eff, r, n, u, rnInt(ctx.winStreak ?? 0, 0, 99))) { used = true; continue; }
      const f = rnSpecFields(r.eff, r, n, e, u, out);
      if (f) { Object.assign(u, f); used = true; }
      const s = rnSpecSkill(r.eff, r, n, e, u);
      if (s) { u.skills.push(s.skill); used = true; if (s.one) break; } // 'one' = the whole team shares one copy of the effect
    }
    if (!used) skipped.push(r.id);
  }
  for (const u of out) u.hp = u.maxHp;
  return { units: out, tribeExtra, skipped };
}

// Convenience: rune record by id from a cleanStage() object (built-in or custom)
export function runeRecord(stage, id) {
  if (!stage) return null;
  if (stage.runes && stage.runes[id]) return stage.runes[id];
  return (stage.custom || []).find(c => c.id === id) || null;
}
