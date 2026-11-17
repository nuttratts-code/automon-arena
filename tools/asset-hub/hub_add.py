"""Claude's queue step (set 240, owner flow "ส่งงานให้ Claude" = cut frames + make the shadow).

Adds a frames sheet made by char-idle route P (painted_idle.py) to the hub as a round (by: claude) and sets the
creature's first shadow on it: feet guessed from frame 1 (bottom band of solid pixels), size = one frame, round = this
sheet. Oval / body-shadow numbers the owner already set are kept; a creature without a shadow gets the defaults.
Never stars anything (the owner picks).

Run:  python -I tools/asset-hub/hub_add.py <ID> <sheet.png> <ms> [--form 1] [--move idle] [--note "..."]
      (sheet name must contain sheet_<cols>x<rows>_<w>x<h>, as painted_idle.py writes it)
"""
import argparse, datetime, hashlib, json, os, re, shutil, sys
from PIL import Image

ROOT = os.environ.get('HUB_ROOT') or os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))  # HUB_ROOT = test copy only
HUB = os.path.join(ROOT, 'art', 'hub', 'hub.json')
FILES = os.path.join(ROOT, 'art', 'hub', 'files')
DEFAULT = {'oval': {'on': False, 'dx': 0, 'dy': 0, 'w': 0.8, 'h': 0.45, 'a': 1},
           'cast': {'len': 1, 'str': 0.5, 'ox': 0, 'oy': 0, 'blur': 0.3, 'k': None}}


def guess_feet(frame):
    """Same rule as the page's guessFeet: lowest solid row = ground line; x = middle between the leftmost and rightmost
    solid pixel in the bottom 12 % (a mean got pulled onto one big fist / tail, WN-1 set 240)."""
    a = frame.getchannel('A')
    w, h = frame.size
    px = a.load()
    bottom = -1
    for y in range(h - 1, -1, -1):
        if any(px[x, y] > 128 for x in range(w)):
            bottom = y
            break
    if bottom < 0:
        return [0.5, 1.0]
    band = max(2, round(h * 0.12))
    xs = [x for y in range(max(0, bottom - band), bottom + 1) for x in range(w) if px[x, y] > 128]
    return [round((min(xs) + max(xs) + 1) / 2 / w, 4), round((bottom + 1) / h, 4)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('item'); ap.add_argument('sheet'); ap.add_argument('ms', type=int)
    ap.add_argument('--form', type=int, default=1, choices=[1, 3]); ap.add_argument('--move', default='idle')
    ap.add_argument('--note', default='')
    o = ap.parse_args()
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]{0,39}', o.item) or not re.fullmatch(r'[A-Za-z0-9_-]{1,40}', o.move):
        sys.exit('bad item or move')
    m = re.search(r'sheet_(\d+)x(\d+)_(\d+)x(\d+)', os.path.basename(o.sheet))
    if not m:
        sys.exit('sheet name needs sheet_<cols>x<rows>_<w>x<h>')
    cols, rows, fw, fh = map(int, m.groups())
    img = Image.open(o.sheet).convert('RGBA')
    if img.size != (cols * fw, rows * fh):
        sys.exit(f'sheet is {img.size}, name says {cols * fw}x{rows * fh}')
    hub = json.load(open(HUB, encoding='utf-8'))
    it = hub['items'].get(o.item)
    if not it:
        sys.exit('no such item in hub.json')
    data = open(o.sheet, 'rb').read()
    h8 = hashlib.sha1(data).hexdigest()[:8]
    today = datetime.date.today().isoformat()
    name = f'frames_{o.move}_f{o.form}_{today}_{h8}.png'
    os.makedirs(os.path.join(FILES, o.item), exist_ok=True)
    dst = os.path.join(FILES, o.item, name)
    if not os.path.exists(dst):
        shutil.copyfile(o.sheet, dst)
    rid = 'r' + h8
    if not any(r['id'] == rid for r in it['rounds']):
        prompts = [p for p in it['prompts'] if (p.get('form') or 1) == o.form]
        it['rounds'].append({
            'id': rid, 'slot': 'frames', 'form': o.form, 'move': o.move, 'file': f'hub/{o.item}/{name}',
            'orig': os.path.basename(o.sheet), 't': datetime.datetime.utcnow().isoformat(timespec='milliseconds') + 'Z',
            'by': 'claude', 'note': o.note, 'star': False, 'archived': False,
            'licence': hub['settings'].get('licences', ['AI placeholder - UNVERIFIED'])[0],
            'promptId': prompts[-1]['id'] if prompts else None,
            'meta': {'cols': cols, 'rows': rows, 'fw': fw, 'fh': fh, 'n': cols * rows, 'ms': o.ms}})
    feet = guess_feet(img.crop((0, 0, fw, fh)))
    old = it.get('shadow') or {}
    it['shadow'] = {'feet': feet, 'oval': {**DEFAULT['oval'], **(old.get('oval') or {}), 'on': False},  # under-feet oval always off (owner rule)
                    'cast': {**DEFAULT['cast'], **(old.get('cast') or {})}, 'size': [fw, fh], 'round': rid}
    hub['rev'] = hub.get('rev', 0) + 1
    tmp = HUB + '.tmp'
    with open(tmp, 'w', encoding='utf-8', newline='\n') as f:
        f.write(json.dumps(hub, ensure_ascii=False, indent=1) + '\n')
    os.replace(tmp, HUB)
    print(f'hub: {o.item} + frames round {rid} ({cols * rows} × {fw}x{fh}, {o.ms} ms) · shadow feet {feet} on it · rev {hub["rev"]}')


if __name__ == '__main__':
    main()
