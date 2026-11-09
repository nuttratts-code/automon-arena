// Set 95 → set 107: run results with the game's real flow · node lab/runerun.mjs [runs=600] [--floor=N] [--dyn=…]
// set 108: bosses on fixed rounds (5 10 15 20 …, k by round, lost boss does not come back) · real bot teams (no scaling) up to round foeRealUntil
// set 107 (user 6 Nov): no modes · the enemy is picked by the player's power + win streak (core/botteams.js pickFoe, like the game)
// · both sides carry runes (player bot takes rune offers, bot teams have the runes their bot held) · the player bot = core/bot.js
// (merge-first, focus rotating over the 6 tribes) · harness plays extra matches after 10 wins (boss 3+ lives there).
// Prints normal-round win %, win % by win streak, boss win % per boss (k1 = 1st boss …), run cleared %.
// set 170 (user A1): the old --write boss tuning (mult10/endlessPct) is removed — boss values come from lab/bossrun.mjs --fit (report) + the user's picks.
import { buildCharacterList } from '../core/characters.js';
import { RULES } from '../core/rules.js';
import { BOT_TEAMS } from '../core/botdata.js';
import { validateBotTeams } from '../core/botteams.js';
import { dataHash } from '../core/save.js';
import { RUN_STAGE } from '../core/runboss.js';
import { makeCharMap } from '../core/team.js';
import { runPlayStats } from './analyze.js';
// set 138: the run loop lives in lab/analyze.js runPlayStats (also the Balance Room "รันจริง (บอท)" tab) → same numbers on both

const argv = process.argv.slice(2);
// set 127: --floor=N overrides the stage setting foeFloor for this measure (0 = no floor) → compare R1 on/off
const FL = argv.find(a => a.startsWith('--floor=')); if (FL) RUN_STAGE.settings.foeFloor = +FL.slice(8);
// set 129 measure (user B, 7 Nov): --dyn=STEP[,CAP[,START]] = floor starts START (default 0) · each win +STEP · each loss −STEP · clamp 0..CAP (default 100) → overrides foeFloor per match
const DY = argv.find(a => a.startsWith('--dyn=')); const DYN = DY ? DY.slice(6).split(',').map(Number) : null;
const args = argv.filter(a => !a.startsWith('--'));
const runs = +args[0] || 600;
const chars = buildCharacterList();
const bt = validateBotTeams(BOT_TEAMS, makeCharMap(chars), RULES, dataHash(chars, RULES));
if (!bt.ok) { console.log('bot teams not usable: run node lab/botgen.mjs first', bt.errors.slice(0, 2)); process.exit(1); }

const t0 = Date.now();
const S = await runPlayStats(chars, RULES, RUN_STAGE, { n: runs, dyn: DYN });
const f1 = x => (x == null ? '-' : x.toFixed(1));
console.log(`runs ${runs} · ${((Date.now() - t0) / 1000).toFixed(0)} s · run cleared ${f1(S.cleared)}% · enemy scale % p10/p50/p90 ${S.foePct ? `${S.foePct.p10}/${S.foePct.p50}/${S.foePct.p90}` : '-'}`);
console.log(`normal rounds won ${f1(S.normalWin)}% · by wins in a row: ` + S.byWs.map(x => `${x.ws}${x.ws === 5 ? '+' : ''}: ${f1(x.win)}% (${x.games})`).join(' · '));
for (const x of S.bossK) console.log(`boss k${x.k}: reached ${x.games} · won ${f1(x.win)}%`);
console.log(`set 119 normal run: second chance used ${f1(S.second)}% of runs · bosses in the normal run: ` + S.bossK.filter(x => x.mainWin != null).map(x => `k${x.k} reached ${f1(x.mainReach)}% of runs · won ${f1(x.mainWin)}%`).join(' · '));
console.log('set 133 first Lv3 on board (share of runs · median round · p25/p75): ' + S.lv3First.map(x => `${x.rarity} ${f1(x.share)}% · r${x.med} (${x.p25}/${x.p75})`).join(' · '));

// set 144: rune stats (what-if without each held battle rune, main run only)
if (S.runes) {
  const R = S.runes, f = x => (x == null ? '-' : x.toFixed(1));
  console.log(`runes (main-run matches ${R.matches}) · median uplift by rarity: ` + Object.entries(R.med).map(([k, v]) => `${k} ${f(v)}`).join(' · '));
  for (const x of R.rows) console.log(`${x.id.padEnd(4)} ${x.rarity.padEnd(6)} held ${f(x.held).padStart(5)}% · games ${String(x.games).padStart(5)} · win ${f(x.win).padStart(5)}%` +
    (x.runOnly ? ` · run-only: avg wins held ${f(x.wins)} vs not ${f(x.noWins)}` : ` · uplift ${f(x.uplift).padStart(5)} ±${f(x.se)} (n ${x.cfN}) · decided ${f(x.decided)}% · game ${f(x.game)}`) + (x.flags && x.flags.length ? '  [' + x.flags.join(' ') + ']' : '') + `  ${x.name}`);
}
