import sys, os, json, base64
root, chars_json, out, extra_json = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
T = os.path.join(root, 'releases/Nov-2015')
bad = set(l.strip().lstrip('- ').split('/')[-1] for l in open(os.path.join(root,'TILES_UNDER_UNKNOWN_LICENSE.md')) if '.png' in l)
idx = {}
for d,_,fs in os.walk(T):
  for f in fs:
    if f.endswith('.png'): idx.setdefault(f[:-4], os.path.join(d,f))
import importlib.util as _u
_sp=_u.spec_from_file_location('tables', os.path.join(os.path.dirname(os.path.abspath(__file__)),'tables.py')); _t=_u.module_from_spec(_sp); _sp.loader.exec_module(_t)
PICK, RUNES, BOSSES, SCENES = _t.PICK, _t.RUNES, _t.BOSSES, _t.SCENES
gidx = {}
for d,_,fs in os.walk(os.path.join(T,'gui')):
  for f in fs:
    if f.endswith('.png'): gidx.setdefault(f[:-4], os.path.join(d,f))
def icon(n):
  if '/' in n:
    p = os.path.join(T, n + '.png')
    if not os.path.exists(p): p = os.path.join(T, 'gui', n + '.png')
  else: p = gidx.get(n)
  if not p or not os.path.exists(p): raise SystemExit('missing icon: '+n)
  if os.path.basename(p)[:-4] in bad: raise SystemExit('unknown-licence icon: '+n)
  used.add(p); return 'data:image/png;base64,'+base64.b64encode(open(p,'rb').read()).decode()
UI = {'ทอง':'01','หัวใจ':'heart'}
used = set(); data = {}

def b64(n):
  if n in bad: raise SystemExit('unknown-licence tile: '+n)
  if n not in idx: raise SystemExit('missing tile: '+n)
  used.add(idx[n])
  return 'data:image/png;base64,'+base64.b64encode(open(idx[n],'rb').read()).decode()
img = {}
for k,v in PICK.items():
  for n in v.split(): img[n]=b64(n)
for _,_,opts in SCENES:
  for f,w in opts: img[f]=b64(f); img[w]=b64(w)
gold = os.path.join(T,'item/gold/01.png'); img['_gold']='data:image/png;base64,'+base64.b64encode(open(gold,'rb').read()).decode()
img['heart']=b64('heart')
for k,v in RUNES.items():
  for n in v.split(): img['r:'+n]=icon(n)
for k,v in BOSSES.items():
  for n in v.split(): img[n]=b64(n)
chars = json.load(open(chars_json)); extra = json.load(open(extra_json))
tpl = open(os.path.join(os.path.dirname(__file__),'picker_template.html'), encoding='utf-8').read()
payload = json.dumps({'img':img,'pick':{k:v.split() for k,v in PICK.items()},'chars':chars,'scenes':SCENES,'runePick':{k:['r:'+n for n in v.split()] for k,v in RUNES.items()},'bossPick':{k:v.split() for k,v in BOSSES.items()},'runes':extra['runes'],'bosses':extra['bosses']}, ensure_ascii=False)
open(out,'w',encoding='utf-8').write(tpl.replace('/*DATA*/null', payload))
print('tiles', len(img), 'bytes', os.path.getsize(out))
print('\n'.join(sorted(os.path.relpath(p,T) for p in used)), file=open(out+'.files.txt','w'))
