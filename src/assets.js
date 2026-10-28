import { PLAYER_DIRECTIONS,PET_DIRECTIONS } from './config.js';
import {PET_SPECIES} from './pet-data.js';
function getVisibleBounds(image) {
  const canvas=document.createElement('canvas');
  canvas.width=image.naturalWidth||image.width;canvas.height=image.naturalHeight||image.height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(image,0,0);
  const {data}=ctx.getImageData(0,0,canvas.width,canvas.height);
  let left=canvas.width,right=0,bottom=0,top=canvas.height;
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
    if(data[(y*canvas.width+x)*4+3]<72)continue;
    left=Math.min(left,x);right=Math.max(right,x+1);
    top=Math.min(top,y);bottom=Math.max(bottom,y+1);
  }
  return right<=left?{centerX:canvas.width/2,bottom:canvas.height,left:0,top:0,right:canvas.width}:{centerX:(left+right)/2,bottom,left,top,right};
}
// Atlas cells are normalized once. The complete silhouette is retained, with
// identical logical foot anchors across poses, even when a boot is raised.
function atlasSprite(sheet,cols,rows,index,{width=57,height=77}={}){
 const cw=sheet.naturalWidth/cols,ch=sheet.naturalHeight/rows;
 const cell=document.createElement('canvas');cell.width=Math.ceil(cw);cell.height=Math.ceil(ch);
 const ctx=cell.getContext('2d',{willReadFrequently:true});
 ctx.drawImage(sheet,(index%cols)*cw,Math.floor(index/cols)*ch,cw,ch,0,0,cw,ch);
 const data=ctx.getImageData(0,0,cell.width,cell.height);
 for(let i=3;i<data.data.length;i+=4)if(data.data[i]<96)data.data[i]=0;
 ctx.putImageData(data,0,0);
 const bounds=getVisibleBounds(cell);
 const sprite=document.createElement('canvas');sprite.width=width;sprite.height=height;
 const out=sprite.getContext('2d');out.imageSmoothingEnabled=false;
 const sw=bounds.right-bounds.left,sh=bounds.bottom-bounds.top;
 const scale=Math.min((width-9)/sw,(height-8)/sh);
 const w=Math.round(sw*scale),h=Math.round(sh*scale);
 out.drawImage(cell,bounds.left,bounds.top,sw,sh,Math.floor((width-w)/2),height-5-h,w,h);
 return sprite;
}
function fetchImage(src) {
  return new Promise((resolve,reject)=>{
    const image=new Image();
    image.onload=()=>resolve(image);
    image.onerror=()=>reject(new Error('Không thể tải asset: '+src));
    image.src=src;
  });
}
export async function loadAssets(onProgress=()=>{}) {
  const files = [
    ['map','assets/map.png'],
    ['interior_west','assets/interiors/west.png'],
    ['interior_shop','assets/interiors/shop.png'],
    ['interior_mine','assets/interiors/mine.png'],
    ['out_west_village','assets/out-west-village.png'],
    ['out_west_south','assets/out-west-south.png'],
    ['out_harbor','assets/out-harbor.png'],
    ['player_walk_vertical','assets/player/walk-vertical.png'],
    ['npc_townsfolk','assets/npc/townsfolk.png'],
  ];
  for (const dir of PLAYER_DIRECTIONS) for (let n=0;n<2;n++) files.push([`player_${dir}_${n}`,`assets/player/${dir}_${n}.png`]);
  for (const dir of PET_DIRECTIONS) files.push([`pet_${dir}`,`assets/pet/${dir}.png`]);
  for(const type of PET_SPECIES)for(let n=0;n<2;n++) files.push([`pet_${type.id}_${n}`,`assets/pet-catalog/${type.id}_${n}.png`]);
  for(const name of ['fire','moon','spirit']) files.push([`skill_${name}`,`assets/pet/skill_${name}.png`]);
  for(const element of ['grass','fire','water','earth','lightning','ice','wind','dark','light','fury','heal','revive','basic'])for(let f=0;f<7;f++)files.push([`vfx_${element}_${f}`,`assets/effects/${element}_${f}.png`]);
  let completed=0;
  const entries=await Promise.all(files.map(async ([key,url])=>{
    try {return [key,await fetchImage(url)];}
    catch(err) {console.warn(err);return [key,null];}
    finally {onProgress(++completed,files.length);}
  }));
  const images=Object.fromEntries(entries);
  if(!images.map) throw new Error('Không tải được bản đồ. Hãy mở bằng Live Server, không mở file://.');
  images.bounds={};
  images.frames={};
  if(!images.player_walk_vertical||!images.npc_townsfolk)throw new Error('Không tải được atlas nhân vật/NPC.');
  for(const [row,dir] of ['south','north'].entries()){
    images.frames[dir]=4;
    for(let frame=0;frame<4;frame++)images[`player_${dir}_${frame}`]=atlasSprite(images.player_walk_vertical,4,2,row*4+frame);
  }
  for(const [index,name] of ['elder','evolution','items','storage','ferryman','pet-shop'].entries())images[`npc_${name}`]=atlasSprite(images.npc_townsfolk,3,2,index,{width:64,height:88});
  for(const [key,img] of Object.entries(images)){
    if(img && (key.startsWith('player_')||key.startsWith('pet_')||key.startsWith('npc_'))) images.bounds[key]=getVisibleBounds(img);
  }
  return images;
}
