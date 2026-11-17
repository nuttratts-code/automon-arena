"""Claude's queue step for task "check+veo" (owner flow set 240: still → Claude checks → cut + Veo input + Veo prompt).

Claude looks at the still first (art-style rules, char-idle P1). Then:
  pass:  python -I tools/asset-hub/veo_prep.py pass <queue-id> --veo-prompt <file> --reply <file> [--dry <out_dir>]
         cut the still (char-idle P2 key, green or magenta picked from the border) → round slot "cut";
         cut × (0.55 · 720 px tall) centred on 1280×720 flat green/magenta → round slot "veoin";
         Veo prompt → items[ID].prompts (kind "veo", form) — the page shows it in step 4 next to the picture;
         queue item → done, result "pass", reply.
         --dry <dir> = only write cut_check.png (cut on the opposite key colour, ~700 px) + veoin.png there, no hub change.
  fail:  python -I tools/asset-hub/veo_prep.py fail <queue-id> --reply <file> [--gemini-prompt <file>]
         queue item → done, result "fail", reply (reasons); fixed Gemini prompt → new still prompt version (owner B1).
Never stars anything (the owner picks). HUB_ROOT env = test copy only.
"""
import argparse, datetime, hashlib, io, json, os, sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = os.environ.get('HUB_ROOT') or os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
HUB = os.path.join(ROOT, 'art', 'hub', 'hub.json')
FILES = os.path.join(ROOT, 'art', 'hub', 'files')
GREEN, MAGENTA = (0, 255, 0), (255, 0, 255)


def now():
    return datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'


def cut(img):
    """char-idle P2: key alpha from how 'background' a pixel is, keep the largest blob, despill, 3 px min-filter, crop."""
    x = np.asarray(img.convert('RGB')).astype(float)
    border = np.concatenate([x[:8].reshape(-1, 3), x[-8:].reshape(-1, 3), x[:, :8].reshape(-1, 3), x[:, -8:].reshape(-1, 3)])
    r_, g_, b_ = np.median(border, axis=0)
    mag = g_ < min(r_, b_)
    r, g, b = x[..., 0], x[..., 1], x[..., 2]
    gx = (np.minimum(r, b) - g) if mag else (g - np.maximum(r, b))
    al = np.clip(1 - (gx - 8) / 20, 0, 1)
    lab, n = ndimage.label(al > 0.5)
    if n == 0:
        sys.exit('cut: nothing left after keying')
    s = ndimage.sum(np.ones_like(al), lab, range(1, n + 1))
    al = al * ndimage.binary_dilation(lab == 1 + int(np.argmax(s)), iterations=3)
    if mag:
        x[..., 0] = np.minimum(r, np.maximum(g, b) * 1.05); x[..., 2] = np.minimum(b, np.maximum(g, r) * 1.05)
    else:
        x[..., 1] = np.minimum(g, np.maximum(r, b) * 1.05)
    A = Image.fromarray((al * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3))
    o = Image.fromarray(x.astype(np.uint8)); o.putalpha(A)
    return o.crop(o.getbbox()), mag


