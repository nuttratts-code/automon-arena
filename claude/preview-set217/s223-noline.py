# HL-1 idle (set 223): drop the outer dark outline (dark pixels touching transparency). usage: s223-noline.py in_dir out_dir
import sys,numpy as np
from PIL import Image
def strip(a):
  a=a.copy();op=a[...,3]>0;H,W=op.shape
  pad=np.pad(op,1,constant_values=False)
  edge=op&~(pad[:-2,1:-1]&pad[2:,1:-1]&pad[1:-1,:-2]&pad[1:-1,2:])  # touches transparency (4-neigh)
  dark=a[...,:3].astype(int).sum(2)<170
  m=edge&dark;a[m,3]=0;tot=m.sum()
  op=a[...,3]>0;pad=np.pad(op,1,constant_values=False)  # 2nd pass: thick spots, near-black only
  edge=op&~(pad[:-2,1:-1]&pad[2:,1:-1]&pad[1:-1,:-2]&pad[1:-1,2:])
  m=edge&(a[...,:3].astype(int).sum(2)<110);a[m,3]=0
  return a,tot+m.sum()
if __name__=='__main__':
  i,o=sys.argv[1],sys.argv[2];fr=[]
  for n in range(8):
    a,k=strip(np.array(Image.open(f'{i}/idle_{n}.png').convert('RGBA')));print(n,'removed',k)
    f=Image.fromarray(a);f.save(f'{o}/idle_{n}.png');fr.append(f)
  sh=Image.new('RGBA',(768,81))
  for n,f in enumerate(fr): sh.paste(f,(n*96,0))
  sh.save(f'{o}/HL-1_idle8_sheet_8x1_96x81.png')
  fr[0].save(f'{o}/HL-1_idle8_anim.png',save_all=True,append_images=fr[1:],duration=190,loop=0)
