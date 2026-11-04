const root='/home/user/automon-arena/src';
const { RULES } = await import(root+'/core/rules.js');
const { buildCharacterList } = await import(root+'/core/characters.js');
const { BOT_TEAMS } = await import(root+'/core/botdata.js');
const { pickBotTeam, simRun } = await import(root+'/core/botteams.js');
const chars=buildCharacterList(); const N=1000;
const by={};
for(let r=0;r<N;r++) simRun(chars,RULES,(4242+Math.imul(r+1,0x9E3779B1))>>>0,p=>pickBotTeam(BOT_TEAMS,p.wins,p.seed,p.round).team,m=>{
  const k=m.round; if(![4,5,6,9,10,11].includes(k))return; const o=(by[k]||={n:0,size:0,lv:[0,0,0,0],avg:0,all2:0,all3:0});
  o.n++; o.size+=m.team.length; for(const u of m.team){o.lv[u.level]++;} o.avg+=m.team.reduce((a,u)=>a+u.level,0)/Math.max(1,m.team.length);
  if(m.team.length && m.team.every(u=>u.level>=2))o.all2++; if(m.team.length&&m.team.every(u=>u.level>=3))o.all3++;
});
for(const k of Object.keys(by)){const o=by[k];const t=o.lv[1]+o.lv[2]+o.lv[3];console.log(`round ${k}: n${o.n} size ${(o.size/o.n).toFixed(1)} avgLv ${(o.avg/o.n).toFixed(2)} Lv1/2/3 % ${[1,2,3].map(i=>(100*o.lv[i]/t).toFixed(0)).join('/')} allLv2+ ${(100*o.all2/o.n).toFixed(0)}% allLv3 ${(100*o.all3/o.n).toFixed(0)}%`);}
