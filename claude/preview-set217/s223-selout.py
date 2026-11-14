# HL-1 idle (set 223, owner A1): sel-out = the outer dark outline takes a darker shade of the part it wraps,
# lighter on the lit side (light from the top-left), darker on the shadow side. usage: s223-selout.py in_dir out_dir
import sys,numpy as np
from PIL import Image
LIT,SHADE=0.78,0.48
def outline_mask(a):
  op=a[...,3]>0;dark=a[...,:3].astype(int).sum(2)<170
  pad=np.pad(op,1,constant_values=False)
  edge=op&~(pad[:-2,1:-1]&pad[2:,1:-1]&pad[1:-1,:-2]&pad[1:-1,2:])
  m=edge&dark
  # thick spots: a near-black pixel next to an outline pixel and next to transparency diagonally/2 px out
  m2=op&~m&(a[...,:3].astype(int).sum(2)<110)
  mp=np.pad(m,1);near=mp[:-2,1:-1]|mp[2:,1:-1]|mp[1:-1,:-2]|mp[1:-1,2:]
  return m|(m2&near)
def selout(a):
  a=a.copy();m=outline_mask(a);H,W=m.shape;op=a[...,3]>0
  inner=op&~m&(a[...,:3].astype(int).sum(2)>=170)
  src=a[...,:3].astype(float)
  for y,x in zip(*np.nonzero(m)):
    best=None
    for r in (1,2,3):
      ys=slice(max(0,y-r),min(H,y+r+1));xs=slice(max(0,x-r),min(W,x+r+1))
      cs=src[ys,xs][inner[ys,xs]]
      if len(cs): best=np.median(cs,axis=0);break
    if best is None: continue
    lit=(y==0 or not op[y-1,x]) or (x==0 or not op[y,x-1])
    a[y,x,:3]=np.clip(best*(LIT if lit else SHADE),0,255).astype(np.uint8)
  return a,m.sum()
if __name__=='__main__':
  i,o=sys.argv[1],sys.argv[2];fr=[]
  for n in range(8):
    a,k=selout(np.array(Image.open(f'{i}/idle_{n}.png').convert('RGBA')));print(n,k,end=' | ')
    f=Image.fromarray(a);f.save(f'{o}/idle_{n}.png');fr.append(f)
  sh=Image.new('RGBA',(768,81))
  for n,f in enumerate(fr): sh.paste(f,(n*96,0))
  sh.save(f'{o}/HL-1_idle8_sheet_8x1_96x81.png')
  fr[0].save(f'{o}/HL-1_idle8_anim.png',save_all=True,append_images=fr[1:],duration=190,loop=0)
