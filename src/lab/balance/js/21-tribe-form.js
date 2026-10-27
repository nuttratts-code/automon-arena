// ---------- ฟอร์มเผ่า ----------
function renderTribeForm() {
  const box = $('tform'); box.replaceChildren();
  for (const t of Object.keys(tribes)) {
    const g = document.createElement('div'); g.className = 'grid3'; g.dataset.tribe = t; g.hidden = !$('pane-tribes').hidden && t !== tribeSel;
    const th = cell(t, 'h'); th.prepend(tribeBadge(t));
    g.append(th, cell('ขั้น 2', 'h'), cell('ขั้น 4', 'h'), cell('ขั้น 6', 'h'));
    for (const k of Object.keys(tribes[t])) {
      g.append(cell(TRIBE_LABEL[k] || k));
      for (let s = 0; s < 3; s++) g.append(numInput(`t-${t}-${k}-${s}`, tribes[t][k][s], BASE_TRIBES[t][k][s], v => {
        tribes[t][k][s] = k === 'every' ? Math.max(1, Math.round(v)) : v; refreshDirty();
      }));
    }
    box.append(g);
  }
}

