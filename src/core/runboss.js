// Bosses inside the run (set 85 · set 99 user 6 Nov 2026): after every `bossEvery` normal-match WINS (4) the next match is a boss
// instead of a bot team (stage settings, Balance Room ด่าน tab) · lose to it = lose a heart like a normal match, the counter restarts and
// the same boss comes back after bossEvery more wins · win = next boss · up to `bossesPerRun` bosses beaten (extra matches too)
// boss k = 1st, 2nd… boss (grows with bossAt) · which boss = shuffle of the enabled bosses by the run seed (same run → same bosses)
// Pure data, no randomness outside the run seed.
import { makeRng } from './rng.js';
import { stageDefaults, bossAt } from './stage.js';
import { bossUnit } from './boss.js';

export const RUN_STAGE = stageDefaults();

// run state (bw = normal wins since the last boss fight, bk = bosses beaten, seed) → { boss, k } or null
export function runBossAt(st, stage = RUN_STAGE) {
  const S = stage.settings, every = Math.max(1, S.bossEvery | 0), max = Math.max(0, S.bossesPerRun | 0);
  if ((st.bw | 0) < every) return null;
  const k = (st.bk | 0) + 1, seed = st.seed;
  if (k > max) return null;
  const list = stage.bosses.filter(b => b.on);
  if (!list.length) return null;
  const rng = makeRng(((seed >>> 0) ^ 0x5B0551E5) >>> 0), a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = rng.int(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return { boss: a[(k - 1) % a.length], k };
}
// replay / play record form → boss record (null = unknown id, e.g. the boss was removed after the match)
export const runBossById = (id, stage = RUN_STAGE) => stage.bosses.find(b => b.id === id) || null;
export const runBossTeam = (b, k) => [bossUnit(b, k)];
// boss as a character card for the battle view / unit panels (same shape as the Balance Room's simBossChar)
export function runBossChar(b, k) {
  const at = bossAt(b, k), b3 = v => [v, v, v];
  return { id: b.id, name: `${b.name} (บอส)`, tribe: b.tribe, extraTribes: [], rarity: 'ตำนาน', price: 0, rowHint: 'หน้า',
    hp: b3(at.hp), atk: b3(at.atk), cdMs: b3(b.cdMs), multi: b3(b.multi), burn: b3(b.burn || 0), shock: b3(b.shock || 0), armorHit: b3(0), healHit: b3(0), skills: [] };
}
