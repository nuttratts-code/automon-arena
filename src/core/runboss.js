// Bosses inside the run (set 85 → set 108): fixed boss rounds replace the bot team (stage settings, Balance Room ด่าน tab)
// · lose to it = lose a heart like a normal match · boss k = its number by round (strength grows with bossAt)
// · which boss = random draw per boss match (set 100: same one may repeat)
// Pure data, no randomness outside the run seed.
import { makeRng } from './rng.js';
import { stageDefaults, bossAt, bossRoundK } from './stage.js';
import { bossUnit } from './boss.js';

export const RUN_STAGE = stageDefaults();

// set 108 (user 6 Nov): bosses on fixed rounds (stage.js bossRoundK: 5 10 15 20 30 40 …) whatever the result · k = boss number by round
// (a lost boss does not come back; the next boss round brings boss k + 1) · the last round (lastStage) = the training dummy
// run state (round = the match round, seed) → { boss, k } or null
export function runBossAt(st, stage = RUN_STAGE) {
  const S = stage.settings, round = st.round | 0;
  if (round >= 1 && round === (S.lastStage | 0)) return { boss: DUMMY_BOSS, k: 1 };
  const k = bossRoundK(round, S);
  if (!k) return null;
  const list = stage.bosses.filter(b => b.on);
  if (!list.length) return null;
  // set 100 (user 6 Nov): every boss match draws any enabled boss (the same one may come again) · seed + round → same pick on reload
  const rng = makeRng(((st.seed >>> 0) ^ 0x5B0551E5 ^ Math.imul(round + 1, 0x2C1B3C6D)) >>> 0);
  return { boss: list[rng.int(list.length)], k };
}
// set 108 (user): last-round boss = an HP bar that never runs out · no attack, no rules, no skills · the fight stops after dummySec
// (player side wins) → total damage dealt is the run's score (leaderboard later, MVP2)
export const DUMMY_ID = 'DUMMY';
export const DUMMY_BOSS = Object.freeze({ id: DUMMY_ID, name: 'หุ่นเป้า', tribe: 'เหล็กกล้า', hp: 1e9, atk: 0, cdMs: 60000, multi: 1, bars: 1, spot: 'all', moveSec: 8,
  armor: 0, burn: 0, shock: 0, armorHit: 0, healHit: 0, phases: [{ at: 0, rules: [], fx: [], spot: '', stats: {} }], mult10: 1, endlessPct: 0, on: true, dummy: true });
export const isDummy = b => !!b && b.id === DUMMY_ID;
// simulate() options for a boss fight: the dummy stops at dummySec (player wins)
export const runBossOpts = (b, stage = RUN_STAGE) => (isDummy(b) ? { stopMs: Math.max(1, stage.settings.dummySec | 0) * 1000 } : {});
// damage the player side put into the dummy (result of simulate) → whole number
export const dummyScore = res => Math.round((res && res.units || []).filter(u => u.side === 0).reduce((n, u) => n + (u.dealt || 0), 0));
// replay / play record form → boss record (null = unknown id, e.g. the boss was removed after the match)
export const runBossById = (id, stage = RUN_STAGE) => (id === DUMMY_ID ? DUMMY_BOSS : stage.bosses.find(b => b.id === id) || null);
// set 119 (user): bossExtraPct (3rd+ boss, % each) only for a boss met in extra matches (extra = true) · normal run = growth by k only
export const bossExtraOf = (extra, stage = RUN_STAGE) => (extra ? stage.settings.bossExtraPct | 0 : 0);
export const runBossTeam = (b, k, stage = RUN_STAGE, extra = false) => [bossUnit(b, k, bossExtraOf(extra, stage))];
// boss as a character card for the battle view / unit panels (same shape as the Balance Room's simBossChar)
export function runBossChar(b, k, stage = RUN_STAGE, extra = false) {
  const at = bossAt(b, k, bossExtraOf(extra, stage)), b3 = v => [v, v, v];
  return { id: b.id, name: `${b.name} (บอส)`, tribe: b.tribe, extraTribes: [], rarity: 'ตำนาน', price: 0, rowHint: 'หน้า',
    hp: b3(at.hp), atk: b3(at.atk), cdMs: b3(b.cdMs), multi: b3(b.multi), burn: b3(b.burn || 0), shock: b3(b.shock || 0), armorHit: b3(0), healHit: b3(0), skills: [] };
}
