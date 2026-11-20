"""Still batch → owner picks → hub (owner set 259: pick first, then the hub; keep every round's history).
  picker  moved to the hub server (owner A2, set 260): http://127.0.0.1:5177/pick — batches from STILL_BATCHES
          (default D:/GitHub/automon-scratch/still-batches, outside the repo); every click saves art/hub/stillpicks/latest.json
          + one history.jsonl line per change, so Claude reads the picks (no paste).
  add     python -I tools/asset-hub/still_batch.py add <ID> <batch_dir> --pick g00,g05 [--job J] [--seed N] [--style-src S]
          History (C1): every gNN.png + sheet.png + request.json → art/hub/files/<ID>/batches/<date>_<key>/ + batch.json.
          Each pick → still round (form from batch.json `form` or --form, default 1; by claude, NOT starred — the owner stars in the hub).
          A batch made for one creature (batch.json `item`, set 265) must be added to that item.
A batch_dir = pixellab_still.py --out (g00..g24.png, sheet.png, request.json) + optional style.png (the style input,
never copied into the repo) + optional batch.json {tribe, job, seed, style_src}.
"""
import datetime, glob, hashlib, json, os, re, shutil, sys

ROOT = os.environ.get('HUB_ROOT') or os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
HUB = os.path.join(ROOT, 'art', 'hub', 'hub.json')
FILES = os.path.join(ROOT, 'art', 'hub', 'files')
ID_RE = r'[A-Za-z0-9][A-Za-z0-9_-]{0,39}'


def meta(d):
    p = os.path.join(d, 'batch.json')
    return json.load(open(p, encoding='utf-8')) if os.path.isfile(p) else {}


def add(argv):
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument('item'); ap.add_argument('batch'); ap.add_argument('--pick', required=True)
    ap.add_argument('--job', default=''); ap.add_argument('--seed', default=''); ap.add_argument('--style-src', default='')
    ap.add_argument('--form', type=int, choices=(1, 3))
    o = ap.parse_args(argv)
    if not re.fullmatch(ID_RE, o.item):
        sys.exit('bad item')
    picks = [p.strip() for p in o.pick.split(',') if p.strip()]
    if not picks or not all(re.fullmatch(r'g\d\d', p) for p in picks):
        sys.exit('--pick = g00,g05 …')
    hub = json.load(open(HUB, encoding='utf-8'))
    it = hub['items'].get(o.item)
    if not it:
        sys.exit('no such item in hub.json')
    src = sorted(glob.glob(os.path.join(o.batch, 'g[0-9][0-9].png')))
    missing = [p for p in picks if not os.path.isfile(os.path.join(o.batch, p + '.png'))]
    if not src or missing:
        sys.exit('missing pictures: %s' % (missing or 'gNN.png'))
    if meta(o.batch).get('item') not in (None, '', o.item):
        sys.exit('batch is for %s, not %s' % (meta(o.batch)['item'], o.item))
    form = o.form or (3 if meta(o.batch).get('form') == 3 else 1)
    m = {**meta(o.batch), **{k: v for k, v in (('job', o.job), ('seed', o.seed), ('style_src', o.style_src)) if v}}
    today = datetime.date.today().isoformat()
    key = (m.get('job') or hashlib.sha1(open(src[0], 'rb').read()).hexdigest())[:8]
    rel = f'batches/{today}_{key}'
    hist = os.path.join(FILES, o.item, *rel.split('/'))
    os.makedirs(hist, exist_ok=True)
    for f in src + [os.path.join(o.batch, n) for n in ('sheet.png', 'request.json') if os.path.isfile(os.path.join(o.batch, n))]:
        shutil.copy2(f, hist)  # style.png (outside input) is never copied (C4)
    m.update({'picks': sorted(set(picks + json.load(open(os.path.join(hist, 'batch.json'), encoding='utf-8')).get('picks', [])))
              if os.path.isfile(os.path.join(hist, 'batch.json')) else picks, 'item': o.item, 'date': today})
    json.dump(m, open(os.path.join(hist, 'batch.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    lic = hub['settings'].get('licences', ['AI placeholder - UNVERIFIED'])[0]
    for p in picks:
        data = open(os.path.join(o.batch, p + '.png'), 'rb').read()
        h8 = hashlib.sha1(data).hexdigest()[:8]
        name = f'still_f{form}_{today}_{h8}.png'
        rid = 'r' + h8
        open(os.path.join(FILES, o.item, name), 'wb').write(data)
        if any(r['id'] == rid for r in it['rounds']):
            continue
        it['rounds'].append({'id': rid, 'slot': 'still', 'form': form, 'file': f'hub/{o.item}/{name}', 'orig': f'{key}_{p}.png',
                             't': datetime.datetime.utcnow().isoformat(timespec='milliseconds') + 'Z', 'by': 'claude',
                             'note': ('ร่าง 3 · ' if form == 3 else '') + f'ชุดเจน {key} {p} (ตัวเต็ง · ประวัติ: {rel})', 'star': False, 'archived': False,
                             'licence': lic, 'meta': {'batch': rel, 'pick': p, 'styleSrc': m.get('style_src', '')}})
    hub['rev'] = hub.get('rev', 0) + 1
    tmp = HUB + '.tmp'
    with open(tmp, 'w', encoding='utf-8', newline='\n') as f:
        f.write(json.dumps(hub, ensure_ascii=False, indent=1) + '\n')
    os.replace(tmp, HUB)
    print(f'hub: {o.item} + {len(picks)} still round(s) from batch {key} · history {rel} ({len(src)} pictures) · rev {hub["rev"]}')


if __name__ == '__main__':
    if len(sys.argv) >= 2 and sys.argv[1] == 'picker':
        sys.exit('the picker moved to the hub server (set 260): node tools/asset-hub/server.mjs -> http://127.0.0.1:5177/pick')
    elif len(sys.argv) >= 2 and sys.argv[1] == 'add':
        add(sys.argv[2:])
    else:
        sys.exit(__doc__)
