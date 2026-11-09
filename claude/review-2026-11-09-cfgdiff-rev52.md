DIFFERS — 21 cell(s)

### ตัวละคร (13)

| ID | ชื่อ | ช่อง | Balance Room (AMCFG1) | เกมตอนนี้ |
|---|---|---|---|---|
| HL-5 | ไฟพิทักษ์ | skills | [{"do":"burn","to":"attacker","v":[2,4,8],"when":"hitTaken"}] | [{"when":"hitTaken","do":"burn","to":"attacker","v":[3,6,12]}] |
| PL-2 | คบเพลิง | skills | [{"do":"permBurn","sameTribe":true,"skipSameId":true,"to":"allAllies","v":[2,4,8],"when":"matchWin"}] | [{"when":"matchWin","do":"permBurn","sameTribe":true,"to":"allAllies","v":[2,4,8]}] |
| PL-3 | เพลิงสายฟ้า | cdMs | [7000, 7000, 7000] | [6000, 6000, 6000] |
| PL-3 | เพลิงสายฟ้า | skills | [{"do":"burnOf","of":{"stat":"shock","who":"each"},"to":"target","v":[50,50,50],"when":"hit"}] | [{"when":"hit","do":"burnOf","of":{"stat":"shock","who":"each"},"to":"target","v":[60,60,60]}] |
| PL-4 | ปืนไฟ | burn | [4, 8, 16] | [6, 6, 6] |
| PL-4 | ปืนไฟ | cdMs | [8000, 8000, 8000] | [7000, 6500, 6000] |
| PL-4 | ปืนไฟ | skills | [{"do":"atkOf","of":{"stat":"burn","who":"laneEnemies"},"to":"self","v":[15,15,15],"when":"hit"}] | [{"when":"hit","do":"atkOf","of":{"stat":"burn","who":"laneEnemies"},"to":"self","v":[20,20,20]}] |
| PT-2 | กำแพงพฤกษา | skills | [{"do":"heal","to":"self","v":[2,4,8],"when":"hitTaken"}] | [{"when":"hitTaken","do":"heal","to":"self","v":[3,6,12]}] |
| PT-6 | ราชินีภูติ | skills | [{"do":"healHitUp","to":"self","v":[5,5,5],"when":"hit"},{"do":"atkOf","of":{"stat":"healHit","who":"self"},"to":"self","v":[10,10,10],"when":"hit"},{"do":"healHitUp","sameTribe":true,"to":"allyRandom","v":[5,5,5],"when":"hit"}] | [{"when":"hit","do":"healHitUp","to":"self","v":[5,5,5]},{"when":"hit","do":"atkOf","of":{"stat":"healHit","who":"self"},"to":"self","v":[15,15,15]},{"when":"hit","do":"healHitUp","sameTribe":true,"to":"allyRandom","v":[5,5,5]}] |
| PT-7 | เหยี่ยวแสง | skills | [{"do":"healOf","of":{"stat":"maxHp","who":"each"},"to":"frontBackAlly","v":[5,5,5],"when":"hit"}] | [{"when":"hit","do":"healOf","of":{"stat":"maxHp","who":"each"},"to":"frontBackAlly","v":[10,10,10]}] |
| SF-4 | ยมทูตสายฟ้า | atk | [5, 10, 20] | [4, 8, 16] |
| SF-4 | ยมทูตสายฟ้า | cdMs | [6000, 6000, 6000] | [7000, 7000, 7000] |
| WY-7 | เหยี่ยวลม | atk | [3, 6, 12] | [2, 4, 8] |

### รูนที่สร้างเอง (1)

| ID | ชื่อ | ช่อง | Balance Room (AMCFG1) | เกมตอนนี้ |
|---|---|---|---|---|
| C3 | พุ่งชน | name | พุ่งชน | พุ่งชน |

### บอส (7)

| ID | ชื่อ | ช่อง | Balance Room (AMCFG1) | เกมตอนนี้ |
|---|---|---|---|---|
| B2 | จอมเวทย์ดำ | phase1.rules | healCut 50 · cdSlow 20 · tribeResist 15 ภูติ · enrage 10 · tribeWeak 300 เพลิงเผา · resistWear 2 | healCut 30 · cdSlow 15 · tribeResist 15 ภูติ · enrage 10 · tribeWeak 200 เพลิงเผา · resistWear 2 |
| B2 | จอมเวทย์ดำ | phase2.rules | healCut 70 · cdSlow 30 · randomSilence 8 4 · tribeResist 15 ภูติ · enrage 10 · tribeWeak 300 เพลิงเผา · resistWear 2 | healCut 50 · cdSlow 25 · randomSilence 8 4 · tribeResist 15 ภูติ · enrage 10 · tribeWeak 200 เพลิงเผา · resistWear 2 |
| B2 | จอมเวทย์ดำ | phase3.rules | healCut 90 · cdSlow 50 · hunter 0 · randomSilence 6 4 · tribeResist 15 ภูติ · enrage 15 · tribeWeak 300 เพลิงเผา · resistWear 2 | healCut 70 · cdSlow 40 · hunter 0 · randomSilence 6 4 · tribeResist 15 ภูติ · enrage 15 · tribeWeak 200 เพลิงเผา · resistWear 2 |
| B4 | กระจกสะท้อน | hp (HP) | 530 | 560 |
| B4 | กระจกสะท้อน | phase1.rules | shockImmune 50 · shockAura 2 · tribeResist 10 สายฟ้า · tribeWeak 100 เหล็กกล้า · shockOverload 20 | shockImmune 50 · shockAura 2 · tribeResist 10 สายฟ้า · tribeWeak 100 เหล็กกล้า · shockOverload 6 |
| B4 | กระจกสะท้อน | phase2.rules | shockImmune 60 · shockAura 3 · stunPulse 10 2 · tribeResist 10 สายฟ้า · tribeWeak 100 เหล็กกล้า · shockOverload 20 | shockImmune 60 · shockAura 3 · stunPulse 10 2 · tribeResist 10 สายฟ้า · tribeWeak 100 เหล็กกล้า · shockOverload 6 |
| B4 | กระจกสะท้อน | phase3.rules | shockImmune 80 · shockAura 5 · stunPulse 6 2 · fastAtk 15 · tribeResist 10 สายฟ้า · tribeWeak 100 เหล็กกล้า · shockOverload 20 | shockImmune 80 · shockAura 5 · stunPulse 6 2 · fastAtk 15 · tribeResist 10 สายฟ้า · tribeWeak 100 เหล็กกล้า · shockOverload 6 |
