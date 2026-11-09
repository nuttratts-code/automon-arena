// Set 168 (C-17.6 H1, plan step 7): fixed reference team set for boss tuning · node lab/bossref.mjs [runs] [perK]
// Teams = boss-fight teams of real-run sims (same flow as bossrun / runerun: lab/analyze.js runPlayStats) at k = 1 / 2 / 3,
// generated ONCE and committed (lab/bossref.json) so boss measures and the calibrator (bossrun --fit) compare against the same
// teams even after bosses change (before: k2/k3 teams depended on how hard the earlier bosses were).
// perK = at most this many teams per k, picked evenly over the list · units are stored without default fields (0 / '' / [] / {} / false)
// Regenerate only when characters / tribes / runes / rules change (bossrun --ref warns when the data hash differs).
import { writeFileSync } from 'node:fs';
import { buildCharacterList } from '../core/characters.js';
import { RULES } from '../core/rules.js';
import { BOT_TEAMS } from '../core/botdata.js';
import { validateBotTeams } from '../core/botteams.js';
import { dataHash } from '../core/save.js';
import { RUN_STAGE } from '../core/runboss.js';
import { makeCharMap } from '../core/team.js';
import { runPlayStats } from './analyze.js';

export const REF_FILE = new URL('./bossref.json', import.meta.url);
const empty = v => v === 0 || v === false || v === '' || (Array.isArray(v) && !v.length) || (v && typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length);
const slim = u => Object.fromEntries(Object.entries(u).filter(([, v]) => !empty(v)));
const dflt = v => (typeof v === 'number' ? 0 : typeof v === 'boolean' ? false : typeof v === 'string' ? '' : Array.isArray(v) ? [] : v && typeof v === 'object' ? {} : v);
// reference file → teams ready for simulate() (missing keys refilled from the stored schema) · null when the file is missing
export function loadRef(fs) {
  let o; try { o = JSON.parse(fs.readFileSync(REF_FILE, 'utf8')); } catch { return null; }
  const fill = u => { const x = JSON.parse(JSON.stringify(u)); for (const [k, v] of Object.entries(o.schema)) if (!(k in x)) x[k] = JSON.parse(JSON.stringify(v)); return x; };
  for (const k of [1, 2, 3]) o.teams[k] = o.teams[k].map(t => ({ ...t, units: t.units.map(fill), opts: {} }));
  return o;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const runs = +process.argv[2] || 600, perK = +process.argv[3] || 300;
  const chars = buildCharacterList(), hash = dataHash(chars, RULES);
  const bt = validateBotTeams(BOT_TEAMS, makeCharMap(chars), RULES, hash);
  if (!bt.ok) { console.log('bot teams not usable: run node lab/botgen.mjs first'); process.exit(1); }
  const t0 = Date.now();
  const S = await runPlayStats(chars, RULES, RUN_STAGE, { n: runs, keepTeams: true });
  const pick = list => { if (list.length <= perK) return list; const out = []; for (let i = 0; i < perK; i++) out.push(list[Math.floor(i * list.length / perK)]); return out; };
  const teams = {}, schema = {};
  for (const k of [1, 2, 3]) teams[k] = pick(S.teams[k]).map(t => { for (const u of t.units) for (const [key, v] of Object.entries(u)) if (empty(v) && !(key in schema)) schema[key] = dflt(v); return { tr: t.tr || '', ex: !!t.ex, units: t.units.map(slim) }; });
  writeFileSync(REF_FILE, JSON.stringify({ v: 1, at: new Date().toISOString().slice(0, 10), hash, runs, perK, schema, teams }));
  console.log(`lab/bossref.json · k1 ${teams[1].length} · k2 ${teams[2].length} · k3 ${teams[3].length} (of ${[1, 2, 3].map(k => S.teams[k].length).join('/')}) · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
