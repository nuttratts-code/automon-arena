// How many card values can one unit carry together? random teams, real core, end-of-match stats.
import { buildCharacterList } from 'file:///D:/GitHub/automon-arena/src/core/characters.js'; import { makeCharMap, buildTeam } from 'file:///D:/GitHub/automon-arena/src/core/team.js'; import { simulate } from 'file:///D:/GitHub/automon-arena/src/core/battle.js'; import { makeRng } from 'file:///D:/GitHub/automon-arena/src/core/rng.js';
const chars = buildCharacterList(); const cm = makeCharMap(chars); let _s = 4242; const rng = () => { _s = (_s * 1103515245 + 12345) % 2147483648; return _s / 2147483648; };
const KEYS = ['burnHit','shockHit','armorHit','healHit','hitAmp','burnAmp','shockAmp','armorAmp','healAmp','cdAmp','healToAtk'];
const ids = chars.map(c => c.id);
const pick = n => { const a = ids.slice(); const o = []; while (o.length < n) o.push(a.splice(Math.floor(rng() * a.length), 1)[0]); return o; };
const team = list => list.map((id, i) => ({ id, level: 1 + Math.floor(rng() * 3), row: Math.floor(i / 2), lane: i % 2 }));
const combos = {}; const hist = {}; const keyCount = {}; let best = { n: 0 }; let N = 0;
for (let m = 0; m < 3000; m++) {
  const ls = pick(12); let A, B;
  try { A = buildTeam(team(ls.slice(0, 6)), cm); B = buildTeam(team(ls.slice(6)), cm); } catch (e) { continue; }
  const r = simulate(A, B, { detail: true, seed: m });
  for (const u of r.units) {
    const f = u.fin; if (!f) continue; N++;
    const have = ['atk']; if ((f.multi || 1) > 1) have.push('multi');
    for (const k of KEYS) if (f[k]) have.push(k);
    hist[have.length] = (hist[have.length] || 0) + 1;
    for (const k of have) keyCount[k] = (keyCount[k] || 0) + 1;
    if (have.length >= 4) { const c = have.join(" "); combos[c] = (combos[c] || 0) + 1; }
    if (have.length > best.n) best = { n: have.length, id: u.id, have, f };
  }
}
console.log('units', N, 'values-per-unit histogram (atk counted, armor not)', hist);
console.log('how often each value appears', keyCount);
console.log('busiest', best.id, best.n, best.have.join(' '), JSON.stringify(best.f));
console.log(Object.entries(combos).sort((a,b)=>b[1]-a[1]).slice(0,10));
