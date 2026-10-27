// รวมแกนกลางเป็นสคริปต์เดียวใส่ในหน้าเว็บ (ไม่โหลดโค้ดจากที่อื่น เล่นออฟไลน์ได้)
import { readFileSync, writeFileSync } from 'fs';
const CORE = ['core/rules.js', 'core/characters.js', 'core/rng.js', 'core/validate.js', 'core/team.js', 'core/battle.js', 'core/shop.js', 'core/bot.js', 'core/power.js', 'core/save.js', 'core/botdata.js', 'core/botteams.js'];
const bundle = files => files.map(f => `// ---- ${f} ----\n` + readFileSync(f, 'utf8')
  .replace(/^import[^;]*;\s*$/gm, '').replace(/^export\s+(?=(const|function|let|class|async))/gm, '')).join('\n');
const pages = [
  ['check.template.html', 'system-check.html', [...CORE, 'tests/mechanics.js']],
  ['lab/balance.template.html', 'balance.html', [...CORE, 'lab/analyze.js', 'game/view.js', 'game/labels.js']],
  ['game/run.template.html', 'game.html', [...CORE, 'game/view.js', 'game/labels.js']],
];
for (const [tpl, out, files] of pages) {
  const page = readFileSync(tpl, 'utf8').replace('/*__CORE__*/', () => bundle(files));
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
