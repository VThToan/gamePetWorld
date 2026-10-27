"""Generate editable proof-of-concept two-frame recolors from the supplied pet art.
The extracted reference pet is retained unmodified; these are placeholder animations,
not claimed to be uniquely hand-illustrated species sprites.
"""
from PIL import Image, ImageDraw, ImageEnhance
from pathlib import Path
import colorsys
root=Path(__file__).resolve().parents[1]; src=Image.open(root/'assets/pet/east.png').convert('RGBA')
# Keep the complete original alpha bounding box, including tail and paw tips.
bbox=src.getbbox(); base=src.crop((max(0,bbox[0]-4),max(0,bbox[1]-4),min(src.width,bbox[2]+4),min(src.height,bbox[3]+4)))
out=root/'assets/pet-catalog'; out.mkdir(exist_ok=True)
colors={
 'flame':(0.82,1.1), 'ice':(.57,1.10), 'thunder':(.12,1.23), 'dragon':(.40,.63),
 'dino':(.055,1.18),'tiger':(.10,1.1),'pumpkin':(.06,.95),'bug':(.32,1.15)
}
for name,(hue,mult) in colors.items():
 im=base.copy(); pix=im.load()
 for y in range(im.height):
  for x in range(im.width):
   r,g,b,a=pix[x,y]
   if a<10: continue
   hh,s,v=colorsys.rgb_to_hsv(r/255,g/255,b/255)
   if name=='flame': continue
   # Preserve bright face features; shift saturated accents to themed species.
   if v>.83 and s<.21: continue
   if name=='dragon':
    if v>.65 and s<.25: rgb=(39,55,64)
    else: rgb=tuple(int(max(0,min(1,c))*255) for c in colorsys.hsv_to_rgb(hue,.35+min(.4,s),min(.47,v*.68)))
   else:
    rgb=tuple(int(max(0,min(1,c))*255) for c in colorsys.hsv_to_rgb(hue,max(.48,s),min(1,v*mult)))
   pix[x,y]=(*rgb,a)
 for frame in range(2):
  # Full-resolution frames with small toe/ear bounce to test walk-cycle integration.
  cel=Image.new('RGBA',(96,108))
  dest=((96-im.width)//2 + (1 if frame else 0), 107-im.height-(3 if frame else 0))
  cel.alpha_composite(im,dest)
  d=ImageDraw.Draw(cel)
  if name=='dragon': d.ellipse((47,40-(3 if frame else 0),52,45-(3 if frame else 0)),fill=(119,250,109,255))
  if name=='tiger':
   for xx in (34,58):d.line([(xx,34),(xx+3,43)],fill=(81,43,21,250),width=2)
  if name=='pumpkin':d.ellipse((42,31,49,36),fill=(65,233,90,245))
  if name=='ice': d.ellipse((22,36,26,42),fill=(85,230,254,225))
  cel.save(out/f'{name}_{frame}.png')
print('Generated',len(colors)*2,'prototype frames')
