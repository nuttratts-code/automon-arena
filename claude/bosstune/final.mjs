import fs from 'fs'; import { KITS, withRamp, withWeak } from './kits.mjs'; import { evalBoss, score, show, clean } from './ev.mjs';
const P={B1:{N:5,A:80,cd:6000,m2:1.4,m3:2,wt:'วายุ',wp:50},B2:{N:5,A:65,cd:4000,E:5,m2:1.4,m3:2,wt:'วายุ',wp:100},
B3:{N:5,A:+(process.argv[2]||50),cd:3000,m2:1.3,m3:1.8,ls:10,fd:10,hc:60,wt:'',wp:0},B4:{N:5,A:70,cd:4000,m2:1.6,m3:2.4,wt:'วายุ',wp:150},
B5:{N:5,A:50,cd:5000,m2:1.4,m3:2,wt:'สายฟ้า',wp:300},B6:{N:5,A:65,cd:3000,m2:1.4,m3:2,wt:'สายฟ้า',wp:150}};
const out=[]; for(const id of Object.keys(P)){ const p={tr:30,...P[id]}; const raw=withWeak(withRamp(KITS[id](p),p.E||0),p.wt,p.wp);
 const {b,out:o}=evalBoss(raw,+(process.argv[3]||10)); const sc=score(b,o); console.log(id,b.name,'ok',sc.ok+'/12'); show(b,o); out.push(clean(raw)); }
fs.writeFileSync('bosses_final.json',JSON.stringify(out));
