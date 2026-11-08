DIFFERS — 53 cell(s)

### ตัวละคร (53)

| ID | ชื่อ | ช่อง | Balance Room (AMCFG1) | เกมตอนนี้ |
|---|---|---|---|---|
| HL-2 | โล่ยักษ์ | name | ค้อนเหล็ก | โล่ยักษ์ |
| HL-3 | โล่พลังงาน | cdMs | [10000, 10000, 10000] | [6000, 6000, 6000] |
| HL-3 | โล่พลังงาน | skills | [{"do":"armorHitUp","to":"self","v":[2,4,8],"when":"hitTaken"}] | [{"when":"hit","do":"armorHitUp","to":"self","v":[2,4,8]}] |
| HL-4 | ช่างตีเหล็ก | atk | [3, 6, 12] | [4, 8, 16] |
| HL-4 | ช่างตีเหล็ก | cdMs | [10000, 10000, 10000] | [8000, 8000, 8000] |
| HL-4 | ช่างตีเหล็ก | rowHint | กลาง | กลาง+หลัง |
| HL-4 | ช่างตีเหล็ก | skills | [{"do":"permArmor","sameTribe":true,"to":"allAllies","v":[5,10,20],"when":"matchWin"}] | [{"when":"matchEnd","do":"permArmor","sameTribe":true,"to":"frontAlly","v":[5,10,20]}] |
| HL-5 | อสูรผู้พิทักษ์ | atk | [3, 6, 12] | [5, 10, 20] |
| HL-5 | อสูรผู้พิทักษ์ | extraTribes | [เพลิงเผา] | [อสูร] |
| HL-5 | อสูรผู้พิทักษ์ | hp | [200, 400, 800] | [170, 340, 680] |
| HL-5 | อสูรผู้พิทักษ์ | name | ไฟพิทักษ์ | อสูรผู้พิทักษ์ |
| HL-5 | อสูรผู้พิทักษ์ | rowHint | หน้า | หน้า+กลาง |
| HL-5 | อสูรผู้พิทักษ์ | skills | [{"do":"burn","to":"attacker","v":[3,6,12],"when":"hitTaken"}] | [{"when":"selfDown","do":"armor","perm":true,"sameTribe":true,"to":"backLaneAlly","v":[7,14,28]}] |
| HL-6 | ป้อมปราการเหล็ก | rowHint | หลัง | กลาง+หลัง |
| HL-7 | ผู้คุมโล่ | skills | [{"do":"atkOf","of":{"stat":"armor","who":"self"},"to":"self","v":[10,10,10],"when":"hitTaken"}] | [{"when":"hitTaken","do":"atkOf","of":{"stat":"armor","who":"self"},"to":"self","v":[30,30,30]}] |
| HL-8 | กำแพงเหล็ก | name | ปราสาทโบราณ | กำแพงเหล็ก |
| PL-2 | คบเพลิง | atk | [2, 4, 8] | [5, 10, 20] |
| PL-2 | คบเพลิง | hp | [120, 240, 480] | [100, 200, 400] |
| PL-2 | คบเพลิง | rowHint | ที่ไหนก็ได้ | หน้า |
| PL-2 | คบเพลิง | skills | [{"do":"permBurn","sameTribe":true,"to":"allAllies","v":[2,4,8],"when":"matchWin"}] | [{"when":"matchWin","do":"permBurn","sameTribe":true,"to":"allAllies","v":[3,6,9]}] |
| PL-3 | บอลไฟ | extraTribes | [สายฟ้า] | [อสูร] |
| PL-3 | บอลไฟ | name | เพลิงสายฟ้า | บอลไฟ |
| PL-3 | บอลไฟ | rowHint | หลัง | หน้า |
| PL-3 | บอลไฟ | skills | [{"do":"burnOf","of":{"stat":"shock","who":"each"},"to":"target","v":[60,60,60],"when":"hit"}] | [{"when":"selfDown","do":"burn","to":"enemyFrontRow","v":[10,20,40]}] |
| PL-4 | ปืนไฟ | skills | [{"do":"atkOf","of":{"stat":"burn","who":"laneEnemies"},"to":"self","v":[20,20,20],"when":"hit"}] | [{"when":"hit","do":"atkOf","of":{"stat":"burn","who":"laneEnemies"},"to":"self","v":[30,30,30]}] |
| PL-5 | วิหคเพลิง | name | ฟีนิกซ์ | วิหคเพลิง |
| PL-5 | วิหคเพลิง | rowHint | หน้า | ที่ไหนก็ได้ |
| PL-7 | เหยี่ยวไฟ | rowHint | กลาง | กลาง+หลัง |
| PL-8 | แม่มดเถ้าถ่าน | rowHint | กลาง | กลาง+หลัง |
| PT-3 | นักกวี | rowHint | หน้า | หน้า+กลาง |
| PT-3 | นักกวี | skills | [{"do":"cdPct","perm":true,"to":"tribeAllies","v":[2,4,8],"when":"selfDown"}] | [{"when":"selfDown","do":"cdPct","perm":true,"to":"tribeAllies","v":[5,10,20]}] |
| PT-6 | ราชินีภูติ | skills | [{"do":"healHitUp","to":"self","v":[5,5,5],"when":"hit"},{"do":"atkOf","of":{"stat":"healHit","who":"self"},"to":"self","v":[15,15,15],"when":"hit"},{"do":"healHitUp","sameTribe":true,"to":"allyRandom","v":[5,5,5],"when":"hit"}] | [{"when":"hit","do":"healHitUp","to":"self","v":[5,6,7]},{"when":"hit","do":"atkOf","of":{"stat":"healHit","who":"self"},"to":"self","v":[15,15,15]},{"when":"hit","do":"healHitUp","sameTribe":true,"to":"allyRandom","v":[5,5,5]}] |
| PT-7 | เหยี่ยวแสง | skills | [{"do":"healOf","of":{"stat":"maxHp","who":"each"},"to":"frontBackAlly","v":[10,10,10],"when":"hit"}] | [{"when":"hit","do":"healOf","of":{"stat":"maxHp","who":"each"},"to":"frontBackAlly","v":[20,20,20]}] |
| SF-2 | วัวสายฟ้า | skills | [{"do":"armorOf","of":{"stat":"shock","who":"ctx"},"to":"self","v":[50,50,50],"when":"hitTaken"}] | [{"when":"hitTaken","do":"armorOf","of":{"stat":"shock","who":"ctx"},"to":"self","v":[60,60,60]}] |
| SF-4 | ยมทูตสายฟ้า | multi | [1, 1, 1] | [2, 2, 2] |
| SF-4 | ยมทูตสายฟ้า | skills | [{"do":"shockHitUp","to":"self","v":[4,8,16],"when":"allyDown"}] | [{"when":"allyDown","do":"shockHitUp","to":"self","v":[2,4,8]}] |
| SF-7 | ผู้นำประจุ | name | ผู้เก็บประจุ | ผู้นำประจุ |
| SF-7 | ผู้นำประจุ | rowHint | กลาง+หลัง | ที่ไหนก็ได้ |
| SF-7 | ผู้นำประจุ | skills | [{"do":"permShock","to":"nextTribeBuy","v":[2,4,8],"when":"shopStart"}] | [{"when":"buy","do":"permShock","to":"nextTribeBuy","v":[1,2,4]}] |
| SF-8 | คลื่นสายฟ้า | name | คลื่นพลัง | คลื่นสายฟ้า |
| SF-8 | คลื่นสายฟ้า | rowHint | กลาง | หลัง |
| WN-1 | อสูรเร่ร่อน | name | นักสู้ | อสูรเร่ร่อน |
| WN-1 | อสูรเร่ร่อน | rowHint | หน้า | ที่ไหนก็ได้ |
| WN-2 | อสูรแค้น | name | ผู้ดื่มเลือด | อสูรแค้น |
| WN-2 | อสูรแค้น | rowHint | หน้า | หน้า+กลาง |
| WN-3 | อสูรแสง | extraTribes | [] | [ภูติ] |
| WN-3 | อสูรแสง | name | โล่เนื้อ | อสูรแสง |
| WN-5 | อสูรกาล | extraTribes | [ภูติ] | [] |
| WN-5 | อสูรกาล | name | แสงคลั่ง | อสูรกาล |
| WN-5 | อสูรกาล | rowHint | หน้า | หน้า+กลาง |
| WN-8 | อสูรฟื้นคืน | name | ทัณฑ์อสูร | อสูรฟื้นคืน |
| WN-8 | อสูรฟื้นคืน | rowHint | กลาง | ที่ไหนก็ได้ |
| WY-6 | มังกรคลั่ง | name | มังกรวายุคลั่ง | มังกรคลั่ง |

