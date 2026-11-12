# white background -> alpha, split sprite sheets into pieces by empty columns/rows, trim, save PNG
import sys, numpy as np
from PIL import Image
U='/root/.claude/uploads/41c20c69-c65f-56a9-a534-d11c84cb8256/'
OUT=sys.argv[1]
def key(path, lo=18, hi=60):
    a=np.asarray(Image.open(path).convert('RGB')).astype(np.float32)
    d=255-a.min(axis=2)  # how far from white
    al=np.clip((d-lo)/(hi-lo),0,1)
    rgb=a.copy()
    m=al>0.02
    for c in range(3):
        rgb[...,c][m]=np.clip((a[...,c][m]-(1-al[m])*255)/al[m],0,255)
    return np.dstack([rgb,al*255]).astype(np.uint8)
def runs(mask):  # list of (start,end) where mask True
    r=[];s=None
    for i,v in enumerate(mask):
        if v and s is None: s=i
        if not v and s is not None: r.append((s,i)); s=None
    if s is not None: r.append((s,len(mask)))
    return r
def trim(x):
    al=x[...,3]>8; ys=np.where(al.any(1))[0]; xs=np.where(al.any(0))[0]
    return x[ys[0]:ys[-1]+1, xs[0]:xs[-1]+1]
def save(x,name,maxh=512):
    im=Image.fromarray(trim(x)); 
    if im.height>maxh: im=im.resize((round(im.width*maxh/im.height),maxh),Image.LANCZOS)
    im.save(f'{OUT}/{name}.png'); print(name,im.size)
def split(x,prefix,minw=60):
    al=x[...,3]>8
    rows=[r for r in runs(al.any(1)) if r[1]-r[0]>minw]
    n=0
    for (y0,y1) in rows:
        band=x[y0:y1]
        for (x0,x1) in [r for r in runs((band[...,3]>8).any(0)) if r[1]-r[0]>minw]:
            save(band[:,x0:x1],f'{prefix}{n}'); n+=1
save(key(U+'a4ac1536-image.jpg'),'stone_tall')
save(key(U+'cccdfde4-image.jpg'),'stone_fallen')
save(key(U+'f98aa211-image.jpg'),'rock')
save(key(U+'cbcf9418-image.jpg'),'grass_big')
save(key(U+'e178572d-image.jpg'),'plaza_side',1024)
split(key(U+'e2124640-image.jpg'),'stone')
split(key(U+'3483302e-image.jpg'),'grass')
# backdrop: only the white sky becomes clear; keep full size
b=key(U+'acec77b0-image.jpg',8,40); Image.fromarray(b).save(f'{OUT}/backdrop.png'); print('backdrop',b.shape)
