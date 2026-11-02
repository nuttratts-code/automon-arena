// Match code (set 39): one line the user copies from the try-fight tab ("คัดลอกรหัสแมตช์") and pastes in chat,
// so Claude can replay exactly that match with `node lab/replay.mjs --code <file>`.
// Holds: base fingerprint · seed (0 = seed from teams) · both teams · tribe-off switches · edited values (diff vs base) · result to verify.
// Set 72: boss fights + runes too — optional k (boss appearance), st (only the stage records used: the boss + equipped runes), ru (rune equips).
// Pure functions, no DOM. Bundled into balance.html and imported by lab/replay.mjs.
import { cleanStage, runeActive } from '../core/stage.js';
export const MATCH_CODE_TAG = 'AMATCH1';
const MC_MAX_LEN = 200000;

// Short hash of the base characters + tribe bonuses. Different = the page and the repo start from different values.
export function baseFingerprint(chars, tribes) {
  const s = JSON.stringify([chars, tribes]);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h.toString(16).padStart(8, '0');
}

const mcTeam = list => list.map(e => [e.id, e.level, e.row, e.lane]);
// boss = { rec, k } (boss mode, B = []) · runes = [{ r: rune record with id, n, slot, partner }] equipped on team A
export function makeMatchCode({ base, seed, A, B, tribesOff, diff, result, boss = null, runes = [] }) {
  const o = { b: base, s: seed || 0, A: mcTeam(A), B: boss ? [] : mcTeam(B), off: tribesOff.map(x => (x ? 1 : 0)),
    d: diff, r: [result.winner == null ? -1 : result.winner, result.timeMs] };
  if (boss || runes.length) {
    const st = { copiesRule: 'rarity', runes: {}, custom: [] };
    for (const e of runes) { const { id, ...rec } = e.r; if (/^C\d/.test(id)) st.custom.push({ ...rec, id }); else st.runes[id] = rec; }
    if (boss) { st.bosses = [boss.rec]; o.k = boss.k; }
    o.st = st;
    o.ru = runes.map(e => [e.r.id, e.n, e.slot || null, e.partner || null]);
  }
  return MATCH_CODE_TAG + ' ' + JSON.stringify(o);
}

const mcIsObj = x => x && typeof x === 'object' && !Array.isArray(x);
const mcBadKey = k => k === '__proto__' || k === 'constructor' || k === 'prototype';
function mcEntries(list, side) {
  if (!Array.isArray(list) || !list.length || list.length > 6) throw new Error(`team ${side}: must have 1–6 units`);
  return list.map(x => {
    if (!Array.isArray(x) || x.length !== 4) throw new Error(`team ${side}: bad unit`);
    const [id, level, row, lane] = x;
    if (typeof id !== 'string' || !/^[A-Z]{2}-\d{1,2}$/.test(id)) throw new Error(`team ${side}: bad id`);
    if (![1, 2, 3].includes(level) || ![0, 1, 2].includes(row) || ![0, 1].includes(lane)) throw new Error(`team ${side}: bad level/slot`);
    return { id, level, row, lane };
  });
}
// Text → checked object (throws Error with a reason). Values inside d are checked later against the base (applyMatchDiff + validateConfig).
export function parseMatchCode(text) {
  const t = String(text).trim();
  if (t.length > MC_MAX_LEN) throw new Error('code too long');
  if (!t.startsWith(MATCH_CODE_TAG + ' ')) throw new Error('not a match code (missing ' + MATCH_CODE_TAG + ')');
  let o;
  try { o = JSON.parse(t.slice(MATCH_CODE_TAG.length + 1)); } catch { throw new Error('code is not valid (cut off while copying?)'); }
  if (!mcIsObj(o)) throw new Error('bad code body');
  if (typeof o.b !== 'string' || !/^[0-9a-f]{8}$/.test(o.b)) throw new Error('bad base fingerprint');
  if (!Number.isInteger(o.s) || o.s < 0 || o.s > 999999) throw new Error('bad seed');
  if (!Array.isArray(o.off) || o.off.length !== 2 || !o.off.every(x => x === 0 || x === 1)) throw new Error('bad tribe switches');
  if (!mcIsObj(o.d) || !mcIsObj(o.d.chars || {}) || !mcIsObj(o.d.tribes || {})) throw new Error('bad edited values');
  if (!Array.isArray(o.r) || o.r.length !== 2 || ![-1, 0, 1].includes(o.r[0]) || !Number.isInteger(o.r[1])) throw new Error('bad result');
  const bossK = o.k === undefined ? 0 : o.k;
  if (!Number.isInteger(bossK) || bossK < 0 || bossK > 99) throw new Error('bad boss appearance');
  if (bossK && !(Array.isArray(o.B) && o.B.length === 0)) throw new Error('boss match: right team must be empty');
  if ((bossK || o.ru !== undefined) && !mcIsObj(o.st)) throw new Error('bad boss/rune records');
  if (bossK && !(Array.isArray(o.st.bosses) && o.st.bosses.length === 1)) throw new Error('bad boss record');
  const ru = o.ru === undefined ? [] : o.ru;
  if (!Array.isArray(ru) || ru.length > 30) throw new Error('bad rune list');
  const cell = c => c === null || (Array.isArray(c) && c.length === 2 && [0, 1, 2].includes(c[0]) && [0, 1].includes(c[1]));
  const runes = ru.map(x => {
    if (!Array.isArray(x) || x.length !== 4 || typeof x[0] !== 'string' || !/^[A-Z]\d{1,3}$/.test(x[0]) || !Number.isInteger(x[1]) || x[1] < 1 || x[1] > 9 || !cell(x[2]) || !cell(x[3])) throw new Error('bad rune');
    return { id: x[0], n: x[1], slot: x[2], partner: x[3] };
  });
  return { base: o.b, seed: o.s, A: mcEntries(o.A, 'A'), B: bossK ? [] : mcEntries(o.B, 'B'), tribesOff: o.off.map(x => x === 1),
    diff: { chars: o.d.chars || {}, tribes: o.d.tribes || {} }, result: { winner: o.r[0] === -1 ? null : o.r[0], timeMs: o.r[1] },
    bossK, stage: o.st || null, runes };
}

