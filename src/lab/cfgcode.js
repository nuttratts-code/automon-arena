// set 48: pure decoder for the Balance Room "คัดลอกค่าให้ Claude" code (AMCFG1 {json}) · no node imports, so the
// system-check page can bundle it · CLI wrapper: tools/cfgcode.mjs · input is external data: validated, never evaluated.
import { ROWS } from '../core/characters.js';
import { TRIBES } from '../core/rules.js';

export function parseCfgCode(text) {
  if (typeof text !== 'string') throw new Error('code must be text');
  const i = text.indexOf('AMCFG1 ');
  if (i < 0) throw new Error('no AMCFG1 code found');
  let o;
  try { o = JSON.parse(text.slice(i + 7).trim()); } catch (e) { throw new Error('code JSON is broken: ' + e.message); }
  const isObj = x => x && typeof x === 'object' && !Array.isArray(x);
  if (!isObj(o) || o.v !== 1 || !isObj(o.config)) throw new Error('code shape is wrong (v/config)');
  const cfg = o.config;
  const chars = cfg.chars === undefined ? {} : cfg.chars, tribes = cfg.tribes === undefined ? {} : cfg.tribes;
  if (!isObj(chars) || !isObj(tribes)) throw new Error('config.chars / config.tribes must be objects');
  const ids = new Set(ROWS.map(r => r[0]));
  for (const [id, c] of Object.entries(chars)) {
    if (!ids.has(id)) throw new Error('unknown character id ' + id);
    if (!isObj(c)) throw new Error('character entry is not an object: ' + id);
  }
  for (const [t, v] of Object.entries(tribes)) {
    if (!TRIBES.includes(t)) throw new Error('unknown tribe ' + t);
    if (!isObj(v)) throw new Error('tribe entry is not an object: ' + t);
  }
  let measured = null;
  if (o.measured != null) {
    if (!isObj(o.measured)) throw new Error('measured must be an object');
    const e = o.measured.edits;
    measured = { at: typeof o.measured.at === 'string' ? o.measured.at : null, edits: isObj(e) ? { chars: isObj(e.chars) ? e.chars : {}, tribes: isObj(e.tribes) ? e.tribes : {} } : null };
  }
  return { config: { ...cfg, chars, tribes }, measured };
}

const cfgCanon = v => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(q => [q, x[q]])) : x));

export function preImportCheck({ config, measured }) {
  if (!measured || !measured.edits) return { ok: false, why: 'no measured result (press วิเคราะห์ then 💾)', diff: [] };
  const diff = [];
  for (const part of ['chars', 'tribes']) {
    const a = config[part], b = measured.edits[part];
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (cfgCanon(a[k]) !== cfgCanon(b[k])) diff.push(part + ':' + k);
  }
  return { ok: diff.length === 0, why: diff.length ? 'measured values differ from saved values' : '', diff };
}
