# HL-1 idle (set 223): crisp 2-row eye line (frame-4 style) + no black rim on loose sparks. usage: s223-eyeline.py in_dir out_dir
import sys,numpy as np
from PIL import Image
O=(11,9,49)
def fill(a,m):  # replace masked pixels with the median-luminance unmasked 8-neighbour
  a=a.copy();m=m.copy()
  for _ in range(6):
    if not m.any(): break
    nm=m.copy()
    for y,x in zip(*np.nonzero(m)):
      ns=[a[yy,xx,:3] for yy in range(y-1,y+2) for xx in range(x-1,x+2) if not m[yy,xx] and a[yy,xx,3]>0 and (yy,xx)!=(y,x)]
      if len(ns)>=3: ns=np.array(ns);a[y,x,:3]=ns[np.argsort(ns.sum(1))[len(ns)//2]];nm[y,x]=False
    m=nm
  return a
def eye(a,W,B):
  r,g,b=a[...,0],a[...,1],a[...,2];reg=np.zeros(r.shape,bool);reg[8:23,40:64]=True;reg&=a[...,3]>0
  glow=reg&(b-r>40)&(b>90);hot=reg&(b-r>60)&(b>150)
  y0=int(np.argmax(hot.sum(1)));c=int(round(np.nonzero(hot)[1].mean()))
  x0,x1=c-4,c+3  # fixed 8 px, centred on the old glow
  dark=np.array([20,18,52]);a=fill(a,glow)
  for x in range(x0-1,x1+2): a[y0-1,x,:3]=dark;a[y0+2,x,:3]=dark  # visor slot above/below
  a[y0,x0-1,:3]=dark;a[y0,x1+1,:3]=dark;a[y0+1,x0-1:x0+1,:3]=dark;a[y0+1,x1:x1+2,:3]=dark
  for x in range(x0,x1+1): a[y0,x,:3]=W if x0+2<=x<=x1-2 else B
  for x in range(x0+1,x1): a[y0+1,x,:3]=B
  return a
def sparks(a,W):
  H,Wd=a.shape[:2];isO=lambda y,x: a[y,x,3]>0 and tuple(a[y,x,:3])==O
  for y in range(1,H-1):
    for x in range(1,Wd-1):
      if a[y,x,3] and not isO(y,x) and a[y,x,:3].sum()>350 and sum(isO(*p) for p in [(y-1,x),(y+1,x),(y,x-1),(y,x+1)])>=3:
        a[y,x,:3]=W
        for yy in range(y-1,y+2):
          for xx in range(x-1,x+2):
            if (yy,xx)!=(y,x) and isO(yy,xx):
              body=[(v,u) for v in range(yy-1,yy+2) for u in range(xx-1,xx+2) if (v,u) not in((yy,xx),(y,x)) and a[v,u,3]>0 and not isO(v,u)]
              if not body: a[yy,xx,3]=0
  return a
if __name__=='__main__':
  i,o=sys.argv[1],sys.argv[2];ref=np.array(Image.open(f'{i}/idle_4.png').convert('RGBA')).astype(int)
  W=ref[15,50,:3].copy();B=ref[16,52,:3].copy();print('W',W,'B',B)
  for n in range(8):
    a=np.array(Image.open(f'{i}/idle_{n}.png').convert('RGBA')).astype(int)
    a=sparks(eye(a,W,B),W);Image.fromarray(a.astype(np.uint8)).save(f'{o}/idle_{n}.png')
