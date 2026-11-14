# remove cyan hand-lightning from HL-1 idle frames (set 223). usage: dezap.py in_dir out_dir
import sys,numpy as np
from PIL import Image
from scipy import ndimage
def mask(a):
  f=a[...,:3].astype(int);r,g,b=f[...,0],f[...,1],f[...,2]
  reg=np.zeros(r.shape,bool);reg[20:62,56:96]=True;reg&=a[...,3]>0
  ratio=(g-r)/np.maximum(b-r,1)
  m=reg&(((ratio>0.58)&(b-r>12)&(np.maximum(g,b)>55))|((b>130)&(b-r>25)&(g-r>25)))
  m|=ndimage.binary_dilation(m)&reg&(ratio>0.52)&(b-r>12)
  return m
def fill(a,m):
  a=a.copy();m=m.copy()
  while m.any():
    nm=m.copy()
    for y,x in zip(*np.nonzero(m)):
      ns=[a[yy,xx,:3].astype(int) for yy in range(y-1,y+2) for xx in range(x-1,x+2)
          if (yy,xx)!=(y,x) and 0<=yy<a.shape[0] and 0<=xx<a.shape[1] and not m[yy,xx] and a[yy,xx,3]>0]
      if len(ns)>=3:
        ns=np.array(ns);lum=ns.sum(1);k=np.argsort(lum)[len(lum)//2];a[y,x,:3]=ns[k];nm[y,x]=False
    if (nm==m).all(): break
    m=nm
  return a
if __name__=='__main__':
  i,o=sys.argv[1],sys.argv[2]
  for n in range(8):
    a=np.array(Image.open(f'{i}/idle_{n}.png').convert('RGBA'));m=mask(a)
    Image.fromarray(fill(a,m)).save(f'{o}/idle_{n}.png');print(n,m.sum())
