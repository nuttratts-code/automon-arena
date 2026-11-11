// Godot plan step 6a (set 195): golden (d) teams.jsonl = answers of core/team.js · power.js · validate.js for the Godot port.
// Lines (all inputs go through a JSON round trip first, numbers written with exactNums by the caller):
//   {kind:'basePower', rows:[[id, L, dps, ehp, points]…]}                     every character × level
//   {kind:'config', i, what, chars, rules?, res:{ok, errors, warnings}}       validateConfig on the real list + one broken copy per case
//   {kind:'team', i, caps?, entries, check:{ok, errors}, units|null, power, counts, steps}
// Random parts use the game's own rng (seeded) → byte-identical every run.
import { RULES, TRIBES } from '../core/rules.js';
import { makeRng } from '../core/rng.js';
import { makeCharMap, buildTeam, countTribes, tribeSteps } from '../core/team.js';
import { basePower, teamPower } from '../core/power.js';
import { validateConfig, validateTeam, TEAM_PERM_KEYS } from '../core/validate.js';
import { SLOT_ORDER } from '../core/shop.js';

const copy = v => JSON.parse(JSON.stringify(v));

// one broken copy per case: [label, (chars, rules) => void] · each touches one check in validateConfig/checkSkill
const sk = (cs, id, k = 0) => cs.find(c => c.id === id).skills[k];
const CONFIG_CASES = [
  ['ok', () => {}],
  ['empty', cs => { cs.length = 0; }],
  ['badId', cs => { cs[0].id = 'x1'; }],
  ['numId', cs => { cs[1].id = 12; }],
  ['dupId', cs => { cs[2].id = cs[3].id; }],
  ['noName', cs => { cs[4].name = '  '; }],
  ['longName', cs => { cs[5].name = 'ก'.repeat(31); }],
  ['tagName', cs => { cs[5].name = 'a<b'; }],
  ['rowHint', cs => { cs[6].rowHint = 'บน'; }],
  ['tribe', cs => { cs[7].tribe = 'น้ำ'; }],
  ['extraNotArr', cs => { cs[8].extraTribes = 'วายุ'; }],
  ['extraBad', cs => { cs[8].extraTribes = ['น้ำ']; }],
  ['extraSame', cs => { cs[8].extraTribes = [cs[8].tribe]; }],
  ['extraTwo', cs => { cs[9].extraTribes = TRIBES.filter(t => t !== cs[9].tribe).slice(0, 2); }],
  ['rarity', cs => { cs[10].rarity = 'เทพ'; }],
  ['price', cs => { cs[11].price = 99; }],
  ['hpLen', cs => { cs[12].hp = [1, 2]; }],
  ['hpNeg', cs => { cs[12].atk = [1, -2, 3]; }],
  ['hpZero', cs => { cs[13].hp = [0, 1, 2]; }],
  ['hpStr', cs => { cs[13].burn = ['1', 2, 3]; }],
  ['armorHit', cs => { cs[14].armorHit = [1]; }],
  ['healHitNull', cs => { cs[14].healHit = null; cs[15].armorHit = null; }],
  ['armor', cs => { cs[15].armor = [1, 2, 3]; }],
  ['cdZero', cs => { cs[16].cdMs = [0, 100, 100]; }],
  ['multi', cs => { cs[17].multi = [1, 1.5, 11]; }],
  ['skillsNotArr', cs => { cs[18].skills = {}; }],
  ['skills7', cs => { cs[18].skills = Array.from({ length: 7 }, () => copy(cs[0].skills[0] || { when: 'hit', do: 'atkUp', to: 'self', v: [1, 1, 1] })); }],
  ['skillNull', cs => { cs[19].skills = [null]; }],
  ['when', cs => { sk(cs, 'HL-2').when = 'sometimes-when-the-moon-is-full'; }],
  ['whenNum', cs => { sk(cs, 'HL-2').when = 5; }],
  ['do', cs => { sk(cs, 'HL-2').do = 'fly'; }],
  ['to', cs => { sk(cs, 'HL-2').to = 'moon'; }],
  ['v', cs => { sk(cs, 'HL-3').v = [1, 2]; }],
  ['tags', cs => { sk(cs, 'HL-3').tags = ['a', 'a']; }],
  ['tagsOk', cs => { sk(cs, 'HL-3').tags = ['abc', 'def']; }],
  ['cap', cs => { sk(cs, 'HL-3').cap = 3; }],
  ['chance', cs => { sk(cs, 'HL-3').chance = 0; sk(cs, 'HL-5').chance = 101; sk(cs, 'HL-6').chance = 50; }],
  ['ofBad', cs => { sk(cs, 'HL-7').of = { stat: 'luck', who: 'self' }; }],
  ['ofExtra', cs => { sk(cs, 'HL-7').of = { stat: 'armor', who: 'self', x: 1 }; }],
  ['ofCtx', cs => { const s = sk(cs, 'PL-4'); s.when = 'matchStart'; s.do = 'atkOf'; s.of = { stat: 'burn', who: 'ctx' }; }],
  ['ofOnPlain', cs => { sk(cs, 'HL-3').of = { stat: 'armor', who: 'self' }; }],
  ['atBad', cs => { sk(cs, 'PT-8', 1).at = { lane: 'both' }; }],
  ['atOnPlain', cs => { sk(cs, 'HL-3').at = { row: 'back', lane: 'both' }; }],
  ['sameTribe', cs => { sk(cs, 'HL-3').sameTribe = true; sk(cs, 'HL-2').sameTribe = false; }],
  ['skipSameId', cs => { sk(cs, 'HL-3').skipSameId = true; }],
  ['cdGrow', cs => { sk(cs, 'HL-3').cdGrow = 2; sk(cs, 'HL-5').cdGrow = 501; sk(cs, 'HL-5').cd = 1000; sk(cs, 'HL-6').cdGrow = 5; sk(cs, 'HL-6').cd = 1000; }],
  ['summonOnPlain', cs => { sk(cs, 'HL-3').summon = 'PL-7'; }],
  ['perm', cs => { sk(cs, 'HL-3').perm = 1; sk(cs, 'HL-4').perm = true; sk(cs, 'HL-5').perm = true; sk(cs, 'WN-2').perm = true; }],
  ['n', cs => { sk(cs, 'HL-3').n = 2; }],
  ['cd', cs => { sk(cs, 'HL-3').cd = 50; sk(cs, 'HL-5').cd = 1.5; sk(cs, 'HL-6').cd = 200000; sk(cs, 'HL-7').cd = 500; }],
  ['lv', cs => { sk(cs, 'HL-3').lv = []; sk(cs, 'HL-5').lv = [1, 1]; sk(cs, 'HL-6').lv = [4]; sk(cs, 'HL-7').lv = [2, 3]; }],
  ['healTribe', cs => { const s = sk(cs, 'HL-3'); s.do = 'heal'; }],
  ['summonMissing', cs => { sk(cs, 'PL-5').summon = 'ZZ-9'; }],
  ['summonSelf', cs => { sk(cs, 'PL-5').summon = 'PL-5'; }],
  ['summonChain', cs => { cs.find(c => c.id === 'PL-7').skills = [{ when: 'selfDown', do: 'summon', summon: 'PL-1', to: 'self', v: [1, 1, 1] }]; }],
  ['tribeMin', cs => { for (let i = cs.length - 1; i >= 0; i--) if (cs[i].tribe === 'อสูร') cs.splice(i, 1); }],
  ['rLevelOdds', (cs, r) => { r.shop.levelOdds = r.shop.levelOdds.slice(1); }],
  ['rLevelOddsBad', (cs, r) => { r.shop.levelOdds[0] = { ...r.shop.levelOdds[0], ธรรมดา: -1 }; r.shop.levelOdds[1] = Object.fromEntries(Object.keys(r.shop.levelOdds[1]).map(k => [k, 0])); }],
  ['rRoundLevels', (cs, r) => { r.shop.roundLevels = [1, 0, 2.5, 99]; }],
  ['rRoundLevelsEmpty', (cs, r) => { r.shop.roundLevels = []; }],
  ['rRuneOdds', (cs, r) => { r.runeOdds = [{ common: 1, rare: -1, legend: 0 }, { common: 0, rare: 0, legend: 0 }]; r.runeOddsRounds = 3; }],
  ['rRuneOddsEmpty', (cs, r) => { r.runeOdds = []; }],
];

