// Bosses inside the normal run (set 85 · user picked option ก, 4 Nov 2026): every `bossEvery` rounds the opponent is a boss
// instead of a bot team, up to `bossesPerRun` bosses (stage settings, Balance Room ด่าน tab · ค่าเสนอ 5 / 2).
// ด่าน = round (match number) · boss k = 1st, 2nd… appearance (grows with bossAt) · which boss = shuffle of the enabled
// bosses by the run seed (same run → same bosses, also after loading a save) · win/lose = same as a normal match.
// Pure data, no randomness outside the run seed.
import { makeRng } from './rng.js';
import { stageDefaults, bossAt } from './stage.js';
import { bossUnit } from './boss.js';

export const RUN_STAGE = stageDefaults();

// round → { boss, k } or null
export function runBossAt(round, seed, stage = RUN_STAGE) {
  const S = stage.settings, every = Math.max(1, S.bossEvery | 0), max = Math.max(0, S.bossesPerRun | 0);
  const r = round | 0;
  if (r < every || r % every) return null;
  const k = r / every;
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
