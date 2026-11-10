// ---------- สู้ ----------
let lastResult = null, dummyDmg = 0; // set 108: damage into the last-round dummy (shown on the result + run end)
let tick = '', tick2 = '', tickShown = '';
const view = new BattleView($('arena'), CM, {
  onTime: ms => { $('clock').textContent = `${(ms / 1000).toFixed(1)} วิ`; if (bPick != null) renderBInfo(); if (tick !== tickShown) { tickShown = tick; $('ticker').textContent = tick; $('ticker2').textContent = tick2; } },
  onEnd: () => finishMatch(),
  onLog: line => { if (tick) tick2 = tick; tick = line.replace(/(ซ้าย|ขวา) ([A-Z]+-\d+)/g, (m, sd, id) => `${sd === 'ซ้าย' ? 'ทีมคุณ' : 'คู่แข่ง'} ${CM[id] ? CM[id].name : id}`); }, // set 97: dock ticker = latest battle event
});
// set 116 (mockup): a skill that fires → tag on that unit's cell for a moment (skip / fast-forward = none)
view.onProc = e => {
  const v = view.units.get(e.who); if (!v || view.fast || !v.cell) return;
  let t = v.cell.querySelector('.sktag'); if (!t) { t = el('span', 'sktag'); v.cell.append(t); }
  t.textContent = String(DO_TH[e.what] || 'สกิลทำงาน').split(/[,(·]/)[0].trim(); t.title = 'สกิล'; v.cell.classList.add('skilling');
  const cell = v.cell; clearTimeout(cell.skT); cell.skT = setTimeout(() => { t.remove(); cell.classList.remove('skilling'); }, 1400 / Math.min(view.speed || 1, 4));
};
$('fight').addEventListener('click', () => {
  if (P.over) return;
  if (P.rn.offer) { pushMsgs({ ok: false, msg: 'เลือกรูนรางวัลก่อน (หรือกด "ไม่รับรูน")' }); render(); return; }
  if (!teamEntries(P).length && !confirmEmpty) { confirmEmpty = true; pushMsgs({ ok: false, msg: 'บอร์ดว่าง จะแพ้ทันที · กดอีกครั้งเพื่อยืนยัน' }); render(); return; }
  const unworn = rnUnworn(P); // set 109: remind once per round about runes that do nothing
  if (unworn.length && !confirmRunes && teamEntries(P).length) { confirmRunes = true; pushMsgs({ ok: false, msg: `มีรูน ${unworn.length} อันยังไม่ได้สวม (${unworn.map(id => (rnRec(id) || { name: id }).name).join(', ')}) จะไม่ทำงาน · กดปุ่มรูนเพื่อสวม หรือกดสู้อีกครั้ง` }); render(); return; }
  confirmEmpty = false; confirmRunes = false;
  // set 85: every bossEvery rounds the opponent is a boss (core/runboss.js) · teamB = { boss: id, k } then
  const rb = runBossAt(P);
  const foe = rb ? null : nextFoe(); // set 107: the enemy follows the player's power + win streak (pickFoe)
  if (!foe && !rb) botShop(B, chars, RULES);
  const round = P.round, winsBefore = P.wins, heartsBefore = P.hearts, teamA = teamEntries(P), teamB = rb ? { boss: rb.boss.id, k: rb.k, ...(P.extra ? { x: 1 } : {}) } : foe ? foe.team : teamEntries(B); // set 119: x = extra-match boss
  const runes = rnCompact(P), kind = rb ? 'boss' : 'win', streak = stats.streak;
  let result;
  const fd = foe ? foe.pct : null, fr = foe ? foe.rn : [], fs = foe ? foe.s : 0; // set 107: power-match scale + the bot team's runes
  try { const ps = playerSide(teamA, runes); const fo = foeUnits(teamB, fd, round, fr, fs); result = simulate(ps.units, fo.units, { ...ps.opts, ...fo.opts }); }
  catch (e) { pushMsgs({ ok: false, msg: 'ทีมไม่ถูกกฎ: ' + e.message }); render(); return; }
  lastResult = result;
  if (rb && isDummy(rb.boss)) dummyDmg = dummyScore(result); // set 108: last-round dummy → damage score
  const shown = showResult(teamA, teamB, result, runes, streak, fd, round, fr, fs);
  // ชุด 22 (ผู้ใช้เลือก): ผลแมตช์มีผลทันทีที่กดสู้ แล้วเซฟ ก่อนเล่นภาพ · ปิดหน้าเว็บระหว่างสู้ = ผลยังนับ
  const w = result.winner, won = w !== 1;
  const gain = side => (result.perm || []).filter(g => g.side === side); // ค่าถาวรจากสกิลระหว่างสู้ ได้ทั้งแพ้และชนะ
  const r = J('en', [won ? 1 : 0, rb ? 1 : 0, rlGains(gain(0))], () => endMatch(P, won, chars, RULES, gain(0), !!rb));
  if (!foe && !rb) { endMatch(B, w === 1, chars, RULES, gain(1)); B.over = false; B.hearts = S.hearts; B.lastWon = P.lastWon; } // บอทซื้อสด (สำรอง) ได้เงินเท่าผู้เล่น
  if (won && !P.over) { const of = J('of', [kind], () => rnMakeOffer(P, kind)); if (!of) r.msgs.push('ไม่มีรูนเหลือให้เลือกแล้ว'); } // set 94: win → pick 1 free rune
  else if (r.second && !P.over) { const of = J('of', ['sc'], () => rnMakeOffer(P, 'sc')); if (!of) r.msgs.push('ไม่มีรูนเหลือให้เลือกแล้ว'); } // set 119: second chance → legend pick
  addMatchStats(stats, result);
  replays.push(replayEntry(round, teamA, teamB, result, runes, streak, fd, fr, fs)); saveReplays(); // ชุด 25
  logPlay(playRecord({ at: Date.now(), hash: DATA_HASH, runSeed: P.seed, round, winsBefore, heartsBefore, result, teamA, teamB: rb ? [] : teamB, foe, boss: rb ? teamB : null, runes, diff: fd }));
  pendingEnd = { r, w }; replayMode = null;
  if (P.over) { clearAt = P.hearts > 0 && !P.extra ? Date.now() : 0; store.set(HIST_KEY, JSON.stringify(pushHistory(readHistory(store.get(HIST_KEY)), historyEntry(P, stats, clearAt || Date.now())))); store.del(SAVE_KEY); saveLog(true); }
  else saveRun(true); // set 136: match end = journal sent to the db
  showNotice('');
  showScreen('battle'); $('result').hidden = true; $('replayTag').hidden = true;
  $('battleTitle').textContent = rb ? `บอส: ${rb.boss.name} (ครั้งที่ ${rb.k})` : foe ? `คู่แข่ง: ทีมบอทรอบ ${foe.round}` : `แมตช์รอบ ${round}`; // set 159: round = HUD, enemy % = chip
  hideToast(); // set 106 (B4): shop warnings must not cover the field
  viewMap(teamB); view.speed = speed; view.load(shown); resetLog(); placeRunes(runes, rb ? [] : fr); view.play();
  if (autoSkip) view.skip();
});
// set 84: the match is shown from a 2nd run with detail + live stats (log only) · same teams → same result; if not, show the plain one
// enemy side: a team (array of entries) or a boss { boss: id, k } (set 85) · unknown boss id → throws (replay shows a notice)
// set 107: d = enemy hp/atk % (power match · old replays: mode name → replayPct) · fn/fs = the bot team's runes + its win streak · boss never scaled
// returns { units, opts } (opts.tribeExtraB = the bot team's tribe-flag runes)
function foeUnits(b, d = null, round = 0, fn = [], fs = 0) {
  if (Array.isArray(b)) return foeSide({ team: b, pct: replayPct(d), rn: fn || [], s: fs | 0 }, CM, RULES, RUN_STAGE, round);
  const rec = runBossById(b.boss); if (!rec) throw new Error('ไม่พบบอส ' + b.boss);
  return { units: runBossTeam(rec, b.k, RUN_STAGE, b.x === 1), opts: runBossOpts(rec) }; // set 108: dummy boss stops at dummySec · set 119: x = extra-match boss
}
// battle view card data: the boss is not a character → add its card (set 85)
function viewMap(b) { const rec = !Array.isArray(b) && b ? runBossById(b.boss) : null; $('foeHead').textContent = rec ? 'บอส' : 'คู่แข่ง (บอท)'; view.charMap = rec ? { ...CM, [rec.id]: runBossChar(rec, b.k, RUN_STAGE, b.x === 1) } : CM; }
function showResult(teamA, teamB, result, runes, streak, d = null, round = 0, fn = [], fs = 0) {
  let r = null;
  try { const ps = playerSide(teamA, runes, streak), fo = foeUnits(teamB, d, round, fn, fs); r = simulate(ps.units, fo.units, { ...ps.opts, ...fo.opts, detail: true, live: true }); } catch (e) { r = null; }
  return r && r.winner === result.winner && r.timeMs === result.timeMs ? r : result;
}
// ---------- รีเพลย์ (ชุด 25) ----------
const resTh = w => (w === 0 ? 'ชนะ' : w === 1 ? 'แพ้' : 'เสมอ');
const resCls = w => (w === 1 ? 'lose' : 'win');
function renderReplays(list, back) {
  list.replaceChildren(...(replays.length ? replays.map((x, i) => {
    const li = el('li', '', `รอบ ${x.r} · ${resTh(x.w)} · ${(x.t / 1000).toFixed(1)} วิ`), b = el('button', '', 'ดูรีเพลย์'); b.type = 'button';
    b.addEventListener('click', () => watchReplay(i, back)); li.append(b); return li;
  }) : [el('li', '', 'ยังไม่มีแมตช์')]));
}
POPS.replays = () => { const ol = el('ol', 'msgs replays'); ol.id = 'replayList'; renderReplays(ol, 'prep'); return [phead(`รีเพลย์แมตช์ใน run นี้ (${replays.length})`, 'ดูซ้ำได้ ไม่เปลี่ยนสถานะ run'), ol, pacts(pbtn('คัดลอกโค้ดผลการเล่น', copyRunCode))]; };
$('replayBtn').addEventListener('click', () => openPop('replays'));
// set 105: clipboard blocked → show the code in a box to copy by hand
POPS.runcode = () => {
  const code = runCode(); if (!code) return null;
  const ta = el('textarea', 'runcode'); ta.id = 'runCodeText'; ta.readOnly = true; ta.value = code; ta.rows = 6;
  setTimeout(() => { try { ta.focus(); ta.select(); } catch (e) { /* ignore */ } }, 0);
  return [phead('โค้ดผลการเล่น', 'กดค้างในกล่องแล้วเลือกคัดลอกทั้งหมด แล้ววางส่งให้คนทำเกม'), ta, pacts()];
};
function watchReplay(i, back) {
  const x = replays[i]; if (!x) return;
  let result;
  try { const ps = playerSide(x.a, x.n, x.g | 0); const fo = foeUnits(x.b, x.d || null, x.r, x.fn || [], x.fs | 0); result = simulate(ps.units, fo.units, { ...ps.opts, ...fo.opts }); } catch (e) { result = null; }
  // จำลองซ้ำแล้วต้องได้ผลและเวลาเดิม · ไม่ตรง = ระบบต่อสู้เปลี่ยนหลังเล่นแมตช์นั้น → ไม่เล่น แจ้งแทน
  if (!result || result.winner !== x.w || Math.floor(result.timeMs) !== x.t) { showNotice(`รีเพลย์รอบ ${x.r} ใช้ไม่ได้: เกมอัปเดตระบบการต่อสู้หลังแมตช์นี้ ผลจึงไม่ตรงกับที่เล่นจริง`); return; }
  showNotice(''); pendingEnd = null; replayMode = { back, x };
  showScreen('battle'); $('result').hidden = true; $('replayTag').hidden = false;
  $('battleTitle').textContent = `รีเพลย์รอบ ${x.r}`;
  viewMap(x.b); view.speed = speed; view.load(showResult(x.a, x.b, result, x.n, x.g | 0, x.d || null, x.r, x.fn || [], x.fs | 0)); resetLog(); placeRunes(x.n, Array.isArray(x.b) ? x.fn : []); view.play();
}
// ---------- set 120 (user): runes on the battle field, both sides · one-unit runes = tag on that unit · team/row/tribe/enemy runes = strip above its side
let bRunes = new Map(), lastRunes = [[], []];
function rnBattle(list) {
  const slot = new Map(), team = [], add = (k, nm) => slot.set(k, [...(slot.get(k) || []), nm]);
  for (const e of rnFromCompact(list || [], RUN_STAGE)) {
    if (RUNE_RUN_ONLY.includes(e.r.eff)) continue; // money/shop runes do nothing in a fight
    const nm = e.r.name + (e.n > 1 ? ` ×${e.n}` : '');
    if (e.slot && rnNeedsSlot(e.r)) add(e.slot.join(':'), nm); else team.push(nm);
    if (e.partner) add(e.partner.join(':'), nm + ' (คู่)');
  }
  return { slot, team };
}
function placeRunes(a, b) {
  lastRunes = [a || [], b || []]; bRunes = new Map();
  const sides = lastRunes.map(rnBattle);
  if (view.units) for (const v of view.units.values()) {
    const nms = sides[v.side] && sides[v.side].slot.get(`${v.row}:${v.lane}`); if (!nms || !v.cell) continue;
    bRunes.set(v.uid, nms);
    v.cell.append(runeMark(nms));
  }
  // set 183 (B1): short "◆ รูนศัตรู 5" · tap = full list in a toast (the long line was cut on phones)
  sides.forEach((sd, i) => {
    const n = $(i ? 'rnR' : 'rnL'), full = sd.team.length ? `รูน${i ? 'ศัตรู' : 'ทีม'}: ${sd.team.join(' · ')}` : '';
    n.textContent = sd.team.length ? `◆ รูน${i ? 'ศัตรู' : 'ทีม'} ${sd.team.length}` : ''; n.title = full;
    if (full) { n.setAttribute('role', 'button'); n.tabIndex = 0; n.setAttribute('aria-label', full); n.onclick = () => toast([{ t: full }]); n.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toast([{ t: full }]); } }; }
    else { n.removeAttribute('role'); n.removeAttribute('tabindex'); n.removeAttribute('aria-label'); n.onclick = null; n.onkeydown = null; }
  });
}
// ---------- บันทึกการต่อสู้ละเอียด (ชุด 25 · ตัวสร้างบรรทัดเดียวกับห้องบาลานซ์ game/labels.js) ----------
function logNameEl(u) {
  const c = CM[u.id] || { id: u.id, name: u.name || u.id, tribe: u.tribe }, s = el('span', u.side === 0 ? 'lg-L' : 'lg-R'), dot = el('i'); // boss = not in CM
  dot.style.setProperty('--tc', (TRIBE_STYLE[c.tribe] || {}).color || 'var(--mute)');
  s.append(dot, c.name, el('span', 'lg-pos', ` ${ROW_TH[u.row]}${u.lane + 1}`));
  s.title = `${u.side === 0 ? 'ทีมคุณ' : 'คู่แข่ง'} · ${c.id} Lv${u.level}`;
  return s;
}
function resetLog() {
  bUnpick(); setStop(false); tick = $('battleTitle').textContent; tick2 = ''; simLast = null; mxKey = null; mxOpen.clear(); mxCellSel = null; mxHi = null;
  $('logBox').open = false; $('logList').replaceChildren();
  const r = view.result, sw = $('logWho');
  sw.replaceChildren(el('option', '', 'ทุกตัว'), ...unitsOf(r).map(u => { const o = el('option', '', `${u.side === 0 ? 'ทีมคุณ' : 'คู่แข่ง'} ${ROW_TH[u.row]}${u.lane + 1} · ${(CM[u.id] || u).name || u.id}${CM[u.id] ? ` Lv${u.level}` : ''}`); o.value = String(u.uid); return o; }));
  sw.firstChild.value = '';
}
function renderLog() {
  if (!$('logBox').open || !view.result) return;
  const v = $('logWho').value, who = v === '' ? null : Number(v);
  $('logList').replaceChildren(...battleLogLines(view.result, CM, { who: Number.isInteger(who) ? who : null, onlyProc: $('logProc').checked, hideSet: $('logNoSet').checked, nameEl: logNameEl }));
}
$('logBox').addEventListener('toggle', renderLog);
for (const id of ['logWho', 'logProc', 'logNoSet']) $(id).addEventListener('change', renderLog);
// ---------- set 84: tap a unit during the match → its skills (times used so far) + every stat live, +/− vs start ----------
let bPick = null, bVer = -1, bAt = 0;
// [key, label, colour, format, lower is better]
const LIVE_STATS = [['atk', 'พลังโจมตี', 'var(--n-hit)'], ['cd', 'คูลดาวน์', 'var(--n-skill)', v => `${(v / 1000).toFixed(2)} วิ`, 1], ['multi', 'มัลติฮิต', 'var(--n-cnt)', v => `×${v}`],
  ['burnHit', 'ไฟ/ฮิต', 'var(--n-burn)'], ['shockHit', 'ช็อต/ฮิต', 'var(--n-shock)'], ['armorHit', 'เกราะ/ฮิต', 'var(--n-armor)'], ['healHit', 'ฟื้น/ฮิต', 'var(--n-heal)'], ['maxHp', 'HP สูงสุด', 'var(--hp)'],
  ['hitAmp', 'ดาเมจตี', 'var(--n-hit)', v => `${v}%`], ['shockAmp', 'ดาเมจช็อต', 'var(--n-shock)', v => `${v}%`], ['burnAmp', 'ไฟที่ทำ', 'var(--n-burn)', v => `${v}%`],
  ['healAmp', 'ฟื้นแรงขึ้น', 'var(--n-heal)', v => `${v}%`], ['armorAmp', 'เกราะที่ได้', 'var(--n-armor)', v => `${v}%`], ['cdAmp', 'ลดคูลดาวน์แรงขึ้น', 'var(--n-skill)', v => `${v}%`], ['healToAtk', 'ฟื้น → พลังโจมตี', 'var(--n-heal)', v => `${v}%`],
  ['dmgTaken', 'โดนดาเมจ', 'var(--n-hit)', v => `${v}%`, 1], ['burnTaken', 'โดนไฟ', 'var(--n-burn)', v => `${v}%`, 1], ['shockTaken', 'โดนช็อต', 'var(--n-shock)', v => `${v}%`, 1]];
