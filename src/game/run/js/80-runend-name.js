// ---------- หน้าจบ run (ชุด 22 · ผู้ใช้เลือก 4A+B+C) · ทุกข้อความใส่ด้วย textContent ----------
const nameOf = id => (CM[id] ? `${id} ${CM[id].name}` : id);
function renderRunEnd() {
  const won = P.wins >= S.winsToFinish, canExtra = won && !P.extra && P.hearts > 0 && P.round < (RUN_STAGE.settings.lastStage | 0);
  const allRounds = P.hearts > 0 && P.round >= (RUN_STAGE.settings.lastStage | 0); // set 108: max rounds played
  $('endTitle').textContent = allRounds ? `จบ run: เล่นครบ ${P.round} รอบ` : P.extra ? `จบแมตช์พิเศษ: ชนะรวม ${P.wins} ครั้ง` : won ? `จบ run: ชนะครบ ${S.winsToFinish} แมตช์` : 'จบ run: หัวใจหมด';
  $('endSummary').textContent = `ชนะ ${P.wins}/${S.winsToFinish} · หัวใจเหลือ ${P.hearts}/${S.hearts} · เล่น ${P.round} รอบ` + (dummyDmg ? ` · ดาเมจใส่หุ่นเป้า ${dummyDmg}` : '');
  // set 99 (user 6 Nov): a cleared run may go on with extra matches (hearts left · lose them all = game over)
  $('endExtra').hidden = !canExtra; $('endExtraHint').hidden = !canExtra; $('endNew').classList.toggle('primary', !canExtra); // set 159: one main button (extra matches first when offered)
  $('endExtraPct').textContent = String(RUN_STAGE.settings.foeExtraPct | 0); $('endExtraLast').textContent = String(RUN_STAGE.settings.lastStage | 0); // set 119 (G5): the warning sits on the เล่นต่อ button
  // set 106 (G5): final team as pictures, laid out like the board (หลัง กลาง หน้า × 2 lanes)
  const team = [];
  for (let lane = 0; lane < 2; lane++) for (const row of [2, 1, 0]) {
    const u = P.board[row][lane], card = el('div', 'ecard');
    if (u) {
      const perm = Object.entries(u.perm).filter(([, v]) => v > 0).map(([k, v]) => permText(k, v)).join(' · ');
      card.append(shapeOf(u.id, u.level), el('b', '', CM[u.id] ? CM[u.id].name : u.id), el('span', 'hint', `${u.id} · เลเวล ${u.level}`));
      if (perm) card.append(el('span', 'perm', 'ถาวร: ' + perm));
    } else card.classList.add('empty');
    team.push(card);
  }
  $('endTeam').replaceChildren(...(boardUnits(P).length ? team : [el('p', 'hint', 'ไม่มีตัวบนบอร์ด')]));
  const top = topDamage(stats), avg = stats.matches ? stats.timeMs / stats.matches / 1000 : 0;
  const ranked = Object.entries(stats.dmg).sort((a, b) => b[1] - a[1]).slice(0, 3);
  $('endStats').replaceChildren(
    el('li', '', `แมตช์ ${stats.matches} · ชนะ ${stats.w} · เสมอ ${stats.d} · แพ้ ${stats.l}`),
    el('li', '', `ชนะติดกันสูงสุด ${stats.best} แมตช์ · แมตช์ยาวเฉลี่ย ${avg.toFixed(1)} วิ`),
    el('li', '', top ? `ทำดาเมจสูงสุด: ${nameOf(top.id)} (${top.v})` : 'ยังไม่มีดาเมจ'),
    ...ranked.slice(1).map(([id, v], i) => el('li', '', `อันดับ ${i + 2}: ${nameOf(id)} (${v})`)));
  const hist = readHistory(store.get(HIST_KEY));
  $('endHistory').replaceChildren(...(hist.length ? hist.map(h => el('li', '',
    `${new Date(h.at).toLocaleDateString('th-TH')} · ${h.won ? 'ชนะครบ' : 'หัวใจหมด'} · ชนะ ${h.wins} · ${h.rounds} รอบ · ทีม ${h.team.map(u => `${u.id}★${u.level}`).join(' ') || '-'}${h.top ? ' · ดาเมจสูงสุด ' + h.top : ''}`))
    : [el('li', '', 'ยังไม่มีประวัติ')]));
  renderReplays($('endReplays'), 'runEnd');
}
$('endNew').addEventListener('click', () => startNewRun());
$('endExtra').addEventListener('click', () => {
  const r = J('ex', [], () => continueExtra(P)); if (!r.ok) return;
  if (clearAt) store.set(HIST_KEY, JSON.stringify(readHistory(store.get(HIST_KEY)).filter(h => h.at !== clearAt))); // the run's final entry is written when it really ends
  clearAt = 0; saveRun(); showScreen('prep'); beginRound(); pushMsgs(r); render();
});

