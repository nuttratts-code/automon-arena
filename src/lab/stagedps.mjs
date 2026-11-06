// Stage-mode baseline: each match = 1 stage. Player = bot (core/bot.js) through real shop, opponents = prepared bot teams.
// For the player team at each stage: damage dealt to a passive dummy in the first WIN ms (skills + tribes included).
// run: node lab/stagedps.mjs [runs=300] [seed=4242] (from src/)
const root = '..';
const { RULES } = await import(root + '/core/rules.js');
const { buildCharacterList } = await import(root + '/core/characters.js');
const { BOT_TEAMS } = await import(root + '/core/botdata.js');
const { pickBotTeam, simRun } = await import(root + '/core/botteams.js');
const { buildTeam, makeCharMap } = await import(root + '/core/team.js');
const { simulate } = await import(root + '/core/battle.js');
const N = +(process.argv[2] || 300), SEED = +(process.argv[3] || 4242), WIN = 30000;
const chars = buildCharacterList();
const dummy = { id: 'ZZ-0', name: 'dummy', tribe: 'เหล็กกล้า', extraTribes: [], rarity: 'ธรรมดา', price: 1, rowHint: 'หน้า', hp: [1e8,1e8,1e8], atk: [0,0,0], cdMs: [1e9,1e9,1e9], multi: [1,1,1], burn: [0,0,0], shock: [0,0,0], armorHit: [0,0,0], healHit: [0,0,0], skills: [] };
const cm = makeCharMap([...chars, dummy]);
const R2 = { ...RULES, stormStartMs: WIN + 1000 };
const by = {}; let err = 0;
for (let r = 0; r < N; r++) {
  simRun(chars, RULES, (SEED + Math.imul(r + 1, 0x9E3779B1)) >>> 0, p => pickBotTeam(BOT_TEAMS, p.round, p.seed).team, m => {
    if (!m.team.length) return;
    try {
      const A = buildTeam(m.team, cm, RULES);
      const res = simulate(A, buildTeam([{ id: 'ZZ-0', level: 1, row: 0, lane: 1 }], cm, RULES), { rules: R2 });
      const du = res.units.find(u => u.side === 1).uid;
      let d = 0; for (const e of res.events) if (e.k === 'dmg' && e.to === du && e.t <= WIN && e.why !== 'storm') d += e.amount;
      const hp = A.reduce((a, u) => a + (u.hp ?? u.maxHp ?? 0), 0);
      (by[m.round] ||= []).push({ d: d / (WIN / 1000), hp, n: m.team.length, lv: m.team.reduce((a, e) => a + e.level, 0) });
    } catch (e) { if (err++ < 3) console.error(e.message); }
  });
}
const q = (a, p) => a[Math.min(a.length - 1, Math.floor(p * a.length))];
console.log(`runs ${N} seed ${SEED} · dps = damage/sec vs dummy, first ${WIN/1000}s · errors ${err}`);
console.log('stage  n   dps p25 / median / p75   | teamHP median | units | sum lv');
for (const k of Object.keys(by).map(Number).sort((a, b) => a - b)) {
  const x = by[k]; if (x.length < 30) continue;
  const d = x.map(o => o.d).sort((a, b) => a - b), h = x.map(o => o.hp).sort((a, b) => a - b);
  const avg = f => (x.reduce((a, o) => a + f(o), 0) / x.length).toFixed(1);
  console.log(`${String(k).padStart(4)} ${String(x.length).padStart(5)}  ${q(d,.25).toFixed(0).padStart(6)} / ${q(d,.5).toFixed(0).padStart(6)} / ${q(d,.75).toFixed(0).padStart(6)}   | ${q(h,.5).toFixed(0).padStart(6)} | ${avg(o=>o.n)} | ${avg(o=>o.lv)}`);
}