const LIVE_ALWAYS = new Set(['atk', 'cd', 'multi', 'burnHit', 'shockHit', 'armorHit', 'healHit', 'maxHp']);
const r2 = v => Math.round(v * 100) / 100;
function bUnitAt(cell) { for (const v of view.units.values()) if (v.card.isConnected && (v.cell === cell || (v.tags || []).some(t => t.parentNode === cell))) return v; return null; }
$('arena').addEventListener('click', ev => {
  const cell = ev.target.closest('.cell'); if (!cell || !view.units) return;
  const v = bUnitAt(cell); if (!v) return;
  if (bPick === v.uid) { bUnpick(); return; } // tap the same unit again = back to the battle ticker
  bPick = v.uid; renderBInfo(true);
});
// set 120 (user): live unit details sit in the dock (where the ticker is), not a popup
function bUnpick() { bPick = null; document.querySelectorAll('#arena .cell.picked').forEach(x => x.classList.remove('picked')); $('bPane').hidden = true; }
function renderBInfo(force) {
  if (bPick == null) return;
  const box = $('bPane'); box.hidden = false;
  if (!force && (view.ver === bVer || performance.now() - bAt < 150)) return; // repaint ≤ ~7 times/sec while playing
  bVer = view.ver; bAt = performance.now();
  document.querySelectorAll('#arena .cell.picked').forEach(x => x.classList.remove('picked'));
  let v = bPick != null && view.units ? view.units.get(bPick) : null;
  if (v && !v.card.isConnected) { v = bUnitAt(v.cell); if (v) bPick = v.uid; } // replaced by a summon → show the one standing there now
  const bx = pbtn('✕', bUnpick, 'bx'); bx.setAttribute('aria-label', 'ปิดรายละเอียด');
  if (!v) { box.replaceChildren(bx, el('span', 'hint', 'ไม่มีตัวนี้ในสนามแล้ว')); placeCard(box, null); return; }
  v.cell.classList.add('picked');
  const c = CM[v.id] || { id: v.id, name: v.name, tribe: '', extraTribes: [], skills: [] }, L = (v.level || 1) - 1;
  const res = (view.result.units || []).find(x => x.uid === v.uid), ini = res && res.ini;
  const right = el('div'); right.style.cssText = 'display:grid;gap:3px;min-width:0';
  const extra = (c.extraTribes || []).length ? ` + ${c.extraTribes.join(', ')}` : '';
  const bh = el('div', 'bhead'); bh.append(el('h2', '', `${v.side === 0 ? 'ทีมคุณ' : 'คู่แข่ง'} ${ROW_TH[v.row]}${v.lane + 1} · ${c.id} ${c.name}${v.level ? ` · เลเวล ${v.level}` : ''}`), el('span', 'hint', `${c.tribe}${extra}`));
  const rns = bRunes.get(v.uid); if (rns && rns.length) bh.append(el('span', 'hint', '◆ รูน ' + rns.join(' · ')));
  bh.append(bx);
  right.append(bh);
  const live = el('div', 'live');
  for (const [k, val] of [['HP', `${Math.max(0, v.hp)}/${v.maxHp}`], ['เกราะ', v.armor], ['ไฟบนตัว', v.burn], ['ช็อตบนตัว', v.shock]]) { const d = el('span', '', `${k} `); d.append(el('b', '', String(val))); live.append(d); }
  if (v.down) live.append(el('b', '', 'ล้ม'));
  right.append(live);
  (c.skills || []).forEach((sk, si) => {
    const on = !sk.lv || sk.lv.includes(L + 1), shop = isShopWhen(sk.when), n = v.procs.get(si) || 0;
    const line = el('div', on ? 'skill' : 'skill off'); line.append(skillTags(sk), skillLineEl(sk, on ? L + 1 : 0));
    if (!shop) line.append(el('span', 'cnt' + (!n && on ? ' zero' : ''), !on ? `ไม่ใช้ที่ Lv${L + 1}` : `ทำงาน ${n} ครั้ง`)); // shop/after-match skills: tag already says so
    right.append(line);
  });
  if (!(c.skills || []).length) right.append(el('span', 'hint', 'ไม่มีสกิล'));
  const st = v.stat;
  if (st) {
    const base = ini ? { ...ini, cd: Math.max(RULES.minCooldownMs || 0, Math.round(ini.cdMs * ini.cdMult)) } : null;
    const g = el('div', 'lstats');
    for (const [k, lab, color, fmt = x => String(x), low] of LIVE_STATS) {
      const val = st[k]; if (val == null) continue;
      const b0 = base ? base[k] : null, d = b0 == null ? 0 : r2(val - b0);
      if (!LIVE_ALWAYS.has(k) && !val && !d) continue;
      const t = el('div', 'lstat'); t.style.setProperty('--c', color);
      t.append(el('span', '', lab), el('b', '', fmt(r2(val))));
      if (d) { const good = low ? d < 0 : d > 0, ds = k === 'cd' ? `${(Math.abs(d) / 1000).toFixed(2)} วิ` : String(Math.abs(d)) + (fmt(1).endsWith('%') ? '%' : ''); t.append(el('span', good ? 'up' : 'dn', `${d > 0 ? '+' : '−'}${ds} จากเริ่ม`)); }
      g.append(t);
    }
    right.append(g);
  } else right.append(el('span', 'hint', 'ไม่มีค่าเรียลไทม์ของแมตช์นี้'));
  const wrap = el('div', 'uinfo'); wrap.id = 'bInfo'; wrap.append(CM[v.id] ? unitShape(c, v.level) : el('span'), right);
  box.replaceChildren(wrap, el('p', 'hint', 'ค่าเรียลไทม์ · +/− = เปลี่ยนจากตอนเริ่ม · แตะที่อื่น = ปิด'));
  placeCard(box, v.cell);
}
// match detail: opens on demand (built when first opened) · time buttons jump to that line in the battle log below
// set 97: match details + battle log = one popup (built when opened)
function openMx() {
  if (!view.result) return;
  if (!simLast || simLast.r !== view.result) { simLast = { r: view.result, m: CM }; mxKey = null; mxOpen.clear(); mxCellSel = null; mxHi = null; $('logBox').open = false; $('logList').replaceChildren(); }
  closePop(); renderMatch(); if (!$('mxDlg').open) $('mxDlg').showModal();
}
$('toMx').addEventListener('click', openMx);
$('mxClose').addEventListener('click', () => $('mxDlg').close());
$('mxDlg').addEventListener('click', e => { if (e.target === $('mxDlg')) $('mxDlg').close(); });
// set 97: "▶ ดูรีเพลย์" on the result = play THIS match again right away (display only, run state untouched)
$('replayThis').addEventListener('click', () => {
  if (!view.result) return;
  $('result').hidden = true; $('replayTag').hidden = false;
  view.speed = speed; view.load(view.result); resetLog(); placeRunes(...lastRunes); view.play();
});
MX_TABS.forEach((nm, i) => { const b = el('button', '', nm); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(i === mxTabSel)); b.addEventListener('click', () => mxSetTab(i)); $('mxTabs').append(b); });
function mxJump({ ev = null }) {
  $('logWho').value = ''; $('logProc').checked = false; $('logNoSet').checked = false;
  $('logBox').open = true; renderLog();
  const li = ev != null ? $('logList').querySelector(`li[data-ev="${ev}"]`) : null;
  if (li) { $('logList').querySelectorAll('.lg-hi').forEach(x => x.classList.remove('lg-hi')); li.classList.add('lg-hi'); li.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
}
// set 171 (C1): facts only · your side (side 0) · top 3 by damage dealt + the one who took the most damage
function renderRecap(res) {
  const box = $('recap'), us = ((res && res.units) || []).filter(u => u.side === 0);
  const top = us.filter(u => u.dealt > 0).sort((a, b) => b.dealt - a.dealt).slice(0, 3);
  if (!top.length) { box.hidden = true; box.replaceChildren(); return; }
  const nm = u => (CM[u.id] && CM[u.id].name) || u.id, max = top[0].dealt, fmt = n => Math.round(n).toLocaleString('en-US');
  const rows = top.map(u => {
    const c = CM[u.id], r = el('div', 'rrow'), n = el('span', 'rname'), bar = el('span', 'rbar'), fill = el('i');
    if (c && TRIBE_STYLE[c.tribe]) { n.append(tribeIco(c.tribe)); fill.style.setProperty('--tc', TRIBE_STYLE[c.tribe].color); }
    n.append(el('span', '', nm(u))); fill.style.width = Math.max(4, Math.round(u.dealt / max * 100)) + '%'; bar.append(fill);
    r.append(n, bar, el('span', 'rnum', fmt(u.dealt))); return r;
  });
  const tank = us.filter(u => u.taken > 0).sort((a, b) => b.taken - a.taken)[0];
  box.replaceChildren(el('h3', '', 'ทำดาเมจมากสุดในทีมคุณ'), ...rows);
  if (tank) { const p = el('p', 'rtank'); p.append(`รับดาเมจมากสุด: ${nm(tank)} `, el('b', '', fmt(tank.taken))); box.append(p); }
  box.hidden = false;
}
function finishMatch() {
  renderBInfo(true); $('replayTag').hidden = true;
  if (replayMode) { // ชุด 25: รีเพลย์ แสดงผลอย่างเดียว ไม่แตะสถานะ run
    const x = replayMode.x;
    $('resultTitle').textContent = `รีเพลย์รอบ ${x.r}: ${resTh(x.w)}`; $('resultTitle').className = 'small ' + resCls(x.w);
    $('resultSub').textContent = `${(x.t / 1000).toFixed(1)} วิ`;
    $('endMsgs').replaceChildren(); $('rChips').hidden = true; $('resultNext').textContent = ''; renderRecap(view.result);
    $('next').textContent = 'กลับ';
    $('result').hidden = false; return;
  }
  if (!pendingEnd) return;
  const { r, w } = pendingEnd; // ผลถูกนำไปใช้ตอนกดสู้แล้ว (ชุด 22) · ตรงนี้แสดงผลอย่างเดียว
  renderChips();
  // set 116 (mockup): big win/lose word · chips (hearts, wins, win-bonus gold) · messages · what comes next
  $('resultTitle').textContent = w === 0 ? 'ชนะ!' : w === 1 ? 'แพ้' : 'เสมอ'; $('resultTitle').className = resCls(w);
  $('resultSub').textContent = `รอบ ${P.round} · ${(lastResult.timeMs / 1000).toFixed(1)} วิ` + (w === 2 ? ' · เสมอนับเป็นชนะ' : '') + (dummyDmg ? ` · ดาเมจใส่หุ่นเป้า ${dummyDmg}` : '');
  $('rChips').hidden = false;
  $('rHeartsN').textContent = w === 1 ? (r.second ? `${P.hearts} (โอกาสสุดท้าย)` : `${P.hearts} (−1)`) : String(P.hearts); $('rHearts').setAttribute('aria-label', `หัวใจ ${P.hearts}${w === 1 ? ' เสียไป 1 ดวง' : ''}`);
  $('rWins').textContent = P.extra ? `ชนะ ${P.wins} · พิเศษ` : `ชนะ ${P.wins}/${S.winsToFinish}`;
  $('rGold').hidden = !(w !== 1 && S.winBonus && !P.over); $('rGoldN').textContent = `+${S.winBonus} โบนัสชนะ`;
  $('endMsgs').replaceChildren(...(r.msgs || []).map(m => el('li', '', m))); renderRecap(lastResult);
  const offer = !P.over && P.rn.offer;
  $('resultNext').textContent = P.over ? 'ต่อไป: สรุป run' : offer ? `ต่อไป: เลือกรูน 1 จาก ${offer.ids.length} ใบ` : 'ต่อไป: จัดทีมรอบถัดไป';
  $('next').textContent = P.over ? 'ดูสรุป run' : offer ? 'เลือกรูน →' : 'ไปรอบถัดไป';
  msgs = (r.msgs || []).map(t => ({ t }));
  $('result').hidden = false;
}
$('next').addEventListener('click', () => {
  if (replayMode) { const back = replayMode.back; replayMode = null; showScreen(back); if (back === 'prep') render(); else renderRunEnd(); return; }
  if (!pendingEnd) return; // set 98: only once per finished match
  pendingEnd = null; $('result').hidden = true;
  if (P.over) { renderRunEnd(); showScreen('runEnd'); return; }
  showScreen('prep'); beginRound();
});

