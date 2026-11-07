// set 130: "check before tuning" — compare a pasted Balance Room AMCFG1 code with the game now (chars · tribes · rules · runes · custom runes · bosses · mode settings).
// Run: node tools/cfgdiff.mjs <pasted.txt> [--md <out.md>]   · prints only the differing cells · exit 0 = MATCH, 1 = DIFFERS, 2 = bad input
// Input is external data: validated (parseCfgCode / cleanStage); nothing from it is evaluated or executed.
import fs from 'fs';
import path from 'path';
import { parseCfgCode } from '../lab/cfgcode.js';
import { cfgDiff, cfgDiffText } from '../lab/cfgdiff.js';

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const a = process.argv.slice(2), file = a[0], mi = a.indexOf('--md');
  if (!file) { console.error('usage: node tools/cfgdiff.mjs <pasted.txt> [--md <out.md>]'); process.exit(2); }
  let r;
  try { r = parseCfgCode(fs.readFileSync(file, 'utf8')); } catch (e) { console.error('bad code: ' + e.message); process.exit(2); }
  const d = cfgDiff(r);
  console.log(`saved ${r.config.savedAt || '?'} · rev ${r.config.rev ?? '?'}`);
  console.log(cfgDiffText(d));
  if (mi >= 0 && a[mi + 1]) { fs.writeFileSync(a[mi + 1], cfgDiffText(d, true) + '\n'); console.log('wrote ' + a[mi + 1]); }
  process.exit(d.rows.length ? 1 : 0);
}
