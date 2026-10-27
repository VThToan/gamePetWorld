"""Rebuild prototype sprite PNGs from provided concept sheets.
Optional dependencies: pip install pillow opencv-python numpy
The illustrations are CONCEPT BOARDS, not true production sprite atlases:
these crops / matte masks are best-effort placeholders. Edit or replace PNGs freely.
"""
from pathlib import Path
import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PLAYER_BOARD = ROOT/'assets/reference/player-sheet.png'
PET_BOARD = ROOT/'assets/reference/pet-sheet.png'
DIRS = ['west','northwest','north','northeast','east','southeast','south','southwest']

def matte_crop(sheet, rect, kind):
    x1,y1,x2,y2=rect
    rgb=sheet[y1:y2,x1:x2].copy()
    h,w=rgb.shape[:2]
    mask=np.full((h,w),cv2.GC_PR_BGD, dtype=np.uint8)
    if kind=='player':
        bg=(rgb[:,:,0]>180)&(rgb[:,:,1]>201)&(rgb[:,:,2]>210)&((rgb[:,:,2].astype(int)-rgb[:,:,1].astype(int))<53)
        mask[bg]=cv2.GC_PR_BGD
        mask[~bg]=cv2.GC_PR_FGD
        # Secure actual parts (hair, scarf, dark boots) against GC elimination.
        mask[20:29,24:31]=cv2.GC_FGD
        mask[46:51,21:26]=cv2.GC_FGD
        yy,xx=np.indices((h,w))
        boots=(yy>48)&(yy<73)&(xx>12)&(xx<45)&(rgb[:,:,0]<150)&(rgb[:,:,1]<150)
        mask[boots]=cv2.GC_FGD
        # Reference board has a small orange NPC pet next to each character.
        for y in range(h):
            limit=int(w*(.94 if y<44 else (.78 if y>=54 else .89)))
            mask[y,limit:]=cv2.GC_BGD
    else:
        bg=(rgb[:,:,0]<47)&(rgb[:,:,1]<68)&(rgb[:,:,2]<104)
        mask[bg]=cv2.GC_PR_BGD
        mask[~bg]=cv2.GC_PR_FGD
    mask[:3,:]=0;mask[-3:,:]=0;mask[:,:3]=0;mask[:,-3:]=0
    mask2=mask.copy()
    try:
        cv2.grabCut(cv2.cvtColor(rgb,cv2.COLOR_RGB2BGR),mask2,None,
                    np.zeros((1,65),np.float64),np.zeros((1,65),np.float64),5,cv2.GC_INIT_WITH_MASK)
        alpha=np.where((mask2==cv2.GC_FGD)|(mask2==cv2.GC_PR_FGD),255,0).astype('uint8')
    except cv2.error:
        alpha=np.where(~bg,255,0).astype('uint8')
    count, labels, stats, _ = cv2.connectedComponentsWithStats(alpha,8)
    for i in range(1,count):
        if stats[i,cv2.CC_STAT_AREA]<5: alpha[labels==i]=0
    return Image.fromarray(np.dstack([rgb,alpha]),'RGBA')

def main():
    player=np.array(Image.open(PLAYER_BOARD).convert('RGB'))
    pet=np.array(Image.open(PET_BOARD).convert('RGB'))
    # These 8 directions correspond to the order of the Walk example on the player board.
    centers=[60,152,244,336,428,520,612,704]
    for d,c in zip(DIRS,centers):
        for f,(top,bottom) in enumerate([(277,354),(353,433)]):
            sprite=matte_crop(player,(c-36,top,c+21,bottom),'player')
            sprite.save(ROOT/f'assets/player/{d}_{f}.png')
    # Separate whole-body pet idle views. Movement uses these and an animated bob/tilt.
    boxes={
        'south':(23,294,101,394),
        'north':(107,292,186,394),
        'west':(193,291,269,394),
        'east':(288,292,372,395),
    }
    for d,rect in boxes.items():
        matte_crop(pet,rect,'pet').save(ROOT/f'assets/pet/{d}.png')
    skill_boxes={
        'fire':(790,509,958,657),
        'moon':(332,708,470,855),
        'spirit':(667,725,824,852),
    }
    for name,rect in skill_boxes.items():
        matte_crop(pet,rect,'pet').save(ROOT/f'assets/pet/skill_{name}.png')
    print('Exported 16 player frames + 4 complete pet frames + 3 skill samples.')

if __name__=='__main__': main()
