// set 48: decode the Balance Room "คัดลอกค่าให้ Claude" code (AMCFG1 {json}) pasted in chat.
// Run: node tools/cfgcode.mjs <pasted.txt> <out dir>
// Writes <out dir>/main.json (same shape as config/main → feed to tools/apply-config.mjs)
// and prints the pre-import check (ops-rules ①): measured edits (results/latest) == saved config?
// Input is external data: validated here; nothing from it is evaluated or executed.
import fs from 'fs';
import path from 'path';
import { parseCfgCode, preImportCheck } from '../lab/cfgcode.js';

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
