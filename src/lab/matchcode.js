// Match code (set 39): one line the user copies from the try-fight tab ("คัดลอกรหัสแมตช์") and pastes in chat,
// so Claude can replay exactly that match with `node lab/replay.mjs --code <file>`.
// Holds: base fingerprint · seed (0 = seed from teams) · both teams · tribe-off switches · edited values (diff vs base) · result to verify.
// Pure functions, no DOM. Bundled into balance.html and imported by lab/replay.mjs.
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
export function makeMatchCode({ base, seed, A, B, tribesOff, diff, result }) {
  return MATCH_CODE_TAG + ' ' + JSON.stringify({
    b: base, s: seed || 0, A: mcTeam(A), B: mcTeam(B), off: tribesOff.map(x => (x ? 1 : 0)),
    d: diff, r: [result.winner == null ? -1 : result.winner, result.timeMs],
  });
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
  return { base: o.b, seed: o.s, A: mcEntries(o.A, 'A'), B: mcEntries(o.B, 'B'), tribesOff: o.off.map(x => x === 1),
    diff: { chars: o.d.chars || {}, tribes: o.d.tribes || {} }, result: { winner: o.r[0] === -1 ? null : o.r[0], timeMs: o.r[1] } };
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
