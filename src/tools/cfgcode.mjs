// set 48: decode the Balance Room "คัดลอกค่าให้ Claude" code (AMCFG1 {json}) pasted in chat.
// Run: node tools/cfgcode.mjs <pasted.txt> <out dir>
// Writes <out dir>/main.json (same shape as config/main → feed to tools/apply-config.mjs)
// and prints the pre-import check (ops-rules ①): measured edits (results/latest) == saved config?
// Input is external data: validated here; nothing from it is evaluated or executed.
import fs from 'fs';
import path from 'path';
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

const canon = v => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(q => [q, x[q]])) : x));

export function preImportCheck({ config, measured }) {
  if (!measured || !measured.edits) return { ok: false, why: 'no measured result (press วิเคราะห์ then 💾)', diff: [] };
  const diff = [];
  for (const part of ['chars', 'tribes']) {
    const a = config[part], b = measured.edits[part];
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (canon(a[k]) !== canon(b[k])) diff.push(part + ':' + k);
  }
  return { ok: diff.length === 0, why: diff.length ? 'measured values differ from saved values' : '', diff };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const [file, out] = process.argv.slice(2);
  if (!file || !out) { console.error('usage: node tools/cfgcode.mjs <pasted.txt> <out dir>'); process.exit(2); }
  const r = parseCfgCode(fs.readFileSync(file, 'utf8'));
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'main.json'), JSON.stringify(r.config, null, 2));
  const chk = preImportCheck(r);
  console.log(`saved ${r.config.savedAt || '?'} · chars ${Object.keys(r.config.chars).join(' ') || '-'} · tribes ${Object.keys(r.config.tribes).join(' ') || '-'}`);
  console.log(`measured ${r.measured && r.measured.at || '-'} · pre-import check: ${chk.ok ? 'MATCH' : 'DIFFERS — ' + chk.why + (chk.diff.length ? ' [' + chk.diff.join(', ') + ']' : '')}`);
  console.log('wrote ' + path.join(out, 'main.json'));
  process.exit(chk.ok ? 0 : 1);
}