def padded(c, mag):
    """Veo input: cut scaled to 0.55 × 720 px tall (narrower if very wide), centred on 1280×720 flat key colour."""
    h = round(0.55 * 720)
    w = round(c.width * h / c.height)
    if w > 1280 * 0.7:
        w = round(1280 * 0.7); h = round(c.height * w / c.width)
    bg = Image.new('RGBA', (1280, 720), (*(MAGENTA if mag else GREEN), 255))
    bg.alpha_composite(c.resize((w, h), Image.LANCZOS), ((1280 - w) // 2, (720 - h) // 2))
    return bg.convert('RGB')


def png_bytes(im):
    b = io.BytesIO(); im.save(b, 'PNG'); return b.getvalue()


def add_round(hub, it, item, slot, form, data, note, src_id):
    h8 = hashlib.sha1(data).hexdigest()[:8]
    name = f'{slot}_f{form}_{datetime.date.today().isoformat()}_{h8}.png'
    os.makedirs(os.path.join(FILES, item), exist_ok=True)
    dst = os.path.join(FILES, item, name)
    if not os.path.exists(dst):
        open(dst, 'wb').write(data)
    rid = 'r' + h8
    if not any(r['id'] == rid for r in it['rounds']):
        prompts = [p for p in it['prompts'] if (p.get('form') or 1) == form and p.get('kind') != 'veo']
        it['rounds'].append({'id': rid, 'slot': slot, 'form': form, 'file': f'hub/{item}/{name}', 'orig': name, 't': now(),
                             'by': 'claude', 'note': note, 'star': False, 'archived': False, 'from': src_id,
                             'licence': hub['settings'].get('licences', ['AI placeholder - UNVERIFIED'])[0],
                             'promptId': prompts[-1]['id'] if prompts else None})
    return rid


def read_text(p):
    t = open(p, encoding='utf-8').read().strip()
    if not t:
        sys.exit(f'{p} is empty')
    return t[:8000]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('mode', choices=['pass', 'fail']); ap.add_argument('queue')
    ap.add_argument('--reply', required=True); ap.add_argument('--veo-prompt'); ap.add_argument('--gemini-prompt'); ap.add_argument('--dry')
    o = ap.parse_args()
    hub = json.load(open(HUB, encoding='utf-8'))
    q = next((x for x in hub['queue'] if x['id'] == o.queue), None)
    if not q or q.get('task') != 'check+veo':
        sys.exit('no check+veo queue item with that id')
    it = hub['items'][q['item']]
    form = q.get('form') or 1
    still = next((r for r in it['rounds'] if r['id'] == q.get('still')), None)
    if not still:
        sys.exit('queue item has no still round')
    reply = read_text(o.reply)
    if o.mode == 'pass':
        if not o.veo_prompt:
            sys.exit('pass needs --veo-prompt')
        src = os.path.join(FILES, still['file'].split('/', 1)[1]) if still['file'].startswith('hub/') else os.path.join(ROOT, 'art', 'library', still['file'].split('/', 1)[1])
        c, mag = cut(Image.open(src))
        v = padded(c, mag)
        if o.dry:
            os.makedirs(o.dry, exist_ok=True)
            k = c.copy(); s = 700 / max(k.size); k = k.resize((round(k.width * s), round(k.height * s)), Image.LANCZOS)
            chk = Image.new('RGBA', k.size, (*(GREEN if mag else MAGENTA), 255)); chk.alpha_composite(k)
            chk.convert('RGB').save(os.path.join(o.dry, 'cut_check.png')); v.save(os.path.join(o.dry, 'veoin.png'))
            print('dry:', os.path.join(o.dry, 'cut_check.png'), '· bg', 'magenta' if mag else 'green', '· cut', c.size)
            return
        cid = add_round(hub, it, q['item'], 'cut', form, png_bytes(c), 'Claude ตัดพื้นจากภาพนิ่งที่ตรวจผ่าน', still['id'])
        vid = add_round(hub, it, q['item'], 'veoin', form, png_bytes(v), 'อัปโหลดภาพนี้เข้า Veo (ไม่ใช่ภาพต้นฉบับ)', still['id'])
        it['prompts'].append({'id': 'pv' + hashlib.sha1((now() + q['id']).encode()).hexdigest()[:8], 't': now(), 'by': 'claude', 'form': form,
                              'kind': 'veo', 'still': still['id'], 'text': read_text(o.veo_prompt)})
        q.update(state='done', result='pass', done=datetime.date.today().isoformat(), reply=reply, round=vid)
        msg = f'pass: cut {cid} · veoin {vid} · veo prompt added'
    else:
        if o.gemini_prompt:
            it['prompts'].append({'id': 'pg' + hashlib.sha1((now() + q['id']).encode()).hexdigest()[:8], 't': now(), 'by': 'claude', 'form': form,
                                  'text': read_text(o.gemini_prompt)})
        q.update(state='done', result='fail', done=datetime.date.today().isoformat(), reply=reply)
        msg = 'fail: reply' + (' + new Gemini prompt' if o.gemini_prompt else '')
    hub['rev'] = hub.get('rev', 0) + 1
    tmp = HUB + '.tmp'
    with open(tmp, 'w', encoding='utf-8', newline='\n') as f:
        f.write(json.dumps(hub, ensure_ascii=False, indent=1) + '\n')
    os.replace(tmp, HUB)
    print(f'hub: {q["item"]} {msg} · rev {hub["rev"]}')


if __name__ == '__main__':
    main()
