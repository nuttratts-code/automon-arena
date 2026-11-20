"""Still batch → owner picks → hub (owner set 259: pick first, then the hub; keep every round's history).
  picker  python -I tools/asset-hub/still_batch.py picker <out.html> <batch_dir>...
          One local page: per batch the style input (eye check, security.md part 2) + 25 pictures; click = shortlist (D1),
          menu = which hub ID the batch belongs to; "คัดลอกผล" gives lines the owner pastes in chat.
          Keep <out.html> OUTSIDE the repo (it embeds the outside style input).
  add     python -I tools/asset-hub/still_batch.py add <ID> <batch_dir> --pick g00,g05 [--job J] [--seed N] [--style-src S]
          History (C1): every gNN.png + sheet.png + request.json → art/hub/files/<ID>/batches/<date>_<key>/ + batch.json.
          Each pick → still round (form 1, by claude, NOT starred — the owner stars in the hub).
A batch_dir = pixellab_still.py --out (g00..g24.png, sheet.png, request.json) + optional style.png (the style input,
never copied into the repo) + optional batch.json {tribe, job, seed, style_src}.
"""
import base64, datetime, glob, hashlib, html, json, os, re, shutil, sys

ROOT = os.environ.get('HUB_ROOT') or os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
HUB = os.path.join(ROOT, 'art', 'hub', 'hub.json')
FILES = os.path.join(ROOT, 'art', 'hub', 'files')
TRIBE_TH = {'steel': 'เหล็กกล้า', 'fire': 'เพลิงเผา', 'storm': 'สายฟ้า', 'wind': 'วายุ', 'spirit': 'ภูติ', 'demon': 'อสูร'}
ID_RE = r'[A-Za-z0-9][A-Za-z0-9_-]{0,39}'


def b64(p):
    return 'data:image/png;base64,' + base64.b64encode(open(p, 'rb').read()).decode()


def meta(d):
    p = os.path.join(d, 'batch.json')
    return json.load(open(p, encoding='utf-8')) if os.path.isfile(p) else {}


def picker(out, dirs):
    repo = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
    for r in {ROOT, repo}:
        try:
            inside = os.path.commonpath([os.path.abspath(out), r]) == r
        except ValueError:  # other drive
            inside = False
        if inside:
            sys.exit('write the picker outside the repo (it embeds the outside style input)')
    hub = json.load(open(HUB, encoding='utf-8'))
    items = [{'id': k, 'name': v.get('name') or '', 'tribe': v.get('tribe') or ''} for k, v in hub['items'].items()]
    batches = []
    for d in dirs:
        g = sorted(glob.glob(os.path.join(d, 'g[0-9][0-9].png')))
        if not g:
            sys.exit('no gNN.png in ' + d)
        m = meta(d)
        req = json.load(open(os.path.join(d, 'request.json'), encoding='utf-8'))
        st = os.path.join(d, 'style.png')
        batches.append({'key': os.path.basename(os.path.normpath(d)), 'tribe': m.get('tribe', ''), 'desc': req.get('description', ''),
                        'style': b64(st) if os.path.isfile(st) else '', 'styleSrc': m.get('style_src', ''),
                        'pics': [[os.path.basename(p)[:-4], b64(p)] for p in g]})
    page = TEMPLATE.replace('__DATA__', json.dumps({'items': items, 'batches': batches, 'tribeTh': TRIBE_TH}, ensure_ascii=False)
                            .replace('</', '<\\/'))
    open(out, 'w', encoding='utf-8').write(page)
    print('picker:', out, len(batches), 'batches')


def add(argv):
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument('item'); ap.add_argument('batch'); ap.add_argument('--pick', required=True)
    ap.add_argument('--job', default=''); ap.add_argument('--seed', default=''); ap.add_argument('--style-src', default='')
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
        name = f'still_f1_{today}_{h8}.png'
        rid = 'r' + h8
        open(os.path.join(FILES, o.item, name), 'wb').write(data)
        if any(r['id'] == rid for r in it['rounds']):
            continue
        it['rounds'].append({'id': rid, 'slot': 'still', 'form': 1, 'file': f'hub/{o.item}/{name}', 'orig': f'{key}_{p}.png',
                             't': datetime.datetime.utcnow().isoformat(timespec='milliseconds') + 'Z', 'by': 'claude',
                             'note': f'ชุดเจน {key} {p} (ตัวเต็ง · ประวัติ: {rel})', 'star': False, 'archived': False,
                             'licence': lic, 'meta': {'batch': rel, 'pick': p, 'styleSrc': m.get('style_src', '')}})
    hub['rev'] = hub.get('rev', 0) + 1
    tmp = HUB + '.tmp'
    with open(tmp, 'w', encoding='utf-8', newline='\n') as f:
        f.write(json.dumps(hub, ensure_ascii=False, indent=1) + '\n')
    os.replace(tmp, HUB)
    print(f'hub: {o.item} + {len(picks)} still round(s) from batch {key} · history {rel} ({len(src)} pictures) · rev {hub["rev"]}')


