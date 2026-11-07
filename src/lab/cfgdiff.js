// set 130: "check before tuning" — compare a Balance Room AMCFG1 code with what the game holds now, every part:
// characters · tribe bonuses · game rules · stage (runes, custom runes, bosses, mode settings). Returns ONLY the cells that differ.
// Pure (no node imports) so a page could bundle it · CLI: tools/cfgdiff.mjs · input is external data: validated by parseCfgCode/cleanStage, never evaluated.
import { buildCharacterList } from '../core/characters.js';
import { RULES, RULE_SPEC, ruleGet } from '../core/rules.js';
import { STAGE_RUNES, STAGE_SETTINGS, BOSS_STATS, cleanStage, stageDefaults } from '../core/stage.js';

const isObj = x => x && typeof x === 'object' && !Array.isArray(x);
const canon = v => JSON.stringify(v, (k, x) => (isObj(x) ? Object.fromEntries(Object.keys(x).sort().map(q => [q, x[q]])) : x));
const same = (a, b) => canon(a) === canon(b);
// short text for a value (arrays of rule/skill objects become one line)
export function show(v) {
  if (v === undefined) return '–';
  if (typeof v === 'string') return v === '' ? '""' : v;
  if (Array.isArray(v) && v.every(x => !isObj(x) && !Array.isArray(x))) return '[' + v.join(', ') + ']';
  if (Array.isArray(v) && v.every(x => isObj(x) && typeof x.id === 'string')) return v.length ? v.map(x => [x.id, ...Object.entries(x).filter(([k]) => k !== 'id').map(([, y]) => show(y))].join(' ')).join(' · ') : '(ไม่มี)';
  return JSON.stringify(v);
}
// leaf differences between two values: objects by key, arrays of primitives / objects without id as one cell
function deep(a, b, path, out) {
  if (same(a, b)) return;
  if (isObj(a) && isObj(b)) { for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) deep(a[k], b[k], path ? path + '.' + k : k, out); return; }
  out.push({ field: path || '(ทั้งหมด)', code: a, game: b });
}

const RUNE_NAME = Object.fromEntries(STAGE_RUNES.map(r => [r.id, r.name]));
const SET_LABEL = Object.fromEntries(STAGE_SETTINGS.map(([k, label]) => [k, label]));
const BOSS_LABEL = Object.fromEntries(BOSS_STATS.map(([k, label]) => [k, label]));
const RULE_LABEL = Object.fromEntries(RULE_SPEC.map(([p, label]) => [p, label]));

