# char-idle B5a (set 223): find glow / spark spots in all frames and number them on one picture for the owner.
# usage: python -I fx_map.py <frames_dir> <out.png>   (frames_dir holds idle_0..7.png)
# Prints one line per spot: number, box x0,y0,x1,y1 (frame pixels), frames it shows in, typical colour.
import sys,numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
d,out=sys.argv[1],sys.argv[2]
fr=[np.array(Image.open(f'{d}/idle_{n}.png').convert('RGBA')).astype(int) for n in range(8)]
def glow(a):
  f=a[...,:3]/255.0;mx=f.max(2);mn=f.min(2);s=(mx-mn)/np.maximum(mx,1e-6)
  return (a[...,3]>0)&(mx>0.55)&(s>0.35)
masks=[glow(a) for a in fr];u=np.any(masks,axis=0)
lab,k=ndimage.label(ndimage.binary_dilation(u,iterations=2))
H,W=u.shape;S=6
bg=Image.new('RGBA',(W,H),(90,90,100,255));bg.alpha_composite(Image.fromarray(fr[0].astype(np.uint8)))
img=bg.resize((W*S,H*S),Image.NEAREST);dr=ImageDraw.Draw(img)
for i in range(1,k+1):
  ys,xs=np.nonzero((lab==i)&u)
  if len(ys)<2: continue
  x0,y0,x1,y1=xs.min(),ys.min(),xs.max(),ys.max()
  inf=[n for n in range(8) if masks[n][lab==i].any()]
  cols=np.concatenate([fr[n][(lab==i)&masks[n]][:,:3] for n in inf]);c=tuple(int(v) for v in np.median(cols,0))
  print(f'spot {i}: box {x0},{y0},{x1},{y1} frames {inf} colour {c} px {len(ys)}')
  dr.rectangle([x0*S-4,y0*S-4,(x1+1)*S+4,(y1+1)*S+4],outline=(255,0,0,255),width=3)
  dr.text((x0*S-4,y0*S-18),str(i),fill=(255,40,40,255))
img.save(out)