TEMPLATE = r'''<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>เลือกภาพจากชุดเจน</title><style>
:root{--bg:#2b2b33;--card:#3a3a44;--fg:#eee;--mut:#aab;--acc:#ffcf4a}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.4 system-ui,sans-serif;padding:16px}
h1{font-size:20px;margin:0 0 4px} .mut{color:var(--mut);font-size:13px}
.b{background:var(--card);border-radius:10px;padding:12px;margin:14px 0}
.top{display:flex;gap:14px;align-items:center;flex-wrap:wrap}
.ref{display:flex;flex-direction:column;align-items:center;font-size:12px;color:var(--mut)}
.ref img{image-rendering:pixelated;width:144px;height:144px;object-fit:contain;background:#55556a;border-radius:6px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-top:10px}
.p{position:relative;background:#55556a;border-radius:8px;cursor:pointer;border:3px solid transparent;padding:4px;text-align:center}
.p img{image-rendering:pixelated;width:100%;aspect-ratio:1;object-fit:contain}
.p span{font-size:12px;color:var(--mut)} .p.on{border-color:var(--acc)} .p.on::after{content:"★";position:absolute;top:2px;right:8px;color:var(--acc);font-size:20px}
select,button{font:inherit;padding:6px 10px;border-radius:6px;border:1px solid #667;background:#22222a;color:var(--fg)}
button{background:var(--acc);color:#222;border:0;font-weight:600;cursor:pointer}
textarea{width:100%;box-sizing:border-box;height:120px;background:#22222a;color:var(--fg);border:1px solid #667;border-radius:6px;font:13px monospace}
.desc{font-size:12px;color:var(--mut);max-width:620px}
</style></head><body>
<h1>เลือกภาพจากชุดเจน</h1><div class="mut">คลิกภาพ = ติ๊กเป็นตัวเต็ง (หลายภาพได้) · เลือกรหัสตัวละครของแต่ละชุด · ดูภาพต้นแบบสไตล์ซ้ายมือแล้วติ๊ก "ไม่เหมือนต้นแบบ" · เสร็จแล้วกด คัดลอกผล แล้ววางในแชท</div>
<div id="list"></div>
<div class="b"><button id="copy">คัดลอกผล</button> <span id="msg" class="mut"></span><textarea id="out" readonly></textarea></div>
<script>
const D=__DATA__;const KEY='stillpick:'+D.batches.map(b=>b.key).join(',');
let S={};try{S=JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){};render()};
const el=(t,a={},...k)=>{const e=document.createElement(t);Object.assign(e,a);k.forEach(x=>e.append(x));return e};
function build(){const L=document.getElementById('list');
 D.batches.forEach(b=>{const s=S[b.key]||(S[b.key]={id:'',pick:[],eye:false});
  const sel=el('select');sel.append(el('option',{value:'',textContent:'— รหัสตัวละคร —'}));
  const mine=D.items.filter(i=>!b.tribe||i.tribe===b.tribe),rest=D.items.filter(i=>b.tribe&&i.tribe!==b.tribe);
  mine.concat(rest).forEach(i=>sel.append(el('option',{value:i.id,textContent:i.id+' '+i.name+(i.tribe!==b.tribe&&b.tribe?' ('+(D.tribeTh[i.tribe]||i.tribe)+')':'')})));
  sel.value=s.id;sel.onchange=()=>{s.id=sel.value;save()};
  const eye=el('input',{type:'checkbox',checked:s.eye});eye.onchange=()=>{s.eye=eye.checked;save()};
  const top=el('div',{className:'top'});
  if(b.style)top.append(el('div',{className:'ref'},el('img',{src:b.style}),'ต้นแบบสไตล์ '+b.styleSrc));
  top.append(el('div',{},el('h2',{textContent:'เผ่า'+(D.tribeTh[b.tribe]||b.tribe)+' · '+b.key,style:'margin:0;font-size:17px'}),
   el('div',{className:'desc',textContent:b.desc}),el('p',{},sel),el('label',{},eye,' ดูแล้ว ไม่เหมือนต้นแบบ')));
  const g=el('div',{className:'grid'});
  b.pics.forEach(([n,src])=>{const p=el('div',{className:'p'},el('img',{src}),el('span',{textContent:n}));p.dataset.n=n;
   p.onclick=()=>{const i=s.pick.indexOf(n);i<0?s.pick.push(n):s.pick.splice(i,1);s.pick.sort();save()};g.append(p)});
  L.append(el('div',{className:'b',id:'b_'+b.key},top,g))});render()}
function render(){D.batches.forEach(b=>{const s=S[b.key];document.querySelectorAll('#b_'+CSS.escape(b.key)+' .p').forEach(p=>p.classList.toggle('on',s.pick.includes(p.dataset.n)))});
 document.getElementById('out').value='STILLPICK\n'+D.batches.map(b=>{const s=S[b.key];return b.key+' -> '+(s.id||'?')+' : '+(s.pick.join(',')||'-')+' · eye '+(s.eye?'ok':'no')}).join('\n')}
document.getElementById('copy').onclick=async()=>{const t=document.getElementById('out');try{await navigator.clipboard.writeText(t.value);document.getElementById('msg').textContent='คัดลอกแล้ว'}catch(e){t.select();document.getElementById('msg').textContent='กด Ctrl+C'}};
build();
</script></body></html>'''

if __name__ == '__main__':
    if len(sys.argv) >= 4 and sys.argv[1] == 'picker':
        picker(sys.argv[2], sys.argv[3:])
    elif len(sys.argv) >= 2 and sys.argv[1] == 'add':
        add(sys.argv[2:])
    else:
        sys.exit(__doc__)
