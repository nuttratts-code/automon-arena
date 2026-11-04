import { KITS, withRamp, withWeak } from './kits.mjs'; import { evalBoss, score, show } from './ev.mjs';
const id=process.argv[2]; const kit=KITS[id]; const g=JSON.parse(process.argv[3]||'{}');
const combos=[{}]; for(const [k,vals] of Object.entries(g.grid)){ const nx=[]; for(const c of combos) for(const v of vals) nx.push({...c,[k]:v}); combos.splice(0,combos.length,...nx); }
const best=[];
for(const c of combos){ const p={m2:1.3,m3:1.8,tr:30,...g.fix,...c}; if(p.m){p.m2=p.m[0];p.m3=p.m[1];}
  const {b,out}=evalBoss(withWeak(withRamp(kit(p),p.E||0),p.wt,p.wp),g.ns||2); best.push({p,sc:score(b,out),b,out}); }
best.sort((a,b)=>a.sc.pen-b.sc.pen);
for(const x of best.slice(0,g.top||2)){ console.log(id,JSON.stringify(x.p),'pen',x.sc.pen.toFixed(2),'ok',x.sc.ok+'/'+x.sc.n); show(x.b,x.out); }