## Groups to answer (set 137 · AMCFG1 rev 32 saved 08:29 8 Nov · stage/bosses/runes/settings = MATCH)
Answer per group: X1 = ยึด Balance Room (import) · X2 = ยึดเกม (user sets back on the page + 💾) · X3 = split (say which IDs).
- **A — the 4 chars the user said they tuned:** PL-2 (atk 5/10/20→2/4/8, hp 100/200/400→120/240/480, perm burn 3/6/9→2/4/8, row หน้า→ที่ไหนก็ได้) · PT-3 (cd perm 5/10/20→2/4/8, row หน้า+กลาง→หน้า) · HL-4 (atk 4/8/16→3/6/12, cd 8→10 s, row กลาง+หลัง→กลาง, skill matchEnd frontAlly → matchWin allAllies same tribe, perm armor 5/10/20) · SF-7 (skill buy +1/2/4 → shopStart +2/4/8 shock/hit to next same-tribe buy, row ที่ไหนก็ได้→กลาง+หลัง, name ผู้เก็บประจุ). ⚠️ WY-3 is NOT in the code (no change saved) — user said they changed it.
- **B — skill/stat changes the user did not mention:** HL-3 (cd 6→10 s, armorHitUp on hit → on hit taken) · HL-5 (rework: atk 5/10/20→3/6/12, hp 170/340/680→200/400/800, skill perm armor on selfDown → burn attacker 3/6/12 on hit taken) · HL-7 (atk from armor 30%→10%) · PL-3 (rework: burn front row on selfDown → on hit burn target = 60% of each target's shock) · PL-4 (atk from lane burn 30%→20%) · PT-6 (self healHit +5/6/7 → +5/5/5) · PT-7 (heal 20%→10% max hp) · SF-2 (armor from shock 60%→50%) · SF-4 (multi 2→1, shock/hit on ally down 2/4/8→4/8/16).
- **C — tribe changes:** HL-5 extra อสูร→เพลิงเผา · PL-3 extra อสูร→สายฟ้า · WN-3 extra ภูติ→none · WN-5 extra none→ภูติ.
- **D — names + row hints only (display, no combat effect):** names HL-2 HL-5 HL-8 PL-3 PL-5 SF-7 SF-8 WN-1 WN-2 WN-3 WN-5 WN-8 WY-6 · row hints HL-6 PL-5 PL-7 PL-8 SF-8 WN-1 WN-2 WN-5 WN-8.
