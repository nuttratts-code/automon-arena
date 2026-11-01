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
const AT_ROW = ['front', 'mid', 'back'];

const sameSlot = (u, s) => !!s && u.row === s[0] && u.lane === s[1];
function inScope(u, r, eq) {
  switch (r.scope) {
    case 'one': return eq.slot ? sameSlot(u, eq.slot) : false;
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
const anchorOf = units => units[0] || null;
// Skill record the engine runs. idx null = not a card skill (the match tab shows it as a rune line).
const sk = (when, doKey, to, value, extra = {}) => ({ when, do: doKey, to, value, idx: null, src: 'rune', ...extra });
const posInt = (v, lo, hi) => Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.floor(v))) : lo;

// One stat rune (RUNE_EFFECTS) → the DO_INFO effect it stands for · flat and % are separate effects
function statSkill(r, v) {
  const e = RUNE_EFF[r.eff]; if (!e) return null;
  const doKey = r.mode === 'flat' ? e[2] : e[3];
  if (!doKey) return null;
  const foe = e[4] === 'foe';
  const when = doKey === 'lifesteal' ? 'hit' : 'matchStart';
  return { skill: sk(when, doKey, foe ? 'allEnemies' : 'self', v), foe };
}

// Special runes that become fields battle.js reads · each returns the field changes for one unit
function specialFields(key, r, n, eq, u, units) {
  const num = q => (typeof r[q] === 'number' ? r[q] : (RUNE_SPEC[key].f.find(f => f[0] === q) || [, , 0])[2]);
  switch (key) {
    case 'allyDownDmg': return { downDmgPct: num('pct') * n };
    case 'bossDmg': return { bossDmgPct: num('dmgPct') * n };
    case 'lastStand': return { lastStandDmg: num('dmgPct') * n, lastStandCd: Math.min(90, num('cdPct') * n) };
    case 'avoidDeath': return { avoidLeft: posInt(num('times') * n, 0, 9) };
    case 'armorShare': return { shareTribePct: num('pct') * n, shareTribeN: posInt(num('count'), 1, 5) };
    case 'taunt': return { taunt: true };
    case 'link': return eq.partner && !sameSlot(u, eq.partner) ? { linkSlot: eq.partner.slice(), linkPct: Math.min(100, num('pct') * n) } : null;
    default: return null;
  }
}

// Static stat changes (done on the unit before the match, like a shop/permanent value)
function specialStatic(key, r, n, u) {
  const num = q => (typeof r[q] === 'number' ? r[q] : (RUNE_SPEC[key].f.find(f => f[0] === q) || [, , 0])[2]);
  if (key === 'glass') { u.maxHp = Math.max(1, Math.floor(u.maxHp * (1 - Math.min(90, num('hpPct') * n) / 100))); u.hitAmp = (u.hitAmp || 0) + num('dmgPct') * n; return true; }
  if (key === 'fortress') { u.maxHp = Math.floor(u.maxHp * (1 + num('hpPct') * n / 100)); u.atk = Math.max(0, Math.floor(u.atk * (1 - Math.min(90, num('atkPct') * n) / 100))); return true; }
  if (key === 'growth') { u.hitAmp = (u.hitAmp || 0) + Math.min(num('maxPct'), num('stepPct') * n); return true; } // stacks = ctx.winStreak (set by the caller)
  if (key === 'hpToArmorHit') {
    const lost = Math.floor(u.maxHp * Math.min(90, num('hpPct')) / 100);
    u.maxHp = Math.max(1, u.maxHp - lost); u.armorHit = (u.armorHit || 0) + Math.floor(lost * num('rate') * n / 100); return true;
  }
  return false;
}

