// Bosses inside the run (set 85 · set 99 user 6 Nov 2026): after every `bossEvery` normal-match WINS (4) the next match is a boss
// instead of a bot team (stage settings, Balance Room ด่าน tab) · lose to it = lose a heart like a normal match, the counter restarts and
// a boss comes back after bossEvery more wins · up to `bossesPerRun` bosses beaten (extra matches too)
// boss k = bosses beaten + 1 (strength grows with bossAt) · which boss = random draw per boss match (set 100: same one may repeat)
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
  // set 100 (user 6 Nov): every boss match draws any enabled boss (the same one may come again, even after losing to it) · seed + round → same pick on reload
  const rng = makeRng(((seed >>> 0) ^ 0x5B0551E5 ^ Math.imul((st.round | 0) + 1, 0x2C1B3C6D)) >>> 0);
  return { boss: list[rng.int(list.length)], k };
}
// replay / play record form → boss record (null = unknown id, e.g. the boss was removed after the match)
export const runBossById = (id, stage = RUN_STAGE) => stage.bosses.find(b => b.id === id) || null;
export const runBossTeam = (b, k, stage = RUN_STAGE) => [bossUnit(b, k, stage.settings.bossExtraPct | 0)]; // set 107: 3rd+ boss +bossExtraPct % each
// boss as a character card for the battle view / unit panels (same shape as the Balance Room's simBossChar)
export function runBossChar(b, k, stage = RUN_STAGE) {
  const at = bossAt(b, k, stage.settings.bossExtraPct | 0), b3 = v => [v, v, v];
  return { id: b.id, name: `${b.name} (บอส)`, tribe: b.tribe, extraTribes: [], rarity: 'ตำนาน', price: 0, rowHint: 'หน้า',
    hp: b3(at.hp), atk: b3(at.atk), cdMs: b3(b.cdMs), multi: b3(b.multi), burn: b3(b.burn || 0), shock: b3(b.shock || 0), armorHit: b3(0), healHit: b3(0), skills: [] };
}
