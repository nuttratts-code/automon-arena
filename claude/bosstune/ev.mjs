// evaluate a boss record: returns per k per tribe stats
const R='/tmp/claude-0/-home-user-automon-arena/05412658-fc8e-557d-a7bb-3b827108c24a/scratchpad/sim';
import fs from 'fs';
const { RULES } = await import(R+'/core/rules.js');
const { buildCharacterList } = await import(R+'/core/characters.js');
const { buildTeam, makeCharMap } = await import(R+'/core/team.js');
const { simulate } = await import(R+'/core/battle.js');
const { bossUnit } = await import(R+'/core/boss.js');
const { cleanStage } = await import(R+'/core/stage.js');
export const TEAMS=JSON.parse(fs.readFileSync(R+'/../teams.json','utf8'));
export const TR=Object.keys(TEAMS);
const cm=makeCharMap(buildCharacterList());
export const clean=b=>cleanStage({bosses:[b]}).bosses[0];
export function evalBoss(raw,NS=4,ks=[1,2]){
  const b=clean(raw); const out={};
  for(const k of ks){ out[k]={};
    for(const tr of TR){ let w=0,bl=0,t=0;
      for(let s=1;s<=NS;s++){
        const A=TEAMS[tr].map(([id,lane,row])=>({id,lane,row,level:k}));
        const bu=bossUnit(b,k); const r=simulate(buildTeam(A,cm),[bu],{rules:RULES,seed:s*7919});
        const bo=r.units.find(u=>u.side===1); if(r.winner===1)w++; bl+=bo.hp/bu.barHp; t+=r.timeMs; }
      out[k][tr]={w:w/NS,bl:bl/NS,t:t/NS/1000}; } }
  return {b,out};
}
// own tribe: win & bars>=2 · others: win & 0<bars<=1
export function score(b,out){ let s=0,ok=0,n=0;
  for(const k in out) for(const tr in out[k]){ const x=out[k][tr]; n++;
    const own=tr===b.tribe; let pen;
    if(own) pen=(1-x.w)*20+Math.max(0,2-x.bl)+Math.max(0,x.bl-3.5)*0.5;
    else pen=(1-x.w)*20+Math.max(0,x.bl-1)+(x.bl<0.15?0.3:0);
    if(pen<0.05)ok++; s+=pen; }
  return {pen:s,ok,n}; }
export function show(b,out){ for(const k in out){ console.log(` ด่าน${k==1?5:10} Lv${k}: `+TR.map(tr=>{const x=out[k][tr];return `${tr}${tr===b.tribe?'*':''} ${Math.round(x.w*100)}%/${x.bl.toFixed(1)}/${x.t.toFixed(0)}s`;}).join(' | ')); } }
