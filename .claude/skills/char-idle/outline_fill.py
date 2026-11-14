# outline_fill.py <in_dir> <out_dir> - full 1 px dark outline (8-neighbour, corners too) round every light edge pixel + pink video fringe -> outline; colour OUT = WY-1 #0b0f2c (set from video_idle.py's printed outline colour).
import sys, numpy as np
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
OUT = np.array([0x0b,0x0f,0x2c,255],np.uint8)
frames=[]; stats=[]
for i in range(8):
    a=np.array(Image.open(f'{src}/idle_{i}.png').convert('RGBA')).astype(int)
    H,W=a.shape[:2]
    # pad 1px so the outline can grow outward
    p=np.zeros((H+2,W+2,4),int); p[1:-1,1:-1]=a; a=p; H,W=H+2,W+2
    op=a[...,3]>0
    r,g,b=a[...,0],a[...,1],a[...,2]
    lum=0.3*r+0.59*g+0.11*b
    dark=op&(lum<70)
    # magenta/purple fringe (video bleed) on the edge -> outline
    pink=op&(r>g+25)&(b>g+25)
    a[pink]=OUT; nf=pink.sum()
    op=a[...,3]>0; lum=0.3*a[...,0]+0.59*a[...,1]+0.11*a[...,2]; dark=op&(lum<70)
    light=op&~dark
    near=np.zeros_like(op)
    for dy in (-1,0,1):
        for dx in (-1,0,1):
            if dy or dx: near|=np.roll(np.roll(light,dy,0),dx,1)
    add=(~op)&near
    a[add]=OUT
    stats.append((int(nf),int(add.sum())))
    frames.append(a.astype(np.uint8))
# crop to union box
al=np.stack([f[...,3]>0 for f in frames]).any(0); ys,xs=np.where(al)
y0,y1,x0,x1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
ims=[Image.fromarray(f[y0:y1,x0:x1]) for f in frames]
w,h=ims[0].size
for i,im in enumerate(ims): im.save(f'{dst}/idle_{i}.png')
sh=Image.new('RGBA',(w*8,h)); [sh.paste(im,(i*w,0)) for i,im in enumerate(ims)]; sh.save(f'{dst}/sheet_8x1_{w}x{h}.png')
ims[0].save(f'{dst}/anim.png',save_all=True,append_images=ims[1:],duration=190,loop=0)
g=[]
for im in ims:
    bg=Image.new('RGBA',im.size,(128,128,128,255)); bg.alpha_composite(im)
    g.append(bg.resize((w*4,h*4),0).convert('RGB').quantize(colors=256,method=Image.Quantize.FASTOCTREE,dither=Image.Dither.NONE))
g[0].save(f'{dst}/preview.gif',save_all=True,append_images=g[1:],duration=190,loop=0)
z=Image.new('RGBA',(w,h),(200,200,200,255)); z.alpha_composite(ims[0]); z.resize((w*8,h*8),0).save(f'{dst}/z0.png')
print('size',w,h,'(pink->outline, added) per frame',stats)
