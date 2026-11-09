# Boss v2 calibrator + tribe report (set 168 cont. 3, plan step 9 · 9 Nov 2026)

User picks: A2 targets k1 60 / k2 50 / k3 45 · B1 reference teams regenerated (lab/bossref.mjs 12000 300 30: 300 natural teams per k + tribe top-up to ≥ 30 per tribe per k, top-up used in tribe columns only) · C1 calibrator may change power per boss + shared g.
AMCFG1 rev 53 (unchanged since step 6): cfgdiff 22 cells = the same rev-53 cells (user A1 keep game) + v1→v2 kit cells (user B1 C1 D1) — no new picks.
Proposals only — nothing written until the user picks per cell.

## Calibrator (node lab/bossrun.mjs 0 60 50 45 --fit)

calibrator (report only) · reference teams k1 300 · k2 300 · k3 300 · targets k1 60 · k2 50 (k3 reported)
shared curve: g 2.5 → 3.17 (HP × g^(k−1)) · a 1.5 kept · Heat as set

| boss | power | hp | atk | phase atk | k1 % | k2 % | k3 % |
|---|---|---|---|---|---|---|---|
| B1 โกเลม | ×0.91 | 980→890 | 40→36 | -/52/75→-/47/68 | 51→60 | 42→41 | 25→19 |
| B2 จอมเวทย์ดำ | ×1.09 | 630→680 | 48→52 | -/63/90→-/68/98 | 72→61 | 78→55 | 66→39 |
| B3 อสุรกายคลั่ง | ×0.91 | 400→360 | 57→52 | -/73/103→-/66/94 | 39→61 | 41→42 | 35→25 |
| B4 กระจกสะท้อน | ×1.08 | 560→600 | 46→50 | -/70/102→-/76/110 | 75→61 | 72→51 | 55→28 |
| B5 จ้าวพายุ | ×1.29 | 400→510 | 26→33 | -/33/42→-/42/54 | 95→60 | 81→49 | 61→30 |
| B6 ปีศาจเพลิง | ×0.81 | 500→410 | 45→37 | -/66/98→-/54/80 | 29→57 | 49→62 | 36→38 |
| average | | | | | 60 | 50 | 30 |

Notes: k3 average 30 % vs target 45 (k3 is report-only in C1; higher g + Heat make k3 harder). g was fitted with ALL six fitted powers — keeping an old power shifts the k2 average.

## Tribe report BEFORE the fit (node lab/bossrun.mjs 0 60 50 45 --ref --tribes)

teams k1 300 · k2 300 · k3 300 · reference teams (lab/bossref.json · + tribe top-up 94/0/9 in tribe columns only) · cell = player win % (teams)

### บอสกลาง (baseline: no rules · median stats hp 530 atk 46/65/94 cd 5000)
| k | all | เพลิงเผา | สายฟ้า | วายุ | ภูติ | เหล็กกล้า | อสูร | ผสม |
|---|---|---|---|---|---|---|---|---|
| 1 | 92 (300) | 80 (30) | 85 (52) | 90 (30) | 87 (47) | 80 (30) | 93 (30) | 97 (175) |
| 2 | 83 (300) | 86 (44) | 64 (44) | 82 (45) | 78 (40) | 85 (40) | 97 (70) | 82 (17) |
| 3 | 77 (300) | 77 (48) | 63 (30) | 50 (42) | 73 (44) | 87 (39) | 90 (84) | 86 (22) |

### B1 โกเลม (v2) · weak สายฟ้า · resist เหล็กกล้า · cell = win % (vs baseline)
| k | all | เพลิงเผา | สายฟ้า | วายุ | ภูติ | เหล็กกล้า | อสูร | ผสม |
|---|---|---|---|---|---|---|---|---|
| 1 | 51 (−41) | 50 (−30) | 65 (−19) | 17 (−73) | 30 (−57) | 20 (−60) | 40 (−53) | 56 (−41) |
| 2 | 42 (−41) | 66 (−20) | 80 (+16) | 27 (−56) | 28 (−50) | 48 (−37) | 21 (−76) | 35 (−47) |
| 3 | 25 (−52) | 40 (−37) | 40 (−23) | 14 (−36) | 36 (−36) | 44 (−44) | 2 (−88) | 36 (−50) |

cause (rule off → k1 all/weak/resist · k2 all/weak/resist):
- tribeWeak: k1 19/21/7 · k2 34/41/48
- tribeResist: k1 50/63/23 · k2 44/80/60
- plating: k1 68/81/30 · k2 54/84/60
- reflect: k1 58/79/27 · k2 50/100/58
- noArmor: k1 51/65/20 · k2 44/80/60

### B2 จอมเวทย์ดำ (v2) · weak เพลิงเผา · resist ภูติ · cell = win % (vs baseline)
| k | all | เพลิงเผา | สายฟ้า | วายุ | ภูติ | เหล็กกล้า | อสูร | ผสม |
|---|---|---|---|---|---|---|---|---|
| 1 | 72 (−20) | 90 (+10) | 87 (+2) | 63 (−27) | 43 (−45) | 40 (−40) | 77 (−17) | 81 (−17) |
| 2 | 78 (−5) | 91 (+5) | 91 (+27) | 78 (−4) | 45 (−32) | 68 (−17) | 84 (−13) | 88 (+6) |
| 3 | 66 (−12) | 81 (+4) | 77 (+13) | 45 (−5) | 52 (−20) | 74 (−13) | 67 (−24) | 73 (−14) |

