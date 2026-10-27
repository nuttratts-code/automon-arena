// ใช้หลัง node lab/formula.mjs: node tools/apply-tune.mjs ID,ID → นำ HP/พลังโจมตีจาก lab/formula-result.json เข้า core/characters.js เฉพาะ ID ที่ระบุ
import fs from 'fs';
const ids = process.argv[2].split(','), r = JSON.parse(fs.readFileSync('lab/formula-result.json', 'utf8'));
let s = fs.readFileSync('core/characters.js', 'utf8');
for (const id of ids) {
  const c = r.chars.find(x => x.id === id);
  const re = new RegExp(`(\\['${id}',(?:'[^']*',){4}\\d+,'[^']*',)\\[[^\\]]*\\],\\[[^\\]]*\\]`);
  if (!re.test(s)) throw new Error('not found ' + id);
  s = s.replace(re, `$1[${c.hp.join(',')}],[${c.atk.join(',')}]`);
}
fs.writeFileSync('core/characters.js', s);
console.log('applied', ids.join(' '));