function* configLines(chars) {
  let i = 0;
  for (const [what, f] of CONFIG_CASES) {
    const cs = copy(chars), r = copy(RULES);
    f(cs, r);
    const rulesChanged = JSON.stringify(r) !== JSON.stringify(RULES);
    yield { kind: 'config', i: i++, what, chars: cs, ...(rulesChanged ? { rules: r } : {}), res: validateConfig(cs, rulesChanged ? r : RULES) };
  }
}

// random teams: mostly legal (with perm stats), some broken on purpose (bad id/level/slot, unknown/odd perm, extra key, too many)
function* teamLines(n, seed, chars) {
  const rng = makeRng(seed), cm = makeCharMap(chars), keys = TEAM_PERM_KEYS;
  const odd = [() => 'ZZ-1', () => 0, () => null];
  for (let i = 0; i < n; i++) {
    const broken = rng.int(5) === 0, size = 1 + rng.int(broken ? 8 : 6), slots = SLOT_ORDER.slice();
    const entries = Array.from({ length: size }, () => {
      const [row, lane] = slots.length ? slots.splice(rng.int(slots.length), 1)[0] : [0, 0];
      const e = { id: rng.pick(chars).id, level: 1 + rng.int(3), row, lane };
      if (rng.int(2)) {
        const p = {};
        for (let k = rng.int(4); k-- > 0;) { const key = rng.pick(keys); p[key] = key === 'multi' ? rng.int(3) : rng.int(4) === 0 ? rng.int(200) / 4 : rng.int(60); }
        e.perm = p;
      }
      return e;
    });
    if (broken) {
      const e = entries[rng.int(entries.length)];
      switch (rng.int(9)) {
        case 0: e.id = rng.pick(odd)(); break;
        case 1: e.level = rng.pick([0, 4, 1.5]); break;
        case 2: e.row = rng.pick([-1, 3, 0.5]); break;
        case 3: e.lane = rng.pick([2, -1]); break;
        case 4: e.perm = { ...(e.perm || {}), luck: 5 }; break;
        case 5: e.perm = { hp: -3, multi: 1.5, atk: '7' }; break;
        case 6: e.junk = 1; break;
        case 7: e.perm = [1]; break;
        default: if (entries.length > 1) { entries[1].row = entries[0].row; entries[1].lane = entries[0].lane; } else e.perm = { cdStart: 200000 };
      }
    }
    const caps = rng.int(6) === 0 ? { cdPct: 40, armor: 20, burn: 10, shock: 8, multi: 1 } : null;
    const rules = caps ? { ...RULES, permCaps: caps } : RULES;
    const inp = copy(entries), check = validateTeam(inp, cm, rules);
    let units = null, power = 0;
    if (check.ok) { units = buildTeam(inp, cm, rules); power = teamPower(units, rules); }
    const counts = check.ok ? countTribes(inp, cm) : null;
    yield { kind: 'team', i, ...(caps ? { caps } : {}), entries, check, units, power, counts, steps: counts ? tribeSteps(counts, rules) : null };
  }
}

export function* teamGolden(cfg, chars) {
  const rows = [];
  for (const c of chars) for (let L = 0; L < 3; L++) { const b = basePower(c, L); rows.push([c.id, L, b.dps, b.ehp, b.points]); }
  yield { kind: 'basePower', rows };
  yield* configLines(chars);
  yield* teamLines(cfg.teams, cfg.seed + 6, chars);
}
