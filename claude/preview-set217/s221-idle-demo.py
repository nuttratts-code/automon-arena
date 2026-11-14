import sys, math
from PIL import Image, ImageDraw
import numpy as np
src,S=sys.argv[1:]
a=np.asarray(Image.open(src).convert('RGB')).astype(int)
b,off,n=20.0,2,99
c=(off+b*(np.arange(n)+0.5)).astype(int); g=a[c][:,c].astype(np.uint8)
mag=(g[:,:,0]>190)&(g[:,:,1]<110)&(g[:,:,2]>190)
ys,xs=np.where(~mag)
rgba=np.dstack([g,np.where(mag,0,255).astype(np.uint8)])[ys.min():ys.max()+1, xs.min():xs.max()+1].copy()
Image.fromarray(rgba,'RGBA').save(S+'/hl1_px.png')
H,W=rgba.shape[:2]; Z=4; PAD=6
eye=(rgba[:,:,2].astype(int)>rgba[:,:,0].astype(int)+70)&(rgba[:,:,3]>0)
print('size',W,H,'eye px',eye.sum())
CUT=int(H*0.57)  # waist row
CW,CH=(W+2*PAD)*Z,(H+2*PAD)*Z
def canvas(): return Image.new('RGBA',(CW,CH),(236,232,220,255))
def shadow(im,scale=1.0):
    L=Image.new('RGBA',im.size,(0,0,0,0)); d=ImageDraw.Draw(L); w=W*Z*0.42*scale; h=5*Z*scale; cx=CW/2; cy=(PAD+H)*Z-Z
    d.ellipse([cx-w,cy-h,cx+w,cy+h],fill=(60,50,40,70)); im.alpha_composite(L)
def paste(im,arr,dx=0,dy=0):
    s=Image.fromarray(arr,'RGBA').resize((W*Z,H*Z),Image.NEAREST); im.alpha_composite(s,(PAD*Z+dx*Z,PAD*Z+dy*Z))
def waist(arr,k):
    out=np.zeros_like(arr); low=arr.copy(); low[:CUT]=0; out=low.copy()
    up=arr[:CUT]; 
    if k: up=np.vstack([np.zeros((k,W,4),np.uint8),up])[:CUT+k]
    m=up[:,:,3]>0; region=out[:CUT+k]; region[m]=up[m]; out[:CUT+k]=region
    return out
N=12
frames={k:[] for k in ['1 ยืดหดทั้งตัว (โค้ด)','2 ตัดเอว เลื่อน 1px','3 ตัดเอว + ตาเรือง','4 ลอยขึ้นลง (ภูติ)','5 โยกช่วงบน (วายุ)','6 ขอบไฟกะพริบ (เพลิง)']}
step=[0,0,0,1,1,1,1,1,1,0,0,0]  # 1px breathing timing over 12 ticks
for t in range(N):
    ph=math.sin(2*math.pi*t/N)
    # 1 squash at display res, feet anchored
    im=canvas(); shadow(im); s=Image.fromarray(rgba,'RGBA').resize((W*Z,H*Z),Image.NEAREST)
    sy=1-0.025*(ph*0.5+0.5); sx=1+0.015*(ph*0.5+0.5); s2=s.resize((round(W*Z*sx),round(H*Z*sy)),Image.NEAREST)
    im.alpha_composite(s2,(round(CW/2-s2.width/2),(PAD+H)*Z-s2.height)); frames['1 ยืดหดทั้งตัว (โค้ด)'].append(im)
    # 2 waist shift
    im=canvas(); shadow(im); paste(im,waist(rgba,step[t])); frames['2 ตัดเอว เลื่อน 1px'].append(im)
    # 3 waist + eye pulse
    w=waist(rgba,step[t]); e=np.zeros_like(eye); 
    k=step[t]; e[k:]=eye[:H-k] if k else eye
    glow=0.5+0.5*ph
    w2=w.copy(); w2[e,0]=np.clip(w[e,0]+80*glow,0,255); w2[e,1]=np.clip(w[e,1]+120*glow,0,255); w2[e,2]=255
    im=canvas(); shadow(im); paste(im,w2); frames['3 ตัดเอว + ตาเรือง'].append(im)
    # 4 float bob
    im=canvas(); dy=-round(2+2*ph); shadow(im,0.85+0.1*(dy+4)/4*-1+0.1); paste(im,rgba,0,dy-2); frames['4 ลอยขึ้นลง (ภูติ)'].append(im)
    # 5 top-weighted sway (shear rows at display res)
    im=canvas(); shadow(im); base=np.asarray(Image.fromarray(rgba,'RGBA').resize((W*Z,H*Z),Image.NEAREST))
    out=np.zeros_like(base)
    for y in range(H*Z):
        hw=(1-y/(H*Z))**2; sh=int(round(ph*2.5*Z*hw)); out[y]=np.roll(base[y],sh,axis=0)
    im.alpha_composite(Image.fromarray(out,'RGBA'),(PAD*Z,PAD*Z)); frames['5 โยกช่วงบน (วายุ)'].append(im)
    # 6 flickering warm rim (outline glow) 
    im=canvas(); shadow(im); al=rgba[:,:,3]>0
    rim=np.zeros((H+2,W+2),bool)
    for dx,dy in [(-1,0),(1,0),(0,-1),(0,1)]: rim[1+dy:1+dy+H,1+dx:1+dx+W]|=al
    rim=rim[1:-1,1:-1]&~al
    fl=0.55+0.45*abs(math.sin(t*1.7))
    r=np.zeros_like(rgba); r[rim]=(255,int(120+60*fl),40,int(200*fl))
    paste(im,r); paste(im,rgba); frames['6 ขอบไฟกะพริบ (เพลิง)'].append(im)
# sheet gif 3x2
from PIL import ImageFont
try: font=ImageFont.truetype('C:/Windows/Fonts/tahoma.ttf',22)
except: font=ImageFont.load_default()
names=list(frames); cols=3; LBL=34
sheet=[]
for t in range(N):
    sh=Image.new('RGB',(cols*CW,2*(CH+LBL)),(250,248,242)); d=ImageDraw.Draw(sh)
    for i,nm in enumerate(names):
        x=(i%cols)*CW; y=(i//cols)*(CH+LBL)
        d.text((x+10,y+6),nm,fill=(40,40,40),font=font); sh.paste(frames[nm][t].convert('RGB'),(x,y+LBL))
    sheet.append(sh)
sheet[0].save(S+'/hl1_idle_options.gif',save_all=True,append_images=sheet[1:],duration=110,loop=0)
print('ok',sheet[0].size)
