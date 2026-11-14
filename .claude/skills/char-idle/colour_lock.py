# colour_lock.py <frames_dir> <out_dir> (set 225, owner: later frames must keep frame 1's colours)
# 1 remove each frame's global colour drift vs frame 1 · 2 a pixel within 40 of frame 1's colour at the same spot (3x3) takes that colour
# 3 moved parts take the nearest frame 1 colour · sparks (white/pink light: r>180 g>140 b>120) are never touched.
# Writes idle_*.png, sheet, anim.png and compare_before_left_after_right.gif. Smeared parts that still look muddy -> part_copy.py.
import sys,numpy as np
from PIL import Image
src,out=sys.argv[1:3]
f=[np.array(Image.open(f'{src}/idle_{k}.png').convert('RGBA')).astype(int) for k in range(8)]
H,W=f[0].shape[:2]; a0=f[0]; m0=a0[...,3]>0
def spark(a):
    r,g,b=a[...,0],a[...,1],a[...,2]; return (r>180)&(g>140)&(b>120)          # white / pink light (body yellow has low blue)
P0=np.unique(a0[m0&~spark(a0)][:,:3],axis=0)
def nearest(px):
    d=np.full(len(px),1<<30); idx=np.zeros(len(px),int)
    for i,c in enumerate(P0):
        e=((px-c)**2).sum(1); b=e<d; d[b]=e[b]; idx[b]=i
    return P0[idx]
pad=np.pad(a0,((1,1),(1,1),(0,0)))
for k in range(1,8):
    a=f[k]; m=a[...,3]>0; sp=m&spark(a); body=m&~sp
    shift=a[body][:,:3].mean(0)-a0[m0&~spark(a0)][:,:3].mean(0)
    b=a.copy(); b[body,:3]=np.clip(a[body,:3]-shift,0,255)
    best=np.full((H,W),1e9); col=b[...,:3].copy()
    for dy in range(3):
        for dx in range(3):
            n=pad[dy:dy+H,dx:dx+W]; ok=(n[...,3]>0)&~spark(n)
            e=np.sqrt(((b[...,:3]-n[...,:3])**2).sum(-1)); e[~ok]=1e9
            u=e<best; best[u]=e[u]; col[u]=n[...,:3][u]
    lock=body&(best<40); b[lock,:3]=col[lock]
    rest=body&~lock
    if rest.any(): b[rest,:3]=nearest(b[rest][:,:3])
    f[k]=b; print('frame',k+1,'shift',shift.round(1).tolist(),'locked',int(lock.sum()),'moved',int(rest.sum()),'spark kept',int(sp.sum()))
ims=[Image.fromarray(x.astype(np.uint8)) for x in f]
for k,im in enumerate(ims): im.save(f'{out}/idle_{k}.png')
sh=Image.new('RGBA',(W*8,H))
for k,im in enumerate(ims): sh.paste(im,(k*W,0))
sh.save(f'{out}/sheet_8x1_{W}x{H}.png')
ims[0].save(f'{out}/anim.png',save_all=True,append_images=ims[1:],duration=250,loop=0,disposal=1)
old=[Image.open(f'{src}/idle_{k}.png').convert('RGBA') for k in range(8)]
g=[]
for o,im in zip(old,ims):
    c=Image.new('RGB',(W*8+30,H*4+20),(120,128,140))
    for j,x in enumerate((o,im)):
        bb=x.resize((W*4,H*4),Image.NEAREST); c.paste(bb,(10+j*(W*4+10),10),bb)
    g.append(c.quantize(colors=256,method=Image.FASTOCTREE,dither=Image.Dither.NONE))
g[0].save(f'{out}/compare_before_left_after_right.gif',save_all=True,append_images=g[1:],duration=250,loop=0)
