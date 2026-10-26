import sys, numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi
from scipy import sparse
from scipy.sparse.linalg import spsolve
P=sys.argv[1]
up=Image.open('81x360_2_81cap-8115339.png').convert('RGBA'); left=Image.open('81x360_4_81cap-9677460.png').convert('RGBA'); r45=Image.open('81x360_3_81cap-8405589.png').convert('RGBA')
W,H=up.size; cx,cy=564.5,434.5; R_IN=177; R_OUT=204
yy,xx=np.mgrid[0:H,0:W]; dx=xx-cx; dy=yy-cy; d=np.sqrt(dx*dx+dy*dy)
inner=d<=R_IN; ring_zone=(d>R_IN)&(d<=R_OUT+2)
upa=np.asarray(up).astype(int); la=np.asarray(left).astype(int); ra=np.asarray(r45).astype(int)
lum=upa[:,:,:3].mean(axis=2)
body_sil=ndi.binary_fill_holes(ndi.binary_closing((la[:,:,3]>128)&(ra[:,:,3]>128), structure=np.ones((7,7))))
# mouth above the body: exact silhouette
A=(upa[:,:,3]>60)&(~body_sil)&(yy<300)
A=ndi.binary_fill_holes(ndi.binary_closing(A, structure=np.ones((5,5))))
lab,n=ndi.label(A); sizes=ndi.sum(A,lab,range(1,n+1)); A=lab==(1+int(np.argmax(sizes)))
# mouth over the body band / ring: differs from the frame whose nozzle is on the other side
dl=np.abs(upa[:,:,:3]-la[:,:,:3]).sum(axis=2); dr=np.abs(upa[:,:,:3]-ra[:,:,:3]).sum(axis=2)
diffsel=np.where(xx<cx, dr, dl)
M2=body_sil&(yy<300)&(np.abs(dx)<215)&(~inner)&( ((d>R_OUT+2)&(diffsel>30)) | (ring_zone&(lum>20)) )
M=ndi.binary_closing(A|M2, structure=np.ones((7,7)))
M=ndi.binary_opening(M, structure=np.ones((5,5)))
M=ndi.binary_fill_holes(M)
lab,n=ndi.label(M); keep=np.zeros_like(M)
for i in range(1,n+1):
    c=lab==i
    if (c&A).sum()>200: keep|=c
noz=ndi.binary_dilation(keep,iterations=1)
print('nozzle px', int(noz.sum()))
# close the gap between the mouth and the disc so the rotor is one solid shape (mouth - tube - disc)
rr_=16; yk,xk=np.mgrid[-rr_:rr_+1,-rr_:rr_+1]; disk=(xk*xk+yk*yk)<=rr_*rr_
rotmask=ndi.binary_fill_holes(ndi.binary_closing(inner|noz, structure=disk))
rotmask=ndi.binary_closing(rotmask, structure=np.ones((7,7)))
mask=rotmask.astype(np.uint8)*255
m=Image.fromarray(mask).filter(ImageFilter.GaussianBlur(0.8))
ra8=upa.astype(np.uint8).copy(); ra8[:,:,3]=(ra8[:,:,3].astype(int)*np.asarray(m).astype(int)//255).astype(np.uint8)
rotorim=Image.fromarray(ra8,'RGBA')
# ---- body
body=upa.copy().astype(float)
body[ndi.binary_dilation(A,iterations=2)&(~body_sil)]=[0,0,0,0]
spike=(np.abs(dx)<34)&(yy>=185)
F=(ndi.binary_dilation(rotmask,iterations=6)|spike)&body_sil&(~inner)&(yy<cy-20)
Fd=ndi.binary_dilation(F,iterations=3)
G=body.copy(); ang=np.deg2rad(62)
ys,xs=np.where(Fd); ddx=xs-cx; ddy=ys-cy; a=np.where(xs>=cx,ang,-ang)
k_el=178.5/174.5   # the ring is a slight ellipse (wider than tall): rotate in normalised space
ddy_n=ddy*k_el
sx=np.clip(np.round(cx+ddx*np.cos(a)-ddy_n*np.sin(a)).astype(int),0,W-1); sy=np.clip(np.round(cy+(ddx*np.sin(a)+ddy_n*np.cos(a))/k_el).astype(int),0,H-1)
G[ys,xs]=body[sy,sx]
R=F
idx=-np.ones((H,W),int); ry,rx=np.where(R); idx[ry,rx]=np.arange(len(ry)); N=len(ry)
rows=[];cols=[];vals=[]; b=np.zeros((N,3))
for k,(y,x) in enumerate(zip(ry,rx)):
    deg=0
    for ny,nx in ((y-1,x),(y+1,x),(y,x-1),(y,x+1)):
        if inner[ny,nx]: continue            # no constraint from the dome (covered by the rotor)
        deg+=1
        b[k]+=G[y,x,:3]-G[ny,nx,:3]; j=idx[ny,nx]
        if j>=0: rows.append(k);cols.append(j);vals.append(-1.0)
        else: b[k]+=body[ny,nx,:3]
    rows.append(k);cols.append(k);vals.append(float(deg))
Amat=sparse.csr_matrix((vals,(rows,cols)),shape=(N,N))
for c in range(3): body[ry,rx,c]=np.clip(spsolve(Amat,b[:,c]),0,255)
body[ry,rx,3]=255
# soften the seam where the two sampled halves meet on the ring top
bu=body.astype(np.uint8); bl=np.asarray(Image.fromarray(bu,'RGBA').filter(ImageFilter.GaussianBlur(1.6)))
seam=F&(np.abs(dx)<26)&(d>R_IN-3)&(d<R_OUT+10)
bu[seam]=bl[seam]; body=bu.astype(float)
bodyim=Image.fromarray(body.astype(np.uint8),'RGBA')
box=(140,70,1000,1070); bw=box[2]-box[0]; bh=box[3]-box[1]
for im,name in [(bodyim.crop(box),'x360-body'),(rotorim.crop(box),'x360-rotor')]:
    o=im.resize((800,round(bh*800/bw)),Image.LANCZOS); o.save(f'{P}/{name}.webp',quality=92,method=6)
def ongrey(im,bg=(90,90,90,255)):
    bb=Image.new('RGBA',im.size,bg); bb.alpha_composite(im); return bb.convert('RGB')
def comp(a):
    rr=rotorim.rotate(a, resample=Image.BICUBIC, center=(cx,cy)); o=bodyim.copy(); o.alpha_composite(rr); return o
ongrey(bodyim.crop((300,120,840,400))).resize((810,420)).save('../zoom_body.jpg',quality=92)
ongrey(rotorim.crop((330,60,800,420))).resize((705,540)).save('../zoom_rotor.jpg',quality=92)
ongrey(comp(-60).crop((300,60,900,520))).resize((780,598)).save('../zoom_m60.jpg',quality=92)
tiles=[comp(0),comp(-90),comp(45),comp(135)]
w=445; th=int(w*bh/bw); sheet=Image.new('RGB',(w*4,th),'black')
for i,t in enumerate(tiles):
    t=ongrey(t.crop(box)); t.thumbnail((w,th)); sheet.paste(t,(i*w,0))
sheet.save('../x360_validate4.jpg',quality=88); print('done', N)
