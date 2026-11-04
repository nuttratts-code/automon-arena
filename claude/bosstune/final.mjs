import fs from 'fs'; import { KITS, withRamp, withWeak } from './kits.mjs'; import { evalBoss, score, show, clean } from './ev.mjs';
const P={B1:{N:5,A:80,cd:6000,E:5,m2:1.3,m3:1.8,wt:'สายฟ้า',wp:300},B2:{N:5,A:90,cd:6000,E:10,m2:1.3,m3:1.8,wt:'เพลิงเผา',wp:300},
B3:{N:5,A:80,cd:5000,m2:1.3,m3:1.8,ls:10,fd:10,hc:60,wt:'ภูติ',wp:100},B4:{N:5,A:95,cd:5000,m2:1.5,m3:2.2,wt:'เหล็กกล้า',wp:100},
B5:{N:5,A:55,cd:5000,m2:1.3,m3:1.8,wt:'อสูร',wp:50},B6:{N:5,A:95,cd:4000,m2:1.5,m3:2.2,wt:'วายุ',wp:200}};
const out=[]; for(const id of Object.keys(P)){ const p={tr:30,...P[id]}; const raw=withWeak(withRamp(KITS[id](p),p.E||0),p.wt,p.wp);
 const {b,out:o}=evalBoss(raw,+(process.argv[3]||10)); const sc=score(b,o); console.log(id,b.name,'ok',sc.ok+'/12'); show(b,o); out.push(clean(raw)); }
fs.writeFileSync('bosses_final.json',JSON.stringify(out));