// ---------- set 110 (user): player name before playing · remembered on this device · goes into the run journal + run code ----------
const NAME_KEY = 'automon-player-name-v1';
let playerName = rlName(store.get(NAME_KEY) || ''), nameThen = null;
function showName() { document.querySelectorAll('.pname').forEach(x => { x.textContent = playerName || '(ไม่มีชื่อ)'; }); }
function askName(then) {
  nameThen = then; $('nameIn').value = playerName; $('nameErr').hidden = true;
  $('nameScr').hidden = false; try { $('nameIn').focus(); } catch (e) { /* no focus */ }
}
$('nameForm').addEventListener('submit', ev => {
  ev.preventDefault();
  const nm = rlName($('nameIn').value);
  if (!nm) { $('nameErr').hidden = false; return; }
  setName(nm, true);
});
function setName(nm, mine) {
  playerName = nm; store.set(NAME_KEY, nm); showName();
  if (mine) nameSave(nm);
  if (RL) { RL.nm = nm; saveLog(true); } // a rename during a run goes on this run's journal too
  $('nameScr').hidden = true;
  const f = nameThen; nameThen = null; if (f) f();
}
// set 117 (user): the Claude app wipes localStorage when the app is killed → the name is also kept in the viewer's own private
// db doc data/users/<id>/profile (needs the `user` capability for id()). Viewers below Contributor cannot write it → localStorage only.
// A saved name that arrives while the name screen is still empty fills it in and continues by itself.
let nameDoc = null, nameWant = '';
function nameSave(nm) {
  nameWant = nm;
  if (nameDoc) { try { Promise.resolve(nameDoc.set({ nm, at: Date.now() })).catch(() => {}); } catch (e) { /* no write = localStorage only */ } }
}
(async () => {
  let u = null, id = null, db = null;
  try { u = window.claude && typeof window.claude.use === 'function' ? await window.claude.use('user') : null; } catch (e) { u = null; }
  try { id = u && typeof u.id === 'function' ? await u.id() : null; } catch (e) { id = null; }
  if (typeof id !== 'string' || !id || id.includes('/')) return;
  try { db = await window.claude.use('db'); } catch (e) { db = null; }
  if (!db) return;
  try { nameDoc = db.doc('data/users/' + id + '/profile'); } catch (e) { nameDoc = null; return; }
  let saved = '';
  try { const d = await nameDoc.get(), o = d && d.exists ? d.data() : null; saved = o && typeof o.nm === 'string' ? rlName(o.nm) : ''; } catch (e) { saved = ''; }
  if (nameWant) { if (saved !== nameWant) nameSave(nameWant); return; } // named on this device while the db loaded: that wins
  if (!saved) { if (playerName) nameSave(playerName); return; } // first time with the db: keep the device's name there too
  if (saved === playerName) return;
  if (!$('nameScr').hidden && nameThen && !$('nameIn').value.trim()) { setName(saved, false); return; } // still waiting on the first screen
  if ($('nameScr').hidden) { playerName = saved; store.set(NAME_KEY, saved); showName(); if (RL) { RL.nm = saved; saveLog(true); } }
})();
document.querySelectorAll('.nameEdit').forEach(b => b.addEventListener('click', () => askName(null)));
showName();
