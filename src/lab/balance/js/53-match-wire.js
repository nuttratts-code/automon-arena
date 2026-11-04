// ---------- Balance Room-only wiring of the match tab (set 84: split from 51 so the game page can include 50 + 51) ----------
$('mxLogQ').addEventListener('input', () => mxLogApply());
$('mxLogCopy').addEventListener('click', async () => {
  const txt = mxLogText(), msg = $('mxLogCount');
  try { await navigator.clipboard.writeText(txt); if (msg) msg.textContent = `คัดลอก ${txt.split('\n').length} บรรทัดแล้ว`; }
  catch (e) { if (msg) msg.textContent = 'คัดลอกไม่ได้ในหน้านี้ — เลือกข้อความเองได้'; }
});
// ย้ายตารางสรุปรายตัวมาเป็น "มุมมองตาราง" ของส่วนรายตัว (ไม่ซ้ำซ้อนกับ folded section อีก)
(() => { const fold = $('simSumFold'); if (fold) { const tbl = fold.querySelector('.tbl'); if (tbl) $('mxTableBox').append(tbl); fold.remove(); } })();
$('mxGoSim').addEventListener('click', () => showTab('sim'));
$('toMatch').addEventListener('click', () => { showTab('match'); $('editor').scrollIntoView({ block: 'start', behavior: 'smooth' }); });

