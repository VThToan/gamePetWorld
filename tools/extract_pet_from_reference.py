"""Prototype sprite extraction from USER-PROVIDED in-game shop UI screenshots.
Only static front/side pose is in reference. Frame 1 makes a small pixel bob;
real walk/attack production animations require future native sprite sheets.
"""
from PIL import Image,ImageDraw,ImageOps
from collections import deque
from pathlib import Path
root=Path(__file__).resolve().parents[1]; out=root/'assets/pet-catalog'
refs={
 'tiger':(str(root/'assets/reference/pet-shop-page1.png'),(19,48,87,115)),
 'flame':(str(root/'assets/reference/pet-shop-page1.png'),(280,35,356,115)),
 'ice':(str(root/'assets/reference/pet-shop-page1.png'),(532,40,607,116)),
 'thunder':(str(root/'assets/reference/pet-shop-page1.png'),(14,183,94,270)),
 'bug':(str(root/'assets/reference/pet-shop-page1.png'),(280,204,341,266)),
 'pumpkin':(str(root/'assets/reference/pet-shop-page1.png'),(520,196,609,270)),
 'dragon':(str(root/'assets/reference/pet-shop-page2.png'),(516,197,608,269)),
}
for name,(filename,region) in refs.items():
 crop=Image.open(filename).convert('RGBA').crop(region)
 W,H=crop.size;p=crop.load();visited=bytearray(W*H);queue=deque()
 # Background is off-white but features generally have dark black borders.
 def bg(x,y):
  r,g,b,a=p[x,y];return r>224 and g>220 and b>215 and (max(r,g,b)-min(r,g,b)<29)
 for x in range(W):
  for y in (0,H-1):
   if bg(x,y):queue.append((x,y));visited[y*W+x]=1
 for y in range(H):
  for x in (0,W-1):
   if bg(x,y) and not visited[y*W+x]:queue.append((x,y));visited[y*W+x]=1
 while queue:
  x,y=queue.popleft()
  for xx,yy in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
   if 0<=xx<W and 0<=yy<H and not visited[yy*W+xx] and bg(xx,yy):
    visited[yy*W+xx]=1;queue.append((xx,yy))
 for y in range(H):
  for x in range(W):
   r,g,b,a=p[x,y]
   if visited[y*W+x]:p[x,y]=(r,g,b,0)
   elif y>H-15 and r>98 and abs(r-g)<17 and abs(g-b)<17:
    # Drop gray UI oval shadows (in game renderer handles contact shadows).
    p[x,y]=(r,g,b,0)
 # Restore contiguous white fur inside the dark sprite outlines.
 box=crop.getbbox()
 if box:crop=crop.crop(box)
 # Normalize anchor: entire bitmap is centered in 96x108, lower edge at foot.
 for frame in (0,1):
  dst=Image.new('RGBA',(96,108),(0,0,0,0))
  width=min(crop.width,84);height=min(crop.height,90)
  sprite=crop.resize((width,height),Image.Resampling.NEAREST)
  dst.alpha_composite(sprite,((96-width)//2+(1 if frame else 0),105-height-(2 if frame else 0)))
  dst.save(out/f'{name}_{frame}.png')
print('Replaced',len(refs)*2,'placeholder frames with cutouts from supplied screenshots')