// Special runes that become a skill the engine already runs
function specialSkill(key, r, n, eq, u) {
  const num = q => (typeof r[q] === 'number' ? r[q] : (RUNE_SPEC[key].f.find(f => f[0] === q) || [, , 0])[2]);
  switch (key) {
    case 'taunt': return { skill: sk('matchStart', 'armorPct', 'self', num('armorPct') * n) };
    case 'revive': return { skill: sk('selfDown', 'revive', 'self', Math.min(100, num('hpPct')), { lim: posInt(num('times') * n, 0, 9) }) };
    case 'freeze': return { skill: sk('matchStart', 'stun', 'allEnemies', Math.round(num('sec') * n * 1000), { bossPct: num('bossPct') }), foe: true };
    case 'regenLow': return { skill: sk('tick', 'healPct', 'allyLowest', num('pct') * n, { cd: Math.max(1000, Math.round(num('sec') * 1000)) }), one: true };
    case 'regen': return { skill: sk('tick', 'healPct', 'self', num('pct') * n, { cd: Math.max(1000, Math.round(num('sec') * 1000)) }) };
    case 'buddy': return eq.partner && !sameSlot(u, eq.partner)
      ? { skill: sk('hit', 'allyStrike', 'allyAt', 1, { at: { row: AT_ROW[eq.partner[0]], lane: eq.partner[1] === u.lane ? 'same' : 'other' }, pow: num('pct') * n }) } : null;
    default: return null;
  }
}

// Tribe counted extra for the bonus (T8 ธงเผ่า) — the engine adds it to the board count, capped at maxTier
function flagExtra(r, n) { return { tribe: TRIBES.includes(r.tribe) ? r.tribe : TRIBES[0], count: posInt(r.count * n, 0, 9), maxTier: posInt(r.maxTier, 2, 6) }; }

// units = buildTeam() output (not changed in place) · equips = [{ r: rune record, n: copies, slot: [row,lane], partner: [row,lane] }]
// Returns { units, tribeExtra, skipped } — tribeExtra goes to simulate(opts.tribeExtra), skipped = runes with no battle effect.
export function equipRunes(units, equips = [], ctx = {}) {
  const out = units.map(u => ({ ...u, extraTribes: (u.extraTribes || []).slice(), skills: (u.skills || []).map(s => ({ ...s })) }));
  const list = (Array.isArray(equips) ? equips : []).filter(e => e && e.r && e.r.eff !== undefined);
  const skipped = [], tribeExtra = [];
  const copies = e => posInt(e.n ?? 1, 1, 9);
  // DNA first: later runes with scope 'tribe' must see the tribes those runes added (Q4 B: counts as a real tribe)
  for (const e of list) if (e.r.eff === 'addTribe') {
    const tr = TRIBES.includes(e.r.gain) ? e.r.gain : TRIBES[0];
    for (const u of out) if (inScope(u, e.r, e) && u.tribe !== tr && !u.extraTribes.includes(tr)) u.extraTribes.push(tr);
  }
  for (const e of list) {
    const r = e.r, n = copies(e), kind = runeKind(r.eff);
    if (r.eff === 'addTribe') continue;
    if (RUNE_RUN_ONLY.includes(r.eff)) { skipped.push(r.id); continue; }
    if (r.eff === 'flag') { tribeExtra.push(flagExtra(r, n)); continue; }
    if (kind === 'stat') {
      const s = statSkill(r, r.v * n); if (!s) { skipped.push(r.id); continue; }
      if (s.foe) { const a = anchorOf(out); if (a) a.skills.push(s.skill); continue; }
      for (const u of out) if (inScope(u, r, e)) u.skills.push({ ...s.skill });
      continue;
    }
    if (kind === 'skill') {
      for (const u of out) if (inScope(u, r, e)) u.skills.push(sk(r.when, r.do, r.to, r.v * n));
      continue;
    }
    // special
    const targets = r.scope === 'enemy' ? [anchorOf(out)].filter(Boolean) : out.filter(u => inScope(u, r, e));
    let used = false;
    for (const u of targets) {
      if (specialStatic(r.eff, r, r.eff === 'growth' ? posInt(ctx.winStreak ?? 0, 0, 99) : n, u)) { used = true; continue; }
      const f = specialFields(r.eff, r, n, e, u, out);
      if (f) { Object.assign(u, f); used = true; }
      const s = specialSkill(r.eff, r, n, e, u);
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
