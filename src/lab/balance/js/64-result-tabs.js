// ---------- Set 125: ดูผล sub-tabs — one result section at a time instead of one long page ----------
// Each result block (#anaBot / #anaBoss / #anaRun) has children marked data-sec + data-label; a tab bar is built above them.
// The summary cards stay visible; the chosen tab per block is remembered in this browser.
const SEC_BLOCKS = ['anaBot', 'anaBoss', 'anaRun'];
function secShow(block, key) {
  const box = $(block); if (!box) return;
  const secs = [...box.querySelectorAll(':scope > [data-sec]')];
  if (!secs.some(x => x.dataset.sec === key)) key = secs[0] && secs[0].dataset.sec;
  for (const x of secs) x.hidden = x.dataset.sec !== key;
  for (const b of box.querySelectorAll(':scope > .rtabs button')) b.setAttribute('aria-selected', String(b.dataset.sec === key));
  { const bar = box.querySelector(':scope > .rtabs'), t = bar && bar.querySelector(`button[data-sec="${key}"]`); if (t && bar.scrollWidth > bar.clientWidth) bar.scrollLeft += t.getBoundingClientRect().left - bar.getBoundingClientRect().left - (bar.clientWidth - t.offsetWidth) / 2; } // set 161: keep the chosen sub-tab in view on phones
  try { localStorage.setItem('automon-balance-rsec-' + block, key); } catch (e) {}
}
function secBadge(block, key, text) {
  const b = document.querySelector(`#${block} > .rtabs button[data-sec="${key}"] .rt-badge`); if (!b) return;
  b.textContent = text; b.hidden = !text;
}
for (const block of SEC_BLOCKS) {
  const box = $(block), secs = [...box.querySelectorAll(':scope > [data-sec]')];
  const bar = el('div', 'tabs rtabs'); bar.setAttribute('role', 'tablist'); bar.setAttribute('aria-label', 'ส่วนของผล');
  for (const x of secs) {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.sec = x.dataset.sec; b.setAttribute('role', 'tab');
    const badge = el('span', 'rt-badge'); badge.hidden = true;
    b.append(x.dataset.label, badge);
    b.addEventListener('click', () => secShow(block, x.dataset.sec));
    bar.append(b);
  }
  box.insertBefore(bar, secs[0]);
  let keep = null; try { keep = localStorage.getItem('automon-balance-rsec-' + block); } catch (e) {}
  secShow(block, keep);
}
// summary cards jump to the section that explains them
function cardJump(card, block, key, before) {
  card.classList.add('jump'); card.tabIndex = 0; card.setAttribute('role', 'button');
  card.title = 'แตะเพื่อดูรายละเอียด';
  const go = () => { if (before) before(); secShow(block, key); $(block).querySelector(':scope > .rtabs').scrollIntoView({ block: 'start', behavior: 'smooth' }); };
  card.addEventListener('click', go); card.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go(); } });
}
function setRankShow(flag) {
  rankShowFlag = flag;
  for (const b of $('rankShow').children) b.setAttribute('aria-pressed', String((b.dataset.show === 'flag') === flag));
  renderResults();
}
for (const b of $('rankShow').children) b.addEventListener('click', () => setRankShow(b.dataset.show === 'flag'));
{ const c = $('cards').children;
  cardJump(c[0], 'anaBot', 'chars', () => setRankShow(true)); cardJump(c[1], 'anaBot', 'chars', () => setRankShow(true));
  cardJump(c[2], 'anaBot', 'tribes'); cardJump(c[3], 'anaBot', 'mx');
  for (const x of $('bossCards').children) cardJump(x, 'anaBoss', 'boss'); }
// set 161: arrow keys / Home / End move between tabs of any tab bar (WAI-ARIA tabs pattern) — every tab bar on this page is built from buttons with role=tab or inside role=tablist
document.addEventListener('keydown', ev => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(ev.key)) return;
  const cur = ev.target.closest && ev.target.closest('[role=tablist] > [role=tab]'); if (!cur) return;
  const all = [...cur.parentElement.querySelectorAll(':scope > [role=tab]')].filter(b => !b.hidden && !b.disabled && b.offsetParent !== null);
  const i = all.indexOf(cur); if (i < 0) return;
  const j = ev.key === 'Home' ? 0 : ev.key === 'End' ? all.length - 1 : (i + (ev.key === 'ArrowRight' ? 1 : -1) + all.length) % all.length;
  ev.preventDefault(); all[j].focus(); all[j].click();
});
