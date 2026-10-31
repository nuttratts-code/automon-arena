// Node-only check (NOT bundled into system-check.html — uses fs / import.meta): every core/*.js file must be in CORE of build.mjs.
// Set 62 shipped a built page that threw "STAGE_USER is not defined" because stage-user.js was missing from CORE; unit tests ran on source and passed.
import { readFileSync, readdirSync } from 'fs';
export function checkBuildList() {
  const src = readFileSync(new URL('../build.mjs', import.meta.url), 'utf8');
  const listed = [...src.match(/const CORE = \[([^\]]*)\]/)[1].matchAll(/'(core\/[\w.-]+)'/g)].map(m => m[1]);
  const files = readdirSync(new URL('../core/', import.meta.url)).filter(f => f.endsWith('.js') && f !== 'index.js').map(f => 'core/' + f);
  const miss = files.filter(f => !listed.includes(f)).map(f => 'ไม่อยู่ใน CORE ของ build.mjs: ' + f);
  const ghost = listed.filter(f => !files.includes(f)).map(f => 'อยู่ใน CORE แต่ไม่มีไฟล์: ' + f);
  return [...miss, ...ghost];
}
