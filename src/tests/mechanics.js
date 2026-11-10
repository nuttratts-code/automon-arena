// ชุดทดสอบกลไก: ตรวจว่าตัวคำนวณทำตาม combat-rules ทุกข้อ · รันได้ทั้งใน node และในหน้าเว็บ
// ชุด D: เทสต์แยกเป็นไฟล์ตามหัวข้อ tests/t-*.js · ตัวช่วยร่วม tests/helpers.js · ไฟล์นี้รวมรายการ + runTests + matchStats
import { simulate } from '../core/battle.js';
import { buildCharacterList } from '../core/characters.js';
import { makeRng } from '../core/rng.js';
import { RULES } from '../core/rules.js';
import { buildTeam, makeCharMap } from '../core/team.js';
import { randomTeam } from './helpers.js';
import { TESTS_COMBAT } from './t-combat.js';
import { TESTS_SKILLS } from './t-skills.js';
import { TESTS_SKILL_TARGETS } from './t-skill-targets.js';
import { TESTS_TRIBE } from './t-tribe.js';
import { TESTS_SHOP } from './t-shop.js';
import { TESTS_BOTS } from './t-bots.js';
import { TESTS_SAVE } from './t-save.js';
import { TESTS_HUMANSTATS } from './t-humanstats.js';
import { TESTS_VALIDATE } from './t-validate.js';
import { TESTS_SKILL_CALC } from './t-skill-calc.js';
import { TESTS_BOSS } from './t-boss.js';
import { TESTS_BOSS_V2 } from './t-boss2.js';
import { TESTS_RUNRUN } from './t-runrun.js';

export const TESTS = [
  ...TESTS_COMBAT,
  ...TESTS_SKILLS,
  ...TESTS_SKILL_TARGETS,
  ...TESTS_TRIBE,
  ...TESTS_SHOP,
  ...TESTS_BOTS,
  ...TESTS_SAVE,
  ...TESTS_HUMANSTATS,
  ...TESTS_VALIDATE,
  ...TESTS_BOSS,
  ...TESTS_BOSS_V2,
  ...TESTS_RUNRUN,
  ...TESTS_SKILL_CALC,
];

export function runTests() {
  return TESTS.map(([name, fn]) => {
    try { fn(); return { name, ok: true }; }
    catch (e) { return { name, ok: false, msg: e.message }; }
  });
}

// สถิติแมตช์สุ่ม: ใช้เทียบเป้าหมายใน combat-rules (ความยาวแมตช์, แมตช์ที่ถึง 180 วิ)
export function matchStats(n = 1000, seed = 1, level = 1) {
  const chars = buildCharacterList(), m = makeCharMap(chars), rng = makeRng(seed);
  const times = []; let storm = 0, draws = 0;
  for (let i = 0; i < n; i++) {
    const r = simulate(buildTeam(randomTeam(rng, chars, 6, level), m), buildTeam(randomTeam(rng, chars, 6, level), m), { log: false });
    times.push(r.timeMs / 1000);
    if (r.timeMs > RULES.stormStartMs) storm++;
    if (r.winner == null) draws++;
  }
  times.sort((a, b) => a - b);
  return { n, level, median: times[Math.floor(n / 2)], p10: times[Math.floor(n * 0.1)], p90: times[Math.floor(n * 0.9)], stormPct: storm / n * 100, drawPct: draws / n * 100 };
}


