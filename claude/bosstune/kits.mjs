// boss kits: p = { N bars, A base atk, cd, m2, m3 phase atk mult }
const r=(id,v=0,o={})=>({id,v,...o}); const fx=(id,v=0)=>({id,v});
const ph=(at,rules,f=[],stats={},spot='')=>({at,rules,fx:f,stats,spot});
const base=(id,name,tribe,p,extra)=>({id,name,tribe,hp:200*p.N,bars:p.N,atk:p.A,cdMs:p.cd,multi:1,spot:'all',moveSec:8,armor:0,burn:0,shock:0,armorHit:0,healHit:0,mult10:2,endlessPct:15,on:true,...extra});
const half=p=>Math.floor(p.N/2), last=p=>p.N-1, at=(p,m)=>Math.round(p.A*m);
export const KITS={
 B1:p=>base('B1','โกเลม','เหล็กกล้า',p,{spot:'midBack',endlessPct:30,armorHit:p.ah??10,phases:[
   ph(0,[r('reflect',15),r('armorCut',50),r('tribeResist',p.tr??30,{tribe:'เหล็กกล้า'})]),
   ph(half(p),[r('reflect',25),r('armorCut',70),r('tribeResist',p.tr??30,{tribe:'เหล็กกล้า'})],[fx('armorBar',50)],{atk:at(p,p.m2)}),
   ph(last(p),[r('reflect',35),r('noArmor'),r('armorCut',90),r('tribeResist',p.tr??30,{tribe:'เหล็กกล้า'})],[fx('armorBar',100)],{atk:at(p,p.m3)})]}),
 B2:p=>base('B2','จอมเวทย์ดำ','ภูติ',p,{spot:'move',moveSec:10,healHit:p.hh??10,phases:[
   ph(0,[r('healCut',50),r('cdSlow',20),r('tribeResist',p.tr??30,{tribe:'ภูติ'})]),
   ph(half(p),[r('healCut',70),r('cdSlow',30),r('randomSilence',8,{v2:4}),r('tribeResist',p.tr??30,{tribe:'ภูติ'})],[],{atk:at(p,p.m2)}),
   ph(last(p),[r('healCut',90),r('cdSlow',50),r('hunter'),r('randomSilence',6,{v2:4}),r('tribeResist',p.tr??30,{tribe:'ภูติ'})],[fx('stunAll',3)],{atk:at(p,p.m3)})]}),
 B3:p=>base('B3','อสุรกายคลั่ง','อสูร',p,{spot:'back',phases:[
   ph(0,[r('lifesteal',p.ls??20),r('downAtk',15),r('healCut',p.hc??60),r('noRevive'),r('tribeResist',p.tr??30,{tribe:'อสูร'})]),
   ph(half(p),[r('lifesteal',(p.ls??20)+10),r('downAtk',15),r('feedOnDown',p.fd??10),r('healCut',p.hc??60),r('noRevive'),r('tribeResist',p.tr??30,{tribe:'อสูร'})],[],{atk:at(p,p.m2)},'mid'),
   ph(last(p),[r('lifesteal',(p.ls??20)+20),r('downAtk',20),r('healCut',Math.min(100,(p.hc??60)+20)),r('noRevive'),r('tribeResist',p.tr??30,{tribe:'อสูร'})],[fx('untargetable',3)],{atk:at(p,p.m3)},'front')]}),
 B4:p=>base('B4','กระจกสะท้อน','สายฟ้า',p,{spot:'front',phases:[
   ph(0,[r('shockImmune',50),r('shockAura',2),r('tribeResist',p.tr??30,{tribe:'สายฟ้า'})]),
   ph(half(p),[r('shockImmune',60),r('shockAura',3),r('stunPulse',10,{v2:2}),r('tribeResist',p.tr??30,{tribe:'สายฟ้า'})],[],{atk:at(p,p.m2)}),
   ph(last(p),[r('shockImmune',80),r('shockAura',5),r('stunPulse',6,{v2:2}),r('fastAtk',30),r('tribeResist',p.tr??30,{tribe:'สายฟ้า'})],[fx('stunAll',2)],{atk:at(p,p.m3)})]}),
 B5:p=>base('B5','จ้าวพายุ','วายุ',p,{multi:2,phases:[
   ph(0,[r('cdPulse',12,{v2:1}),r('tribeResist',p.tr??30,{tribe:'วายุ'})]),
   ph(half(p),[r('cdPulse',10,{v2:1}),r('vanish',12,{v2:2}),r('fastAtk',20),r('tribeResist',p.tr??30,{tribe:'วายุ'})],[],{atk:at(p,p.m2)}),
   ph(last(p),[r('cdPulse',8,{v2:2}),r('vanish',10,{v2:2}),r('fastAtk',30),r('multiUp',1),r('tribeResist',p.tr??30,{tribe:'วายุ'})],[fx('untargetable',2)],{atk:at(p,p.m3)})]}),
 B6:p=>base('B6','ปีศาจเพลิง','เพลิงเผา',p,{burn:p.bn??2,phases:[
   ph(0,[r('burnImmune',50),r('burnAura',2),r('tribeResist',p.tr??30,{tribe:'เพลิงเผา'})]),
   ph(half(p),[r('burnImmune',60),r('burnAura',3),r('cleansePulse',10),r('tribeResist',p.tr??30,{tribe:'เพลิงเผา'})],[],{atk:at(p,p.m2)}),
   ph(last(p),[r('burnImmune',80),r('burnAura',5),r('aoe',40),r('enrage',20),r('tribeResist',p.tr??30,{tribe:'เพลิงเผา'})],[fx('cleanse')],{atk:at(p,p.m3)})]}),
};
export function withRamp(b,E){ if(!E) return b; for(const [i,p] of b.phases.entries()){ p.rules=p.rules.filter(x=>x.id!=='enrage'); p.rules.push({id:'enrage',v:Math.round(E*(i===2?1.5:1))}); } return b; }
export function withWeak(b,tribe,pct){ if(!tribe||!pct) return b; for(const p of b.phases){ p.rules=p.rules.filter(x=>x.id!=='tribeWeak'); p.rules.push({id:'tribeWeak',v:pct,tribe}); } return b; }
