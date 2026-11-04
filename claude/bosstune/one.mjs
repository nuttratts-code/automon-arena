import { KITS, withRamp, withWeak } from './kits.mjs';
const R=S=>S; const P='/tmp/claude-0/-home-user-automon-arena/05412658-fc8e-557d-a7bb-3b827108c24a/scratchpad/sim';
const { RULES } = await import(P+'/core/rules.js'); const { buildCharacterList } = await import(P+'/core/characters.js');
const { buildTeam, makeCharMap } = await import(P+'/core/team.js'); const { simulate } = await import(P+'/core/battle.js');
const { bossUnit } = await import(P+'/core/boss.js'); const { clean, TEAMS } = await import('./ev.mjs');
const p=JSON.parse(process.argv[3]); const b=clean(withWeak(withRamp(KITS[process.argv[2]](p),p.E||0),p.wt,p.wp));
const tr=process.argv[4], k=+process.argv[5]||1; const cm=makeCharMap(buildCharacterList());
const A=TEAMS[tr].map(([id,lane,row])=>({id,lane,row,level:k})); const team=buildTeam(A,cm);
const r=simulate(team,[bossUnit(b,k)],{rules:RULES,seed:7919,detail:true});
const name=Object.fromEntries(r.events[0].units.map(u=>[u.uid,u.name||u.id]));
const boss=r.units.find(u=>u.side===1).uid; let dealt={};
for(const e of r.events){ if(e.k==='dmg'&&e.to===boss){dealt[name[e.from]??e.from]=(dealt[name[e.from]??e.from]||0)+e.amount;}
 if(['down','phase','barLost','bar'].includes(e.k)||(e.k==='dmg'&&e.from===boss&&e.amount>0&&false)) console.log((e.t/1000).toFixed(1),e.k,name[e.who]??name[e.to]??'',e.at??'',e.phase??'');}
console.log('dealt',dealt,'kinds',[...new Set(r.events.map(e=>e.k))].join(','));
