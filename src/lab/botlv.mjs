// Set 107: how fast the shop bot levels its units (Lv2 / Lv3 per round) · node lab/botlv.mjs [runs]
import { RULES } from '../core/rules.js';
import { buildCharacterList } from '../core/characters.js';
import { simRun, tribeList } from '../core/botteams.js';
const chars = buildCharacterList(), tribes = tribeList(chars), runs = +(process.argv[2] || 120);
const R = Array.from({ length: 20 }, () => ({ n: 0, u: 0, l2: 0, l3: 0, gold: 0 }));
let won = 0, rn = 0;
for (let r = 0; r < runs; r++) {
  const P = simRun(chars, RULES, (77 + Math.imul(r + 1, 0x9E3779B1)) >>> 0, null, m => {
    const x = R[Math.min(19, m.round)]; x.n++; x.u += m.team.length; x.gold += m.gold;
    for (const e of m.team) { if (e.level === 2) x.l2++; if (e.level >= 3) x.l3++; }
  }, undefined, { focus: tribes[r % 6], foeFocus: tribes[(r + 3) % 6], runes: true, extra: 19 });
  won += P.wins; rn += Object.values(P.rn.bag).reduce((a, b) => a + b, 0);
}
for (const k of [1, 3, 5, 8, 10, 12, 15, 19]) { const x = R[k]; if (x.n) console.log(`round ${k}: units ${(x.u / x.n).toFixed(1)} · Lv2 ${(x.l2 / x.n).toFixed(2)} · Lv3 ${(x.l3 / x.n).toFixed(2)} per team · gold left at fight ${(x.gold / x.n).toFixed(1)}`); }
console.log(`runes held at end avg ${(rn / runs).toFixed(1)}`);
