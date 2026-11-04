import fs from 'fs';
const R='/tmp/claude-0/-home-user-automon-arena/05412658-fc8e-557d-a7bb-3b827108c24a/scratchpad/sim';
const { RULES } = await import(R+'/core/rules.js');
const { buildCharacterList } = await import(R+'/core/characters.js');
const { buildTeam, makeCharMap } = await import(R+'/core/team.js');
const { simulate } = await import(R+'/core/battle.js');
const { bossUnit } = await import(R+'/core/boss.js');
const { cleanStage } = await import(R+'/core/stage.js');
const teams=JSON.parse(fs.readFileSync(R+'/../teams.json','utf8'));
const cm=makeCharMap(buildCharacterList());
const atk=+process.argv[2]||60;
const b=cleanStage({bosses:[{id:'B9',name:'t',tribe:process.argv[3]||'วายุ',hp:100000,bars:5,atk,cdMs:5000,multi:1,spot:'all',moveSec:8,armor:0,burn:0,shock:0,armorHit:0,healHit:0,mult10:2,endlessPct:15,on:true,phases:[{at:0,rules:[],fx:[],spot:'',stats:{}}]}]}).bosses[0];
const RR={...RULES,stormStartMs:1e9};
for(const k of [1,2]) for(const tr of Object.keys(teams)){
  const A=teams[tr].map(([id,lane,row])=>({id,lane,row,level:k}));
  const r=simulate(buildTeam(A,cm),[bossUnit(b,k)],{rules:RR,seed:7});
  const bo=r.units.find(u=>u.side===1);
  const d30=r.events.filter(e=>e.k==='dmg'&&e.to===bo.uid&&e.t<=30000).reduce((a,e)=>a+e.amount,0);
  console.log(`k${k} ${tr.padEnd(9)} alive ${(r.timeMs/1000).toFixed(0)}s  dmg30s ${d30}  totalDmg ${100000*(k)-bo.hp|0}`);
}
