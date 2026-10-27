"""Rebuild genuine four-facing character images from the provided concept illustration.
Uses best-effort matting: the reference is a presentation board rather than a sprite atlas.
Dependencies: pillow numpy opencv-python. Only needed when re-extracting graphics.
"""
from pathlib import Path
from PIL import Image, ImageFilter
import numpy as np
import cv2
ROOT=Path(__file__).resolve().parents[1]
BOARD=np.array(Image.open(ROOT/'assets/reference/player-sheet.png').convert('RGB'))
OUTPUT=ROOT/'assets/player'

def extract(name, rect, *, right_cut=None):
    x0,y0,x1,y1=rect
    rgb=BOARD[y0:y1,x0:x1].copy()
    h,w=rgb.shape[:2]
    R,G,B=[rgb[:,:,i].astype(np.int16) for i in range(3)]
    # Concept board light-blue checkers are all bright and near neutral, while the sprite is vivid.
    bg=(R>171)&(G>195)&(B>201)&(np.abs(B-G)<53)
    mask=np.full((h,w),cv2.GC_PR_FGD,np.uint8)
    mask[bg]=cv2.GC_PR_BGD
    mask[:2,:]=cv2.GC_BGD;mask[-2:,:]=cv2.GC_BGD;mask[:,:2]=cv2.GC_BGD;mask[:,-2:]=cv2.GC_BGD
    if right_cut:
        for y in range(h):
            limit=right_cut(y0+y)-x0
            mask[y,max(0,limit):]=cv2.GC_BGD
    # Small dark shoes and eyes are secure foreground seeds.
    yy,xx=np.indices((h,w))
    dark=(R<150)&(G<145)&(B<150)
    core=(xx>int(w*.22))&(xx<int(w*.75))&(yy>h*.30)&(yy<h*.86)&dark
    mask[core]=cv2.GC_FGD
    model=np.zeros((1,65),np.float64); model2=np.zeros((1,65),np.float64)
    cv2.grabCut(cv2.cvtColor(rgb,cv2.COLOR_RGB2BGR),mask,None,model,model2,7,cv2.GC_INIT_WITH_MASK)
    alpha=np.uint8(((mask==cv2.GC_FGD)|(mask==cv2.GC_PR_FGD))*255)
    # Remove small checkerboard leftovers; retain silhouette around head / body.
    count,lab,stats,centers=cv2.connectedComponentsWithStats(alpha,8)
    if count>1:
        preferred=[i for i in range(1,count) if stats[i,cv2.CC_STAT_AREA]>=8 and abs(centers[i][0]-w*.48)<w*.4]
        preferred=sorted(preferred,key=lambda i:stats[i,cv2.CC_STAT_AREA],reverse=True)[:3]
        alpha=np.where(np.isin(lab,preferred),alpha,0).astype(np.uint8)
    im=Image.fromarray(np.dstack([rgb,alpha]),'RGBA')
    bbox=im.getbbox()
    if bbox: im=im.crop(bbox)
    # Consistent logical canvas 57x77 px; feet remain at y≈71.
    im.thumbnail((48,68), Image.Resampling.LANCZOS)
    output=Image.new('RGBA',(57,77))
    output.alpha_composite(im,((57-im.width)//2,70-im.height))
    return output

if __name__=='__main__':
    # Player alone from the overhead direction key; exclude the separate orange companion.
    up=extract('north',(824,44,872,115),right_cut=lambda y:867 if y>=85 else 872)
    # Frontal idle from the emote section. Rightmost orange mini-pet is excluded.
    down=extract('south',(391,499,453,589),right_cut=lambda y:445 if y>=540 else 452)
    # Two side directions must be genuine opposites; the original 'west' crop
    # in the presentation sheet also looked to the right. Mirror the east pose.
    for frame in [0,1]:
        side=Image.open(OUTPUT/f'east_{frame}.png').convert('RGBA')
        side.transpose(Image.Transpose.FLIP_LEFT_RIGHT).save(OUTPUT/f'west_{frame}.png')
    for direction,img in [('north',up),('south',down)]:
        for frame in [0,1]:
            img.save(OUTPUT/f'{direction}_{frame}.png')
    print('Wrote 4 real north/south sprites. East/west poses are retained from Walk panel.')