// Set 72: checked boss record + rune equips of a parsed code (records go through cleanStage like the page's own data)
// → { boss: record | null, k, equips: [{ r, n, slot, partner }] } · equipRunes(team, equips) + bossUnit(boss, k) rebuild the fight
export function matchFightParts(mc) {
  if (!mc.stage) return { boss: null, k: 0, equips: [] };
  const st = cleanStage(mc.stage);
  const want = mc.bossK ? mc.stage.bosses[0].id : null;
  const boss = want ? st.bosses.find(b => b.id === want) || null : null;
  if (mc.bossK && !boss) throw new Error('bad boss record');
  const all = [...Object.entries(st.runes).map(([id, r]) => ({ ...r, id })), ...st.custom.map(r => ({ ...r }))].filter(runeActive);
  const equips = mc.runes.map(x => {
    const r = all.find(q => q.id === x.id); if (!r) throw new Error('unknown or switched-off rune ' + x.id);
    return { r, n: x.n, slot: x.slot, partner: x.partner };
  });
  return { boss, k: mc.bossK, equips };
}

// Edited values on top of the base: only fields/tribes that exist in the base, same kind (array/number/string/object).
// Run validateConfig on the returned chars before simulating.
export function applyMatchDiff(baseChars, baseTribes, diff) {
  const chars = JSON.parse(JSON.stringify(baseChars)), tribes = JSON.parse(JSON.stringify(baseTribes));
  const kind = x => (Array.isArray(x) ? 'array' : x === null ? 'null' : typeof x);
  for (const [id, d] of Object.entries(diff.chars)) {
    const c = chars.find(x => x.id === id);
    if (!c) throw new Error('unknown character in edited values: ' + id);
    if (!mcIsObj(d)) throw new Error('bad edited values for ' + id);
    for (const [k, v] of Object.entries(d)) {
      if (mcBadKey(k) || k === 'id' || !Object.prototype.hasOwnProperty.call(c, k) || kind(c[k]) !== kind(v)) throw new Error(`bad field ${id}.${k}`);
      c[k] = JSON.parse(JSON.stringify(v));
    }
  }
  for (const [t, v] of Object.entries(diff.tribes)) {
    if (mcBadKey(t) || !Object.prototype.hasOwnProperty.call(tribes, t) || !mcIsObj(v)) throw new Error('bad tribe in edited values: ' + t);
    tribes[t] = JSON.parse(JSON.stringify(v));
  }
  return { chars, tribes };
}