cause (rule off → k1 all/weak/resist · k2 all/weak/resist):
- tribeWeak: k1 51/43/23 · k2 66/84/40
- tribeResist: k1 73/90/49 · k2 79/91/53
- mendPulse: k1 93/100/81 · k2 92/93/78
- healCut: k1 75/90/49 · k2 79/91/50
- randomSilence: k1 71/90/45 · k2 79/91/48

### B3 อสุรกายคลั่ง (v2) · weak ภูติ · resist อสูร · cell = win % (vs baseline)
| k | all | เพลิงเผา | สายฟ้า | วายุ | ภูติ | เหล็กกล้า | อสูร | ผสม |
|---|---|---|---|---|---|---|---|---|
| 1 | 39 (−53) | 10 (−70) | 13 (−71) | 23 (−67) | 53 (−34) | 7 (−73) | 40 (−53) | 48 (−49) |
| 2 | 41 (−42) | 52 (−34) | 16 (−48) | 36 (−47) | 50 (−27) | 30 (−55) | 59 (−39) | 29 (−53) |
| 3 | 35 (−42) | 33 (−44) | 20 (−43) | 21 (−29) | 50 (−23) | 36 (−51) | 36 (−55) | 41 (−45) |

cause (rule off → k1 all/weak/resist · k2 all/weak/resist):
- tribeWeak: k1 29/26/27 · k2 34/28/46
- tribeResist: k1 45/64/57 · k2 44/55/64
- rage: k1 88/91/90 · k2 68/78/77
- lifesteal: k1 51/66/57 · k2 49/60/64
- downAtk: k1 41/53/40 · k2 43/50/59

### B4 กระจกสะท้อน (v2) · weak เหล็กกล้า · resist สายฟ้า · cell = win % (vs baseline)
| k | all | เพลิงเผา | สายฟ้า | วายุ | ภูติ | เหล็กกล้า | อสูร | ผสม |
|---|---|---|---|---|---|---|---|---|
| 1 | 75 (−17) | 50 (−30) | 38 (−46) | 60 (−30) | 60 (−28) | 80 (+0) | 80 (−13) | 90 (−7) |
| 2 | 72 (−12) | 80 (−7) | 45 (−18) | 47 (−36) | 63 (−15) | 83 (−2) | 97 (+0) | 76 (−6) |
| 3 | 55 (−23) | 44 (−33) | 27 (−37) | 19 (−31) | 43 (−30) | 72 (−15) | 86 (−5) | 55 (−32) |

cause (rule off → k1 all/weak/resist · k2 all/weak/resist):
- tribeWeak: k1 67/47/37 · k2 69/73/41
- tribeResist: k1 78/80/46 · k2 73/85/48
- staticChain: k1 78/80/40 · k2 74/85/45
- shockImmune: k1 80/83/54 · k2 75/90/57
- stunPulse: k1 79/83/46 · k2 75/85/50

### B5 จ้าวพายุ (v2) · weak อสูร · resist วายุ · cell = win % (vs baseline)
| k | all | เพลิงเผา | สายฟ้า | วายุ | ภูติ | เหล็กกล้า | อสูร | ผสม |
|---|---|---|---|---|---|---|---|---|
| 1 | 95 (+4) | 90 (+10) | 90 (+6) | 80 (−10) | 89 (+2) | 90 (+10) | 97 (+3) | 99 (+2) |
| 2 | 81 (−2) | 86 (+0) | 64 (+0) | 64 (−18) | 78 (+0) | 83 (−2) | 100 (+3) | 82 (+0) |
| 3 | 61 (−16) | 48 (−29) | 40 (−23) | 26 (−24) | 57 (−16) | 59 (−28) | 93 (+2) | 77 (−9) |

cause (rule off → k1 all/weak/resist · k2 all/weak/resist):
- tribeWeak: k1 91/93/80 · k2 77/99/60
- tribeResist: k1 96/97/100 · k2 84/100/78
- galeGuard: k1 96/97/100 · k2 83/100/73
- cdPulse: k1 95/97/87 · k2 82/100/64
- vanish: k1 95/97/80 · k2 82/100/64

### B6 ปีศาจเพลิง (v2) · weak วายุ · resist เพลิงเผา · cell = win % (vs baseline)
| k | all | เพลิงเผา | สายฟ้า | วายุ | ภูติ | เหล็กกล้า | อสูร | ผสม |
|---|---|---|---|---|---|---|---|---|
| 1 | 29 (−63) | 7 (−73) | 10 (−75) | 83 (−7) | 40 (−47) | 13 (−67) | 27 (−67) | 34 (−63) |
| 2 | 49 (−34) | 39 (−48) | 23 (−41) | 84 (+2) | 43 (−35) | 43 (−42) | 61 (−36) | 29 (−53) |
| 3 | 36 (−42) | 4 (−73) | 10 (−53) | 64 (+14) | 43 (−30) | 26 (−62) | 49 (−42) | 27 (−59) |

cause (rule off → k1 all/weak/resist · k2 all/weak/resist):
- tribeWeak: k1 13/20/3 · k2 33/24/23
- tribeResist: k1 31/87/7 · k2 51/87/43
- flameShell: k1 59/97/17 · k2 65/93/52
- burnAura: k1 36/90/10 · k2 51/84/39
- burnImmune: k1 32/90/7 · k2 54/89/57
- aoe: k1 35/90/10 · k2 54/91/41
