import sys
from PIL import Image, ImageFilter; import numpy as np
S, P = sys.argv[1], sys.argv[2]
im=np.asarray(Image.open(S+'/r48/gpt-card2-1.png').convert('RGB')).astype(float)
r,g,b=im[...,0],im[...,1],im[...,2]
m=np.clip(((np.minimum(r,b)-g)-60)/120,0,1); a=1-m
spill=np.clip(np.minimum(r,b)-g,0,None)*m
out=im.copy(); out[...,0]-=spill; out[...,2]-=spill
I=Image.fromarray(np.dstack([np.clip(out,0,255).astype(np.uint8),(a*255).astype(np.uint8)]),'RGBA'); I=I.crop(I.getbbox())
rgba=np.asarray(I); rgb=rgba[...,:3].astype(float); al=rgba[...,3]
H,W=al.shape; cx=W//2
mx=rgb.max(2); mn=rgb.min(2); sat=(mx-mn)/np.maximum(mx,1)
y0,y1=int(H*0.08),int(H*0.35)
score=sat[y0:y1,cx]*(rgb[y0:y1,cx,0]>120); ry=y0+int(np.argmax(score))
print('size',W,H,'rule y',ry,round(ry/H,3))
yy=np.arange(H)[:,None]
gold=(sat>0.30)&(mx>90)
body=(~gold)&(al>250)&(yy>ry+3)
col=gold[:,cx]; yb=H//2+int(np.argmax(col[H//2:]))
body&=(yy<yb)
print('bottom gold y',yb)
row=gold[H//2]; xl=int(np.argmax(row[cx::-1])); xr=int(np.argmax(row[cx:])); xs=np.array([cx-xl+1,cx+xr-1]); body[:, :xs[0]]=False; body[:, xs[-1]+1:]=False
bm=Image.fromarray((body*255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))
gd=np.asarray(Image.fromarray((gold*255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)))>128
bmn=(np.asarray(bm)>128)&~gd
print('grey below rule',rgb[ry+15,cx,0],'mid',rgb[H//2,cx,0],'glow',rgb[int(H*0.8),int(W*0.55),0],'strip',rgb[ry//2,cx])
frame=rgba.copy(); frame[...,3]=np.where(bmn,0,frame[...,3])
grow=np.asarray(bm.filter(ImageFilter.MaxFilter(9)))>128
bodyl=rgba.copy(); bodyl[...,3]=np.where(grow,255,0)
# rim pixels under the frame: copy the nearest body row value (use column-wise grey of the body edge)
g8=rgb[...,0].copy(); edge=~bmn&grow
for _ in range(6):
    nb=Image.fromarray(np.where(bmn,g8,0).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))
    g8=np.where(bmn,g8,np.asarray(nb)); bmn=bmn|(np.asarray(nb)>0)
for c in range(3): bodyl[...,c]=np.where(edge,g8,bodyl[...,c])
w2=460; h2=round(H*w2/W)
Image.fromarray(frame).resize((w2,h2),Image.LANCZOS).save(P+'/S303r49b-card_frame.png')
Image.fromarray(bodyl).resize((w2,h2),Image.LANCZOS).save(P+'/S303r49b-card_body.png')
print('out',w2,h2)
