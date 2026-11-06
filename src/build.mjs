// รวมแกนกลางเป็นสคริปต์เดียวใส่ในหน้าเว็บ (ไม่โหลดโค้ดจากที่อื่น เล่นออฟไลน์ได้)
import { readFileSync, writeFileSync } from 'fs';
const CORE = ['core/rules-user.js', 'core/rules.js', 'core/characters.js', 'core/rng.js', 'core/validate.js', 'core/team.js', 'core/battle.js', 'core/shop.js', 'core/bot.js', 'core/power.js', 'core/save.js', 'core/botdata.js', 'core/botteams.js', 'core/stage-user.js', 'core/stage.js', 'core/boss.js', 'core/runboss.js', 'core/runes.js', 'core/runrunes.js', 'core/runlog.js'];
const bundle = files => files.map(f => `// ---- ${f} ----\n` + readFileSync(f, 'utf8')
  .replace(/^import[^;]*;\s*$/gm, '').replace(/^export\s+(?=(const|function|let|class|async))/gm, '')).join('\n');
// <!--@include path--> in a template = paste that fragment file as it is (path relative to src/, one level, no nesting).
// The marker line's own newline is consumed, so fragments must end with their own newline. Function replacement: code may contain "$".
const expand = tpl => {
  const out = tpl.replace(/<!--@include ([\w./-]+)-->\n?/g, (_, p) => {
    if (p.includes('..') || p.startsWith('/')) throw new Error(`include path not allowed: ${p}`);
    return readFileSync(p, 'utf8');
  });
  if (out.includes('<!--@include')) throw new Error('include marker left after expanding (nested or malformed)');
  return out;
};
// Test files bundled into the system-check page: helpers first, then the topic files, then mechanics.js (it joins them into TESTS).
const TESTS = ['tests/helpers.js', 'tests/runlog-fixture.js', 'tests/t-combat.js', 'tests/t-skills.js', 'tests/t-skill-targets.js', 'tests/t-tribe.js', 'tests/t-shop.js', 'tests/t-bots.js', 'tests/t-save.js', 'tests/t-validate.js', 'tests/t-skill-calc.js', 'tests/t-boss.js', 'tests/t-runrun.js', 'tests/mechanics.js'];
const pages = [
  ['check.template.html', 'system-check.html', [...CORE, 'lab/matchcode.js', 'lab/matchcalc.js', 'lab/cfgcode.js', 'lab/runlogread.js', 'game/labels.js', ...TESTS]],
  ['lab/balance.template.html', 'balance.html', [...CORE, 'lab/analyze.js', 'lab/matchcode.js', 'lab/matchcalc.js', 'game/view.js', 'game/labels.js']],
  ['game/run.template.html', 'game.html', [...CORE, 'lab/matchcalc.js', 'game/view.js', 'game/labels.js']],
  ['lab/runlog.template.html', 'runlog.html', [...CORE, 'lab/runlogread.js']], // set 110: run-log viewer page (paste an ARUN1 code)
];
for (const [tpl, out, files] of pages) {
  const page = expand(readFileSync(tpl, 'utf8')).replace('/*__CORE__*/', () => bundle(files));
  // กันชื่อซ้ำระดับบนสุด (ทุกไฟล์รวมเป็นสคริปต์เดียว ชื่อซ้ำ = หน้าเว็บพังทั้งหน้า)
  const script = page.split('<script>')[1].split('</script>')[0];
  const seen = new Map();
  for (const m of script.matchAll(/^(?:async\s+)?(?:const|let|function|class)\s+([A-Za-z_$][\w$]*)/gm)) {
    if (seen.has(m[1])) throw new Error(`${out}: ชื่อซ้ำ "${m[1]}"`);
    seen.set(m[1], true);
  }
  writeFileSync(out, page);
  console.log(out, page.length);
}
