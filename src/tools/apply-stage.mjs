// set 130: import the Balance Room stage tab (runes · custom runes · bosses · mode settings) from a decoded AMCFG1 config into core/stage-user.js —
// only the items the user chose to take from the Balance Room side (see workflow/balance-import.md "check before tuning").
// Run: node tools/apply-stage.mjs <main.json> --take <list>
//   list = comma separated: a part (runes | custom | bosses | settings = every differing item of that part) or part:id (runes:T2, bosses:B1, settings:foeFloor) · all = everything
// main.json = output of tools/cfgcode.mjs · values go through cleanStage() (validated) before they are written.
import fs from 'fs';
import { parseCfgCode } from '../lab/cfgcode.js';
import { cfgDiff } from '../lab/cfgdiff.js';
import { cleanStage } from '../core/stage.js';
import { STAGE_USER } from '../core/stage-user.js';

const isObj = x => x && typeof x === 'object' && !Array.isArray(x);
const q = s => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
// one-line JS literal, keys sorted (bossrun.mjs relies on `atk: N, bars:` / `hp: N, id:` order)
export const lit = v => Array.isArray(v) ? `[${v.map(lit).join(', ')}]` : isObj(v) ? (Object.keys(v).length ? `{ ${Object.keys(v).sort().map(k => `${/^[A-Za-z_$][\w$]*$/.test(k) ? k : q(k)}: ${lit(v[k])}`).join(', ')} }` : '{}') : typeof v === 'string' ? q(v) : String(v);

export function stageUserSource(head, u) {
  return `${head}export const STAGE_USER = {\n  copiesRule: ${q(u.copiesRule || 'rarity')},\n  bosses: [\n${u.bosses.map(b => '    ' + lit(b) + ',\n').join('')}  ],\n  custom: [\n${u.custom.map(c => '    ' + lit(c) + ',\n').join('')}  ],\n  runes: {\n${Object.keys(u.runes).sort().map(k => `    ${k}: ${lit(u.runes[k])},\n`).join('')}  },\n  settings: ${lit(u.settings)},\n};\n`;
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(new URL(import.meta.url).pathname)) {
  const a = process.argv.slice(2), ti = a.indexOf('--take');
  if (!a[0] || ti < 0 || !a[ti + 1]) { console.error('usage: node tools/apply-stage.mjs <main.json> --take <all | part | part:id,...>'); process.exit(2); }
  const cfg = JSON.parse(fs.readFileSync(a[0], 'utf8'));
  if (!isObj(cfg.stage)) { console.error('config has no stage part'); process.exit(2); }
  const take = a[ti + 1].split(',').map(s => s.trim()).filter(Boolean);
  const { rows } = cfgDiff(parseCfgCode('AMCFG1 ' + JSON.stringify({ v: 1, config: { ...cfg, chars: {}, tribes: {}, rules: {} } })));
  const want = (part, id) => take.includes('all') || take.includes(part) || take.includes(part + ':' + id);
  const pick = new Map();
  for (const r of rows) if (['runes', 'custom', 'bosses', 'settings'].includes(r.part) && want(r.part, r.id)) pick.set(r.part + ':' + r.id, r);
  for (const t of take) if (t.includes(':') && !pick.has(t)) console.log(`skip ${t}: already the same as the game (or unknown)`);
  if (!pick.size) { console.log('nothing to import'); process.exit(0); }
  const s = cleanStage(cfg.stage), u = JSON.parse(JSON.stringify(STAGE_USER));
  u.runes = u.runes || {}; u.custom = u.custom || []; u.settings = u.settings || {};
  for (const key of pick.keys()) {
    const [part, id] = key.split(':');
    if (part === 'runes') u.runes[id] = s.runes[id];
    else if (part === 'settings') u.settings[id] = s.settings[id];
    else {
      const list = part === 'bosses' ? s.bosses : s.custom, dst = u[part], v = list.find(x => x.id === id), i = dst.findIndex(x => x.id === id);
      if (!v) { if (i >= 0) dst.splice(i, 1); } else if (i >= 0) dst[i] = v; else dst.push(v);
      if (part === 'bosses') u.bosses = list.map(x => u.bosses.find(y => y.id === x.id)).filter(Boolean).concat(u.bosses.filter(y => !list.some(x => x.id === y.id))); // keep the Balance Room boss order
    }
  }
  const f = new URL('../core/stage-user.js', import.meta.url);
  const head = fs.readFileSync(f, 'utf8').split('export const STAGE_USER')[0];
  fs.writeFileSync(f, stageUserSource(head, u));
  console.log(`core/stage-user.js written · took ${pick.size} item(s): ${[...pick.keys()].join(' ')}`);
}
