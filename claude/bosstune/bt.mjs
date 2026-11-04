// usage: node bt.mjs bosses.json [ids] [seeds]
import fs from 'fs';
const R='/tmp/claude-0/-home-user-automon-arena/05412658-fc8e-557d-a7bb-3b827108c24a/scratchpad/sim';
const { RULES } = await import(R+'/core/rules.js');
const { buildCharacterList } = await import(R+'/core/characters.js');
const { buildTeam, makeCharMap } = await import(R+'/core/team.js');
const { simulate } = await import(R+'/core/battle.js');
const { bossUnit } = await import(R+'/core/boss.js');
const { cleanStage } = await import(R+'/core/stage.js');
const raw=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const want=(process.argv[3]||'').split(',').filter(Boolean); const NS=+(process.argv[4]||20);
const bosses=cleanStage({bosses:raw}).bosses.filter(b=>!want.length||want.includes(b.id));
const teams=JSON.parse(fs.readFileSync(R+'/../teams.json','utf8'));
const cm=makeCharMap(buildCharacterList());
const TR=['ภูติ','วายุ','เพลิงเผา','เหล็กกล้า','สายฟ้า','อสูร'];
for(const b of bosses){
  console.log(`== ${b.id} ${b.name} (${b.tribe}) hp${b.hp} bars${b.bars} phases at ${b.phases.map(p=>p.at).join('/')}`);
  for(const k of [1,2]){ const lv=k; const line=[];
    for(const tr of TR){
      let bw=0,bars=0,t=0,ph3=0,minB=99,maxB=0;
      for(let s=1;s<=NS;s++){
        const A=teams[tr].map(([id,lane,row])=>({id,lane,row,level:lv}));
        const bu=bossUnit(b,k);
        const r=simulate(buildTeam(A,cm),[bu],{rules:RULES,seed:s*7919});
        const bo=r.units.find(u=>u.side===1); const bl=bo.hp/bu.barHp;
        if(r.winner===1)bw++; bars+=bl; t+=r.timeMs; minB=Math.min(minB,bl); maxB=Math.max(maxB,bl);
        const last=b.phases[b.phases.length-1].at; if(b.bars-Math.ceil(bl-1e-9)>=last)ph3++;
      }
      line.push(`${tr.padEnd(8)} บอสชนะ${String(Math.round(100*bw/NS)).padStart(3)}% หลอดเหลือ ${(bars/NS).toFixed(1)} (${minB.toFixed(1)}-${maxB.toFixed(1)}) ถึงเฟสสุดท้าย${Math.round(100*ph3/NS)}% ${(t/NS/1000).toFixed(0)}วิ`);
    }
    console.log(` ด่าน${k===1?5:10} Lv${lv}:\n  `+line.join('\n  '));
  }
}