// parsed = parseCfgCode(text) result · returns { rows: [{part, id, name, field, label, code, game}], notes: [...] }
export function cfgDiff(parsed) {
  const cfg = parsed.config, rows = [], notes = [];
  const add = (part, id, name, d, label = '') => rows.push({ part, id, name, field: d.field, label, code: d.code, game: d.game });
  // characters: the code holds only the fields the user changed vs the page defaults → compare each of those with the game
  const chars = buildCharacterList();
  for (const [id, c] of Object.entries(cfg.chars || {})) {
    const g = chars.find(x => x.id === id);
    for (const [k, v] of Object.entries(c)) {
      const gv = k === 'cdMs' ? g.cdMs : g[k];
      if (!same(v, gv)) add('chars', id, g.name, { field: k, code: v, game: gv });
    }
  }
  for (const [t, o] of Object.entries(cfg.tribes || {})) {
    const out = []; deep(o, RULES.tribeBonus[t] || {}, '', out);
    // fields the code does not carry keep the game value on the page → only compare fields present in the code
    for (const d of out) if (d.code !== undefined) add('tribes', t, t, d);
  }
  for (const [p, v] of Object.entries(cfg.rules || {})) {
    const op = (RULE_SPEC.find(r => r[0] === p) || [])[6] || {};
    const gv = ruleGet(RULES, p), g2 = op.bool ? (gv ? 1 : 0) : gv;
    if (v !== g2) add('rules', p, RULE_LABEL[p] || p, { field: 'ค่า', code: v, game: g2 });
  }
  if (!isObj(cfg.stage)) notes.push('code has no stage part (runes/bosses/settings not compared)');
  else {
    const s = cleanStage(cfg.stage), d = stageDefaults();
    for (const id of Object.keys(d.runes)) {
      const out = []; deep(s.runes[id], d.runes[id], '', out);
      for (const x of out) add('runes', id, d.runes[id].name || RUNE_NAME[id] || id, x, x.field === 'del' ? 'ลบ' : x.field === 'on' ? 'เปิดใช้' : '');
    }
    const cs = new Map(s.custom.map(x => [x.id, x])), cd = new Map(d.custom.map(x => [x.id, x]));
    for (const id of new Set([...cs.keys(), ...cd.keys()])) {
      const a = cs.get(id), b = cd.get(id);
      if (!a || !b) add('custom', id, (a || b).name, { field: '(ทั้งตัว)', code: a ? 'มี' : undefined, game: b ? 'มี' : undefined });
      else { const out = []; deep(a, b, '', out); for (const x of out) add('custom', id, b.name, x); }
    }
    const bs = new Map(s.bosses.map(x => [x.id, x])), bd = new Map(d.bosses.map(x => [x.id, x]));
    for (const id of new Set([...bs.keys(), ...bd.keys()])) {
      const a = bs.get(id), b = bd.get(id);
      if (!a || !b) { add('bosses', id, (a || b).name, { field: '(ทั้งตัว)', code: a ? 'มี' : undefined, game: b ? 'มี' : undefined }); continue; }
      const out = [];
      for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (k !== 'phases') deep(a[k], b[k], k, out);
      const n = Math.max(a.phases.length, b.phases.length);
      for (let i = 0; i < n; i++) deep(a.phases[i], b.phases[i], `phase${i + 1}`, out);
      for (const x of out) add('bosses', id, b.name, x, BOSS_LABEL[x.field] || '');
    }
    for (const k of Object.keys(d.settings)) if (s.settings[k] !== d.settings[k]) add('settings', k, SET_LABEL[k] || k, { field: 'ค่า', code: s.settings[k], game: d.settings[k] });
    // values the game check rejected (out of range / unknown) are silently replaced by game values → warn
    if (isObj(cfg.stage.settings)) for (const k of Object.keys(cfg.stage.settings)) if (!(k in d.settings)) notes.push(`stage setting ${k} unknown to the game (ignored)`);
    if (isObj(cfg.stage.runes)) for (const k of Object.keys(cfg.stage.runes)) if (!(k in d.runes)) notes.push(`rune ${k} unknown to the game (ignored)`);
  }
  return { rows, notes };
}

export const PART_TH = { chars: 'ตัวละคร', tribes: 'โบนัสเผ่า', rules: 'กฎเกม', runes: 'รูน', custom: 'รูนที่สร้างเอง', bosses: 'บอส', settings: 'ค่าโหมด (แท็บด่าน)' };

// plain text report (CLI) · md = markdown table for a claude/ review file
export function cfgDiffText({ rows, notes }, md = false) {
  if (!rows.length) return (md ? '' : '') + 'MATCH — AMCFG1 = game in every part' + (notes.length ? '\n' + notes.map(n => '- note: ' + n).join('\n') : '');
  const lines = [`DIFFERS — ${rows.length} cell(s)`];
  for (const part of Object.keys(PART_TH)) {
    const rs = rows.filter(r => r.part === part); if (!rs.length) continue;
    lines.push('', md ? `### ${PART_TH[part]} (${rs.length})` : `== ${PART_TH[part]} (${rs.length})`);
    if (md) lines.push('', '| ID | ชื่อ | ช่อง | Balance Room (AMCFG1) | เกมตอนนี้ |', '|---|---|---|---|---|');
    for (const r of rs) {
      const f = r.label ? `${r.field} (${r.label})` : r.field;
      const esc = s => String(s).replace(/\|/g, '\\|');
      lines.push(md ? `| ${r.id} | ${esc(r.name)} | ${esc(f)} | ${esc(show(r.code))} | ${esc(show(r.game))} |` : `${r.id} ${r.name} · ${f} · AMCFG1 ${show(r.code)} · game ${show(r.game)}`);
    }
  }
  if (notes.length) lines.push('', ...notes.map(n => '- note: ' + n));
  return lines.join('\n');
}
