# eye_recolour.py <out_dir> <in_dir> - recolour the eye whites/iris to light blue (hue 0.56) in 8 idle frames.
# L/R = eye pixel rows of FRAME 0 (WY-1 set 225 constants: set them from a hex dump of frame 0 for another character);
# each frame's head offset is found by matching dark pixels in the face box (22:42, 46:74).
import numpy as np, colorsys, sys
from PIL import Image
from scipy import ndimage
L={28:[51,52,53],29:[51,52,53,54,55],30:[51,52,53,54,55,56],31:[51,52,53,54,55,56,57],32:[52,53,54,55,56,57],33:[53,54,55,56]}
R={28:[68,69],29:[68,69,70],30:[67,68,69,70],31:[67,68,69,70,71],32:[66,67,68,69,70],33:[67,68,69,70]}
base=np.zeros((90,93),bool)
for d in (L,R):
    for y,xs in d.items(): base[y,xs]=True
def lum(a): return 0.3*a[...,0]+0.59*a[...,1]+0.11*a[...,2]
fr=[np.array(Image.open(f'{sys.argv[2]}/idle_{i}.png').convert('RGBA')) for i in range(8)]
ref=(lum(fr[0].astype(float))<80)[22:42,46:74]
out=[];shifts=[]
for i,a in enumerate(fr):
    d=lum(a.astype(float))<80
    best=None
    for dy in range(-4,5):
        for dx in range(-4,5):
            s=d[22+dy:42+dy,46+dx:74+dx]
            sc=(s&ref).sum()-0.5*(s^ref).sum()
            if best is None or sc>best[0]: best=(sc,dy,dx)
    _,dy,dx=best; shifts.append((dy,dx))
    m=np.roll(np.roll(base,dy,0),dx,1)
    m=ndimage.binary_dilation(m)  # allow 1px shape drift
    f=a.astype(int); r,g,b=f[...,0],f[...,1],f[...,2]
    m&=(lum(f)>110)&~((g-r>35)&(g-b>15))&(f[...,3]>0)
    for y,x in zip(*np.where(m)):
        h,s,v=colorsys.rgb_to_hsv(*(f[y,x,:3]/255))
        s=min(0.75,max(s*1.3,0.28)); 
        rr,gg,bb=colorsys.hsv_to_rgb(0.56,s,v)
        a[y,x,:3]=[round(rr*255),round(gg*255),round(bb*255)]
    out.append(Image.fromarray(a))
print('shifts',shifts)
dst=sys.argv[1]
w,h=out[0].size
for i,im in enumerate(out): im.save(f'{dst}/idle_{i}.png')
sh=Image.new('RGBA',(w*8,h)); [sh.paste(im,(i*w,0)) for i,im in enumerate(out)]; sh.save(f'{dst}/sheet_8x1_{w}x{h}.png')
out[0].save(f'{dst}/anim.png',save_all=True,append_images=out[1:],duration=250,loop=0)
g=[]
for im in out:
    bg=Image.new('RGBA',im.size,(128,128,128,255)); bg.alpha_composite(im)
    g.append(bg.resize((w*4,h*4),0).convert('RGB').quantize(colors=256,method=Image.Quantize.FASTOCTREE,dither=Image.Dither.NONE))
g[0].save(f'{dst}/preview.gif',save_all=True,append_images=g[1:],duration=250,loop=0)
tiles=[]
for im in out:
    c=im.crop((42,19,82,45)); bg=Image.new('RGBA',c.size,(200,200,200,255)); bg.alpha_composite(c); tiles.append(bg.resize((c.width*6,c.height*6),0))
W,H=tiles[0].size; o=Image.new('RGB',(W*4,H*2))
for i,t in enumerate(tiles): o.paste(t,((i%4)*W,(i//4)*H))
o.save(f'{dst}/eyes.png')
