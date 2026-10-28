// Match analysis tab numbers (set 42): every number the "วิเคราะห์แมตช์" tab shows is computed here, with no DOM,
// so node tests (tests/t-skill-calc.js) check exactly what the page shows. Bundled into balance.html + system-check.html.
// The page (lab/balance/js/50-51) only formats and draws these numbers.
import { burnShares } from '../core/battle.js';

export const MX_SRC = ['hit', 'counter', 'shock', 'burn', 'skill', 'downSkill', 'armorBreak', 'reflect', 'execute', 'storm'];
export const mxWhy = w => (MX_SRC.includes(w) ? w : 'skill');
export const mxAgg = () => ({ n: 0, amt: 0, abs: 0, over: 0 });
export const mxAdd = (a, r) => { a.n += r.f; a.amt += r.amt; a.abs += r.abs; a.over += r.over; };
// A5: 'HP หายจริง' = amount − armor − overkill (the part beyond remaining HP is not real HP loss; the overkill metric itself is unchanged)
export const mxLoss = a => Math.max(0, a.amt - a.abs - a.over);

// One record per damage event { t, ei, to, from, why, amt, abs, over, d, f } · burn split by who applied it (same tracker as u.dealt)
export function mxRecords(r) {
  const bs = burnShares(), recs = []; // A7: same tracker as the battle's u.dealt (core/battle.js)
  for (let ei = 0; ei < r.events.length; ei++) {
    const e = r.events[ei]; // ei = event index (link to the log line)
    if (e.k === 'burn' || e.k === 'cleanse' || e.k === 'down') bs.see(e.k, e);
    else if (e.k === 'dmg') {
      const d = e.d && typeof e.d === 'object' ? e.d : {}, over = d.over || 0;
      const push = (from, f) => recs.push({ t: e.t, ei, to: e.to, from, why: e.why, d, f, amt: e.amount * f, abs: e.absorbed * f, over: over * f, sub: !!e.sub, raw: e });
      if (e.why === 'burn') for (const [src, f] of bs.split(e.to)) push(src >= 0 ? src : null, f);
      else push(e.from, 1);
    }
  }
  return recs;
}

// A1 (28 Oct): ONE list of "what this unit gave" used by both the card (fxTot) and the pane, so they always agree.
// giver: heal/armor = from ?? receiver (tribe armor has no source) · other effects = from · damage (k dmg) never (A2).
// rows: hit-based / แบ่งเกราะ / โบนัสเผ่า / one row per skill / leftovers — nothing counted on the card is missing here.
export const mxIsHit = e => /Hit$/.test(e.why || '');
export function mxFxGiven(r) { // uid → Map(key → { key, name, color, si, list: [{ e, ei }] })
  const out = new Map(), put = (uid, key, mk, x) => {
    let rows = out.get(uid); if (!rows) out.set(uid, rows = new Map());
    let row = rows.get(key); if (!row) rows.set(key, row = { key, ...mk(), list: [] }); row.list.push(x);
  };
  r.events.forEach((e, ei) => {
    const x = { e, ei }, si = e.d && e.d.si != null ? e.d.si : null;
    if (e.k === 'heal' || e.k === 'armor') {
      const g = e.from ?? e.to, A = e.k === 'armor', c = A ? 'var(--n-armor)' : 'var(--n-heal)';
      if (g == null) return;
      if (mxIsHit(e)) put(g, e.k + ':hit', () => ({ name: A ? 'ให้เกราะ (ฮิต)' : 'ฟื้น/ฮิต', color: c }), x);
      else if (A && e.why === 'share') put(g, 'share', () => ({ name: 'แบ่งเกราะ', color: c }), x);
      else if (e.why === 'tribe' || (e.d && e.d.src === 'tribe')) put(g, e.k + ':tribe', () => ({ name: (A ? 'เกราะ' : 'ฮิล') + ' (โบนัสเผ่า)', color: c }), x);
      else if (si != null) put(g, 'si:' + si, () => ({ si, color: 'var(--n-skill)' }), x);
      else put(g, e.k + ':etc', () => ({ name: A ? 'ให้เกราะ (อื่นๆ)' : 'ให้ฮิล (อื่นๆ)', color: c }), x);
    } else if (e.k === 'reflectDebuff' && e.si != null && e.from != null) { // F1 (user A): from = the PT-8 that reflected (gets the credit) · e.ally = protected ally · e.to = enemy who got it back
      put(e.from, 'si:' + e.si, () => ({ si: e.si, color: 'var(--n-skill)' }), x);
    } else if (si != null && e.k !== 'dmg' && e.from != null) put(e.from, 'si:' + si, () => ({ si, color: 'var(--n-skill)' }), x);
  });
  return out;
}
export const mxFxAmt = e => (e.k === 'armor' || e.k === 'heal') ? (e.amount || 0) : 0;

// All numbers of the tab for one match. units = unitsOf(r) (start units + summoned).
// per: uid → { out (to enemies), ally (to own side), in } damage records · act: hits / sub-hits / burn+shock applied to enemies
// fxTot: heal/armor given + other skill effects (card line of tab "อื่นๆ") · tot: [left dealt, right dealt] (header chips)
export function mxModel(r, units) {
  const U = new Map(units.map(u => [u.uid, u])), recs = mxRecords(r);
  const sideOf = uid => (U.get(uid) || {}).side, foe = rr => rr.from != null && sideOf(rr.from) !== sideOf(rr.to);
  const tot = [0, 1].map(sd => recs.filter(x => foe(x) && sideOf(x.from) === sd).reduce((a, x) => a + x.amt, 0));
  const per = new Map(units.map(u => [u.uid, { out: [], ally: [], in: [] }]));
  for (const x of recs) { per.get(x.to)?.in.push(x); if (x.from != null) { const p = per.get(x.from); if (p) (foe(x) ? p.out : p.ally).push(x); } }
  const act = new Map(units.map(u => [u.uid, { hits: 0, subs: 0, burnN: 0, burnU: 0, shockN: 0, shockU: 0 }]));
  for (const e of r.events) {
    if (e.from == null || e.to == null) continue;
    const a = act.get(e.from); if (!a || sideOf(e.from) === sideOf(e.to)) continue;
    if (e.k === 'dmg' && e.why === 'hit') { if (e.sub) a.subs++; else a.hits++; }
    else if (e.k === 'burn') { a.burnN++; a.burnU += e.amount; }
    else if (e.k === 'shock') { a.shockN++; a.shockU += e.amount; }
  }
  const fxTot = new Map(units.map(u => [u.uid, { heal: 0, armor: 0, heals: 0, armors: 0, skills: 0 }]));
  const fxGiven = mxFxGiven(r);
  for (const [uid, rows] of fxGiven) { const q = fxTot.get(uid); if (!q) continue;
    for (const row of rows.values()) for (const { e } of row.list) {
      if (e.k === 'heal' || e.k === 'armor') { q[e.k] += e.amount; if (e.k === 'heal') q.heals++; else q.armors++; }
      else q.skills++;
    } }
  return { U, recs, sideOf, foe, tot, per, act, fxTot, fxGiven };
}
// Sum of a record list split by source (tab 1/2 tables): { [why]: agg } + total amount
export function mxBySrc(list) { const s = {}; let t = 0; for (const x of list) { const w = mxWhy(x.why); (s[w] ||= mxAgg()); mxAdd(s[w], x); t += x.amt; } return [s, t]; }
